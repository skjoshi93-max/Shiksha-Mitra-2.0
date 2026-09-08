/**
 * Centralized Gemini AI Model Usage & Daily Limits Monitoring Service
 * 
 * Provides unified tracking for:
 * 1. Daily Token Usage & Daily Token Limits
 * 2. Remaining Tokens & Usage Percentage
 * 3. Daily API Request Usage & Daily Request Limits
 * 4. Remaining API Requests & Usage Percentage
 * 5. Automatic Daily Midnight Reset Engine
 * 6. Visual Status Indicators: Normal (<70%), Warning (70-89%), Critical (90-99%), Exceeded (100%+)
 * 7. Clear distinction between Provider Limits vs Admin-Configured Limits
 */

import { useState, useEffect, useCallback } from 'react';
import { GeminiTier, LifecycleModel, createDefaultLifecycleCatalog } from './geminiLifecycleEngine';

export type UsageStatus = 'NORMAL' | 'WARNING' | 'CRITICAL' | 'EXCEEDED';

export interface ModelUsageRecord {
  modelId: string;
  displayName: string;
  tier: GeminiTier;
  dailyTokenUsage: number;
  dailyTokenLimit: number;
  remainingTokens: number;
  tokenUsagePercentage: number;
  dailyApiUsage: number;
  dailyApiLimit: number;
  remainingApiRequests: number;
  apiUsagePercentage: number;
  providerInputTokenLimit: number;
  providerOutputTokenLimit: number;
  status: UsageStatus;
  lastUsedTimestamp: number | null;
  totalHistoricalTokens: number;
  totalHistoricalRequests: number;
}

export interface GeminiUsageSummary {
  currentDate: string; // YYYY-MM-DD
  lastResetAt: number;
  nextResetAt: number;
  models: Record<string, ModelUsageRecord>;
  totalTokensToday: number;
  totalTokensLimit: number;
  totalApiRequestsToday: number;
  totalApiRequestsLimit: number;
  overallTokenPercentage: number;
  overallApiPercentage: number;
  overallStatus: UsageStatus;
}

// Recommended default baseline daily limits by model tier
export const DEFAULT_TIER_LIMITS: Record<GeminiTier, { dailyTokenLimit: number; dailyApiLimit: number }> = {
  'flash': { dailyTokenLimit: 1000000, dailyApiLimit: 1000 },
  'flash-lite': { dailyTokenLimit: 2000000, dailyApiLimit: 2000 },
  'pro': { dailyTokenLimit: 500000, dailyApiLimit: 500 },
  'custom': { dailyTokenLimit: 500000, dailyApiLimit: 500 },
};

// Provider context window baseline limits (Tokens)
export const PROVIDER_CONTEXT_LIMITS: Record<string, { input: number; output: number }> = {
  'gemini-3.7-flash': { input: 1048576, output: 8192 },
  'gemini-3.6-flash': { input: 1048576, output: 8192 },
  'gemini-3.5-flash': { input: 1048576, output: 8192 },
  'gemini-3.5-flash-lite': { input: 1048576, output: 8192 },
  'gemini-3.1-pro-preview': { input: 2097152, output: 8192 },
  'gemini-3.1-flash-lite': { input: 1048576, output: 8192 },
  'gemini-3.1-flash-lite-preview': { input: 1048576, output: 8192 },
  'gemini-3-flash-preview': { input: 1048576, output: 8192 },
  'gemini-pro-latest': { input: 2097152, output: 8192 },
  'gemini-flash-latest': { input: 1048576, output: 8192 },
  'gemini-flash-lite-latest': { input: 1048576, output: 8192 },
};

/**
 * Calculates status from usage percentage:
 * - Normal: < 70%
 * - Warning: 70% - 89%
 * - Critical: 90% - 99%
 * - Limit Exceeded: >= 100%
 */
export function calculateUsageStatus(percentage: number): UsageStatus {
  if (percentage >= 100) return 'EXCEEDED';
  if (percentage >= 90) return 'CRITICAL';
  if (percentage >= 70) return 'WARNING';
  return 'NORMAL';
}

/**
 * Generates local date string YYYY-MM-DD
 */
export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Generates timestamp for next midnight in local timezone
 */
export function getNextMidnightTimestamp(): number {
  const now = new Date();
  const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  return nextMidnight.getTime();
}

/**
 * Creates default initial usage summary matching active catalog
 */
export function createDefaultUsageSummary(models?: LifecycleModel[]): GeminiUsageSummary {
  const catalogModels = models || createDefaultLifecycleCatalog().models;
  const currentDate = getLocalDateString();
  const now = Date.now();
  const nextReset = getNextMidnightTimestamp();

  const modelMap: Record<string, ModelUsageRecord> = {};
  let totalTokensLimit = 0;
  let totalApiRequestsLimit = 0;

  catalogModels.forEach(m => {
    const tierDefaults = DEFAULT_TIER_LIMITS[m.tier] || DEFAULT_TIER_LIMITS.flash;
    const providerContext = PROVIDER_CONTEXT_LIMITS[m.id] || { input: m.inputTokenLimit || 1048576, output: m.outputTokenLimit || 8192 };

    modelMap[m.id] = {
      modelId: m.id,
      displayName: m.displayName,
      tier: m.tier,
      dailyTokenUsage: 0,
      dailyTokenLimit: tierDefaults.dailyTokenLimit,
      remainingTokens: tierDefaults.dailyTokenLimit,
      tokenUsagePercentage: 0,
      dailyApiUsage: 0,
      dailyApiLimit: tierDefaults.dailyApiLimit,
      remainingApiRequests: tierDefaults.dailyApiLimit,
      apiUsagePercentage: 0,
      providerInputTokenLimit: providerContext.input,
      providerOutputTokenLimit: providerContext.output,
      status: 'NORMAL',
      lastUsedTimestamp: null,
      totalHistoricalTokens: 0,
      totalHistoricalRequests: 0,
    };

    totalTokensLimit += tierDefaults.dailyTokenLimit;
    totalApiRequestsLimit += tierDefaults.dailyApiLimit;
  });

  return {
    currentDate,
    lastResetAt: now,
    nextResetAt: nextReset,
    models: modelMap,
    totalTokensToday: 0,
    totalTokensLimit,
    totalApiRequestsToday: 0,
    totalApiRequestsLimit,
    overallTokenPercentage: 0,
    overallApiPercentage: 0,
    overallStatus: 'NORMAL',
  };
}

// In-memory runtime cache for client-side state
let cachedUsageSummary: GeminiUsageSummary = createDefaultUsageSummary();
const usageListeners = new Set<(summary: GeminiUsageSummary) => void>();

/**
 * Fetches latest daily usage and limits from server
 */
export async function fetchGeminiUsageSummary(): Promise<GeminiUsageSummary> {
  try {
    const res = await fetch('/api/gemini/usage', {
      headers: { 'Cache-Control': 'no-cache' },
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.success && data.summary) {
        cachedUsageSummary = data.summary;
        usageListeners.forEach(cb => cb(cachedUsageSummary));
        return cachedUsageSummary;
      }
    }
  } catch (err) {
    console.warn('[GeminiUsage] Failed to fetch usage from server, using cached summary:', err);
  }
  return cachedUsageSummary;
}

/**
 * Updates configured daily limits for a specific model
 */
export async function updateModelUsageLimits(
  modelId: string,
  limits: { dailyTokenLimit?: number; dailyApiLimit?: number }
): Promise<GeminiUsageSummary> {
  try {
    const res = await fetch('/api/gemini/usage/limits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        modelId,
        dailyTokenLimit: limits.dailyTokenLimit,
        dailyApiLimit: limits.dailyApiLimit,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.success && data.summary) {
        cachedUsageSummary = data.summary;
        usageListeners.forEach(cb => cb(cachedUsageSummary));
        return cachedUsageSummary;
      }
    }
  } catch (err) {
    console.error('[GeminiUsage] Error updating model limits:', err);
  }

  // Optimistic client update fallback
  if (cachedUsageSummary.models[modelId]) {
    const m = cachedUsageSummary.models[modelId];
    if (limits.dailyTokenLimit !== undefined && limits.dailyTokenLimit > 0) {
      m.dailyTokenLimit = limits.dailyTokenLimit;
      m.remainingTokens = Math.max(0, m.dailyTokenLimit - m.dailyTokenUsage);
      m.tokenUsagePercentage = Math.min(100, Math.round((m.dailyTokenUsage / m.dailyTokenLimit) * 100));
    }
    if (limits.dailyApiLimit !== undefined && limits.dailyApiLimit > 0) {
      m.dailyApiLimit = limits.dailyApiLimit;
      m.remainingApiRequests = Math.max(0, m.dailyApiLimit - m.dailyApiUsage);
      m.apiUsagePercentage = Math.min(100, Math.round((m.dailyApiUsage / m.dailyApiLimit) * 100));
    }
    const highestPct = Math.max(m.tokenUsagePercentage, m.apiUsagePercentage);
    m.status = calculateUsageStatus(highestPct);
    usageListeners.forEach(cb => cb(cachedUsageSummary));
  }

  return cachedUsageSummary;
}

/**
 * Resets daily usage counters to 0 for today
 */
export async function resetDailyUsageCounters(): Promise<GeminiUsageSummary> {
  try {
    const res = await fetch('/api/gemini/usage/reset-daily', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.success && data.summary) {
        cachedUsageSummary = data.summary;
        usageListeners.forEach(cb => cb(cachedUsageSummary));
        return cachedUsageSummary;
      }
    }
  } catch (err) {
    console.error('[GeminiUsage] Error resetting daily counters:', err);
  }
  return cachedUsageSummary;
}

/**
 * Resets limits to system defaults
 */
export async function resetUsageLimitsToDefaults(): Promise<GeminiUsageSummary> {
  try {
    const res = await fetch('/api/gemini/usage/reset-defaults', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.success && data.summary) {
        cachedUsageSummary = data.summary;
        usageListeners.forEach(cb => cb(cachedUsageSummary));
        return cachedUsageSummary;
      }
    }
  } catch (err) {
    console.error('[GeminiUsage] Error resetting limits to defaults:', err);
  }
  return cachedUsageSummary;
}

/**
 * Records token and request usage
 */
export async function recordGeminiModelUsage(
  modelId: string,
  tokens: number,
  requests: number = 1
): Promise<GeminiUsageSummary> {
  try {
    const res = await fetch('/api/gemini/usage/record', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ modelId, tokens, requests }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.success && data.summary) {
        cachedUsageSummary = data.summary;
        usageListeners.forEach(cb => cb(cachedUsageSummary));
        return cachedUsageSummary;
      }
    }
  } catch (err) {
    console.warn('[GeminiUsage] Error recording usage to server:', err);
  }
  return cachedUsageSummary;
}

/**
 * React Hook to monitor live usage metrics, limits, and progress across all models
 */
export function useGeminiUsageMonitor() {
  const [summary, setSummary] = useState<GeminiUsageSummary>(() => cachedUsageSummary);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const refreshUsage = useCallback(async () => {
    setIsLoading(true);
    try {
      const updated = await fetchGeminiUsageSummary();
      setSummary({ ...updated });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const handler = (updated: GeminiUsageSummary) => {
      setSummary({ ...updated });
    };
    usageListeners.add(handler);
    refreshUsage();

    // Auto-poll usage every 30 seconds for live updates
    const interval = setInterval(() => {
      refreshUsage();
    }, 30000);

    return () => {
      usageListeners.delete(handler);
      clearInterval(interval);
    };
  }, [refreshUsage]);

  const updateLimits = useCallback(async (modelId: string, limits: { dailyTokenLimit?: number; dailyApiLimit?: number }) => {
    setIsLoading(true);
    try {
      const updated = await updateModelUsageLimits(modelId, limits);
      setSummary({ ...updated });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const resetToday = useCallback(async () => {
    setIsLoading(true);
    try {
      const updated = await resetDailyUsageCounters();
      setSummary({ ...updated });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const resetDefaults = useCallback(async () => {
    setIsLoading(true);
    try {
      const updated = await resetUsageLimitsToDefaults();
      setSummary({ ...updated });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const recordUsage = useCallback(async (modelId: string, tokens: number, requests: number = 1) => {
    const updated = await recordGeminiModelUsage(modelId, tokens, requests);
    setSummary({ ...updated });
  }, []);

  return {
    summary,
    isLoading,
    refreshUsage,
    updateLimits,
    resetToday,
    resetDefaults,
    recordUsage,
  };
}
