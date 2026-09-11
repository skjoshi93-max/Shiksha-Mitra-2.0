import React, { useState } from 'react';
import {
  ArrowLeft,
  Award,
  Sparkles,
  Clock,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  FileCode,
  Download,
  Edit3,
  Trash2,
  Plus,
  RefreshCw,
  Layers,
  BookOpen,
  Eye,
  Zap,
  Calendar,
  Video,
  Presentation,
  PlayCircle,
} from 'lucide-react';
import { Assessment, AssessmentQuestion, DifficultyLevel } from '../types';
import { exportAssessmentQuestionsToCSV } from '../lib/unifiedQuestionExport';
import { MathRenderer } from './academic/MathRenderer';
import { CoursePlayerWorkspace } from './certification/CoursePlayerWorkspace';
import { QuestionTypeBadge } from './QuestionTypeBadge';

const formatDateDisplay = (dateString: string) => {
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
};

interface AssessmentDetailViewProps {
  assessment: Assessment;
  onBack: () => void;
  onUpdateAssessment: (updated: Assessment) => void;
  onOpenTeacherTest: (asm: Assessment) => void;
  onOpenEditForm: (asm: Assessment) => void;
}

export const AssessmentDetailView: React.FC<AssessmentDetailViewProps> = ({
  assessment,
  onBack,
  onUpdateAssessment,
  onOpenTeacherTest,
  onOpenEditForm,
}) => {
  const [showCoursePlayer, setShowCoursePlayer] = useState<boolean>(false);
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [editingQuestion, setEditingQuestion] = useState<AssessmentQuestion | null>(null);
  const [isRegenerating, setIsRegenerating] = useState<boolean>(false);
  const [exportDropdownOpen, setExportDropdownOpen] = useState<boolean>(false);

  if (showCoursePlayer) {
    return (
      <CoursePlayerWorkspace
        assessment={assessment}
        onBack={() => setShowCoursePlayer(false)}
        onUpdateAssessment={onUpdateAssessment}
      />
    );
  }

  const handleToggleSelectAll = () => {
    if (selectedQuestions.length === assessment.questions.length) {
      setSelectedQuestions([]);
    } else {
      setSelectedQuestions(assessment.questions.map(q => q.id));
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedQuestions(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Single Question AI Regeneration
  const handleRegenerateQuestion = async (q: AssessmentQuestion) => {
    setIsRegenerating(true);
    try {
      const response = await fetch('/api/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          count: 1,
          category: q.topic,
          difficulty: q.difficulty,
          subject: assessment.subject,
          questionType: 'Multiple Choice',
          language: 'English',
        }),
      });

      const text = await response.text();
      let data: any = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch (_) {}

      if (data && data.questions && data.questions[0]) {
        const generated = data.questions[0];
        const updatedQ: AssessmentQuestion = {
          ...q,
          question: generated.question || q.question,
          options: {
            A: generated.options?.A || q.options.A,
            B: generated.options?.B || q.options.B,
            C: generated.options?.C || q.options.C,
            D: generated.options?.D || q.options.D,
          },
          correctAnswer: generated.correctAnswer || q.correctAnswer,
          explanation: generated.explanation || q.explanation,
          qualityScore: 96,
        };

        const updatedAsm = {
          ...assessment,
          questions: assessment.questions.map(item => (item.id === q.id ? updatedQ : item)),
          updatedDate: new Date().toISOString(),
        };
        onUpdateAssessment(updatedAsm);
      }
    } catch (err) {
      console.error('Failed to regenerate question:', err);
    } finally {
      setIsRegenerating(false);
    }
  };

  // Bulk Regeneration Handler
  const handleBulkRegenerate = async (targetIds?: string[]) => {
    setIsRegenerating(true);
    const idsToRegen = targetIds || (selectedQuestions.length > 0 ? selectedQuestions : assessment.questions.map(q => q.id));

    try {
      const updatedQuestions = [...assessment.questions];

      for (let i = 0; i < updatedQuestions.length; i++) {
        if (idsToRegen.includes(updatedQuestions[i].id)) {
          const q = updatedQuestions[i];
          const response = await fetch('/api/generate-questions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              count: 1,
              category: q.topic,
              difficulty: q.difficulty,
              subject: assessment.subject,
              questionType: 'Multiple Choice',
              language: 'English',
            }),
          });
          const text = await response.text();
          let data: any = null;
          try {
            data = text ? JSON.parse(text) : null;
          } catch (_) {}

          if (data && data.questions && data.questions[0]) {
            const gen = data.questions[0];
            updatedQuestions[i] = {
              ...q,
              question: gen.question || q.question,
              options: {
                A: gen.options?.A || q.options.A,
                B: gen.options?.B || q.options.B,
                C: gen.options?.C || q.options.C,
                D: gen.options?.D || q.options.D,
              },
              correctAnswer: gen.correctAnswer || q.correctAnswer,
              explanation: gen.explanation || q.explanation,
              qualityScore: 96,
            };
          }
        }
      }

      onUpdateAssessment({
        ...assessment,
        questions: updatedQuestions,
        updatedDate: new Date().toISOString(),
      });
      setSelectedQuestions([]);
    } catch (err) {
      console.error('Bulk regeneration failed:', err);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleDeleteQuestion = (id: string) => {
    if (window.confirm('Are you sure you want to delete this question?')) {
      const updatedQuestions = assessment.questions.filter(q => q.id !== id);
      onUpdateAssessment({
        ...assessment,
        questions: updatedQuestions,
        totalQuestions: updatedQuestions.length,
        totalMarks: updatedQuestions.reduce((sum, item) => sum + (item.marks || 1), 0),
        updatedDate: new Date().toISOString(),
      });
    }
  };

  const handleSaveQuestionEdit = (q: AssessmentQuestion) => {
    const updatedQuestions = assessment.questions.map(item => (item.id === q.id ? q : item));
    onUpdateAssessment({
      ...assessment,
      questions: updatedQuestions,
      updatedDate: new Date().toISOString(),
    });
    setEditingQuestion(null);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-all"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Assessments List
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCoursePlayer(true)}
            className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-rose-600 via-indigo-600 to-sky-600 px-4 py-2 text-xs font-black text-white hover:from-rose-500 hover:to-sky-500 shadow-md shadow-indigo-600/30 transition-all cursor-pointer"
            title="Launch Interactive Video Course Player & PPT Presentation Workspace"
          >
            <PlayCircle className="h-4 w-4" /> Course Player Workspace (Video & PPT)
          </button>
          <button
            onClick={() => onOpenTeacherTest(assessment)}
            className="flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500 shadow-md shadow-emerald-600/30 transition-all"
          >
            <Award className="h-4 w-4" /> Take Teacher Certification Test
          </button>
          <button
            onClick={() => onOpenEditForm(assessment)}
            className="flex items-center gap-1.5 rounded-2xl border border-slate-200/80 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 transition-all"
          >
            <Edit3 className="h-4 w-4" /> Edit Metadata
          </button>
        </div>
      </div>

      {/* Assessment Hero Card Bento */}
      <div className="rounded-3xl border border-slate-200/80 bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 p-6 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="rounded-2xl bg-indigo-500/20 px-3 py-1 text-xs font-black text-indigo-300 border border-indigo-500/30">
                {assessment.subject}
              </span>
              <span className="rounded-2xl bg-emerald-500/20 px-3 py-1 text-xs font-black text-emerald-300 border border-emerald-500/30">
                {assessment.active ? 'Active' : 'Inactive'}
              </span>
              {assessment.classLevel && (
                <span className="rounded-2xl bg-slate-800 px-3 py-1 text-xs font-bold text-slate-300">
                  {assessment.classLevel} {assessment.board ? `(${assessment.board})` : ''}
                </span>
              )}
              {(assessment.createdDate || assessment.updatedDate) && (
                <span className="rounded-2xl bg-purple-500/20 px-3 py-1 text-xs font-bold text-purple-200 border border-purple-500/30 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-purple-300" />
                  <span>Gen Date: {formatDateDisplay(assessment.createdDate || assessment.updatedDate || '')}</span>
                </span>
              )}
            </div>

            <span className="text-xs text-slate-400 font-mono">
              Slug: {assessment.slug}
            </span>
          </div>

          <div>
            <h1 className="text-2xl font-black">{assessment.title}</h1>
            <p className="mt-1 text-xs text-indigo-200/80 max-w-3xl leading-relaxed">
              {assessment.description}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="rounded-2xl bg-white/10 p-3 backdrop-blur-md">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Duration</span>
              <p className="text-sm font-black flex items-center gap-1.5 mt-0.5">
                <Clock className="h-4 w-4 text-indigo-400" /> {assessment.duration} Minutes
              </p>
            </div>
            <div className="rounded-2xl bg-white/10 p-3 backdrop-blur-md">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pass Criteria</span>
              <p className="text-sm font-black flex items-center gap-1.5 mt-0.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" /> {assessment.passScore}% Score
              </p>
            </div>
            <div className="rounded-2xl bg-white/10 p-3 backdrop-blur-md">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Questions</span>
              <p className="text-sm font-black flex items-center gap-1.5 mt-0.5">
                <BookOpen className="h-4 w-4 text-blue-400" /> {assessment.totalQuestions} Questions
              </p>
            </div>
            <div className="rounded-2xl bg-white/10 p-3 backdrop-blur-md">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Marks</span>
              <p className="text-sm font-black flex items-center gap-1.5 mt-0.5">
                <Zap className="h-4 w-4 text-amber-400" /> {assessment.totalMarks} Marks
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-slate-200/80 bg-white/80 p-4 dark:border-slate-800/80 dark:bg-slate-900/80 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={selectedQuestions.length === assessment.questions.length && assessment.questions.length > 0}
              onChange={handleToggleSelectAll}
              className="rounded-lg border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            Select All ({selectedQuestions.length}/{assessment.questions.length})
          </label>

          {selectedQuestions.length > 0 && (
            <button
              onClick={() => handleBulkRegenerate(selectedQuestions)}
              disabled={isRegenerating}
              className="flex items-center gap-1.5 rounded-2xl bg-indigo-50 border border-indigo-200/80 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950 dark:text-indigo-300 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
              Regenerate Selected ({selectedQuestions.length})
            </button>
          )}

          <button
            onClick={() => handleBulkRegenerate()}
            disabled={isRegenerating}
            className="flex items-center gap-1.5 rounded-2xl border border-slate-200/80 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 transition-all disabled:opacity-50"
          >
            <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
            Regenerate All Questions
          </button>
        </div>

        {/* Export Button (XLSX via Unified Exporter) */}
        <button
          onClick={() => exportAssessmentQuestionsToCSV(assessment)}
          className="flex items-center gap-2 rounded-2xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500 shadow-md shadow-indigo-600/25 transition-all"
        >
          <Download className="h-4 w-4" /> Export Assessment (XLSX)
        </button>
      </div>

      {/* Questions Preview List */}
      <div className="space-y-4">
        {assessment.questions.map((q, idx) => {
          const isSelected = selectedQuestions.includes(q.id);
          const isEditing = editingQuestion?.id === q.id;

          return (
            <div
              key={q.id || idx}
              className={`rounded-3xl border transition-all p-5 space-y-3 ${
                isSelected
                  ? 'border-indigo-500/80 bg-indigo-50/40 dark:border-indigo-500/80 dark:bg-indigo-950/20'
                  : 'border-slate-200/80 bg-white/90 dark:border-slate-800/80 dark:bg-slate-900/90'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleToggleSelect(q.id)}
                    className="mt-1 rounded-lg border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1.5">
                    <span className="rounded-xl bg-indigo-100 px-2.5 py-1 text-xs font-black text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                      Q{idx + 1}
                    </span>
                    <QuestionTypeBadge type={q.type || q.questionType || (assessment as any).questionType || 'MCQ'} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      <MathRenderer text={q.question} />
                    </h3>
                    <div className="flex flex-wrap gap-2 mt-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      <span className="rounded-lg bg-slate-100 px-2 py-0.5 dark:bg-slate-800">Topic: {q.topic}</span>
                      <span className={`rounded-lg px-2 py-0.5 font-bold ${
                        q.difficulty === 'Easy' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                        q.difficulty === 'Medium' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                        'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      }`}>
                        Difficulty: {q.difficulty}
                      </span>
                      <span className="rounded-lg bg-slate-100 px-2 py-0.5 dark:bg-slate-800">Marks: {q.marks}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleRegenerateQuestion(q)}
                    disabled={isRegenerating}
                    className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-slate-800 transition-all"
                    title="Regenerate question with AI"
                  >
                    <RefreshCw className={`h-4 w-4 ${isRegenerating ? 'animate-spin' : ''}`} />
                  </button>
                  <button
                    onClick={() => setEditingQuestion(isEditing ? null : q)}
                    className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 transition-all"
                    title="Edit question"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteQuestion(q.id)}
                    className="p-2 rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/50 transition-all"
                    title="Delete question"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Options Grid or Open-Ended Model Answer */}
              {(() => {
                const normType = String(q.type || q.questionType || '').toLowerCase().trim();
                const isSaqOrLaq = normType.includes('short answer') || normType === 'saq' || normType.includes('long answer') || normType === 'laq' || normType.includes('essay');
                const hasValidOptions = q.options && (Boolean(q.options.A) || Boolean(q.options.B) || Boolean(q.options.C) || Boolean(q.options.D));

                if (isSaqOrLaq || !hasValidOptions) {
                  return (
                    <div className="ml-8 rounded-2xl border border-emerald-200/80 bg-emerald-50/50 p-3.5 text-xs dark:border-emerald-900/60 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-200">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-emerald-800 dark:text-emerald-300 uppercase text-[10px] tracking-wider">
                          Model Answer & Evaluation Rubric:
                        </span>
                        <QuestionTypeBadge type={q.type || q.questionType || (isSaqOrLaq ? 'Short Answer Question' : 'Open-Ended')} />
                      </div>
                      <div className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                        <MathRenderer text={q.answer || q.correctAnswer || q.explanation || 'Direct pedagogical reference response & grading criteria.'} />
                      </div>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-medium pl-8">
                    <div className={`p-2.5 rounded-2xl border ${q.correctAnswer === 'A' ? 'border-emerald-500 bg-emerald-50/80 font-bold text-emerald-900 dark:border-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-200' : 'border-slate-200/60 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300'}`}>
                      A. <MathRenderer text={q.options.A} /> {q.correctAnswer === 'A' && '✓ (Correct)'}
                    </div>
                    <div className={`p-2.5 rounded-2xl border ${q.correctAnswer === 'B' ? 'border-emerald-500 bg-emerald-50/80 font-bold text-emerald-900 dark:border-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-200' : 'border-slate-200/60 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300'}`}>
                      B. <MathRenderer text={q.options.B} /> {q.correctAnswer === 'B' && '✓ (Correct)'}
                    </div>
                    <div className={`p-2.5 rounded-2xl border ${q.correctAnswer === 'C' ? 'border-emerald-500 bg-emerald-50/80 font-bold text-emerald-900 dark:border-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-200' : 'border-slate-200/60 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300'}`}>
                      C. <MathRenderer text={q.options.C} /> {q.correctAnswer === 'C' && '✓ (Correct)'}
                    </div>
                    <div className={`p-2.5 rounded-2xl border ${q.correctAnswer === 'D' ? 'border-emerald-500 bg-emerald-50/80 font-bold text-emerald-900 dark:border-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-200' : 'border-slate-200/60 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300'}`}>
                      D. <MathRenderer text={q.options.D} /> {q.correctAnswer === 'D' && '✓ (Correct)'}
                    </div>
                  </div>
                );
              })()}

              {/* Explanation Box */}
              <div className="ml-8 rounded-2xl border border-indigo-100 bg-indigo-50/40 p-3 text-xs text-slate-700 dark:border-indigo-950 dark:bg-indigo-950/20 dark:text-slate-300">
                <span className="font-bold text-indigo-600 dark:text-indigo-400 uppercase text-[10px] tracking-wider block mb-0.5">
                  Explanation & Proof:
                </span>
                <MathRenderer text={q.explanation} />
              </div>

              {/* In-Line Editing Block */}
              {isEditing && (
                <div className="ml-8 rounded-2xl border border-indigo-200 bg-indigo-50/80 p-4 dark:border-indigo-900 dark:bg-indigo-950/60 space-y-3">
                  <h4 className="text-xs font-black text-indigo-900 dark:text-indigo-200">Edit Question Text & Answers</h4>
                  <input
                    type="text"
                    value={editingQuestion.question}
                    onChange={e => setEditingQuestion({ ...editingQuestion, question: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={editingQuestion.options.A}
                      onChange={e => setEditingQuestion({ ...editingQuestion, options: { ...editingQuestion.options, A: e.target.value } })}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                    />
                    <input
                      type="text"
                      value={editingQuestion.options.B}
                      onChange={e => setEditingQuestion({ ...editingQuestion, options: { ...editingQuestion.options, B: e.target.value } })}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                    />
                    <input
                      type="text"
                      value={editingQuestion.options.C}
                      onChange={e => setEditingQuestion({ ...editingQuestion, options: { ...editingQuestion.options, C: e.target.value } })}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                    />
                    <input
                      type="text"
                      value={editingQuestion.options.D}
                      onChange={e => setEditingQuestion({ ...editingQuestion, options: { ...editingQuestion.options, D: e.target.value } })}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                    />
                  </div>
                  <div className="flex gap-2">
                    <select
                      value={editingQuestion.correctAnswer}
                      onChange={e => setEditingQuestion({ ...editingQuestion, correctAnswer: e.target.value as 'A'|'B'|'C'|'D' })}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-1 text-xs font-bold dark:border-slate-800 dark:bg-slate-900"
                    >
                      <option value="A">Correct: A</option>
                      <option value="B">Correct: B</option>
                      <option value="C">Correct: C</option>
                      <option value="D">Correct: D</option>
                    </select>
                  </div>
                  <input
                    type="text"
                    value={editingQuestion.explanation}
                    onChange={e => setEditingQuestion({ ...editingQuestion, explanation: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setEditingQuestion(null)}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-700 dark:bg-slate-900 dark:text-slate-300"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleSaveQuestionEdit(editingQuestion)}
                      className="rounded-xl bg-indigo-600 px-3 py-1 text-xs font-bold text-white hover:bg-indigo-500"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
