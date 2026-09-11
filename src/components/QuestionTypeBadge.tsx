import React from 'react';

interface QuestionTypeBadgeProps {
  type?: string;
  className?: string;
}

export const QuestionTypeBadge: React.FC<QuestionTypeBadgeProps> = ({ type, className = '' }) => {
  const norm = (type || 'MCQ').toLowerCase().trim();

  let label = '[MCQ]';
  let colorClasses =
    'bg-sky-50 text-sky-700 border-sky-200/80 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800/80';

  if (norm.includes('short answer') || norm === 'saq' || norm.includes('short')) {
    label = '[Short Answer]';
    colorClasses =
      'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/80';
  } else if (norm.includes('long answer') || norm === 'laq' || norm.includes('essay') || norm.includes('descriptive')) {
    label = '[Long Answer]';
    colorClasses =
      'bg-purple-50 text-purple-700 border-purple-200/80 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800/80';
  } else if (norm.includes('true') || norm.includes('false')) {
    label = '[True / False]';
    colorClasses =
      'bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/80';
  } else if (norm.includes('blank') || norm.includes('fill')) {
    label = '[Fill in Blanks]';
    colorClasses =
      'bg-cyan-50 text-cyan-700 border-cyan-200/80 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-800/80';
  } else if (norm.includes('match')) {
    label = '[Match Columns]';
    colorClasses =
      'bg-indigo-50 text-indigo-700 border-indigo-200/80 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800/80';
  } else if (norm.includes('case')) {
    label = '[Case Study]';
    colorClasses =
      'bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/80';
  } else if (norm.includes('assertion')) {
    label = '[Assertion-Reason]';
    colorClasses =
      'bg-violet-50 text-violet-700 border-violet-200/80 dark:bg-violet-950/60 dark:text-violet-300 dark:border-violet-800/80';
  } else if (!norm.includes('mcq') && type && type.trim().length > 0) {
    label = `[${type.trim()}]`;
    colorClasses =
      'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border font-mono tracking-tight shrink-0 shadow-2xs select-none transition-colors ${colorClasses} ${className}`}
      title={`Question Type: ${label.replace(/[\[\]]/g, '')}`}
    >
      {label}
    </span>
  );
};

export default QuestionTypeBadge;
