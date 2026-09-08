import React from 'react';
import { Sparkles, RefreshCw, Sun, Moon, Database, Check, BookOpen, Trash2, Bell } from 'lucide-react';
import { SettingsState } from '../types';
import SearchBar from './SearchBar';

interface HeaderProps {
  settings: SettingsState;
  onUpdateSettings: (s: Partial<SettingsState>) => void;
  totalCount: number;
  activeCount: number;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  saveStatus: 'saving' | 'saved';
  onClearAllData: () => void;
  onOpenGenerator: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  onUpdateSettings,
  totalCount,
  activeCount,
  searchQuery,
  onSearchChange,
  saveStatus,
  onClearAllData,
  onOpenGenerator,
}) => {
  const toggleTheme = () => {
    const nextTheme = settings.theme === 'dark' ? 'light' : 'dark';
    onUpdateSettings({ theme: nextTheme });
  };

  return (
    <header className="px-4 pt-4 pb-2 lg:px-6">
      <div className="surface-3d rounded-2xl sm:rounded-3xl px-4 py-3.5 sm:px-6 flex items-center justify-between gap-4 relative overflow-hidden backdrop-blur-xl">
        {/* Decorative ambient background accent */}
        <div className="absolute -top-10 -left-10 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Page Title & Context */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="badge-3d-icon h-10 w-10 sm:h-11 sm:w-11 bg-gradient-to-br from-[#8c7ce8] via-[#8270e5] to-[#6d5bc8] text-white shadow-md shadow-indigo-950/20">
            <BookOpen className="h-5.5 w-5.5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1
                className="text-base sm:text-xl font-black tracking-tight text-slate-900 dark:text-white"
              >
                Dashboard
              </h1>
              <span
                className="inline-flex items-center rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-black text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
              >
                ERP 2.0
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold tracking-wide hidden sm:block">
              {totalCount} Questions Loaded • {activeCount} Active Ready
            </p>
          </div>
        </div>

        {/* Center Recessed 3D Search Field with Pastel Animated Gradient */}
        <div className="max-w-md flex-1 hidden md:block z-10">
          <SearchBar
            value={searchQuery}
            onChange={onSearchChange}
            placeholder="Search questions, subjects, NCERT chapters..."
          />
        </div>

        {/* Right 3D Controls Bar */}
        <div className="flex items-center gap-2.5 z-10">
          {/* Synchronized State Indicator */}
          <div className="hidden xl:flex items-center gap-2 rounded-2xl border border-purple-200/80 bg-white/80 px-3 py-1.5 text-[11px] font-bold text-slate-700 shadow-xs dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300">
            <Database className="h-3.5 w-3.5 text-[#8c7ce8]" />
            {saveStatus === 'saving' ? (
              <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold">
                <RefreshCw className="h-3 w-3 animate-spin" /> Saving...
              </span>
            ) : (
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                <Check className="h-3.5 w-3.5" /> Synchronized
              </span>
            )}
          </div>

          {/* Quick Notification Bell */}
          <button
            title="System Notifications"
            className="btn-3d-secondary h-10 w-10 p-0 rounded-2xl relative flex items-center justify-center"
          >
            <Bell className="h-4.5 w-4.5 text-slate-700 dark:text-slate-200" />
            <span className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-rose-500 border-2 border-white dark:border-slate-900 animate-pulse" />
          </button>

          {/* Quick Clear Data Button */}
          <button
            onClick={onClearAllData}
            title="Clear all questions"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-2xl border border-rose-200/80 bg-rose-50/80 px-3 py-2 text-[11px] font-extrabold text-rose-700 hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-900/60 transition-all active:scale-95"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear
          </button>

          {/* Generate CTA Button */}
          <button
            onClick={onOpenGenerator}
            className="btn-3d-indigo gap-2 py-2.5 px-4"
          >
            <Sparkles className="h-4 w-4 text-white" />
            <span className="hidden sm:inline">Generate Bank</span>
          </button>

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="btn-3d-secondary h-10 w-10 p-0 rounded-2xl"
            title="Toggle Theme"
          >
            {settings.theme === 'dark' ? (
              <Sun className="h-4.5 w-4.5 text-amber-400" />
            ) : (
              <Moon className="h-4.5 w-4.5 text-[#8c7ce8]" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
