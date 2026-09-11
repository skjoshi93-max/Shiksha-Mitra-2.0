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
    <header className="px-4 py-3 sm:px-6 flex items-center justify-between gap-4">
      {/* Page Title & Context */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="badge-3d-icon h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm">
          <BookOpen strokeWidth={1.75} className="h-5 w-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white">
              Dashboard
            </h1>
            <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              ERP 2.0
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium tracking-wide hidden sm:block">
            {totalCount} Questions Loaded • {activeCount} Active Ready
          </p>
        </div>
      </div>

      {/* Center Recessed 3D Search Field */}
      <div className="max-w-md flex-1 hidden md:block">
        <SearchBar
          value={searchQuery}
          onChange={onSearchChange}
          placeholder="Search questions, subjects, NCERT chapters..."
        />
      </div>

      {/* Right 3D Controls Bar */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Synchronized State Indicator */}
        <div className="hidden xl:flex items-center gap-2 rounded-xl border border-slate-200/90 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 shadow-xs dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          <Database strokeWidth={1.75} className="h-3.5 w-3.5 text-slate-500" />
          {saveStatus === 'saving' ? (
            <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold">
              <RefreshCw className="h-3 w-3 animate-spin" /> Saving...
            </span>
          ) : (
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
              <Check strokeWidth={2.5} className="h-3.5 w-3.5" /> Synchronized
            </span>
          )}
        </div>

        {/* Quick Notification Bell */}
        <button
          title="System Notifications"
          className="btn-3d-secondary h-9 w-9 p-0 rounded-xl relative flex items-center justify-center cursor-pointer"
        >
          <Bell strokeWidth={1.75} className="h-4 w-4 text-slate-700 dark:text-slate-200" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-slate-500 border border-white dark:border-slate-900" />
        </button>

        {/* Muted Soft-Red Clear Data Button */}
        <button
          onClick={onClearAllData}
          title="Clear all questions"
          className="btn-3d-delete text-[11px] py-1.5 px-3 rounded-xl hidden sm:inline-flex items-center gap-1.5 cursor-pointer"
        >
          <Trash2 strokeWidth={1.75} className="h-3.5 w-3.5" />
          Clear
        </button>

        {/* Generate CTA Button */}
        <button
          onClick={onOpenGenerator}
          className="btn-3d-primary text-[11px] py-1.5 px-3.5 rounded-xl flex items-center gap-1.5 cursor-pointer"
        >
          <Sparkles strokeWidth={1.75} className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Generate Bank</span>
        </button>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="btn-3d-secondary h-9 w-9 p-0 rounded-xl flex items-center justify-center cursor-pointer"
          title="Toggle Theme"
        >
          {settings.theme === 'dark' ? (
            <Sun strokeWidth={1.75} className="h-4 w-4 text-amber-400" />
          ) : (
            <Moon strokeWidth={1.75} className="h-4 w-4 text-slate-700" />
          )}
        </button>
      </div>
    </header>
  );
};

export default Header;
