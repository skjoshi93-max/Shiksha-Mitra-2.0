import React from 'react';
import {
  LayoutDashboard,
  Sparkles,
  Database,
  Settings as SettingsIcon,
  Award,
  Zap,
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
  GraduationCap,
  FileSpreadsheet,
} from 'lucide-react';

/**
 * Sidebar.tsx
 * CONTROLS: Application navigation menu, active tabs, sidebar logo branding, and system status.
 */
export type NavTab = 'dashboard' | 'generator' | 'csv-generator' | 'bank' | 'assessments' | 'certification' | 'settings';

interface SidebarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  questionCount: number;
  assessmentCount?: number;
  bankName?: string;
}

interface NavItemDef {
  id: NavTab;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number; style?: React.CSSProperties }>;
  count?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange, questionCount, bankName }) => {
  const navItems: NavItemDef[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'generator',
      label: 'Interview Bank AI',
      icon: Sparkles,
    },
    {
      id: 'csv-generator',
      label: 'CSV Generator',
      icon: FileSpreadsheet,
    },
    {
      id: 'bank',
      label: 'Question Store',
      icon: Database,
      count: questionCount,
    },
    {
      id: 'assessments',
      label: 'Skill Assessments',
      icon: Award,
    },
    {
      id: 'certification',
      label: 'Skill Certification',
      icon: GraduationCap,
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: SettingsIcon,
    },
  ];

  return (
    <aside className="w-64 sm:w-72 shrink-0 h-screen select-none flex flex-col justify-between border-r border-slate-200/90 dark:border-slate-800/90 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md z-20 overflow-y-auto">
      <div className="p-4 sm:p-5 flex flex-col justify-between h-full min-h-full">
        <div className="space-y-6">
          {/* 3D Minimalist Shield Header Logo (Clickable to Dashboard) */}
          <a
            id="sidebar-logo-home-button"
            href="#dashboard"
            onClick={(e) => {
              if (!e.ctrlKey && !e.metaKey && e.button === 0) {
                e.preventDefault();
                onTabChange('dashboard');
                if (window.location.hash !== '#dashboard') {
                  window.location.hash = 'dashboard';
                }
              }
            }}
            className="group flex items-center gap-3 pb-4 border-b border-slate-200/80 dark:border-slate-800/80 cursor-pointer transition-all duration-200 hover:-translate-y-0.5"
            title="Return to Dashboard Home"
          >
            {/* 3D Shield Graphic */}
            <div className="relative shrink-0 flex items-center justify-center w-10 h-10 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm transition-transform duration-200 group-hover:scale-105">
              <svg
                viewBox="0 0 48 48"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-6 h-6"
              >
                <path
                  d="M24 4L40 10V22C40 32.5 33 41.5 24 45C15 41.5 8 32.5 8 22V10L24 4Z"
                  fill="currentColor"
                  fillOpacity="0.2"
                />
                <path
                  d="M24 6L38 11V21C38 30 32 38 24 41C16 38 10 30 10 21V11L24 6Z"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M17 21L22 26L31 17"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight leading-snug group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors">
                {bankName || 'Shiksha Mitra 2.0'}
              </h3>
              <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                Academic AI Suite
              </p>
            </div>
          </a>

          {/* Navigation Section */}
          <div className="space-y-1.5">
            <div className="text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase px-2 mb-2">
              MAIN NAVIGATION
            </div>
            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <a
                    key={item.id}
                    id={`nav-item-${item.id}`}
                    href={`#${item.id}`}
                    onClick={(e) => {
                      if (!e.ctrlKey && !e.metaKey && e.button === 0) {
                        e.preventDefault();
                        onTabChange(item.id);
                        if (window.location.hash !== `#${item.id}`) {
                          window.location.hash = item.id;
                        }
                      }
                    }}
                    className={`group relative flex w-full items-center justify-between rounded-xl px-3 py-2.5 transition-all duration-200 cursor-pointer ${
                      isActive
                        ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-md font-bold'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 font-medium'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon
                        strokeWidth={isActive ? 2 : 1.75}
                        className={`h-4 w-4 shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                          isActive
                            ? 'text-white dark:text-slate-900'
                            : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200'
                        }`}
                      />
                      <span className="tracking-tight text-xs">
                        {item.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {item.count !== undefined && item.count > 0 && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            isActive
                              ? 'bg-slate-800 text-slate-100 dark:bg-slate-200 dark:text-slate-900'
                              : 'bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {item.count}
                        </span>
                      )}

                      {isActive && (
                        <ChevronRight
                          strokeWidth={2.5}
                          className="h-3.5 w-3.5 shrink-0"
                        />
                      )}
                    </div>
                  </a>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Bottom Corporate Suite Card */}
        <div className="mt-6 space-y-3 pt-4 border-t border-slate-200/80 dark:border-slate-800/80">
          <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 flex items-center justify-center font-bold shadow-xs">
                <ShieldCheck className="h-3.5 w-3.5" strokeWidth={2} />
              </div>
              <span className="text-xs font-bold tracking-tight text-slate-900 dark:text-white">
                Academic Standard
              </span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400 font-normal">
              NCERT question repositories, AI assessments, and unified spreadsheets.
            </p>
            <button
              onClick={() => onTabChange('bank')}
              className="w-full py-2 px-3 rounded-lg bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-600 font-bold text-[11px] shadow-xs hover:shadow transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Zap className="h-3.5 w-3.5 text-slate-700 dark:text-slate-300" strokeWidth={2} /> Access Repository
            </button>
          </div>

          <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500 dark:text-slate-400 px-1">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" strokeWidth={2} /> System Active
            </span>
            <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-full font-bold text-[10px] border border-slate-200 dark:border-slate-700">
              v2.0
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
};
