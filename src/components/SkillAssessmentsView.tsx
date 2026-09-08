import React, { useState, useEffect } from 'react';
import { AnimatedSearchInput } from './AnimatedSearchInput';
import {
  Award,
  Sparkles,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  BookOpen,
  Eye,
  Edit3,
  Copy,
  Trash2,
  Download,
  BarChart2,
  Layers,
  Zap,
  RefreshCw,
  FileSpreadsheet,
  FileText,
  FileCode,
  Calendar,
} from 'lucide-react';
import { Assessment } from '../types';
import { LOCKED_CSV_FILENAMES } from '../lib/exportFilenameRegistry';
import {
  getAllAssessments,
  saveAssessment,
  deleteAssessment,
  deleteAssessmentsBatch,
  clearAllAssessments,
} from '../lib/db';
import { AIAssessmentGeneratorModal } from './AIAssessmentGeneratorModal';
import { AssessmentFormModal } from './AssessmentFormModal';
import { AssessmentDetailView } from './AssessmentDetailView';
import { TeacherTestRunnerModal } from './TeacherTestRunnerModal';
import {
  exportAssessmentToXLSX,
  exportAssessmentToCSV,
  exportAssessmentToWord,
  exportAssessmentToPDF,
  exportAssessmentToJSON,
  exportAssessmentToTXT,
} from '../lib/assessmentExportUtils';

const formatDateDisplay = (dateString: string) => {
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
};

export const SkillAssessmentsView: React.FC = () => {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('All');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('All');

  // Active Modals & Selected View States
  const [showAIGeneratorModal, setShowAIGeneratorModal] = useState<boolean>(false);
  const [showFormModal, setShowFormModal] = useState<boolean>(false);
  const [editingAssessment, setEditingAssessment] = useState<Assessment | undefined>(undefined);

  const [activeDetailAssessment, setActiveDetailAssessment] = useState<Assessment | null>(null);
  const [activeTestAssessment, setActiveTestAssessment] = useState<Assessment | null>(null);

  const [selectedAssessmentIds, setSelectedAssessmentIds] = useState<string[]>([]);

  const loadAssessments = async () => {
    setIsLoading(true);
    try {
      const data = await getAllAssessments();
      setAssessments(data);
    } catch (err) {
      console.error('Failed to load assessments:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAssessments();
  }, []);

  const handleSaveAssessment = async (assessment: Assessment) => {
    await saveAssessment(assessment);
    await loadAssessments();
    setShowFormModal(false);
    setEditingAssessment(undefined);
  };

  const handleDeleteAssessment = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this skill assessment?')) {
      await deleteAssessment(id);
      await loadAssessments();
      setSelectedAssessmentIds(prev => prev.filter(x => x !== id));
    }
  };

  const handleAssessmentGeneratedByAI = async (newAssessment: Assessment) => {
    await saveAssessment(newAssessment);
    await loadAssessments();
    setShowAIGeneratorModal(false);
  };

  // Metrics
  const totalAssessments = assessments.length;
  const activeAssessments = assessments.filter(a => a.active).length;
  const inactiveAssessments = totalAssessments - activeAssessments;
  const totalQuestionsAcrossAll = assessments.reduce((sum, a) => sum + (a.totalQuestions || a.questions?.length || 0), 0);
  const uniqueSubjects = Array.from(new Set(assessments.map(a => a.subject).filter(Boolean)));
  const avgPassScore = totalAssessments > 0 ? Math.round(assessments.reduce((sum, a) => sum + (a.passScore || 0), 0) / totalAssessments) : 0;

  const handleToggleSelectAll = () => {
    const allIds = filteredAssessments.map(a => a.id);
    if (selectedAssessmentIds.length === allIds.length && allIds.every(id => selectedAssessmentIds.includes(id))) {
      setSelectedAssessmentIds([]);
    } else {
      setSelectedAssessmentIds(allIds);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedAssessmentIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleDeleteSelected = async () => {
    if (selectedAssessmentIds.length === 0) {
      alert('Please select at least one assessment to delete.');
      return;
    }
    if (window.confirm(`Are you sure you want to delete ${selectedAssessmentIds.length} selected assessment(s)?`)) {
      await deleteAssessmentsBatch(selectedAssessmentIds);
      setSelectedAssessmentIds([]);
      await loadAssessments();
    }
  };

  const handleDeleteAll = async () => {
    if (window.confirm('Are you sure you want to DELETE ALL skill assessments? This action cannot be undone.')) {
      await clearAllAssessments();
      setSelectedAssessmentIds([]);
      await loadAssessments();
    }
  };

  // Export Selected Assessment Question Bank (CSV)
  const handleExportSelectedAssessment = () => {
    if (selectedAssessmentIds.length === 0) {
      alert('Please select an assessment using the checkbox first to export its question bank.');
      return;
    }
    const selected = assessments.find(a => a.id === selectedAssessmentIds[0]);
    if (!selected) {
      alert('Selected assessment not found.');
      return;
    }
    exportAssessmentToCSV(selected);
  };

  // Filtered Assessments List
  const filteredAssessments = assessments.filter(a => {
    const matchesSearch =
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSubject = selectedSubjectFilter === 'All' || a.subject === selectedSubjectFilter;
    const matchesStatus =
      selectedStatusFilter === 'All' ||
      (selectedStatusFilter === 'Active' && a.active) ||
      (selectedStatusFilter === 'Inactive' && !a.active);

    return matchesSearch && matchesSubject && matchesStatus;
  });

  // If Detail View is active
  if (activeDetailAssessment) {
    return (
      <AssessmentDetailView
        assessment={activeDetailAssessment}
        onBack={() => setActiveDetailAssessment(null)}
        onUpdateAssessment={handleSaveAssessment}
        onOpenTeacherTest={asm => setActiveTestAssessment(asm)}
        onOpenEditForm={asm => {
          setEditingAssessment(asm);
          setShowFormModal(true);
        }}
      />
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* 3D Header Banner - Premium Light Pastel Rose-to-Violet Gradient */}
      <div
        className="relative overflow-hidden rounded-3xl border border-pink-200/80 p-6 sm:p-9 text-slate-900 shadow-xl shadow-pink-100/50"
        style={{ background: 'linear-gradient(135deg, #fff1f2, #fae8ff)' }}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div
              className="inline-flex items-center gap-2 rounded-full border border-rose-300/60 bg-white/80 px-3.5 py-1 text-xs font-black text-rose-900 backdrop-blur-md shadow-xs"
            >
              <Award className="h-4 w-4 text-rose-600" />
              <span>Certification Test Bank & Skill Verification</span>
            </div>
            <h1
              className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight"
            >
              Skill Assessments Command Center
            </h1>
            <p className="text-xs sm:text-sm text-slate-700 font-medium leading-relaxed">
              AI-powered assessment generator and teacher competence certification management system. Create, manage, and benchmark skill tests.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => handleExportSelectedAssessment()}
              className={selectedAssessmentIds.length > 0 ? 'btn-3d-indigo py-3 px-4 text-xs gap-2' : 'btn-3d-secondary py-3 px-4 text-xs gap-2 opacity-50 cursor-not-allowed'}
              title={selectedAssessmentIds.length > 0 ? 'Export Selected Assessment Question Bank (XLSX)' : 'Select an assessment checkbox below first to export'}
            >
              <Download className="h-4 w-4" /> Export Selected (XLSX)
            </button>

            <button
              onClick={handleDeleteSelected}
              className={selectedAssessmentIds.length > 0 ? 'btn-3d-secondary py-3 px-4 text-xs gap-1.5 bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 cursor-pointer' : 'btn-3d-secondary py-3 px-4 text-xs gap-1.5 opacity-50 cursor-not-allowed'}
              title="Delete Selected Assessments"
            >
              <Trash2 className="h-4 w-4 text-rose-600" /> Delete Selected ({selectedAssessmentIds.length})
            </button>

            <button
              onClick={handleDeleteAll}
              className="btn-3d-secondary py-3 px-4 text-xs gap-1.5 bg-rose-100 text-rose-800 border-rose-300 hover:bg-rose-200 cursor-pointer font-black"
              title="Delete All Assessments"
            >
              <Trash2 className="h-4 w-4 text-rose-700" /> Delete All
            </button>

            <button
              onClick={() => setShowAIGeneratorModal(true)}
              className="btn-3d-primary py-3 px-5 text-xs gap-2 shadow-lg shadow-indigo-600/30"
            >
              <Sparkles className="h-4 w-4 text-indigo-100" /> ✨ AI Generator
            </button>

            <button
              onClick={() => {
                setEditingAssessment(undefined);
                setShowFormModal(true);
              }}
              className="btn-3d-secondary py-3 px-4 text-xs gap-1.5"
            >
              <Plus className="h-4 w-4" /> + Manual Assessment
            </button>
          </div>
        </div>
      </div>

      {/* 3D Metrics Dashboard Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="card-3d p-4.5 rounded-2xl">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Tests</span>
          <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{totalAssessments}</p>
        </div>

        <div className="card-3d-emerald p-4.5 rounded-2xl">
          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300">Active</span>
          <p className="mt-2 text-2xl font-black text-emerald-700 dark:text-emerald-400">{activeAssessments}</p>
        </div>

        <div className="card-3d p-4.5 rounded-2xl">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Inactive</span>
          <p className="mt-2 text-2xl font-black text-slate-600 dark:text-slate-400">{inactiveAssessments}</p>
        </div>

        <div className="card-3d-sky p-4.5 rounded-2xl">
          <span className="text-[10px] font-black uppercase tracking-wider text-sky-700 dark:text-sky-300">Total Questions</span>
          <p className="mt-2 text-2xl font-black text-sky-700 dark:text-sky-400">{totalQuestionsAcrossAll}</p>
        </div>

        <div className="card-3d-indigo p-4.5 rounded-2xl">
          <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-300">Subjects</span>
          <p className="mt-2 text-2xl font-black text-indigo-700 dark:text-indigo-400">{uniqueSubjects.length}</p>
        </div>

        <div className="card-3d-amber p-4.5 rounded-2xl">
          <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-300">Avg Pass Score</span>
          <p className="mt-2 text-2xl font-black text-amber-700 dark:text-amber-400">{avgPassScore}%</p>
        </div>
      </div>

      {/* 3D Quick Generator Presets Bar */}
      <div className="card-3d p-5 rounded-3xl space-y-3">
        <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-2.5">
          <span className="text-xs font-black uppercase tracking-wider text-indigo-900 dark:text-indigo-200 flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" /> Fast AI Assessment Generation Presets
          </span>
          <span className="text-[10px] text-slate-400 font-bold">Click to launch pre-configured AI generator</span>
        </div>

        <div className="flex flex-wrap gap-2.5">
          {[
            { title: 'Mathematics — 50 Qs', subject: 'Mathematics' },
            { title: 'Teacher Pedagogy Cert — 25 Qs', subject: 'Pedagogy' },
            { title: 'Science Skill Test — 10 Qs', subject: 'Science' },
            { title: 'Comprehensive Benchmark — 100 Qs', subject: 'General' },
          ].map(preset => (
            <button
              key={preset.title}
              onClick={() => setShowAIGeneratorModal(true)}
              className="rounded-2xl border border-indigo-200 bg-white dark:bg-slate-900 dark:border-indigo-800/60 px-4 py-2 text-xs font-black text-indigo-700 hover:bg-indigo-600 hover:text-white dark:text-indigo-300 dark:hover:bg-indigo-600 transition-all cursor-pointer shadow-2xs"
            >
              {preset.title}
            </button>
          ))}
        </div>
      </div>

      {/* 3D Search & Filter Bar */}
      <div className="card-3d p-4 rounded-3xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex-1 min-w-[260px]">
          <AnimatedSearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search assessments by title, slug, subject, description..."
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Filter className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
            <span className="font-bold">Subject:</span>
            <select
              value={selectedSubjectFilter}
              onChange={e => setSelectedSubjectFilter(e.target.value)}
              className="input-3d-recessed px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-200"
            >
              <option value="All">All Subjects ({totalAssessments})</option>
              {uniqueSubjects.map(sub => (
                <option key={sub} value={sub}>{sub}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="font-bold">Status:</span>
            <select
              value={selectedStatusFilter}
              onChange={e => setSelectedStatusFilter(e.target.value)}
              className="input-3d-recessed px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-200"
            >
              <option value="All">All Status</option>
              <option value="Active">Active Only ({activeAssessments})</option>
              <option value="Inactive">Inactive Only ({inactiveAssessments})</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3D Assessment Table */}
      {isLoading ? (
        <div className="card-3d p-12 text-center rounded-3xl">
          <RefreshCw className="h-8 w-8 animate-spin text-indigo-600 mx-auto" />
          <p className="mt-3 text-xs font-bold text-slate-500">Loading Skill Assessments...</p>
        </div>
      ) : filteredAssessments.length === 0 ? (
        <div className="card-3d p-12 text-center rounded-3xl space-y-3">
          <Award className="h-12 w-12 text-slate-300 mx-auto" />
          <h3 className="text-sm font-black text-slate-700 dark:text-slate-300">No assessments found</h3>
          <p className="text-xs text-slate-400 font-medium">Try adjusting your search filter or generate a new assessment with AI.</p>
          <button
            onClick={() => setShowAIGeneratorModal(true)}
            className="btn-3d-primary py-2.5 px-5 text-xs gap-2 inline-flex"
          >
            <Sparkles className="h-4 w-4" /> Generate Assessment with AI
          </button>
        </div>
      ) : (
        <div className="card-3d p-6 rounded-3xl overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/80 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase font-black text-slate-500 dark:text-slate-400 tracking-wider">
              <tr>
                <th className="p-3.5 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={filteredAssessments.length > 0 && filteredAssessments.every(a => selectedAssessmentIds.includes(a.id))}
                    onChange={handleToggleSelectAll}
                    className="h-4.5 w-4.5 rounded-lg border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    aria-label="Select all assessments"
                  />
                </th>
                <th className="p-3.5">Generation Date</th>
                <th className="p-3.5">Title</th>
                <th className="p-3.5">Slug</th>
                <th className="p-3.5">Description</th>
                <th className="p-3.5">Subject</th>
                <th className="p-3.5">Duration</th>
                <th className="p-3.5">Pass Score</th>
                <th className="p-3.5">Questions</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {filteredAssessments.map(asm => {
                const isSelected = selectedAssessmentIds.includes(asm.id);
                const genDateStr = asm.createdDate || asm.updatedDate || new Date().toISOString();
                return (
                  <tr key={asm.id} className={`transition-all ${isSelected ? 'bg-indigo-50/60 dark:bg-indigo-950/30' : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'}`}>
                    {/* Select Checkbox */}
                    <td className="p-3.5 w-12 text-center align-top">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(asm.id)}
                        className="h-4.5 w-4.5 rounded-lg border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        aria-label={`Select ${asm.title}`}
                      />
                    </td>

                    {/* Generation Date Mention */}
                    <td className="p-3.5 font-bold text-slate-900 dark:text-white align-top whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                        <span>{formatDateDisplay(genDateStr)}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                        {genDateStr.includes('T') ? genDateStr.split('T')[0] : genDateStr}
                      </span>
                    </td>

                    {/* Title */}
                    <td className="p-3.5 min-w-[200px] align-top">
                      <button
                        onClick={() => setActiveDetailAssessment(asm)}
                        className="text-left font-black text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                      >
                        {asm.title}
                      </button>
                    </td>

                    {/* Slug */}
                    <td className="p-3.5 min-w-[180px] font-mono text-[11px] text-slate-600 dark:text-slate-400 break-all align-top font-bold">
                      {asm.slug}
                    </td>

                    {/* Description - FULLY VISIBLE, NO TRUNCATION */}
                    <td className="p-3.5 min-w-[220px] text-xs text-slate-600 dark:text-slate-400 whitespace-normal break-words align-top font-medium">
                      {asm.description}
                    </td>

                    {/* Subject */}
                    <td className="p-3.5 align-top">
                      <span className="rounded-xl bg-indigo-100 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-800 px-2.5 py-1 text-[11px] font-black text-indigo-800 dark:text-indigo-300 whitespace-nowrap">
                        {asm.subject}
                      </span>
                    </td>

                    {/* Duration */}
                    <td className="p-3.5 font-black text-slate-900 dark:text-white align-top whitespace-nowrap">
                      {asm.duration} mins
                    </td>

                    {/* Pass Score */}
                    <td className="p-3.5 font-black text-emerald-600 dark:text-emerald-400 align-top whitespace-nowrap">
                      {asm.passScore}%
                    </td>

                    {/* Questions */}
                    <td className="p-3.5 font-black text-slate-900 dark:text-white align-top whitespace-nowrap">
                      {asm.totalQuestions || asm.questions?.length || 0} items
                    </td>

                    {/* Actions Column */}
                    <td className="p-3.5 text-right align-top whitespace-nowrap">
                      <button
                        onClick={() => handleDeleteAssessment(asm.id)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-rose-50 border border-rose-200 px-3 py-1.5 text-xs font-extrabold text-rose-600 hover:bg-rose-100 dark:bg-rose-950/50 dark:border-rose-900/50 dark:text-rose-300 transition-all cursor-pointer"
                        title="Delete Assessment"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Delete</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* AI Assessment Generator Modal */}
      {showAIGeneratorModal && (
        <AIAssessmentGeneratorModal
          onClose={() => setShowAIGeneratorModal(false)}
          onAssessmentGenerated={handleAssessmentGeneratedByAI}
        />
      )}

      {/* Manual Form Modal */}
      {showFormModal && (
        <AssessmentFormModal
          initialAssessment={editingAssessment}
          onClose={() => {
            setShowFormModal(false);
            setEditingAssessment(undefined);
          }}
          onSave={handleSaveAssessment}
        />
      )}

      {/* Teacher Certification Test Runner Modal */}
      {activeTestAssessment && (
        <TeacherTestRunnerModal
          assessment={activeTestAssessment}
          onClose={() => setActiveTestAssessment(null)}
        />
      )}
    </div>
  );
};
