import React, { useState } from 'react';
import { X, Sliders, Shield, RotateCcw, Check } from 'lucide-react';
import { ModelUsageRecord, DEFAULT_TIER_LIMITS } from '../lib/geminiUsageService';

interface ModelLimitConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  models: ModelUsageRecord[];
  onSaveLimits: (limits: Record<string, { dailyTokenLimit: number; dailyApiLimit: number }>) => Promise<void>;
  onResetDefaults: () => Promise<void>;
}

export const ModelLimitConfigModal: React.FC<ModelLimitConfigModalProps> = ({
  isOpen,
  onClose,
  models,
  onSaveLimits,
  onResetDefaults,
}) => {
  const [limitValues, setLimitValues] = useState<Record<string, { dailyTokenLimit: number; dailyApiLimit: number }>>(() => {
    const map: Record<string, { dailyTokenLimit: number; dailyApiLimit: number }> = {};
    models.forEach((m) => {
      map[m.modelId] = {
        dailyTokenLimit: m.dailyTokenLimit,
        dailyApiLimit: m.dailyApiLimit,
      };
    });
    return map;
  });

  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Sync state if models change
  React.useEffect(() => {
    const map: Record<string, { dailyTokenLimit: number; dailyApiLimit: number }> = {};
    models.forEach((m) => {
      map[m.modelId] = {
        dailyTokenLimit: m.dailyTokenLimit,
        dailyApiLimit: m.dailyApiLimit,
      };
    });
    setLimitValues(map);
  }, [models]);

  if (!isOpen) return null;

  const handleTokenChange = (modelId: string, val: string) => {
    const num = Math.max(1000, parseInt(val, 10) || 0);
    setLimitValues((prev) => ({
      ...prev,
      [modelId]: {
        ...prev[modelId],
        dailyTokenLimit: num,
      },
    }));
  };

  const handleApiChange = (modelId: string, val: string) => {
    const num = Math.max(1, parseInt(val, 10) || 0);
    setLimitValues((prev) => ({
      ...prev,
      [modelId]: {
        ...prev[modelId],
        dailyApiLimit: num,
      },
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSaveLimits(limitValues);
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 1000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    setIsSaving(true);
    try {
      await onResetDefaults();
      const resetMap: Record<string, { dailyTokenLimit: number; dailyApiLimit: number }> = {};
      models.forEach((m) => {
        const tierDef = DEFAULT_TIER_LIMITS[m.tier] || DEFAULT_TIER_LIMITS.flash;
        resetMap[m.modelId] = {
          dailyTokenLimit: tierDef.dailyTokenLimit,
          dailyApiLimit: tierDef.dailyApiLimit,
        };
      });
      setLimitValues(resetMap);
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 1000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
              <Sliders className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                Admin AI Model Usage Limit Configuration
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Set custom daily token limits and API request budgets per model.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Content / Form */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          <div className="rounded-2xl border border-indigo-200/80 bg-indigo-50/50 dark:border-indigo-900/50 dark:bg-indigo-950/20 p-3.5 flex items-start gap-2.5">
            <Shield className="h-4 w-4 text-indigo-600 dark:text-indigo-400 mt-0.5 flex-shrink-0" />
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              <strong>Admin Note:</strong> These are custom tracking budgets for monitoring & alerts. Distinguish between these configured quotas and the model's physical provider limits (e.g. 1M token context window).
            </p>
          </div>

          <div className="space-y-3">
            {models.map((m) => {
              const currentVals = limitValues[m.modelId] || {
                dailyTokenLimit: m.dailyTokenLimit,
                dailyApiLimit: m.dailyApiLimit,
              };

              return (
                <div
                  key={m.modelId}
                  className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white text-xs block">
                        {m.displayName}
                      </span>
                      <span className="font-mono text-[10px] text-slate-400">
                        {m.modelId}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {m.tier}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Daily Token Limit (tokens/day):
                      </label>
                      <input
                        type="number"
                        min="1000"
                        step="10000"
                        value={currentVals.dailyTokenLimit}
                        onChange={(e) => handleTokenChange(m.modelId, e.target.value)}
                        className="input-3d-recessed w-full px-3 py-2 font-bold text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Daily API Request Limit (reqs/day):
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="50"
                        value={currentVals.dailyApiLimit}
                        onChange={(e) => handleApiChange(m.modelId, e.target.value)}
                        className="input-3d-recessed w-full px-3 py-2 font-bold text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Modal Footer Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={handleReset}
              disabled={isSaving}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold transition-colors flex items-center gap-1.5"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset to Defaults</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="btn-3d-indigo px-5 py-2.5 text-xs font-black flex items-center gap-1.5"
              >
                {savedSuccess ? (
                  <>
                    <Check className="h-4 w-4 text-emerald-400" />
                    <span>Saved!</span>
                  </>
                ) : (
                  <>
                    <Sliders className="h-4 w-4" />
                    <span>{isSaving ? 'Saving...' : 'Apply Limits'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
