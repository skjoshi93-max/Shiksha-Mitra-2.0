import React, { useState, useEffect } from 'react';
import { Award, Clock, CheckCircle2, XCircle, AlertCircle, RefreshCw, X, ShieldCheck, Download, Sparkles } from 'lucide-react';
import { Assessment } from '../types';
import { MathRenderer } from './academic/MathRenderer';

interface TeacherTestRunnerModalProps {
  assessment: Assessment;
  onClose: () => void;
}

export const TeacherTestRunnerModal: React.FC<TeacherTestRunnerModalProps> = ({
  assessment,
  onClose,
}) => {
  // 15 Randomly Selected Questions (3 Foundational, 8 Applied, 4 Advanced) per attempt, persisted in state
  const [testQuestions] = useState<any[]>(() => {
    if (!assessment.questions || assessment.questions.length <= 15) return assessment.questions || [];
    const foundational = assessment.questions.filter(q => {
      const d = String(q.difficulty || '').toLowerCase();
      return d.includes('easy') || d.includes('foundational');
    });
    const applied = assessment.questions.filter(q => {
      const d = String(q.difficulty || '').toLowerCase();
      return d.includes('medium') || d.includes('applied');
    });
    const advanced = assessment.questions.filter(q => {
      const d = String(q.difficulty || '').toLowerCase();
      return d.includes('hard') || d.includes('advanced');
    });

    const shuffle = <T,>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5);

    const selF = shuffle(foundational).slice(0, 3);
    const selA = shuffle(applied).slice(0, 8);
    const selAdv = shuffle(advanced).slice(0, 4);

    const combined = [...selF, ...selA, ...selAdv];
    if (combined.length < 15) {
      const remaining = assessment.questions.filter(q => !combined.includes(q));
      const extra = shuffle(remaining).slice(0, 15 - combined.length);
      combined.push(...extra);
    }
    return shuffle(combined).slice(0, 15);
  });

  const [answers, setAnswers] = useState<Record<string, 'A' | 'B' | 'C' | 'D'>>({});
  const [timeLeft, setTimeLeft] = useState<number>((assessment.duration || 30) * 60); // seconds
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [scoreResult, setScoreResult] = useState<{
    total: number;
    correct: number;
    percent: number;
    passed: boolean;
  } | null>(null);

  // Timer countdown
  useEffect(() => {
    if (isSubmitted) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          handleSubmitTest();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isSubmitted]);

  const handleSelectOption = (questionId: string, option: 'A' | 'B' | 'C' | 'D') => {
    if (isSubmitted) return;
    setAnswers(prev => ({ ...prev, [questionId]: option }));
  };

  const handleSubmitTest = () => {
    let correctCount = 0;
    testQuestions.forEach(q => {
      if (answers[q.id] === q.correctAnswer) {
        correctCount++;
      }
    });

    const percent = Math.round((correctCount / (testQuestions.length || 1)) * 100);
    const passed = correctCount >= 10; // Passing rule: 10/15 correct answers minimum (67%)

    setScoreResult({
      total: testQuestions.length,
      correct: correctCount,
      percent,
      passed,
    });
    setIsSubmitted(true);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-2xl dark:border-slate-800/80 dark:bg-slate-900/95 backdrop-blur-2xl space-y-6">
        {/* Top Floating Bar */}
        <div className="flex items-center justify-between border-b border-slate-100/80 pb-4 dark:border-slate-800/80 sticky top-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                {assessment.title}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Teacher Assessment Mode  |  Pass Criteria: {assessment.passScore}%
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {!isSubmitted && (
              <div className="flex items-center gap-2 rounded-2xl bg-amber-50 border border-amber-200/80 px-3.5 py-1.5 text-xs font-black text-amber-800 dark:bg-amber-950/80 dark:border-amber-800/80 dark:text-amber-300">
                <Clock className="h-4 w-4 animate-pulse text-amber-600" />
                <span>{formatTime(timeLeft)}</span>
              </div>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-2xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Test Result Screen */}
        {isSubmitted && scoreResult ? (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
            {/* Score Banner */}
            <div
              className={`rounded-3xl border p-6 text-center space-y-4 ${
                scoreResult.passed
                  ? 'border-emerald-200/80 bg-gradient-to-br from-emerald-50/90 via-emerald-50/40 to-teal-50/80 dark:border-emerald-900/80 dark:from-emerald-950/40 dark:to-slate-900'
                  : 'border-rose-200/80 bg-gradient-to-br from-rose-50/90 via-rose-50/40 to-amber-50/80 dark:border-rose-900/80 dark:from-rose-950/40 dark:to-slate-900'
              }`}
            >
              <div className="flex justify-center">
                <div
                  className={`flex h-16 w-16 items-center justify-center rounded-3xl text-white shadow-xl ${
                    scoreResult.passed ? 'bg-emerald-600 shadow-emerald-600/30' : 'bg-rose-600 shadow-rose-600/30'
                  }`}
                >
                  {scoreResult.passed ? <ShieldCheck className="h-10 w-10" /> : <XCircle className="h-10 w-10" />}
                </div>
              </div>

              <div>
                <span
                  className={`inline-block rounded-full px-3 py-1 text-xs font-black uppercase tracking-wider ${
                    scoreResult.passed
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/80 dark:text-emerald-200'
                      : 'bg-rose-100 text-rose-800 dark:bg-rose-900/80 dark:text-rose-200'
                  }`}
                >
                  {scoreResult.passed ? 'VERIFIED BADGE EARNED 🎉' : 'ASSESSMENT NOT PASSED'}
                </span>
                <h3 className="mt-2 text-3xl font-black text-slate-900 dark:text-white">
                  {scoreResult.percent}% Score
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                  {scoreResult.correct} out of {scoreResult.total} questions answered correctly (Required Pass Score: {assessment.passScore}%)
                </p>
              </div>

              {/* Verified Teacher Skill Badge Card */}
              {scoreResult.passed && (
                <div className="mt-4 mx-auto max-w-md rounded-3xl border border-indigo-200/80 bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 p-6 text-white text-left shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Award className="h-40 w-40 text-white" />
                  </div>
                  <div className="relative z-10 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 rounded-xl bg-amber-500/20 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-amber-300 border border-amber-500/30">
                        <Sparkles className="h-3 w-3" /> Official ShikshaMitra Badge
                      </span>
                      <span className="text-[10px] text-slate-400">ID: {assessment.id}</span>
                    </div>

                    <div>
                      <h4 className="text-base font-black text-white">{assessment.title}</h4>
                      <p className="text-xs text-indigo-200 font-medium">Verified Teacher Competence</p>
                    </div>

                    <div className="pt-2 border-t border-indigo-800/80 flex items-center justify-between text-xs">
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase font-bold">Score Benchmark</p>
                        <p className="font-bold text-emerald-400">{scoreResult.percent}% Achieved</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-slate-400 uppercase font-bold">Issued Date</p>
                        <p className="font-bold text-white">{new Date().toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Answer Breakdown */}
            <div className="space-y-4">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Detailed Question Solutions
              </h4>
              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {testQuestions.map((q, idx) => {
                  const userAns = answers[q.id];
                  const isCorrect = userAns === q.correctAnswer;
                  return (
                    <div
                      key={q.id}
                      className={`rounded-2xl border p-4 space-y-2 ${
                        isCorrect
                          ? 'border-emerald-200/80 bg-emerald-50/30 dark:border-emerald-950/80 dark:bg-emerald-950/10'
                          : 'border-rose-200/80 bg-rose-50/30 dark:border-rose-950/80 dark:bg-rose-950/10'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`flex h-6 w-6 items-center justify-center rounded-lg text-xs font-black text-white ${
                              isCorrect ? 'bg-emerald-600' : 'bg-rose-600'
                            }`}
                          >
                            Q{idx + 1}
                          </span>
                          <div className="text-xs font-bold text-slate-900 dark:text-white">
                            <MathRenderer text={q.question} />
                          </div>
                        </div>
                        <span className="text-[10px] font-extrabold uppercase tracking-wide">
                          {isCorrect ? 'Correct +1' : 'Incorrect 0'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs font-medium pt-1">
                        <div className={`p-2 rounded-xl border ${userAns === 'A' ? (q.correctAnswer === 'A' ? 'bg-emerald-100 border-emerald-400 font-bold' : 'bg-rose-100 border-rose-400') : 'bg-white/50 border-slate-200/60 dark:bg-slate-800/40 dark:border-slate-800'}`}>
                          A. <MathRenderer text={q.options.A} />
                        </div>
                        <div className={`p-2 rounded-xl border ${userAns === 'B' ? (q.correctAnswer === 'B' ? 'bg-emerald-100 border-emerald-400 font-bold' : 'bg-rose-100 border-rose-400') : 'bg-white/50 border-slate-200/60 dark:bg-slate-800/40 dark:border-slate-800'}`}>
                          B. <MathRenderer text={q.options.B} />
                        </div>
                        <div className={`p-2 rounded-xl border ${userAns === 'C' ? (q.correctAnswer === 'C' ? 'bg-emerald-100 border-emerald-400 font-bold' : 'bg-rose-100 border-rose-400') : 'bg-white/50 border-slate-200/60 dark:bg-slate-800/40 dark:border-slate-800'}`}>
                          C. <MathRenderer text={q.options.C} />
                        </div>
                        <div className={`p-2 rounded-xl border ${userAns === 'D' ? (q.correctAnswer === 'D' ? 'bg-emerald-100 border-emerald-400 font-bold' : 'bg-rose-100 border-rose-400') : 'bg-white/50 border-slate-200/60 dark:bg-slate-800/40 dark:border-slate-800'}`}>
                          D. <MathRenderer text={q.options.D} />
                        </div>
                      </div>

                      <div className="rounded-xl bg-slate-100 p-2.5 text-[11px] text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        <div className="font-bold text-indigo-600 dark:text-indigo-400 flex flex-wrap gap-1 items-center">
                          Correct Answer: Option {q.correctAnswer} (<MathRenderer text={q.options[q.correctAnswer as keyof typeof q.options]} />)
                        </div>
                        <div className="mt-1 italic">
                          <MathRenderer text={q.explanation} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setIsSubmitted(false);
                  setAnswers({});
                  setTimeLeft((assessment.duration || 30) * 60);
                }}
                className="flex items-center gap-1.5 rounded-2xl border border-slate-200/80 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 transition-all"
              >
                <RefreshCw className="h-4 w-4" /> Retake Test
              </button>
              <button
                onClick={onClose}
                className="rounded-2xl bg-indigo-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 transition-all"
              >
                Close Results
              </button>
            </div>
          </div>
        ) : (
          /* Active Test Questions */
          <div className="space-y-6">
            <div className="space-y-4">
              {testQuestions.map((q, idx) => {
                const selectedOpt = answers[q.id];
                return (
                  <div
                    key={q.id}
                    className="rounded-3xl border border-slate-200/80 bg-slate-50/50 p-5 dark:border-slate-800/80 dark:bg-slate-800/30 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="rounded-xl bg-indigo-100 px-2.5 py-1 text-xs font-black text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                        Question {idx + 1} of {testQuestions.length}
                      </span>
                      <span className="text-[11px] font-bold text-slate-400">
                        {q.topic} ({q.difficulty})
                      </span>
                    </div>

                    <div className="text-sm font-bold text-slate-900 dark:text-white">
                      <MathRenderer text={q.question} />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                      {(['A', 'B', 'C', 'D'] as const).map(opt => {
                        const isSelected = selectedOpt === opt;
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => handleSelectOption(q.id, opt)}
                            className={`flex items-center gap-3 rounded-2xl border p-3 text-left text-xs font-bold transition-all ${
                              isSelected
                                ? 'border-indigo-600 bg-indigo-50 text-indigo-900 shadow-md shadow-indigo-600/10 dark:border-indigo-500 dark:bg-indigo-950/80 dark:text-white'
                                : 'border-slate-200/80 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-700'
                            }`}
                          >
                            <span
                              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs font-black ${
                                isSelected
                                  ? 'bg-indigo-600 text-white'
                                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                              }`}
                            >
                              {opt}
                            </span>
                            <span><MathRenderer text={q.options[opt]} /></span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Submit Bar */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100/80 dark:border-slate-800/80">
              <p className="text-xs text-slate-500 font-medium">
                {Object.keys(answers).length} of {testQuestions.length} Questions Answered
              </p>
              <button
                type="button"
                onClick={handleSubmitTest}
                className="flex items-center gap-2 rounded-2xl bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-emerald-500 shadow-lg shadow-emerald-600/30 transition-all"
              >
                <CheckCircle2 className="h-4 w-4" /> Submit Assessment
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
