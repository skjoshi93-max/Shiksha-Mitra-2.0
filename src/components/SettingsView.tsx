import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  Save,
  Download,
  Upload,
  RefreshCw,
  Sliders,
  Database,
  ShieldCheck,
  Check,
  Globe,
  CheckSquare,
  Square,
  RotateCcw,
  Zap,
  Activity,
  BarChart3,
  Clock,
  AlertTriangle,
  CheckCircle2,
  AlertOctagon,
  Sparkles,
  Play,
} from 'lucide-react';
import { SettingsState } from '../types';
import { useAllDiscoveredGeminiModels } from '../lib/geminiModels';
import { useGeminiUsageMonitor, UsageStatus } from '../lib/geminiUsageService';
import { ModelLimitConfigModal } from './ModelLimitConfigModal';
import { TwoAgentVerificationPanel } from './TwoAgentVerificationPanel';

interface SettingsViewProps {
  settings: SettingsState;
  onSaveSettings: (s: SettingsState) => void;
  onExportBackup: () => void;
  onRestoreBackup: (jsonStr: string) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onSaveSettings,
  onExportBackup,
  onRestoreBackup,
}) => {
  const [formData, setFormData] = useState<SettingsState>({ ...settings });
  const [isSaved, setIsSaved] = useState(false);
  const [restoreMessage, setRestoreMessage] = useState('');
  const [isLimitModalOpen, setIsLimitModalOpen] = useState(false);
  const [testActionMessage, setTestActionMessage] = useState<string | null>(null);

  const {
    allModels,
    provisionedIds,
    toggleModel,
    selectAll,
    deselectAll,
    resetToDefaultMatrix,
    isLoading: isModelsLoading,
    refreshAll,
  } = useAllDiscoveredGeminiModels();

  const {
    summary: usageSummary,
    isLoading: isUsageLoading,
    refreshUsage,
    updateLimits,
    resetToday,
    resetDefaults,
    recordUsage,
  } = useGeminiUsageMonitor();

  const handleTestPing = async (modelId: string) => {
    try {
      await recordUsage(modelId, 1250, 1);
      setTestActionMessage(`Recorded +1,250 tokens for ${modelId}`);
      setTimeout(() => setTestActionMessage(null), 3000);
    } catch (err) {
      console.warn('Test ping error:', err);
    }
  };

  const formatTokens = (val: number): string => {
    if (val >= 1_000_000) {
      return (val / 1_000_000).toFixed(2).replace(/\.00$/, '') + 'M';
    }
    if (val >= 1_000) {
      return (val / 1_000).toFixed(1).replace(/\.0$/, '') + 'k';
    }
    return val.toLocaleString();
  };

  const getStatusBadge = (status: UsageStatus) => {
    switch (status) {
      case 'EXCEEDED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
            <AlertOctagon className="h-3 w-3 text-rose-600" /> Limit Exceeded
          </span>
        );
      case 'CRITICAL':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-orange-100 dark:bg-orange-950/80 text-orange-700 dark:text-orange-300 border border-orange-300 dark:border-orange-800">
            <AlertTriangle className="h-3 w-3 text-orange-600" /> Critical (90%+)
          </span>
        );
      case 'WARNING':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
            <AlertTriangle className="h-3 w-3 text-amber-600" /> Warning (70%+)
          </span>
        );
      case 'NORMAL':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Normal (&lt;70%)
          </span>
        );
    }
  };

  const getProgressBarColor = (status: UsageStatus) => {
    switch (status) {
      case 'EXCEEDED':
        return 'bg-rose-500';
      case 'CRITICAL':
        return 'bg-orange-500';
      case 'WARNING':
        return 'bg-amber-500';
      case 'NORMAL':
      default:
        return 'bg-emerald-500';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(formData);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      if (content) {
        onRestoreBackup(content);
        setRestoreMessage('Question bank backup successfully restored!');
        setTimeout(() => setRestoreMessage(''), 4000);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-8 p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      {/* Header Banner - Professional Light Slate-to-Gray Gradient */}
      <div
        className="relative overflow-hidden rounded-3xl border border-slate-300/80 p-6 sm:p-9 text-slate-900 shadow-xl shadow-slate-200/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6"
        style={{ background: 'linear-gradient(135deg, #f8fafc, #f1f5f9, #e2e8f0)' }}
      >
        <div className="space-y-2 max-w-xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white/80 px-3.5 py-1 text-xs font-black text-slate-800 backdrop-blur-md shadow-xs">
            <SettingsIcon className="h-4 w-4 text-slate-700" />
            <span>Engine Configuration</span>
          </div>
          <h2
            className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight flex items-center gap-2"
          >
            System Settings & Preferences
          </h2>
          <p className="text-xs sm:text-sm text-slate-700 font-medium leading-relaxed">
            Configure question bank metadata defaults, quality control thresholds, theme preferences, and JSON backup/restore.
          </p>
        </div>

        {isSaved && (
          <span className="flex items-center gap-2 rounded-2xl bg-emerald-100 border border-emerald-300 px-4 py-2 text-xs font-black text-emerald-900 shadow-sm">
            <Check className="h-4 w-4 text-emerald-600" /> Settings Saved!
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Preferences */}
        <div className="card-3d p-6 rounded-3xl space-y-5">
          <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-200/80 dark:border-slate-800 pb-3">
            <Sliders className="h-4.5 w-4.5 text-indigo-600 dark:text-indigo-400" />
            <span>General Bank Settings</span>
          </h3>

          <div className="space-y-4 text-xs">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Question Bank Display Name:</label>
              <input
                type="text"
                value={formData.bankName}
                onChange={(e) => setFormData(prev => ({ ...prev, bankName: e.target.value }))}
                className="input-3d-recessed w-full px-4 py-2.5 font-black text-slate-900 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Default Language:</label>
                <select
                  value={formData.defaultLanguage}
                  onChange={(e) => setFormData(prev => ({ ...prev, defaultLanguage: e.target.value }))}
                  className="input-3d-recessed w-full px-3.5 py-2.5 font-bold text-slate-900 dark:text-white"
                >
                  <option value="English">English</option>
                  <option value="Hindi">Hindi</option>
                  <option value="Hinglish">Hinglish</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Default Time Limit (sec):</label>
                <input
                  type="number"
                  value={formData.defaultTimeLimit}
                  onChange={(e) => setFormData(prev => ({ ...prev, defaultTimeLimit: parseInt(e.target.value) || 120 }))}
                  className="input-3d-recessed w-full px-3.5 py-2.5 font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Default Max Score:</label>
                <input
                  type="number"
                  value={formData.defaultMaxScore}
                  onChange={(e) => setFormData(prev => ({ ...prev, defaultMaxScore: parseInt(e.target.value) || 10 }))}
                  className="input-3d-recessed w-full px-3.5 py-2.5 font-bold text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Quality Thresholds */}
        <div className="card-3d p-6 rounded-3xl space-y-5">
          <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-200/80 dark:border-slate-800 pb-3">
            <ShieldCheck className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400" />
            <span>AI Quality Pipeline Thresholds</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4.5 dark:border-slate-800 dark:bg-slate-950/50 space-y-2.5">
              <div className="flex justify-between items-center">
                <span className="font-black text-slate-800 dark:text-slate-200">AI Quality Minimum Threshold</span>
                <span className="font-black text-indigo-600 dark:text-indigo-400">{formData.qualityThreshold}/100</span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">Questions scoring below this minimum score are automatically rejected and regenerated.</p>
              <input
                type="range"
                min="70"
                max="95"
                value={formData.qualityThreshold}
                onChange={(e) => setFormData(prev => ({ ...prev, qualityThreshold: parseInt(e.target.value) }))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4.5 dark:border-slate-800 dark:bg-slate-950/50 space-y-2.5">
              <div className="flex justify-between items-center">
                <span className="font-black text-slate-800 dark:text-slate-200">Duplicate Sensitivity Cutoff</span>
                <span className="font-black text-indigo-600 dark:text-indigo-400">{formData.duplicateSensitivity}%</span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">Questions exceeding this similarity ratio are flagged or auto-regenerated.</p>
              <input
                type="range"
                min="50"
                max="95"
                value={formData.duplicateSensitivity}
                onChange={(e) => setFormData(prev => ({ ...prev, duplicateSensitivity: parseInt(e.target.value) }))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* 🌐 Global AI Model Provisioning & Centralized Usage Monitoring */}
        <div className="card-3d p-6 rounded-3xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Globe className="h-4.5 w-4.5 text-indigo-600 dark:text-indigo-400" />
                <span>🌐 Global AI Model Provisioning & Usage Limits</span>
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Centralized daily token and API request limit monitoring with automatic midnight reset.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setIsLimitModalOpen(true)}
                className="px-3 py-1.5 text-[11px] font-black rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <Sliders className="h-3.5 w-3.5" />
                <span>Configure Limits</span>
              </button>
              <button
                type="button"
                onClick={resetToday}
                disabled={isUsageLoading}
                className="px-3 py-1.5 text-[11px] font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition-colors flex items-center gap-1.5 shadow-xs"
                title="Reset daily usage counters to 0 for today"
              >
                <Clock className="h-3.5 w-3.5 text-slate-500" />
                <span>Reset Today</span>
              </button>
              <button
                type="button"
                onClick={selectAll}
                className="px-2.5 py-1.5 text-[11px] font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors flex items-center gap-1 shadow-xs"
              >
                <CheckSquare className="h-3 w-3 text-emerald-500" />
                <span>Select All</span>
              </button>
              <button
                type="button"
                onClick={deselectAll}
                className="px-2.5 py-1.5 text-[11px] font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors flex items-center gap-1 shadow-xs"
              >
                <Square className="h-3 w-3 text-slate-400" />
                <span>Deselect All</span>
              </button>
              <button
                type="button"
                onClick={resetToDefaultMatrix}
                className="px-2.5 py-1.5 text-[11px] font-bold rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 transition-colors flex items-center gap-1 shadow-xs"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Reset Matrix</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  refreshAll();
                  refreshUsage();
                }}
                disabled={isModelsLoading || isUsageLoading}
                className="px-2.5 py-1.5 text-[11px] font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition-colors flex items-center gap-1 shadow-xs"
              >
                <RefreshCw className={`h-3 w-3 ${isModelsLoading || isUsageLoading ? 'animate-spin text-indigo-600' : ''}`} />
                <span>Sync API</span>
              </button>
            </div>
          </div>

          {/* Test Action Message Banner */}
          {testActionMessage && (
            <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>{testActionMessage}</span>
            </div>
          )}

          {/* 📊 Aggregated Daily Usage & Limits Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            {/* Token Usage Metric Card */}
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950/50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <BarChart3 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Daily Token Usage</span>
                </span>
                <span className="font-black text-indigo-600 dark:text-indigo-400 text-xs">
                  {usageSummary.overallTokenPercentage}%
                </span>
              </div>
              <div>
                <div className="flex items-baseline justify-between text-slate-900 dark:text-white mb-1">
                  <span className="text-lg font-black">{formatTokens(usageSummary.totalTokensToday)}</span>
                  <span className="text-[11px] text-slate-500 font-bold">/ {formatTokens(usageSummary.totalTokensLimit)} limit</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${getProgressBarColor(usageSummary.overallStatus)}`}
                    style={{ width: `${Math.min(100, usageSummary.overallTokenPercentage)}%` }}
                  />
                </div>
                <div className="text-[10px] text-slate-500 font-medium mt-1.5 flex justify-between">
                  <span>Remaining: {formatTokens(Math.max(0, usageSummary.totalTokensLimit - usageSummary.totalTokensToday))}</span>
                  <span>{usageSummary.totalTokensToday.toLocaleString()} raw</span>
                </div>
              </div>
            </div>

            {/* API Requests Metric Card */}
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950/50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Activity className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Daily API Requests</span>
                </span>
                <span className="font-black text-indigo-600 dark:text-indigo-400 text-xs">
                  {usageSummary.overallApiPercentage}%
                </span>
              </div>
              <div>
                <div className="flex items-baseline justify-between text-slate-900 dark:text-white mb-1">
                  <span className="text-lg font-black">{usageSummary.totalApiRequestsToday.toLocaleString()}</span>
                  <span className="text-[11px] text-slate-500 font-bold">/ {usageSummary.totalApiRequestsLimit.toLocaleString()} limit</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${getProgressBarColor(usageSummary.overallStatus)}`}
                    style={{ width: `${Math.min(100, usageSummary.overallApiPercentage)}%` }}
                  />
                </div>
                <div className="text-[10px] text-slate-500 font-medium mt-1.5 flex justify-between">
                  <span>Remaining: {(Math.max(0, usageSummary.totalApiRequestsLimit - usageSummary.totalApiRequestsToday)).toLocaleString()}</span>
                  <span>Active Models: {provisionedIds.length}</span>
                </div>
              </div>
            </div>

            {/* Daily Auto-Reset Status Card */}
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950/50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Daily Rollover & Status</span>
                </span>
                {getStatusBadge(usageSummary.overallStatus)}
              </div>
              <div className="space-y-1 text-slate-700 dark:text-slate-300">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-medium text-slate-500">Tracking Date:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">{usageSummary.currentDate}</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-medium text-slate-500">Auto-Reset Policy:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">Midnight (00:00 Local)</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-medium text-slate-500">Provisioned Active:</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">{provisionedIds.length} / {allModels.length} Models</span>
                </div>
              </div>
            </div>
          </div>

          {/* Model Provisioning & Usage Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
              <span>Model Provisioning Matrix & Live Usage Gauges</span>
              <span className="text-[11px] text-slate-500 font-normal">
                {provisionedIds.length} of {allModels.length} Models Active
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
              {allModels.map((model) => {
                const isChecked = provisionedIds.includes(model.id);
                const usage = usageSummary.models[model.id] || {
                  modelId: model.id,
                  displayName: model.displayName,
                  tier: model.tier,
                  dailyTokenUsage: 0,
                  dailyTokenLimit: 1000000,
                  remainingTokens: 1000000,
                  tokenUsagePercentage: 0,
                  dailyApiUsage: 0,
                  dailyApiLimit: 1000,
                  remainingApiRequests: 1000,
                  apiUsagePercentage: 0,
                  providerInputTokenLimit: 1048576,
                  providerOutputTokenLimit: 8192,
                  status: 'NORMAL',
                  lastUsedTimestamp: null,
                  totalHistoricalTokens: 0,
                  totalHistoricalRequests: 0,
                };

                return (
                  <div
                    key={model.id}
                    className={`p-4 rounded-2xl border transition-all space-y-3.5 ${
                      isChecked
                        ? 'border-indigo-500/50 bg-white dark:bg-slate-900 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 opacity-75'
                    }`}
                  >
                    {/* Header Row: Checkbox, Name, Tier, Default Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <label className="flex items-start gap-2.5 cursor-pointer flex-1 min-w-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleModel(model.id)}
                          className="mt-0.5 h-4 w-4 rounded accent-indigo-600 cursor-pointer"
                        />
                        <div className="min-w-0 flex-1">
                          <span className="font-bold text-slate-900 dark:text-white truncate block">
                            {model.displayName}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400 block truncate">
                            {model.id}
                          </span>
                        </div>
                      </label>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                          model.tier === 'pro'
                            ? 'bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300'
                            : model.tier === 'flash-lite'
                            ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300'
                            : 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300'
                        }`}>
                          {model.tier}
                        </span>
                        {model.recommended && (
                          <span className="bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-md text-[10px] font-black uppercase">
                            DEFAULT
                          </span>
                        )}
                        {getStatusBadge(usage.status)}
                      </div>
                    </div>

                    {/* Progress Gauges Row (Tokens & API Requests) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-100 dark:border-slate-800">
                      {/* Tokens Gauge */}
                      <div className="space-y-1.5 bg-slate-50 dark:bg-slate-950/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="font-bold text-slate-700 dark:text-slate-300">Tokens Today</span>
                          <span className="font-black text-indigo-600 dark:text-indigo-400">{usage.tokenUsagePercentage}%</span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${getProgressBarColor(usage.status)}`}
                            style={{ width: `${Math.min(100, usage.tokenUsagePercentage)}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                          <span>{formatTokens(usage.dailyTokenUsage)} used</span>
                          <span>{formatTokens(usage.dailyTokenLimit)} limit</span>
                        </div>
                      </div>

                      {/* API Requests Gauge */}
                      <div className="space-y-1.5 bg-slate-50 dark:bg-slate-950/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="font-bold text-slate-700 dark:text-slate-300">API Requests</span>
                          <span className="font-black text-indigo-600 dark:text-indigo-400">{usage.apiUsagePercentage}%</span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${getProgressBarColor(usage.status)}`}
                            style={{ width: `${Math.min(100, usage.apiUsagePercentage)}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                          <span>{usage.dailyApiUsage} used</span>
                          <span>{usage.dailyApiLimit} limit</span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Row: Provider Limit info & Quick Actions */}
                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                      <span title="Physical provider limit vs configured tracking limit">
                        Provider Window: <strong className="font-mono text-slate-700 dark:text-slate-300">{formatTokens(usage.providerInputTokenLimit)}</strong>
                      </span>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleTestPing(model.id)}
                          className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold transition-colors flex items-center gap-1 text-[10px]"
                          title="Simulate test API call to verify token counter increment"
                        >
                          <Play className="h-2.5 w-2.5 text-indigo-600" />
                          <span>Test Ping</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dynamic Auto-Update & Auto-Termination Live Banner */}
          <div className="rounded-2xl border border-indigo-200/80 bg-gradient-to-r from-indigo-50/80 to-purple-50/80 p-4 dark:border-indigo-900/50 dark:from-indigo-950/30 dark:to-purple-950/30 flex items-start gap-3 text-xs">
            <Zap className="h-4 w-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1 text-slate-700 dark:text-slate-300">
              <span className="font-bold text-slate-900 dark:text-white block">
                Automated Model Lifecycle & Usage Guard Active
              </span>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                New models released in Google AI Studio are detected automatically and appended to this control panel with daily token monitoring. Deprecated or retired model versions are automatically flagged and seamlessly migrated to <strong>gemini-3.7-flash</strong> to prevent API execution crashes.
              </p>
            </div>
          </div>
        </div>

        {/* Action Save Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="btn-3d-indigo py-3.5 px-8 text-xs font-black gap-2 shadow-lg"
          >
            <Save className="h-4 w-4" /> Save System Settings
          </button>
        </div>
      </form>

      {/* Model Limit Configuration Modal */}
      <ModelLimitConfigModal
        isOpen={isLimitModalOpen}
        onClose={() => setIsLimitModalOpen(false)}
        models={Object.values(usageSummary.models)}
        onSaveLimits={async (limits) => {
          for (const [id, lim] of Object.entries(limits)) {
            await updateLimits(id, lim);
          }
        }}
        onResetDefaults={resetDefaults}
      />

      {/* Two-Agent Development Verification & Independent Acceptance Engine */}
      <TwoAgentVerificationPanel />

      {/* Backup & Restore Section */}
      <div className="card-3d p-6 rounded-3xl space-y-5">
        <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-200/80 dark:border-slate-800 pb-3">
          <Database className="h-4.5 w-4.5 text-indigo-600 dark:text-indigo-400" />
          <span>Question Bank Backup & Restore</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-5 dark:border-slate-800 dark:bg-slate-950/50 space-y-3">
            <span className="text-xs font-black text-slate-900 dark:text-white block">Export Complete Backup</span>
            <p className="text-xs text-slate-500 font-medium">Save a full offline JSON backup containing all questions, metadata, settings, and templates.</p>
            <button
              onClick={onExportBackup}
              className="btn-3d-primary py-2.5 px-5 text-xs gap-2"
            >
              <Download className="h-4 w-4" /> Export Backup (.json)
            </button>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-5 dark:border-slate-800 dark:bg-slate-950/50 space-y-3">
            <span className="text-xs font-black text-slate-900 dark:text-white block">Restore From Backup</span>
            <p className="text-xs text-slate-500 font-medium">Upload a previously saved JSON backup file to restore your entire question repository.</p>
            <label className="btn-3d-indigo py-2.5 px-5 text-xs gap-2 inline-flex cursor-pointer">
              <Upload className="h-4 w-4" /> Select Backup JSON File
              <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
            </label>
            {restoreMessage && (
              <p className="text-xs font-black text-emerald-600 dark:text-emerald-400">{restoreMessage}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
