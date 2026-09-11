import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Video,
  Presentation,
  Award,
  BookOpen,
  Sparkles,
  ChevronRight,
  RotateCcw,
  Search,
  Zap,
  CheckCircle2,
  FileSpreadsheet,
  Layers,
  Clock,
  ShieldCheck,
  Globe,
  Users,
  Mic,
  Volume2,
} from 'lucide-react';
import {
  CourseData,
  CourseModule,
  buildCourseDataForAssessment,
} from '../../lib/courseModulesData';
import { Assessment } from '../../types';
import { VideoCoursePlayer } from './VideoCoursePlayer';
import { InteractivePptViewer } from './InteractivePptViewer';
import { DockableAssessmentSuite } from './DockableAssessmentSuite';
import { exportCourseAssessmentDataBankToXLSX } from '../../lib/unifiedQuestionExport';
import {
  NarrationLanguage,
  NarrationVoiceGender,
  lifelikeAudioEngine,
} from '../../lib/lifelikeAudioEngine';
import {
  SearchableCourseMegaDropdown,
  CourseCatalogItem,
  IGOT_KARMAYOGI_COURSE_CATALOG,
} from './SearchableCourseMegaDropdown';
import { Loader2 } from 'lucide-react';

export interface CoursePlayerWorkspaceProps {
  assessment: Assessment;
  onBack?: () => void;
  onBackToHub?: () => void;
  onUpdateAssessment?: (updated: Assessment) => void | Promise<void>;
}

type WorkspaceViewMode = 'video' | 'ppt' | 'assessment';

export const CoursePlayerWorkspace: React.FC<CoursePlayerWorkspaceProps> = ({
  assessment,
  onBack,
  onBackToHub,
}) => {
  const handleBack = onBack || onBackToHub;
  const [activeModuleIndex, setActiveModuleIndex] = useState<number>(1);
  const [viewMode, setViewMode] = useState<WorkspaceViewMode>('video');
  const [completedModules, setCompletedModules] = useState<string[]>([]);

  // Selected course state from Searchable Mega-Dropdown
  const [selectedCourse, setSelectedCourse] = useState<CourseCatalogItem>(
    IGOT_KARMAYOGI_COURSE_CATALOG[0].courses[0]
  );
  const [selectedDomain, setSelectedDomain] = useState<string>(
    IGOT_KARMAYOGI_COURSE_CATALOG[0].domain
  );

  // Active generated course state
  const [generatedCourseData, setGeneratedCourseData] = useState<CourseData | null>(null);
  const [activeTopicOverride, setActiveTopicOverride] = useState<string>('');
  const [isGeneratingCourse, setIsGeneratingCourse] = useState<boolean>(false);
  const [generationFeedback, setGenerationFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [isExportingExcel, setIsExportingExcel] = useState<boolean>(false);

  // Narration Engine Configuration State (Default: Bilingual Hinglish)
  const [narrationLanguage, setNarrationLanguage] = useState<NarrationLanguage>('bilingual');
  const [voiceGender, setVoiceGender] = useState<NarrationVoiceGender>('female');

  // Build reactive course data with 4 modules, slides, chapters, and 15 grounded scenario items
  const courseData: CourseData = useMemo(() => {
    if (generatedCourseData) return generatedCourseData;
    return buildCourseDataForAssessment(assessment, activeTopicOverride || undefined);
  }, [assessment, activeTopicOverride, generatedCourseData]);

  const currentModule: CourseModule = useMemo(() => {
    return (
      courseData.modules.find(m => m.moduleIndex === activeModuleIndex) ||
      courseData.modules[0]
    );
  }, [courseData, activeModuleIndex]);

  const allModulesCompleted = completedModules.length >= 4;

  // Stop any lingering audio on mount and unmount
  useEffect(() => {
    lifelikeAudioEngine.stop();
    return () => {
      lifelikeAudioEngine.stop();
    };
  }, []);

  const handleCompleteModule = useCallback((moduleId: string) => {
    setCompletedModules(prev => {
      if (prev.includes(moduleId)) return prev;
      return [...prev, moduleId];
    });
  }, []);

  // Primary Course Generation Pipeline wired to backend API
  const handleGenerateCourse = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedCourse?.title) return;

    setIsGeneratingCourse(true);
    setGenerationFeedback(null);
    lifelikeAudioEngine.stop(); // Strictly ensure audio is silenced

    try {
      const response = await fetch('/api/generate-professional-course', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: selectedCourse.title,
          targetAudience: selectedDomain || 'Professional Educators & Administrative Cadres',
          framework: 'iGOT Karmayogi National Capacity Building Framework / NEP 2020',
          durationMinutes: 20,
          numQuestions: 12,
          isUserInitiated: true,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.course && Array.isArray(data.course.modules) && data.course.modules.length > 0) {
          setGeneratedCourseData(data.course);
          setActiveTopicOverride(selectedCourse.title);
          setCompletedModules([]);
          setActiveModuleIndex(1);
          setGenerationFeedback({
            type: 'success',
            message: `Accredited Course Generated: "${data.course.title}" (${data.course.modules.length} Modules • 16:9 Presentation Deck Ready)`,
          });
          return;
        }
      }

      // Robust client-side curriculum synthesis fallback
      const localCourse = buildCourseDataForAssessment(assessment, selectedCourse.title);
      setGeneratedCourseData(localCourse);
      setActiveTopicOverride(selectedCourse.title);
      setCompletedModules([]);
      setActiveModuleIndex(1);
      setGenerationFeedback({
        type: 'success',
        message: `Course Ready: "${localCourse.title}" (4 Modules • 20 Mins • 16:9 Presentation Deck Ready)`,
      });
    } catch (err) {
      console.warn('Network issue during course generation, applying robust client-side curriculum builder:', err);
      const localCourse = buildCourseDataForAssessment(assessment, selectedCourse.title);
      setGeneratedCourseData(localCourse);
      setActiveTopicOverride(selectedCourse.title);
      setCompletedModules([]);
      setActiveModuleIndex(1);
      setGenerationFeedback({
        type: 'success',
        message: `Course Ready: "${localCourse.title}" (4 Modules • 20 Mins • 16:9 Presentation Deck Ready)`,
      });
    } finally {
      setIsGeneratingCourse(false);
      lifelikeAudioEngine.stop();
      setTimeout(() => {
        setGenerationFeedback(null);
      }, 6000);
    }
  };

  const handleResetTopic = () => {
    lifelikeAudioEngine.stop();
    setGeneratedCourseData(null);
    setActiveTopicOverride('');
    setCompletedModules([]);
    setActiveModuleIndex(1);
    setGenerationFeedback(null);
  };

  const handleExportMasterExcel = () => {
    setIsExportingExcel(true);
    try {
      exportCourseAssessmentDataBankToXLSX(courseData);
    } finally {
      setTimeout(() => setIsExportingExcel(false), 800);
    }
  };



  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Breadcrumbs & Master Workspace Nav Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-200/80 bg-white/90 p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900/90 shadow-sm backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-2">
          {handleBack && (
            <button
              onClick={handleBack}
              className="rounded-2xl border border-slate-200 bg-slate-100 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 transition-all cursor-pointer"
            >
              ← Hub
            </button>
          )}
          <span className="text-xs font-bold text-slate-400">Certification Course</span>
          <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
          <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">
            {courseData.title}
          </span>
          <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/80 px-2.5 py-0.5 text-[10px] font-black text-emerald-700 dark:text-emerald-300">
            20-Minute Master Series
          </span>
        </div>

        {/* Global Action: 16-Column Master Excel Exporter & View Switcher */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Prominent Export Course Assessment to Excel (.xlsx) Action Button */}
          <button
            type="button"
            onClick={handleExportMasterExcel}
            disabled={isExportingExcel}
            className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 px-4 py-2 text-xs font-black text-white hover:from-emerald-500 hover:to-teal-500 shadow-md shadow-emerald-600/30 transition-all cursor-pointer active:scale-98"
            title="Export Timed Course Assessment to Excel (.xlsx) (16-Column Master Question Bank Schema)"
          >
            <FileSpreadsheet className={`h-4 w-4 ${isExportingExcel ? 'animate-bounce' : ''}`} />
            <span>Export Course Assessment to Excel (.xlsx)</span>
          </button>

          {/* Primary View Mode Switcher Pills */}
          <div className="flex items-center rounded-2xl border border-slate-200 bg-slate-100/90 p-1 dark:border-slate-800 dark:bg-slate-800/90 shadow-inner">
            <button
              onClick={() => setViewMode('video')}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-black transition-all cursor-pointer ${
                viewMode === 'video'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <Video className="h-3.5 w-3.5" />
              <span>Video Lecture</span>
            </button>

            <button
              onClick={() => setViewMode('ppt')}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-black transition-all cursor-pointer ${
                viewMode === 'ppt'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <Presentation className="h-3.5 w-3.5" />
              <span>Interactive PPT</span>
            </button>

            <button
              onClick={() => setViewMode('assessment')}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-black transition-all cursor-pointer ${
                viewMode === 'assessment'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <Award className="h-3.5 w-3.5" />
              <span>Certification Exam</span>
            </button>
          </div>
        </div>
      </div>

      {/* Dynamic Course Factory: Unlimited Searchable Mega-Dropdown & Generation Pipeline */}
      <div 
        id="igot-course-factory-card"
        className="rounded-3xl border border-blue-200/90 bg-white/95 p-5 sm:p-6 dark:border-blue-900/60 dark:bg-slate-900/95 shadow-md backdrop-blur-md space-y-4 overflow-visible relative z-30"
        style={{ overflow: 'visible' }}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-xl bg-blue-900 text-white flex items-center justify-center shadow-xs">
              <ShieldCheck className="h-4 w-4 text-sky-300" />
            </div>
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
                iGOT Karmayogi Course Factory & Narration Engine
              </span>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                Accredited National Capacity Building Framework & NEP 2020 Pedagogical Standards
              </p>
            </div>
          </div>
          {activeTopicOverride && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
                Active Blueprint: {courseData.title}
              </span>
              <button
                type="button"
                onClick={handleResetTopic}
                className="text-[11px] font-bold text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="h-3 w-3" /> Reset Default
              </button>
            </div>
          )}
        </div>

        {/* Course Generation Form with Searchable Mega-Dropdown (Decluttered: Search text input & Instructor dropdown removed) */}
        <form 
          onSubmit={handleGenerateCourse} 
          className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center overflow-visible relative z-30"
          style={{ overflow: 'visible' }}
        >
          {/* Searchable Mega-Dropdown Component */}
          <SearchableCourseMegaDropdown
            selectedCourseTitle={selectedCourse.title}
            onSelectCourse={(item, domain) => {
              setSelectedCourse(item);
              setSelectedDomain(domain);
            }}
            disabled={isGeneratingCourse}
          />

          {/* Responsive Narration Language Selector */}
          <div className="flex items-center gap-1.5 rounded-2xl border border-slate-300 bg-slate-50/90 px-3.5 py-2.5 dark:border-slate-700 dark:bg-slate-800 shrink-0">
            <Globe className="h-4 w-4 text-blue-700 dark:text-blue-400" />
            <span className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 mr-1">Language:</span>
            <select
              value={narrationLanguage}
              onChange={e => setNarrationLanguage(e.target.value as NarrationLanguage)}
              disabled={isGeneratingCourse}
              className="bg-transparent text-xs font-bold text-slate-900 dark:text-white focus:outline-none cursor-pointer"
            >
              <option value="bilingual">Bilingual (Hinglish)</option>
              <option value="en">English (Official)</option>
              <option value="hi">हिन्दी (Hindi)</option>
            </select>
          </div>

          {/* Fully Wired Generate Course Action Button */}
          <button
            type="submit"
            id="generate-course-btn"
            disabled={isGeneratingCourse}
            className="flex items-center justify-center gap-2 rounded-2xl bg-blue-700 hover:bg-blue-600 disabled:bg-blue-900/60 disabled:cursor-not-allowed px-6 py-3 text-xs font-black text-white shadow-lg shadow-blue-700/30 transition-all cursor-pointer shrink-0"
          >
            {isGeneratingCourse ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-white" />
                <span>Synthesizing Course...</span>
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 text-amber-300" />
                <span>Generate Course</span>
              </>
            )}
          </button>
        </form>

        {/* Real-time Feedback Banner */}
        {generationFeedback && (
          <div
            className={`p-3 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all ${
              generationFeedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                : 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
            }`}
          >
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>{generationFeedback.message}</span>
          </div>
        )}

        {/* Quick Domain Filter Chips */}
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Explore Domains:</span>
          {IGOT_KARMAYOGI_COURSE_CATALOG.map((group, gIdx) => {
            const isCurrentDomain = selectedDomain === group.domain;
            return (
              <button
                key={gIdx}
                type="button"
                onClick={() => {
                  if (group.courses.length > 0) {
                    setSelectedCourse(group.courses[0]);
                    setSelectedDomain(group.domain);
                  }
                }}
                className={`rounded-xl px-2.5 py-1 text-[10px] font-bold transition-all cursor-pointer border ${
                  isCurrentDomain
                    ? 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/80 dark:text-blue-300 dark:border-blue-700'
                    : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-200/80 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-blue-950/40'
                }`}
              >
                {group.badge}
              </button>
            );
          })}
        </div>
      </div>

      {/* Course Hero Card Banner - Mission Karmayogi Deep Professional Blues & Chalk Whites */}
      <div className="rounded-3xl border border-[#1E3A5F] bg-gradient-to-br from-[#07172C] via-[#0B2545] to-[#0A1F38] p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-amber-400 text-slate-950 px-3 py-0.5 text-[10px] font-black uppercase tracking-wider shadow-xs">
                iGOT Karmayogi Delivery Standards
              </span>
              <span className="rounded-full bg-white/10 text-white/90 border border-white/15 px-3 py-0.5 text-[10px] font-bold">
                {courseData.subject} • {courseData.classLevel || 'Professional Educators'}
              </span>
              <span className="rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-0.5 text-[10px] font-bold">
                {completedModules.length} of 4 Modules Completed ({Math.round((completedModules.length / 4) * 100)}%)
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-white">
              {courseData.title}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed">
              Professional 20-minute pedagogical certification course featuring interactive widescreen video lectures, 16:9 presentation slide decks, and a timed 15-question scenario assessment grounded in course transcripts and statutory guidelines.
            </p>
          </div>

          {/* Fast Quick-Launch Action */}
          <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 shrink-0">
            <button
              onClick={() => setViewMode('assessment')}
              className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-3 text-xs font-black text-white hover:from-emerald-400 hover:to-teal-500 shadow-xl shadow-emerald-500/30 transition-all cursor-pointer"
            >
              <Award className="h-4 w-4" />
              <span>Launch Assessment Exam</span>
            </button>
            <button
              onClick={handleExportMasterExcel}
              disabled={isExportingExcel}
              className="flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 hover:bg-white/20 px-4 py-2 text-xs font-bold text-white transition-all cursor-pointer backdrop-blur-xs"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" />
              <span>Export Master Excel (.xlsx)</span>
            </button>
          </div>
        </div>

        {/* Decorative Grid Lines */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
      </div>

      {/* Module Navigation Stepper Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {courseData.modules.map(mod => {
          const isActive = mod.moduleIndex === activeModuleIndex;
          const isDone = completedModules.includes(mod.id);

          return (
            <button
              key={mod.id}
              onClick={() => {
                setActiveModuleIndex(mod.moduleIndex);
                if (viewMode === 'assessment') setViewMode('video');
              }}
              className={`p-4 rounded-3xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                isActive
                  ? 'border-blue-700 bg-white dark:border-blue-500 dark:bg-slate-900 ring-2 ring-blue-700/20 shadow-lg'
                  : 'border-slate-200/80 bg-white/80 dark:border-slate-800 dark:bg-slate-900/70 hover:bg-white dark:hover:bg-slate-900'
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-[10px] font-black font-mono uppercase px-2 py-0.5 rounded-md ${
                    isActive
                      ? 'bg-blue-800 text-white'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                  }`}
                >
                  MOD {mod.moduleIndex} • 05:00
                </span>
                {isDone ? (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Done
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-slate-400">5 Mins</span>
                )}
              </div>

              <h3 className="mt-2.5 text-xs font-black text-slate-900 dark:text-white line-clamp-1">
                {mod.title}
              </h3>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                {mod.summary}
              </p>

              {/* Progress Line */}
              <div className="mt-3 h-1 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    isDone ? 'w-full bg-emerald-500' : isActive ? 'w-1/2 bg-blue-700' : 'w-0'
                  }`}
                />
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Workspace Stage: Video Player / Interactive PPT / Assessment Suite */}
      <div className="pt-2">
        {viewMode === 'video' && (
          <VideoCoursePlayer
            course={courseData}
            currentModule={currentModule}
            onCompleteModule={handleCompleteModule}
            isCompleted={completedModules.includes(currentModule.id)}
            narrationLanguage={narrationLanguage}
            voiceGender={voiceGender}
            onLanguageChange={setNarrationLanguage}
            onVoiceGenderChange={setVoiceGender}
            onNextModule={() => {
              if (activeModuleIndex < 4) {
                setActiveModuleIndex(prev => prev + 1);
              } else {
                setViewMode('assessment');
              }
            }}
          />
        )}

        {viewMode === 'ppt' && (
          <InteractivePptViewer
            course={courseData}
            currentModule={currentModule}
            onCompleteModule={handleCompleteModule}
            isCompleted={completedModules.includes(currentModule.id)}
            narrationLanguage={narrationLanguage}
            voiceGender={voiceGender}
            onLanguageChange={setNarrationLanguage}
            onVoiceGenderChange={setVoiceGender}
            onNextModule={() => {
              if (activeModuleIndex < 4) {
                setActiveModuleIndex(prev => prev + 1);
              } else {
                setViewMode('assessment');
              }
            }}
          />
        )}

        {viewMode === 'assessment' && (
          <DockableAssessmentSuite
            course={courseData}
            assessment={assessment}
            completedModules={completedModules}
            allModulesCompleted={allModulesCompleted}
            onOpenModule={modIdx => {
              setActiveModuleIndex(modIdx);
              setViewMode('video');
            }}
            onInstantUnlock={() => {}}
          />
        )}
      </div>
    </div>
  );
};
