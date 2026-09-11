import React, { useState, useEffect, useMemo } from 'react';
import { LOCKED_CSV_FILENAMES } from '../lib/exportFilenameRegistry';
import { AnimatedSearchInput } from './AnimatedSearchInput';
import {
  exportInterviewBankToCSV,
  exportMasterQuestionBankToCSV,
  exportAssessmentQuestionsToCSV,
} from '../lib/unifiedQuestionExport';
import {
  Search,
  Filter,
  Trash2,
  Download,
  Copy,
  Edit3,
  Eye,
  CheckSquare,
  Square,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  MoreHorizontal,
  CheckCircle2,
  XCircle,
  BookOpen,
  Award,
  Upload,
  FileSpreadsheet,
  Plus,
  FileText,
  FileCode,
  Calendar,
  Layers,
  Check,
  RefreshCw,
} from 'lucide-react';
import { Question, Assessment, NcertQuestion, DailyExportFile } from '../types';
import { MathRenderer } from './academic/MathRenderer';
import {
  getAllAssessments,
  deleteAssessment,
  deleteAssessmentsBatch,
  clearAllAssessments,
  saveAssessment,
  saveQuestionsBatch,
  syncDailyExportFilesWithServer,
  deleteDailyExportFile,
  deleteDailyExportFilesBatch,
  clearAllDailyExportFiles,
  updateDailyExportFileStatus,
  syncNcertBooksWithServer,
  getAllNcertBooks,
  deleteNcertBook,
  deleteNcertChapter,
} from '../lib/db';
import { downloadFile, buildInterviewBankCSV, buildNcertPDFCSV } from '../lib/unifiedQuestionExport';
import { NativeShikshaMitraSolutionRenderer } from './academic/NativeShikshaMitraSolutionRenderer';
import { QuestionTypeBadge } from './QuestionTypeBadge';

interface QuestionBankViewProps {
  questions: Question[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onUpdateQuestion: (q: Question) => void;
  onDeleteQuestion: (id: string) => void;
  onDeleteBatch: (ids: string[]) => void;
  onDuplicateQuestion: (q: Question) => void;
  onOpenQuestionModal: (q: Question) => void;
  onExportSelected: (questions: Question[]) => void;
  initialFilter?: { key: string; val: string };
}

type BankTab = 'interview' | 'ncert' | 'assessments';

export const QuestionBankView: React.FC<QuestionBankViewProps> = ({
  questions,
  searchQuery,
  onSearchChange,
  onUpdateQuestion,
  onDeleteQuestion,
  onDeleteBatch,
  onDuplicateQuestion,
  onOpenQuestionModal,
  onExportSelected,
  initialFilter,
}) => {
  const [activeBankTab, setActiveBankTab] = useState<BankTab>('interview');

  // Sub-view mode for Module 1 and Module 2: 'files' (Single Stored File view) or 'questions' (Individual Items)
  const [viewMode, setViewMode] = useState<Record<BankTab, 'files' | 'questions'>>({
    interview: 'files',
    ncert: 'files',
    assessments: 'files',
  });

  // Stored Generated Export Files State
  const [dailyFiles, setDailyFiles] = useState<DailyExportFile[]>([]);
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);

  // Assessments state for Tab 3
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [isLoadingAssessments, setIsLoadingAssessments] = useState(false);
  const [selectedAssessmentIds, setSelectedAssessmentIds] = useState<string[]>([]);

  // Selection & Deletion handlers
  const handleToggleSelectAllFiles = (files: DailyExportFile[]) => {
    const allIds = files.map(f => f.id);
    if (selectedFileIds.length === allIds.length && allIds.every(id => selectedFileIds.includes(id))) {
      setSelectedFileIds(prev => prev.filter(id => !allIds.includes(id)));
    } else {
      const set = new Set([...selectedFileIds, ...allIds]);
      setSelectedFileIds(Array.from(set));
    }
  };

  const handleToggleSelectFile = (id: string) => {
    setSelectedFileIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleDeleteSelectedFiles = async () => {
    if (selectedFileIds.length === 0) {
      alert('Please select at least one file to delete.');
      return;
    }
    if (window.confirm(`Are you sure you want to delete ${selectedFileIds.length} selected file(s)?`)) {
      await deleteDailyExportFilesBatch(selectedFileIds);
      setDailyFiles(prev => prev.filter(f => !selectedFileIds.includes(f.id)));
      setSelectedFileIds([]);
    }
  };

  const handleDeleteAllFilesModule = async (moduleId: string) => {
    const name = moduleId === 'interview_bank' ? 'Interview Bank' : 'NCERT PDF Question Banks';
    if (window.confirm(`Are you sure you want to DELETE ALL files in ${name}? This cannot be undone.`)) {
      await clearAllDailyExportFiles(moduleId);
      setDailyFiles(prev => prev.filter(f => f.moduleId !== moduleId));
      setSelectedFileIds([]);
    }
  };

  const handleToggleSelectAllAssessments = (asms: Assessment[]) => {
    const allIds = asms.map(a => a.id);
    if (selectedAssessmentIds.length === allIds.length && allIds.every(id => selectedAssessmentIds.includes(id))) {
      setSelectedAssessmentIds([]);
    } else {
      const set = new Set([...selectedAssessmentIds, ...allIds]);
      setSelectedAssessmentIds(Array.from(set));
    }
  };

  const handleToggleSelectAssessment = (id: string) => {
    setSelectedAssessmentIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleDeleteSelectedAssessments = async () => {
    if (selectedAssessmentIds.length === 0) {
      alert('Please select at least one assessment to delete.');
      return;
    }
    if (window.confirm(`Are you sure you want to delete ${selectedAssessmentIds.length} selected assessment(s)?`)) {
      await deleteAssessmentsBatch(selectedAssessmentIds);
      setAssessments(prev => prev.filter(a => !selectedAssessmentIds.includes(a.id)));
      setSelectedAssessmentIds([]);
    }
  };

  const handleDeleteAllAssessmentsModule = async () => {
    if (window.confirm('Are you sure you want to DELETE ALL skill assessments? This action cannot be undone.')) {
      await clearAllAssessments();
      setAssessments([]);
      setSelectedAssessmentIds([]);
    }
  };

  // Import Modal state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importStatus, setImportStatus] = useState<string | null>(null);

  // Native Shiksha Mitra Solution Renderer Modal state
  const [selectedSolutionForRenderer, setSelectedSolutionForRenderer] = useState<any | null>(null);

  // Separate question datasets
  const interviewQuestions = useMemo(() => {
    return questions.filter(q => !q.id?.startsWith('NCERT-') && !(q as any).bookId && (q as any).publisher !== 'NCERT');
  }, [questions]);

  const ncertQuestions = useMemo(() => {
    return questions.filter(q => q.id?.startsWith('NCERT-') || (q as any).publisher === 'NCERT' || (q as any).bookId);
  }, [questions]);

  // Load files and assessments from IndexedDB and Server
  const loadStoredFiles = async () => {
    setIsLoadingFiles(true);
    try {
      // 1. Fetch synced CSV files from local db & server
      const syncedCsvFiles = await syncDailyExportFilesWithServer();
      const filesMap = new Map<string, DailyExportFile>();

      for (const f of syncedCsvFiles) {
        if (f && f.id) {
          filesMap.set(f.id, f);
        }
      }

      // 2. Fetch all books from DB & server to guarantee all uploaded books/chapters (including mobile uploads) appear
      const syncedBooks = await syncNcertBooksWithServer();
      const activeBooks = (syncedBooks || []).filter(b => b.status !== 'ARCHIVED');

      for (const book of activeBooks) {
        const bookDate = book.uploadDate || book.createdAt || new Date().toISOString();
        const bookBatchDate = bookDate.split('T')[0];

        // If book has chapters
        if (book.chapters && book.chapters.length > 0) {
          for (const ch of book.chapters) {
            const chKey = `csv_book_${book.id}_ch_${ch.id || ch.chapterNumber}`;
            if (!filesMap.has(chKey)) {
              const chTitle = ch.chapterTitle || `Chapter ${ch.chapterNumber}`;
              const cleanFileName = `${book.classLevel || 'Class'}_${book.subject || 'Subject'}_${chTitle.replace(/[^a-zA-Z0-9_-]/g, '_')}.csv`;

              filesMap.set(chKey, {
                id: chKey,
                moduleId: 'ncert_pdf',
                moduleName: 'NCERT PDF Question Bank',
                batchDate: bookBatchDate,
                filename: cleanFileName,
                baseFilename: LOCKED_CSV_FILENAMES.ncert_pdf,
                fileType: 'CSV',
                questionCount: ch.estimatedQuestions || 20,
                idRange: `Q000001 - Q0000${ch.estimatedQuestions || 20}`,
                csvContent: '',
                downloadStatus: 'NOT DOWNLOADED',
                createdDate: bookDate,
                classLevel: book.classLevel,
                subject: book.subject,
                chapter: chTitle,
                bookId: book.id,
                chapterId: ch.id,
              });
            }
          }
        } else {
          // Whole textbook entry
          const bookKey = `csv_book_${book.id}_full`;
          if (!filesMap.has(bookKey)) {
            const cleanFileName = `${book.classLevel || 'Class'}_${book.subject || 'Subject'}_FullBook.csv`;
            filesMap.set(bookKey, {
              id: bookKey,
              moduleId: 'ncert_pdf',
              moduleName: 'NCERT PDF Question Bank',
              batchDate: bookBatchDate,
              filename: cleanFileName,
              baseFilename: LOCKED_CSV_FILENAMES.ncert_pdf,
              fileType: 'CSV',
              questionCount: book.totalEstimatedQuestions || 100,
              idRange: `Q000001 - Q000${book.totalEstimatedQuestions || 100}`,
              csvContent: '',
              downloadStatus: 'NOT DOWNLOADED',
              createdDate: bookDate,
              classLevel: book.classLevel,
              subject: book.subject,
              chapter: 'Full Textbook',
              bookId: book.id,
            });
          }
        }
      }

      // 3. Module 1 Interview Bank default file if questions exist
      if (interviewQuestions.length > 0) {
        const interviewKey = 'file_interview_bank_primary';
        if (!filesMap.has(interviewKey)) {
          filesMap.set(interviewKey, {
            id: interviewKey,
            moduleId: 'interview_bank',
            moduleName: 'Interview Bank',
            batchDate: new Date().toISOString().split('T')[0],
            filename: LOCKED_CSV_FILENAMES.interview_bank,
            baseFilename: LOCKED_CSV_FILENAMES.interview_bank,
            fileType: 'CSV',
            questionCount: interviewQuestions.length,
            idRange: `${interviewQuestions[0]?.id || 'Q000001'} - ${interviewQuestions[interviewQuestions.length - 1]?.id || 'Q' + interviewQuestions.length}`,
            csvContent: buildInterviewBankCSV(interviewQuestions),
            downloadStatus: 'NOT DOWNLOADED',
            createdDate: new Date().toISOString(),
            subject: 'Teacher Pedagogy & Subject Knowledge',
          });
        }
      }

      const allList = Array.from(filesMap.values()).sort((a, b) => {
        const tsA = (a as any).updatedTimestamp || new Date(a.createdDate || 0).getTime();
        const tsB = (b as any).updatedTimestamp || new Date(b.createdDate || 0).getTime();
        return tsB - tsA;
      });

      setDailyFiles(allList);
    } catch (err) {
      console.error('Error loading stored files in QuestionBankView:', err);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  useEffect(() => {
    async function loadData() {
      setIsLoadingAssessments(true);
      try {
        const asmData = await getAllAssessments();
        setAssessments(asmData || []);
        await loadStoredFiles();
      } catch (err) {
        console.error('Error loading bank data:', err);
      } finally {
        setIsLoadingAssessments(false);
      }
    }
    loadData();

    const handleFilesChanged = () => {
      loadStoredFiles();
    };

    window.addEventListener('daily-export-files-changed', handleFilesChanged);
    window.addEventListener('ncert-books-changed', handleFilesChanged);

    return () => {
      window.removeEventListener('daily-export-files-changed', handleFilesChanged);
      window.removeEventListener('ncert-books-changed', handleFilesChanged);
    };
  }, [questions.length]);

  // Filters state for Interview
  const [interviewCategory, setInterviewCategory] = useState<string>('All');
  const [interviewDifficulty, setInterviewDifficulty] = useState<string>('All');

  // Filters state for NCERT
  const [ncertSubject, setNcertSubject] = useState<string>('All');
  const [ncertDifficulty, setNcertDifficulty] = useState<string>('All');

  // Filters for Assessments
  const [assessmentSubject, setAssessmentSubject] = useState<string>('All');

  // Filtered Module 1 Files
  const filteredInterviewFiles = useMemo(() => {
    return dailyFiles
      .filter(f => f.moduleId === 'interview_bank')
      .filter(f => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          f.filename.toLowerCase().includes(q) ||
          f.batchDate.toLowerCase().includes(q) ||
          (f.subject && f.subject.toLowerCase().includes(q))
        );
      });
  }, [dailyFiles, searchQuery]);

  // Filtered Module 2 Files
  const filteredNcertFiles = useMemo(() => {
    return dailyFiles
      .filter(f => f.moduleId === 'ncert_pdf')
      .filter(f => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          f.filename.toLowerCase().includes(q) ||
          f.batchDate.toLowerCase().includes(q) ||
          (f.classLevel && f.classLevel.toLowerCase().includes(q)) ||
          (f.subject && f.subject.toLowerCase().includes(q)) ||
          (f.chapter && f.chapter.toLowerCase().includes(q))
        );
      });
  }, [dailyFiles, searchQuery]);

  // Filtered Interview Questions
  const filteredInterviewQuestions = useMemo(() => {
    return interviewQuestions.filter(q => {
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchQ = q.question.toLowerCase().includes(query);
        const matchId = q.id.toLowerCase().includes(query);
        const matchSub = q.subject?.toLowerCase().includes(query) || false;
        if (!matchQ && !matchId && !matchSub) return false;
      }
      if (interviewCategory !== 'All' && q.category !== interviewCategory) return false;
      if (interviewDifficulty !== 'All' && q.difficulty !== interviewDifficulty) return false;
      return true;
    });
  }, [interviewQuestions, searchQuery, interviewCategory, interviewDifficulty]);

  // Filtered NCERT Questions
  const filteredNcertQuestions = useMemo(() => {
    return ncertQuestions.filter(q => {
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchQ = (q as any).text?.toLowerCase().includes(query) || q.question.toLowerCase().includes(query);
        const matchChapter = (q as any).chapter?.toLowerCase().includes(query) || false;
        const matchSubject = q.subject?.toLowerCase().includes(query) || false;
        if (!matchQ && !matchChapter && !matchSubject) return false;
      }
      if (ncertSubject !== 'All' && q.subject !== ncertSubject) return false;
      if (ncertDifficulty !== 'All' && q.difficulty !== ncertDifficulty) return false;
      return true;
    });
  }, [ncertQuestions, searchQuery, ncertSubject, ncertDifficulty]);

  // Filtered Assessments
  const filteredAssessments = useMemo(() => {
    return assessments.filter(a => {
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchTitle = a.title.toLowerCase().includes(query);
        const matchSub = a.subject.toLowerCase().includes(query);
        if (!matchTitle && !matchSub) return false;
      }
      if (assessmentSubject !== 'All' && a.subject !== assessmentSubject) return false;
      return true;
    });
  }, [assessments, searchQuery, assessmentSubject]);

  // Handle Direct Download of File (with status update & dynamic content creation if needed)
  const handleDownloadFile = async (file: DailyExportFile) => {
    try {
      let content = file.csvContent;
      if (!content || content.trim().length === 0) {
        if (file.moduleId === 'ncert_pdf') {
          const relevantQuestions = ncertQuestions.filter(q => {
            if (file.chapter && (q as any).chapter) {
              return (q as any).chapter.includes(file.chapter) || file.chapter.includes((q as any).chapter);
            }
            if (file.subject && q.subject) {
              return q.subject.toLowerCase() === file.subject.toLowerCase();
            }
            return true;
          });
          content = buildNcertPDFCSV(relevantQuestions.length > 0 ? relevantQuestions : ncertQuestions);
        } else {
          content = buildInterviewBankCSV(interviewQuestions);
        }
      }

      downloadFile(file.filename, content);
      await updateDailyExportFileStatus(file.id, 'DOWNLOADED');
      setDailyFiles(prev =>
        prev.map(f => (f.id === file.id ? { ...f, downloadStatus: 'DOWNLOADED', downloadedDate: new Date().toISOString() } : f))
      );
    } catch (err) {
      console.error('Download file failed:', err);
    }
  };

  // Handle Export of Selected File (for Module 1 or Module 2)
  const handleExportSelectedFile = async () => {
    if (selectedFileIds.length === 0) {
      alert('Please tick the checkbox next to at least one file to export it.');
      return;
    }
    const file = dailyFiles.find(f => f.id === selectedFileIds[0]);
    if (!file) {
      alert('Selected file could not be found.');
      return;
    }
    await handleDownloadFile(file);
  };

  // Handle File Deletion
  const handleDeleteFile = async (fileId: string) => {
    if (window.confirm('Are you sure you want to remove this CSV file record?')) {
      await deleteDailyExportFile(fileId);
      setDailyFiles(prev => prev.filter(f => f.id !== fileId));
      setSelectedFileIds(prev => prev.filter(id => id !== fileId));
    }
  };

  // Handle Skill Assessment Export
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
    exportAssessmentQuestionsToCSV(selected);
  };

  // Handle Assessment Delete
  const handleDeleteAssessment = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this skill assessment?')) {
      await deleteAssessment(id);
      setAssessments(prev => prev.filter(a => a.id !== id));
      setSelectedAssessmentIds(prev => prev.filter(x => x !== id));
    }
  };

  // Format Date for clear Indian & International view (e.g. 14 Aug 2026)
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

  // Handle Built-in CSV/JSON Import
  const handleExecuteImport = async () => {
    if (!importText.trim()) {
      setImportStatus('Please provide CSV or JSON data to import.');
      return;
    }
    try {
      if (importText.trim().startsWith('[') || importText.trim().startsWith('{')) {
        const parsed = JSON.parse(importText);
        const items = Array.isArray(parsed) ? parsed : [parsed];
        if (activeBankTab === 'interview') {
          const newQ: Question[] = items.map((item, idx) => ({
            id: item.id || `SM-IMP-${Date.now()}-${idx}`,
            question: item.question || item.text,
            category: item.category || 'Subject Knowledge',
            difficulty: item.difficulty || 'Medium',
            subject: item.subject || 'General',
            questionType: item.questionType || 'Conceptual',
            timeLimit: item.timeLimit || 90,
            maxScore: item.maxScore || 10,
            tags: item.tags || [],
            hint: item.hint || '',
            active: true,
            qualityScore: 95,
            duplicateSimilarity: 0,
            createdDate: new Date().toISOString(),
            updatedDate: new Date().toISOString(),
          }));
          await saveQuestionsBatch(newQ);
          window.location.reload();
        } else if (activeBankTab === 'assessments') {
          for (const asm of items) {
            await saveAssessment(asm);
          }
          const updatedAsm = await getAllAssessments();
          setAssessments(updatedAsm);
        }
        setImportStatus('Import completed successfully!');
        setIsImportModalOpen(false);
        setImportText('');
      } else {
        // Simple CSV parser
        const lines = importText.split('\n').filter(l => l.trim());
        if (lines.length < 2) throw new Error('CSV must have header and at least one data row.');
        const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
        const newQuestions: Question[] = [];

        for (let i = 1; i < lines.length; i++) {
          const vals = lines[i].split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
          const rowObj: Record<string, string> = {};
          headers.forEach((h, idx) => {
            rowObj[h] = vals[idx] || '';
          });

          newQuestions.push({
            id: rowObj['id'] || `SM-CSV-${Date.now()}-${i}`,
            question: rowObj['question'] || rowObj['text'] || 'Imported Question',
            category: rowObj['category'] || rowObj['chapter'] || 'General',
            difficulty: (rowObj['difficulty'] as any) || 'Medium',
            subject: rowObj['subject'] || 'General',
            questionType: rowObj['type'] || 'mcq',
            timeLimit: 90,
            maxScore: Number(rowObj['marks']) || 10,
            tags: [rowObj['subject'] || 'Import'],
            hint: rowObj['hint'] || '',
            active: true,
            qualityScore: 92,
            duplicateSimilarity: 0,
            createdDate: new Date().toISOString(),
            updatedDate: new Date().toISOString(),
          });
        }
        await saveQuestionsBatch(newQuestions);
        window.location.reload();
      }
    } catch (err: any) {
      setImportStatus('Import failed: ' + err.message);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header & Main Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <h1
            className="text-2xl font-black text-slate-900 dark:text-white tracking-tight"
          >
            Central Question Management Module
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Stored generated CSV files, direct date tracking, class-subject-chapter metadata, tick-box selection, and one-click export.
          </p>
        </div>

        {/* Action Buttons Top Bar */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="btn-3d-secondary py-2 px-4 text-xs font-bold gap-2 cursor-pointer"
          >
            <Upload strokeWidth={1.75} className="h-4 w-4" />
            Bulk Import
          </button>

          {/* Module 1 Export Button */}
          {activeBankTab === 'interview' && (
            <button
              onClick={() => {
                if (viewMode.interview === 'files') {
                  handleExportSelectedFile();
                } else {
                  exportInterviewBankToCSV(interviewQuestions);
                }
              }}
              className={`btn-3d-primary py-2 px-4 text-xs font-bold gap-2 cursor-pointer ${
                viewMode.interview === 'files' && selectedFileIds.length === 0
                  ? 'opacity-60 cursor-not-allowed'
                  : ''
              }`}
              title={
                viewMode.interview === 'files'
                  ? selectedFileIds.length > 0
                    ? 'Export Selected Interview XLSX File'
                    : 'Select a file checkbox below to export'
                  : 'Export Interview Bank (XLSX)'
              }
            >
              <Download strokeWidth={1.75} className="h-4 w-4" />
              <span>
                {viewMode.interview === 'files' ? 'Export Selected File (XLSX)' : 'Export Interview Bank (XLSX)'}
              </span>
            </button>
          )}

          {/* Module 2 Export Button */}
          {activeBankTab === 'ncert' && (
            <button
              onClick={() => {
                if (viewMode.ncert === 'files') {
                  handleExportSelectedFile();
                } else {
                  exportMasterQuestionBankToCSV(ncertQuestions);
                }
              }}
              className={`btn-3d-primary py-2 px-4 text-xs font-bold gap-2 cursor-pointer ${
                viewMode.ncert === 'files' && selectedFileIds.length === 0
                  ? 'opacity-60 cursor-not-allowed'
                  : ''
              }`}
              title={
                viewMode.ncert === 'files'
                  ? selectedFileIds.length > 0
                    ? 'Export Selected NCERT XLSX File'
                    : 'Select a file checkbox below to export'
                  : 'Export NCERT Bank (16-Col XLSX)'
              }
            >
              <Download strokeWidth={1.75} className="h-4 w-4" />
              <span>
                {viewMode.ncert === 'files' ? 'Export Selected File (XLSX)' : 'Export NCERT Bank (XLSX)'}
              </span>
            </button>
          )}

          {/* Module 3 Export Button */}
          {activeBankTab === 'assessments' && (
            <button
              onClick={handleExportSelectedAssessment}
              className={`btn-3d-primary py-2 px-4 text-xs font-bold gap-2 cursor-pointer ${
                selectedAssessmentIds.length > 0
                  ? ''
                  : 'opacity-60 cursor-not-allowed'
              }`}
              title={selectedAssessmentIds.length > 0 ? 'Export Selected Assessment Question Bank (XLSX)' : 'Select an assessment checkbox below first to export'}
            >
              <Download strokeWidth={1.75} className="h-4 w-4" />
              Export Selected Assessment (XLSX)
            </button>
          )}
        </div>
      </div>

      {/* 3 Isolated Module Tabs / Question Store Grid Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Module 1 Tile: Interview Bank */}
        <button
          onClick={() => { setActiveBankTab('interview'); setSelectedFileIds([]); }}
          className={`card-3d flex items-center justify-between p-4 sm:p-5 rounded-2xl text-left transition-all duration-200 cursor-pointer ${
            activeBankTab === 'interview' ? 'ring-2 ring-slate-800 dark:ring-slate-200 shadow-md' : 'hover:-translate-y-1'
          }`}
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-xs">
              <Sparkles strokeWidth={1.75} className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Module 1</p>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">Interview Bank</h3>
            </div>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
            {interviewQuestions.length}
          </span>
        </button>

        {/* Module 2 Tile: NCERT Question Banks */}
        <button
          onClick={() => { setActiveBankTab('ncert'); setSelectedFileIds([]); }}
          className={`card-3d flex items-center justify-between p-4 sm:p-5 rounded-2xl text-left transition-all duration-200 cursor-pointer ${
            activeBankTab === 'ncert' ? 'ring-2 ring-slate-800 dark:ring-slate-200 shadow-md' : 'hover:-translate-y-1'
          }`}
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-xs">
              <BookOpen strokeWidth={1.75} className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Module 2</p>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">NCERT PDF Question Banks</h3>
            </div>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
            {ncertQuestions.length}
          </span>
        </button>

        {/* Module 3 Tile: Skill Assessments */}
        <button
          onClick={() => { setActiveBankTab('assessments'); setSelectedAssessmentIds([]); }}
          className={`card-3d flex items-center justify-between p-4 sm:p-5 rounded-2xl text-left transition-all duration-200 cursor-pointer ${
            activeBankTab === 'assessments' ? 'ring-2 ring-slate-800 dark:ring-slate-200 shadow-md' : 'hover:-translate-y-1'
          }`}
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-xs">
              <Award strokeWidth={1.75} className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Module 3</p>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">Skill Assessments</h3>
            </div>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
            {assessments.length}
          </span>
        </button>
      </div>

      {/* Search & View Toggle Toolbar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex-1 w-full">
          <AnimatedSearchInput
            value={searchQuery}
            onChange={onSearchChange}
            placeholder={`Search ${activeBankTab === 'interview' ? 'Interview Bank files or questions...' : activeBankTab === 'ncert' ? 'NCERT PDF files, class, subject, chapter...' : 'Skill Assessments...'}`}
          />
        </div>

        {/* Mode Toggle for Module 1 & Module 2 */}
        {(activeBankTab === 'interview' || activeBankTab === 'ncert') && (
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setViewMode(v => ({ ...v, [activeBankTab]: 'files' }))}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                viewMode[activeBankTab] === 'files'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span>Single Files Store</span>
            </button>
            <button
              onClick={() => setViewMode(v => ({ ...v, [activeBankTab]: 'questions' }))}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                viewMode[activeBankTab] === 'questions'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>All Questions ({activeBankTab === 'interview' ? interviewQuestions.length : ncertQuestions.length})</span>
            </button>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: MODULE 1 INTERVIEW BANK PANEL */}
      {/* ========================================================================= */}
      {activeBankTab === 'interview' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          {/* Header */}
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-black text-slate-900 dark:text-white">
                Module 1: Interview Bank — {viewMode.interview === 'files' ? 'Stored Generated CSV Files' : `All Questions (${filteredInterviewQuestions.length})`}
              </h2>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                {viewMode.interview === 'files'
                  ? 'Select a file using the tick box to export or click download. Each file records generation date and ID range.'
                  : 'Individual question items in the permanent Interview Bank repository.'}
              </p>
            </div>
            {viewMode.interview === 'files' && filteredInterviewFiles.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDeleteSelectedFiles}
                  disabled={selectedFileIds.length === 0}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedFileIds.length > 0
                      ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-60'
                  }`}
                >
                  Delete Selected ({selectedFileIds.length})
                </button>
                <button
                  onClick={() => handleDeleteAllFilesModule('interview_bank')}
                  className="px-3 py-1.5 rounded-xl text-xs font-black bg-rose-100 text-rose-800 border border-rose-300 hover:bg-rose-200 cursor-pointer"
                >
                  Delete All
                </button>
                <span className="px-3 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 text-xs font-bold">
                  {filteredInterviewFiles.length} File{filteredInterviewFiles.length > 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>

          {/* Files View Table */}
          {viewMode.interview === 'files' ? (
            filteredInterviewFiles.length === 0 ? (
              <div className="p-12 text-center">
                <FileSpreadsheet className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No generated Interview Bank files found</p>
                <p className="text-xs text-slate-400 mt-1">Generate questions in Interview Bank or import CSV to store file records.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] font-black uppercase text-slate-400 bg-slate-50/50 dark:bg-slate-800/50">
                      <th className="p-4 w-12 text-center">
                        <input
                          type="checkbox"
                          checked={filteredInterviewFiles.length > 0 && filteredInterviewFiles.every(f => selectedFileIds.includes(f.id))}
                          onChange={() => handleToggleSelectAllFiles(filteredInterviewFiles)}
                          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          aria-label="Select all interview files"
                        />
                      </th>
                      <th className="p-4">Generation Date</th>
                      <th className="p-4">File Name</th>
                      <th className="p-4">Domain / Focus</th>
                      <th className="p-4">Questions</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredInterviewFiles.map(file => {
                      const isSelected = selectedFileIds.includes(file.id);
                      return (
                        <tr
                          key={file.id}
                          className={`transition-colors ${
                            isSelected ? 'bg-indigo-50/60 dark:bg-indigo-950/30' : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/40'
                          }`}
                        >
                          {/* Select Checkbox (Tick box) */}
                          <td className="p-4 w-12 text-center align-middle">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelectFile(file.id)}
                              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                              aria-label={`Select ${file.filename}`}
                            />
                          </td>

                          {/* Generation Date Mention */}
                          <td className="p-4 font-bold text-slate-900 dark:text-white align-middle whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                              <span>{formatDateDisplay(file.createdDate || file.batchDate)}</span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                              {file.batchDate}
                            </span>
                          </td>

                          {/* File Name */}
                          <td className="p-4 font-mono font-bold text-indigo-600 dark:text-indigo-400 align-middle whitespace-nowrap">
                            {file.filename}
                          </td>

                          {/* Domain / Focus */}
                          <td className="p-4 font-semibold text-slate-700 dark:text-slate-300 align-middle">
                            {file.subject || 'Teaching Knowledge & Pedagogy'}
                          </td>

                          {/* Questions Count & ID Range */}
                          <td className="p-4 align-middle whitespace-nowrap">
                            <span className="font-extrabold text-slate-900 dark:text-white">
                              {file.questionCount} items
                            </span>
                            <span className="text-[10px] text-slate-400 block font-mono">
                              ({file.idRange})
                            </span>
                          </td>

                          {/* Download Status */}
                          <td className="p-4 align-middle whitespace-nowrap">
                            <span
                              className={`px-2.5 py-1 rounded-xl text-[10px] font-extrabold ${
                                file.downloadStatus === 'DOWNLOADED'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              }`}
                            >
                              {file.downloadStatus}
                            </span>
                          </td>

                          {/* Action Buttons: Download and Delete */}
                          <td className="p-4 text-right align-middle whitespace-nowrap space-x-2">
                            <button
                              onClick={() => handleDownloadFile(file)}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:border-emerald-900/50 dark:text-emerald-300 transition-all cursor-pointer"
                              title="Download CSV"
                            >
                              <Download className="h-3.5 w-3.5" />
                              <span>Download</span>
                            </button>

                            <button
                              onClick={() => handleDeleteFile(file.id)}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-rose-50 border border-rose-200 px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-100 dark:bg-rose-950/40 dark:border-rose-900/50 dark:text-rose-400 transition-all cursor-pointer"
                              title="Delete File Record"
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
            )
          ) : (
            /* Individual Questions View */
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] font-black uppercase text-slate-400 bg-slate-50/50 dark:bg-slate-800/50">
                    <th className="p-4">ID</th>
                    <th className="p-4">Format / Type</th>
                    <th className="p-4">Question</th>
                    <th className="p-4">Category</th>
                    <th className="p-4">Difficulty</th>
                    <th className="p-4">Subject</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {filteredInterviewQuestions.map(q => (
                    <tr key={q.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">{q.id}</td>
                      <td className="p-4">
                        <QuestionTypeBadge type={q.questionType || 'Conceptual'} />
                      </td>
                      <td className="p-4 font-medium text-slate-800 dark:text-slate-200 max-w-md truncate">
                        <MathRenderer text={q.question} />
                      </td>
                      <td className="p-4 font-semibold text-slate-600 dark:text-slate-400">{q.category}</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-xl text-[10px] font-extrabold ${q.difficulty === 'Easy' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : q.difficulty === 'Medium' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'}`}>
                          {q.difficulty}
                        </span>
                      </td>
                      <td className="p-4 text-slate-600 dark:text-slate-400">{q.subject}</td>
                      <td className="p-4 text-right space-x-2">
                        <button
                          onClick={() => setSelectedSolutionForRenderer(q)}
                          title="View Native Shiksha Mitra Solution"
                          className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-300 transition-all cursor-pointer border border-indigo-200/60 dark:border-indigo-800"
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => onOpenQuestionModal(q)} title="View / Edit" className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 hover:text-indigo-600 transition-all cursor-pointer">
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => onDuplicateQuestion(q)} title="Duplicate" className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 hover:text-emerald-600 transition-all cursor-pointer">
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => onDeleteQuestion(q.id)} title="Delete" className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 hover:text-rose-600 transition-all cursor-pointer">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: MODULE 2 NCERT PDF QUESTION BANKS PANEL */}
      {/* ========================================================================= */}
      {activeBankTab === 'ncert' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          {/* Header */}
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-black text-slate-900 dark:text-white">
                Module 2: NCERT PDF Question Banks — {viewMode.ncert === 'files' ? 'Stored Generated CSV Files' : `All Questions (${filteredNcertQuestions.length})`}
              </h2>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                {viewMode.ncert === 'files'
                  ? 'Each generated file shows its Generation Date, Class, Subject, and specific Chapter(s) coverage.'
                  : 'Individual questions extracted from textbook PDFs.'}
              </p>
            </div>
            {viewMode.ncert === 'files' && filteredNcertFiles.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDeleteSelectedFiles}
                  disabled={selectedFileIds.length === 0}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedFileIds.length > 0
                      ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-60'
                  }`}
                >
                  Delete Selected ({selectedFileIds.length})
                </button>
                <button
                  onClick={() => handleDeleteAllFilesModule('ncert_pdf')}
                  className="px-3 py-1.5 rounded-xl text-xs font-black bg-rose-100 text-rose-800 border border-rose-300 hover:bg-rose-200 cursor-pointer"
                >
                  Delete All
                </button>
                <span className="px-3 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                  {filteredNcertFiles.length} File{filteredNcertFiles.length > 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>

          {/* Files View Table with Class, Subject, Chapter metadata and Tick Box */}
          {viewMode.ncert === 'files' ? (
            filteredNcertFiles.length === 0 ? (
              <div className="p-12 text-center">
                <BookOpen className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No generated NCERT PDF files found</p>
                <p className="text-xs text-slate-400 mt-1">Upload a textbook in NCERT PDF Generator to create source-grounded question files.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] font-black uppercase text-slate-400 bg-slate-50/50 dark:bg-slate-800/50">
                      <th className="p-4 w-12 text-center">
                        <input
                          type="checkbox"
                          checked={filteredNcertFiles.length > 0 && filteredNcertFiles.every(f => selectedFileIds.includes(f.id))}
                          onChange={() => handleToggleSelectAllFiles(filteredNcertFiles)}
                          className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                          aria-label="Select all ncert files"
                        />
                      </th>
                      <th className="p-4">Generation Date</th>
                      <th className="p-4">File Name</th>
                      <th className="p-4">Class</th>
                      <th className="p-4">Subject</th>
                      <th className="p-4">Chapter(s) Coverage</th>
                      <th className="p-4">Questions</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredNcertFiles.map(file => {
                      const isSelected = selectedFileIds.includes(file.id);
                      const isAllChapters = file.chapter && (
                        file.chapter.toLowerCase().includes('all') ||
                        file.chapter.toLowerCase().includes('ch 1 - 10')
                      );

                      return (
                        <tr
                          key={file.id}
                          className={`transition-colors ${
                            isSelected ? 'bg-emerald-50/60 dark:bg-emerald-950/30' : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/40'
                          }`}
                        >
                          {/* Select Checkbox (Tick box) */}
                          <td className="p-4 w-12 text-center align-middle">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelectFile(file.id)}
                              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                              aria-label={`Select ${file.filename}`}
                            />
                          </td>

                          {/* Generation Date Mention */}
                          <td className="p-4 font-bold text-slate-900 dark:text-white align-middle whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                              <span>{formatDateDisplay(file.createdDate || file.batchDate)}</span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                              {file.batchDate}
                            </span>
                          </td>

                          {/* File Name */}
                          <td className="p-4 font-mono font-bold text-emerald-600 dark:text-emerald-400 align-middle whitespace-nowrap">
                            {file.filename}
                          </td>

                          {/* Class */}
                          <td className="p-4 align-middle whitespace-nowrap">
                            <span className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 font-extrabold text-slate-800 dark:text-slate-200 text-[11px]">
                              {file.classLevel || 'Class 6'}
                            </span>
                          </td>

                          {/* Subject */}
                          <td className="p-4 font-bold text-slate-800 dark:text-slate-200 align-middle whitespace-nowrap">
                            {file.subject || 'Mathematics'}
                          </td>

                          {/* Chapter(s) Coverage - Highlighted clearly */}
                          <td className="p-4 align-middle min-w-[200px]">
                            {isAllChapters ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-black text-[11px]">
                                <Layers className="h-3 w-3" />
                                {file.chapter || 'All Chapters (Ch 1 - 10)'}
                              </span>
                            ) : (
                              <span className="font-semibold text-slate-700 dark:text-slate-300 text-xs">
                                {file.chapter || 'Chapter 1: Patterns in Mathematics'}
                              </span>
                            )}
                          </td>

                          {/* Questions Count */}
                          <td className="p-4 align-middle whitespace-nowrap">
                            <span className="font-extrabold text-slate-900 dark:text-white">
                              {file.questionCount} items
                            </span>
                            <span className="text-[10px] text-slate-400 block font-mono">
                              ({file.idRange})
                            </span>
                          </td>

                          {/* Status */}
                          <td className="p-4 align-middle whitespace-nowrap">
                            <span
                              className={`px-2.5 py-1 rounded-xl text-[10px] font-extrabold ${
                                file.downloadStatus === 'DOWNLOADED'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              }`}
                            >
                              {file.downloadStatus}
                            </span>
                          </td>

                          {/* Actions: Download & Delete */}
                          <td className="p-4 text-right align-middle whitespace-nowrap space-x-2">
                            <button
                              onClick={() => {
                                // If file contains questions array or data, pass to renderer
                                if ((file as any).data) {
                                  setSelectedSolutionForRenderer((file as any).data);
                                } else {
                                  setSelectedSolutionForRenderer({
                                    chapterTitle: file.chapter || file.filename,
                                    bookTitle: file.subject || 'NCERT Book',
                                    classLevel: file.classLevel || 'Class 6',
                                    subject: file.subject || 'English',
                                    questionText: `Questions from ${file.filename}`,
                                    finalAnswer: 'All solutions in this file are natively mapped without watermarks.',
                                    steps: [
                                      { stepNumber: 1, title: 'Dataset Verification', body: 'Verified against NCERT/CBSE standards.' },
                                      { stepNumber: 2, title: 'Clean Rendering', body: 'Formatted with zero external watermarks or third-party dependencies.' }
                                    ]
                                  });
                                }
                              }}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-50 border border-indigo-200/80 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:border-indigo-900/50 dark:text-indigo-300 transition-all cursor-pointer"
                              title="Preview in Native Solution Renderer"
                            >
                              <Sparkles className="h-3.5 w-3.5" />
                              <span>Native View</span>
                            </button>

                            <button
                              onClick={() => handleDownloadFile(file)}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:border-emerald-900/50 dark:text-emerald-300 transition-all cursor-pointer"
                              title="Download CSV"
                            >
                              <Download className="h-3.5 w-3.5" />
                              <span>Download</span>
                            </button>

                            <button
                              onClick={() => handleDeleteFile(file.id)}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-rose-50 border border-rose-200 px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-100 dark:bg-rose-950/40 dark:border-rose-900/50 dark:text-rose-400 transition-all cursor-pointer"
                              title="Delete File Record"
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
            )
          ) : (
            /* Individual Questions View */
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] font-black uppercase text-slate-400 bg-slate-50/50 dark:bg-slate-800/50">
                    <th className="p-4">ID</th>
                    <th className="p-4">Format</th>
                    <th className="p-4">Chapter / Topic</th>
                    <th className="p-4">Question Text</th>
                    <th className="p-4">Difficulty</th>
                    <th className="p-4">Marks</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {filteredNcertQuestions.map(q => (
                    <tr key={q.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">{q.id}</td>
                      <td className="p-4">
                        <QuestionTypeBadge type={(q as any).questionType || (q as any).type || 'Short Answer Question'} />
                      </td>
                      <td className="p-4 font-semibold text-slate-800 dark:text-slate-200">{(q as any).chapter || q.category}</td>
                      <td className="p-4 font-medium text-slate-800 dark:text-slate-200 max-w-md truncate">
                        <MathRenderer text={q.question} />
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-xl text-[10px] font-extrabold ${q.difficulty === 'Easy' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : q.difficulty === 'Medium' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'}`}>
                          {q.difficulty}
                        </span>
                      </td>
                      <td className="p-4 font-bold text-slate-700 dark:text-slate-300">{q.maxScore || 1}</td>
                      <td className="p-4 text-right space-x-2">
                        <button
                          onClick={() => setSelectedSolutionForRenderer(q)}
                          title="View Native Shiksha Mitra Solution"
                          className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-300 transition-all cursor-pointer border border-indigo-200/60 dark:border-indigo-800"
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => onOpenQuestionModal(q)} title="View / Edit" className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 hover:text-emerald-600 transition-all cursor-pointer">
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => onDeleteQuestion(q.id)} title="Delete" className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 hover:text-rose-600 transition-all cursor-pointer">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: MODULE 3 SKILL ASSESSMENTS PANEL */}
      {/* ========================================================================= */}
      {activeBankTab === 'assessments' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-black text-slate-900 dark:text-white">Module 3: Skill Assessments ({filteredAssessments.length})</h2>
              <p className="text-xs text-slate-400 font-medium">Select assessment(s) using checkboxes below to export or delete.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleExportSelectedAssessment}
                disabled={selectedAssessmentIds.length === 0}
                className={`flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-xs font-bold transition-all ${
                  selectedAssessmentIds.length > 0
                    ? 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/20 cursor-pointer'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 cursor-not-allowed opacity-70'
                }`}
                title={selectedAssessmentIds.length > 0 ? 'Export Selected Assessment Question Bank (CSV)' : 'Select an assessment checkbox below first to export'}
              >
                <Download className="h-4 w-4" />
                <span>Export Selected</span>
              </button>
              <button
                onClick={handleDeleteSelectedAssessments}
                disabled={selectedAssessmentIds.length === 0}
                className={`px-3 py-2.5 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
                  selectedAssessmentIds.length > 0
                    ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                    : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
                }`}
              >
                Delete Selected ({selectedAssessmentIds.length})
              </button>
              <button
                onClick={handleDeleteAllAssessmentsModule}
                className="px-3 py-2.5 rounded-2xl border border-rose-300 bg-rose-100 text-rose-800 hover:bg-rose-200 text-xs font-black transition-all cursor-pointer"
              >
                Delete All
              </button>
            </div>
          </div>
          {filteredAssessments.length === 0 ? (
            <div className="p-12 text-center">
              <Award className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No Skill Assessments found</p>
              <p className="text-xs text-slate-400 mt-1">Create or import teacher skill assessments in the Skill Assessments section.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] font-black uppercase text-slate-400 bg-slate-50/50 dark:bg-slate-800/50">
                    <th className="p-4 w-12 text-center">
                      <input
                        type="checkbox"
                        checked={filteredAssessments.length > 0 && filteredAssessments.every(a => selectedAssessmentIds.includes(a.id))}
                        onChange={() => handleToggleSelectAllAssessments(filteredAssessments)}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        aria-label="Select all assessments"
                      />
                    </th>
                    <th className="p-4">Generation Date</th>
                    <th className="p-4">Title</th>
                    <th className="p-4">Slug</th>
                    <th className="p-4">Description</th>
                    <th className="p-4">Subject</th>
                    <th className="p-4">Duration</th>
                    <th className="p-4">Pass Score</th>
                    <th className="p-4">Questions</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredAssessments.map(asm => {
                    const isSelected = selectedAssessmentIds.includes(asm.id);
                    return (
                      <tr key={asm.id} className={`transition-colors ${isSelected ? 'bg-indigo-50/50 dark:bg-indigo-950/20' : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/40'}`}>
                        {/* Select Checkbox */}
                        <td className="p-4 w-12 text-center align-top">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectAssessment(asm.id)}
                            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            aria-label={`Select ${asm.title}`}
                          />
                        </td>

                        {/* Generation Date Mention */}
                        <td className="p-4 font-bold text-slate-900 dark:text-white align-top whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3.5 w-3.5 text-purple-500 shrink-0" />
                            <span>{formatDateDisplay(asm.createdDate || asm.updatedDate || new Date().toISOString())}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                            {(asm.createdDate || asm.updatedDate || new Date().toISOString()).includes('T')
                              ? (asm.createdDate || asm.updatedDate || new Date().toISOString()).split('T')[0]
                              : (asm.createdDate || asm.updatedDate || new Date().toISOString())}
                          </span>
                        </td>

                        {/* Title */}
                        <td className="p-4 min-w-[200px] font-bold text-slate-900 dark:text-white align-top">
                          {asm.title}
                        </td>

                        {/* Slug */}
                        <td className="p-4 min-w-[180px] font-mono text-[11px] text-slate-600 dark:text-slate-400 break-all align-top">
                          {asm.slug}
                        </td>

                        {/* Description */}
                        <td className="p-4 min-w-[220px] text-xs text-slate-600 dark:text-slate-400 whitespace-normal break-words align-top">
                          {asm.description}
                        </td>

                        {/* Subject */}
                        <td className="p-4 font-semibold text-slate-600 dark:text-slate-400 align-top">
                          <span className="rounded-xl bg-indigo-50 border border-indigo-200/80 px-2.5 py-1 text-[11px] font-bold text-indigo-700 dark:bg-indigo-950 dark:border-indigo-800 dark:text-indigo-300 whitespace-nowrap">
                            {asm.subject}
                          </span>
                        </td>

                        {/* Duration */}
                        <td className="p-4 font-bold text-slate-900 dark:text-white align-top whitespace-nowrap">
                          {asm.duration} mins
                        </td>

                        {/* Pass Score */}
                        <td className="p-4 font-bold text-emerald-600 dark:text-emerald-400 align-top whitespace-nowrap">
                          {asm.passScore}%
                        </td>

                        {/* Questions */}
                        <td className="p-4 font-extrabold text-slate-900 dark:text-white align-top whitespace-nowrap space-y-1">
                          <div>{asm.totalQuestions || asm.questions?.length || 0} items</div>
                          <QuestionTypeBadge type={(asm as any).questionType || asm.questions?.[0]?.type || asm.questions?.[0]?.questionType || 'MCQ'} />
                        </td>

                        {/* Actions Column */}
                        <td className="p-4 text-right align-top whitespace-nowrap">
                          <button
                            onClick={() => handleDeleteAssessment(asm.id)}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-rose-50 border border-rose-200/80 px-2.5 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-100 dark:bg-rose-950/40 dark:border-rose-900/50 dark:text-rose-400 transition-all cursor-pointer"
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
        </div>
      )}

      {/* Built-in Bulk Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <h3 className="text-base font-black text-slate-900 dark:text-white">Bulk Import to {activeBankTab.toUpperCase()}</h3>
              <button onClick={() => setIsImportModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">✕</button>
            </div>
            <p className="text-xs text-slate-500">
              Paste CSV rows (with headers) or JSON array of questions to import directly into this module.
            </p>
            <textarea
              rows={8}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder="Paste CSV or JSON here..."
              className="w-full p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs font-mono"
            />
            {importStatus && (
              <p className={`text-xs font-bold ${importStatus.includes('success') ? 'text-emerald-600' : 'text-rose-600'}`}>{importStatus}</p>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setIsImportModalOpen(false)} className="px-4 py-2 rounded-xl border text-xs font-bold cursor-pointer">Cancel</button>
              <button onClick={handleExecuteImport} className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-lg cursor-pointer">Import Now</button>
            </div>
          </div>
        </div>
      )}

      {/* Native Shiksha Mitra Solution Renderer Modal */}
      {selectedSolutionForRenderer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-md animate-in fade-in duration-200">
          <NativeShikshaMitraSolutionRenderer
            data={selectedSolutionForRenderer}
            variant="modal"
            onClose={() => setSelectedSolutionForRenderer(null)}
          />
        </div>
      )}
    </div>
  );
};
