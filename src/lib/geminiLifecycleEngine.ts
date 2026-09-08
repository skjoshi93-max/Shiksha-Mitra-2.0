/**
 * Gemini AI Model Lifecycle Management Engine
 *
 * Authoritative dynamic model discovery, capability validation, auto-migration,
 * retirement quarantine, and adaptive tier-based failover for Google Gemini models.
 */

export type GeminiTier = 'flash-lite' | 'flash' | 'pro' | 'custom';
export type ModelHealthStatus = 'HEALTHY' | 'DEGRADED' | 'RETIRED' | 'UNAVAILABLE';
export type ProcessingMode = 'MANUAL' | 'AUTO_FAILOVER';

export interface LifecycleModel {
  id: string;
  displayName: string;
  tier: GeminiTier;
  version: number;
  description: string;
  recommended: boolean;
  enabled: boolean;
  healthStatus: ModelHealthStatus;
  fallbackPriority: number;
  inputTokenLimit?: number;
  outputTokenLimit?: number;
  supportedGenerationMethods?: string[];
  lastChecked: number;
  successCount: number;
  failureCount: number;
  lastError: string | null;
  degradedUntil?: number;
}

export interface ModelResolution {
  targetModel: string;
  migrated: boolean;
  originalRequestedModel: string;
  reason: string;
  tier: GeminiTier;
}

export interface MigrationLogEntry {
  timestamp: number;
  fromModel: string;
  toModel: string;
  reason: string;
}

export interface GeminiLifecycleCatalog {
  models: LifecycleModel[];
  recommendedModelId: string;
  lastDiscoveredAt: number;
  discoverySource: 'api' | 'cached' | 'fallback';
  migrationLog: MigrationLogEntry[];
}

// Confirmed deprecated and retired legacy model patterns prohibited by Google deprecation notices
const PROHIBITED_DEPRECATED_PATTERNS = [
  'gemini-1.0',
  'gemini-1.5',
  'gemini-2.0',
  'gemini-2.5',
  'gemini-pro-vision',
  'bison',
];

// Specialized non-text, vision-only, audio-only, robotics, low-tier testing or experimental infrastructure modalities to exclude
const EXCLUDED_SPECIALIZED_PATTERNS = [
  'robotics',
  'computer-use',
  'tts',
  'transcribe',
  'transcription',
  'speech',
  'image',
  'imagen',
  'veo',
  'lyria',
  'omni',
  'deep-research',
  'antigravity',
  'customtools',
  'native-audio',
  'live-translate',
  'live-preview',
  'embedding',
  'aqa',
  'nano',
  'banana',
  'test-model',
  'dummy',
];

// Explicit AI Studio Chat model hierarchy mapping matching Google AI Studio interface
const AI_STUDIO_CHAT_ORDER: Record<string, number> = {
  'gemini-3.7-flash': 1,
  'gemini-flash-latest': 2,
  'gemini-3.1-flash-lite': 3,
  'gemini-flash-lite-latest': 4,
  'gemini-3.5-flash': 5,
  'gemini-3.5-flash-lite': 6,
  'gemini-3.6-flash': 7,
  'gemini-3-flash-preview': 8,
  'gemini-3.1-flash-lite-preview': 9,
  'gemini-pro-latest': 10,
  'gemini-3.1-pro-preview': 11,
};

/**
 * Parses authoritative model identification and metadata from the connected Google Gemini API.
 */
export function parseModelInfo(
  rawId: string,
  rawDisplayName?: string,
  supportedActions?: string[]
): {
  id: string;
  displayName: string;
  tier: GeminiTier;
  version: number;
  isUsableForGeneration: boolean;
  isDeprecated: boolean;
  description: string;
} {
  const cleanId = (rawId || '').replace(/^models\//, '').trim().toLowerCase();
  const displayName = rawDisplayName || cleanId;
  const lowerCombined = `${cleanId} ${displayName}`.toLowerCase();

  // 1. Check if model supports generateContent
  const hasGenerateContent = !supportedActions || supportedActions.length === 0 || supportedActions.includes('generateContent');

  // 2. Check if explicitly deprecated / retired
  const isDeprecated = PROHIBITED_DEPRECATED_PATTERNS.some(p => cleanId.includes(p));

  // 3. Check if specialized non-text or domain-specific model
  const isSpecialized = EXCLUDED_SPECIALIZED_PATTERNS.some(p => lowerCombined.includes(p));

  // 4. Must be a Gemini general generation model (matching Google AI Studio chat models)
  const isGeminiFamily = cleanId.startsWith('gemini-');

  const isUsableForGeneration = hasGenerateContent && !isDeprecated && !isSpecialized && isGeminiFamily;

  // Extract version number
  let version = 3.5;
  const versionMatch = cleanId.match(/gemini-(\d+(?:\.\d+)?)/i);
  if (versionMatch && versionMatch[1]) {
    version = parseFloat(versionMatch[1]);
  } else if (cleanId.includes('flash-latest') || cleanId.includes('pro-latest') || cleanId.includes('lite-latest')) {
    version = 3.9;
  }

  // Determine Tier
  let tier: GeminiTier = 'flash';
  if (lowerCombined.includes('lite') || lowerCombined.includes('flash-lite')) {
    tier = 'flash-lite';
  } else if (lowerCombined.includes('pro')) {
    tier = 'pro';
  } else {
    tier = 'flash';
  }

  // Clean and format display name to match Google AI Studio chat options
  let formattedName = rawDisplayName || cleanId;
  if (cleanId === 'gemini-3.7-flash') formattedName = 'Gemini 3.7 Flash';
  else if (cleanId === 'gemini-3.5-flash-lite') formattedName = 'Gemini 3.5 Flash Lite';
  else if (cleanId === 'gemini-3.1-pro-preview') formattedName = 'Gemini 3.1 Pro Preview';
  else if (cleanId === 'gemini-3.6-flash') formattedName = 'Gemini 3.6 Flash';
  else if (cleanId === 'gemini-3.5-flash') formattedName = 'Gemini 3.5 Flash';
  else if (cleanId === 'gemini-3.1-flash-lite') formattedName = 'Gemini 3.1 Flash Lite';
  else if (cleanId === 'gemini-3.1-flash-lite-preview') formattedName = 'Gemini 3.1 Flash Lite Preview';
  else if (cleanId === 'gemini-3-flash-preview') formattedName = 'Gemini 3 Flash Preview';
  else if (cleanId === 'gemini-pro-latest') formattedName = 'Gemini Pro Latest';
  else if (cleanId === 'gemini-flash-latest') formattedName = 'Gemini Flash Latest';
  else if (cleanId === 'gemini-flash-lite-latest') formattedName = 'Gemini Flash-Lite Latest';

  // Create human-readable description
  let description = `${formattedName} for curriculum intelligence, assessment creation, and question generation.`;
  if (cleanId === 'gemini-3.7-flash') {
    description = 'Default Google AI Studio model with advanced pedagogical reasoning and low-latency output.';
  } else if (tier === 'flash-lite') {
    description = `Ultra-fast, lightweight model optimized for high-throughput, low-latency assessment generation.`;
  } else if (tier === 'pro') {
    description = `Deep reasoning model designed for complex pedagogical verification and taxonomy proofs.`;
  } else {
    description = `High-accuracy, balanced model for structured JSON generation and NCERT content extraction.`;
  }

  return {
    id: cleanId,
    displayName: formattedName,
    tier,
    version,
    isUsableForGeneration,
    isDeprecated,
    description,
  };
}

/**
 * Creates a verified baseline catalog of currently active models matching Google AI Studio Chat.
 * Used as reliable initial state before live discovery completes.
 */
export function createDefaultLifecycleCatalog(): GeminiLifecycleCatalog {
  const models: LifecycleModel[] = [
    {
      id: 'gemini-3.7-flash',
      displayName: 'Gemini 3.7 Flash',
      tier: 'flash',
      version: 3.7,
      description: 'Default Google AI Studio model with advanced pedagogical reasoning and low latency.',
      recommended: true,
      enabled: true,
      healthStatus: 'HEALTHY',
      fallbackPriority: 1,
      lastChecked: Date.now(),
      successCount: 0,
      failureCount: 0,
      lastError: null,
    },
    {
      id: 'gemini-flash-latest',
      displayName: 'Gemini Flash Latest',
      tier: 'flash',
      version: 3.9,
      description: 'Continuous production release of Gemini Flash with maximum availability.',
      recommended: false,
      enabled: true,
      healthStatus: 'HEALTHY',
      fallbackPriority: 2,
      lastChecked: Date.now(),
      successCount: 0,
      failureCount: 0,
      lastError: null,
    },
    {
      id: 'gemini-3.1-flash-lite',
      displayName: 'Gemini 3.1 Flash Lite',
      tier: 'flash-lite',
      version: 3.1,
      description: 'Ultra-fast, lightweight model optimized for high-volume assessment generation.',
      recommended: false,
      enabled: true,
      healthStatus: 'HEALTHY',
      fallbackPriority: 3,
      lastChecked: Date.now(),
      successCount: 0,
      failureCount: 0,
      lastError: null,
    },
    {
      id: 'gemini-flash-lite-latest',
      displayName: 'Gemini Flash-Lite Latest',
      tier: 'flash-lite',
      version: 3.9,
      description: 'Latest continuous release of Gemini Flash-Lite.',
      recommended: false,
      enabled: true,
      healthStatus: 'HEALTHY',
      fallbackPriority: 4,
      lastChecked: Date.now(),
      successCount: 0,
      failureCount: 0,
      lastError: null,
    },
    {
      id: 'gemini-3.5-flash',
      displayName: 'Gemini 3.5 Flash',
      tier: 'flash',
      version: 3.5,
      description: 'Balanced Gemini 3.5 Flash model for curriculum generation and structured content.',
      recommended: false,
      enabled: true,
      healthStatus: 'HEALTHY',
      fallbackPriority: 5,
      lastChecked: Date.now(),
      successCount: 0,
      failureCount: 0,
      lastError: null,
    },
    {
      id: 'gemini-3.5-flash-lite',
      displayName: 'Gemini 3.5 Flash Lite',
      tier: 'flash-lite',
      version: 3.5,
      description: 'Ultra-fast, lightweight Gemini 3.5 model optimized for low-latency question extraction.',
      recommended: false,
      enabled: true,
      healthStatus: 'HEALTHY',
      fallbackPriority: 6,
      lastChecked: Date.now(),
      successCount: 0,
      failureCount: 0,
      lastError: null,
    },
    {
      id: 'gemini-3.6-flash',
      displayName: 'Gemini 3.6 Flash',
      tier: 'flash',
      version: 3.6,
      description: 'High-speed Gemini 3.6 Flash model for fast generation and assessment creation.',
      recommended: false,
      enabled: true,
      healthStatus: 'HEALTHY',
      fallbackPriority: 7,
      lastChecked: Date.now(),
      successCount: 0,
      failureCount: 0,
      lastError: null,
    },
    {
      id: 'gemini-3-flash-preview',
      displayName: 'Gemini 3 Flash Preview',
      tier: 'flash',
      version: 3.0,
      description: 'Preview release of Gemini 3 Flash model.',
      recommended: false,
      enabled: true,
      healthStatus: 'HEALTHY',
      fallbackPriority: 8,
      lastChecked: Date.now(),
      successCount: 0,
      failureCount: 0,
      lastError: null,
    },
    {
      id: 'gemini-3.1-flash-lite-preview',
      displayName: 'Gemini 3.1 Flash Lite Preview',
      tier: 'flash-lite',
      version: 3.1,
      description: 'Preview release of lightweight Gemini 3.1 Flash Lite.',
      recommended: false,
      enabled: true,
      healthStatus: 'HEALTHY',
      fallbackPriority: 9,
      lastChecked: Date.now(),
      successCount: 0,
      failureCount: 0,
      lastError: null,
    },
    {
      id: 'gemini-pro-latest',
      displayName: 'Gemini Pro Latest',
      tier: 'pro',
      version: 3.9,
      description: 'Latest continuous release of Gemini Pro.',
      recommended: false,
      enabled: true,
      healthStatus: 'HEALTHY',
      fallbackPriority: 10,
      lastChecked: Date.now(),
      successCount: 0,
      failureCount: 0,
      lastError: null,
    },
    {
      id: 'gemini-3.1-pro-preview',
      displayName: 'Gemini 3.1 Pro Preview',
      tier: 'pro',
      version: 3.1,
      description: 'Deep reasoning model for rigorous pedagogical verification and complex proof questions.',
      recommended: false,
      enabled: true,
      healthStatus: 'HEALTHY',
      fallbackPriority: 11,
      lastChecked: Date.now(),
      successCount: 0,
      failureCount: 0,
      lastError: null,
    },
  ];

  return {
    models,
    recommendedModelId: 'gemini-3.7-flash',
    lastDiscoveredAt: Date.now(),
    discoverySource: 'fallback',
    migrationLog: [],
  };
}

/**
 * Builds a dynamic lifecycle catalog strictly from authoritative discovered models from the Google GenAI API.
 * Automatically validates generation capability, excludes unsupported or retired models,
 * and automatically adapts to any newly added or removed models from Google AI Studio.
 */
export function buildCatalogFromDiscoveredModels(
  rawDiscoveredModels: Array<{
    name: string;
    displayName?: string;
    description?: string;
    inputTokenLimit?: number;
    outputTokenLimit?: number;
    supportedGenerationMethods?: string[];
  }>
): GeminiLifecycleCatalog {
  // Merge discovered models with default verified baseline catalog so all supported models remain available
  const defaultModels = createDefaultLifecycleCatalog().models;
  const mergedMap = new Map<string, LifecycleModel>();

  // First populate default baseline models
  for (const def of defaultModels) {
    mergedMap.set(def.id, { ...def });
  }

  // Next overwrite or add models discovered live from Google API
  for (const raw of rawDiscoveredModels) {
    const info = parseModelInfo(raw.name, raw.displayName, raw.supportedGenerationMethods);

    // Filter strictly: must support generateContent, must not be specialized or deprecated
    if (!info.isUsableForGeneration) {
      continue;
    }

    const existing = mergedMap.get(info.id);
    if (existing) {
      existing.displayName = info.displayName;
      existing.inputTokenLimit = raw.inputTokenLimit || existing.inputTokenLimit;
      existing.outputTokenLimit = raw.outputTokenLimit || existing.outputTokenLimit;
      existing.supportedGenerationMethods = raw.supportedGenerationMethods;
    } else {
      mergedMap.set(info.id, {
        id: info.id,
        displayName: info.displayName,
        tier: info.tier,
        version: info.version,
        description: raw.description || info.description,
        recommended: info.id === 'gemini-3.7-flash',
        enabled: true,
        healthStatus: 'HEALTHY',
        fallbackPriority: 10,
        inputTokenLimit: raw.inputTokenLimit,
        outputTokenLimit: raw.outputTokenLimit,
        supportedGenerationMethods: raw.supportedGenerationMethods,
        lastChecked: Date.now(),
        successCount: 0,
        failureCount: 0,
        lastError: null,
      });
    }
  }

  const parsedModels = Array.from(mergedMap.values());

  // Sort according to AI Studio priority hierarchy, with future newer versions sorted to the top
  parsedModels.sort((a, b) => {
    const rankA = AI_STUDIO_CHAT_ORDER[a.id];
    const rankB = AI_STUDIO_CHAT_ORDER[b.id];

    if (rankA !== undefined && rankB !== undefined) {
      return rankA - rankB;
    }
    if (rankA !== undefined) return -1;
    if (rankB !== undefined) return 1;

    // For brand new future models not in preset order: sort by version (highest first)
    if (b.version !== a.version) {
      return b.version - a.version;
    }
    return a.id.localeCompare(b.id);
  });

  // Assign fallback priorities dynamically
  parsedModels.forEach((m, idx) => {
    m.fallbackPriority = idx + 1;
  });

  // Set Default (Gemini 3.7 Flash) as recommended model
  const topDefault = parsedModels.find(m => m.id === 'gemini-3.7-flash' && m.healthStatus === 'HEALTHY');
  const topFlashLite = parsedModels.find(m => m.id === 'gemini-3.5-flash-lite' && m.healthStatus === 'HEALTHY');
  const fallbackModel = topDefault || topFlashLite || parsedModels[0];

  parsedModels.forEach(m => {
    m.recommended = m.id === fallbackModel.id;
  });

  return {
    models: parsedModels,
    recommendedModelId: fallbackModel ? fallbackModel.id : 'gemini-3.7-flash',
    lastDiscoveredAt: Date.now(),
    discoverySource: 'api',
    migrationLog: [],
  };
}

/**
 * Resolves a requested model ID to an active, healthy model.
 * If the requested model is retired, deprecated, or unavailable, it automatically
 * migrates to the best compatible active model in the same tier.
 */
export function resolveModelWithAutoMigration(
  requestedModelId: string,
  catalog: GeminiLifecycleCatalog
): ModelResolution {
  const cleanRequested = (requestedModelId || '').replace(/^models\//, '').trim().toLowerCase();

  // If requested is 'default' or empty, use the authoritative recommended default model
  if (!cleanRequested || cleanRequested === 'default') {
    const recId = catalog.recommendedModelId || 'gemini-3.7-flash';
    const recModel = catalog.models.find(m => m.id === recId) || catalog.models[0];
    return {
      targetModel: recModel ? recModel.id : 'gemini-3.7-flash',
      migrated: false,
      originalRequestedModel: requestedModelId || 'default',
      reason: 'Using authoritative default model.',
      tier: recModel?.tier || 'flash',
    };
  }

  // Find exact match in catalog
  const existing = catalog.models.find(m => m.id.toLowerCase() === cleanRequested);

  const now = Date.now();
  if (existing) {
    // Check if model is degraded but cooldown expired
    if (existing.healthStatus === 'DEGRADED' && existing.degradedUntil && now > existing.degradedUntil) {
      existing.healthStatus = 'HEALTHY';
      existing.degradedUntil = undefined;
    }

    // If model is healthy and enabled, use it directly
    if (existing.healthStatus === 'HEALTHY' && existing.enabled) {
      return {
        targetModel: existing.id,
        migrated: false,
        originalRequestedModel: requestedModelId,
        reason: 'Requested model is active and healthy.',
        tier: existing.tier,
      };
    }
  }

  // Model is either missing, deprecated, retired, or currently degraded
  const info = parseModelInfo(cleanRequested);
  const targetTier = info.tier;

  // Find best replacement in the same tier
  const sameTierHealthy = catalog.models.filter(
    m => m.tier === targetTier && m.healthStatus === 'HEALTHY' && m.enabled
  );

  let replacement: LifecycleModel | undefined;

  if (sameTierHealthy.length > 0) {
    // Pick highest version in same tier
    replacement = sameTierHealthy[0];
  } else {
    // Fallback to any healthy model in catalog (prefer flash-lite or flash)
    const anyHealthy = catalog.models.filter(m => m.healthStatus === 'HEALTHY' && m.enabled);
    replacement = anyHealthy.find(m => m.tier === 'flash-lite') ||
                  anyHealthy.find(m => m.tier === 'flash') ||
                  anyHealthy[0] ||
                  catalog.models[0];
  }

  const targetModel = replacement ? replacement.id : (catalog.recommendedModelId || 'gemini-3.7-flash');

  const migrationReason = existing
    ? `Requested model '${cleanRequested}' is currently ${existing.healthStatus}. Auto-migrated to ${targetModel} (${replacement?.tier || 'active'} tier).`
    : `Requested model '${cleanRequested || 'default'}' is deprecated or unlisted. Auto-migrated to active compatible model ${targetModel}.`;

  // Log migration
  if (cleanRequested && cleanRequested !== targetModel) {
    catalog.migrationLog.push({
      timestamp: now,
      fromModel: cleanRequested,
      toModel: targetModel,
      reason: migrationReason,
    });
    // Keep max 50 migration logs
    if (catalog.migrationLog.length > 50) {
      catalog.migrationLog.shift();
    }
  }

  return {
    targetModel,
    migrated: true,
    originalRequestedModel: requestedModelId,
    reason: migrationReason,
    tier: replacement?.tier || 'flash',
  };
}

/**
 * Builds an adaptive, prioritized failover chain for a given model request.
 * Automatically excludes retired and unhealthy models.
 */
export function buildAdaptiveFailoverChain(
  requestedModelId: string,
  catalog: GeminiLifecycleCatalog,
  processingMode: ProcessingMode = 'AUTO_FAILOVER'
): string[] {
  const resolution = resolveModelWithAutoMigration(requestedModelId, catalog);
  const primaryModel = resolution.targetModel;

  if (processingMode === 'MANUAL') {
    return [primaryModel];
  }

  const chain: string[] = [primaryModel];

  // 1. Add same-tier healthy models
  const sameTier = catalog.models.filter(
    m => m.tier === resolution.tier && m.healthStatus === 'HEALTHY' && m.enabled && !chain.includes(m.id)
  );
  sameTier.forEach(m => chain.push(m.id));

  // 2. Add other active healthy models sorted by fallback priority
  const others = catalog.models
    .filter(m => m.healthStatus === 'HEALTHY' && m.enabled && !chain.includes(m.id))
    .sort((a, b) => a.fallbackPriority - b.fallbackPriority);

  others.forEach(m => chain.push(m.id));

  // Always ensure active supported models from AI Studio Chat are in the failover chain
  const standardFallbacks = [
    'gemini-3.7-flash',
    'gemini-flash-latest',
    'gemini-3.1-flash-lite',
    'gemini-flash-lite-latest',
    'gemini-3.5-flash',
    'gemini-3.5-flash-lite',
    'gemini-3.6-flash',
    'gemini-3-flash-preview',
    'gemini-3.1-flash-lite-preview',
    'gemini-pro-latest',
    'gemini-3.1-pro-preview',
  ];
  standardFallbacks.forEach(fId => {
    if (!chain.includes(fId)) {
      const existsInCatalog = catalog.models.find(m => m.id === fId);
      if (!existsInCatalog || (existsInCatalog.healthStatus !== 'RETIRED' && existsInCatalog.enabled)) {
        chain.push(fId);
      }
    }
  });

  return chain;
}

/**
 * Records model runtime health result (success or failure) to adaptively
 * manage model lifecycle in real time.
 */
export function recordModelExecutionResult(
  catalog: GeminiLifecycleCatalog,
  modelId: string,
  success: boolean,
  error?: any
): { retired: boolean; status: ModelHealthStatus } {
  const cleanId = modelId.replace(/^models\//, '').trim().toLowerCase();
  const model = catalog.models.find(m => m.id.toLowerCase() === cleanId);
  if (!model) return { retired: false, status: 'UNAVAILABLE' };

  model.lastChecked = Date.now();

  if (success) {
    model.successCount += 1;
    model.failureCount = Math.max(0, model.failureCount - 1); // Decay failures
    if (model.healthStatus === 'DEGRADED') {
      model.healthStatus = 'HEALTHY';
      model.degradedUntil = undefined;
    }
    model.lastError = null;
    return { retired: false, status: model.healthStatus };
  } else {
    model.failureCount += 1;
    let msg = String(error?.message || (error?.error?.message) || (typeof error === 'object' ? JSON.stringify(error) : error) || '');
    let status = error?.status || error?.statusCode || (error?.error?.code) || 0;

    // Parse nested JSON in error message if present (e.g. {"error":{"code":503,"message":"..."}})
    if (msg.includes('{"error"') || (msg.startsWith('{') && msg.includes('"code"'))) {
      try {
        const jsonStart = msg.indexOf('{');
        const jsonEnd = msg.lastIndexOf('}');
        if (jsonStart !== -1 && jsonEnd !== -1) {
          const parsed = JSON.parse(msg.slice(jsonStart, jsonEnd + 1));
          if (parsed?.error?.code) status = parsed.error.code;
          if (parsed?.error?.message) msg = parsed.error.message;
        }
      } catch (_) {}
    }

    model.lastError = msg.slice(0, 200);

    // Detect permanent retirement / unsupported model (404, 410, "no longer available to new users", "not supported", "retired")
    const isRetirement =
      status === 404 ||
      status === 410 ||
      msg.includes('not found') ||
      msg.includes('is not supported') ||
      msg.includes('deprecated') ||
      msg.includes('retired') ||
      msg.includes('no longer available');

    if (isRetirement) {
      model.healthStatus = 'RETIRED';
      model.enabled = false;
      catalog.migrationLog.push({
        timestamp: Date.now(),
        fromModel: model.id,
        toModel: 'N/A',
        reason: `Model retired by provider: ${msg.slice(0, 100)}`,
      });
      return { retired: true, status: 'RETIRED' };
    } else if (
      status === 503 ||
      status === 504 ||
      status === 408 ||
      msg.toLowerCase().includes('high demand') ||
      msg.toLowerCase().includes('unavailable') ||
      msg.toLowerCase().includes('overloaded') ||
      msg.includes('503')
    ) {
      // Temporary high demand spike: apply short 8-second soft cooldown (transient demand spikes recover quickly)
      model.healthStatus = 'DEGRADED';
      model.degradedUntil = Date.now() + 8 * 1000;
      return { retired: false, status: model.healthStatus };
    } else if (
      status === 429 ||
      msg.toLowerCase().includes('resource_exhausted') ||
      msg.toLowerCase().includes('quota') ||
      msg.includes('429')
    ) {
      // Extract retry delay from error message if available (e.g. "Please retry in 534ms", "Please retry in 12.39s", "retryDelay: '12s'")
      let retrySeconds = 12; // Default 12s soft cooldown for rate limits if delay is unspecified
      const msMatch = msg.match(/retry\s+in\s+(\d+(?:\.\d+)?)ms/i) || msg.match(/retryDelay["']?:\s*["']?(\d+(?:\.\d+)?)ms/i);
      const secMatch = msg.match(/retry\s+in\s+(\d+(?:\.\d+)?)s/i) || msg.match(/retryDelay["']?:\s*["']?(\d+(?:\.\d+)?)s/i);

      if (msMatch && msMatch[1]) {
        const parsedMs = parseFloat(msMatch[1]);
        retrySeconds = Math.max(1, Math.ceil(parsedMs / 1000));
      } else if (secMatch && secMatch[1]) {
        const parsedSec = parseFloat(secMatch[1]);
        retrySeconds = Math.max(1, Math.ceil(parsedSec) + 1);
      }

      model.healthStatus = 'DEGRADED';
      model.degradedUntil = Date.now() + retrySeconds * 1000;
      return { retired: false, status: model.healthStatus };
    }
    return { retired: false, status: model.healthStatus };
  }
}
