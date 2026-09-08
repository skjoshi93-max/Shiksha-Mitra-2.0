import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Upload,
  X,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Folder,
  Layers,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  GitMerge,
} from 'lucide-react';
import { NCERT_CLASSES, getSubjectsForClass, NcertClassLevel } from '../lib/curriculumStructure';
import { NcertBook } from '../types';
import { getAllNcertBooks, saveNcertBook } from '../lib/db';

interface DirectLocalUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (book: NcertBook) => void;
  targetBook?: NcertBook | null; // For appending chapters to existing book
  initialClass?: string;
  initialSubject?: string;
}

interface StagedFile {
  id: string;
  file: File;
  name: string;
  size: number;
  chapterNumber: number;
  isLesson?: boolean;
  lessonNumber?: number;
  parentChapterNumber?: number;
  lessonTitle?: string;
  isValidPdf: boolean;
  validationError?: string;
}

/**
 * Standard suggested textbook titles by Class and Subject
 */
const DEFAULT_BOOK_TITLES: Record<string, Record<string, string>> = {
  'Class 6': {
    'Mathematics': 'Ganita Prakash',
    'Science': 'Curiosity',
    'English': 'Poorvi',
    'Hindi': 'Malhar',
    'Social Science': 'Exploring Society: India and Beyond',
    'Sanskrit': 'Deepakam',
  },
  'Class 7': {
    'Mathematics': 'Mathematics - Class 7',
    'Science': 'Science - Class 7',
    'English': 'Honeycomb',
    'Hindi': 'Vasant Bhag 2',
    'Social Science': 'Our Pasts - II',
    'Sanskrit': 'Ruchira Bhag 2',
  },
  'Class 8': {
    'Mathematics': 'Mathematics - Class 8',
    'Science': 'Science - Class 8',
    'English': 'Honeydew',
    'Hindi': 'Vasant Bhag 3',
    'Social Science': 'Resource and Development',
    'Sanskrit': 'Ruchira Bhag 3',
  },
  'Class 9': {
    'Mathematics': 'Mathematics - Class 9',
    'Science': 'Science - Class 9',
    'English': 'Beehive',
    'Hindi': 'Kshitij Bhag 1',
    'Social Science': 'Contemporary India - I',
    'Sanskrit': 'Shemushi Bhag 1',
  },
  'Class 10': {
    'Mathematics': 'Mathematics - Class 10',
    'Science': 'Science - Class 10',
    'English': 'First Flight',
    'Hindi': 'Kshitij Bhag 2',
    'Social Science': 'India and the Contemporary World - II',
    'Sanskrit': 'Shemushi Bhag 2',
  },
  'Class 11': {
    'Physics': 'Physics Part I & II',
    'Chemistry': 'Chemistry Part I & II',
    'Mathematics': 'Mathematics - Class 11',
    'Biology': 'Biology - Class 11',
    'English': 'Hornbill',
    'Economics': 'Indian Economic Development',
  },
  'Class 12': {
    'Physics': 'Physics Part I & II',
    'Chemistry': 'Chemistry Part I & II',
    'Mathematics': 'Mathematics Part I & II',
    'Biology': 'Biology - Class 12',
    'English': 'Flamingo',
    'Economics': 'Introductory Macroeconomics',
  },
};

/**
 * Validate PDF magic bytes: reads first 5 bytes to ensure "%PDF-"
 */
async function validatePdfMagicBytes(file: File): Promise<boolean> {
  try {
    const slice = file.slice(0, 5);
    const buffer = await slice.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    // %PDF- is 0x25, 0x50, 0x44, 0x46, 0x2D
    const header = String.fromCharCode(...bytes);
    return header.startsWith('%PDF-');
  } catch (_) {
    return false;
  }
}

/**
 * Extract chapter and sub-lesson information from file name
 * e.g. "Chapter 1 Lesson 2.pdf" -> chapter 1, lesson 2
 * e.g. "Chapter 3.pdf" -> chapter 3
 */
function parseFileInfo(fileName: string, fallbackIndex: number): {
  chapterNumber: number;
  isLesson: boolean;
  lessonNumber?: number;
  parentChapterNumber?: number;
  lessonTitle?: string;
} {
  const clean = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const lessonMatch = clean.match(/(?:chapter|ch|unit)[\s._-]*(\d+)[\s._-]*(?:lesson|sublesson|part|lec)[\s._-]*(\d+)(.*)/i);
  if (lessonMatch) {
    const parentCh = parseInt(lessonMatch[1], 10);
    const lesNum = parseInt(lessonMatch[2], 10);
    const remainder = lessonMatch[3]?.replace(/\.[^/.]+$/, '').replace(/^[ _-]+|[ _-]+$/g, '').replace(/_/g, ' ');
    return {
      chapterNumber: parentCh,
      isLesson: true,
      parentChapterNumber: parentCh,
      lessonNumber: lesNum,
      lessonTitle: remainder || `Lesson ${lesNum}`,
    };
  }

  const base = fileName.toLowerCase().replace(/\.pdf$/i, '');
  const chMatch = base.match(/(?:ch|chapter|chap|unit)[\s_-]*(\d+)/i);
  if (chMatch && chMatch[1]) {
    const parsed = parseInt(chMatch[1], 10);
    if (!isNaN(parsed) && parsed > 0 && parsed < 200) return { chapterNumber: parsed, isLesson: false };
  }

  const leadingMatch = base.match(/^(\d+)[\s._-]/);
  if (leadingMatch && leadingMatch[1]) {
    const parsed = parseInt(leadingMatch[1], 10);
    if (!isNaN(parsed) && parsed > 0 && parsed < 200) return { chapterNumber: parsed, isLesson: false };
  }

  const anyNumMatch = base.match(/\b(\d+)\b/);
  if (anyNumMatch && anyNumMatch[1]) {
    const parsed = parseInt(anyNumMatch[1], 10);
    if (!isNaN(parsed) && parsed > 0 && parsed < 200) return { chapterNumber: parsed, isLesson: false };
  }

  return { chapterNumber: fallbackIndex + 1, isLesson: false };
}

export const DirectLocalUploadModal: React.FC<DirectLocalUploadModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  targetBook,
  initialClass,
  initialSubject,
}) => {
  const [selectedClass, setSelectedClass] = useState<string>(() => {
    if (targetBook?.classLevel) return targetBook.classLevel;
    if (initialClass && NCERT_CLASSES.includes(initialClass as NcertClassLevel)) return initialClass;
    return 'Class 6';
  });

  const availableSubjects = getSubjectsForClass(selectedClass);

  const [selectedSubject, setSelectedSubject] = useState<string>(() => {
    if (targetBook?.subject) return targetBook.subject;
    if (initialSubject) return initialSubject;
    return availableSubjects[0] || 'Mathematics';
  });

  const [customSubject, setCustomSubject] = useState<string>('');
  const [bookTitle, setBookTitle] = useState<string>('');
  const [bookEdition, setBookEdition] = useState<string>('2026-27');
  const [existingLibraryBooks, setExistingLibraryBooks] = useState<NcertBook[]>([]);
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadStatusMsg, setUploadStatusMsg] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch all books to enforce single edition matching
  useEffect(() => {
    if (isOpen) {
      getAllNcertBooks().then(books => {
        setExistingLibraryBooks(books);
      }).catch(err => console.warn('Could not load library books:', err));
    }
  }, [isOpen]);

  // Check if an edition already exists for the chosen class and subject
  const matchedExistingBook = useMemo(() => {
    if (targetBook) return targetBook;
    const currentSub = selectedSubject === '__CUSTOM__' ? customSubject.trim() : selectedSubject;
    if (!currentSub) return null;
    const classNorm = selectedClass.replace(/\D+/g, '');
    const subNorm = currentSub.toLowerCase().trim();

    return existingLibraryBooks.find(b => {
      const bClass = (b.classLevel || '').replace(/\D+/g, '');
      const bSub = (b.subject || '').toLowerCase().trim();
      return bClass === classNorm && bSub === subNorm;
    }) || null;
  }, [existingLibraryBooks, selectedClass, selectedSubject, customSubject, targetBook]);

  // Sync available subjects when class changes
  useEffect(() => {
    if (targetBook) return; // locked for existing book
    const subjects = getSubjectsForClass(selectedClass);
    if (!subjects.includes(selectedSubject) && selectedSubject !== '__CUSTOM__') {
      setSelectedSubject(subjects[0] || 'Mathematics');
    }
  }, [selectedClass, targetBook, selectedSubject]);

  // Update book title default when class or subject changes or matched book is detected
  useEffect(() => {
    if (targetBook) {
      setBookTitle(targetBook.bookTitle);
      setBookEdition(targetBook.edition || '2026-27');
      setSelectedClass(targetBook.classLevel || 'Class 6');
      setSelectedSubject(targetBook.subject || 'General');
      return;
    }
    if (matchedExistingBook) {
      setBookTitle(matchedExistingBook.bookTitle);
      if (matchedExistingBook.edition) {
        setBookEdition(matchedExistingBook.edition);
      }
      return;
    }
    const currentSub = selectedSubject === '__CUSTOM__' ? customSubject : selectedSubject;
    const suggested = DEFAULT_BOOK_TITLES[selectedClass]?.[currentSub] || `${currentSub} (${selectedClass})`;
    setBookTitle(suggested);
  }, [selectedClass, selectedSubject, customSubject, targetBook, matchedExistingBook]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStagedFiles([]);
      setIsUploading(false);
      setUploadProgress(0);
      setUploadStatusMsg('');
      setErrorMessage(null);
      if (targetBook) {
        setBookTitle(targetBook.bookTitle);
        setBookEdition(targetBook.edition || '2026-27');
        setSelectedClass(targetBook.classLevel || 'Class 6');
        setSelectedSubject(targetBook.subject || 'General');
      } else {
        const cls = initialClass && NCERT_CLASSES.includes(initialClass as NcertClassLevel) ? initialClass : 'Class 6';
        setSelectedClass(cls);
        const sub = initialSubject || getSubjectsForClass(cls)[0] || 'Mathematics';
        setSelectedSubject(sub);
      }
    }
  }, [isOpen, targetBook, initialClass, initialSubject]);

  // Handle file staging and validation
  const processFiles = useCallback(async (files: FileList | File[]) => {
    setErrorMessage(null);
    const newStaged: StagedFile[] = [];

    const existingCount = stagedFiles.length;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const name = file.name;
      const isExtPdf = name.toLowerCase().endsWith('.pdf');
      const isValidMagic = isExtPdf ? await validatePdfMagicBytes(file) : false;

      let validationError: string | undefined;
      if (!isExtPdf) {
        validationError = 'File must have .pdf extension';
      } else if (!isValidMagic) {
        validationError = 'File is not a valid PDF binary (corrupted or wrong header)';
      }

      const fileInfo = parseFileInfo(name, existingCount + i);

      newStaged.push({
        id: `staged_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
        file,
        name,
        size: file.size,
        chapterNumber: fileInfo.chapterNumber,
        isLesson: fileInfo.isLesson,
        lessonNumber: fileInfo.lessonNumber,
        parentChapterNumber: fileInfo.parentChapterNumber,
        lessonTitle: fileInfo.lessonTitle,
        isValidPdf: isExtPdf && isValidMagic,
        validationError,
      });
    }

    // Sort by chapter number and sub-lesson
    setStagedFiles((prev) => {
      const combined = [...prev, ...newStaged];
      return combined.sort((a, b) => {
        if (a.chapterNumber !== b.chapterNumber) return a.chapterNumber - b.chapterNumber;
        const lesA = a.lessonNumber ?? 0;
        const lesB = b.lessonNumber ?? 0;
        return lesA - lesB;
      });
    });
  }, [stagedFiles.length]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
    // reset input so same file can be selected again
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveFile = (id: string) => {
    setStagedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleUpdateChapterNumber = (id: string, numStr: string) => {
    const val = parseInt(numStr, 10);
    setStagedFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, chapterNumber: isNaN(val) ? 1 : val } : f))
    );
  };

  // Execute Direct Local Upload
  const handleExecuteUpload = async () => {
    if (stagedFiles.length === 0) {
      setErrorMessage('Please select or drop at least one chapter PDF file.');
      return;
    }

    const invalidFiles = stagedFiles.filter((f) => !f.isValidPdf);
    if (invalidFiles.length > 0) {
      setErrorMessage(`Please remove the ${invalidFiles.length} invalid file(s) before uploading.`);
      return;
    }

    const effectiveSubject = selectedSubject === '__CUSTOM__' ? customSubject.trim() : selectedSubject;
    if (!effectiveSubject) {
      setErrorMessage('Please enter or select a valid subject.');
      return;
    }

    if (!bookTitle.trim()) {
      setErrorMessage('Please enter a valid book title.');
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(0);
      setUploadStatusMsg(`Preparing ${stagedFiles.length} chapter PDF(s) for local storage...`);
      setErrorMessage(null);

      // Construct FormData for multipart upload
      const formData = new FormData();
      formData.append('classLevel', selectedClass);
      formData.append('subject', effectiveSubject);
      formData.append('bookTitle', bookTitle.trim());
      formData.append('edition', bookEdition.trim() || '2026-27');

      const targetBookId = matchedExistingBook?.id || targetBook?.id;
      if (targetBookId) {
        formData.append('bookId', targetBookId);
      }

      // Append files with metadata
      const chapterNumbers = stagedFiles.map((f) => f.chapterNumber);
      formData.append('chapterNumbers', JSON.stringify(chapterNumbers));

      stagedFiles.forEach((staged) => {
        formData.append('files', staged.file, staged.name);
      });

      // Upload with progress tracking via XMLHttpRequest
      await new Promise<NcertBook>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/ncert/local-upload');

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const pct = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(pct);
            const loadedMb = (event.loaded / (1024 * 1024)).toFixed(1);
            const totalMb = (event.total / (1024 * 1024)).toFixed(1);
            setUploadStatusMsg(`Uploading chapter PDFs: ${loadedMb} MB / ${totalMb} MB (${pct}%)`);
          }
        };

        xhr.onload = async () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const res = JSON.parse(xhr.responseText);
              if (res.success && res.book) {
                setUploadProgress(100);
                setUploadStatusMsg('All chapters stored and manifest synchronized successfully!');
                try {
                  await saveNcertBook(res.book);
                } catch (dbErr) {
                  console.warn('Local indexedDB sync notice:', dbErr);
                }
                resolve(res.book);
              } else {
                reject(new Error(res.message || 'Server reported failure while saving chapters.'));
              }
            } catch (err: any) {
              reject(new Error('Failed to parse server response: ' + err.message));
            }
          } else {
            try {
              const res = JSON.parse(xhr.responseText);
              reject(new Error(res.message || `Server responded with status ${xhr.status}`));
            } catch (_) {
              reject(new Error(`Upload failed with server status ${xhr.status}`));
            }
          }
        };

        xhr.onerror = () => {
          reject(new Error('Network error during chapter upload. Please check connectivity.'));
        };

        xhr.send(formData);
      }).then((uploadedBook) => {
        // Success callback
        setTimeout(() => {
          onSuccess(uploadedBook);
          onClose();
        }, 500);
      });
    } catch (err: any) {
      console.error('Direct Local Upload Failed:', err);
      setErrorMessage(err.message || 'Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  const totalSizeMb = (stagedFiles.reduce((acc, f) => acc + f.size, 0) / (1024 * 1024)).toFixed(2);
  const allFilesValid = stagedFiles.length > 0 && stagedFiles.every((f) => f.isValidPdf);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div
        id="direct-local-upload-modal"
        className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8"
      >
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-slate-900 dark:to-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-md shadow-emerald-500/20">
              <Upload className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                {targetBook ? 'Append Chapters to Textbook' : 'Direct NCERT Local Chapter Upload'}
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  Local Storage
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Super-fast, zero-cloud storage inside{' '}
                <code className="font-mono bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-[11px]">
                  /stored_books/Class_X/Subject_Y/
                </code>
              </p>
            </div>
          </div>
          <button
            id="close-direct-upload-modal-btn"
            onClick={onClose}
            disabled={isUploading}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[72vh] overflow-y-auto">
          {/* Error Alert */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
              <div className="flex-1">{errorMessage}</div>
            </div>
          )}

          {/* Single Edition Indicator Banner */}
          {matchedExistingBook && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs animate-in fade-in">
              <GitMerge className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-emerald-900 dark:text-emerald-200">
                    Single Edition Enforced: "{matchedExistingBook.bookTitle}"
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-200/80 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-300 font-bold">
                    {matchedExistingBook.edition || '2026-27'}
                  </span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                    ({matchedExistingBook.chapters?.length || 0} existing chapter{matchedExistingBook.chapters?.length !== 1 ? 's' : ''})
                  </span>
                </div>
                <p className="text-emerald-700 dark:text-emerald-300/90 text-[11px] mt-1 leading-relaxed">
                  New chapter files will be merged and appended directly into this book edition. No duplicate edition records will be created.
                </p>
              </div>
            </div>
          )}

          {/* Class & Subject Dropdown Selection Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Class Dropdown */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-emerald-600" />
                Select Class Level
              </label>
              <select
                id="upload-class-select"
                value={selectedClass}
                disabled={isUploading || !!targetBook}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full text-xs font-semibold px-3 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all disabled:opacity-60"
              >
                {NCERT_CLASSES.map((cls) => (
                  <option key={cls} value={cls}>
                    {cls}
                  </option>
                ))}
              </select>
            </div>

            {/* Subject Dropdown */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Folder className="h-3.5 w-3.5 text-emerald-600" />
                Select Subject
              </label>
              <select
                id="upload-subject-select"
                value={selectedSubject}
                disabled={isUploading || !!targetBook}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full text-xs font-semibold px-3 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all disabled:opacity-60"
              >
                {availableSubjects.map((subj) => (
                  <option key={subj} value={subj}>
                    {subj}
                  </option>
                ))}
                {!targetBook && <option value="__CUSTOM__">+ Other / Custom Subject...</option>}
              </select>
            </div>
          </div>

          {/* Custom Subject Input if requested */}
          {selectedSubject === '__CUSTOM__' && !targetBook && (
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Enter Custom Subject Name
              </label>
              <input
                type="text"
                id="upload-custom-subject-input"
                placeholder="e.g. Environmental Studies, Urdu, Biotechnology"
                value={customSubject}
                disabled={isUploading}
                onChange={(e) => setCustomSubject(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          )}

          {/* Book Title & Edition Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5 text-emerald-600" />
                Textbook Title
              </label>
              <input
                type="text"
                id="upload-book-title-input"
                value={bookTitle}
                disabled={isUploading || !!targetBook}
                onChange={(e) => setBookTitle(e.target.value)}
                placeholder="e.g. Ganita Prakash, Poorvi, Science"
                className="w-full text-xs font-medium px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all disabled:opacity-60"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                Book Edition
              </label>
              <input
                type="text"
                id="upload-book-edition-input"
                value={bookEdition}
                disabled={isUploading || (!!matchedExistingBook && !!matchedExistingBook.edition)}
                onChange={(e) => setBookEdition(e.target.value)}
                placeholder="e.g. 2026-27"
                className="w-full text-xs font-semibold px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all disabled:opacity-60"
              />
            </div>
          </div>

          {/* Drag and Drop Bulk Upload Area */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Upload className="h-3.5 w-3.5 text-emerald-600" />
                Bulk Chapter PDFs (Drag & Drop)
              </span>
              <span className="text-[11px] font-normal text-slate-500">
                Strict PDF verification (.pdf & %PDF- header)
              </span>
            </label>

            <div
              id="direct-upload-drop-zone"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !isUploading && fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-200 ${
                isDragging
                  ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 scale-[0.99]'
                  : 'border-slate-300 dark:border-slate-700 hover:border-emerald-400 bg-slate-50/60 dark:bg-slate-800/40'
              } ${isUploading ? 'pointer-events-none opacity-50' : ''}`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={handleFileInputChange}
              />
              <div className="flex flex-col items-center justify-center gap-2">
                <div className="p-3 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-2xl shadow-sm">
                  <Upload className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Drop multiple chapter PDFs here, or{' '}
                    <span className="text-emerald-600 dark:text-emerald-400 underline">browse files</span>
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Select 1 or more chapter PDFs at once (e.g. Chapter 1 to 15)
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Staged Files List */}
          {stagedFiles.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs px-1">
                <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-emerald-600" />
                  Selected Chapters ({stagedFiles.length} file{stagedFiles.length !== 1 ? 's' : ''}, {totalSizeMb} MB)
                </span>
                <button
                  type="button"
                  onClick={() => setStagedFiles([])}
                  disabled={isUploading}
                  className="text-[11px] text-red-600 hover:text-red-700 dark:text-red-400 font-semibold"
                >
                  Clear All
                </button>
              </div>

              <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-100 dark:divide-slate-800/50">
                {stagedFiles.map((f, idx) => (
                  <div
                    key={f.id}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-xs transition-colors ${
                      f.isValidPdf
                        ? 'bg-slate-50 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-800'
                        : 'bg-red-50/60 dark:bg-red-950/30 border-red-300 dark:border-red-900'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {f.isValidPdf ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">{f.name}</p>
                          {f.isLesson ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 shrink-0">
                              Ch {f.parentChapterNumber || f.chapterNumber} • Lesson {f.lessonNumber}
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 shrink-0">
                              Chapter {f.chapterNumber}
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400 shrink-0">
                            ({(f.size / (1024 * 1024)).toFixed(2)} MB)
                          </span>
                        </div>
                        {f.validationError && (
                          <p className="text-[10px] text-red-600 dark:text-red-400 font-medium">
                            {f.validationError}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2 py-1 rounded-lg">
                        <span className="text-[10px] text-slate-400 font-medium">Ch:</span>
                        <input
                          type="number"
                          min="1"
                          max="99"
                          disabled={isUploading}
                          value={f.chapterNumber}
                          onChange={(e) => handleUpdateChapterNumber(f.id, e.target.value)}
                          className="w-8 text-center text-xs font-bold bg-transparent focus:outline-none"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(f.id)}
                        disabled={isUploading}
                        className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upload Progress Bar */}
          {isUploading && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-800 dark:text-emerald-300">
                <span className="flex items-center gap-2">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin text-emerald-600" />
                  {uploadStatusMsg}
                </span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-emerald-200 dark:bg-emerald-900/60 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-emerald-600 h-2 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>Files will be saved in local disk hierarchy</span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              id="cancel-direct-upload-btn"
              onClick={onClose}
              disabled={isUploading}
              className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>

            <button
              type="button"
              id="submit-direct-upload-btn"
              onClick={handleExecuteUpload}
              disabled={isUploading || stagedFiles.length === 0 || !allFilesValid}
              className="px-5 py-2.5 text-xs font-bold rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 shadow-lg shadow-emerald-600/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
            >
              {isUploading ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Storing Chapters...</span>
                </>
              ) : (
                <>
                  <span>Upload & Store {stagedFiles.length > 0 ? `(${stagedFiles.length} Ch)` : ''}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
