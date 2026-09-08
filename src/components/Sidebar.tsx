import React from 'react';
import {
  LayoutDashboard,
  Sparkles,
  Database,
  Settings as SettingsIcon,
  Award,
  BookOpen,
  Zap,
  CheckCircle2,
  ChevronRight,
  Crown,
  GraduationCap,
} from 'lucide-react';

/**
 * Sidebar.tsx
 * CONTROLS: Application navigation menu, active tabs, sidebar logo branding, and promo cards.
 */
export type NavTab = 'dashboard' | 'generator' | 'bank' | 'assessments' | 'ncert-pdf' | 'settings';

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
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  count?: number;
  gradientBackground: string;
  activeBorderColor: string;
  activeShadow: string;
  iconColor: string;
  iconBg: string;
  badgeStyle: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange, questionCount, bankName }) => {
  const navItems: NavItemDef[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      gradientBackground: 'linear-gradient(135deg, #f0f9ff, #e0f2fe)',
      activeBorderColor: '#2563eb',
      activeShadow: '0 4px 14px 0 rgba(37, 99, 235, 0.22)',
      iconColor: '#1d4ed8',
      iconBg: 'rgba(37, 99, 235, 0.12)',
      badgeStyle: 'bg-blue-100 text-blue-900 border border-blue-200/80',
    },
    {
      id: 'generator',
      label: 'Interview Bank AI',
      icon: Sparkles,
      gradientBackground: 'linear-gradient(135deg, #fff1f2, #ffe4e6)',
      activeBorderColor: '#e11d48',
      activeShadow: '0 4px 14px 0 rgba(225, 29, 72, 0.22)',
      iconColor: '#be123c',
      iconBg: 'rgba(190, 18, 60, 0.12)',
      badgeStyle: 'bg-rose-100 text-rose-900 border border-rose-200/80',
    },
    {
      id: 'ncert-pdf',
      label: 'NCERT PDF Bank',
      icon: BookOpen,
      gradientBackground: 'linear-gradient(135deg, #f0fdfa, #ccfbf1)',
      activeBorderColor: '#0d9488',
      activeShadow: '0 4px 14px 0 rgba(13, 148, 136, 0.22)',
      iconColor: '#0f766e',
      iconBg: 'rgba(15, 118, 110, 0.12)',
      badgeStyle: 'bg-teal-100 text-teal-900 border border-teal-200/80',
    },
    {
      id: 'bank',
      label: 'Question Store',
      icon: Database,
      count: questionCount,
      gradientBackground: 'linear-gradient(135deg, #fffbeb, #fef3c7)',
      activeBorderColor: '#d97706',
      activeShadow: '0 4px 14px 0 rgba(217, 119, 6, 0.22)',
      iconColor: '#b45309',
      iconBg: 'rgba(180, 83, 9, 0.12)',
      badgeStyle: 'bg-amber-100 text-amber-900 border border-amber-200/80',
    },
    {
      id: 'assessments',
      label: 'Skill Assessments',
      icon: Award,
      gradientBackground: 'linear-gradient(135deg, #fdf4ff, #fae8ff)',
      activeBorderColor: '#c026d3',
      activeShadow: '0 4px 14px 0 rgba(192, 38, 211, 0.22)',
      iconColor: '#a21caf',
      iconBg: 'rgba(162, 28, 175, 0.12)',
      badgeStyle: 'bg-fuchsia-100 text-fuchsia-900 border border-fuchsia-200/80',
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: SettingsIcon,
      gradientBackground: 'linear-gradient(135deg, #fffbeb, #fef3c7)',
      activeBorderColor: '#d97706',
      activeShadow: '0 4px 14px 0 rgba(217, 119, 6, 0.22)',
      iconColor: '#b45309',
      iconBg: 'rgba(180, 83, 9, 0.12)',
      badgeStyle: 'bg-amber-100 text-amber-900 border border-amber-200/80',
    },
  ];

  return (
    <aside className="w-64 sm:w-72 shrink-0 p-3 lg:p-4 select-none flex flex-col justify-between">
      {/* Outer Floating 3D Pastel Sidebar Column */}
      <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl rounded-[28px] sm:rounded-[32px] p-4 text-slate-800 dark:text-slate-100 shadow-xl shadow-slate-200/60 dark:shadow-slate-950/60 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between h-full min-h-[calc(100vh-5.5rem)] relative overflow-hidden">
        {/* Soft Background Ambient Light Overlay */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-sky-100/50 dark:bg-sky-900/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-10 left-0 w-40 h-40 bg-purple-100/50 dark:bg-purple-900/20 rounded-full blur-2xl pointer-events-none" />

        <div className="space-y-5 relative z-10">
          {/* Transparent 3D Minimalist Shield Header Logo (Clickable to Dashboard) */}
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
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s ease-in-out',
            }}
            className="group flex items-center gap-3 px-2 pt-1 pb-3.5 border-b border-slate-200/80 dark:border-slate-800 hover:-translate-y-0.5 hover:scale-[1.01]"
            title="Return to Dashboard Home"
          >
            {/* 3D Minimalist Shield & Open Book Vault Graphic (No container background, no border) */}
            <div className="relative shrink-0 flex items-center justify-center w-11 h-11" style={{ background: 'transparent', border: 'none' }}>
              {/* Subtle ambient shadow under floating vector */}
              <div className="absolute -bottom-1 w-8 h-2 bg-amber-900/20 dark:bg-amber-500/20 rounded-full blur-xs pointer-events-none" />

              <svg
                viewBox="0 0 48 48"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-11 h-11 transition-transform duration-200 group-hover:scale-105"
                style={{ filter: 'drop-shadow(0px 4px 6px rgba(180, 83, 9, 0.25))' }}
              >
                <defs>
                  {/* Shield 3D Front Fill Gradient */}
                  <linearGradient id="shield3dGrad" x1="6" y1="4" x2="42" y2="44" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#fbbf24" />
                    <stop offset="40%" stopColor="#d97706" />
                    <stop offset="100%" stopColor="#b45309" />
                  </linearGradient>

                  {/* Shield 3D Bevel/Highlight */}
                  <linearGradient id="shieldHighlight" x1="12" y1="6" x2="36" y2="24" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#fef3c7" stopOpacity="0.85" />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.1" />
                  </linearGradient>

                  {/* Shield Dark Depth Shadow Side */}
                  <linearGradient id="shieldDepth" x1="24" y1="20" x2="42" y2="44" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#78350f" />
                    <stop offset="100%" stopColor="#451a03" />
                  </linearGradient>

                  {/* Open Book Page Gradient */}
                  <linearGradient id="bookPageGrad" x1="12" y1="20" x2="36" y2="38" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="50%" stopColor="#fffbeb" />
                    <stop offset="100%" stopColor="#fef3c7" />
                  </linearGradient>

                  {/* Charcoal Accent Line Gradient */}
                  <linearGradient id="charcoalGrad" x1="16" y1="24" x2="32" y2="34" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#334155" />
                    <stop offset="100%" stopColor="#1e293b" />
                  </linearGradient>
                </defs>

                {/* 3D Shield Base Path Backing */}
                <path
                  d="M24 4L40 10V22C40 32.5 33 41.5 24 45C15 41.5 8 32.5 8 22V10L24 4Z"
                  fill="url(#shieldDepth)"
                />

                {/* Main 3D Front Shield Face */}
                <path
                  d="M24 5.5L38.5 11V21.5C38.5 31 32 39.5 24 43C16 39.5 9.5 31 9.5 21.5V11L24 5.5Z"
                  fill="url(#shield3dGrad)"
                />

                {/* 3D Glass Light Reflection Overlay */}
                <path
                  d="M24 5.5L38.5 11V21.5C38.5 25.5 37 29.5 34.5 33C29 25 21 16 10 12.5V11L24 5.5Z"
                  fill="url(#shieldHighlight)"
                />

                {/* Inner Gold Inset Rim */}
                <path
                  d="M24 8.5L35.5 13V21C35.5 28.5 30.5 35.5 24 38.5C17.5 35.5 12.5 28.5 12.5 21V13L24 8.5Z"
                  stroke="#fef3c7"
                  strokeWidth="1.2"
                  strokeOpacity="0.75"
                  fill="none"
                />

                {/* 3D Open Book Vault Graphic */}
                <g transform="translate(0, 2)">
                  {/* Book Base Shadow */}
                  <path
                    d="M13 28.5C18 26.5 24 27.5 24 27.5C24 27.5 30 26.5 35 28.5V36C30 34 24 35 24 35C24 35 18 34 13 36V28.5Z"
                    fill="#451a03"
                    opacity="0.4"
                  />

                  {/* Left Book Page */}
                  <path
                    d="M13 26.5C18 24.5 23.5 25.5 23.5 25.5V33.5C23.5 33.5 18 32.5 13 34.5V26.5Z"
                    fill="url(#bookPageGrad)"
                    stroke="#b45309"
                    strokeWidth="0.8"
                  />

                  {/* Right Book Page */}
                  <path
                    d="M35 26.5C30 24.5 24.5 25.5 24.5 25.5V33.5C24.5 33.5 30 32.5 35 34.5V26.5Z"
                    fill="url(#bookPageGrad)"
                    stroke="#b45309"
                    strokeWidth="0.8"
                  />

                  {/* Spine Center Fold Line */}
                  <path
                    d="M24 25V33.8"
                    stroke="#78350f"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />

                  {/* Page Lines (Charcoal Tones) */}
                  <path d="M16 28.2H20.5M15.5 30.5H20.5" stroke="url(#charcoalGrad)" strokeWidth="1" strokeLinecap="round" opacity="0.7" />
                  <path d="M27.5 28.2H32M27.5 30.5H32.5" stroke="url(#charcoalGrad)" strokeWidth="1" strokeLinecap="round" opacity="0.7" />

                  {/* 3D "S ✦ M" Custom Branded Shield Emblem (Sized & Positioned Safely Inside Cream Boundary) */}
                  <g transform="translate(0, 2)">
                    {/* Engraved Letter 'S' (Left of Star) - Inward Positioned & Compact (x=17.2, fontSize=5.5) */}
                    <text
                      x="17.2"
                      y="21.5"
                      textAnchor="middle"
                      fill="#451a03"
                      fontSize="5.5"
                      fontWeight="900"
                      fontFamily="system-ui, -apple-system, sans-serif"
                    >
                      S
                    </text>
                    <text
                      x="17.2"
                      y="21.0"
                      textAnchor="middle"
                      fill="#fef3c7"
                      fontSize="5.5"
                      fontWeight="900"
                      fontFamily="system-ui, -apple-system, sans-serif"
                      style={{ filter: 'drop-shadow(0px 1px 1px rgba(120, 53, 15, 0.9))' }}
                    >
                      S
                    </text>

                    {/* Central Shining Star Element (✦) */}
                    <path
                      d="M24 16L25.2 18.8L28 20L25.2 21.2L24 24L22.8 21.2L20 20L22.8 18.8L24 16Z"
                      fill="#ffffff"
                      style={{ filter: 'drop-shadow(0px 1px 2px rgba(217, 119, 6, 0.9))' }}
                    />

                    {/* Engraved Letter 'M' (Right of Star) - Inward Positioned & Compact (x=30.8, fontSize=5.5) */}
                    <text
                      x="30.8"
                      y="21.5"
                      textAnchor="middle"
                      fill="#451a03"
                      fontSize="5.5"
                      fontWeight="900"
                      fontFamily="system-ui, -apple-system, sans-serif"
                    >
                      M
                    </text>
                    <text
                      x="30.8"
                      y="21.0"
                      textAnchor="middle"
                      fill="#fef3c7"
                      fontSize="5.5"
                      fontWeight="900"
                      fontFamily="system-ui, -apple-system, sans-serif"
                      style={{ filter: 'drop-shadow(0px 1px 1px rgba(120, 53, 15, 0.9))' }}
                    >
                      M
                    </text>
                  </g>
                </g>
              </svg>
            </div>

            <div>
              <h3
                className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white tracking-tight leading-snug group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors"
              >
                {bankName || 'Shiksha Mitra 2.0'}
              </h3>
              <p
                className="text-[10px] font-bold text-slate-500 dark:text-slate-400"
              >
                Academic AI Suite
              </p>
            </div>
          </a>

          {/* Navigation Section */}
          <div className="space-y-2">
            <div className="text-[10px] font-black tracking-wider text-slate-400 dark:text-slate-500 uppercase px-2 mb-1.5">
              MAIN NAVIGATION
            </div>
            <nav className="space-y-2">
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
                    style={{
                      background: item.gradientBackground,
                      border: isActive ? `2px solid ${item.activeBorderColor}` : '1px solid rgba(226, 232, 240, 0.9)',
                      boxShadow: isActive ? item.activeShadow : '0 1px 3px 0 rgba(0, 0, 0, 0.03)',
                      transform: isActive ? 'scale(1.02) translateX(3px)' : undefined,
                    }}
                    className={`group relative flex w-full items-center justify-between rounded-2xl px-3.5 py-3 transition-all duration-200 cursor-pointer hover:scale-[1.02] ${
                      isActive ? 'font-black' : 'hover:border-slate-300/80'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        style={{
                          backgroundColor: isActive ? item.activeBorderColor : item.iconBg,
                          color: isActive ? '#ffffff' : item.iconColor,
                        }}
                        className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200 shadow-xs"
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <span
                        className="tracking-tight text-xs text-slate-800 dark:text-slate-900 font-extrabold"
                      >
                        {item.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {item.count !== undefined && item.count > 0 && (
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-black ${item.badgeStyle}`}
                        >
                          {item.count}
                        </span>
                      )}

                      {isActive && (
                        <ChevronRight
                          className="h-4 w-4 shrink-0 font-bold"
                          style={{ color: item.activeBorderColor }}
                        />
                      )}
                    </div>
                  </a>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Bottom Coral/Pink Promo Card */}
        <div className="mt-6 space-y-3 relative z-10">
          <div className="bg-gradient-to-br from-[#fff1f2] to-[#ffe4e6] text-slate-900 p-4 rounded-2xl shadow-md shadow-rose-500/10 border border-rose-200/80 space-y-2.5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-rose-500 text-white flex items-center justify-center font-black shadow-xs">
                <Crown className="h-4 w-4 text-white" />
              </div>
              <span className="text-xs font-black tracking-tight text-rose-950">Shiksha Mitra Pro</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-700 font-medium">
              NCERT question banks, AI skill assessments & instant XLSX exports.
            </p>
            <button
              onClick={() => onTabChange('bank')}
              className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 text-white font-extrabold text-[11px] shadow-sm hover:brightness-105 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Zap className="h-3.5 w-3.5" /> Open Question Bank
            </button>
          </div>

          <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 dark:text-slate-400 px-1">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> System Active
            </span>
            <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-full font-extrabold text-[10px] border border-slate-200 dark:border-slate-700">v2.0</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
