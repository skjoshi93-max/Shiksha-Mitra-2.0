/**
 * Global AI Generation Failover & Resumable Checkpoint Engine
 * 
 * Centralized, backend infrastructure capability for all AI-powered generation workflows:
 * - Durable persistent checkpoints saved to disk on every validated unit.
 * - Automatic model failover on quota, rate limits, token limits, timeouts, and 503/504 errors.
 * - Resumes strictly from the last persisted checkpoint (NEVER restarts from zero).
 * - Zero duplicate generation via normalized text & hash deduplication.
 * - Seamless ID and sequence numbering continuity across model transitions.
 * - Durable recovery across server restarts, worker crashes, and manual retries.
 */

import fs from 'fs';
import path from 'path';
import {
  GeminiLifecycleCatalog,
  buildAdaptiveFailoverChain,
  recordModelExecutionResult,
} from './geminiLifecycleEngine';

export type AiGenerationType =
  | 'QUESTION_BANK'
  | 'SKILL_ASSESSMENT'
  | 'NCERT_PDF_QUESTIONS'
  | 'ACADEMIC_SOLUTION'
  | 'EXAM_PAPER'
  | 'ASSESSMENT_METADATA'
  | 'BULK_BATCH'
  | 'CUSTOM';

export type AiJobStatus =
  | 'INITIALIZED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'PAUSED'
  | 'FAILED'
  | 'FAILOVER_IN_PROGRESS'
  | 'CANCELLED';

export interface AiGenerationJob<T = any> {
  jobId: string;
  generationType: AiGenerationType;
  targetId?: string;
  requestedCount: number;
  completedCount: number;
  remainingCount: number;
  checkpoint: number;
  currentBatch: number;
  currentItemIndex: number;
  modelId: string;
  providerId: string;
  attempt: number;
  status: AiJobStatus;
  lastSuccessfulOutput?: any;
  lastSuccessfulOutputHash?: string;
  promptVersion: string;
  schemaVersion: string;
  createdAt: number;
  updatedAt: number;
  lastCheckpointAt: number;
  failureReason?: string;
  modelChain: string[];
  checkpointData: T[];
  dedupKeys: string[];
  rawConfig?: any;
  metadata?: Record<string, any>;
}

export interface ErrorClassification {
  isFailoverEligible: boolean;
  isQuotaOrRateLimit: boolean;
  isTokenLimit: boolean;
  isHighDemandOrUnavailable: boolean;
  isTimeout: boolean;
  isTransient: boolean;
  reason: string;
  statusCode: number;
}

const STORAGE_DIR = path.join(process.cwd(), 'storage');
const CHECKPOINTS_FILE_PATH = path.join(STORAGE_DIR, 'ai_generation_checkpoints.json');

// In-memory cache of persistent jobs
let jobStore: Map<string, AiGenerationJob> = new Map();
let isInitialized = false;

function ensureStorageDir() {
  if (!fs.existsSync(STORAGE_DIR)) {
    try {
      fs.mkdirSync(STORAGE_DIR, { recursive: true });
    } catch (err) {
      console.warn('[AI Orchestrator] Could not create storage directory:', err);
    }
  }
}

/**
 * Fast stable hash for deduplication and checkpoint integrity verification
 */
export function computeContentHash(content: any): string {
  const str = typeof content === 'string' ? content : JSON.stringify(content);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Normalize string for strict deduplication
 */
export function normalizeDedupKey(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/\$[^$]*\$/g, ' ') // normalize math tokens
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Load checkpoints from disk on startup and reconcile interrupted jobs
 */
export function initAiGenerationCheckpointEngine(): void {
  if (isInitialized) return;
  ensureStorageDir();

  jobStore.clear();

  try {
    if (fs.existsSync(CHECKPOINTS_FILE_PATH)) {
      const raw = fs.readFileSync(CHECKPOINTS_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        for (const job of parsed) {
          if (job && job.jobId) {
            // Reconcile in-progress jobs on server restart: mark as PAUSED so user can resume seamlessly
            if (job.status === 'IN_PROGRESS' || job.status === 'FAILOVER_IN_PROGRESS') {
              job.status = 'PAUSED';
              job.failureReason = 'Server process restarted while job was in progress. Ready to resume from checkpoint.';
            }
            jobStore.set(job.jobId, job);
          }
        }
        console.log(`[AI Orchestrator] 🚀 Restored ${jobStore.size} persistent generation checkpoints from disk.`);
      }
    }
  } catch (err) {
    console.warn('[AI Orchestrator] Failed reading checkpoints file, initializing fresh store:', err);
  }

  isInitialized = true;
}

/**
 * Save in-memory jobs to disk atomically
 */
function persistCheckpointsToDisk(): void {
  ensureStorageDir();
  try {
    const jobList = Array.from(jobStore.values());
    const tempPath = `${CHECKPOINTS_FILE_PATH}.tmp.${Date.now()}`;
    fs.writeFileSync(tempPath, JSON.stringify(jobList, null, 2), 'utf-8');
    fs.renameSync(tempPath, CHECKPOINTS_FILE_PATH);
  } catch (err) {
    console.error('[AI Orchestrator] ❌ Failed to persist checkpoints to disk:', err);
  }
}

/**
 * Classify errors to determine failover eligibility
 */
export function classifyGenerationError(error: any): ErrorClassification {
  let status = error?.status || error?.statusCode || error?.error?.code || error?.response?.status || 0;
  let rawMsg = String(error?.message || error?.error?.message || (typeof error === 'object' ? JSON.stringify(error) : error) || '');

  // Parse nested JSON in error message if present (e.g. {"error":{"code":503,"message":"..."}})
  if (rawMsg.includes('{"error"') || (rawMsg.startsWith('{') && rawMsg.includes('"code"'))) {
    try {
      const jsonStart = rawMsg.indexOf('{');
      const jsonEnd = rawMsg.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1) {
        const parsed = JSON.parse(rawMsg.slice(jsonStart, jsonEnd + 1));
        if (parsed?.error?.code) status = parsed.error.code;
        if (parsed?.error?.message) rawMsg = parsed.error.message;
      }
    } catch (_) {}
  }

  const msg = rawMsg.toLowerCase();

  const isQuotaOrRateLimit =
    status === 429 ||
    msg.includes('resource_exhausted') ||
    msg.includes('quota') ||
    msg.includes('rate limit') ||
    msg.includes('429');

  const isHighDemandOrUnavailable =
    status === 503 ||
    status === 504 ||
    status === 408 ||
    msg.includes('503') ||
    msg.includes('504') ||
    msg.includes('high demand') ||
    msg.includes('overloaded') ||
    msg.includes('unavailable') ||
    msg.includes('service unavailable');

  const isTokenLimit =
    status === 413 ||
    msg.includes('token limit') ||
    msg.includes('max_tokens') ||
    msg.includes('output token') ||
    msg.includes('context length') ||
    msg.includes('maximum context') ||
    msg.includes('payload too large');

  const isTimeout =
    msg.includes('timeout') ||
    msg.includes('etimedout') ||
    msg.includes('esockettimedout') ||
    msg.includes('aborted');

  const isTransientNetwork =
    msg.includes('fetch failed') ||
    msg.includes('econnreset') ||
    msg.includes('socket hang up') ||
    msg.includes('network error');

  const isTransient = isQuotaOrRateLimit || isHighDemandOrUnavailable || isTimeout || isTransientNetwork;

  const isFailoverEligible = isQuotaOrRateLimit || isHighDemandOrUnavailable || isTokenLimit || isTimeout || isTransientNetwork;

  return {
    isFailoverEligible,
    isQuotaOrRateLimit,
    isTokenLimit,
    isHighDemandOrUnavailable,
    isTimeout,
    isTransient,
    reason: rawMsg.slice(0, 250),
    statusCode: status,
  };
}

/**
 * Create or initialize a new AI Generation Job
 */
export function createAiGenerationJob<T = any>(params: {
  jobId?: string;
  generationType: AiGenerationType;
  targetId?: string;
  requestedCount: number;
  initialModel: string;
  promptVersion?: string;
  schemaVersion?: string;
  rawConfig?: any;
  metadata?: Record<string, any>;
}): AiGenerationJob<T> {
  initAiGenerationCheckpointEngine();

  const jobId = params.jobId || `JOB-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
  const now = Date.now();

  const existing = jobStore.get(jobId);
  if (existing) {
    return existing as AiGenerationJob<T>;
  }

  const job: AiGenerationJob<T> = {
    jobId,
    generationType: params.generationType,
    targetId: params.targetId,
    requestedCount: Math.max(1, params.requestedCount),
    completedCount: 0,
    remainingCount: Math.max(1, params.requestedCount),
    checkpoint: 0,
    currentBatch: 0,
    currentItemIndex: 0,
    modelId: params.initialModel,
    providerId: 'google-gemini',
    attempt: 0,
    status: 'INITIALIZED',
    promptVersion: params.promptVersion || 'v2.0',
    schemaVersion: params.schemaVersion || 'v2.0',
    createdAt: now,
    updatedAt: now,
    lastCheckpointAt: now,
    modelChain: [params.initialModel],
    checkpointData: [],
    dedupKeys: [],
    rawConfig: params.rawConfig,
    metadata: params.metadata || {},
  };

  jobStore.set(jobId, job);
  persistCheckpointsToDisk();
  return job;
}

/**
 * Retrieve job by ID
 */
export function getAiGenerationJob<T = any>(jobId: string): AiGenerationJob<T> | undefined {
  initAiGenerationCheckpointEngine();
  return jobStore.get(jobId) as AiGenerationJob<T> | undefined;
}

/**
 * List all jobs
 */
export function listAiGenerationJobs(filter?: {
  type?: AiGenerationType;
  status?: AiJobStatus;
  limit?: number;
}): AiGenerationJob[] {
  initAiGenerationCheckpointEngine();
  let list = Array.from(jobStore.values());
  if (filter?.type) {
    list = list.filter((j) => j.generationType === filter.type);
  }
  if (filter?.status) {
    list = list.filter((j) => j.status === filter.status);
  }
  list.sort((a, b) => b.updatedAt - a.updatedAt);
  if (filter?.limit && filter.limit > 0) {
    list = list.slice(0, filter.limit);
  }
  return list;
}

/**
 * Atomic Checkpoint Advance:
 * Appends a verified, validated unit and persists to disk.
 * If validation fails or item is duplicate, returns false and does NOT advance checkpoint.
 */
export function advanceAiJobCheckpoint<T = any>(
  jobId: string,
  item: T,
  dedupText?: string
): boolean {
  initAiGenerationCheckpointEngine();
  const job = jobStore.get(jobId);
  if (!job) return false;

  // Duplicate Check
  const key = normalizeDedupKey(dedupText || (typeof item === 'string' ? item : JSON.stringify(item)));
  if (key && job.dedupKeys.includes(key)) {
    console.log(`[AI Orchestrator] Deduplication filter active: Skipping duplicate item in job ${jobId}`);
    return false;
  }

  const itemHash = computeContentHash(item);
  job.checkpointData.push(item);
  if (key) {
    job.dedupKeys.push(key);
  }

  job.completedCount = job.checkpointData.length;
  job.remainingCount = Math.max(0, job.requestedCount - job.completedCount);
  job.checkpoint = job.completedCount;
  job.currentItemIndex = job.completedCount;
  job.lastSuccessfulOutput = item;
  job.lastSuccessfulOutputHash = itemHash;
  job.lastCheckpointAt = Date.now();
  job.updatedAt = Date.now();

  if (job.completedCount >= job.requestedCount) {
    job.status = 'COMPLETED';
  } else {
    job.status = 'IN_PROGRESS';
  }

  persistCheckpointsToDisk();
  return true;
}

/**
 * Record a model failover transition in the persistent job
 */
export function recordAiJobFailover(
  jobId: string,
  fromModel: string,
  toModel: string,
  errorReason: string
): void {
  initAiGenerationCheckpointEngine();
  const job = jobStore.get(jobId);
  if (!job) return;

  if (!job.modelChain.includes(toModel)) {
    job.modelChain.push(toModel);
  }
  job.modelId = toModel;
  job.status = 'FAILOVER_IN_PROGRESS';
  job.failureReason = `Model failover from ${fromModel} to ${toModel}: ${errorReason.slice(0, 150)}`;
  job.attempt += 1;
  job.updatedAt = Date.now();

  persistCheckpointsToDisk();
  console.log(`[AI Orchestrator] 🔄 Job ${jobId} failover: ${fromModel} -> ${toModel} (Checkpoint: ${job.checkpoint}/${job.requestedCount})`);
}

/**
 * Mark a job as FAILED
 */
export function markAiJobFailed(jobId: string, reason: string): void {
  initAiGenerationCheckpointEngine();
  const job = jobStore.get(jobId);
  if (!job) return;

  job.status = 'FAILED';
  job.failureReason = reason;
  job.updatedAt = Date.now();
  persistCheckpointsToDisk();
}

/**
 * Mark a job as COMPLETED
 */
export function markAiJobCompleted(jobId: string): void {
  initAiGenerationCheckpointEngine();
  const job = jobStore.get(jobId);
  if (!job) return;

  job.status = 'COMPLETED';
  job.remainingCount = 0;
  job.updatedAt = Date.now();
  persistCheckpointsToDisk();
}

/**
 * Pause a job
 */
export function pauseAiJob(jobId: string): boolean {
  initAiGenerationCheckpointEngine();
  const job = jobStore.get(jobId);
  if (!job) return false;
  job.status = 'PAUSED';
  job.updatedAt = Date.now();
  persistCheckpointsToDisk();
  return true;
}

/**
 * Cancel a job
 */
export function cancelAiJob(jobId: string): boolean {
  initAiGenerationCheckpointEngine();
  const job = jobStore.get(jobId);
  if (!job) return false;
  job.status = 'CANCELLED';
  job.updatedAt = Date.now();
  persistCheckpointsToDisk();
  return true;
}

export interface ResumableGenerationResult<T> {
  job: AiGenerationJob<T>;
  items: T[];
  completedCount: number;
  actualModelUsed: string;
  failoverOccurred: boolean;
  modelChain: string[];
  resumedFromCheckpoint: number;
}

/**
 * GLOBAL RESUMABLE GENERATION RUNNER
 * 
 * Executes any generation workflow with unit-by-unit checkpoint persistence and automatic model failover.
 * If a job is interrupted or fails halfway, it resumes strictly from the last persisted checkpoint.
 */
export async function executeResumableGeneration<T = any>(options: {
  jobId?: string;
  generationType: AiGenerationType;
  targetId?: string;
  requestedCount: number;
  requestedModel: string;
  processingMode?: 'MANUAL' | 'AUTO_FAILOVER';
  catalog: GeminiLifecycleCatalog;
  maxBatchSize?: number;
  rawConfig?: any;
  metadata?: Record<string, any>;
  generateBatch: (params: {
    model: string;
    neededCount: number;
    completedItems: T[];
    offset: number;
  }) => Promise<{ items: T[]; rawModel?: string }>;
  validateItem: (item: T, existingItems: T[]) => { valid: boolean; sanitized: T; dedupKey: string; reason?: string };
  onProgress?: (progress: { completed: number; total: number; model: string; status: AiJobStatus }) => void;
}): Promise<ResumableGenerationResult<T>> {
  initAiGenerationCheckpointEngine();

  const processingMode = options.processingMode || 'AUTO_FAILOVER';
  let job = options.jobId ? getAiGenerationJob<T>(options.jobId) : undefined;

  if (!job) {
    job = createAiGenerationJob<T>({
      jobId: options.jobId,
      generationType: options.generationType,
      targetId: options.targetId,
      requestedCount: options.requestedCount,
      initialModel: options.requestedModel,
      rawConfig: options.rawConfig,
      metadata: options.metadata,
    });
  }

  // Update requested count if increased in continuation
  if (options.requestedCount > job.requestedCount) {
    job.requestedCount = options.requestedCount;
    job.remainingCount = job.requestedCount - job.completedCount;
    job.status = 'IN_PROGRESS';
    persistCheckpointsToDisk();
  }

  const initialCheckpoint = job.completedCount;
  let activeModel = job.modelId || options.requestedModel;
  const failoverChain = buildAdaptiveFailoverChain(activeModel, options.catalog, processingMode);

  let currentModelIndex = failoverChain.indexOf(activeModel);
  if (currentModelIndex === -1) currentModelIndex = 0;

  job.status = 'IN_PROGRESS';
  persistCheckpointsToDisk();

  const maxBatchSize = Math.max(1, options.maxBatchSize || 10);
  let consecutiveFailures = 0;

  while (job.completedCount < job.requestedCount) {
    const needed = job.requestedCount - job.completedCount;
    const batchSize = Math.min(needed, maxBatchSize);
    activeModel = failoverChain[currentModelIndex] || activeModel;

    job.modelId = activeModel;
    job.currentBatch += 1;

    if (options.onProgress) {
      options.onProgress({
        completed: job.completedCount,
        total: job.requestedCount,
        model: activeModel,
        status: job.status,
      });
    }

    try {
      console.log(`[AI Orchestrator] Generating ${batchSize} items for Job ${job.jobId} (Model: ${activeModel}, Completed: ${job.completedCount}/${job.requestedCount})`);
      
      const batchResult = await options.generateBatch({
        model: activeModel,
        neededCount: batchSize,
        completedItems: job.checkpointData,
        offset: job.completedCount,
      });

      const rawItems = Array.isArray(batchResult.items) ? batchResult.items : [];
      let addedInBatch = 0;

      for (const raw of rawItems) {
        if (job.completedCount >= job.requestedCount) break;

        const validation = options.validateItem(raw, job.checkpointData);
        if (validation.valid && validation.sanitized) {
          const advanced = advanceAiJobCheckpoint(job.jobId, validation.sanitized, validation.dedupKey);
          if (advanced) {
            addedInBatch++;
          }
        } else {
          console.warn(`[AI Orchestrator] Item validation rejected: ${validation.reason || 'Invalid schema/content'}`);
        }
      }

      if (addedInBatch > 0) {
        consecutiveFailures = 0;
        recordModelExecutionResult(options.catalog, activeModel, true);
      } else {
        consecutiveFailures++;
        console.warn(`[AI Orchestrator] Zero valid items produced in batch by model ${activeModel}. Consecutive empty batches: ${consecutiveFailures}`);
        if (consecutiveFailures >= 2) {
          throw new Error(`Model ${activeModel} produced zero valid items after ${consecutiveFailures} attempts.`);
        }
      }
    } catch (err: any) {
      consecutiveFailures++;
      const classification = classifyGenerationError(err);
      console.warn(`[AI Orchestrator] Error during generation on model ${activeModel}: ${classification.reason} (Failover eligible: ${classification.isFailoverEligible})`);

      recordModelExecutionResult(options.catalog, activeModel, false, err);

      if (processingMode === 'MANUAL' || !classification.isFailoverEligible) {
        markAiJobFailed(job.jobId, classification.reason);
        throw err;
      }

      // Model Failover: Try next model in chain
      currentModelIndex++;
      if (currentModelIndex >= failoverChain.length) {
        // If all models in the active chain exhausted, try any other healthy model in catalog
        const nextHealthy = options.catalog.models.find(
          (m) => m.healthStatus === 'HEALTHY' && m.enabled && !job?.modelChain.includes(m.id)
        );

        if (nextHealthy) {
          failoverChain.push(nextHealthy.id);
        } else {
          markAiJobFailed(job.jobId, `All models exhausted in failover chain. Last error: ${classification.reason}`);
          throw new Error(`All available models exhausted in failover chain. Checkpoint preserved at ${job.completedCount}/${job.requestedCount}. Last error: ${classification.reason}`);
        }
      }

      const nextModel = failoverChain[currentModelIndex];
      recordAiJobFailover(job.jobId, activeModel, nextModel, classification.reason);
      activeModel = nextModel;
      
      // Brief jitter before resuming from checkpoint on new model
      await new Promise((resolve) => setTimeout(resolve, 300 + Math.random() * 200));
    }
  }

  markAiJobCompleted(job.jobId);

  return {
    job,
    items: job.checkpointData,
    completedCount: job.completedCount,
    actualModelUsed: activeModel,
    failoverOccurred: job.modelChain.length > 1,
    modelChain: job.modelChain,
    resumedFromCheckpoint: initialCheckpoint,
  };
}
