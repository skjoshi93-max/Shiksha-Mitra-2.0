import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  CheckCircle2,
  Copy,
  Printer,
  Sparkles,
  Eye,
  FileCheck,
  Lightbulb,
  FileText,
  Target,
  ChevronDown,
  ChevronUp,
  Layers,
  Award,
  Clock,
  HelpCircle,
  Hash,
  Share2,
  Check,
  Maximize2,
  Minimize2,
  Bookmark,
  ShieldCheck,
} from 'lucide-react';
import { MathRenderer } from './MathRenderer';
import { ChapterSolutionData, ChapterExercise, WordMeaningItem, InTextCheckpointItem, CompetencyBasedQuestionItem, ExtractZoneItem } from '../../lib/academicSuiteTypes';
import { Question } from '../../types';

export interface StructuredSolutionStep {
  stepNumber: number | string;
  title: string;
  body: string;
  formula?: string;
  tip?: string;
}

export interface NativeSolutionData {
  id?: string;
  questionId?: string;
  classLevel?: string;
  subject?: string;
  bookTitle?: string;
  chapterTitle?: string;
  exerciseTitle?: string;
  questionNumber?: string | number;
  questionText: string;
  questionType?: string;
  difficulty?: 'Easy' | 'Medium' | 'Hard' | string;
  marks?: number;
  timeLimit?: number;
  options?: Record<string, string> | { [key: string]: string };
  correctOption?: string;
  finalAnswer: string;
  steps?: StructuredSolutionStep[];
  stepByStepExplanation?: string;
  rubricCriteria?: { criteria: string; marks: number | string }[];
  pedagogicalTip?: string;
  keyFormulas?: string[];
  wordMeanings?: WordMeaningItem[];
  bilingualSummary?: {
    englishTitle: string;
    hindiTitle: string;
    paragraphs: { en: string; hi: string }[];
    keyTakeaways?: string[];
  };
  competencyType?: 'MCQ' | 'ASSERTION_REASON' | 'CASE_STUDY' | 'CONCEPTUAL';
  sourceTag?: string;
}

interface NativeShikshaMitraSolutionRendererProps {
  data: NativeSolutionData | ChapterSolutionData | Question | any;
  variant?: 'card' | 'embedded' | 'modal' | 'full-manual';
  onClose?: () => void;
  showActions?: boolean;
  defaultExpanded?: boolean;
}

/**
 * Intelligent Step Parser: extracts clean numbered steps from freeform text,
 * Markdown, or JSON arrays while scrubbing third-party watermarks and formatting.
 */
function parseStepsFromText(text?: string): StructuredSolutionStep[] {
  if (!text) return [];

  // If already JSON array string
  if (text.trim().startsWith('[') && text.trim().endsWith(']')) {
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((item, idx) => ({
          stepNumber: item.stepNumber || idx + 1,
          title: item.title || `Step ${idx + 1}`,
          body: typeof item === 'string' ? item : item.body || item.explanation || item.step || '',
          formula: item.formula,
          tip: item.tip,
        }));
      }
    } catch {}
  }

  // Regex splitting on standard step markers: "Step 1:", "Step 2.", "1.", "Given:", "To Prove:", "Calculation:"
  const stepPattern = /(?:^|\n)(?:Step\s*(\d+|[A-Za-z])[:.]?|(\d+)\.\s+|([A-Za-z]\))\s+|((?:Given|To Find|Formula Used|Calculation|Proof|Analysis|Reasoning|Explanation|Step\s+\d+)[:.]))/gi;
  const matches: { index: number; label: string }[] = [];
  let match;

  while ((match = stepPattern.exec(text)) !== null) {
    const label = match[1] || match[2] || match[3] || match[4] || `Step ${matches.length + 1}`;
    matches.push({ index: match.index, label: label.trim().replace(/[:.]/g, '') });
  }

  if (matches.length <= 1) {
    // If no distinct markers, split into logical paragraphs
    const paragraphs = text.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
    if (paragraphs.length > 1) {
      return paragraphs.map((p, idx) => ({
        stepNumber: idx + 1,
        title: idx === 0 ? 'Initial Formulation & Given Data' : idx === paragraphs.length - 1 ? 'Final Conclusion & Calculation' : `Derivation Step ${idx + 1}`,
        body: p,
      }));
    }
    return [{
      stepNumber: 1,
      title: 'Complete Step-by-Step Procedure',
      body: text,
    }];
  }

  const steps: StructuredSolutionStep[] = [];
  for (let i = 0; i < matches.length; i++) {
    const current = matches[i];
    const nextIndex = i + 1 < matches.length ? matches[i + 1].index : text.length;
    const bodyContent = text.substring(current.index, nextIndex).trim();
    // Remove the step label prefix from the body text
    const cleanBody = bodyContent.replace(/^(?:Step\s*\d+[:.]?|\d+\.\s+|[A-Za-z]\)\s+|(?:Given|To Find|Formula Used|Calculation|Proof|Analysis|Reasoning|Explanation)[:.]\s*)/i, '').trim();

    steps.push({
      stepNumber: i + 1,
      title: current.label.toLowerCase().startsWith('step') ? current.label : `Step ${i + 1}: ${current.label}`,
      body: cleanBody || bodyContent,
    });
  }

  return steps;
}

/**
 * Normalizes input data into NativeSolutionData structure
 */
function normalizeToNativeSolution(raw: any): NativeSolutionData {
  if (!raw) {
    return {
      questionText: 'No question data available.',
      finalAnswer: 'Solution not generated yet.',
    };
  }

  // Handle standard Question type from QuestionBank
  if (raw.question && !raw.exercises && !raw.inTextCheckpoints) {
    let steps: StructuredSolutionStep[] = [];
    if (raw.steps && Array.isArray(raw.steps)) {
      steps = raw.steps;
    } else if (raw.stepByStepExplanation) {
      steps = parseStepsFromText(raw.stepByStepExplanation);
    } else if (raw.answer) {
      steps = parseStepsFromText(raw.answer);
    }

    let parsedOptions: Record<string, string> | undefined = undefined;
    if (raw.options) {
      if (typeof raw.options === 'object' && !Array.isArray(raw.options)) {
        parsedOptions = raw.options;
      } else if (Array.isArray(raw.options)) {
        parsedOptions = {};
        raw.options.forEach((opt: string, i: number) => {
          const key = String.fromCharCode(65 + i);
          parsedOptions![key] = opt;
        });
      }
    }

    return {
      id: raw.id,
      questionId: raw.id,
      classLevel: raw.classLevel || raw.class || 'Class 6',
      subject: raw.subject || 'General',
      chapterTitle: raw.chapter || raw.category || 'General Exercises',
      questionNumber: raw.qNumber || raw.questionNumber || '1',
      questionText: raw.question,
      questionType: raw.questionType || (parsedOptions ? 'Multiple Choice' : 'Structured Descriptive'),
      difficulty: raw.difficulty || 'Medium',
      marks: raw.maxScore || raw.marks || 2,
      timeLimit: raw.timeLimit || 90,
      options: parsedOptions,
      correctOption: raw.correctOption || (raw.options && typeof raw.answer === 'string' && raw.answer.length === 1 ? raw.answer : undefined),
      finalAnswer: raw.answer || raw.finalAnswer || (raw.hint ? `Guidance: ${raw.hint}` : 'Answer verified.'),
      steps: steps.length > 0 ? steps : [{ stepNumber: 1, title: 'Concept Application & Final Resolution', body: raw.answer || raw.hint || 'Apply core curriculum definitions.' }],
      pedagogicalTip: raw.hint,
      sourceTag: raw.board || 'NCERT / CBSE Curriculum Standard',
    };
  }

  // Handle ChapterExerciseItem directly
  if (raw.qNumber && raw.question) {
    return {
      questionNumber: raw.qNumber,
      questionText: raw.question,
      finalAnswer: raw.answer,
      steps: parseStepsFromText(raw.stepByStepExplanation || raw.answer),
      stepByStepExplanation: raw.stepByStepExplanation,
      chapterTitle: raw.exerciseTitle,
      sourceTag: 'NCERT Textbook Exercise Solution',
    };
  }

  // Default passthrough
  return {
    id: raw.id,
    classLevel: raw.classLevel,
    subject: raw.subject,
    bookTitle: raw.bookTitle,
    chapterTitle: raw.chapterTitle,
    questionText: raw.questionText || raw.question || 'NCERT Chapter Solution Set',
    finalAnswer: raw.finalAnswer || raw.answer || 'Refer to step-by-step breakdown below.',
    steps: Array.isArray(raw.steps) ? raw.steps : parseStepsFromText(raw.stepByStepExplanation || raw.answer),
    wordMeanings: raw.wordMeanings,
    bilingualSummary: raw.bilingualSummary,
    sourceTag: 'Native Shiksha Mitra Verified Solution',
  };
}

export const NativeShikshaMitraSolutionRenderer: React.FC<NativeShikshaMitraSolutionRendererProps> = ({
  data,
  variant = 'card',
  onClose,
  showActions = true,
  defaultExpanded = true,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'solution' | 'steps' | 'rubric' | 'vocabulary' | 'summary'>('solution');

  // Check if data is a complete ChapterSolutionData
  const isFullChapterSolution = useMemo(() => {
    return data && (Array.isArray(data.exercises) || Array.isArray(data.inTextCheckpoints));
  }, [data]);

  const normalized = useMemo(() => normalizeToNativeSolution(data), [data]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  // If full ChapterSolutionData is passed, render comprehensive multi-exercise blocks
  if (isFullChapterSolution) {
    const chapterSol = data as ChapterSolutionData;
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Top Header Card */}
        <div className="rounded-3xl border border-indigo-200/80 dark:border-indigo-900/50 bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 p-6 text-white shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-indigo-800/40 pb-4">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="rounded-full bg-indigo-500/20 border border-indigo-400/40 px-3 py-1 text-xs font-black text-indigo-200">
                {chapterSol.classLevel}
              </span>
              <span className="rounded-full bg-emerald-500/20 border border-emerald-400/40 px-3 py-1 text-xs font-black text-emerald-200">
                {chapterSol.subject}
              </span>
              <span className="rounded-full bg-slate-800 border border-slate-700 px-3 py-1 text-xs font-bold text-slate-300">
                {chapterSol.bookTitle}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-200 text-xs font-extrabold">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                Native Shiksha Mitra Verified Solutions
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleCopy(JSON.stringify(chapterSol, null, 2), 'chapter-json')}
                className="inline-flex items-center gap-1.5 rounded-2xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 px-3.5 py-1.5 text-xs font-bold text-slate-200 transition-all cursor-pointer"
                title="Copy Solution JSON"
              >
                {copiedKey === 'chapter-json' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-indigo-300" />}
                <span>{copiedKey === 'chapter-json' ? 'Copied JSON!' : 'Copy JSON'}</span>
              </button>
              <button
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 px-3.5 py-1.5 text-xs font-bold text-white shadow-md transition-all cursor-pointer"
                title="Print Clean Solution View"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Clean View</span>
              </button>
              {onClose && (
                <button
                  onClick={onClose}
                  className="rounded-2xl bg-slate-800 p-2 text-slate-400 hover:text-white transition-all cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          <div className="pt-4">
            <h2 className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
              <BookOpen className="w-6 h-6 text-indigo-400" />
              {chapterSol.chapterTitle}
            </h2>
            <p className="text-xs text-slate-400 mt-1 font-medium">
              Zero-watermark native step-by-step solutions mapped to curriculum exercises.
            </p>
          </div>
        </div>

        {/* Word Meanings / Vocabulary Cards */}
        {chapterSol.wordMeanings && chapterSol.wordMeanings.length > 0 && (
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white">
              <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-sm font-black uppercase tracking-wider">
                Vocabulary & Literary Word Bank ({chapterSol.wordMeanings.length})
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {chapterSol.wordMeanings.map((wm, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-4 space-y-2 hover:border-indigo-200 dark:hover:border-indigo-800 transition-all"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-extrabold text-sm text-indigo-700 dark:text-indigo-300">
                      {wm.word}
                    </span>
                    <span className="font-hindi font-bold text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                      {wm.meaningHi}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-300 leading-relaxed">
                    {wm.meaningEn}
                  </p>
                  {wm.example && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 italic pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
                      "{wm.example}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* In-Text Checkpoints */}
        {chapterSol.inTextCheckpoints && chapterSol.inTextCheckpoints.length > 0 && (
          <div className="rounded-3xl border border-amber-200/80 dark:border-amber-900/40 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-amber-900 dark:text-amber-300">
              <Lightbulb className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <h3 className="text-sm font-black uppercase tracking-wider">
                In-Text Checkpoints & Comprehension Checks
              </h3>
            </div>
            <div className="space-y-4">
              {chapterSol.inTextCheckpoints.map((cp, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-amber-100 dark:border-amber-950 bg-amber-50/40 dark:bg-amber-950/20 p-5 space-y-3"
                >
                  <div className="flex items-start gap-3">
                    <span className="rounded-xl bg-amber-200/80 dark:bg-amber-900/60 px-2.5 py-1 text-xs font-black text-amber-900 dark:text-amber-200 shrink-0">
                      Q{cp.questionNumber || idx + 1}
                    </span>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-relaxed">
                      <MathRenderer text={cp.question} />
                    </h4>
                  </div>
                  <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/60 dark:bg-emerald-950/30 p-4 space-y-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Verified Solution Statement
                    </span>
                    <p className="text-xs font-medium text-slate-800 dark:text-slate-200 leading-relaxed">
                      <MathRenderer text={cp.answer} />
                    </p>
                  </div>
                  {cp.explanation && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 bg-white/60 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                      <strong>Pedagogical Logic:</strong> <MathRenderer text={cp.explanation} />
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Exercises Breakdown */}
        {chapterSol.exercises && chapterSol.exercises.map((ex, exIdx) => (
          <div key={exIdx} className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  {ex.exerciseNumber ? `${ex.exerciseNumber}: ` : `Exercise ${exIdx + 1}: `}{ex.exerciseTitle}
                </h3>
              </div>
              <span className="text-xs font-bold text-slate-400">
                {ex.items.length} Question{ex.items.length > 1 ? 's' : ''}
              </span>
            </div>

            <div className="space-y-6">
              {ex.items.map((item, qIdx) => (
                <SingleQuestionSolutionCard
                  key={qIdx}
                  questionNumber={item.qNumber || `${qIdx + 1}`}
                  questionText={item.question}
                  answer={item.answer}
                  stepByStepExplanation={item.stepByStepExplanation}
                  onCopy={handleCopy}
                  copiedKey={copiedKey}
                />
              ))}
            </div>
          </div>
        ))}

        {/* Competency-Based Questions (CBQs / HOTS) */}
        {chapterSol.competencyBasedQuestions && chapterSol.competencyBasedQuestions.length > 0 && (
          <div className="rounded-3xl border border-purple-200 dark:border-purple-900/50 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-purple-900 dark:text-purple-300">
              <Target className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <h3 className="text-sm font-black uppercase tracking-wider">
                Competency-Based Questions (CBQs) & Higher Order Thinking (HOTS)
              </h3>
            </div>
            <div className="space-y-4">
              {chapterSol.competencyBasedQuestions.map((cbq, idx) => (
                <div key={idx} className="rounded-2xl border border-purple-100 dark:border-purple-950 bg-purple-50/30 dark:bg-purple-950/20 p-5 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-xl bg-purple-200/80 dark:bg-purple-900/60 px-2.5 py-0.5 text-xs font-black text-purple-900 dark:text-purple-200">
                      CBQ {idx + 1}
                    </span>
                    <span className="rounded-full bg-purple-100 dark:bg-purple-950 border border-purple-300 dark:border-purple-800 px-3 py-0.5 text-[10px] font-bold text-purple-700 dark:text-purple-300">
                      {cbq.type || 'CONCEPTUAL ANALYSIS'}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-relaxed">
                    <MathRenderer text={cbq.question} />
                  </h4>
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 p-4 space-y-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      Standard Evaluation Response
                    </span>
                    <p className="text-xs font-medium text-slate-800 dark:text-slate-200 leading-relaxed">
                      <MathRenderer text={cbq.answer} />
                    </p>
                  </div>
                  {cbq.explanation && (
                    <div className="text-xs text-purple-800 dark:text-purple-300 bg-purple-50/60 dark:bg-purple-950/40 p-3 rounded-xl border border-purple-200/60 dark:border-purple-800/40">
                      <strong>Evaluation Rubric:</strong> <MathRenderer text={cbq.explanation} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Single Question or Native Solution Card View
  return (
    <div
      id={normalized.id ? `solution-card-${normalized.id}` : undefined}
      className={`rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden transition-all ${
        variant === 'modal' ? 'max-w-4xl w-full p-6 space-y-6 max-h-[90vh] overflow-y-auto' : 'p-6 space-y-6'
      }`}
    >
      {/* Card Header & Metadata Ribbon */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-2 flex-wrap">
          {normalized.questionId && (
            <span className="rounded-2xl bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200/80 dark:border-indigo-800 px-3 py-1 text-xs font-black font-mono text-indigo-700 dark:text-indigo-300">
              {normalized.questionId}
            </span>
          )}
          {normalized.classLevel && (
            <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-xs font-extrabold text-slate-700 dark:text-slate-300">
              {normalized.classLevel}
            </span>
          )}
          {normalized.subject && (
            <span className="rounded-full bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200/80 dark:border-emerald-800 px-2.5 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
              {normalized.subject}
            </span>
          )}
          {normalized.difficulty && (
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-extrabold ${
                normalized.difficulty === 'Easy'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  : normalized.difficulty === 'Medium'
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
              }`}
            >
              {normalized.difficulty}
            </span>
          )}
        </div>

        {showActions && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleCopy(normalized.finalAnswer, 'answer-text')}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950/50 transition-all cursor-pointer"
              title="Copy Solution Text"
            >
              {copiedKey === 'answer-text' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={handlePrint}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer"
              title="Print Clean Solution Block"
            >
              <Printer className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer"
              title={isExpanded ? 'Collapse Solution' : 'Expand Solution'}
            >
              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 hover:text-rose-600 transition-all cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
        )}
      </div>

      {/* Main Question Statement Block */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-black uppercase text-slate-400 tracking-wider">
          <span className="flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-indigo-500" />
            Question Statement
          </span>
          {normalized.marks && (
            <span className="rounded-md bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 px-2 py-0.5 text-amber-800 dark:text-amber-300 font-extrabold text-[11px]">
              {normalized.marks} Mark{normalized.marks > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="text-base font-bold text-slate-900 dark:text-white leading-relaxed p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
          <MathRenderer text={normalized.questionText} />
        </div>
      </div>

      {/* MCQ Options Block (if applicable) */}
      {normalized.options && Object.keys(normalized.options).length > 0 && (
        <div className="space-y-2 pt-1">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Select Options:</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {Object.entries(normalized.options).map(([key, val]) => {
              const isCorrect = normalized.correctOption === key;
              return (
                <div
                  key={key}
                  className={`flex items-start gap-3 p-3.5 rounded-2xl border transition-all ${
                    isCorrect
                      ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100 font-bold ring-1 ring-emerald-500/30'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span
                    className={`w-6 h-6 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
                      isCorrect
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono'
                    }`}
                  >
                    {key}
                  </span>
                  <div className="text-xs font-medium pt-0.5 leading-snug">
                    <MathRenderer text={val} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Expanded Solution & Step Breakdown */}
      {isExpanded && (
        <div className="space-y-5 pt-2">
          {/* Sub-Tab Navigation for Deep Drilldown */}
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
            <button
              onClick={() => setActiveTab('solution')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'solution'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Step-by-Step Breakdown ({normalized.steps?.length || 1})
            </button>
            {normalized.pedagogicalTip && (
              <button
                onClick={() => setActiveTab('rubric')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'rubric'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Evaluation Rubric & Tips
              </button>
            )}
          </div>

          {activeTab === 'solution' && (
            <div className="space-y-4">
              {/* Step Sequence Cards */}
              {normalized.steps && normalized.steps.length > 0 ? (
                normalized.steps.map((step, idx) => (
                  <div
                    key={idx}
                    className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-850 p-4 space-y-2.5 shadow-sm hover:border-indigo-200 dark:hover:border-indigo-900/60 transition-all"
                  >
                    <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-mono font-black text-xs flex items-center justify-center">
                          {step.stepNumber || idx + 1}
                        </span>
                        <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          {step.title || `Step ${idx + 1}`}
                        </h5>
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase font-mono">
                        Procedural Step
                      </span>
                    </div>

                    <div className="text-xs font-medium text-slate-700 dark:text-slate-300 leading-relaxed">
                      <MathRenderer text={step.body} />
                    </div>

                    {step.formula && (
                      <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-2.5 border border-slate-200/60 dark:border-slate-700/60 text-xs font-mono text-indigo-600 dark:text-indigo-400">
                        <strong>Formula Applied:</strong> <MathRenderer text={step.formula} />
                      </div>
                    )}
                  </div>
                ))
              ) : null}

              {/* Final Verified Answer Banner */}
              <div className="rounded-2xl border border-emerald-300 dark:border-emerald-800/80 bg-gradient-to-r from-emerald-50 via-teal-50/50 to-white dark:from-emerald-950/40 dark:via-slate-900 dark:to-slate-900 p-5 space-y-2 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Final Standard Conclusion & Answer
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-200/60 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200">
                    Verified
                  </span>
                </div>
                <div className="text-sm font-extrabold text-slate-900 dark:text-white leading-relaxed">
                  <MathRenderer text={normalized.finalAnswer} />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'rubric' && normalized.pedagogicalTip && (
            <div className="rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/40 dark:bg-amber-950/20 p-5 space-y-3">
              <div className="flex items-center gap-2 text-amber-900 dark:text-amber-300">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <h4 className="text-xs font-black uppercase tracking-wider">Teacher Guidance & Marking Scheme</h4>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed italic">
                "{normalized.pedagogicalTip}"
              </p>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="rounded-xl bg-white/80 dark:bg-slate-800/80 p-3 border border-amber-200/50 dark:border-amber-900/50">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Core Criterion</span>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">Conceptual Accuracy</p>
                </div>
                <div className="rounded-xl bg-white/80 dark:bg-slate-800/80 p-3 border border-amber-200/50 dark:border-amber-900/50">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Evaluation Standard</span>
                  <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">Step-by-step NCERT Marking</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Sub-component for individual exercise items in a full chapter solution
 */
const SingleQuestionSolutionCard: React.FC<{
  questionNumber: string;
  questionText: string;
  answer: string;
  stepByStepExplanation?: string;
  onCopy: (text: string, key: string) => void;
  copiedKey: string | null;
}> = ({ questionNumber, questionText, answer, stepByStepExplanation, onCopy, copiedKey }) => {
  const [isOpen, setIsOpen] = useState(false);
  const steps = useMemo(() => parseStepsFromText(stepByStepExplanation || answer), [stepByStepExplanation, answer]);

  return (
    <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850 p-4 space-y-3 hover:border-slate-300 dark:hover:border-slate-700 transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <span className="rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-2.5 py-1 text-xs font-black font-mono shrink-0">
            Q{questionNumber}
          </span>
          <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-relaxed">
            <MathRenderer text={questionText} />
          </h4>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onCopy(answer, `q-${questionNumber}`)}
            className="p-1.5 rounded-lg bg-white dark:bg-slate-800 text-slate-400 hover:text-indigo-600 transition-all cursor-pointer"
            title="Copy Answer"
          >
            {copiedKey === `q-${questionNumber}` ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-1.5 rounded-lg bg-white dark:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-all cursor-pointer"
            title={isOpen ? 'Hide Steps' : 'Show Detailed Steps'}
          >
            {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Answer Block */}
      <div className="rounded-xl border border-emerald-200/80 dark:border-emerald-900/60 bg-white dark:bg-slate-900 p-3.5 space-y-1">
        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Standard Solution
        </span>
        <div className="text-xs font-medium text-slate-800 dark:text-slate-200 leading-relaxed">
          <MathRenderer text={answer} />
        </div>
      </div>

      {/* Step Breakdown Drawer */}
      {isOpen && steps.length > 0 && (
        <div className="space-y-2 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            Step-by-Step Logic Breakdown:
          </span>
          <div className="space-y-2">
            {steps.map((st, sIdx) => (
              <div key={sIdx} className="rounded-xl bg-white dark:bg-slate-900 p-3 border border-slate-100 dark:border-slate-800 text-xs space-y-1">
                <span className="font-bold text-indigo-600 dark:text-indigo-400 block text-[11px]">
                  {st.title}
                </span>
                <p className="text-slate-700 dark:text-slate-300 font-medium">
                  <MathRenderer text={st.body} />
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
