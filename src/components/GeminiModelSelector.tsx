import React, { useEffect } from 'react';
import { useGeminiModels, ProcessingMode, resolveClientModel, saveModelSelection, saveProcessingMode } from '../lib/geminiModels';
import { Cpu, ShieldCheck, RefreshCw } from 'lucide-react';

interface GeminiModelSelectorProps {
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  processingMode: ProcessingMode;
  onProcessingModeChange: (mode: ProcessingMode) => void;
  compact?: boolean;
}

export const GeminiModelSelector: React.FC<GeminiModelSelectorProps> = ({
  selectedModel,
  onModelChange,
  processingMode,
  onProcessingModeChange,
  compact = false,
}) => {
  const { models, recommendedModel, isLoading, refreshModels } = useGeminiModels();

  const recommendedModelOption = models.find(m => m.id === recommendedModel) || models[0];
  const defaultDisplayName = recommendedModelOption?.displayName || 'Gemini 3.7 Flash';

  // If selectedModel is not in active models, migrate it seamlessly to the recommended or best valid model
  useEffect(() => {
    if (models.length > 0) {
      if (selectedModel === 'default') return;
      const exists = models.some(m => m.id === selectedModel);
      if (!exists || !selectedModel) {
        const migrated = resolveClientModel(selectedModel) || recommendedModel || models[0]?.id;
        if (migrated && migrated !== selectedModel) {
          onModelChange(migrated);
          saveModelSelection(migrated);
        }
      }
    }
  }, [models, selectedModel, recommendedModel, onModelChange]);

  const handleSelectModel = (modelId: string) => {
    onModelChange(modelId);
    saveModelSelection(modelId);
  };

  const handleSelectMode = (mode: ProcessingMode) => {
    onProcessingModeChange(mode);
    saveProcessingMode(mode);
  };

  const currentOption = selectedModel === 'default'
    ? recommendedModelOption
    : models.find(m => m.id === selectedModel);

  return (
    <div className={`space-y-3 ${compact ? 'text-xs' : ''}`}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Model Selector */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Cpu className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>AI Model</span>
            </label>
            <button
              type="button"
              onClick={() => refreshModels()}
              disabled={isLoading}
              title="Refresh available models from Google API"
              className="text-[10px] text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1 transition-colors"
            >
              <RefreshCw className={`h-2.5 w-2.5 ${isLoading ? 'animate-spin text-indigo-600' : ''}`} />
              <span>{models.length} active</span>
            </button>
          </div>
          <select
            value={selectedModel}
            onChange={(e) => handleSelectModel(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-xs"
          >
            <option value="default">Default ({defaultDisplayName})</option>
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.displayName}
              </option>
            ))}
          </select>
          {selectedModel && (
            <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400 truncate">
              {currentOption?.description || 'Selected authoritative AI model'}
            </p>
          )}
        </div>

        {/* Processing Mode Selector */}
        <div>
          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Processing Mode</span>
          </label>
          <select
            value={processingMode}
            onChange={(e) => handleSelectMode(e.target.value as ProcessingMode)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-xs"
          >
            <option value="AUTO_FAILOVER">Auto / Adaptive Failover (Resilient)</option>
            <option value="MANUAL">Manual Model (Strict)</option>
          </select>
          <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
            {processingMode === 'MANUAL'
              ? 'Strictly uses selected model; pauses if overloaded.'
              : 'Automatically migrates and fails over dynamically to healthy models on 503/429.'}
          </p>
        </div>
      </div>
    </div>
  );
};
