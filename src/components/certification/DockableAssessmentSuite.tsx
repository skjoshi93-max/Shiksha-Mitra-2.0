import React, { useState, useEffect } from 'react';
import {
  Award,
  Clock,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Download,
  Sparkles,
  Lock,
  Unlock,
  RefreshCw,
  Eye,
  FileCheck,
  ChevronRight,
  AlertCircle,
  User,
  FileSpreadsheet,
  Zap,
} from 'lucide-react';
import { Assessment, AssessmentQuestion } from '../../types';
import { CourseData } from '../../lib/courseModulesData';
import { generateVerificationSerialId, generateAndDownloadCertificatePDF, CertificateData } from '../../lib/certificatePdfGenerator';
import { exportCourseAssessmentDataBankToXLSX } from '../../lib/unifiedQuestionExport';
import { MathRenderer } from '../academic/MathRenderer';

interface DockableAssessmentSuiteProps {
  course: CourseData;
  assessment: Assessment;
  completedModules: string[];
  allModulesCompleted: boolean;
  onOpenModule: (moduleIndex: number) => void;
  onCloseSuite?: () => void;
  onInstantUnlock?: () => void;
}

export const DockableAssessmentSuite: React.FC<DockableAssessmentSuiteProps> = ({
  course,
  assessment,
  completedModules,
  allModulesCompleted,
  onOpenModule,
  onCloseSuite,
  onInstantUnlock,
}) => {
  const [candidateName, setCandidateName] = useState<string>('Dr. Ananya Sharma');
  const [answers, setAnswers] = useState<Record<string, 'A' | 'B' | 'C' | 'D'>>({});
  const [timeLeft, setTimeLeft] = useState<number>(20 * 60); // 20 minutes for assessment
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [isDownloadingCert, setIsDownloadingCert] = useState<boolean>(false);
  const [isExportingExcel, setIsExportingExcel] = useState<boolean>(false);
  const [showCertPreview, setShowCertPreview] = useState<boolean>(false);
  const [bypassLock, setBypassLock] = useState<boolean>(false);
  const [verificationSerialId, setVerificationSerialId] = useState<string>(() =>
    generateVerificationSerialId(assessment.slug)
  );

  const [scoreResult, setScoreResult] = useState<{
    total: number;
    correct: number;
    percent: number;
    passed: boolean;
  } | null>(null);

  const questions = course.scenarioQuestions || [];
  const isExamUnlocked = allModulesCompleted || bypassLock;

  // Countdown timer when active
  useEffect(() => {
    if (!isExamUnlocked || isSubmitted) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isExamUnlocked, isSubmitted]);

  // Handle timeout auto-submission cleanly
  useEffect(() => {
    if (isExamUnlocked && !isSubmitted && timeLeft === 0) {
      handleSubmitAssessment();
    }
  }, [timeLeft, isExamUnlocked, isSubmitted]);

  const handleSelectOption = (qId: string, opt: 'A' | 'B' | 'C' | 'D') => {
    if (isSubmitted) return;
    setAnswers(prev => ({ ...prev, [qId]: opt }));
  };

  const handleSubmitAssessment = () => {
    let correct = 0;
    questions.forEach(q => {
      if (answers[q.id] === q.correctAnswer) {
        correct++;
      }
    });

    const percent = Math.round((correct / (questions.length || 1)) * 100);
    const passThreshold = assessment.passScore || 70; // 70% threshold
    const passed = percent >= passThreshold;

    setScoreResult({
      total: questions.length,
      correct,
      percent,
      passed,
    });
    setIsSubmitted(true);
  };

  const handleDownloadCertificate = () => {
    if (!scoreResult) return;
    setIsDownloadingCert(true);
    try {
      const certData: CertificateData = {
        certificateId: verificationSerialId,
        candidateName: candidateName.trim() || 'Certified Professional Educator',
        assessmentTitle: assessment.title,
        subject: assessment.subject,
        classLevel: assessment.classLevel,
        board: assessment.board,
        scorePercent: scoreResult.percent,
        totalQuestions: scoreResult.total,
        correctAnswers: scoreResult.correct,
        issueDate: new Date().toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }),
      };
      generateAndDownloadCertificatePDF(certData);
    } finally {
      setTimeout(() => setIsDownloadingCert(false), 600);
    }
  };

  const handleExportMasterExcel = () => {
    setIsExportingExcel(true);
    try {
      exportCourseAssessmentDataBankToXLSX(course);
    } finally {
      setTimeout(() => setIsExportingExcel(false), 600);
    }
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Locked State View when 4 modules are not finished and bypass is false
  if (!isExamUnlocked) {
    const progressPercent = Math.round((completedModules.length / 4) * 100);
    return (
      <div className="rounded-3xl border border-amber-200/80 bg-amber-50/50 p-6 sm:p-10 dark:border-amber-900/50 dark:bg-amber-950/20 text-center space-y-6 max-w-4xl mx-auto shadow-xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-500 text-slate-950 shadow-xl shadow-amber-500/30">
          <Lock className="h-8 w-8" />
        </div>

        <div className="space-y-2 max-w-xl mx-auto">
          <span className="rounded-full bg-amber-200/80 px-3.5 py-1 text-[11px] font-black uppercase tracking-wider text-amber-900 dark:bg-amber-900 dark:text-amber-200">
            Progressive 4-Module Curriculum Tracker
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            Skill Certification Examination
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium">
            Complete the 4 training modules or launch the timed certification exam directly to evaluate scenario competencies and earn your verified certificate.
          </p>
        </div>

        {/* Action Buttons: Direct Exam Launch & Excel Export */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => {
              setBypassLock(true);
              if (onInstantUnlock) onInstantUnlock();
            }}
            className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-3 text-xs font-black text-white hover:from-emerald-500 hover:to-teal-500 shadow-xl shadow-emerald-600/30 transition-all cursor-pointer active:scale-98"
          >
            <Zap className="h-4 w-4 fill-white" />
            <span>Launch Certification Exam Now (Instant Access)</span>
          </button>

          <button
            type="button"
            onClick={handleExportMasterExcel}
            disabled={isExportingExcel}
            className="flex items-center gap-2 rounded-2xl border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-900 px-5 py-3 text-xs font-black text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-slate-800 shadow-md transition-all cursor-pointer"
          >
            <FileSpreadsheet className={`h-4 w-4 ${isExportingExcel ? 'animate-bounce text-emerald-600' : ''}`} />
            <span>Export Course Assessment to Excel (.xlsx)</span>
          </button>
        </div>

        {/* Progress Stepper Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 max-w-3xl mx-auto pt-4">
          {course.modules.map(mod => {
            const isDone = completedModules.includes(mod.id);
            return (
              <button
                key={mod.id}
                onClick={() => onOpenModule(mod.moduleIndex)}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                  isDone
                    ? 'border-emerald-500 bg-emerald-50/80 dark:border-emerald-600 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200'
                    : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black font-mono">MOD {mod.moduleIndex} (5m)</span>
                  {isDone ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Lock className="h-3.5 w-3.5 text-slate-400" />}
                </div>
                <p className="mt-2 text-xs font-bold line-clamp-2">{mod.title}</p>
              </button>
            );
          })}
        </div>

        <div className="pt-2">
          <p className="text-xs font-bold text-amber-800 dark:text-amber-300">
            Curriculum Progress: {completedModules.length} of 4 Modules Completed ({progressPercent}%)
          </p>
          <div className="mt-2 h-2.5 max-w-md mx-auto rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-amber-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Test Header Bar with Excel Exporter */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/90 p-4 border border-slate-200/80 dark:border-slate-800 dark:bg-slate-900/90 backdrop-blur-md shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-600/30">
            <Unlock className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-emerald-100 dark:bg-emerald-950/80 px-2 py-0.5 text-[10px] font-black text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
                Certification Assessment
              </span>
              <span className="text-[10px] text-slate-400 font-bold">
                Pass Threshold: {assessment.passScore || 70}%
              </span>
            </div>
            <h2 className="text-sm font-black text-slate-900 dark:text-white mt-0.5">
              {assessment.title} — Scenario Exam ({questions.length} Questions)
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Export Course Assessment to Excel (.xlsx) Button */}
          <button
            type="button"
            onClick={handleExportMasterExcel}
            disabled={isExportingExcel}
            className="flex items-center gap-1.5 rounded-2xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50/80 dark:bg-emerald-950/40 px-3.5 py-2 text-xs font-black text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 shadow-xs transition-all cursor-pointer"
            title="Export Course Assessment to Excel (.xlsx) (16-Column Master Question Bank Schema)"
          >
            <FileSpreadsheet className={`h-3.5 w-3.5 ${isExportingExcel ? 'animate-bounce' : ''}`} />
            <span>Export Course Assessment to Excel (.xlsx)</span>
          </button>

          {!isSubmitted && (
            <div className="flex items-center gap-2 rounded-2xl bg-amber-50 border border-amber-200/80 px-4 py-2 text-xs font-black text-amber-800 dark:bg-amber-950/80 dark:border-amber-800/80 dark:text-amber-300">
              <Clock className="h-4 w-4 animate-pulse text-amber-600" />
              <span>Time: {formatTimer(timeLeft)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Candidate Profile Name Box */}
      <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-5 dark:border-slate-800/80 dark:bg-slate-900/90 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            <User className="h-4 w-4 text-indigo-600" /> Candidate Verification Name on Certificate
          </div>
          <span className="text-[10px] font-mono text-slate-400">
            Serial ID: {verificationSerialId}
          </span>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={candidateName}
            onChange={e => setCandidateName(e.target.value)}
            disabled={isSubmitted}
            placeholder="Enter Full Name (e.g. Dr. Ananya Sharma)"
            className="flex-1 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-2.5 text-xs font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>Cryptographically Verified SHA-256 Serial</span>
          </div>
        </div>
      </div>

      {/* Score Summary & Certificate Download Block (When submitted) */}
      {isSubmitted && scoreResult && (
        <div
          className={`rounded-3xl p-6 sm:p-8 text-center space-y-6 shadow-xl border animate-in zoom-in-95 duration-300 ${
            scoreResult.passed
              ? 'border-emerald-200 bg-emerald-50/80 dark:border-emerald-900 dark:bg-emerald-950/30'
              : 'border-rose-200 bg-rose-50/80 dark:border-rose-900 dark:bg-rose-950/30'
          }`}
        >
          <div
            className={`mx-auto flex h-16 w-16 items-center justify-center rounded-3xl text-white shadow-xl ${
              scoreResult.passed ? 'bg-emerald-600 shadow-emerald-600/30' : 'bg-rose-600 shadow-rose-600/30'
            }`}
          >
            {scoreResult.passed ? <Award className="h-8 w-8" /> : <AlertCircle className="h-8 w-8" />}
          </div>

          <div className="space-y-2">
            <span
              className={`rounded-full px-3.5 py-1 text-[11px] font-black uppercase tracking-wider ${
                scoreResult.passed
                  ? 'bg-emerald-200 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-200'
                  : 'bg-rose-200 text-rose-900 dark:bg-rose-900 dark:text-rose-200'
              }`}
            >
              {scoreResult.passed ? 'Certified Assessment Passed' : 'Assessment Incomplete'}
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              Score: {scoreResult.percent}% ({scoreResult.correct} of {scoreResult.total} Correct)
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto font-medium">
              {scoreResult.passed
                ? 'Congratulations! You have successfully mastered the pedagogical competencies. Your official verifiable certificate is ready to download.'
                : 'You did not meet the 70% passing threshold for this certification. Review the module materials and attempt the scenario questions again.'}
            </p>
          </div>

          {scoreResult.passed && (
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleDownloadCertificate}
                disabled={isDownloadingCert}
                className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-3 text-xs font-black text-white hover:from-emerald-500 hover:to-teal-500 shadow-xl shadow-emerald-600/30 transition-all cursor-pointer active:scale-98"
              >
                <Download className={`h-4 w-4 ${isDownloadingCert ? 'animate-bounce' : ''}`} />
                <span>Download Verified PDF Certificate</span>
              </button>

              <button
                type="button"
                onClick={handleExportMasterExcel}
                className="flex items-center gap-2 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-5 py-3 text-xs font-black text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-md transition-all cursor-pointer"
              >
                <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                <span>Export Assessment to Excel (.xlsx)</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Scenario Questions Form */}
      {questions.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 px-1">
            <span>
              Answer all {questions.length} scenario situations. Score 70% or higher to unlock the official Verified Teacher Certificate (PDF).
            </span>
            <span className="font-mono font-black text-indigo-700 dark:text-indigo-300">
              {Object.keys(answers).length}/{questions.length} Completed
            </span>
          </div>

          <div className="space-y-4">
            {questions.map((q, idx) => {
              const selectedOpt = answers[q.id];
              return (
                <div
                  key={q.id || idx}
                  className="rounded-3xl border border-slate-200/80 bg-white/90 p-5 dark:border-slate-800/80 dark:bg-slate-900/90 space-y-3 shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="rounded-xl bg-indigo-100 px-2.5 py-1 text-xs font-black text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                      Scenario Question {idx + 1} of {questions.length}
                    </span>
                    <span className="text-[11px] font-bold text-slate-400">
                      {q.topic}
                    </span>
                  </div>

                  <div className="text-sm font-bold text-slate-900 dark:text-white leading-relaxed">
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
                          className={`flex items-start gap-3 rounded-2xl border p-3.5 text-left text-xs font-bold transition-all cursor-pointer ${
                            isSelected
                              ? 'border-indigo-600 bg-indigo-50 text-indigo-900 shadow-md shadow-indigo-600/10 dark:border-indigo-500 dark:bg-indigo-950/80 dark:text-white'
                              : 'border-slate-200/80 bg-slate-50/50 text-slate-700 hover:border-slate-300 hover:bg-white dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-300'
                          }`}
                        >
                          <span
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs font-black ${
                              isSelected
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {opt}
                          </span>
                          <span className="leading-snug pt-0.5"><MathRenderer text={q.options[opt]} /></span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Submit Assessment Action Bar */}
          {!isSubmitted && (
            <div className="flex items-center justify-between rounded-3xl border border-slate-200/80 bg-white/90 p-4 dark:border-slate-800 dark:bg-slate-900/90 shadow-sm">
              <p className="text-xs text-slate-500 font-bold">
                {Object.keys(answers).length} of {questions.length} Scenarios Answered
              </p>
              <button
                type="button"
                onClick={handleSubmitAssessment}
                className="flex items-center gap-2 rounded-2xl bg-emerald-600 px-6 py-2.5 text-xs font-black text-white hover:bg-emerald-500 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
              >
                <CheckCircle2 className="h-4 w-4" /> Submit Scenario Evaluation
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
