import React, { useState } from 'react';
import { X, Edit3, Trash2, Copy, Check, Save, Clock, Award, Tag, Sparkles } from 'lucide-react';
import { Question } from '../types';
import { DEFAULT_CATEGORIES, DEFAULT_SUBJECTS, DEFAULT_QUESTION_TYPES } from '../lib/constants';
import { MathRenderer } from './academic/MathRenderer';
import { sanitizeQuestionObject } from '../lib/scientificIntegrityService';

interface QuestionModalProps {
  question: Question | null;
  onClose: () => void;
  onSave: (updated: Question) => void;
  onDelete: (id: string) => void;
  onDuplicate: (q: Question) => void;
}

export const QuestionModal: React.FC<QuestionModalProps> = ({
  question,
  onClose,
  onSave,
  onDelete,
  onDuplicate,
}) => {
  if (!question) return null;

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Question>({ ...question });
  const [tagInput, setTagInput] = useState('');

  const handleSave = () => {
    const clean = sanitizeQuestionObject({ ...formData, updatedDate: new Date().toISOString() });
    onSave(clean);
    setIsEditing(false);
  };

  const handleAddTag = () => {
    if (tagInput.trim()) {
      setFormData(prev => ({ ...prev, tags: [...prev.tags, tagInput.trim()] }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (idx: number) => {
    setFormData(prev => ({ ...prev, tags: prev.tags.filter((_, i) => i !== idx) }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-2xl dark:border-slate-800/80 dark:bg-slate-900/95 backdrop-blur-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100/80 pb-4 dark:border-slate-800/80">
          <div className="flex items-center gap-3">
            <span
              className="rounded-2xl bg-indigo-50/80 px-3 py-1 text-xs font-black text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300"
            >
              {question.id}
            </span>
            <span className={`rounded-full px-3 py-0.5 text-xs font-bold ${
              question.difficulty === 'Easy' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-400' :
              question.difficulty === 'Medium' ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/80 dark:text-amber-400' :
              'bg-rose-50 text-rose-700 dark:bg-rose-950/80 dark:text-rose-400'
            }`}>
              {question.difficulty}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1.5 rounded-2xl border border-slate-200/80 px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-800/80 dark:text-slate-300 dark:hover:bg-slate-800/80 transition-all"
              >
                <Edit3 className="h-3.5 w-3.5" /> Edit
              </button>
            ) : (
              <button
                onClick={handleSave}
                className="flex items-center gap-1.5 rounded-2xl bg-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-indigo-500 shadow-md shadow-indigo-600/30 transition-all"
              >
                <Save className="h-3.5 w-3.5" /> Save Changes
              </button>
            )}

            <button
              onClick={() => onDuplicate(question)}
              className="p-2 rounded-2xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800/80 transition-all"
              title="Duplicate Question"
            >
              <Copy className="h-4 w-4" />
            </button>

            <button
              onClick={() => onDelete(question.id)}
              className="p-2 rounded-2xl text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/50 transition-all"
              title="Delete Question"
            >
              <Trash2 className="h-4 w-4" />
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-2xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-all"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        {!isEditing ? (
          <div className="space-y-5">
            {/* Question Text */}
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Question Statement</span>
              <div className="text-base font-semibold text-slate-900 leading-relaxed dark:text-white">
                <MathRenderer text={question.question} />
              </div>
            </div>

            {/* Badges Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Category</span>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">{question.category}</p>
              </div>

              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Subject</span>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">{question.subject}</p>
              </div>

              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Question Type</span>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">{question.questionType}</p>
              </div>

              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Quality Score</span>
                <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{question.qualityScore}/100</p>
              </div>
            </div>

            {/* Time & Score */}
            <div className="flex items-center gap-6 text-xs text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-indigo-500" />
                <span>Time Limit: <strong>{question.timeLimit} seconds</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <Award className="h-4 w-4 text-amber-500" />
                <span>Max Score: <strong>{question.maxScore} pts</strong></span>
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tags</span>
              <div className="flex flex-wrap gap-1.5">
                {question.tags.map((tag, idx) => (
                  <span key={idx} className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Evaluation Hint */}
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4 dark:border-indigo-950 dark:bg-indigo-950/20 space-y-1">
              <span className="text-xs font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                Evaluation Hint / Response Rubric
              </span>
              <div className="text-xs text-slate-700 leading-relaxed dark:text-slate-300 italic">
                <MathRenderer text={question.hint} />
              </div>
            </div>
          </div>
        ) : (
          /* Edit Form */
          <div className="space-y-4 text-xs">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300">Question Statement:</label>
              <textarea
                value={formData.question}
                onChange={(e) => setFormData(prev => ({ ...prev, question: e.target.value }))}
                rows={3}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-medium dark:border-slate-800 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Category:</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2 font-bold dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                >
                  {DEFAULT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Difficulty:</label>
                <select
                  value={formData.difficulty}
                  onChange={(e) => setFormData(prev => ({ ...prev, difficulty: e.target.value as any }))}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2 font-bold dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                >
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Subject:</label>
                <select
                  value={formData.subject}
                  onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2 font-bold dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                >
                  {DEFAULT_SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Time Limit (sec):</label>
                <input
                  type="number"
                  value={formData.timeLimit}
                  onChange={(e) => setFormData(prev => ({ ...prev, timeLimit: parseInt(e.target.value) || 120 }))}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2 font-bold dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300">Evaluation Hint:</label>
              <textarea
                value={formData.hint}
                onChange={(e) => setFormData(prev => ({ ...prev, hint: e.target.value }))}
                rows={2}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2 font-medium dark:border-slate-800 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
