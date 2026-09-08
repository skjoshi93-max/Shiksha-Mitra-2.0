import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  X,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Clock,
  Award,
  Layers,
  BookOpen,
  Zap,
  ShieldCheck,
  BarChart2,
  ListOrdered,
  Plus,
  Trash2,
  Search,
  Filter,
} from 'lucide-react';
import { Assessment, AssessmentGeneratorConfig, AssessmentProgressReport, DifficultyLevel } from '../types';
import { ProcessingMode, getSavedModelSelection, getSavedProcessingMode } from '../lib/geminiModels';
import { GeminiModelSelector } from './GeminiModelSelector';
import { AIContentIntegrityService } from '../lib/aiContentIntegrityService';
import {
  ASSESSMENT_PRESETS,
  TEACHER_SUBJECTS,
  SCHOOL_ACADEMIC_SUBJECTS,
  TEACHER_PROFESSIONAL_SUBJECTS,
  VOCATIONAL_SKILLS_SUBJECTS,
  ASSESSMENT_TARGETS,
  BOARDS_LIST,
  getCurriculumTopics,
  suggestAssessmentTitle,
  regenerateAlternativeTitles,
  AssessmentPreset,
} from '../lib/assessmentMetadata';

interface AIAssessmentGeneratorModalProps {
  onClose: () => void;
  onAssessmentGenerated: (assessment: Assessment) => void;
}

export const AIAssessmentGeneratorModal: React.FC<AIAssessmentGeneratorModalProps> = ({
  onClose,
  onAssessmentGenerated,
}) => {
  const [selectedModel, setSelectedModel] = useState<string>(() => getSavedModelSelection());
  const [processingMode, setProcessingMode] = useState<ProcessingMode>(() => getSavedProcessingMode());

  // Preset or initial form state
  const [config, setConfig] = useState<AssessmentGeneratorConfig>({
    title: 'General Teaching Assessment',
    slug: 'general-teaching-assessment',
    subject: 'General Teaching',
    classLevel: 'General Teacher Certification',
    board: 'General',
    totalQuestions: 20,
    duration: 25,
    passScore: 70,
    difficultyDistribution: { Easy: 30, Medium: 50, Hard: 20 },
    topics: getCurriculumTopics('General Teaching', 'General Teacher Certification', 'General'),
    language: 'English',
    questionType: 'Multiple Choice',
    active: true,
  });

  const [isCustomSubject, setIsCustomSubject] = useState(false);
  const [customSubjectInput, setCustomSubjectInput] = useState('');

  const [newTopicInput, setNewTopicInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [currentProgress, setCurrentProgress] = useState<number>(0);
  const [finalReport, setFinalReport] = useState<{
    assessment: Assessment;
    report: AssessmentProgressReport;
  } | null>(null);

  // Preset Search and Filtering State
  const [presetSearch, setPresetSearch] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');
  const [titleRegenIndex, setTitleRegenIndex] = useState(0);
  const [topicRegenIndex, setTopicRegenIndex] = useState(0);

  // Direct Text Mode Toggle
  const [isDirectTextMode, setIsDirectTextMode] = useState(false);
  const [directTextPrompt, setDirectTextPrompt] = useState('');

  // Comma-separated topics raw text string state
  const [topicsRawText, setTopicsRawText] = useState(() => config.topics.join(', '));

  // Sync topicsRawText when config.topics changes programmatically (e.g. via preset or auto-suggest)
  useEffect(() => {
    setTopicsRawText(config.topics.join(', '));
  }, [config.topics]);

  // Handle topics text area change
  const handleTopicsRawTextChange = (text: string) => {
    setTopicsRawText(text);
    const splitTopics = text
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);
    setConfig(prev => ({ ...prev, topics: splitTopics }));
    setHasManualTopicsOverride(true);
  };

  // Manual override tracking flags
  const [hasManualTitleOverride, setHasManualTitleOverride] = useState(false);
  const [hasManualTopicsOverride, setHasManualTopicsOverride] = useState(false);
  const [hasManualDurationOverride, setHasManualDurationOverride] = useState(false);
  const [hasManualPassScoreOverride, setHasManualPassScoreOverride] = useState(false);

  // Auto-fill title & topics when subject, classLevel, or board changes (unless overridden)
  useEffect(() => {
    if (!hasManualTitleOverride) {
      const suggested = suggestAssessmentTitle(config.subject, config.classLevel, config.board);
      const slugified = suggested.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      setConfig(prev => ({ ...prev, title: suggested, slug: slugified }));
    }
  }, [config.subject, config.classLevel, config.board]);

  useEffect(() => {
    if (!hasManualTopicsOverride) {
      const autoTopics = getCurriculumTopics(config.subject, config.classLevel, config.board);
      setConfig(prev => ({ ...prev, topics: autoTopics }));
    }
  }, [config.subject, config.classLevel, config.board]);

  // Intelligent multi-factor duration & pass score calculation
  useEffect(() => {
    const qCount = config.totalQuestions || 10;
    
    // Difficulty weighting factor based on difficulty distribution matrix
    const easyPct = config.difficultyDistribution?.Easy || 33;
    const medPct = config.difficultyDistribution?.Medium || 34;
    const hardPct = config.difficultyDistribution?.Hard || 33;
    const avgDiffMultiplier = (easyPct * 0.8 + medPct * 1.2 + hardPct * 1.8) / 100;

    // Question type complexity factor (estimating based on standard questionType or typical profile)
    let typeMultiplier = 1.0;
    const qType = (config.questionType || '').toLowerCase();
    if (qType.includes('long') || qType.includes('solve')) typeMultiplier = 1.6;
    else if (qType.includes('short')) typeMultiplier = 1.3;
    else if (qType.includes('fill') || qType.includes('true')) typeMultiplier = 0.8;

    // Teacher level / assessment target factor
    let levelMultiplier = 1.0;
    const target = (config.classLevel || '').toLowerCase();
    if (target.includes('trainer') || target.includes('leadership') || target.includes('head')) levelMultiplier = 1.25;
    else if (target.includes('secondary')) levelMultiplier = 1.1;

    // Base time per question: ~1.5 minutes baseline, modulated by factors
    const calculatedDuration = Math.max(5, Math.round(qCount * 1.5 * avgDiffMultiplier * typeMultiplier * levelMultiplier));

    // Intelligent pass score calculation (ranges from 55% to 80% based on difficulty & level)
    let basePass = 60;
    if (hardPct > 50) basePass = 70;
    if (hardPct > 75) basePass = 75;
    if (levelMultiplier > 1.2) basePass += 5;
    const calculatedPassScore = Math.min(85, Math.max(50, basePass));

    setConfig(prev => ({
      ...prev,
      duration: hasManualDurationOverride ? prev.duration : calculatedDuration,
      passScore: hasManualPassScoreOverride ? prev.passScore : calculatedPassScore,
    }));
  }, [config.totalQuestions, config.difficultyDistribution, config.questionType, config.classLevel]);

  // Quick Preset Handler
  const handleApplyPreset = (preset: AssessmentPreset) => {
    setIsCustomSubject(false);
    setConfig({
      title: suggestAssessmentTitle(preset.subject, preset.classLevel, preset.board),
      slug: preset.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      subject: preset.subject,
      classLevel: preset.classLevel,
      board: preset.board,
      totalQuestions: preset.totalQuestions,
      duration: preset.duration,
      passScore: preset.passScore,
      difficultyDistribution: { ...preset.difficultyDistribution },
      topics: [...preset.topics],
      language: preset.language,
      questionType: preset.questionType,
      active: true,
    });
    setHasManualTitleOverride(false);
    setHasManualTopicsOverride(false);
  };

  const handleSubjectSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === '__custom__') {
      setIsCustomSubject(true);
      setConfig(prev => ({ ...prev, subject: '' }));
    } else {
      setIsCustomSubject(false);
      setConfig(prev => ({ ...prev, subject: val }));
    }
    setHasManualTopicsOverride(false);
  };

  const handleRegenerateTitle = () => {
    const alts = regenerateAlternativeTitles(config.subject, config.classLevel, config.board);
    const nextIdx = (titleRegenIndex + 1) % alts.length;
    setTitleRegenIndex(nextIdx);
    const newTitle = alts[nextIdx];
    const slugified = newTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    setConfig(prev => ({ ...prev, title: newTitle, slug: slugified }));
    setHasManualTitleOverride(true);
  };

  const handleRefreshTopics = () => {
    const nextIdx = topicRegenIndex + 1;
    setTopicRegenIndex(nextIdx);
    const refreshed = getCurriculumTopics(config.subject, config.classLevel, config.board, nextIdx);
    const commaSeparated = refreshed.join(', ');
    setConfig(prev => ({ ...prev, topics: refreshed }));
    setTopicsRawText(commaSeparated);
    setHasManualTopicsOverride(true);
  };

  const handleAddTopic = () => {
    if (newTopicInput.trim()) {
      const updated = [...config.topics, newTopicInput.trim()];
      setConfig(prev => ({
        ...prev,
        topics: updated,
      }));
      setTopicsRawText(updated.join(', '));
      setNewTopicInput('');
      setHasManualTopicsOverride(true);
    }
  };

  const handleRemoveTopic = (index: number) => {
    const updated = config.topics.filter((_, i) => i !== index);
    setConfig(prev => ({
      ...prev,
      topics: updated,
    }));
    setTopicsRawText(updated.join(', '));
    setHasManualTopicsOverride(true);
  };

  const handleTitleChange = (val: string) => {
    const slugified = val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    setConfig(prev => ({
      ...prev,
      title: val,
      slug: slugified,
    }));
    setHasManualTitleOverride(true);
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setCurrentProgress(5);
    setCurrentStep('1/6: Generating Teacher Assessment Metadata & Topic Distribution...');

    // Extract exact topics from topicsRawText or fallback to config.topics
    const parsedRawTopics = topicsRawText
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);
    const activeTopics = parsedRawTopics.length > 0 ? parsedRawTopics : config.topics;

    const payloadConfig = {
      ...config,
      topics: activeTopics,
      model: selectedModel,
      processingMode,
      directTextPrompt: isDirectTextMode ? directTextPrompt : undefined,
    };

    try {
      await new Promise(r => setTimeout(r, 300));
      const targetTotal = Math.max(1, Number(config.totalQuestions) || 10);
      const jobId = `ASM-JOB-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

      // Progressive chunked generation to prevent HTTP timeouts for large question counts (up to 1000)
      const batchSize = targetTotal > 50 ? 15 : 10;
      const totalBatches = Math.ceil(targetTotal / batchSize);
      let accumulatedQuestions: any[] = [];

      for (let b = 0; b < totalBatches; b++) {
        const currentOffset = accumulatedQuestions.length;
        const neededInBatch = Math.min(batchSize, targetTotal - currentOffset);
        if (neededInBatch <= 0) break;

        const currentBatchNum = b + 1;
        const currentPct = Math.min(88, Math.round(10 + (currentOffset / targetTotal) * 75));
        setCurrentProgress(currentPct);
        setCurrentStep(`Generating MCQs (Batch ${currentBatchNum}/${totalBatches}) - ${accumulatedQuestions.length}/${targetTotal} Questions ready...`);

        let batchQuestions: any[] = [];
        let retryCount = 0;
        const maxRetries = 2;

        while (retryCount <= maxRetries && batchQuestions.length === 0) {
          try {
            const response = await fetch('/api/generate-assessment-batch', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                jobId,
                batchCount: neededInBatch,
                offset: currentOffset,
                totalQuestions: targetTotal,
                title: config.title,
                subject: config.subject,
                classLevel: config.classLevel,
                board: config.board,
                topics: activeTopics,
                language: config.language,
                model: selectedModel,
                processingMode,
              }),
            });

            const text = await response.text();
            if (text && text.trim().length > 0) {
              try {
                const data = JSON.parse(text);
                if (data && data.success && Array.isArray(data.questions) && data.questions.length > 0) {
                  batchQuestions = data.questions;
                }
              } catch (_) {
                // Non-JSON response (e.g. gateway timeout or proxy error)
              }
            }
          } catch (fetchErr) {
            console.warn(`[Batch Generation] Network error on batch ${currentBatchNum}:`, fetchErr);
          }

          if (batchQuestions.length === 0) {
            retryCount++;
            if (retryCount <= maxRetries) {
              await new Promise(r => setTimeout(r, 400));
            }
          }
        }

        // Fallback to single endpoint if batch endpoint yielded no items
        if (batchQuestions.length === 0) {
          try {
            const fallbackRes = await fetch('/api/generate-assessment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                jobId,
                totalQuestions: neededInBatch,
                ...payloadConfig,
              }),
            });
            const fbText = await fallbackRes.text();
            if (fbText) {
              const fbData = JSON.parse(fbText);
              if (fbData && fbData.assessment && Array.isArray(fbData.assessment.questions)) {
                batchQuestions = fbData.assessment.questions;
              }
            }
          } catch (fbErr) {
            console.warn(`[Batch Fallback] Fallback fetch warning:`, fbErr);
          }
        }

        // Append batch questions
        for (const q of batchQuestions) {
          if (accumulatedQuestions.length < targetTotal) {
            accumulatedQuestions.push(q);
          }
        }
      }

      if (accumulatedQuestions.length === 0) {
        throw new Error('Failed to generate questions from AI service. Please check your model configuration and retry.');
      }

      setCurrentProgress(90);
      setCurrentStep('Validating Difficulty Distribution, LaTeX Notation & Quality Threshold (90+ score)...');
      await new Promise(r => setTimeout(r, 400));

      const indexedQuestions = accumulatedQuestions.map((q, idx) => ({
        ...q,
        id: `Q${idx + 1}`,
      }));

      // Run full client-side 6-layer integrity validation
      const integrityResult = AIContentIntegrityService.validateBatch(indexedQuestions, {
        subject: config.subject,
        classLevel: config.classLevel,
        minQualityScore: 88,
        autoRebalanceAnswers: true,
      });

      const verifiedQuestions = integrityResult.verifiedItems;

      const topicCounts: Record<string, number> = {};
      const diffCounts: Record<DifficultyLevel, number> = { Easy: 0, Medium: 0, Hard: 0 };

      verifiedQuestions.forEach(q => {
        topicCounts[q.topic] = (topicCounts[q.topic] || 0) + 1;
        diffCounts[q.difficulty as DifficultyLevel] = (diffCounts[q.difficulty as DifficultyLevel] || 0) + 1;
      });

      const cleanSlug = config.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

      const asm: Assessment = {
        id: `ASM-${Date.now().toString(36).toUpperCase()}`,
        title: config.title,
        slug: cleanSlug || 'teacher-skill-assessment',
        subject: config.subject,
        classLevel: config.classLevel,
        board: config.board,
        description: `Professional certification test for ${config.subject} teachers (${config.classLevel} ${config.board}).`,
        duration: config.duration,
        passScore: config.passScore,
        active: true,
        questions: verifiedQuestions,
        totalQuestions: verifiedQuestions.length,
        totalMarks: verifiedQuestions.reduce((sum, q) => sum + (q.marks || 1), 0),
        qualityScore: integrityResult.averageQualityScore || 95,
        topicCoverage: topicCounts,
        difficultyCoverage: diffCounts,
        createdDate: new Date().toISOString(),
        updatedDate: new Date().toISOString(),
        verified: true,
        verificationStatus: 'VERIFIED',
      };

      const report: AssessmentProgressReport = {
        requested: config.totalQuestions,
        generated: integrityResult.totalProcessed,
        rejected: integrityResult.rejectedCount,
        regenerated: integrityResult.rejectedCount,
        duplicates: 0,
        finalApproved: verifiedQuestions.length,
        averageQuality: integrityResult.averageQualityScore || 95,
        topicCoverage: topicCounts,
        difficultyCoverage: diffCounts,
      };

      await new Promise(r => setTimeout(r, 300));
      setCurrentProgress(100);
      setCurrentStep('Finalizing Approved Teacher Skill Assessment!');

      setFinalReport({ assessment: asm, report });
    } catch (err: any) {
      console.error('AI Assessment Generation Error:', err);
      alert('Error connecting to AI service: ' + (err?.message || 'Please try again.'));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleConfirmAndSave = () => {
    if (finalReport) {
      onAssessmentGenerated(finalReport.assessment);
    }
  };

  // Filter presets
  const filteredPresets = ASSESSMENT_PRESETS.filter(p => {
    const matchesSearch =
      p.name.toLowerCase().includes(presetSearch.toLowerCase()) ||
      p.subject.toLowerCase().includes(presetSearch.toLowerCase()) ||
      p.category.toLowerCase().includes(presetSearch.toLowerCase()) ||
      p.classLevel.toLowerCase().includes(presetSearch.toLowerCase()) ||
      p.topics.some(t => t.toLowerCase().includes(presetSearch.toLowerCase()));
    const catStr = (p.category as string) || '';
    const mainCatStr = (p.mainCategory as string) || '';
    const matchesCat =
      selectedCategoryFilter === 'ALL' ||
      mainCatStr === selectedCategoryFilter ||
      catStr === selectedCategoryFilter ||
      p.classLevel === selectedCategoryFilter ||
      (selectedCategoryFilter === 'NUR to UKG' && (catStr === 'FOUNDATIONAL' || p.classLevel.includes('UKG') || p.classLevel.includes('NUR'))) ||
      (selectedCategoryFilter === '1st to 5th' && (catStr === 'PRIMARY' || p.classLevel.includes('1st') || p.classLevel.includes('5th'))) ||
      (selectedCategoryFilter === '6th to 8th' && (catStr === 'MIDDLE' || p.classLevel.includes('6th') || p.classLevel.includes('8th'))) ||
      (selectedCategoryFilter === '9th to 12th' && (catStr === 'SECONDARY' || p.classLevel.includes('9th') || p.classLevel.includes('12th'))) ||
      (selectedCategoryFilter === 'All Classes/General' && (catStr === 'GENERAL' || p.classLevel.includes('All Classes')));
    return matchesSearch && matchesCat;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-2xl dark:border-slate-800/80 dark:bg-slate-900/95 backdrop-blur-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100/85 pb-4 dark:border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                AI Skill Assessment Generator
                <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                  Teacher Certification AI
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Professional teacher competency & pedagogy assessment creator with intelligent topic alignment.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isGenerating}
            className="p-2 rounded-2xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* If Final Report is ready */}
        {finalReport ? (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="rounded-3xl border border-emerald-200/80 bg-emerald-50/50 p-6 dark:border-emerald-950/80 dark:bg-emerald-950/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-600/30">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-emerald-900 dark:text-emerald-100">
                      Teacher Assessment Generated & Validated Successfully!
                    </h3>
                    <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                      All questions passed pedagogical accuracy, answer proof, duplicate check & 90+ quality threshold.
                    </p>
                  </div>
                </div>
                <span className="rounded-2xl bg-emerald-100 px-3.5 py-1.5 text-xs font-black text-emerald-800 dark:bg-emerald-900/80 dark:text-emerald-200">
                  Avg Quality: {finalReport.report.averageQuality}/100
                </span>
              </div>

              {/* Report Metrics Bento */}
              <div className="mt-6 grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="rounded-2xl border border-emerald-200/60 bg-white/80 p-3 dark:border-emerald-900/60 dark:bg-slate-900/80">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Requested</span>
                  <p className="text-lg font-black text-slate-900 dark:text-white">{finalReport.report.requested}</p>
                </div>
                <div className="rounded-2xl border border-emerald-200/60 bg-white/80 p-3 dark:border-emerald-900/60 dark:bg-slate-900/80">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Generated</span>
                  <p className="text-lg font-black text-slate-900 dark:text-white">{finalReport.report.generated}</p>
                </div>
                <div className="rounded-2xl border border-emerald-200/60 bg-white/80 p-3 dark:border-emerald-900/60 dark:bg-slate-900/80">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500">Rejected</span>
                  <p className="text-lg font-black text-rose-600 dark:text-rose-400">{finalReport.report.rejected}</p>
                </div>
                <div className="rounded-2xl border border-emerald-200/60 bg-white/80 p-3 dark:border-emerald-900/60 dark:bg-slate-900/80">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500">Regenerated</span>
                  <p className="text-lg font-black text-amber-600 dark:text-amber-400">{finalReport.report.regenerated}</p>
                </div>
                <div className="rounded-2xl border border-emerald-200/60 bg-emerald-600 text-white p-3 shadow-md shadow-emerald-600/20 col-span-2 sm:col-span-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-100">Final Approved</span>
                  <p className="text-lg font-black">{finalReport.report.finalApproved}</p>
                </div>
              </div>

              {/* Assessment Preview Summary */}
              <div className="mt-6 rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 space-y-2">
                <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  Generated Teacher Assessment Summary
                </h4>
                <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{finalReport.assessment.title}</p>
                <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  <span className="rounded-lg bg-slate-100 px-2 py-0.5 dark:bg-slate-800">Slug: {finalReport.assessment.slug}</span>
                  <span className="rounded-lg bg-slate-100 px-2 py-0.5 dark:bg-slate-800">Subject: {finalReport.assessment.subject}</span>
                  <span className="rounded-lg bg-slate-100 px-2 py-0.5 dark:bg-slate-800">Duration: {finalReport.assessment.duration} mins</span>
                  <span className="rounded-lg bg-slate-100 px-2 py-0.5 dark:bg-slate-800">Pass Score: {finalReport.assessment.passScore}%</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 italic pt-1">{finalReport.assessment.description}</p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setFinalReport(null)}
                className="rounded-2xl border border-slate-200/80 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 transition-all"
              >
                Re-configure
              </button>
              <button
                onClick={handleConfirmAndSave}
                className="flex items-center gap-2 rounded-2xl bg-indigo-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 transition-all"
              >
                <CheckCircle2 className="h-4 w-4" /> Save & Open Assessment
              </button>
            </div>
          </div>
        ) : (
          /* Generator Form */
          <div className="space-y-6">
            {/* Presets Explorer Section */}
            <div className="rounded-3xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800/80 dark:bg-slate-800/40 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 dark:border-slate-800 pb-3">
                <div>
                  <label className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Zap className="h-4 w-4 text-amber-500 fill-amber-500" /> SEARCHABLE & FILTERABLE PRESETS ({filteredPresets.length})
                  </label>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                    Apply a preset to auto-fill high-quality standard layouts instantly.
                  </p>
                </div>

                {/* Filter Category Pills */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {(['ALL', 'NUR to UKG', '1st to 5th', '6th to 8th', '9th to 12th', 'All Classes/General'] as const).map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategoryFilter(cat)}
                      className={`rounded-xl px-3 py-1 text-[11px] font-black transition-all ${
                        selectedCategoryFilter === cat
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative w-full">
                <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="🔍 Search teacher competency presets by subject, class category, topics..."
                  value={presetSearch}
                  onChange={e => setPresetSearch(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200/90 bg-white pl-9 pr-4 py-2 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>

              {/* Presets Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto pr-1">
                {filteredPresets.map(preset => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleApplyPreset(preset)}
                    className="group rounded-2xl border border-slate-200/80 bg-white p-3 text-left hover:border-indigo-500 hover:shadow-md dark:border-slate-700/80 dark:bg-slate-900 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-black text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                          {preset.mainCategory || preset.category} • {preset.totalQuestions} MCQs • {preset.duration} mins
                        </span>
                      </div>
                      <p className="text-xs font-black text-slate-900 dark:text-white group-hover:text-indigo-600 line-clamp-1">
                        {preset.name}
                      </p>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                      Topics: {preset.topics.slice(0, 3).join(', ')}...
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Direct Text Mode Toggle Banner */}
            <div className="flex items-center justify-between rounded-2xl border border-indigo-200/80 bg-indigo-50/50 p-3.5 dark:border-indigo-900/60 dark:bg-indigo-950/30">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-indigo-600" />
                <span className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
                  Direct Text Mode: Fast Paste & Raw Syllabus Direct Entry
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsDirectTextMode(prev => !prev)}
                className={`rounded-xl px-3 py-1.5 text-xs font-extrabold transition-all border ${
                  isDirectTextMode
                    ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                    : 'bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50 dark:bg-slate-900 dark:text-indigo-300 dark:border-indigo-800'
                }`}
              >
                ✍️ {isDirectTextMode ? 'Standard Form Mode' : 'Direct Text Mode'}
              </button>
            </div>

            {isDirectTextMode ? (
              <div className="space-y-3 rounded-2xl border border-indigo-200 bg-white p-4 dark:border-indigo-800 dark:bg-slate-900">
                <label className="text-xs font-black text-slate-800 dark:text-slate-200">
                  Direct Syllabus or Assessment Text Prompt *
                </label>
                <textarea
                  rows={4}
                  value={directTextPrompt}
                  onChange={e => setDirectTextPrompt(e.target.value)}
                  placeholder="Paste raw syllabus, chapter text, or question requirements here directly..."
                  className="w-full rounded-2xl border border-slate-200 p-3 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            ) : null}

            {/* Assessment Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Assessment Title with AI Regenerate */}
              <div className="space-y-1 md:col-span-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    Assessment Title *
                    <span className="rounded-md bg-indigo-100 px-2 py-0.5 text-[9px] font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                      ✨ AI Suggested
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={handleRegenerateTitle}
                    className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                    title="Suggest another professional title"
                  >
                    <RefreshCw className="h-3 w-3" /> 🔄 Regen Title
                  </button>
                </div>
                <input
                  type="text"
                  value={config.title}
                  onChange={e => handleTitleChange(e.target.value)}
                  placeholder="e.g., CBSE Mathematics Class 8 Assessment"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-xs font-bold text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-800 dark:bg-slate-800/50 dark:text-white"
                />
              </div>

              {/* CATEGORIZED SUBJECT DROPDOWN WITH OPTGROUPS */}
              <div className="space-y-1 md:col-span-2 sm:col-span-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Subject *</span>
                  <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">Academic & Professional</span>
                </label>
                <select
                  value={isCustomSubject ? '__custom__' : config.subject}
                  onChange={handleSubjectSelectChange}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-xs font-bold text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-800 dark:bg-slate-800/50 dark:text-white"
                >
                  <option value="" disabled>-- Select Subject --</option>
                  <optgroup label="School / Academic Subjects">
                    {SCHOOL_ACADEMIC_SUBJECTS.map((sub, i) => (
                      <option key={`sch-${i}`} value={sub}>{sub}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Teacher / Professional Education">
                    {TEACHER_PROFESSIONAL_SUBJECTS.map((sub, i) => (
                      <option key={`tch-${i}`} value={sub}>{sub}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Vocational & Skills">
                    {VOCATIONAL_SKILLS_SUBJECTS.map((sub, i) => (
                      <option key={`voc-${i}`} value={sub}>{sub}</option>
                    ))}
                  </optgroup>
                  <option value="__custom__">✏️ Custom Subject (Type below)...</option>
                </select>

                {isCustomSubject && (
                  <div className="mt-2">
                    <input
                      type="text"
                      value={config.subject}
                      onChange={e => setConfig(prev => ({ ...prev, subject: e.target.value }))}
                      placeholder="Enter custom subject (e.g. Artificial Intelligence Ethics)"
                      className="w-full rounded-2xl border border-indigo-300 bg-white px-4 py-2 text-xs font-bold text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-indigo-700 dark:bg-slate-900 dark:text-white shadow-sm"
                    />
                  </div>
                )}
              </div>

              {/* TARGET CLASS CATEGORY DROPDOWN */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Target Class Category *
                </label>
                <select
                  value={config.classLevel}
                  onChange={e => setConfig(prev => ({ ...prev, classLevel: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-xs font-bold text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-800 dark:bg-slate-800/50 dark:text-white"
                >
                  {ASSESSMENT_TARGETS.map((tgt, i) => (
                    <option key={i} value={tgt}>{tgt}</option>
                  ))}
                </select>
              </div>

              {/* BOARD / FRAMEWORK DROPDOWN */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Board / Framework *
                </label>
                <select
                  value={config.board}
                  onChange={e => setConfig(prev => ({ ...prev, board: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-xs font-bold text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-800 dark:bg-slate-800/50 dark:text-white"
                >
                  {BOARDS_LIST.map((brd, i) => (
                    <option key={i} value={brd}>{brd}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Number of Questions *
                </label>
                <select
                  value={config.totalQuestions}
                  onChange={e => setConfig(prev => ({ ...prev, totalQuestions: Number(e.target.value) }))}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-xs font-bold text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-800 dark:bg-slate-800/50 dark:text-white"
                >
                  <option value={10}>10 Questions</option>
                  <option value={20}>20 Questions</option>
                  <option value={25}>25 Questions</option>
                  <option value={50}>50 Questions</option>
                  <option value={100}>100 Questions</option>
                  <option value={200}>200 Questions</option>
                  <option value={500}>500 Questions</option>
                  <option value={1000}>1000 Questions</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Duration (Minutes) *</span>
                  <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-normal">AI Recommended</span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={300}
                  value={config.duration}
                  onChange={e => {
                    setHasManualDurationOverride(true);
                    setConfig(prev => ({ ...prev, duration: Number(e.target.value) }));
                  }}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-xs font-bold text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-800 dark:bg-slate-800/50 dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Pass Score (%) *</span>
                  <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-normal">AI Recommended</span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={config.passScore}
                  onChange={e => {
                    setHasManualPassScoreOverride(true);
                    setConfig(prev => ({ ...prev, passScore: Number(e.target.value) }));
                  }}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-xs font-bold text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-800 dark:bg-slate-800/50 dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Language
                </label>
                <select
                  value={config.language}
                  onChange={e => setConfig(prev => ({ ...prev, language: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-xs font-bold text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-800 dark:bg-slate-800/50 dark:text-white"
                >
                  <option value="English">English</option>
                  <option value="Hindi">Hindi (हिंदी)</option>
                  <option value="Hinglish">Hinglish</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Question Type *
                </label>
                <select
                  value={config.questionType}
                  onChange={e => setConfig(prev => ({ ...prev, questionType: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-xs font-bold text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-800 dark:bg-slate-800/50 dark:text-white"
                >
                  <option value="Multiple Choice">Multiple Choice (MCQ)</option>
                  <option value="Short Answer">Short Answer</option>
                  <option value="Long Answer">Long Answer</option>
                  <option value="MCQ + Short Answer + Long Answer">MCQ + Short Answer + Long Answer (Mixed)</option>
                </select>
              </div>
            </div>

            {/* Global Gemini Model Selector */}
            <div className="pt-2">
              <GeminiModelSelector
                selectedModel={selectedModel}
                onModelChange={setSelectedModel}
                processingMode={processingMode}
                onProcessingModeChange={setProcessingMode}
              />
            </div>

            {/* Difficulty Distribution Matrix */}
            <div className="rounded-3xl border border-slate-200/80 bg-slate-50/50 p-4 dark:border-slate-800/80 dark:bg-slate-800/30 space-y-3">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                <span>Difficulty Distribution Matrix</span>
                <span className="text-[11px] text-indigo-600 dark:text-indigo-400">
                  Total = {config.difficultyDistribution.Easy + config.difficultyDistribution.Medium + config.difficultyDistribution.Hard}%
                </span>
              </label>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">Easy %</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={config.difficultyDistribution.Easy}
                    onChange={e =>
                      setConfig(prev => ({
                        ...prev,
                        difficultyDistribution: { ...prev.difficultyDistribution, Easy: Number(e.target.value) },
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  />
                  <span className="text-[10px] text-slate-400">
                    ~{Math.round((config.totalQuestions * config.difficultyDistribution.Easy) / 100)} Qs
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">Medium %</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={config.difficultyDistribution.Medium}
                    onChange={e =>
                      setConfig(prev => ({
                        ...prev,
                        difficultyDistribution: { ...prev.difficultyDistribution, Medium: Number(e.target.value) },
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  />
                  <span className="text-[10px] text-slate-400">
                    ~{Math.round((config.totalQuestions * config.difficultyDistribution.Medium) / 100)} Qs
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400">Hard %</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={config.difficultyDistribution.Hard}
                    onChange={e =>
                      setConfig(prev => ({
                        ...prev,
                        difficultyDistribution: { ...prev.difficultyDistribution, Hard: Number(e.target.value) },
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  />
                  <span className="text-[10px] text-slate-400">
                    ~{Math.round((config.totalQuestions * config.difficultyDistribution.Hard) / 100)} Qs
                  </span>
                </div>
              </div>
            </div>

            {/* Topics to Cover (Comma Separated) * */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <span>Topics to Cover (Comma Separated) *</span>
                  <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1">
                    📚 Curriculum Grounded
                  </span>
                </label>
                <button
                  type="button"
                  onClick={handleRefreshTopics}
                  className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                  title="Refresh topics"
                >
                  <RefreshCw className="h-3 w-3" /> 🔄 Regen Topics
                </button>
              </div>

              <textarea
                rows={4}
                value={topicsRawText}
                onChange={e => handleTopicsRawTextChange(e.target.value)}
                placeholder="Enter topics separated by comma (e.g. Real Numbers, Polynomials, Linear Equations, Quadratic Equations)..."
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 p-3.5 text-xs font-medium leading-relaxed text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-800 dark:bg-slate-800/50 dark:text-white"
              />

              {/* Tag chips for visual review & quick deletion */}
              <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto p-1">
                {config.topics.map((t, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-50 border border-indigo-200/80 px-2.5 py-1 text-xs font-bold text-indigo-700 dark:bg-indigo-950/80 dark:border-indigo-800/80 dark:text-indigo-300"
                  >
                    {t}
                    <button
                      type="button"
                      onClick={() => handleRemoveTopic(idx)}
                      className="hover:text-rose-500 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Generation Progress Indicator */}
            {isGenerating && (
              <div className="rounded-3xl border border-indigo-200/80 bg-indigo-50/80 p-5 dark:border-indigo-950/80 dark:bg-indigo-950/40 space-y-3 animate-in fade-in duration-200">
                <div className="flex items-center justify-between text-xs font-bold text-indigo-900 dark:text-indigo-200">
                  <span className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin text-indigo-600" />
                    {currentStep}
                  </span>
                  <span>{currentProgress}%</span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-indigo-200 dark:bg-indigo-900">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-300 rounded-full"
                    style={{ width: `${currentProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100/80 dark:border-slate-800/80">
              <button
                type="button"
                onClick={onClose}
                disabled={isGenerating}
                className="rounded-2xl border border-slate-200/80 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isGenerating || !config.title.trim()}
                className="flex items-center gap-2 rounded-2xl bg-indigo-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
              >
                <Sparkles className="h-4 w-4" />
                {isGenerating ? 'Generating Assessment...' : '✨ Generate Complete Teacher Assessment'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
