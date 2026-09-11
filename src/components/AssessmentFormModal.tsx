import React, { useState } from 'react';
import { X, Save, Plus, Trash2, Edit3, HelpCircle, CheckCircle } from 'lucide-react';
import { Assessment, AssessmentQuestion, DifficultyLevel } from '../types';
import { sanitizeQuestionObject, sanitizeAssessmentObject } from '../lib/scientificIntegrityService';

interface AssessmentFormModalProps {
  initialAssessment?: Assessment;
  onClose: () => void;
  onSave: (assessment: Assessment) => void;
}

export const AssessmentFormModal: React.FC<AssessmentFormModalProps> = ({
  initialAssessment,
  onClose,
  onSave,
}) => {
  const [title, setTitle] = useState(initialAssessment?.title || '');
  const [slug, setSlug] = useState(initialAssessment?.slug || '');
  const [subject, setSubject] = useState(initialAssessment?.subject || '');
  const [classLevel, setClassLevel] = useState(initialAssessment?.classLevel || '');
  const [board, setBoard] = useState(initialAssessment?.board || '');
  const [description, setDescription] = useState(initialAssessment?.description || '');
  const [duration, setDuration] = useState(initialAssessment?.duration || 30);
  const [passScore, setPassScore] = useState(initialAssessment?.passScore || 60);
  const [active, setActive] = useState(initialAssessment?.active ?? true);
  const [questions, setQuestions] = useState<AssessmentQuestion[]>(initialAssessment?.questions || []);

  const [editingQuestion, setEditingQuestion] = useState<AssessmentQuestion | null>(null);

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!initialAssessment) {
      const generatedSlug = val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      setSlug(generatedSlug);
    }
  };

  const handleAddQuestionPrompt = () => {
    const newQ: AssessmentQuestion = {
      id: `Q${questions.length + 1}`,
      question: '',
      options: { A: '', B: '', C: '', D: '' },
      correctAnswer: 'A',
      explanation: '',
      subject: subject || 'General',
      topic: 'General',
      difficulty: 'Medium',
      marks: 1,
      qualityScore: 95,
    };
    setEditingQuestion(newQ);
  };

  const handleSaveQuestion = (q: AssessmentQuestion) => {
    const cleanQ = sanitizeQuestionObject(q);
    const existingIndex = questions.findIndex(item => item.id === cleanQ.id);
    if (existingIndex >= 0) {
      setQuestions(prev => prev.map((item, i) => (i === existingIndex ? cleanQ : item)));
    } else {
      setQuestions(prev => [...prev, cleanQ]);
    }
    setEditingQuestion(null);
  };

  const handleDeleteQuestion = (id: string) => {
    setQuestions(prev => prev.filter(q => q.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Title is required');
      return;
    }
    const cleanSlug = (slug || title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const asm: Assessment = {
      id: initialAssessment?.id || `ASM-${Date.now().toString(36).toUpperCase()}`,
      title,
      slug: cleanSlug,
      subject,
      classLevel,
      board,
      description,
      duration: Number(duration) || 30,
      passScore: Number(passScore) || 60,
      active,
      questions,
      totalQuestions: questions.length,
      totalMarks: questions.reduce((sum, q) => sum + (q.marks || 1), 0),
      createdDate: initialAssessment?.createdDate || new Date().toISOString(),
      updatedDate: new Date().toISOString(),
      qualityScore: initialAssessment?.qualityScore || 95,
    };

    onSave(sanitizeAssessmentObject(asm));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div className="relative w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-2xl dark:border-slate-800/80 dark:bg-slate-900/95 backdrop-blur-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100/80 pb-4 dark:border-slate-800/80">
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white">
              {initialAssessment ? 'Edit Assessment Metadata & Questions' : 'Create New Skill Assessment'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Configure parameters, pass mark criteria, and manage MCQ items.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-2xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={e => handleTitleChange(e.target.value)}
                placeholder="CBSE Mathematics Mastery — Class 10"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-xs font-bold text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-800 dark:bg-slate-800/50 dark:text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Slug (URL-safe) *
              </label>
              <input
                type="text"
                required
                value={slug}
                onChange={e => setSlug(e.target.value)}
                placeholder="cbse-maths-class-10"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-xs font-bold text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-800 dark:bg-slate-800/50 dark:text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Subject
              </label>
              <input
                type="text"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="Mathematics"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-xs font-bold text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-800 dark:bg-slate-800/50 dark:text-white"
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Description
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Skill assessment details for teachers..."
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-800 dark:bg-slate-800/50 dark:text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Duration (minutes) *
              </label>
              <input
                type="number"
                min={1}
                required
                value={duration}
                onChange={e => setDuration(Number(e.target.value))}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-xs font-bold text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-800 dark:bg-slate-800/50 dark:text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Pass Score (% — 1 to 100) *
              </label>
              <input
                type="number"
                min={1}
                max={100}
                required
                value={passScore}
                onChange={e => setPassScore(Number(e.target.value))}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-xs font-bold text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-800 dark:bg-slate-800/50 dark:text-white"
              />
            </div>

            <div className="flex items-center gap-3 pt-2 sm:col-span-2">
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={e => setActive(e.target.checked)}
                  className="peer sr-only"
                />
                <div className="peer h-6 w-11 rounded-full bg-slate-200 after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-emerald-600 peer-checked:after:translate-x-full dark:bg-slate-800"></div>
              </label>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Active (Visible to teachers for assessment)
              </span>
            </div>
          </div>

          {/* Questions List */}
          <div className="space-y-3 pt-4 border-t border-slate-100/80 dark:border-slate-800/80">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                Assessment Questions ({questions.length})
              </h3>
              <button
                type="button"
                onClick={handleAddQuestionPrompt}
                className="flex items-center gap-1 rounded-2xl bg-indigo-50 border border-indigo-200/80 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/80 dark:border-indigo-800/80 dark:text-indigo-300 dark:hover:bg-indigo-900/80 transition-all"
              >
                <Plus className="h-3.5 w-3.5" /> Add Question
              </button>
            </div>

            {questions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center dark:border-slate-800">
                <p className="text-xs text-slate-400">No questions added to this assessment yet.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {questions.map((q, idx) => (
                  <div
                    key={q.id || idx}
                    className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-slate-50/50 p-3 dark:border-slate-800/80 dark:bg-slate-800/40"
                  >
                    <div className="flex items-center gap-3">
                      <span className="rounded-xl bg-indigo-100 px-2.5 py-1 text-[11px] font-black text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                        Q{idx + 1}
                      </span>
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                          {q.question || 'Untitled Question'}
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                          Topic: {q.topic} | Diff: {q.difficulty} | Correct: Option {q.correctAnswer}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setEditingQuestion(q)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteQuestion(q.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Single Question Sub-Editor Modal */}
          {editingQuestion && (
            <div className="rounded-3xl border border-indigo-200/80 bg-indigo-50/60 p-4 dark:border-indigo-950/80 dark:bg-indigo-950/40 space-y-3">
              <h4 className="text-xs font-black text-indigo-900 dark:text-indigo-200">
                Edit Question Details
              </h4>
              <input
                type="text"
                placeholder="Question text..."
                value={editingQuestion.question}
                onChange={e => setEditingQuestion({ ...editingQuestion, question: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              />

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Option A"
                  value={editingQuestion.options.A}
                  onChange={e =>
                    setEditingQuestion({
                      ...editingQuestion,
                      options: { ...editingQuestion.options, A: e.target.value },
                    })
                  }
                  className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                />
                <input
                  type="text"
                  placeholder="Option B"
                  value={editingQuestion.options.B}
                  onChange={e =>
                    setEditingQuestion({
                      ...editingQuestion,
                      options: { ...editingQuestion.options, B: e.target.value },
                    })
                  }
                  className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                />
                <input
                  type="text"
                  placeholder="Option C"
                  value={editingQuestion.options.C}
                  onChange={e =>
                    setEditingQuestion({
                      ...editingQuestion,
                      options: { ...editingQuestion.options, C: e.target.value },
                    })
                  }
                  className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                />
                <input
                  type="text"
                  placeholder="Option D"
                  value={editingQuestion.options.D}
                  onChange={e =>
                    setEditingQuestion({
                      ...editingQuestion,
                      options: { ...editingQuestion.options, D: e.target.value },
                    })
                  }
                  className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <span className="text-[10px] font-bold text-slate-500">Correct Option</span>
                  <select
                    value={editingQuestion.correctAnswer}
                    onChange={e =>
                      setEditingQuestion({
                        ...editingQuestion,
                        correctAnswer: e.target.value as 'A' | 'B' | 'C' | 'D',
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  >
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                    <option value="D">D</option>
                  </select>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-500">Topic</span>
                  <input
                    type="text"
                    value={editingQuestion.topic}
                    onChange={e => setEditingQuestion({ ...editingQuestion, topic: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-2 py-1 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-500">Difficulty</span>
                  <select
                    value={editingQuestion.difficulty}
                    onChange={e =>
                      setEditingQuestion({
                        ...editingQuestion,
                        difficulty: e.target.value as DifficultyLevel,
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-2 py-1 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>
              </div>

              <input
                type="text"
                placeholder="Explanation..."
                value={editingQuestion.explanation}
                onChange={e => setEditingQuestion({ ...editingQuestion, explanation: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              />

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setEditingQuestion(null)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-700 dark:bg-slate-900 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveQuestion(editingQuestion)}
                  className="rounded-xl bg-indigo-600 px-3 py-1 text-xs font-bold text-white hover:bg-indigo-500"
                >
                  Done
                </button>
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100/80 dark:border-slate-800/80">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-slate-200/80 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 rounded-2xl bg-indigo-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 transition-all"
            >
              <Save className="h-4 w-4" /> {initialAssessment ? 'Save Assessment' : 'Create Assessment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
