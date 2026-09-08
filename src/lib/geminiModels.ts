import { useState, useEffect, useCallback } from 'react';
import {
  LifecycleModel,
  GeminiTier,
  ModelHealthStatus,
  ProcessingMode,
  createDefaultLifecycleCatalog,
  resolveModelWithAutoMigration,
  GeminiLifecycleCatalog,
} from './geminiLifecycleEngine';

export type { GeminiTier, ModelHealthStatus, ProcessingMode, LifecycleModel };

export interface GeminiModelOption {
  id: string;
  displayName: string;
  description: string;
  recommended?: boolean;
  enabled: boolean;
  fallbackPriority: number;
  tier?: GeminiTier;
  healthStatus?: ModelHealthStatus;
}

export interface AISettings {
  defaultModel: string;
  processingMode: ProcessingMode;
}

const STORAGE_MODEL_KEY = 'shiksha_mitra_selected_gemini_model';
const STORAGE_MODE_KEY = 'shiksha_mitra_processing_mode';
const STORAGE_PROVISIONED_KEY = 'shiksha_mitra_provisioned_models';

// In-memory runtime cache of active models initialized with verified baseline
let cachedCatalog: GeminiLifecycleCatalog = createDefaultLifecycleCatalog();
let isFetchingModels = false;
const listeners = new Set<(models: GeminiModelOption[], recommended: string) => void>();

/**
 * Reads user-provisioned model IDs from localStorage
 */
export function getProvisionedModelIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem(STORAGE_PROVISIONED_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // If saved list has fewer than 6 models (e.g., legacy default matrix), expand to include all catalog models
        const catalogIds = cachedCatalog.models.map(m => m.id);
        const missingNewModels = catalogIds.filter(id => !parsed.includes(id));
        if (missingNewModels.length > 0 && parsed.length <= 5) {
          const merged = Array.from(new Set([...parsed, ...catalogIds]));
          localStorage.setItem(STORAGE_PROVISIONED_KEY, JSON.stringify(merged));
          return merged;
        }
        return parsed;
      }
    }
  } catch {}
  return [];
}

/**
 * Saves user-provisioned model IDs and notifies all model dropdowns across the application
 */
export function saveProvisionedModelIds(ids: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_PROVISIONED_KEY, JSON.stringify(ids));
  } catch {}
  GEMINI_MODELS = toModelOptions(cachedCatalog);
  listeners.forEach(cb => cb(GEMINI_MODELS, cachedCatalog.recommendedModelId));
}

/**
 * Transforms lifecycle models to active UI model options filtered by provisioned checkboxes
 */
function toModelOptions(catalog: GeminiLifecycleCatalog): GeminiModelOption[] {
  const provisioned = getProvisionedModelIds();

  let active = catalog.models.filter(m => {
    if (!m.enabled || m.healthStatus === 'RETIRED') return false;
    const lower = `${m.id} ${m.displayName}`.toLowerCase();
    // Strictly forbid low-tier testing models like 'nano' or 'banana'
    if (lower.includes('nano') || lower.includes('banana') || lower.includes('test-model') || lower.includes('dummy')) {
      return false;
    }
    if (provisioned.length > 0) {
      return provisioned.includes(m.id);
    }
    return true;
  });

  if (active.length === 0) {
    active = createDefaultLifecycleCatalog().models;
  }
  return active.map(m => ({
    id: m.id,
    displayName: m.displayName,
    description: m.description,
    recommended: m.id === catalog.recommendedModelId || m.recommended,
    enabled: m.enabled,
    fallbackPriority: m.fallbackPriority,
    tier: m.tier,
    healthStatus: m.healthStatus,
  }));
}

export let GEMINI_MODELS: GeminiModelOption[] = toModelOptions(cachedCatalog);

/**
 * Fetches dynamic models from the authoritative server lifecycle endpoint
 */
export async function refreshActiveGeminiModels(): Promise<GeminiModelOption[]> {
  if (isFetchingModels) {
    return GEMINI_MODELS;
  }

  isFetchingModels = true;
  try {
    const res = await fetch('/api/gemini/models');
    if (res.ok) {
      const data = await res.json();
      if (data && data.success && Array.isArray(data.models) && data.models.length > 0) {
        cachedCatalog = {
          models: data.models,
          recommendedModelId: data.recommendedModelId || data.models[0].id,
          lastDiscoveredAt: data.lastDiscoveredAt || Date.now(),
          discoverySource: data.discoverySource || 'api',
          migrationLog: data.migrationLog || [],
        };
        GEMINI_MODELS = toModelOptions(cachedCatalog);
        listeners.forEach(cb => cb(GEMINI_MODELS, cachedCatalog.recommendedModelId));
      }
    }
  } catch (err) {
    console.warn('[GeminiModels] Server model catalog fetch skipped, using cached catalog:', err);
  } finally {
    isFetchingModels = false;
  }
  return GEMINI_MODELS;
}

// Trigger background discovery on client bootstrap
if (typeof window !== 'undefined') {
  setTimeout(() => {
    refreshActiveGeminiModels();
  }, 500);
}

/**
 * Retrieves the currently saved valid model from localStorage, or recommended model
 */
export function getSavedModelSelection(): string {
  if (typeof window === 'undefined') return cachedCatalog.recommendedModelId || 'gemini-3.7-flash';
  try {
    const saved = localStorage.getItem(STORAGE_MODEL_KEY);
    if (saved) {
      // Validate saved model exists in current catalog
      const match = cachedCatalog.models.find(m => m.id === saved && m.enabled && m.healthStatus === 'HEALTHY');
      if (match) return saved;
      // If saved model is retired/invalid, resolve best active replacement
      const resolution = resolveModelWithAutoMigration(saved, cachedCatalog);
      if (resolution.targetModel) {
        localStorage.setItem(STORAGE_MODEL_KEY, resolution.targetModel);
        return resolution.targetModel;
      }
    }
  } catch {}
  return cachedCatalog.recommendedModelId || 'gemini-3.7-flash';
}

/**
 * Saves the user's active model choice in localStorage
 */
export function saveModelSelection(modelId: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_MODEL_KEY, modelId);
  } catch {}
}

/**
 * Retrieves the saved processing mode ('AUTO_FAILOVER' | 'MANUAL')
 */
export function getSavedProcessingMode(): ProcessingMode {
  if (typeof window === 'undefined') return 'AUTO_FAILOVER';
  try {
    const saved = localStorage.getItem(STORAGE_MODE_KEY);
    if (saved === 'MANUAL' || saved === 'AUTO_FAILOVER') return saved;
  } catch {}
  return 'AUTO_FAILOVER';
}

/**
 * Saves the processing mode
 */
export function saveProcessingMode(mode: ProcessingMode): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_MODE_KEY, mode);
  } catch {}
}

/**
 * React hook to reactively subscribe to authoritative active Gemini models
 */
export function useGeminiModels() {
  const [models, setModels] = useState<GeminiModelOption[]>(() => GEMINI_MODELS);
  const [recommendedModel, setRecommendedModel] = useState<string>(() => cachedCatalog.recommendedModelId);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleRefresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const updated = await refreshActiveGeminiModels();
      setModels([...updated]);
      setRecommendedModel(cachedCatalog.recommendedModelId);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const handler = (updated: GeminiModelOption[], rec: string) => {
      setModels([...updated]);
      setRecommendedModel(rec);
    };
    listeners.add(handler);
    handleRefresh();

    return () => {
      listeners.delete(handler);
    };
  }, [handleRefresh]);

  return {
    models,
    recommendedModel,
    isLoading,
    refreshModels: handleRefresh,
  };
}

/**
 * Client-side model resolution with auto-migration
 */
export function resolveClientModel(modelId: string): string {
  const resolution = resolveModelWithAutoMigration(modelId, cachedCatalog);
  return resolution.targetModel;
}

/**
 * React hook to access ALL discovered/active models from Google AI Studio catalog (unfiltered by provisioned selection)
 * Used in SettingsView for Global AI Model Provisioning
 */
export function useAllDiscoveredGeminiModels() {
  const filterNonTestModels = (list: LifecycleModel[]) => {
    return list.filter(m => {
      const lower = `${m.id} ${m.displayName}`.toLowerCase();
      return !lower.includes('nano') && !lower.includes('banana') && !lower.includes('test-model') && !lower.includes('dummy');
    });
  };

  const [allModels, setAllModels] = useState<LifecycleModel[]>(() => 
    filterNonTestModels(cachedCatalog.models)
  );

  const [provisionedIds, setProvisionedIdsState] = useState<string[]>(() => {
    const saved = getProvisionedModelIds();
    return saved.length > 0 ? saved : cachedCatalog.models.map(m => m.id);
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);

  const refreshAll = useCallback(async () => {
    setIsLoading(true);
    try {
      await refreshActiveGeminiModels();
      const filtered = filterNonTestModels(cachedCatalog.models);
      setAllModels([...filtered]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const toggleModel = useCallback((modelId: string) => {
    setProvisionedIdsState(prev => {
      let updated: string[];
      if (prev.includes(modelId)) {
        if (prev.length <= 1) return prev; // Keep at least 1 model provisioned
        updated = prev.filter(id => id !== modelId);
      } else {
        updated = [...prev, modelId];
      }
      saveProvisionedModelIds(updated);
      return updated;
    });
  }, []);

  const selectAll = useCallback(() => {
    const allIds = filterNonTestModels(cachedCatalog.models).map(m => m.id);
    setProvisionedIdsState(allIds);
    saveProvisionedModelIds(allIds);
  }, []);

  const deselectAll = useCallback(() => {
    const defaultId = cachedCatalog.recommendedModelId || 'gemini-3.7-flash';
    setProvisionedIdsState([defaultId]);
    saveProvisionedModelIds([defaultId]);
  }, []);

  const resetToDefaultMatrix = useCallback(() => {
    const defaultIds = cachedCatalog.models.map(m => m.id);
    setProvisionedIdsState(defaultIds);
    saveProvisionedModelIds(defaultIds);
  }, []);

  useEffect(() => {
    const handler = () => {
      const filtered = filterNonTestModels(cachedCatalog.models);
      setAllModels([...filtered]);
    };
    listeners.add(handler);
    return () => {
      listeners.delete(handler);
    };
  }, []);

  return {
    allModels,
    provisionedIds,
    toggleModel,
    selectAll,
    deselectAll,
    resetToDefaultMatrix,
    isLoading,
    refreshAll,
  };
}
