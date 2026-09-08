import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Sliders,
  Check,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  Clock,
  Layers,
  HelpCircle,
  Zap,
} from 'lucide-react';
import { Question, GeneratorConfig, GenerationProgress } from '../types';
import { ProcessingMode, getSavedModelSelection, getSavedProcessingMode } from '../lib/geminiModels';
import { GeminiModelSelector } from './GeminiModelSelector';
import { DEFAULT_CATEGORIES, DEFAULT_SUBJECTS, DEFAULT_QUESTION_TYPES } from '../lib/constants';
import { assessQuestionQuality } from '../lib/qualityEngine';
import { findDuplicateInBank } from '../lib/qualityEngine';
import { AIContentIntegrityService } from '../lib/aiContentIntegrityService';

interface AIGeneratorViewProps {
  initialConfig: GeneratorConfig;
  existingQuestions: Question[];
  onGenerationComplete: (newQuestions: Question[]) => void;
  presetCount?: number;
}

export const AIGeneratorView: React.FC<AIGeneratorViewProps> = ({
  initialConfig,
  existingQuestions,
  onGenerationComplete,
  presetCount,
}) => {
  const [selectedModel, setSelectedModel] = useState<string>(() => getSavedModelSelection());
  const [processingMode, setProcessingMode] = useState<ProcessingMode>(() => getSavedProcessingMode());
  const [config, setConfig] = useState<GeneratorConfig>(() => {
    if (presetCount) {
      return { ...initialConfig, totalQuestions: presetCount };
    }
    return initialConfig;
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<GenerationProgress>({
    status: 'idle',
    requested: 0,
    generated: 0,
    rejected: 0,
    regenerated: 0,
    approved: 0,
    currentCategory: '',
    currentStepDescription: '',
    percentComplete: 0,
  });

  useEffect(() => {
    if (presetCount) {
      setConfig(prev => ({ ...prev, totalQuestions: presetCount }));
    }
  }, [presetCount]);

  // Handle category percentage adjustments safely to keep sum = 100%
  const handleCategoryPctChange = (catName: string, newPct: number) => {
    setConfig(prev => {
      const updated = { ...prev.categoryDistribution, [catName]: Math.max(0, Math.min(100, newPct)) };
      return { ...prev, categoryDistribution: updated };
    });
  };

  // Handle difficulty percentage adjustments
  const handleDifficultyPctChange = (diffName: 'Easy' | 'Medium' | 'Hard', newPct: number) => {
    setConfig(prev => {
      const updated = { ...prev.difficultyDistribution, [diffName]: Math.max(0, Math.min(100, newPct)) };
      return { ...prev, difficultyDistribution: updated };
    });
  };

  // Calculate exact category & difficulty counts based on requested total
  const totalCatPct = (Object.values(config.categoryDistribution) as number[]).reduce((a: number, b: number) => a + b, 0);
  const totalDiffPct = (Object.values(config.difficultyDistribution) as number[]).reduce((a: number, b: number) => a + b, 0);

  const calculateCategoryCount = (catName: string) => {
    const pct = config.categoryDistribution[catName] || 0;
    if (totalCatPct === 0) return 0;
    return Math.round((pct / totalCatPct) * config.totalQuestions);
  };

  const calculateDifficultyCount = (diffName: 'Easy' | 'Medium' | 'Hard') => {
    const pct = config.difficultyDistribution[diffName] || 0;
    if (totalDiffPct === 0) return 0;
    return Math.round((pct / totalDiffPct) * config.totalQuestions);
  };

  // Execute full question generation pipeline
  const runGenerationPipeline = async () => {
    setIsGenerating(true);
    const totalRequested = config.totalQuestions;

    setProgress({
      status: 'generating',
      requested: totalRequested,
      generated: 0,
      rejected: 0,
      regenerated: 0,
      approved: 0,
      currentCategory: 'Initializing...',
      currentStepDescription: 'Preparing category and difficulty distribution matrix...',
      percentComplete: 5,
    });

    const approvedQuestions: Question[] = [];
    const subjectsList = config.subjects.length > 0 ? config.subjects : ['General Teaching'];
    const activeCategories = config.categories.filter(c => (config.categoryDistribution[c] || 0) > 0);

    let totalGenCount = 0;
    let totalRejCount = 0;
    let totalRegenCount = 0;

    // Determine target count for each category
    const catTargets: { category: string; target: number }[] = [];
    let allocated = 0;

    activeCategories.forEach((cat, idx) => {
      if (idx === activeCategories.length - 1) {
        catTargets.push({ category: cat, target: totalRequested - allocated });
      } else {
        const count = calculateCategoryCount(cat);
        allocated += count;
        catTargets.push({ category: cat, target: count });
      }
    });

    // Difficulty queue
    const difficulties: ('Easy' | 'Medium' | 'Hard')[] = ['Easy', 'Medium', 'Hard'];

    try {
      for (const catObj of catTargets) {
        const { category, target } = catObj;
        if (target <= 0) continue;

        let categoryApproved = 0;

        while (categoryApproved < target) {
          const neededInBatch = Math.min(10, target - categoryApproved);
          const currentDiff = difficulties[(categoryApproved + totalGenCount) % 3];
          const currentSubject = subjectsList[(categoryApproved + totalGenCount) % subjectsList.length];
          const currentType = config.questionTypes[(categoryApproved + totalGenCount) % config.questionTypes.length] || 'Conceptual';

          // Update Progress Bar
          const overallPct = Math.min(95, Math.round((approvedQuestions.length / totalRequested) * 100));
          setProgress(prev => ({
            ...prev,
            status: 'generating',
            generated: totalGenCount,
            approved: approvedQuestions.length,
            rejected: totalRejCount,
            regenerated: totalRegenCount,
            currentCategory: category,
            currentStepDescription: `AI Generating ${neededInBatch} questions for [${category}] - ${currentDiff} - ${currentSubject}...`,
            percentComplete: overallPct,
          }));

          // Call Express backend API
          const response = await fetch('/api/generate-questions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              count: neededInBatch,
              category,
              difficulty: currentDiff,
              subject: currentSubject,
              questionType: currentType,
              language: config.language,
              existingCount: totalGenCount,
              model: selectedModel,
              processingMode,
            }),
          });

          const text = await response.text();
          let data: any = null;
          try {
            data = text ? JSON.parse(text) : null;
          } catch (_) {
            throw new Error(`Server returned non-JSON response (HTTP ${response.status})`);
          }

          if (!data || !data.success || !Array.isArray(data.questions)) {
            throw new Error(data?.message || 'API return format invalid during question batch generation');
          }

          const rawBatch = data.questions;
          totalGenCount += rawBatch.length;

          // Quality Control & Duplicate Filter Pipeline
          for (let i = 0; i < rawBatch.length; i++) {
            if (categoryApproved >= target) break;

            const item = rawBatch[i];

            // Auto metadata assignment
            let timeLimit = config.defaultTimeLimit;
            let maxScore = config.defaultMaxScore;

            if (config.smartScoring) {
              if (item.difficulty === 'Easy') timeLimit = 75;
              if (item.difficulty === 'Medium') timeLimit = 120;
              if (item.difficulty === 'Hard') timeLimit = 180;
              if (item.category === 'Case Study') timeLimit = 240;
            }

            const candidateQuestion: Question = {
              id: `SM-2026-${String(approvedQuestions.length + existingQuestions.length + 1).padStart(4, '0')}`,
              question: item.question,
              category: item.category || category,
              difficulty: item.difficulty || currentDiff,
              subject: item.subject || currentSubject,
              questionType: item.questionType || currentType,
              timeLimit: item.suggestedTimeLimit || timeLimit,
              maxScore: item.suggestedMaxScore || maxScore,
              tags: Array.isArray(item.tags) && item.tags.length > 0 ? item.tags : [currentSubject, category],
              hint: item.hint || 'Evaluate pedagogical reasoning, clarity, and practical adaptability.',
              active: true,
              qualityScore: 90,
              duplicateSimilarity: 0,
              createdDate: new Date().toISOString(),
              updatedDate: new Date().toISOString(),
            };

            // 1. Full 6-Layer Integrity Check (Structure, Subject Domain, Anti-Placeholder, Formulas, Quality)
            setProgress(prev => ({
              ...prev,
              status: 'quality_check',
              currentStepDescription: `Integrity Checking question #${approvedQuestions.length + 1}...`,
            }));

            const integrityResult = AIContentIntegrityService.validateQuestion(candidateQuestion, {
              subject: currentSubject,
              minQualityScore: config.qualityThreshold,
              existingBank: [...existingQuestions, ...approvedQuestions],
            });

            candidateQuestion.qualityScore = integrityResult.overallScore;

            // 2. Duplicate Check
            setProgress(prev => ({
              ...prev,
              status: 'duplicate_check',
              currentStepDescription: `Duplicate Checking question #${approvedQuestions.length + 1} against bank...`,
            }));

            const dupCheck = findDuplicateInBank(
              candidateQuestion,
              [...existingQuestions, ...approvedQuestions],
              config.duplicateSensitivity
            );

            candidateQuestion.duplicateSimilarity = dupCheck.maxSimilarity;

            if (integrityResult.passed && dupCheck.maxSimilarity < config.duplicateSensitivity) {
              // APPROVED & VERIFIED
              candidateQuestion.verified = true;
              candidateQuestion.verificationStatus = 'VERIFIED';
              approvedQuestions.push(candidateQuestion);
              categoryApproved++;
            } else {
              // REJECTED & AUTOMATIC REGENERATION
              totalRejCount++;
              totalRegenCount++;

              const reasonStr = integrityResult.rejectionReasons.length > 0
                ? integrityResult.rejectionReasons[0]
                : `Dup: ${dupCheck.maxSimilarity}%`;

              setProgress(prev => ({
                ...prev,
                status: 'regenerating',
                rejected: totalRejCount,
                regenerated: totalRegenCount,
                currentStepDescription: `Question rejected (${reasonStr}). Automatically regenerating authentic replacement...`,
              }));

              // Short delay to allow smooth progress state render
              await new Promise(r => setTimeout(r, 100));
            }
          }

          // Retry limit safety guard
          if (totalRejCount > target * 3) {
            console.warn(`Retry limit reached for category ${category}. Halting with verified count: ${categoryApproved}`);
            break;
          }
        }
      }

      // Finalization
      setProgress({
        status: 'completed',
        requested: totalRequested,
        generated: totalGenCount,
        rejected: totalRejCount,
        regenerated: totalRegenCount,
        approved: approvedQuestions.length,
        currentCategory: 'All Categories',
        currentStepDescription: `Completed! Successfully generated and verified exactly ${approvedQuestions.length} questions.`,
        percentComplete: 100,
      });

      onGenerationComplete(approvedQuestions);
    } catch (err: any) {
      console.error('Generation pipeline error:', err);
      setProgress(prev => ({
        ...prev,
        status: 'error',
        errorMessage: `Generation pipeline error: ${err.message}`,
      }));
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-8 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* 3D Header Banner */}
      <div
        className="relative overflow-hidden rounded-3xl border border-rose-200/80 p-6 sm:p-9 text-slate-900 shadow-xl shadow-rose-100/50"
        style={{ background: 'linear-gradient(135deg, #fff1f2, #ffe4e6)' }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
          <div className="max-w-xl space-y-2">
            <div
              className="inline-flex items-center gap-2 rounded-full border border-rose-300/60 bg-white/80 px-3.5 py-1 text-xs font-black text-rose-800 shadow-xs"
            >
              <Sparkles className="h-4 w-4 text-rose-600" />
              <span>Automated Verification Pipeline</span>
            </div>
            <h2
              className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight"
            >
              Interview Question Bank AI Workspace
            </h2>
            <p className="text-xs sm:text-sm text-slate-700 font-medium leading-relaxed">
              Configure parameters, category distribution, and difficulty weights. Generates fully verified, scored questions with zero manual authoring required.
            </p>
          </div>

          <button
            onClick={runGenerationPipeline}
            disabled={isGenerating}
            className="btn-3d-primary py-3.5 px-7 text-xs sm:text-sm gap-2 shrink-0 shadow-lg shadow-rose-600/20"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin text-white" />
                <span>Generating Pipeline...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4.5 w-4.5 text-white" />
                <span>Start Batch Generation</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Progress UI if generating or completed */}
      {progress.status !== 'idle' && (
        <div className="card-3d-amber p-6 rounded-3xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="badge-3d-icon w-8 h-8 bg-amber-500 text-white">
                <RefreshCw className={`h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
              </div>
              <span className="text-sm font-black text-slate-900 dark:text-white capitalize">
                {progress.status.replace('_', ' ')}
              </span>
            </div>
            <span className="text-sm font-black text-amber-600 dark:text-amber-400">
              {progress.percentComplete}%
            </span>
          </div>

          {/* Progress Bar */}
          <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800 p-0.5 border border-slate-300 dark:border-slate-700">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-300 rounded-full"
              style={{ width: `${progress.percentComplete}%` }}
            />
          </div>

          <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
            {progress.currentStepDescription}
          </p>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
            <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-3 text-center dark:border-slate-800 dark:bg-slate-950/80">
              <span className="text-[10px] uppercase font-black text-slate-400">Requested</span>
              <p className="text-xl font-black text-slate-900 dark:text-white mt-0.5">{progress.requested}</p>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-3 text-center dark:border-slate-800 dark:bg-slate-950/80">
              <span className="text-[10px] uppercase font-black text-slate-400">Generated</span>
              <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{progress.generated}</p>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-3 text-center dark:border-slate-800 dark:bg-slate-950/80">
              <span className="text-[10px] uppercase font-black text-slate-400">Rejected</span>
              <p className="text-xl font-black text-rose-500 mt-0.5">{progress.rejected}</p>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-3 text-center dark:border-slate-800 dark:bg-slate-950/80">
              <span className="text-[10px] uppercase font-black text-slate-400">Regenerated</span>
              <p className="text-xl font-black text-amber-500 mt-0.5">{progress.regenerated}</p>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-3 text-center dark:border-slate-800 dark:bg-slate-950/80">
              <span className="text-[10px] uppercase font-black text-slate-400">Approved</span>
              <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{progress.approved}</p>
            </div>
          </div>

          {progress.errorMessage && (
            <div className="rounded-2xl bg-rose-50 border border-rose-200 p-3.5 text-xs font-bold text-rose-800 dark:bg-rose-950/50 dark:border-rose-900/60 dark:text-rose-200 flex items-center gap-2">
              <AlertCircle className="h-4.5 w-4.5 shrink-0 text-rose-500" />
              <span>{progress.errorMessage}</span>
            </div>
          )}
        </div>
      )}

      {/* Configuration Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Basic Parameters */}
        <div className="space-y-6">
          {/* Global Gemini Model Selector */}
          <div className="card-3d p-6 rounded-3xl">
            <GeminiModelSelector
              selectedModel={selectedModel}
              onModelChange={setSelectedModel}
              processingMode={processingMode}
              onProcessingModeChange={setProcessingMode}
            />
          </div>

          <div className="card-3d p-6 rounded-3xl space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <Sliders className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              Bank Quantity & Language Settings
            </h3>

            {/* Total Questions */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Total Questions Needed: <span className="font-black text-amber-600 dark:text-amber-400">{config.totalQuestions}</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {[10, 25, 50, 100, 250, 500, 1000].map(cnt => (
                  <button
                    key={cnt}
                    onClick={() => setConfig(prev => ({ ...prev, totalQuestions: cnt }))}
                    className={`rounded-xl px-3.5 py-1.5 text-xs font-extrabold transition-all border ${
                      config.totalQuestions === cnt
                        ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {cnt}
                  </button>
                ))}
              </div>
            </div>

            {/* Language */}
            <div className="space-y-2 pt-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Target Language:</label>
              <div className="grid grid-cols-3 gap-2.5">
                {['English', 'Hindi', 'Hinglish'].map(lang => (
                  <button
                    key={lang}
                    onClick={() => setConfig(prev => ({ ...prev, language: lang }))}
                    className={`rounded-xl py-2.5 text-xs font-extrabold transition-all border ${
                      config.language === lang
                        ? 'border-amber-500/80 bg-amber-50 text-amber-900 shadow-xs dark:border-amber-800 dark:bg-amber-950/80 dark:text-amber-200'
                        : 'border-slate-200/80 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>

            {/* Subjects Selection */}
            <div className="space-y-2 pt-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Target Subjects:</label>
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto pr-1">
                {DEFAULT_SUBJECTS.map(subj => {
                  const isSelected = config.subjects.includes(subj);
                  return (
                    <button
                      key={subj}
                      onClick={() => {
                        setConfig(prev => {
                          const updated = isSelected
                            ? prev.subjects.filter(s => s !== subj)
                            : [...prev.subjects, subj];
                          return { ...prev, subjects: updated };
                        });
                      }}
                      className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all border ${
                        isSelected
                          ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                          : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                      }`}
                    >
                      {subj}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Time & Score Settings */}
          <div className="card-3d p-6 rounded-3xl space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              Timing & Scoring Rules
            </h3>

            <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3.5 dark:border-slate-800 dark:bg-slate-950/60">
              <div>
                <span className="text-xs font-black text-slate-900 dark:text-white">Dynamic AI Scoring & Duration</span>
                <p className="text-[11px] text-slate-500 font-medium">Assigns test time (60-300s) dynamically based on complexity</p>
              </div>
              <input
                type="checkbox"
                checked={config.smartScoring}
                onChange={(e) => setConfig(prev => ({ ...prev, smartScoring: e.target.checked }))}
                className="h-4.5 w-4.5 rounded-lg text-amber-600 focus:ring-amber-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Default Time Limit (sec):</label>
                <input
                  type="number"
                  value={config.defaultTimeLimit}
                  onChange={(e) => setConfig(prev => ({ ...prev, defaultTimeLimit: parseInt(e.target.value) || 120 }))}
                  className="input-3d-recessed mt-1 w-full px-3.5 py-2 text-xs font-black text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Default Max Score:</label>
                <input
                  type="number"
                  value={config.defaultMaxScore}
                  onChange={(e) => setConfig(prev => ({ ...prev, defaultMaxScore: parseInt(e.target.value) || 10 }))}
                  className="input-3d-recessed mt-1 w-full px-3.5 py-2 text-xs font-black text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Category Distribution & Difficulty Distribution */}
        <div className="space-y-6">
          {/* Category Distribution Calculator */}
          <div className="card-3d p-6 rounded-3xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <Layers className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                Category Weight Distribution
              </h3>
              <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-full ${totalCatPct === 100 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'}`}>
                Sum: {totalCatPct}%
              </span>
            </div>

            <div className="space-y-3">
              {DEFAULT_CATEGORIES.map(cat => {
                const currentPct = config.categoryDistribution[cat] || 0;
                const exactCount = calculateCategoryCount(cat);

                return (
                  <div key={cat} className="space-y-1.5 border border-slate-200/80 bg-slate-50/70 p-3 rounded-2xl dark:border-slate-800 dark:bg-slate-950/50">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800 dark:text-slate-200">{cat}</span>
                      <span className="font-black text-amber-600 dark:text-amber-400">
                        {currentPct}% → <span className="text-slate-900 dark:text-white font-black">{exactCount} items</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={currentPct}
                        onChange={(e) => handleCategoryPctChange(cat, parseInt(e.target.value))}
                        className="w-full accent-amber-500"
                      />
                      <input
                        type="number"
                        value={currentPct}
                        onChange={(e) => handleCategoryPctChange(cat, parseInt(e.target.value) || 0)}
                        className="input-3d-recessed w-14 px-2 py-1 text-center text-xs font-black text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Difficulty Distribution Calculator */}
          <div className="card-3d p-6 rounded-3xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                Difficulty Weight Matrix
              </h3>
              <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-full ${totalDiffPct === 100 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'}`}>
                Sum: {totalDiffPct}%
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {(['Easy', 'Medium', 'Hard'] as const).map(diff => {
                const pct = config.difficultyDistribution[diff] || 0;
                const count = calculateDifficultyCount(diff);

                return (
                  <div key={diff} className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3.5 text-center dark:border-slate-800 dark:bg-slate-950/50">
                    <span className="text-xs font-black text-slate-700 dark:text-slate-300">{diff}</span>
                    <p className="mt-1 text-xl font-black text-amber-600 dark:text-amber-400">{pct}%</p>
                    <p className="text-[11px] font-black text-slate-900 dark:text-white">{count} items</p>

                    <input
                      type="number"
                      value={pct}
                      onChange={(e) => handleDifficultyPctChange(diff, parseInt(e.target.value) || 0)}
                      className="input-3d-recessed mt-2 w-full px-2 py-1 text-center text-xs font-black text-slate-900 dark:text-white"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
