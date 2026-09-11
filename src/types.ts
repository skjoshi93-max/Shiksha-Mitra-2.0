export type CategoryType = 
  | 'Subject Knowledge'
  | 'Pedagogy'
  | 'Behavioral'
  | 'Classroom Management'
  | 'Soft Skill'
  | 'Case Study'
  | string;

export type DifficultyLevel = 'Easy' | 'Medium' | 'Hard';

export interface Question {
  id: string; // e.g., SM-2026-0001
  question: string;
  category: CategoryType;
  difficulty: DifficultyLevel;
  subject: string;
  questionType: string;
  timeLimit: number; // in seconds
  maxScore: number;
  tags: string[];
  hint: string;
  active: boolean;
  qualityScore: number; // 0 - 100
  duplicateSimilarity: number; // 0 - 100
  validationNotes?: string[];
  createdDate: string; // ISO string
  updatedDate: string; // ISO string
  isDemo?: boolean;
  fingerprint?: string;
  verified?: boolean;
  verificationStatus?: 'VERIFIED' | 'REJECTED' | 'UNVERIFIED';
}

export interface GeneratorConfig {
  totalQuestions: number;
  language: 'English' | 'Hindi' | 'Hinglish' | string;
  categories: string[];
  categoryDistribution: Record<string, number>; // percentages summing to 100
  difficultyDistribution: Record<DifficultyLevel, number>; // percentages summing to 100
  subjects: string[];
  questionTypes: string[];
  defaultTimeLimit: number;
  defaultMaxScore: number;
  smartScoring: boolean;
  qualityThreshold: number; // default 85
  duplicateSensitivity: number; // default 75
}

export interface GenerationProgress {
  status: 'idle' | 'generating' | 'quality_check' | 'duplicate_check' | 'validating' | 'regenerating' | 'completed' | 'error';
  requested: number;
  generated: number;
  rejected: number;
  regenerated: number;
  approved: number;
  currentCategory: string;
  currentStepDescription: string;
  percentComplete: number;
  errorMessage?: string;
}

export interface ShikshaMitraExportField {
  sourceKey: keyof Question | 'custom_constant';
  targetColumnName: string;
  defaultValue?: string;
  order: number;
  required?: boolean;
  transform?: 'none' | 'lowercase' | 'uppercase' | 'boolean_yes_no' | 'boolean_1_0' | 'date_iso' | 'date_localized';
}

export interface ShikshaMitraTemplate {
  id: string;
  name: string;
  fields: ShikshaMitraExportField[];
  categoryMappings: Record<string, string>;
  difficultyMappings: Record<string, string>;
}

export interface SettingsState {
  bankName: string;
  defaultLanguage: string;
  defaultTimeLimit: number;
  defaultMaxScore: number;
  categories: string[];
  subjects: string[];
  questionTypes: string[];
  difficultyDistribution: Record<DifficultyLevel, number>;
  qualityThreshold: number;
  duplicateSensitivity: number;
  templates: ShikshaMitraTemplate[];
  theme: 'light' | 'dark' | 'system';
}

export interface ImportMapping {
  csvHeader: string;
  targetField: keyof Question | 'ignore';
}

export interface ImportValidationResult {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
  questions: Question[];
  issues: string[];
}

// ==========================================
// SKILL ASSESSMENT MODULE TYPES
// ==========================================

export interface AssessmentQuestion {
  id: string; // e.g. Q1, Q2, or ASM-Q-001
  question: string;
  type?: string; // e.g. 'MCQ' | 'Short Answer Question' | 'Long Answer Question'
  questionType?: string; // e.g. 'MCQ' | 'Short Answer Question' | 'Long Answer Question'
  options: any;
  optionsObj?: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctAnswer: 'A' | 'B' | 'C' | 'D' | string;
  answer?: string; // Reference answer key or grading criteria
  explanation: string;
  subject: string;
  topic: string;
  difficulty: DifficultyLevel;
  marks: number; // default 1 (or 2-3 for SAQ, 4-5 for LAQ)
  qualityScore?: number; // 0 - 100 (threshold >= 90)
  duplicateSimilarity?: number;
  validationNotes?: string[];
  fingerprint?: string;
  verified?: boolean;
  verificationStatus?: 'VERIFIED' | 'REJECTED' | 'UNVERIFIED';
}

export interface Assessment {
  id: string;
  title: string;
  slug: string;
  subject: string;
  classLevel?: string;
  board?: string;
  description: string;
  duration: number; // in minutes
  passScore: number; // percentage 1 to 100
  active: boolean; // visible to teachers
  questions: AssessmentQuestion[];
  totalQuestions: number;
  totalMarks: number;
  createdDate: string; // ISO string
  updatedDate: string; // ISO string
  qualityScore?: number; // overall avg quality score
  topicCoverage?: Record<string, number>; // topic -> count
  difficultyCoverage?: Record<DifficultyLevel, number>; // difficulty -> count
  verified?: boolean;
  verificationStatus?: 'VERIFIED' | 'REJECTED' | 'UNVERIFIED';
  stats?: {
    totalAttempts: number;
    passedCount: number;
    avgScorePercent: number;
  };
}

export interface AssessmentGeneratorConfig {
  title: string;
  slug: string;
  subject: string;
  classLevel: string;
  board: string;
  totalQuestions: number;
  duration: number; // minutes
  passScore: number; // % 1-100
  difficultyDistribution: Record<DifficultyLevel, number>; // e.g. Easy 20, Medium 50, Hard 30
  topics: string[];
  topicDistribution?: Record<string, number>; // percentages or question counts
  language: 'English' | 'Hindi' | 'Hinglish' | string;
  questionType: 'Multiple Choice' | string;
  active: boolean;
}

export interface AssessmentProgressReport {
  requested: number;
  generated: number;
  rejected: number;
  regenerated: number;
  duplicates: number;
  finalApproved: number;
  averageQuality: number;
  topicCoverage: Record<string, number>;
  difficultyCoverage: Record<DifficultyLevel, number>;
}


export interface NcertChapter {
  id: string;
  bookId: string;
  chapterNumber: number | string;
  chapterTitle: string;
  unitTitle?: string;
  pageStart: number;
  pageEnd: number;
  pages?: number;
  originalFileName?: string;
  contentHash: string;
  sourcePdfHash: string;
  status: 'PROCESSING' | 'READY' | 'ERROR';
  topics: string[];
  keyTopics?: string[];
  exercises: string[];
  textContent: string;
  filePath?: string;
  fileName?: string;
  thumbnailDataUrl?: string;
  coverImageUrl?: string;
  solution?: any;
  uniqueChapterHash?: string;
  updatedAt?: string;
  updatedTimestamp?: number;
  estimatedQuestions?: number;
  isLesson?: boolean;
  lessonNumber?: number;
  lessonTitle?: string;
  parentChapterNumber?: number;
}

export interface NcertFileItem {
  fileName: string;
  status: 'PENDING' | 'PROCESSED' | 'FAILED';
  error?: string;
  chapterId?: string;
  pdfHash?: string;
  filePath?: string;
}

export interface NcertBook {
  id: string;
  classLevel: string; // e.g. "Class 6", "Class 10"
  subject: string; // e.g. "Mathematics", "Science"
  bookTitle: string;
  board: string; // default "CBSE"
  publisher: string; // default "NCERT"
  medium: string; // "English", "Hindi", "Sanskrit", etc.
  edition?: string;
  fileName: string;
  fileSize: number;
  pageCount: number;
  pdfHash: string; // SHA-256 hash
  filePath?: string;
  localDirectory?: string;
  uploadedAt: string;
  uploadDate?: string;
  createdAt?: string;
  updatedAt?: string;
  updatedTimestamp?: number;
  status: 'PROCESSING' | 'READY' | 'ERROR' | 'ARCHIVED' | 'PARTIAL' | 'PAUSED';
  processingJobId?: string;
  processingStatus?: 'PENDING' | 'PROCESSING' | 'PAUSED' | 'READY' | 'ERROR' | 'PARTIAL';
  totalFiles?: number;
  processedFiles?: number;
  failedFiles?: number;
  ignoredFiles?: string[];
  fileItems?: NcertFileItem[];
  chapters: NcertChapter[];
  rawTextContent?: string;
  thumbnailUrl?: string;
  coverImageUrl?: string;
  totalEstimatedQuestions?: number;
}

export interface NcertGenerationProgressReport {
  sourceLoading: boolean;
  chapterProcessing: boolean;
  questionGeneration: boolean;
  duplicateChecking: boolean;
  answerValidation: boolean;
  formattingValidation: boolean;
  csvPreparation: boolean;
  generatedCount: number;
  rejectedCount: number;
  duplicatesRemovedCount: number;
  validationFailuresCount: number;
  finalQuestionsCount: number;
}

export interface NcertQuestion {
  id: string;
  bookId: string;
  chapterId: string;
  sourcePdfHash: string;
  sourceContentHash: string;
  sourcePageNumber?: number;
  board: string;
  grade: string;
  subject: string;
  publisher: string;
  book: string;
  chapter: string;
  topic: string;
  type: string; // MCQ, Fill in the Blanks, Short Answer, etc.
  difficulty: 'Easy' | 'Medium' | 'Hard';
  marks: number;
  text: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  answer: string;
  fingerprint?: string;
}

export interface NcertGeneratorConfig {
  classLevel: string;
  subject: string;
  bookId: string;
  scope: 'FULL_BOOK' | 'FULL_CHAPTER' | 'SINGLE_CHAPTER';
  chapterId?: string;
  selectedChapterIds?: string[];
  questionTypes: string[];
  difficulty: string; // Easy, Medium, Hard, Mixed
  marks: number;
  numberOfQuestions: number;
  includeTextbookQuestions: boolean;
  generateNewQuestions: boolean;
  language: string;
}

export interface DailyExportFile {
  id: string;
  moduleId: string;
  moduleName: string;
  batchDate: string;
  filename: string;
  baseFilename: string;
  fileType: 'CSV' | 'XLSX';
  questionCount: number;
  idRange: string;
  csvContent: string;
  downloadStatus: 'NOT DOWNLOADED' | 'DOWNLOADED';
  createdDate: string;
  downloadedDate?: string | null;
  classLevel?: string;
  subject?: string;
  chapter?: string;
  bookId?: string;
  chapterId?: string;
  updatedTimestamp?: number;
}

export interface ChapterThumbnailRecord {
  key: string;
  classLevel: string;
  subject: string;
  chapterNumber?: number | string;
  chapterTitle?: string;
  thumbnailDataUrl: string;
  savedAt: string;
  sourcePdfHash?: string;
}

