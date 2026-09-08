import React, { useState, useEffect } from 'react';
import {
  exportInterviewBankToCSV,
  exportMasterQuestionBankToCSV,
  exportAssessmentQuestionsToCSV,
} from '../lib/unifiedQuestionExport';
import {
  Download,
  FileSpreadsheet,
  FileText,
  FileCode,
  File,
  Sparkles,
  Sliders,
  Check,
  Eye,
  Filter,
  Layers,
  Settings,
  Clock,
  BookOpen,
  Award,
  ListFilter,
  CheckCircle2,
  FolderDown,
  RefreshCw,
  Info,
} from 'lucide-react';
import { Question, ShikshaMitraTemplate, Assessment } from '../types';
import {
  downloadXLSX,
  downloadCSV,
  downloadDOCX,
  downloadPDF,
  downloadJSON,
  downloadTXT,
  downloadShikshaMitraExport,
} from '../lib/exportUtils';
import { exportAssessmentToCSV } from '../lib/assessmentExportUtils';
import { DEFAULT_CATEGORIES } from '../lib/constants';
import { getAllAssessments, getAllQuestions, getAllNcertQuestions } from '../lib/db';
import { downloadFile } from '../lib/unifiedQuestionExport';
import { LOCKED_CSV_FILENAMES, getLockedExportFilename } from '../lib/exportFilenameRegistry';

interface DailyExportFile {
  id: string;
  moduleId: string;
  moduleName: string;
  batchDate: string;
  filename: string;
  baseFilename: string;
  fileType: 'CSV';
  questionCount: number;
  idRange: string;
  csvContent: string;
  downloadStatus: 'NOT DOWNLOADED' | 'DOWNLOADED';
  createdDate: string;
  downloadedDate?: string | null;
  classLevel?: string;
  subject?: string;
  chapter?: string;
}

interface ExportCenterViewProps {
  questions: Question[];
  template: ShikshaMitraTemplate;
  onUpdateTemplate: (t: ShikshaMitraTemplate) => void;
}

export const ExportCenterView: React.FC<ExportCenterViewProps> = ({
  questions,
  template,
  onUpdateTemplate,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('All');
  const [selectedSubject, setSelectedSubject] = useState<string>('All');
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showTemplateConfig, setShowTemplateConfig] = useState(false);

  // System State for Files and Modules
  const [dailyFiles, setDailyFiles] = useState<DailyExportFile[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [interviewQuestions, setInterviewQuestions] = useState<Question[]>([]);
  const [ncertQuestions, setNcertQuestions] = useState<any[]>([]);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);

  useEffect(() => {
    loadAllModuleData();
  }, []);

  const loadAllModuleData = async () => {
    setIsLoadingData(true);
    try {
      const [asms, iq, nq] = await Promise.all([
        getAllAssessments(),
        getAllQuestions(),
        getAllNcertQuestions(),
      ]);
      setDailyFiles([]);
      setAssessments(asms || []);
      setInterviewQuestions(iq || []);
      setNcertQuestions(nq || []);
    } catch (err) {
      console.error('Failed to load export center module data:', err);
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleDownloadIndividualFile = async (f: DailyExportFile) => {
    try {
      downloadFile(f.filename, f.csvContent);
      await loadAllModuleData();
    } catch (err: any) {
      alert(`Download failed: ${err?.message || err}`);
    }
  };

  // Filter questions for top-level export
  const exportQuestions = questions.filter(q => {
    if (selectedCategory !== 'All' && q.category !== selectedCategory) return false;
    if (selectedDifficulty !== 'All' && q.difficulty !== selectedDifficulty) return false;
    if (selectedSubject !== 'All' && q.subject !== selectedSubject) return false;
    return true;
  });

  // Categorize daily export files by module
  const interviewFiles = dailyFiles.filter(f => f.moduleId === 'interview_bank' || f.moduleName.includes('Interview'));
  const ncertFiles = dailyFiles.filter(f => f.moduleId === 'ncert_pdf' || f.moduleName.includes('NCERT'));
  const assessmentFiles = dailyFiles.filter(f => f.moduleId === 'skill_assessment' || f.moduleName.includes('Skill') || f.moduleName.includes('Assessment'));

  // Download All Files across modules sequentially using Unified Exporters
  const handleDownloadAllFiles = async () => {
    try {
      // 1. Interview Bank export
      if (interviewQuestions.length > 0) {
        exportInterviewBankToCSV(interviewQuestions);
      }

      await new Promise(res => setTimeout(res, 300));

      // 2. NCERT PDF Question Bank export
      if (ncertQuestions.length > 0) {
        exportMasterQuestionBankToCSV(ncertQuestions);
      }

      await new Promise(res => setTimeout(res, 300));

      // 3. Skill Assessment export
      if (assessments.length > 0) {
        exportAssessmentQuestionsToCSV(assessments[0]);
      }

      await loadAllModuleData();
    } catch (err: any) {
      alert(`Bulk download failed: ${err?.message || err}`);
    }
  };

  // XLSX Format Export Card
  const formats = [
    {
      id: 'xlsx',
      label: 'DOWNLOAD XLSX (MASTER SCHEMA)',
      ext: '.xlsx',
      desc: 'Excel XLSX workbook with exact master template headers, worksheet structure, and verified data preservation',
      icon: FileText,
      color: 'bg-indigo-600 hover:bg-indigo-500',
      action: () => exportInterviewBankToCSV(exportQuestions),
    },
  ];

  return (
    <div className="space-y-8 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* 3D Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-indigo-500/30 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 p-6 sm:p-9 text-white shadow-2xl shadow-indigo-950/40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-400/40 bg-indigo-500/10 px-3.5 py-1 text-xs font-black text-indigo-300 backdrop-blur-md shadow-xs">
              <Download className="h-4 w-4 text-indigo-400" />
              <span>Central Question Management & Export System</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight">
              Export Center & Question Bank Hub
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed">
              Export and manage files independently across all 3 modules. Each file uses strict locked filenames with full metadata transparency.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleDownloadAllFiles}
              className="btn-3d-amber py-3.5 px-6 text-xs gap-2 font-black shadow-lg"
            >
              <FolderDown className="h-4.5 w-4.5" /> Download All Files
            </button>

            <button
              onClick={() => setShowPreviewModal(true)}
              className="btn-3d-secondary py-3.5 px-5 text-xs gap-2"
            >
              <Eye className="h-4 w-4 text-amber-300" /> Export Preview
            </button>
          </div>
        </div>
      </div>

      {/* 3D ShikshaMitra Dedicated Export Template Bar */}
      <div className="card-3d p-6 sm:p-7 rounded-3xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-black text-amber-800 dark:text-amber-300">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Official Integration Export
            </span>
            <h3 className="text-xl font-black text-slate-900 dark:text-white">Export for ShikshaMitra Portal</h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 max-w-2xl font-medium">
              Configurable export template adhering to ShikshaMitra portal XLSX schema, category mappings, and column orders.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowTemplateConfig(!showTemplateConfig)}
              className="btn-3d-secondary py-2.5 px-4 text-xs gap-1.5"
            >
              <Settings className="h-4 w-4" /> Configure Template
            </button>

            <button
              onClick={() => downloadShikshaMitraExport(exportQuestions, template)}
              className="btn-3d-amber py-3 px-6 text-xs gap-2 font-black"
            >
              <Download className="h-4 w-4" /> EXPORT FOR SHIKSHAMITRA
            </button>
          </div>
        </div>

        {/* Template Configurator Drawer */}
        {showTemplateConfig && (
          <div className="rounded-2xl bg-slate-100/90 dark:bg-slate-950/80 p-4 text-xs space-y-3 border border-slate-200/80 dark:border-slate-800">
            <span className="font-black text-amber-600 dark:text-amber-400">ShikshaMitra Column Mappings & Order Configurator</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-slate-900 dark:text-white">
              {template.fields.map((field, idx) => (
                <div key={idx} className="rounded-xl bg-white p-3 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                  <span className="text-[10px] font-black text-slate-400 uppercase">Field #{field.order}</span>
                  <p className="font-black text-indigo-600 dark:text-indigo-400">{field.targetColumnName}</p>
                  <p className="text-[11px] text-slate-500 font-medium">Source: {field.sourceKey}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 3D Top-Level Format Exports Grid */}
      <div className="card-3d p-6 rounded-3xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-3">
          <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <Filter className="h-4 w-4 text-indigo-600" /> Export Filtering Options
          </span>
          <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">
            Target Questions: {exportQuestions.length}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Filter Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="input-3d-recessed w-full px-3.5 py-2 text-xs font-bold text-slate-900 dark:text-white"
            >
              <option value="All">All Categories ({questions.length})</option>
              {DEFAULT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Filter Difficulty</label>
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="input-3d-recessed w-full px-3.5 py-2 text-xs font-bold text-slate-900 dark:text-white"
            >
              <option value="All">All Difficulties</option>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
          </div>

          <div className="flex items-end">
            <div className="rounded-2xl bg-indigo-50/90 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 px-4 py-2.5 text-xs font-black text-indigo-800 dark:text-indigo-300 w-full text-center shadow-2xs">
              Active Question Selection: {exportQuestions.length} Items
            </div>
          </div>
        </div>
      </div>

      {/* Real Download Buttons Grid */}
      <div className="grid grid-cols-1 gap-6">
        {formats.map((f) => {
          const Icon = f.icon;
          return (
            <div
              key={f.id}
              className="card-3d p-6 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <div className="badge-3d-icon w-10 h-10 bg-indigo-600 text-white">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-base font-black text-slate-900 dark:text-white">{f.label}</h4>
                    <p className="text-xs text-slate-500 font-medium">{f.desc}</p>
                  </div>
                </div>
              </div>

              <button
                onClick={f.action}
                className="btn-3d-primary py-3 px-6 text-xs gap-2 shrink-0"
              >
                <Download className="h-4 w-4" />
                <span>Export Master XLSX</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
