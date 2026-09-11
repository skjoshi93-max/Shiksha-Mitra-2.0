import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  Sparkles,
  Search,
  BookOpen,
  Award,
  Layers,
  Clock,
  CheckCircle2,
  ChevronRight,
  Filter,
  RefreshCw,
  Video,
  Presentation,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { Assessment } from '../types';
import { getAllAssessments, saveAssessment } from '../lib/db';
import { DEMO_ASSESSMENTS } from '../lib/assessmentConstants';
import { CoursePlayerWorkspace } from './certification/CoursePlayerWorkspace';

export const SkillCertificationView: React.FC = () => {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('All');

  const loadAssessments = async () => {
    setIsLoading(true);
    try {
      const data = await getAllAssessments();
      if (data && data.length > 0) {
        setAssessments(data);
        if (!selectedAssessment) {
          setSelectedAssessment(data[0]);
        }
      } else {
        setAssessments(DEMO_ASSESSMENTS);
        if (!selectedAssessment) {
          setSelectedAssessment(DEMO_ASSESSMENTS[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load certification courses:', err);
      setAssessments(DEMO_ASSESSMENTS);
      if (!selectedAssessment) {
        setSelectedAssessment(DEMO_ASSESSMENTS[0]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAssessments();
  }, []);

  const handleUpdateAssessment = async (updated: Assessment) => {
    await saveAssessment(updated);
    setSelectedAssessment(updated);
    await loadAssessments();
  };

  const filteredAssessments = assessments.filter(a => {
    const matchesSearch =
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubject = selectedSubjectFilter === 'All' || a.subject === selectedSubjectFilter;
    return matchesSearch && matchesSubject;
  });

  const uniqueSubjects = Array.from(new Set(assessments.map(a => a.subject).filter(Boolean)));

  if (isLoading && assessments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <RefreshCw className="h-8 w-8 text-indigo-600 animate-spin" />
        <p className="text-sm font-bold text-slate-600 dark:text-slate-400">
          Loading Skill Certification & Karmayogi Courses...
        </p>
      </div>
    );
  }

  const currentActiveAssessment = selectedAssessment || assessments[0] || DEMO_ASSESSMENTS[0];

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Course Switcher Bar */}
      <div className="rounded-3xl border border-indigo-200/80 bg-white/90 p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900/90 shadow-md backdrop-blur-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 text-white flex items-center justify-center shadow-md shadow-indigo-600/20 shrink-0">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white">
                  Skill Certification Course Workspace
                </h2>
                <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-[10px] font-black text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800">
                  iGOT Karmayogi Framework
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                4-Module 20-minute video lectures, interactive PPT decks, scenario evaluation, and verifiable digital certificates.
              </p>
            </div>
          </div>

          {/* Quick Course Selector Dropdown & Filter */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200/80 dark:border-slate-700">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 pl-2">
                Active Course:
              </span>
              <select
                id="skill-certification-course-select"
                value={currentActiveAssessment.id}
                onChange={(e) => {
                  const found = assessments.find(a => a.id === e.target.value);
                  if (found) setSelectedAssessment(found);
                }}
                className="rounded-xl bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 shadow-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 max-w-[280px] sm:max-w-[340px] truncate"
              >
                {assessments.map(asm => (
                  <option key={asm.id} value={asm.id}>
                    {asm.title} ({asm.subject})
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => {
                const nextIdx = (assessments.findIndex(a => a.id === currentActiveAssessment.id) + 1) % assessments.length;
                setSelectedAssessment(assessments[nextIdx]);
              }}
              title="Switch to next available course"
              className="px-3 py-2 rounded-xl bg-indigo-50 border border-indigo-200/80 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:border-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Next Course</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Interactive Course Workspace */}
      <CoursePlayerWorkspace
        assessment={currentActiveAssessment}
        onBack={() => {
          // Switch to first or toggle course
          window.location.hash = 'assessments';
        }}
        onUpdateAssessment={handleUpdateAssessment}
      />
    </div>
  );
};
