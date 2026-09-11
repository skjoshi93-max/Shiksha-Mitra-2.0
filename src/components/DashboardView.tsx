import React from 'react';
import {
  Sparkles,
  CheckCircle2,
  BarChart3,
  BookOpen,
  Zap,
  ArrowRight,
  Clock,
  Brain,
  Award,
} from 'lucide-react';
import { Question } from '../types';

interface DashboardViewProps {
  questions: Question[];
  onOpenGeneratorWithPreset: (count: number) => void;
  onNavigateToBankWithFilter: (filterKey: string, filterVal: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  questions,
  onOpenGeneratorWithPreset,
  onNavigateToBankWithFilter,
}) => {
  const total = questions.length;
  const activeCount = questions.filter(q => q.active).length;

  // Difficulty counts
  const easyCount = questions.filter(q => q.difficulty === 'Easy').length;
  const mediumCount = questions.filter(q => q.difficulty === 'Medium').length;
  const hardCount = questions.filter(q => q.difficulty === 'Hard').length;

  // Category counts
  const categoriesMap: Record<string, number> = {};
  questions.forEach(q => {
    categoriesMap[q.category] = (categoriesMap[q.category] || 0) + 1;
  });

  const categoryEntries = Object.entries(categoriesMap).sort((a, b) => b[1] - a[1]);

  const presets = [
    { count: 50, label: '50 Questions', desc: 'Fast screening set for preliminary teacher interviews', time: '~10s', badge: 'Quick' },
    { count: 100, label: '100 Questions', desc: 'Standard subject & pedagogy evaluation bank', time: '~20s', badge: 'Recommended' },
    { count: 250, label: '250 Questions', desc: 'Comprehensive multi-grade curriculum question set', time: '~40s', badge: 'Standard' },
    { count: 500, label: '500 Questions', desc: 'Full-spectrum institutional teacher question bank', time: '~1.5m', badge: 'Institutional' },
    { count: 1000, label: '1000 Questions', desc: 'Master repository covering all NCERT & CBSE domains', time: '~3.0m', badge: 'Full Bank' },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 3D Corporate Hero Banner */}
      <div className="card-3d p-6 sm:p-8 relative overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          <div className="space-y-3 max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 text-xs font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              <Sparkles strokeWidth={2} className="h-3.5 w-3.5 text-slate-700 dark:text-slate-300" />
              <span>Shiksha Mitra 2.0 Engine</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
              Good Morning, Educator!
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-normal leading-relaxed">
              Empower school assessment with automated NCERT curriculum indexing, Bloom's taxonomy verification, and instant master XLSX exports.
            </p>

            <div className="pt-2 flex flex-wrap gap-3">
              <a
                href="#generator"
                onClick={(e) => {
                  if (!e.ctrlKey && !e.metaKey && e.button === 0) {
                    e.preventDefault();
                    onOpenGeneratorWithPreset(100);
                  }
                }}
                className="btn-3d-primary py-2.5 px-5 text-xs gap-2 font-bold shadow-sm flex items-center cursor-pointer"
              >
                <Sparkles strokeWidth={1.75} className="h-4 w-4" />
                <span>Quick Generate (100 Questions)</span>
                <ArrowRight strokeWidth={2} className="h-4 w-4" />
              </a>

              <a
                href="#bank"
                onClick={(e) => {
                  if (!e.ctrlKey && !e.metaKey && e.button === 0) {
                    e.preventDefault();
                    onNavigateToBankWithFilter('all', '');
                  }
                }}
                className="btn-3d-secondary py-2.5 px-5 text-xs gap-2 font-bold flex items-center cursor-pointer"
              >
                <BookOpen strokeWidth={1.75} className="h-4 w-4 text-slate-700 dark:text-slate-300" />
                <span>Browse Question Store ({total})</span>
              </a>
            </div>
          </div>

          {/* 3D Visual Metric Emblem */}
          <div className="relative shrink-0 hidden md:block">
            <div className="w-36 h-36 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center p-3 shadow-sm">
              <div className="w-28 h-28 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 flex flex-col items-center justify-center shadow-xs gap-1.5">
                <Brain strokeWidth={1.75} className="h-9 w-9 text-slate-200 dark:text-slate-800" />
                <span className="text-[10px] font-bold tracking-wider uppercase">AI ENGINE</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row of 4 3D Stat Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stat 1: Total Questions */}
        <a
          href="#bank"
          onClick={(e) => {
            if (!e.ctrlKey && !e.metaKey && e.button === 0) {
              e.preventDefault();
              onNavigateToBankWithFilter('all', '');
            }
          }}
          className="card-3d cursor-pointer p-4 sm:p-5 rounded-2xl transition-all relative overflow-hidden block"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 flex items-center justify-center border border-slate-200 dark:border-slate-700">
              <BookOpen strokeWidth={1.75} className="h-4.5 w-4.5" />
            </div>
            <span className="text-[10px] font-bold text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-400 px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
              +18% this month
            </span>
          </div>
          <p className="mt-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Questions</p>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-0.5">{total}</p>
        </a>

        {/* Stat 2: Active Pool Ready */}
        <a
          href="#bank"
          onClick={(e) => {
            if (!e.ctrlKey && !e.metaKey && e.button === 0) {
              e.preventDefault();
              onNavigateToBankWithFilter('status', 'active');
            }
          }}
          className="card-3d cursor-pointer p-4 sm:p-5 rounded-2xl transition-all relative overflow-hidden block"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 flex items-center justify-center border border-slate-200 dark:border-slate-700">
              <CheckCircle2 strokeWidth={1.75} className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="text-[10px] font-bold text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-400 px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
              +8 this week
            </span>
          </div>
          <p className="mt-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Active Pool Ready</p>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-0.5">{activeCount}</p>
        </a>

        {/* Stat 3: Extraction Rate */}
        <a
          href="#bank"
          onClick={(e) => {
            if (!e.ctrlKey && !e.metaKey && e.button === 0) {
              e.preventDefault();
              onNavigateToBankWithFilter('difficulty', 'Medium');
            }
          }}
          className="card-3d cursor-pointer p-4 sm:p-5 rounded-2xl transition-all relative overflow-hidden block"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 flex items-center justify-center border border-slate-200 dark:border-slate-700">
              <Clock strokeWidth={1.75} className="h-4.5 w-4.5 text-amber-600 dark:text-amber-400" />
            </div>
            <span className="text-[10px] font-bold text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-400 px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
              34.6 hrs saved
            </span>
          </div>
          <p className="mt-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">PDF Extraction</p>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-0.5">100%</p>
        </a>

        {/* Stat 4: Quality Audits */}
        <a
          href="#bank"
          onClick={(e) => {
            if (!e.ctrlKey && !e.metaKey && e.button === 0) {
              e.preventDefault();
              onNavigateToBankWithFilter('quality', 'issues');
            }
          }}
          className="card-3d cursor-pointer p-4 sm:p-5 rounded-2xl transition-all relative overflow-hidden block"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 flex items-center justify-center border border-slate-200 dark:border-slate-700">
              <Award strokeWidth={1.75} className="h-4.5 w-4.5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <span className="text-[10px] font-bold text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-400 px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
              Automated Check
            </span>
          </div>
          <p className="mt-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Quality Audits</p>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-0.5">85+ Score</p>
        </a>
      </div>

      {/* Main Charts & Distribution Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 3D Overview Card with Visual Chart Bars */}
        <div className="lg:col-span-2 card-3d p-6 rounded-2xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BarChart3 strokeWidth={1.75} className="h-4.5 w-4.5 text-slate-700 dark:text-slate-300" />
                <span>Question Bank Distribution</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">Breakdown by Bloom's taxonomy & difficulty levels</p>
            </div>

            <div className="flex items-center gap-3 text-xs font-semibold text-slate-600 dark:text-slate-400">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Easy ({easyCount})</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" /> Medium ({mediumCount})</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-500" /> Hard ({hardCount})</span>
            </div>
          </div>

          {/* Visual Recessed Metric Tiles */}
          <div className="space-y-5 pt-1">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Easy Level</span>
                <p className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">{easyCount}</p>
                <div className="progress-track-3d h-1.5 w-full mt-2">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${total > 0 ? (easyCount / total) * 100 : 0}%` }} />
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Medium Level</span>
                <p className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">{mediumCount}</p>
                <div className="progress-track-3d h-1.5 w-full mt-2">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: `${total > 0 ? (mediumCount / total) * 100 : 0}%` }} />
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Hard Level</span>
                <p className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">{hardCount}</p>
                <div className="progress-track-3d h-1.5 w-full mt-2">
                  <div className="h-full bg-slate-700 dark:bg-slate-400 rounded-full" style={{ width: `${total > 0 ? (hardCount / total) * 100 : 0}%` }} />
                </div>
              </div>
            </div>

            {/* Category Recessed Bars */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Top Subjects & Categories</span>
              {categoryEntries.slice(0, 4).map(([catName, count]) => {
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                return (
                  <div key={catName} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                      <span>{catName}</span>
                      <span className="text-slate-500 dark:text-slate-400">{count} questions ({pct}%)</span>
                    </div>
                    <div className="progress-track-3d h-2 w-full">
                      <div
                        className="progress-fill-3d h-full"
                        style={{ width: `${Math.max(pct, 4)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 3D AI Capabilities Feature Card */}
        <div className="card-3d p-6 rounded-2xl space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="w-10 h-10 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 flex items-center justify-center">
              <Brain strokeWidth={1.75} className="h-5 w-5" />
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Shiksha Mitra AI Suite
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400 font-normal">
                Complete teacher interview question bank generator, NCERT syllabus extractor, and locked XLSX exporter.
              </p>
            </div>

            <div className="space-y-2 text-xs font-medium text-slate-700 dark:text-slate-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 strokeWidth={2} className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Chapter PDF AI Extractor</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 strokeWidth={2} className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Bloom's Taxonomy Verifier</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 strokeWidth={2} className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Locked Schema XLSX Exporter</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 strokeWidth={2} className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Duplicate Similarity Inspector</span>
              </div>
            </div>
          </div>

          <a
            href="#generator"
            onClick={(e) => {
              if (!e.ctrlKey && !e.metaKey && e.button === 0) {
                e.preventDefault();
                onOpenGeneratorWithPreset(100);
              }
            }}
            className="btn-3d-primary py-2.5 w-full text-xs font-bold gap-2 shadow-sm flex items-center justify-center cursor-pointer"
          >
            <Sparkles strokeWidth={1.75} className="h-4 w-4" />
            <span>Launch AI Generator</span>
          </a>
        </div>
      </div>

      {/* Quick Launch Presets Section */}
      <div className="space-y-4 pt-1">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <Zap strokeWidth={2} className="h-4 w-4 text-amber-500" />
            Quick Launch Question Bank Presets
          </h3>
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Auto-configured generation sets</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {presets.map((preset) => (
            <div
              key={preset.count}
              className="card-3d p-4 rounded-xl flex flex-col justify-between relative group hover:-translate-y-1 transition-all"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    {preset.badge}
                  </span>
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    <Clock strokeWidth={1.75} className="h-3 w-3" />
                    {preset.time}
                  </span>
                </div>

                <h4 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
                  {preset.label}
                </h4>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 font-normal leading-relaxed">
                  {preset.desc}
                </p>
              </div>

              <a
                href="#generator"
                onClick={(e) => {
                  if (!e.ctrlKey && !e.metaKey && e.button === 0) {
                    e.preventDefault();
                    onOpenGeneratorWithPreset(preset.count);
                  }
                }}
                className="mt-4 btn-3d-secondary w-full py-2 text-xs gap-1.5 font-bold flex items-center justify-center cursor-pointer"
              >
                <Sparkles strokeWidth={1.75} className="h-3.5 w-3.5" />
                <span>Launch {preset.count}</span>
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
