import React, { useState, useEffect, useMemo } from 'react';
import { exportMasterQuestionBankToCSV } from '../lib/unifiedQuestionExport';
import {
  BookOpen,
  Upload,
  FileText,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Trash2,
  Download,
  Eye,
  Sparkles,
  Layers,
  ShieldCheck,
  FileSpreadsheet,
  X,
  Plus,
  Archive,
  BookMarked,
  Check,
  Clock,
  HelpCircle,
  Pencil,
  BookPlus,
  Folder,
  Search,
} from 'lucide-react';
import { NcertBook, NcertChapter, NcertQuestion, NcertGeneratorConfig, NcertGenerationProgressReport, Question, DailyExportFile } from '../types';
import { ProcessingMode, getSavedModelSelection, getSavedProcessingMode } from '../lib/geminiModels';
import { GeminiModelSelector } from './GeminiModelSelector';
import {
  getAllNcertBooks,
  saveNcertBook,
  deleteNcertBook,
  deleteNcertChapter,
  syncNcertBooksWithServer,
  getNcertBookById,
  saveQuestionsBatch,
  saveNcertQuestionsBatch,
  saveDailyExportFile,
  updateDailyExportFileStatus,
} from '../lib/db';
import { LOCKED_CSV_FILENAMES } from '../lib/exportFilenameRegistry';
import { LOCKED_ALLOWED_QUESTION_TYPES } from '../lib/constants';
import { buildNcertPDFCSV } from '../lib/unifiedQuestionExport';
import { ChapterThumbnailCard } from './ChapterThumbnailCard';
import { InteractivePdfViewer } from './InteractivePdfViewer';
import { DirectLocalUploadModal } from './DirectLocalUploadModal';
import { SubjectBlueprintSelector } from './SubjectBlueprintSelector';
import { getBlueprintQuestionTypesForSubject, detectSubjectCategory } from '../lib/subjectBlueprintMapping';

export function cleanBookTitle(title: string | undefined | null): string {
  if (!title) return '';
  return title.replace(/\.pdf$/i, '').trim();
}

// State persistence keys for NCERT selection panel
const NCERT_PERSIST_CLASS_KEY = 'shiksha_ncert_selected_class_v2';
const NCERT_PERSIST_SUBJECT_KEY = 'shiksha_ncert_selected_subject_v2';
const NCERT_PERSIST_BOOK_ID_KEY = 'shiksha_ncert_selected_book_id_v2';

export const NcertPdfModule: React.FC = () => {
  const [selectedModel, setSelectedModel] = useState<string>(() => getSavedModelSelection());
  const [processingMode, setProcessingMode] = useState<ProcessingMode>(() => getSavedProcessingMode());
  const [books, setBooks] = useState<NcertBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Persistent Library Navigation States (Library -> Class -> Subject -> Book Edition -> Chapters)
  const [selectedClass, setSelectedClass] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const fromUrl = urlParams.get('class');
        if (fromUrl) return fromUrl;
        return localStorage.getItem(NCERT_PERSIST_CLASS_KEY) || 'Class 6';
      } catch (_) {}
    }
    return 'Class 6';
  });

  const [selectedSubject, setSelectedSubject] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const fromUrl = urlParams.get('subject');
        if (fromUrl) return fromUrl;
        return localStorage.getItem(NCERT_PERSIST_SUBJECT_KEY) || 'Mathematics';
      } catch (_) {}
    }
    return 'Mathematics';
  });

  const [selectedBookId, setSelectedBookId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const fromUrl = urlParams.get('bookId');
        if (fromUrl) return fromUrl;
        return localStorage.getItem(NCERT_PERSIST_BOOK_ID_KEY) || '';
      } catch (_) {}
    }
    return '';
  });

  // Sync state changes with localStorage and URL search params for seamless state persistence across reloads
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        if (selectedClass) localStorage.setItem(NCERT_PERSIST_CLASS_KEY, selectedClass);
        if (selectedSubject) localStorage.setItem(NCERT_PERSIST_SUBJECT_KEY, selectedSubject);
        if (selectedBookId) localStorage.setItem(NCERT_PERSIST_BOOK_ID_KEY, selectedBookId);

        // Safely reflect active selection in URL query params without reloading
        const url = new URL(window.location.href);
        if (selectedClass) url.searchParams.set('class', selectedClass);
        if (selectedSubject) url.searchParams.set('subject', selectedSubject);
        if (selectedBookId) url.searchParams.set('bookId', selectedBookId);
        window.history.replaceState({}, '', url.toString());
      } catch (_) {}
    }
  }, [selectedClass, selectedSubject, selectedBookId]);

  // Immersive PDF Viewer Modal State (Instant Open)
  const [isPdfViewerOpen, setIsPdfViewerOpen] = useState(false);
  const [pdfViewerHash, setPdfViewerHash] = useState<string>('');
  const [pdfViewerFilePath, setPdfViewerFilePath] = useState<string | undefined>(undefined);
  const [pdfViewerTitle, setPdfViewerTitle] = useState<string>('');
  const [pdfViewerPageStart, setPdfViewerPageStart] = useState<number>(1);

  // Helper for resilient class comparison
  const normalizeClass = (cls: string | undefined | null): string => {
    if (!cls) return '';
    const digits = cls.match(/\d+/);
    return digits ? digits[0] : cls.trim().toLowerCase();
  };

  const matchClass = (cls1: string | undefined | null, cls2: string | undefined | null): boolean => {
    if (!cls1 || !cls2) return false;
    if (cls1 === cls2) return true;
    if (cls1.trim().toLowerCase() === cls2.trim().toLowerCase()) return true;
    const n1 = normalizeClass(cls1);
    const n2 = normalizeClass(cls2);
    return n1 !== '' && n1 === n2;
  };

  // Helper for checking if a book or subject string belongs to Social Science (SST / Samajik / History / Geography / Civics / Polity / Economics / etc.)
  const isSocialScienceBook = (subj?: string | null, title?: string | null): boolean => {
    const rawSubj = (subj || '').trim().toLowerCase();
    if (rawSubj === 'social science' || rawSubj === 'sst' || rawSubj === 'social' || rawSubj === 'samajik' || rawSubj === 'social studies') return true;
    const combined = `${subj || ''} ${title || ''}`.toLowerCase();
    return (
      combined.includes('social science') ||
      combined.includes('samajik') ||
      combined.includes('our pasts') ||
      combined.includes('social and political life') ||
      combined.includes('earth our habitat') ||
      combined.includes('resources and development') ||
      combined.includes('democratic politics') ||
      combined.includes('contemporary india') ||
      combined.includes('understanding economic')
    );
  };

  // Helper for checking if a book or subject string is standalone Science (and strictly NOT Social Science)
  const isStandaloneScienceBook = (subj?: string | null, title?: string | null): boolean => {
    if (isSocialScienceBook(subj, title)) return false;
    const rawSubj = (subj || '').trim().toLowerCase();
    if (rawSubj === 'science' || rawSubj === 'vigyan') return true;
    const combined = `${subj || ''} ${title || ''}`.toLowerCase();
    return (
      combined.includes('vigyan') ||
      combined.includes('curiosity') ||
      combined.includes('science textbook')
    );
  };

  // Helper for checking if a book or subject belongs to Maths / Mathematics
  const isMathsBook = (subj?: string | null, title?: string | null): boolean => {
    const rawSubj = (subj || '').trim().toLowerCase();
    if (rawSubj === 'mathematics' || rawSubj === 'maths' || rawSubj === 'math' || rawSubj === 'ganit') return true;
    const combined = `${subj || ''} ${title || ''}`.toLowerCase();
    return (
      combined.includes('ganita prakash') ||
      combined.includes('ganit') ||
      combined.includes('mathematics textbook')
    );
  };

  // Helper for resilient subject normalization with strict domain separation returning standard display/database string
  const normalizeSubject = (subj: string | undefined | null, title?: string | undefined | null): string => {
    const rawSubj = (subj || '').trim();
    if (rawSubj) {
      const lower = rawSubj.toLowerCase();
      if (lower === 'english') return 'English';
      if (lower === 'mathematics' || lower === 'maths' || lower === 'math') return 'Mathematics';
      if (lower === 'science' || lower === 'vigyan') return 'Science';
      if (lower === 'social science' || lower === 'sst' || lower === 'social' || lower === 'samajik' || lower === 'social studies') return 'Social Science';
      if (lower === 'hindi') return 'Hindi';
      if (lower === 'sanskrit') return 'Sanskrit';
      if (lower === 'evs' || lower === 'environmental studies') return 'EVS';
      if (lower === 'computer science' || lower === 'computer' || lower === 'informatics practices') return 'Computer Science';
    }

    if (isSocialScienceBook(subj, title)) return 'Social Science';
    if (isStandaloneScienceBook(subj, title)) return 'Science';
    if (isMathsBook(subj, title)) return 'Mathematics';

    const s = `${subj || ''} ${title || ''}`.trim().toLowerCase();
    if (s.includes('english') || s.includes('honeysuckle') || s.includes('honeycomb') || s.includes('poorvi') || s.includes('santoor') || s.includes('marigold') || s.includes('beehive') || s.includes('first flight')) return 'English';
    if (s.includes('hindi') || s.includes('vasant') || s.includes('malhar') || s.includes('durva') || s.includes('sparsh') || s.includes('rimjhim') || s.includes('kshitij')) return 'Hindi';
    if (s.includes('sanskrit') || s.includes('ruchira') || s.includes('deepakam') || s.includes('deepika') || s.includes('shemushi')) return 'Sanskrit';
    if (s.includes('computer') || s.includes('informatics') || s.includes('information tech') || s.includes('ai') || s.includes('artificial intelligence')) return 'Computer Science';
    if (s.includes('evs') || s.includes('environmental') || s.includes('looking around') || s.includes('aas paas')) return 'EVS';

    return rawSubj || 'General';
  };

  const matchSubject = (s1: string | undefined | null, s2: string | undefined | null, title1?: string | undefined | null, title2?: string | undefined | null): boolean => {
    if (!s1 || !s2) return false;
    const norm1 = normalizeSubject(s1, title1);
    const norm2 = normalizeSubject(s2, title2);
    return norm1.toLowerCase() === norm2.toLowerCase();
  };

  // Sync Book when class selection changes
  const handleClassSelectChange = (newClass: string) => {
    setSelectedClass(newClass);
    const activeBooksList = books.filter(b => b.status !== 'ARCHIVED');
    const classBooks = activeBooksList.filter(b => matchClass(b.classLevel, newClass));
    const availableSubs = Array.from(new Set(classBooks.map(b => normalizeSubject(b.subject, b.bookTitle)).filter(Boolean)));
    const targetSub = availableSubs.includes(selectedSubject) ? selectedSubject : (availableSubs[0] || selectedSubject || 'English');
    if (targetSub !== selectedSubject) {
      setSelectedSubject(targetSub);
    }
    const matchedBooks = classBooks.filter(
      b => matchSubject(targetSub, b.subject, undefined, b.bookTitle)
    );
    if (matchedBooks.length > 0) {
      setSelectedBookId(matchedBooks[0].id);
    } else {
      setSelectedBookId('');
    }
  };

  // Sync Book when subject selection changes
  const handleSubjectSelectChange = (newSubject: string) => {
    setSelectedSubject(newSubject);
    if (!newSubject) {
      setSelectedBookId('');
      return;
    }
    const activeBooksList = books.filter(b => b.status !== 'ARCHIVED');
    const matchedBooks = activeBooksList.filter(
      b => matchClass(b.classLevel, selectedClass) && matchSubject(newSubject, b.subject, undefined, b.bookTitle)
    );
    if (matchedBooks.length > 0) {
      setSelectedBookId(matchedBooks[0].id);
    } else {
      setSelectedBookId('');
    }
  };

  // Sync Book when edition selection changes
  const handleBookEditionSelectChange = (newBookId: string) => {
    setSelectedBookId(newBookId);
  };

  // Upload Modal State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isDirectUploadOpen, setIsDirectUploadOpen] = useState(false);
  const [targetAppendingBook, setTargetAppendingBook] = useState<NcertBook | null>(null);
  const [replaceExistingId, setReplaceExistingId] = useState<string | null>(null);
  const [classLevel, setClassLevel] = useState('Class 6');
  const [subject, setSubject] = useState('Mathematics');
  const [bookTitle, setBookTitle] = useState('');
  const [medium, setMedium] = useState('English');
  const [board, setBoard] = useState('CBSE');
  const [publisher, setPublisher] = useState('NCERT');
  const [edition, setEdition] = useState('2025-26');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');

  const handleOpenNewUploadModal = () => {
    setTargetAppendingBook(null);
    setReplaceExistingId(null);
    setClassLevel(selectedClass || 'Class 6');
    setSubject(selectedSubject || 'Mathematics');
    setBookTitle('');
    setSelectedFiles([]);
    setIsUploadModalOpen(true);
  };

  const handleOpenAppendChaptersModal = (bookToAppend: NcertBook) => {
    setTargetAppendingBook(bookToAppend);
    setReplaceExistingId(null);
    setClassLevel(bookToAppend.classLevel);
    setSubject(bookToAppend.subject);
    setBookTitle(bookToAppend.bookTitle);
    setMedium(bookToAppend.medium || 'English');
    setBoard(bookToAppend.board || 'CBSE');
    setPublisher(bookToAppend.publisher || 'NCERT');
    setEdition(bookToAppend.edition || '2025-26');
    setSelectedFiles([]);
    setIsUploadModalOpen(true);
  };

  // Version Conflict Modal State
  const [conflictBook, setConflictBook] = useState<NcertBook | null>(null);
  const [pendingUploadData, setPendingUploadData] = useState<any>(null);
  const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);

  // Chapter View Modal State
  const [selectedBookForChapters, setSelectedBookForChapters] = useState<NcertBook | null>(null);
  const [isChapterModalOpen, setIsChapterModalOpen] = useState(false);
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [editChapterNumber, setEditChapterNumber] = useState<number>(1);

  // Body scroll lock for upload modal
  useEffect(() => {
    if (isUploadModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isUploadModalOpen]);

  // Generator State
  const [genConfig, setGenConfig] = useState<NcertGeneratorConfig>({
    classLevel: 'Class 6',
    subject: 'Mathematics',
    bookId: '',
    scope: 'FULL_BOOK',
    chapterId: '',
    questionTypes: getBlueprintQuestionTypesForSubject('Mathematics'),
    difficulty: 'Mixed',
    marks: 1,
    numberOfQuestions: 10,
    includeTextbookQuestions: true,
    generateNewQuestions: true,
    language: 'English',
  });

  const [generating, setGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<NcertGenerationProgressReport | null>(null);
  const [generatedQuestions, setGeneratedQuestions] = useState<NcertQuestion[]>([]);
  const [generationDiagnostics, setGenerationDiagnostics] = useState<any>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [visibleChapterLimit, setVisibleChapterLimit] = useState<number>(15);

// Comprehensive 10-Chapter Master Curriculum for NCERT Class 6 Mathematics (Ganita Prakash)
const GANITA_PRAKASH_CHAPTERS: Array<{
  chapterNumber: number;
  chapterTitle: string;
  pageStart: number;
  pageEnd: number;
  topics: string[];
}> = [
  {
    chapterNumber: 1,
    chapterTitle: "Chapter 1",
    pageStart: 1,
    pageEnd: 22,
    topics: []
  },
  {
    chapterNumber: 2,
    chapterTitle: "Chapter 2",
    pageStart: 23,
    pageEnd: 48,
    topics: []
  },
  {
    chapterNumber: 3,
    chapterTitle: "Chapter 3",
    pageStart: 49,
    pageEnd: 78,
    topics: []
  },
  {
    chapterNumber: 4,
    chapterTitle: "Chapter 4",
    pageStart: 79,
    pageEnd: 100,
    topics: []
  },
  {
    chapterNumber: 5,
    chapterTitle: "Chapter 5",
    pageStart: 101,
    pageEnd: 126,
    topics: []
  },
  {
    chapterNumber: 6,
    chapterTitle: "Chapter 6",
    pageStart: 127,
    pageEnd: 150,
    topics: []
  },
  {
    chapterNumber: 7,
    chapterTitle: "Chapter 7",
    pageStart: 151,
    pageEnd: 176,
    topics: []
  },
  {
    chapterNumber: 8,
    chapterTitle: "Chapter 8",
    pageStart: 177,
    pageEnd: 198,
    topics: []
  },
  {
    chapterNumber: 9,
    chapterTitle: "Chapter 9",
    pageStart: 199,
    pageEnd: 220,
    topics: []
  },
  {
    chapterNumber: 10,
    chapterTitle: "Chapter 10",
    pageStart: 221,
    pageEnd: 248,
    topics: []
  }
];

  const CLASS_6_MATH_TITLES: Record<number, string> = {
    1: 'Patterns in Mathematics',
    2: 'Lines and Angles',
    3: 'Number Play',
    4: 'Data Handling and Presentation',
    5: 'Prime Time',
    6: 'Perimeter and Area',
    7: 'Fractions',
    8: 'Playing with Constructions',
    9: 'Symmetry',
    10: 'Ratio and Proportion',
  };

  const CLASS_6_SCIENCE_TITLES: Record<number, string> = {
    1: 'Wonderful World of Science',
    2: 'Diversity in the Living World',
    3: 'Mindful Eating: A Path to a Healthy Body',
    4: 'Exploring Magnets',
    5: 'Measurement of Length and Motion',
    6: 'Materials Around Us',
    7: 'Temperature and its Measurement',
    8: 'A Journey through States of Water',
    9: 'Methods of Separation in Everyday Life',
    10: 'Living Creatures: Exploring Their Characteristics',
    11: "Nature's Treasures",
    12: 'Beyond Earth',
  };

  const sanitizeAndCleanBookChapters = async (loadedBooks: NcertBook[]): Promise<{ repaired: boolean; updatedBooks: NcertBook[] }> => {
    // Strictly disabled to enforce absolute book immutability and prevent any title auto-correction or overwriting.
    return { repaired: false, updatedBooks: loadedBooks };
  };

  useEffect(() => {
    loadBooks();

    // Background sync disabled to adhere to strict offline and non-automatic generation rules.
    const syncInterval = null;

    const handleGlobalBooksChange = () => {
      loadBooks();
    };
    window.addEventListener('ncert-books-changed', handleGlobalBooksChange);

    return () => {
      if (syncInterval) clearInterval(syncInterval);
      window.removeEventListener('ncert-books-changed', handleGlobalBooksChange);
    };
  }, []);

  const syncBooksBackground = async () => {
    try {
      const serverSynced = await syncNcertBooksWithServer();
      if (serverSynced) {
        setBooks(prev => {
          // If lengths differ or updated timestamps differ, update state seamlessly
          const hasChanges = serverSynced.length !== prev.length || serverSynced.some((sb, idx) => {
            const pb = prev[idx];
            return !pb || pb.id !== sb.id || (sb.updatedTimestamp || 0) > (pb.updatedTimestamp || 0);
          });
          return hasChanges ? serverSynced : prev;
        });
      }
    } catch (_) {
      // Non-intrusive background sync
    }
  };

  const loadBooks = async () => {
    try {
      setLoading(true);
      // 1. Instant load from local IndexedDB for 0ms initial render
      let loaded = await getAllNcertBooks();
      if (!loaded || !Array.isArray(loaded)) {
        loaded = [];
      }

      // 2. Synchronize with authoritative persistent server manifest
      try {
        const synced = await syncNcertBooksWithServer();
        if (synced && Array.isArray(synced)) {
          loaded = synced;
        }
      } catch (syncErr) {
        console.warn('Server sync notice:', syncErr);
      }

      const { repaired, updatedBooks } = await sanitizeAndCleanBookChapters(loaded || []);
      const finalLoaded = repaired ? updatedBooks : (loaded || []);

      setBooks(finalLoaded);
      const activeLoaded = finalLoaded.filter(b => b.status !== 'ARCHIVED');
      if (activeLoaded.length > 0) {
        // Match existing selected class/subject or pick from available
        const currentSelectedClass = selectedClass || activeLoaded[0].classLevel;
        const currentSelectedSubject = selectedSubject || activeLoaded[0].subject;

        const matchingLoaded = activeLoaded.filter(
          b => matchClass(b.classLevel, currentSelectedClass) && matchSubject(currentSelectedSubject, b.subject, undefined, b.bookTitle)
        );

        if (matchingLoaded.length > 0) {
          if (!selectedBookId || !matchingLoaded.some(b => b.id === selectedBookId)) {
            setSelectedBookId(matchingLoaded[0].id);
          }
        }

        const currentSelectedExists = activeLoaded.some(b => b.id === genConfig.bookId);
        if (!genConfig.bookId || !currentSelectedExists) {
          const firstBook = matchingLoaded[0] || activeLoaded[0];
          setGenConfig(prev => ({
            ...prev,
            bookId: firstBook.id,
            classLevel: firstBook.classLevel,
            subject: firstBook.subject,
            chapterId: firstBook.chapters && firstBook.chapters.length > 0 ? firstBook.chapters[0].id : '',
          }));
        }
      }
    } catch (err: any) {
      console.error('Failed to load NCERT books:', err);
      setError(err.message || 'Failed to load NCERT library');
    } finally {
      setLoading(false);
    }
  };

  const [uploadSourceType, setUploadSourceType] = useState<'SINGLE_PDF' | 'MULTIPLE_PDF' | 'ZIP'>('MULTIPLE_PDF');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [activeJobBook, setActiveJobBook] = useState<NcertBook | null>(null);

  const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArr = Array.from(e.target.files) as File[];
      setSelectedFiles(filesArr);
      if (filesArr.length === 1 && !bookTitle) {
        setBookTitle(filesArr[0].name.replace(/\.[^/.]+$/, ''));
      } else if (filesArr.length > 1 && !bookTitle) {
        setBookTitle(`${subject} Textbook Package`);
      }
    }
  };

  // Safe API Response Parser - Guarantees structured error objects and never throws unhandled HTML errors
  const safeFetchJson = async (url: string, options?: RequestInit): Promise<any> => {
    try {
      const res = await fetch(url, options);
      const contentType = res.headers.get('content-type') || '';

      if (contentType.includes('application/json')) {
        const data = await res.json();
        if (!res.ok && data.success === undefined) {
          return {
            success: false,
            status: res.status,
            error: {
              code: data.error?.code || `HTTP_${res.status}`,
              message: data.error?.message || data.message || `Server returned error status ${res.status}`
            }
          };
        }
        return data;
      }

      // Server returned HTML or non-JSON content
      const text = await res.text();
      let userMsg = `Server error (${res.status}).`;
      let code = `HTTP_${res.status}`;

      if (res.status === 413 || text.includes('413') || text.includes('Too Large')) {
        code = 'PAYLOAD_TOO_LARGE';
        userMsg = 'Upload payload exceeded server single-request limits.';
      } else if (res.status === 502 || res.status === 503 || res.status === 504) {
        code = 'GATEWAY_ERROR';
        userMsg = 'Server or proxy temporary timeout.';
      }

      return {
        success: false,
        status: res.status,
        isHtmlError: true,
        error: {
          code,
          message: userMsg
        }
      };
    } catch (netErr: any) {
      return {
        success: false,
        status: 0,
        error: {
          code: 'NETWORK_ERROR',
          message: netErr.message || 'Failed to connect to processing server.'
        }
      };
    }
  };

  const readBlobAsBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const resultStr = (reader.result as string) || '';
        const base64 = resultStr.includes(',') ? resultStr.split(',')[1] : resultStr;
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const uploadChunkWithRetry = async (chunkPayload: any, maxRetries = 3) => {
    let attempt = 0;
    while (attempt < maxRetries) {
      attempt++;
      const res = await safeFetchJson('/api/upload-ncert-chunk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(chunkPayload),
      });

      if (res.success) {
        return res;
      }

      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
      } else {
        throw new Error(res.error?.message || res.message || `Failed uploading chunk ${chunkPayload.chunkIndex + 1} after ${maxRetries} attempts`);
      }
    }
  };

  const processChunkedUpload = async (replaceExistingId?: string): Promise<any> => {
    const uploadId = `UPL-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;
    const CHUNK_SIZE = 2 * 1024 * 1024; // 2MB binary slice per chunk
    const filesMeta: Array<{ fileIndex: number; fileName: string; totalChunks: number }> = [];

    for (let fIdx = 0; fIdx < selectedFiles.length; fIdx++) {
      const file = selectedFiles[fIdx];
      const totalChunks = Math.max(1, Math.ceil(file.size / CHUNK_SIZE));
      filesMeta.push({ fileIndex: fIdx, fileName: file.name, totalChunks });

      for (let cIdx = 0; cIdx < totalChunks; cIdx++) {
        const start = cIdx * CHUNK_SIZE;
        const end = Math.min(file.size, start + CHUNK_SIZE);
        const sliceBlob = file.slice(start, end);
        const chunkBase64 = await readBlobAsBase64(sliceBlob);

        const pct = Math.round(((cIdx + 1) / totalChunks) * 100);
        if (selectedFiles.length > 1) {
          setUploadProgress(`Uploading file ${fIdx + 1}/${selectedFiles.length} (${file.name}): Chunk ${cIdx + 1}/${totalChunks} (${pct}%)...`);
        } else {
          setUploadProgress(`Uploading PDF: Chunk ${cIdx + 1}/${totalChunks} (${pct}%)...`);
        }

        await uploadChunkWithRetry({
          uploadId,
          fileIndex: fIdx,
          fileName: file.name,
          chunkIndex: cIdx,
          totalChunks,
          chunkDataBase64: chunkBase64,
        });
      }
    }

    setUploadProgress('Reassembling PDF and analyzing chapters...');

    const processRes = await safeFetchJson('/api/process-ncert-chunks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uploadId,
        uploadType: uploadSourceType,
        classLevel,
        subject,
        bookTitle: bookTitle || (selectedFiles.length === 1 ? selectedFiles[0].name : 'NCERT Package'),
        medium,
        board,
        publisher,
        edition,
        model: selectedModel,
        processingMode,
        filesMeta,
      }),
    });

    return processRes;
  };

  const createBatchesOfFiles = (files: File[]): File[][] => {
    const batches: File[][] = [];
    let currentBatch: File[] = [];
    let currentSize = 0;
    const MAX_BATCH_SIZE = 15 * 1024 * 1024; // 15MB limit per HTTP request payload
    const MAX_BATCH_COUNT = 4; // Max 4 intact PDF files per request batch

    for (const file of files) {
      if (
        currentBatch.length > 0 &&
        (currentBatch.length >= MAX_BATCH_COUNT || currentSize + file.size > MAX_BATCH_SIZE)
      ) {
        batches.push(currentBatch);
        currentBatch = [];
        currentSize = 0;
      }
      currentBatch.push(file);
      currentSize += file.size;
    }
    if (currentBatch.length > 0) {
      batches.push(currentBatch);
    }
    return batches;
  };

  const processAndUploadBook = async (replaceExistingId?: string) => {
    if (selectedFiles.length === 0) {
      alert('Please select at least one valid PDF or ZIP file.');
      return;
    }

    // Client-side validation: reject files strictly above 200MB (with a buffer)
    for (const file of selectedFiles) {
      if (file.size > 200 * 1024 * 1024) {
        alert(`The file "${file.name}" exceeds the supported 200 MB limit.`);
        return;
      }
    }

    try {
      setUploading(true);
      setUploadProgress('Preparing file payload...');

      let res: any;

      if (selectedFiles.length === 1) {
        // Single PDF upload: Normal upload flow, intact PDF file in FormData
        const formData = new FormData();
        formData.append('uploadType', uploadSourceType);
        formData.append('classLevel', classLevel);
        formData.append('subject', subject);
        formData.append('bookTitle', bookTitle || selectedFiles[0].name);
        formData.append('medium', medium);
        formData.append('board', board);
        formData.append('publisher', publisher);
        formData.append('edition', edition);
        formData.append('model', selectedModel);
        formData.append('processingMode', processingMode);
        formData.append('files', selectedFiles[0]);

        setUploadProgress('Uploading and processing source file...');

        res = await safeFetchJson('/api/process-ncert-bulk', {
          method: 'POST',
          body: formData,
        });
      } else {
        // Bulk Upload: Batch multiple intact PDF files into controlled upload batches
        const fileBatches = createBatchesOfFiles(selectedFiles);
        let accumulatedBook: NcertBook | null = null;

        for (let b = 0; b < fileBatches.length; b++) {
          const batch = fileBatches[b];
          const batchProgressText = `Uploading bulk PDF batch ${b + 1} of ${fileBatches.length} (${batch.length} file${batch.length > 1 ? 's' : ''})...`;
          setUploadProgress(batchProgressText);

          const formData = new FormData();
          formData.append('uploadType', uploadSourceType);
          formData.append('classLevel', classLevel);
          formData.append('subject', subject);
          formData.append('bookTitle', bookTitle || 'NCERT Package');
          formData.append('medium', medium);
          formData.append('board', board);
          formData.append('publisher', publisher);
          formData.append('edition', edition);
          formData.append('model', selectedModel);
          formData.append('processingMode', processingMode);

          batch.forEach(file => {
            formData.append('files', file);
          });

          const batchRes = await safeFetchJson('/api/process-ncert-bulk', {
            method: 'POST',
            body: formData,
          });

          if (!batchRes || !batchRes.success || !batchRes.book) {
            throw new Error(
              batchRes?.error?.message ||
              batchRes?.message ||
              `Failed processing batch ${b + 1} of ${fileBatches.length}`
            );
          }

          const batchBook: NcertBook = batchRes.book;

          if (!accumulatedBook) {
            accumulatedBook = batchBook;
          } else {
            // Merge batch chapters and fileItems into accumulatedBook
            const existingChaptersMap = new Map<number, NcertChapter>();
            (accumulatedBook.chapters || []).forEach(ch => {
              const num = typeof ch.chapterNumber === 'number' ? ch.chapterNumber : parseInt(String(ch.chapterNumber), 10) || 1;
              existingChaptersMap.set(num, ch);
            });

            (batchBook.chapters || []).forEach(ch => {
              const num = typeof ch.chapterNumber === 'number' ? ch.chapterNumber : parseInt(String(ch.chapterNumber), 10) || 1;
              existingChaptersMap.set(num, {
                ...ch,
                bookId: accumulatedBook!.id,
              });
            });

            const mergedChapters = Array.from(existingChaptersMap.values()).sort((a, b) => {
              const numA = typeof a.chapterNumber === 'number' ? a.chapterNumber : parseInt(String(a.chapterNumber), 10) || 999;
              const numB = typeof b.chapterNumber === 'number' ? b.chapterNumber : parseInt(String(b.chapterNumber), 10) || 999;
              return numA - numB;
            });

            const mergedFileItems = [
              ...(accumulatedBook.fileItems || []),
              ...(batchBook.fileItems || []).filter(
                bf => !(accumulatedBook!.fileItems || []).some(ef => ef.fileName === bf.fileName)
              ),
            ];

            accumulatedBook = {
              ...accumulatedBook,
              pageCount: (accumulatedBook.pageCount || 0) + (batchBook.pageCount || 0),
              fileSize: (accumulatedBook.fileSize || 0) + (batchBook.fileSize || 0),
              totalFiles: (accumulatedBook.totalFiles || 0) + (batchBook.totalFiles || 0),
              processedFiles: (accumulatedBook.processedFiles || 0) + (batchBook.processedFiles || 0),
              chapters: mergedChapters,
              fileItems: mergedFileItems,
            };
          }
        }

        res = { success: true, book: accumulatedBook };
      }

      const data = res;
      if (!data || !data.success) {
        throw new Error(data?.error?.message || data?.message || 'Failed processing NCERT book upload');
      }

      if (data.success && data.book) {
        let newBook: NcertBook = data.book;
        setActiveJobBook(newBook);

        // Check if user specifically requested to append to a book
        const existingSubjectBook = targetAppendingBook 
          ? (books.find(b => b.id === targetAppendingBook.id) || targetAppendingBook)
          : null;

        if (existingSubjectBook && !replaceExistingId) {
          // Seamlessly append and merge new chapters into existing book
          const existingChaptersMap = new Map<number, NcertChapter>();
          (existingSubjectBook.chapters || []).forEach(ch => {
            const num = typeof ch.chapterNumber === 'number' ? ch.chapterNumber : parseInt(String(ch.chapterNumber), 10) || 1;
            existingChaptersMap.set(num, ch);
          });

          // Insert or update with incoming chapters
          (newBook.chapters || []).forEach(ch => {
            const num = typeof ch.chapterNumber === 'number' ? ch.chapterNumber : parseInt(String(ch.chapterNumber), 10) || 1;
            existingChaptersMap.set(num, {
              ...ch,
              bookId: existingSubjectBook.id,
            });
          });

          const mergedChapters = Array.from(existingChaptersMap.values()).sort((a, b) => {
            const numA = typeof a.chapterNumber === 'number' ? a.chapterNumber : parseInt(String(a.chapterNumber), 10) || 999;
            const numB = typeof b.chapterNumber === 'number' ? b.chapterNumber : parseInt(String(b.chapterNumber), 10) || 999;
            return numA - numB;
          });

          const mergedFileItems = [
            ...(existingSubjectBook.fileItems || []),
            ...(newBook.fileItems || []).filter(nf => !(existingSubjectBook.fileItems || []).some(ef => ef.fileName === nf.fileName))
          ];

          let mergedBook: NcertBook = {
            ...existingSubjectBook,
            bookTitle: existingSubjectBook.bookTitle || newBook.bookTitle,
            pageCount: (existingSubjectBook.pageCount || 0) + (newBook.pageCount || 0),
            fileSize: (existingSubjectBook.fileSize || 0) + (newBook.fileSize || 0),
            totalFiles: (existingSubjectBook.totalFiles || 0) + (newBook.totalFiles || 0),
            processedFiles: (existingSubjectBook.processedFiles || 0) + (newBook.processedFiles || 0),
            chapters: mergedChapters,
            fileItems: mergedFileItems,
            updatedAt: new Date().toISOString(),
          };

          await saveNcertBook(mergedBook);
          await loadBooks();

          setSelectedClass(mergedBook.classLevel);
          setSelectedSubject(mergedBook.subject);
          setSelectedBookId(mergedBook.id);

          setGenConfig(prev => ({
            ...prev,
            bookId: mergedBook.id,
            classLevel: mergedBook.classLevel,
            subject: mergedBook.subject,
            chapterId: mergedBook.chapters && mergedBook.chapters.length > 0 ? mergedBook.chapters[0].id : '',
          }));

          setIsUploadModalOpen(false);
          setSelectedFiles([]);
          setBookTitle('');
          setTargetAppendingBook(null);
          alert(`Successfully added ${newBook.chapters.length} new chapter(s) to "${mergedBook.bookTitle}" (${mergedBook.classLevel} ${mergedBook.subject})! Total chapters available: ${mergedChapters.length}.`);
          return;
        }

        if (replaceExistingId) {
          const oldBook = books.find(b => b.id === replaceExistingId);
          if (oldBook) {
            oldBook.status = 'ARCHIVED';
            await saveNcertBook(oldBook);
          }
        }

        await saveNcertBook(newBook);
        await loadBooks();

        setSelectedClass(newBook.classLevel);
        const normSub = normalizeSubject(newBook.subject, newBook.bookTitle);
        setSelectedSubject(normSub);
        setSelectedBookId(newBook.id);

        setGenConfig(prev => ({
          ...prev,
          bookId: newBook.id,
          classLevel: newBook.classLevel,
          subject: newBook.subject,
          chapterId: newBook.chapters && newBook.chapters.length > 0 ? newBook.chapters[0].id : '',
        }));

        setIsUploadModalOpen(false);
        setSelectedFiles([]);
        setBookTitle('');
        setReplaceExistingId(null);
        setTargetAppendingBook(null);
        alert(newBook.status === 'PAUSED' ? 'Book uploaded and stored safely! AI refinement temporarily paused due to server load (503). You can resume anytime.' : 'NCERT Book package successfully processed and indexed!');
      } else {
        const errDetail = data.error?.message || data.message || 'Failed to process bulk upload.';
        alert(`Upload processing error: ${errDetail}`);
      }
    } catch (err: any) {
      console.error('Bulk upload processing error:', err);
      alert('Error during processing: ' + err.message);
    } finally {
      setUploading(false);
      setUploadProgress('');
      setReplaceExistingId(null);
      setTargetAppendingBook(null);
    }
  };

  const handleResumeJob = async (book: NcertBook) => {
    try {
      setUploading(true);
      setUploadProgress('Resuming AI chapter refinement...');
      const res = await fetch('/api/resume-ncert-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ book, model: selectedModel, processingMode }),
      });
      const data = await res.json();
      if (data.success && data.book) {
        await saveNcertBook(data.book);
        await loadBooks();
        alert('Job resumed and completed successfully!');
      } else {
        alert(data.message || 'Failed to resume job');
      }
    } catch (err: any) {
      alert('Resume error: ' + err.message);
    } finally {
      setUploading(false);
      setUploadProgress('');
    }
  };

  const handleArchiveBook = async (book: NcertBook) => {
    if (confirm(`Are you sure you want to archive "${book.bookTitle}"?`)) {
      book.status = book.status === 'ARCHIVED' ? 'READY' : 'ARCHIVED';
      await saveNcertBook(book);
      await loadBooks();
    }
  };

  const handleDeleteBook = async (id: string) => {
    if (confirm('Permanently delete this book and all its extracted chapters from storage?')) {
      await deleteNcertBook(id);
      const remaining = books.filter(b => b.id !== id);
      setBooks(remaining);
      if (selectedBookId === id) {
        const activeRemaining = remaining.filter(b => b.status !== 'ARCHIVED');
        if (activeRemaining.length > 0) {
          setSelectedBookId(activeRemaining[0].id);
          setSelectedClass(activeRemaining[0].classLevel);
          setSelectedSubject(activeRemaining[0].subject);
        } else {
          setSelectedBookId('');
        }
      }
      window.dispatchEvent(new CustomEvent('ncert-books-changed', { detail: { deletedId: id, remaining } }));
      await loadBooks();
    }
  };

  const handleDeleteChapter = async (bookId: string, chapterId: string) => {
    if (confirm('Permanently delete this chapter from storage?')) {
      await deleteNcertChapter(bookId, chapterId);
      window.dispatchEvent(new CustomEvent('ncert-books-changed'));
      await loadBooks();
    }
  };

  const handleOpenReplaceBookModal = (book: NcertBook) => {
    setTargetAppendingBook(null);
    setReplaceExistingId(book.id);
    setClassLevel(book.classLevel);
    setSubject(book.subject);
    setBookTitle(book.bookTitle);
    setMedium(book.medium || 'English');
    setBoard(book.board || 'CBSE');
    setEdition(book.edition || 'Latest');
    setSelectedFiles([]);
    setIsUploadModalOpen(true);
  };

  const handleGenerateQuestions = async () => {
    const selectedBook = books.find(b => b.id === genConfig.bookId);
    if (!selectedBook) {
      alert('Please select a valid uploaded NCERT book.');
      return;
    }

    try {
      setGenerating(true);
      setGenerationProgress({
        sourceLoading: true,
        chapterProcessing: false,
        questionGeneration: false,
        duplicateChecking: false,
        answerValidation: false,
        formattingValidation: false,
        csvPreparation: false,
        generatedCount: 0,
        rejectedCount: 0,
        duplicatesRemovedCount: 0,
        validationFailuresCount: 0,
        finalQuestionsCount: 0,
      });

      // Simulate step progress for user feedback
      await new Promise(r => setTimeout(r, 600));
      setGenerationProgress(p => p ? { ...p, sourceLoading: false, chapterProcessing: true } : null);

      await new Promise(r => setTimeout(r, 600));
      setGenerationProgress(p => p ? { ...p, chapterProcessing: false, questionGeneration: true } : null);

      const res = await fetch('/api/generate-ncert-pdf-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: genConfig, book: selectedBook, model: selectedModel, processingMode }),
      });

      const data = await res.json();
      setGenerationProgress(p => p ? { ...p, questionGeneration: false, duplicateChecking: true, answerValidation: true, formattingValidation: true, csvPreparation: true } : null);

      await new Promise(r => setTimeout(r, 500));

      if (data.success && data.questions) {
        const questions: NcertQuestion[] = data.questions;
        setGeneratedQuestions(questions);
        setGenerationDiagnostics(data.diagnostics || null);

        // 1. Auto-save generated questions to IndexedDB question store
        await saveNcertQuestionsBatch(questions);

        // 2. Build CSV Content and auto-save DailyExportFile record
        const csvContent = buildNcertPDFCSV(questions);
        const targetChapter = selectedBook.chapters?.find(c => c.id === genConfig.chapterId);
        const chapterTitle = targetChapter ? targetChapter.chapterTitle : (genConfig.scope === 'FULL_BOOK' ? 'Full Textbook' : 'Selected Chapters');
        const csvFileId = `csv_ncert_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        setCurrentGeneratedFileId(csvFileId);

        const newCsvRecord: DailyExportFile = {
          id: csvFileId,
          moduleId: 'ncert_pdf',
          moduleName: 'NCERT PDF Question Bank',
          batchDate: new Date().toISOString().split('T')[0],
          filename: `${genConfig.classLevel || 'Class'}_${genConfig.subject || 'Subject'}_${chapterTitle.replace(/[^a-zA-Z0-9_-]/g, '_')}.xlsx`,
          baseFilename: LOCKED_CSV_FILENAMES.ncert_pdf,
          fileType: 'XLSX',
          questionCount: questions.length,
          idRange: `${questions[0]?.id || 'NQ-1'} - ${questions[questions.length - 1]?.id || 'NQ-' + questions.length}`,
          csvContent: csvContent,
          downloadStatus: 'NOT DOWNLOADED',
          createdDate: new Date().toISOString(),
          classLevel: genConfig.classLevel,
          subject: genConfig.subject,
          chapter: chapterTitle,
          bookId: selectedBook.id,
          chapterId: genConfig.chapterId,
          updatedTimestamp: Date.now(),
        };

        await saveDailyExportFile(newCsvRecord);

        // 3. Auto-save to permanent bank so Question Store immediately shows these questions
        const permanentQuestions: Question[] = questions.map((q, idx) => ({
          id: q.id || `NCERT-${Date.now()}-${idx}`,
          question: q.text,
          category: q.topic || q.chapter || 'NCERT Curriculum',
          difficulty: q.difficulty || 'Medium',
          subject: q.subject || genConfig.subject || 'Mathematics',
          questionType: q.type || 'MCQ',
          timeLimit: 120,
          maxScore: q.marks || 1,
          tags: [q.board, q.grade, q.subject, q.chapter, q.topic].filter(Boolean),
          hint: `NCERT ${q.book} - ${q.chapter}`,
          active: true,
          qualityScore: 95,
          duplicateSimilarity: 0,
          createdDate: new Date().toISOString(),
          updatedDate: new Date().toISOString(),
        }));
        await saveQuestionsBatch(permanentQuestions);

        setGenerationProgress({
          sourceLoading: false,
          chapterProcessing: false,
          questionGeneration: false,
          duplicateChecking: false,
          answerValidation: false,
          formattingValidation: false,
          csvPreparation: false,
          generatedCount: data.diagnostics?.validationInputCount || questions.length,
          rejectedCount: data.diagnostics?.rejectedCount || 0,
          duplicatesRemovedCount: data.diagnostics?.duplicatesCount || 0,
          validationFailuresCount: 0,
          finalQuestionsCount: questions.length,
        });

        setIsPreviewModalOpen(true);
      } else {
        alert(`[${data.errorType || 'ERROR'}] ${data.message || 'Failed to generate questions.'}`);
      }
    } catch (err: any) {
      alert('Generation error: ' + err.message);
    } finally {
      setGenerating(false);
    }
  };

  const [currentGeneratedFileId, setCurrentGeneratedFileId] = useState<string>('');

  const downloadCsv = () => {
    if (generatedQuestions.length === 0) return;
    exportMasterQuestionBankToCSV(generatedQuestions);
    if (currentGeneratedFileId) {
      updateDailyExportFileStatus(currentGeneratedFileId, 'DOWNLOADED');
    }
  };

  const handleSaveToPermanentBank = async () => {
    if (generatedQuestions.length === 0) return;
    try {
      const permanentQuestions: Question[] = generatedQuestions.map((q, idx) => ({
        id: q.id || `NCERT-${Date.now()}-${idx}`,
        question: q.text,
        category: q.topic || q.chapter || 'NCERT Curriculum',
        difficulty: q.difficulty || 'Medium',
        subject: q.subject || 'Mathematics',
        questionType: q.type || 'MCQ',
        timeLimit: 120,
        maxScore: q.marks || 1,
        tags: [q.board, q.grade, q.subject, q.chapter, q.topic].filter(Boolean),
        hint: `NCERT ${q.book} - ${q.chapter}`,
        active: true,
        qualityScore: 95,
        duplicateSimilarity: 0,
        createdDate: new Date().toISOString(),
        updatedDate: new Date().toISOString(),
      }));

      await saveQuestionsBatch(permanentQuestions);
      alert(`Successfully saved ${permanentQuestions.length} questions to permanent Question Bank! You can now access them anytime without regenerating.`);
    } catch (err: any) {
      alert('Failed to save to permanent bank: ' + err.message);
    }
  };

  const activeBooks = books.filter(b => b.status !== 'ARCHIVED');

  const availableClasses: string[] = useMemo(() => {
    const raw = activeBooks.map(b => (b.classLevel || '') as string).filter(Boolean);
    const unique = Array.from(new Set<string>(raw));
    return unique.sort((a, b) => {
      const numA = parseInt((a || '').replace(/\D/g, ''), 10) || 0;
      const numB = parseInt((b || '').replace(/\D/g, ''), 10) || 0;
      return numA - numB;
    });
  }, [activeBooks]);

  const currentClass: string = (selectedClass && availableClasses.some(c => matchClass(c, selectedClass)))
    ? (availableClasses.find(c => matchClass(c, selectedClass)) || selectedClass)
    : (availableClasses[0] || selectedClass || 'Class 6');

  const classSpecificBooks = activeBooks.filter(b => matchClass(b.classLevel, currentClass));

  const availableSubjects: string[] = useMemo(() => {
    const raw = classSpecificBooks.map(b => normalizeSubject(b.subject, b.bookTitle)).filter(Boolean);
    return Array.from(new Set<string>(raw)).sort((a, b) => a.localeCompare(b));
  }, [classSpecificBooks]);

  const currentSubject: string = (selectedSubject && availableSubjects.some(s => matchSubject(s, selectedSubject)))
    ? (availableSubjects.find(s => matchSubject(s, selectedSubject)) || selectedSubject)
    : (availableSubjects[0] || selectedSubject || 'Science');

  // Global Dropdown Duplicate Fix:
  // Distinct filter for all editions under any selected class and subject
  const matchingBooks = useMemo(() => {
    const raw = activeBooks.filter(book => {
      const classMatch = matchClass(book.classLevel, currentClass);
      if (!classMatch) return false;
      return matchSubject(book.subject, currentSubject, undefined, book.bookTitle);
    });

    const seenEditions = new Set<string>();
    const uniqueEditionsList: NcertBook[] = [];

    for (const b of raw) {
      const edKey = (b.edition || b.bookTitle || 'default').toLowerCase().trim();
      if (!seenEditions.has(edKey)) {
        seenEditions.add(edKey);
        uniqueEditionsList.push(b);
      }
    }
    return uniqueEditionsList;
  }, [activeBooks, currentClass, currentSubject]);

  const activeBook: NcertBook | null = (
    (selectedBookId && matchingBooks.find(b => b.id === selectedBookId))
    || matchingBooks[0]
    || null
  );

  useEffect(() => {
    setVisibleChapterLimit(15);
  }, [currentClass, currentSubject]);

  // Dynamic filtered books logic for CSV Question Generator ensuring strict Social Science vs Science separation
  const genClassBooks = activeBooks.filter(b => matchClass(b.classLevel, genConfig.classLevel));
  const effectiveGenClassBooks = genClassBooks.length > 0 ? genClassBooks : activeBooks;

  const genAvailableSubjects = useMemo(() => {
    const raw = effectiveGenClassBooks.map(b => normalizeSubject(b.subject, b.bookTitle)).filter(Boolean);
    return Array.from(new Set<string>(raw)).sort((a, b) => a.localeCompare(b));
  }, [effectiveGenClassBooks]);

  const filteredBooks = activeBooks.filter(book => {
    const classMatch = !genConfig.classLevel || genConfig.classLevel === "All" || matchClass(book.classLevel, genConfig.classLevel);
    if (!classMatch) return false;
    if (!genConfig.subject || genConfig.subject === "All") return true;
    
    const bookSub = (book.subject || "").toLowerCase();
    const selSub = genConfig.subject.toLowerCase();
    
    if (selSub === "social science" || selSub === "sst") {
      return bookSub.includes("social") || bookSub === "sst" || bookSub.includes("samajik");
    }
    
    if (selSub === "science") {
      if (bookSub.includes("social")) return false;
      return bookSub.includes("science") || bookSub.includes("vigyan");
    }

    if (selSub === "mathematics" || selSub === "maths" || selSub === "math") {
      return bookSub.includes("math") || bookSub.includes("ganit");
    }

    if (selSub === "english") {
      return bookSub.includes("english") || bookSub.includes("poorvi") || bookSub.includes("honeycomb") || bookSub.includes("honeydew") || bookSub.includes("beehive") || bookSub.includes("first flight");
    }

    if (selSub === "hindi") {
      return bookSub.includes("hindi") || bookSub.includes("malhar") || bookSub.includes("vasant") || bookSub.includes("sparsh") || bookSub.includes("kshitij");
    }

    if (selSub === "sanskrit") {
      return bookSub.includes("sanskrit") || bookSub.includes("deepakam") || bookSub.includes("ruchira") || bookSub.includes("shemushi");
    }
    
    return bookSub === selSub || bookSub.includes(selSub);
  });
  const effectiveFilteredBooks = filteredBooks.length > 0 ? filteredBooks : effectiveGenClassBooks;

  const selectedBookObj = books.find(b => b.id === genConfig.bookId) || effectiveFilteredBooks[0] || activeBooks[0] || null;

  return (
    <div className="space-y-6">
      {/* Module Header */}
      <div
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 sm:p-8 rounded-3xl border border-teal-200/80 shadow-xl shadow-teal-100/50 text-slate-900"
        style={{ background: 'linear-gradient(135deg, #f0fdfa, #ccfbf1)' }}
      >
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-white/80 border border-teal-300 text-teal-700 shadow-xs">
              <FileSpreadsheet className="h-6 w-6" />
            </span>
            <h1
              className="text-2xl font-black tracking-tight text-slate-900"
            >
              CSV Question Generator
            </h1>
            <span
              className="px-2.5 py-0.5 rounded-full text-xs font-black bg-teal-200/80 text-teal-900 border border-teal-300/60"
            >
              Primary Source Truth
            </span>
          </div>
          <p className="mt-1.5 text-sm text-slate-700 font-medium">
            Upload chapter PDFs or select curriculum textbooks to generate verified, syllabus-aligned CSV question banks.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            id="btn-upload-chapter-pdf"
            onClick={() => setIsDirectUploadOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-lg shadow-indigo-600/25 transition-all cursor-pointer"
          >
            <Upload className="h-4 w-4" />
            Upload Chapter PDF
          </button>
        </div>
      </div>

      {/* CSV QUESTION GENERATOR WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN: MAIN CONFIGURATION PANEL */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                Grounded CSV Question Generator
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Generate grounded CSV question banks exclusively from your uploaded verified PDF source.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsDirectUploadOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-400 text-xs font-bold transition-all border border-indigo-200/60 cursor-pointer"
            >
              <Upload className="h-3.5 w-3.5" />
              <span>Upload Chapter PDF</span>
            </button>
          </div>

          {/* DYNAMIC PDF UPLOAD / CONTEXT BAR */}
          <div className="p-4 rounded-2xl border border-dashed border-indigo-200 dark:border-indigo-800/80 bg-gradient-to-r from-indigo-50/50 via-teal-50/30 to-slate-50 dark:from-indigo-950/30 dark:via-teal-950/20 dark:to-slate-900/50">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-xs">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-slate-900 dark:text-white">
                      {selectedBookObj ? cleanBookTitle(selectedBookObj.bookTitle) : 'No PDF Source Selected'}
                    </span>
                    {selectedBookObj && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        Active Dynamic Context
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {selectedBookObj
                      ? `${selectedBookObj.classLevel} • ${selectedBookObj.subject} • ${selectedBookObj.chapters?.length || 0} Chapter(s) Indexed`
                      : 'Upload educator chapter PDF or select textbook to establish dynamic context.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsDirectUploadOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                >
                  <Upload className="h-3.5 w-3.5" />
                  <span>Upload Chapter PDF</span>
                </button>
              </div>
            </div>
          </div>

          {/* Global Gemini Model Selector */}
          <div className="bg-slate-50/80 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
            <GeminiModelSelector
              selectedModel={selectedModel}
              onModelChange={setSelectedModel}
              processingMode={processingMode}
              onProcessingModeChange={setProcessingMode}
            />
          </div>

            {/* Source Selection Row: Class, Subject, Book */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Class *</label>
                <select
                  value={genConfig.classLevel}
                  onChange={(e) => {
                    const cLevel = e.target.value;
                    const matchingClassBooks = activeBooks.filter(b => matchClass(b.classLevel, cLevel));
                    const availableSubs = Array.from(
                      new Set<string>(
                        matchingClassBooks.map(b => normalizeSubject(b.subject, b.bookTitle))
                      )
                    ).filter(Boolean).sort((a, b) => a.localeCompare(b));

                    const nextSub = availableSubs.some(s => matchSubject(s, genConfig.subject))
                      ? (availableSubs.find(s => matchSubject(s, genConfig.subject)) || genConfig.subject || 'Science')
                      : (availableSubs[0] || 'Science');

                    const matchingSubBooks = (matchingClassBooks.length > 0 ? matchingClassBooks : activeBooks).filter(b =>
                      matchSubject(nextSub, b.subject, undefined, b.bookTitle)
                    );

                    const firstBook = matchingSubBooks[0] || matchingClassBooks[0] || activeBooks[0] || null;
                    const blueprintTypes = getBlueprintQuestionTypesForSubject(nextSub, firstBook ? firstBook.bookTitle : '');
                    setGenConfig(prev => ({
                      ...prev,
                      classLevel: cLevel,
                      subject: nextSub,
                      questionTypes: blueprintTypes,
                      bookId: firstBook ? firstBook.id : '',
                      chapterId: firstBook && firstBook.chapters?.length > 0 ? firstBook.chapters[0].id : '',
                      selectedChapterIds: firstBook && firstBook.chapters?.length > 0 ? [firstBook.chapters[0].id] : [],
                    }));
                  }}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-white"
                >
                  {availableClasses.map(cls => (
                    <option key={cls} value={cls}>{cls}</option>
                  ))}
                  {availableClasses.length === 0 && <option value="Class 6">Class 6</option>}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Subject *</label>
                <select
                  value={genConfig.subject}
                  onChange={(e) => {
                    const sub = e.target.value;
                    const matchingBooksForSub = activeBooks.filter(b =>
                      matchClass(b.classLevel, genConfig.classLevel) && matchSubject(sub, b.subject, undefined, b.bookTitle)
                    );

                    const firstBook = matchingBooksForSub[0] || activeBooks.find(b => matchSubject(sub, b.subject, undefined, b.bookTitle)) || null;
                    const blueprintTypes = getBlueprintQuestionTypesForSubject(sub, firstBook ? firstBook.bookTitle : '');
                    setGenConfig(prev => ({
                      ...prev,
                      subject: sub,
                      questionTypes: blueprintTypes,
                      bookId: firstBook ? firstBook.id : '',
                      chapterId: firstBook && firstBook.chapters?.length > 0 ? firstBook.chapters[0].id : '',
                      selectedChapterIds: firstBook && firstBook.chapters?.length > 0 ? [firstBook.chapters[0].id] : [],
                    }));
                  }}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-white"
                >
                  {genAvailableSubjects.map(sub => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                  {genAvailableSubjects.length === 0 && <option value="Mathematics">Mathematics</option>}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Book *</label>
                <select
                  value={genConfig.bookId}
                  onChange={(e) => {
                    const bId = e.target.value;
                    const found = books.find(b => b.id === bId);
                    const normSubject = found ? normalizeSubject(found.subject, found.bookTitle) : genConfig.subject;
                    const blueprintTypes = getBlueprintQuestionTypesForSubject(normSubject, found ? found.bookTitle : '');
                    setGenConfig(prev => ({
                      ...prev,
                      bookId: bId,
                      classLevel: found ? found.classLevel : prev.classLevel,
                      subject: normSubject,
                      questionTypes: blueprintTypes,
                      chapterId: found && found.chapters?.length > 0 ? found.chapters[0].id : '',
                      selectedChapterIds: found && found.chapters?.length > 0 ? [found.chapters[0].id] : [],
                    }));
                  }}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-white"
                >
                  {effectiveFilteredBooks.length === 0 ? (
                    <option value="">No books available for selection</option>
                  ) : (
                    effectiveFilteredBooks.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.bookTitle} ({b.chapters?.length || 0} Ch)
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            {/* Generation Scope & Distribution */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Generation Scope *</label>
                <div className="grid grid-cols-3 gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
                  {(['FULL_BOOK', 'FULL_CHAPTER', 'SINGLE_CHAPTER'] as const).map((sc) => (
                    <button
                      key={sc}
                      type="button"
                      onClick={() => setGenConfig(prev => ({ ...prev, scope: sc }))}
                      className={`py-2 rounded-xl text-[10px] font-extrabold transition-all ${
                        genConfig.scope === sc
                          ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      {sc === 'FULL_BOOK' ? 'Full Book' : sc === 'FULL_CHAPTER' ? 'Full Chapter' : 'Single Chapter'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Question Distribution</label>
                <div className="px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center justify-between text-xs font-bold text-slate-800 dark:text-white">
                  <span>Questions Per Chapter</span>
                  <span className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-[10px]">AUTOMATIC</span>
                </div>
              </div>
            </div>

            {/* Chapter Selector Grid (Zero HTML Select Dropdowns) */}
            {genConfig.scope === 'FULL_BOOK' ? (
              <div className="p-4 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <BookOpen className="h-5 w-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <div>
                    <h4 className="text-xs font-black text-indigo-900 dark:text-indigo-200">Full Book Scope Active</h4>
                    <p className="text-[11px] font-medium text-indigo-700 dark:text-indigo-300">
                      Questions will be generated automatically across all {selectedBookObj?.chapters?.length || 0} chapters in "{selectedBookObj?.bookTitle || 'selected book'}".
                    </p>
                  </div>
                </div>
              </div>
            ) : genConfig.scope === 'FULL_CHAPTER' ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Select Target Chapters (Multi-Select Ticks) *
                    </label>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Click chapter tiles below to check/uncheck chapters for batch question generation.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const allIds = selectedBookObj?.chapters?.map(c => c.id) || [];
                        setGenConfig(prev => ({ ...prev, selectedChapterIds: allIds, chapterId: allIds[0] || '' }));
                      }}
                      className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 text-[11px] font-extrabold cursor-pointer transition-all border border-indigo-200 dark:border-indigo-800"
                    >
                      Select All ({selectedBookObj?.chapters?.length || 0})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setGenConfig(prev => ({ ...prev, selectedChapterIds: [] }));
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-bold cursor-pointer transition-all"
                    >
                      Clear Selection
                    </button>
                  </div>
                </div>

                {selectedBookObj?.chapters && selectedBookObj.chapters.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-72 overflow-y-auto p-1">
                    {selectedBookObj.chapters.map(ch => {
                      const selectedList = genConfig.selectedChapterIds || (genConfig.chapterId ? [genConfig.chapterId] : []);
                      const isChecked = selectedList.includes(ch.id);
                      return (
                        <button
                          key={ch.id}
                          type="button"
                          onClick={() => {
                            const updated = isChecked
                              ? selectedList.filter(id => id !== ch.id)
                              : [...selectedList, ch.id];
                            setGenConfig(prev => ({
                              ...prev,
                              selectedChapterIds: updated,
                              chapterId: updated[0] || '',
                            }));
                          }}
                          className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between gap-2.5 cursor-pointer ${
                            isChecked
                              ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/20 ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-slate-900'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:border-indigo-300 dark:hover:border-indigo-700'
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-black tracking-wide ${
                              isChecked
                                ? 'bg-white/20 text-white'
                                : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                            }`}>
                              Chapter {ch.chapterNumber}
                            </span>
                            <div className={`h-5 w-5 rounded-md flex items-center justify-center border transition-all ${
                              isChecked ? 'bg-white text-indigo-600 border-white' : 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800'
                            }`}>
                              {isChecked && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-800 dark:text-slate-100" style={{ color: isChecked ? '#ffffff' : '#1e293b' }}>
                            <BookOpen className="h-3.5 w-3.5 flex-shrink-0" />
                            <span className="truncate">{(ch as any).title || (ch as any).chapterName || (ch as any).name || (ch as any).chapter_title || ch.chapterTitle || "Unnamed Chapter"}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 text-center text-xs font-bold text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                    No chapters available for this textbook.
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Select Single Chapter *
                  </label>
                  <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                    {selectedBookObj?.chapters?.length || 0} Chapter(s) Available
                  </span>
                </div>

                {selectedBookObj?.chapters && selectedBookObj.chapters.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-72 overflow-y-auto p-1">
                    {selectedBookObj.chapters.map(ch => {
                      const isSelected = genConfig.chapterId === ch.id;
                      return (
                        <button
                          key={ch.id}
                          type="button"
                          onClick={() => setGenConfig(prev => ({ ...prev, chapterId: ch.id, selectedChapterIds: [ch.id] }))}
                          className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between gap-2.5 cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/20 ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-slate-900'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:border-indigo-300 dark:hover:border-indigo-700'
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-black tracking-wide ${
                              isSelected
                                ? 'bg-white/20 text-white'
                                : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                            }`}>
                              Chapter {ch.chapterNumber}
                            </span>
                            {isSelected && <Check className="h-4 w-4 text-white" />}
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-800 dark:text-slate-100" style={{ color: isSelected ? '#ffffff' : '#1e293b' }}>
                            <BookOpen className="h-3.5 w-3.5 flex-shrink-0" />
                            <span className="truncate">{(ch as any).title || (ch as any).chapterName || (ch as any).name || (ch as any).chapter_title || ch.chapterTitle || "Unnamed Chapter"}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 text-center text-xs font-bold text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                    No chapters available for this textbook.
                  </div>
                )}
              </div>
            )}

            {/* Allowed Question Types (Subject-Aware Smart Auto-Select with CBSE Blueprint) */}
            <SubjectBlueprintSelector
              selectedSubject={genConfig.subject}
              bookTitle={selectedBookObj?.bookTitle}
              selectedTypes={genConfig.questionTypes}
              onChangeTypes={(types) => setGenConfig(prev => ({ ...prev, questionTypes: types }))}
            />

            {/* Configuration Row: Difficulty, Marks, Question Count */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Difficulty</label>
                <select
                  value={genConfig.difficulty}
                  onChange={(e) => setGenConfig(prev => ({ ...prev, difficulty: e.target.value }))}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-white"
                >
                  <option value="Mixed">Mixed (Easy, Med, Hard)</option>
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Marks Setting</label>
                <select
                  value={genConfig.marks}
                  onChange={(e) => setGenConfig(prev => ({ ...prev, marks: Number(e.target.value) }))}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-white"
                >
                  <option value={1}>Auto (By Type)</option>
                  <option value={2}>2 Marks</option>
                  <option value={5}>5 Marks</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Question Count</label>
                <select
                  value={genConfig.numberOfQuestions}
                  onChange={(e) => setGenConfig(prev => ({ ...prev, numberOfQuestions: Number(e.target.value) }))}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-white"
                >
                  <option value={5}>5 Questions</option>
                  <option value={10}>10 Questions</option>
                  <option value={15}>15 Questions</option>
                  <option value={20}>20 Questions</option>
                  <option value={25}>25 Questions</option>
                  <option value={50}>50 Questions</option>
                  <option value={100}>100 Questions</option>
                  <option value={200}>200 Questions</option>
                  <option value={500}>500 Questions</option>
                  <option value={1000}>1000 Questions</option>
                </select>
              </div>
            </div>

            {/* Generate Button */}
            <div className="pt-2">
              <button
                onClick={handleGenerateQuestions}
                disabled={generating || activeBooks.length === 0}
                className="w-full flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-extrabold text-sm shadow-xl shadow-indigo-600/30 transition-all"
              >
                {generating ? (
                  <>
                    <RefreshCw className="h-5 w-5 animate-spin" />
                    Generating Source-Grounded CSV...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5" />
                    Generate CSV Question Bank
                  </>
                )}
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN: SELECTED SOURCE TRUTH & EXCEL COMPATIBILITY */}
          <div className="lg:col-span-1 space-y-6">
            {/* Selected Source Truth */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <ShieldCheck className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Selected Source Truth</h3>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Book Title</span>
                  <span className="font-extrabold text-slate-900 dark:text-white text-sm">
                    {selectedBookObj ? selectedBookObj.bookTitle : 'No book selected'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Class</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {selectedBookObj ? selectedBookObj.classLevel : genConfig.classLevel}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Subject</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {selectedBookObj ? selectedBookObj.subject : genConfig.subject}
                    </span>
                  </div>
                </div>

                {selectedBookObj?.chapters?.find(c => c.id === genConfig.chapterId) && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Selected Chapter & Topic Details</span>
                    <p className="font-extrabold text-slate-900 dark:text-white text-xs">
                      Chapter {selectedBookObj.chapters.find(c => c.id === genConfig.chapterId)?.chapterNumber}
                    </p>
                    <div className="space-y-1 max-h-40 overflow-y-auto pr-1 pt-1">
                      {selectedBookObj.chapters.find(c => c.id === genConfig.chapterId)?.topics?.map((t, idx) => (
                        <div key={idx} className="flex items-start gap-1.5 text-[11px] text-slate-700 dark:text-slate-300">
                          <span className="text-indigo-500 font-bold">•</span>
                          <span className="leading-tight">{t}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Source Verification</span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[11px] font-mono text-slate-500">
                      {selectedBookObj ? `${selectedBookObj.pdfHash.slice(0, 16)}...` : 'N/A'}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1">
                      <Check className="h-3 w-3" /> Verified
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Microsoft Excel UTF-8 BOM Compatibility */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <FileSpreadsheet className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Microsoft Excel UTF-8 BOM Compatibility</h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Exported XLSX question banks ensure Devanagari/Hindi script and mathematical symbols render perfectly in Microsoft Excel without character corruption.
              </p>
            </div>
          </div>
        </div>

      {/* UPLOAD NEW BOOK MODAL */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-xl w-full shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 shrink-0">
              <div className="flex items-center gap-2">
                <span className={`p-2 rounded-xl ${targetAppendingBook ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'}`}>
                  {targetAppendingBook ? <BookPlus className="h-5 w-5" /> : <Upload className="h-5 w-5" />}
                </span>
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                    {targetAppendingBook ? `Upload Remaining Chapters` : 'NCERT Source Bulk Upload'}
                  </h3>
                  {targetAppendingBook && (
                    <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                      Adding to "{targetAppendingBook.bookTitle}" ({targetAppendingBook.classLevel} {targetAppendingBook.subject})
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => {
                  setIsUploadModalOpen(false);
                  setTargetAppendingBook(null);
                }}
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {targetAppendingBook && (
                <div className="p-4 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/60 flex items-start gap-3">
                  <BookOpen className="h-5 w-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <span className="font-extrabold text-indigo-950 dark:text-indigo-200">
                      Appending to existing textbook ({targetAppendingBook.chapters?.length || 0} existing chapters)
                    </span>
                    <p className="text-[11px] text-indigo-700 dark:text-indigo-300 mt-0.5">
                      Select your remaining chapter PDFs (e.g. Chapter 4, Chapter 5...). The system will automatically read and extract the exact chapter titles, sort them numerically, and merge them into "{targetAppendingBook.bookTitle}".
                    </p>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Class / Grade *</label>
                  <select
                    value={classLevel}
                    onChange={(e) => setClassLevel(e.target.value)}
                    className="w-full mt-1 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                  >
                    {['Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Subject *</label>
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full mt-1 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                  >
                    {['Mathematics', 'Science', 'Physics', 'Chemistry', 'Biology', 'Social Science', 'English', 'Hindi', 'Sanskrit'].map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Book Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Ganita Prakash or Mathematics Textbook"
                  value={bookTitle}
                  onChange={(e) => setBookTitle(e.target.value)}
                  className="w-full mt-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                />
              </div>

              {/* Upload Source Type - Locked to Multiple PDFs as requested */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 block">Upload Source Type *</label>
                <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="p-1.5 rounded-lg bg-emerald-600 text-white">
                      <FileText className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">Multiple PDFs (Chapter-wise NCERT Upload)</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">Select one or multiple chapter PDF files together</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-200 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-200">
                    Active Mode
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Medium</label>
                  <input
                    type="text"
                    value={medium}
                    onChange={(e) => setMedium(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Board</label>
                  <input
                    type="text"
                    value={board}
                    onChange={(e) => setBoard(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Edition / Session</label>
                  <input
                    type="text"
                    value={edition}
                    onChange={(e) => setEdition(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium"
                  />
                </div>
              </div>

              {/* Global Gemini Model Selector */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                <GeminiModelSelector
                  selectedModel={selectedModel}
                  onModelChange={setSelectedModel}
                  processingMode={processingMode}
                  onProcessingModeChange={setProcessingMode}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Select Multiple Chapter PDFs *
                </label>
                {/* Entire Dropzone is clickable anywhere */}
                <div 
                  onClick={() => document.getElementById('bulk-upload')?.click()}
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                      const filesArr = Array.from(e.dataTransfer.files) as File[];
                      const pdfs = filesArr.filter(f => f.name.toLowerCase().endsWith('.pdf'));
                      if (pdfs.length > 0) {
                        setSelectedFiles(pdfs);
                        if (!bookTitle) {
                          setBookTitle(pdfs.length === 1 ? pdfs[0].name.replace(/\.[^/.]+$/, '') : `${subject} Textbook Package`);
                        }
                      }
                    }
                  }}
                  className="mt-1 group cursor-pointer flex flex-col items-center justify-center px-6 pt-5 pb-6 border-2 border-slate-300 dark:border-slate-700 border-dashed rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 hover:border-emerald-500 hover:bg-emerald-50/30 dark:hover:bg-slate-800 transition-all text-center"
                >
                  <input
                    id="bulk-upload"
                    name="bulk-upload"
                    type="file"
                    accept=".pdf"
                    multiple={true}
                    onChange={handleFilesChange}
                    className="sr-only"
                  />
                  <FileText className="mx-auto h-10 w-10 text-slate-400 group-hover:text-emerald-600 transition-colors" />
                  <div className="mt-2 text-xs text-slate-700 dark:text-slate-300 font-bold">
                    <span className="text-emerald-600 dark:text-emerald-400 underline decoration-2 underline-offset-2">Click anywhere in this box to browse</span> or drag and drop
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Official NCERT Textbook Chapter PDFs (Select single or multiple chapters)
                  </p>
                  {selectedFiles.length > 0 && (
                    <div 
                      onClick={(e) => e.stopPropagation()} 
                      className="mt-3 w-full text-left bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700 max-h-36 overflow-y-auto"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                          ✓ {selectedFiles.length} file(s) selected:
                        </p>
                        <button
                          type="button"
                          onClick={() => setSelectedFiles([])}
                          className="text-[10px] text-rose-500 hover:underline font-semibold"
                        >
                          Clear
                        </button>
                      </div>
                      {selectedFiles.map((f, idx) => (
                        <p key={idx} className="text-[10px] text-slate-600 dark:text-slate-300 truncate py-0.5">
                          • {f.name} ({(f.size / (1024 * 1024)).toFixed(1)} MB)
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {uploading && (
                <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-3">
                  <RefreshCw className="h-5 w-5 animate-spin text-slate-900 dark:text-white" />
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">Processing Bulk NCERT Pipeline...</p>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">{uploadProgress}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-end gap-3 shrink-0">
              <button
                onClick={() => {
                  setIsUploadModalOpen(false);
                  setTargetAppendingBook(null);
                }}
                disabled={uploading}
                className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => processAndUploadBook()}
                disabled={uploading || selectedFiles.length === 0}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-white font-extrabold text-xs shadow-md transition-all cursor-pointer ${
                  targetAppendingBook
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50'
                    : 'bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-700 disabled:opacity-50'
                }`}
              >
                {uploading 
                  ? 'Processing & Indexing...' 
                  : (targetAppendingBook 
                      ? (selectedFiles.length > 0 ? `Add ${selectedFiles.length} Chapter(s) to Book` : 'Select Chapters to Add') 
                      : 'Process & Index Book')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VERSION CONFLICT MODAL */}
      {isConflictModalOpen && conflictBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-amber-200 dark:border-amber-900 p-8 max-w-md w-full shadow-2xl space-y-6">
            <div className="flex items-center gap-3 text-amber-600">
              <AlertTriangle className="h-6 w-6" />
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">New Book Version Detected</h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              An existing book with matching content signature already exists in your library ("{conflictBook.bookTitle}"). How would you like to proceed?
            </p>
            <div className="space-y-2">
              <button
                onClick={async () => {
                  if (conflictBook) {
                    conflictBook.status = 'ARCHIVED';
                    await saveNcertBook(conflictBook);
                  }
                  if (pendingUploadData) {
                    await saveNcertBook(pendingUploadData);
                    setGenConfig(prev => ({
                      ...prev,
                      bookId: pendingUploadData.id,
                      classLevel: pendingUploadData.classLevel,
                      subject: pendingUploadData.subject,
                      chapterId: pendingUploadData.chapters && pendingUploadData.chapters.length > 0 ? pendingUploadData.chapters[0].id : '',
                    }));
                  }
                  await loadBooks();
                  setIsConflictModalOpen(false);
                  setIsUploadModalOpen(false);
                  setSelectedFiles([]);
                  setBookTitle('');
                  setPendingUploadData(null);
                  setConflictBook(null);
                }}
                className="w-full py-3 rounded-xl bg-indigo-600 text-white font-bold text-xs shadow-md"
              >
                Replace Current Version (Archive Old)
              </button>
              <button
                onClick={async () => {
                  if (pendingUploadData) {
                    await saveNcertBook(pendingUploadData);
                    setGenConfig(prev => ({
                      ...prev,
                      bookId: pendingUploadData.id,
                      classLevel: pendingUploadData.classLevel,
                      subject: pendingUploadData.subject,
                      chapterId: pendingUploadData.chapters && pendingUploadData.chapters.length > 0 ? pendingUploadData.chapters[0].id : '',
                    }));
                    await loadBooks();
                  }
                  setIsConflictModalOpen(false);
                  setIsUploadModalOpen(false);
                  setSelectedFiles([]);
                  setBookTitle('');
                  setPendingUploadData(null);
                  setConflictBook(null);
                }}
                className="w-full py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs"
              >
                Keep Both Versions (Separate Editions)
              </button>
              <button
                onClick={() => {
                  setIsConflictModalOpen(false);
                  setPendingUploadData(null);
                  setConflictBook(null);
                }}
                className="w-full py-2.5 rounded-xl text-slate-500 font-medium text-xs hover:bg-slate-100"
              >
                Cancel Upload
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CHAPTER VIEW MODAL */}
      {isChapterModalOpen && selectedBookForChapters && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 max-w-3xl w-full max-h-[85vh] overflow-y-auto shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                  {selectedBookForChapters.classLevel} • {selectedBookForChapters.subject}
                </span>
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white mt-1">
                  {selectedBookForChapters.bookTitle}
                </h3>
              </div>
              <button
                onClick={() => setIsChapterModalOpen(false)}
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Extracted Chapters ({selectedBookForChapters.chapters?.length || 0})
              </h4>
              <div className="space-y-4">
                {selectedBookForChapters.chapters?.map((ch, idx) => (
                  <div key={ch.id || idx} className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-black tracking-wide">
                          Chapter {ch.chapterNumber}
                        </span>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-100" style={{ color: '#1e293b' }}>
                          {(ch as any).title || (ch as any).chapterName || (ch as any).name || (ch as any).chapter_title || ch.chapterTitle || "Unnamed Chapter"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          Pages {ch.pageStart} - {ch.pageEnd}
                        </span>
                        <button
                          onClick={() => {
                            setEditingChapterId(ch.id);
                            setEditChapterNumber(Number(ch.chapterNumber) || 1);
                          }}
                          className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-indigo-600 transition-colors"
                          title="Edit Chapter Number"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={async () => {
                            if (confirm(`Are you sure you want to remove Chapter ${ch.chapterNumber}?`)) {
                              const updatedChapters = selectedBookForChapters.chapters.filter(c => c.id !== ch.id);
                              const updatedBook = { ...selectedBookForChapters, chapters: updatedChapters };
                              await saveNcertBook(updatedBook);
                              setSelectedBookForChapters(updatedBook);
                              setBooks(await getAllNcertBooks());
                            }
                          }}
                          className="p-2 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 transition-colors"
                          title="Delete Chapter"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {editingChapterId === ch.id && (
                      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Chapter Number</label>
                          <input
                            type="number"
                            min={1}
                            max={99}
                            value={editChapterNumber}
                            onChange={(e) => setEditChapterNumber(parseInt(e.target.value, 10) || 1)}
                            className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            onClick={() => setEditingChapterId(null)}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={async () => {
                              const newNum = editChapterNumber;
                              const updatedChapters = selectedBookForChapters.chapters.map(c => {
                                if (c.id === ch.id) {
                                  return {
                                    ...c,
                                    chapterNumber: newNum,
                                    chapterTitle: `Chapter ${newNum}`,
                                  };
                                }
                                return c;
                              });
                              const updatedBook = { ...selectedBookForChapters, chapters: updatedChapters };
                              await saveNcertBook(updatedBook);
                              setSelectedBookForChapters(updatedBook);
                              setBooks(await getAllNcertBooks());
                              setEditingChapterId(null);
                            }}
                            className="px-4 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setIsChapterModalOpen(false)}
                className="px-6 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PREVIEW & EXPORT MODAL */}
      {isPreviewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600">
                    <CheckCircle2 className="h-5 w-5" />
                  </span>
                  <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                    Generated Question Bank Preview ({generatedQuestions.length} Accepted)
                  </h3>
                </div>
                <div className="flex items-center gap-3 mt-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400">
                  <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">Generated: {generationDiagnostics?.validationInputCount ?? generatedQuestions.length}</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">Accepted: {generationDiagnostics?.acceptedCount ?? generatedQuestions.length}</span>
                  <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">Rejected: {generationDiagnostics?.rejectedCount ?? 0}</span>
                  <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">Duplicates: {generationDiagnostics?.duplicatesCount ?? 0}</span>
                </div>
              </div>
              <button
                onClick={() => setIsPreviewModalOpen(false)}
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Questions List Preview */}
            <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
              {generatedQuestions.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <p className="text-sm font-bold">No verified questions available.</p>
                  <p className="text-xs mt-1">Please check the source chapter or adjust generation parameters.</p>
                </div>
              ) : (
                generatedQuestions.map((q, idx) => {
                  const optA = (q as any).option_a || q.optionA;
                  const optB = (q as any).option_b || q.optionB;
                  const optC = (q as any).option_c || q.optionC;
                  const optD = (q as any).option_d || q.optionD;
                  return (
                    <div key={q.id || idx} className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                          Q{idx + 1} • {q.type} • {q.difficulty} ({q.marks} Mark)
                        </span>
                        <span className="text-[11px] font-bold text-slate-500">
                          {q.chapter}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">
                        {q.text}
                      </p>
                      {optA && (
                        <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] text-slate-700 dark:text-slate-300 font-medium">
                          <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">A) {optA}</div>
                          <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">B) {optB}</div>
                          <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">C) {optC}</div>
                          <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">D) {optD}</div>
                        </div>
                      )}
                      <div className="pt-2 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                        Correct Answer: {q.answer}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
              <span className="text-xs font-medium text-slate-500">
                Exact XLSX Columns: board, grade, subject, publisher, book, chapter, topic, type, difficulty, marks, text, option_a, option_b, option_c, option_d, answer
              </span>
              <div className="flex gap-3">
                <button
                  onClick={() => setIsPreviewModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Close
                </button>
                <button
                  onClick={handleSaveToPermanentBank}
                  disabled={generatedQuestions.length === 0}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs shadow-lg ${generatedQuestions.length === 0 ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/25'}`}
                >
                  <Archive className="h-4 w-4" />
                  Save to Permanent Bank
                </button>
                <button
                  onClick={downloadCsv}
                  disabled={generatedQuestions.length === 0}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs shadow-lg ${generatedQuestions.length === 0 ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/25'}`}
                >
                  <Download className="h-4 w-4" />
                  Download XLSX (Excel)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DIRECT LOCAL UPLOAD MODAL */}
      <DirectLocalUploadModal
        isOpen={isDirectUploadOpen}
        onClose={() => {
          setIsDirectUploadOpen(false);
          setTargetAppendingBook(null);
        }}
        onSuccess={async (savedBook) => {
          setIsDirectUploadOpen(false);
          setTargetAppendingBook(null);
          await loadBooks();
          if (savedBook.classLevel) setSelectedClass(savedBook.classLevel);
          if (savedBook.subject) setSelectedSubject(savedBook.subject);
          setSelectedBookId(savedBook.id);
          const firstChId = savedBook.chapters && savedBook.chapters.length > 0 ? savedBook.chapters[0].id : '';
          setGenConfig(prev => ({
            ...prev,
            classLevel: savedBook.classLevel || prev.classLevel,
            subject: normalizeSubject(savedBook.subject, savedBook.bookTitle),
            bookId: savedBook.id,
            chapterId: firstChId,
            selectedChapterIds: firstChId ? [firstChId] : [],
          }));
        }}
        targetBook={targetAppendingBook}
        initialClass={selectedClass || 'Class 6'}
        initialSubject={selectedSubject || 'Mathematics'}
      />

      {/* IMMERSIVE HIGH-FIDELITY FULL-SCREEN CANVAS PDF VIEWER MODAL */}
      {isPdfViewerOpen && (pdfViewerHash || pdfViewerFilePath) && (() => {
        const primaryUrl = pdfViewerFilePath
          ? `/api/ncert/stream-pdf?path=${encodeURIComponent(pdfViewerFilePath)}&hash=${pdfViewerHash || ''}`
          : `/api/pdf/${pdfViewerHash}`;

        const fallbacks: string[] = [];
        if (pdfViewerHash) {
          fallbacks.push(`/api/pdf/${pdfViewerHash}`);
        }

        return (
          <InteractivePdfViewer
            pdfUrl={primaryUrl}
            fallbackUrls={fallbacks}
            sourcePdfHash={pdfViewerHash}
            title={pdfViewerTitle}
            subtitle={`${selectedClass || 'NCERT'} • ${selectedSubject || 'Textbook'}`}
            initialPage={pdfViewerPageStart || 1}
            onClose={() => setIsPdfViewerOpen(false)}
          />
        );
      })()}
    </div>
  );
};
