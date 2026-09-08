import React from 'react';
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Layers,
  BarChart3,
  BookOpen,
  Zap,
  ArrowRight,
  Clock,
  Check,
  Brain,
  TrendingUp,
  FileSpreadsheet,
  Play,
  Bookmark,
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

  // Validation issues
  const validationIssuesCount = questions.filter(
    q => q.qualityScore < 85 || (q.validationNotes && q.validationNotes.length > 0)
  ).length;

  const presets = [
    { count: 50, label: '50 Questions', desc: 'Fast screening set for preliminary teacher interviews', time: '~10s', color: 'card-3d-emerald', badge: 'Quick' },
    { count: 100, label: '100 Questions', desc: 'Standard subject & pedagogy evaluation bank', time: '~20s', color: 'card-3d-purple', badge: 'Recommended' },
    { count: 250, label: '250 Questions', desc: 'Comprehensive multi-grade curriculum question set', time: '~40s', color: 'card-3d-sky', badge: 'Standard' },
    { count: 500, label: '500 Questions', desc: 'Full-spectrum institutional teacher question bank', time: '~1.5m', color: 'card-3d-amber', badge: 'Institutional' },
    { count: 1000, label: '1000 Questions', desc: 'Master repository covering all NCERT & CBSE domains', time: '~3.0m', color: 'card-3d-coral', badge: 'Full Bank' },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 3D Soft Periwinkle Hero Banner */}
      <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-r from-[#d3c6f8] via-[#c7b7f6] to-[#b8a5f4] text-slate-900 p-6 sm:p-8 shadow-xl shadow-indigo-950/15 border border-white/60">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          <div className="space-y-3 max-w-xl">
            <div
              className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3.5 py-1 text-xs font-black text-indigo-900 backdrop-blur-md shadow-xs border border-white/80"
            >
              <Sparkles className="h-3.5 w-3.5 text-indigo-600 animate-pulse" />
              <span>Shiksha Mitra 2.0 Engine</span>
            </div>

            <h2
              className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight"
            >
              Good Morning, Educator!
            </h2>
            <p
              className="text-xs sm:text-sm text-slate-800 font-bold leading-relaxed"
            >
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
                className="btn-3d-indigo py-3 px-6 text-xs gap-2 font-black shadow-md flex items-center"
              >
                <Sparkles className="h-4 w-4" />
                <span>Quick Generate (100 Questions)</span>
                <ArrowRight className="h-4 w-4" />
              </a>

              <a
                href="#bank"
                onClick={(e) => {
                  if (!e.ctrlKey && !e.metaKey && e.button === 0) {
                    e.preventDefault();
                    onNavigateToBankWithFilter('all', '');
                  }
                }}
                className="btn-3d-secondary py-3 px-5 text-xs gap-2 font-black flex items-center"
              >
                <BookOpen className="h-4 w-4 text-purple-700" />
                <span>Browse Question Store ({total})</span>
              </a>
            </div>
          </div>

          {/* 3D Illustration Element */}
          <div className="relative shrink-0 hidden md:block">
            <div className="w-40 h-40 rounded-3xl bg-gradient-to-tr from-white/60 to-white/20 backdrop-blur-md border border-white/80 flex items-center justify-center p-4 shadow-xl shadow-purple-900/10">
              <div className="w-28 h-28 rounded-2xl bg-gradient-to-br from-[#8c7ce8] to-[#6d5bc8] text-white flex flex-col items-center justify-center shadow-md gap-1">
                <Brain className="h-10 w-10 text-amber-300" />
                <span className="text-[11px] font-black tracking-wider uppercase">AI ENGINE</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row of 4 Colorful 3D Stat Tiles (Matching Reference Style) */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stat 1: Soft Purple */}
        <a
          href="#bank"
          onClick={(e) => {
            if (!e.ctrlKey && !e.metaKey && e.button === 0) {
              e.preventDefault();
              onNavigateToBankWithFilter('all', '');
            }
          }}
          className="card-3d-purple cursor-pointer p-5 rounded-[22px] transition-all relative overflow-hidden block"
        >
          <div className="flex items-center justify-between">
            <div className="badge-3d-icon w-10 h-10 bg-[#8c7ce8] text-white">
              <BookOpen className="h-5 w-5" />
            </div>
            <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 px-2.5 py-0.5 rounded-full">
              +18% this month
            </span>
          </div>
          <p className="mt-3 text-xs font-black text-indigo-900/80 dark:text-purple-200 uppercase tracking-wider">Total Questions</p>
          <p className="text-3xl font-black text-slate-900 dark:text-white mt-0.5">{total}</p>
        </a>

        {/* Stat 2: Soft Coral Pink */}
        <a
          href="#bank"
          onClick={(e) => {
            if (!e.ctrlKey && !e.metaKey && e.button === 0) {
              e.preventDefault();
              onNavigateToBankWithFilter('status', 'active');
            }
          }}
          className="card-3d-coral cursor-pointer p-5 rounded-[22px] transition-all relative overflow-hidden block"
        >
          <div className="flex items-center justify-between">
            <div className="badge-3d-icon w-10 h-10 bg-rose-500 text-white">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <span className="text-[10px] font-black text-rose-700 bg-rose-100 dark:bg-rose-950 dark:text-rose-300 px-2.5 py-0.5 rounded-full">
              +8 this week
            </span>
          </div>
          <p className="mt-3 text-xs font-black text-rose-900/80 dark:text-rose-200 uppercase tracking-wider">Active Pool Ready</p>
          <p className="text-3xl font-black text-rose-900 dark:text-rose-200 mt-0.5">{activeCount}</p>
        </a>

        {/* Stat 3: Soft Butter Yellow */}
        <a
          href="#bank"
          onClick={(e) => {
            if (!e.ctrlKey && !e.metaKey && e.button === 0) {
              e.preventDefault();
              onNavigateToBankWithFilter('difficulty', 'Medium');
            }
          }}
          className="card-3d-amber cursor-pointer p-5 rounded-[22px] transition-all relative overflow-hidden block"
        >
          <div className="flex items-center justify-between">
            <div className="badge-3d-icon w-10 h-10 bg-amber-500 text-white">
              <Clock className="h-5 w-5" />
            </div>
            <span className="text-[10px] font-black text-amber-800 bg-amber-100 dark:bg-amber-950 dark:text-amber-300 px-2.5 py-0.5 rounded-full">
              34.6 hrs saved
            </span>
          </div>
          <p className="mt-3 text-xs font-black text-amber-900/80 dark:text-amber-200 uppercase tracking-wider">NCERT Indexing</p>
          <p className="text-3xl font-black text-amber-900 dark:text-amber-200 mt-0.5">100%</p>
        </a>

        {/* Stat 4: Soft Sky Blue */}
        <a
          href="#bank"
          onClick={(e) => {
            if (!e.ctrlKey && !e.metaKey && e.button === 0) {
              e.preventDefault();
              onNavigateToBankWithFilter('quality', 'issues');
            }
          }}
          className="card-3d-sky cursor-pointer p-5 rounded-[22px] transition-all relative overflow-hidden block"
        >
          <div className="flex items-center justify-between">
            <div className="badge-3d-icon w-10 h-10 bg-sky-500 text-white">
              <Award className="h-5 w-5" />
            </div>
            <span className="text-[10px] font-black text-sky-800 bg-sky-100 dark:bg-sky-950 dark:text-sky-300 px-2.5 py-0.5 rounded-full">
              Automated Check
            </span>
          </div>
          <p className="mt-3 text-xs font-black text-sky-900/80 dark:text-sky-200 uppercase tracking-wider">Quality Audits</p>
          <p className="text-3xl font-black text-sky-900 dark:text-sky-200 mt-0.5">85+ Score</p>
        </a>
      </div>

      {/* Main Charts & Distribution Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 3D Overview Card with Visual Chart Bars */}
        <div className="lg:col-span-2 card-3d p-6 rounded-[28px] space-y-5">
          <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-[#8c7ce8]" />
                <span>Question Bank Distribution</span>
              </h3>
              <p className="text-xs text-slate-500 font-medium">Breakdown by Bloom's taxonomy & difficulty levels</p>
            </div>

            <div className="flex items-center gap-2 text-xs font-extrabold text-slate-600 dark:text-slate-300">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Easy ({easyCount})</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Medium ({mediumCount})</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Hard ({hardCount})</span>
            </div>
          </div>

          {/* Visual Bar Chart */}
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="card-3d-emerald p-4 rounded-2xl">
                <span className="text-[10px] font-black text-emerald-800 dark:text-emerald-300 uppercase">Easy Level</span>
                <p className="text-2xl font-black text-emerald-800 dark:text-emerald-300 mt-1">{easyCount}</p>
                <div className="w-full h-2 rounded-full bg-emerald-200 dark:bg-emerald-900 mt-2 overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${total > 0 ? (easyCount / total) * 100 : 0}%` }} />
                </div>
              </div>

              <div className="card-3d-amber p-4 rounded-2xl">
                <span className="text-[10px] font-black text-amber-800 dark:text-amber-300 uppercase">Medium Level</span>
                <p className="text-2xl font-black text-amber-800 dark:text-amber-300 mt-1">{mediumCount}</p>
                <div className="w-full h-2 rounded-full bg-amber-200 dark:bg-amber-900 mt-2 overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: `${total > 0 ? (mediumCount / total) * 100 : 0}%` }} />
                </div>
              </div>

              <div className="card-3d-rose p-4 rounded-2xl">
                <span className="text-[10px] font-black text-rose-800 dark:text-rose-300 uppercase">Hard Level</span>
                <p className="text-2xl font-black text-rose-800 dark:text-rose-300 mt-1">{hardCount}</p>
                <div className="w-full h-2 rounded-full bg-rose-200 dark:bg-rose-900 mt-2 overflow-hidden">
                  <div className="h-full bg-rose-500 rounded-full" style={{ width: `${total > 0 ? (hardCount / total) * 100 : 0}%` }} />
                </div>
              </div>
            </div>

            {/* Category Bars */}
            <div className="space-y-3 pt-2">
              <span className="text-xs font-black text-slate-700 dark:text-slate-300 block">Top Subjects & Categories</span>
              {categoryEntries.slice(0, 4).map(([catName, count]) => {
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                return (
                  <div key={catName} className="space-y-1">
                    <div className="flex justify-between text-xs font-extrabold text-slate-800 dark:text-slate-200">
                      <span>{catName}</span>
                      <span>{count} questions ({pct}%)</span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200 dark:border-slate-800">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#8c7ce8] via-purple-500 to-indigo-600"
                        style={{ width: `${Math.max(pct, 5)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 3D AI Capabilities Feature Card */}
        <div className="card-3d-purple p-6 rounded-[28px] space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="badge-3d-icon w-12 h-12 bg-[#8c7ce8] text-white">
              <Brain className="h-6 w-6" />
            </div>

            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Shiksha Mitra AI Suite
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-700 dark:text-slate-300 font-medium">
                Complete teacher interview question bank generator, NCERT syllabus extractor, and locked XLSX export exporter.
              </p>
            </div>

            <div className="space-y-2.5 text-xs font-bold text-slate-800 dark:text-slate-200">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-[#8c7ce8] shrink-0" />
                <span>NCERT Chapter Textbook Indexer</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-[#8c7ce8] shrink-0" />
                <span>Bloom's Taxonomy Verifier</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-[#8c7ce8] shrink-0" />
                <span>Locked Schema XLSX Exporter</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-[#8c7ce8] shrink-0" />
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
            className="btn-3d-indigo py-3 w-full text-xs font-black gap-2 shadow-md flex items-center justify-center"
          >
            <Sparkles className="h-4 w-4" />
            <span>Launch AI Generator</span>
          </a>
        </div>
      </div>

      {/* Quick Launch Presets Section */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" />
            Quick Launch Question Bank Presets
          </h3>
          <span className="text-[11px] font-bold text-slate-500">Auto-configured generation sets</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {presets.map((preset) => (
            <div
              key={preset.count}
              className={`${preset.color} p-5 rounded-[22px] flex flex-col justify-between relative group hover:scale-[1.02] transition-all`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-white/80 dark:bg-slate-900/80 px-2.5 py-0.5 text-[10px] font-black text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800">
                    {preset.badge}
                  </span>
                  <span className="flex items-center gap-1 text-[11px] font-extrabold text-slate-600 dark:text-slate-300">
                    <Clock className="h-3 w-3" />
                    {preset.time}
                  </span>
                </div>

                <h4 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
                  {preset.label}
                </h4>
                <p className="text-[11px] text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
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
                className="mt-4 btn-3d-indigo w-full py-2.5 text-xs gap-1.5 font-black flex items-center justify-center"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Launch {preset.count}</span>
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
