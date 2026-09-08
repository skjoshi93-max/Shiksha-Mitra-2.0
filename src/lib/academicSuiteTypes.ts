// Academic Solution & Question Paper Suite - Types

export interface ChapterExerciseItem {
  qNumber: string;
  question: string;
  answer: string;
  stepByStepExplanation?: string;
  diagramRef?: string;
}

export interface ChapterExercise {
  exerciseNumber: string;
  exerciseTitle: string;
  items: ChapterExerciseItem[];
}

export interface BilingualParagraph {
  en: string;
  hi: string;
}

export interface ExtractQuestion {
  id: string;
  type: 'MCQ' | 'SHORT_ANSWER';
  question: string;
  options?: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  answer: string;
  explanation: string;
}

export interface ExtractZoneItem {
  extractNumber: number;
  sourceLine: string;
  questions: ExtractQuestion[];
}

export interface WordMeaningItem {
  word: string;
  meaningEn: string;
  meaningHi: string;
  example?: string;
}

export interface InTextCheckpointItem {
  questionNumber: string;
  question: string;
  answer: string;
  explanation?: string;
}

export interface CompetencyBasedQuestionItem {
  id: string;
  type: 'MCQ' | 'ASSERTION_REASON' | 'CASE_STUDY' | 'CONCEPTUAL';
  question: string;
  options?: Record<string, string>;
  answer: string;
  explanation: string;
}

export interface ChapterSolutionData {
  id: string;
  uniqueChapterHash?: string;
  bookId: string;
  chapterId: string;
  classLevel: string;
  subject: string;
  bookTitle: string;
  chapterTitle: string;
  wordMeanings?: WordMeaningItem[];
  inTextCheckpoints?: InTextCheckpointItem[];
  exercises: ChapterExercise[];
  competencyBasedQuestions?: CompetencyBasedQuestionItem[];
  bilingualSummary?: {
    englishTitle: string;
    hindiTitle: string;
    paragraphs: BilingualParagraph[];
    keyTakeaways?: string[];
    themeAnalysis?: { name: string; descriptionEn: string; descriptionHi: string }[];
  };
  extractZone?: ExtractZoneItem[];
  generatedAt: string;
  sourceModel?: string;
}

export interface ExamHeaderConfig {
  schoolName: string;
  examName: string;
  academicSession: string; // e.g. "2026-27"
  classLevel: string;
  subject: string;
  durationMinutes: number;
  maxMarks: number;
  generalInstructions: string[];
}

export type PaperHeaderConfig = ExamHeaderConfig;

export type QuestionCategoryType =
  | 'MCQ'
  | 'FILL_IN_BLANKS'
  | 'TRUE_FALSE'
  | 'MATCH_THE_FOLLOWING'
  | 'SHORT_ANSWER'
  | 'LONG_ANSWER'
  | 'CASE_STUDY'
  | 'READING_EXTRACT';

export interface MatchPair {
  left: string;
  right: string;
}

export interface PaperQuestion {
  id: string;
  qNumber: number;
  sectionId: string;
  type: QuestionCategoryType;
  questionText: string;
  passage?: string; // For reading comprehension / extracts
  options?: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  matchPairs?: MatchPair[];
  marks: number;
  diagramImage?: string;
  geometricShape?: 'RECTANGLE' | 'TRIANGLE' | 'CIRCLE' | 'ARROW' | 'COORDINATE_AXES' | 'NONE';
  chapterName?: string;
  latexFormula?: string;
}

export interface PaperSection {
  id: string;
  title: string;
  description?: string;
  marksPerQuestion: number;
  totalSectionMarks: number;
  questions: PaperQuestion[];
}

export interface PaperAnswerKeyItem {
  qNumber: number;
  sectionTitle: string;
  type: QuestionCategoryType;
  answer: string;
  stepByStepSolution?: string;
  markingScheme?: string;
  marks: number;
}

export interface PaperFormattingSettings {
  lineSpacing: number; // 1.0, 1.15, 1.5, 2.0
  fontSize: number; // 12, 14, 16, 18, 20
  alignment: 'left' | 'center' | 'right' | 'justify';
  boldHeaders: boolean;
  showWatermark: boolean;
  watermarkText: string;
}

export interface PaperBlueprintConfig {
  testType: 'UNIT_TEST' | 'MID_TERM' | 'PRE_BOARD' | 'ANNUAL' | 'CUSTOM';
  selectedChapterIds: string[];
  selectedChapterTitles: string[];
  autoSections: boolean;
  sectionDistribution: {
    sectionId: string;
    sectionTitle: string;
    category: QuestionCategoryType;
    count: number;
    marksPerQuestion: number;
  }[];
}

export interface GeneratedQuestionPaper {
  id: string;
  header: ExamHeaderConfig;
  blueprint: PaperBlueprintConfig;
  sections: PaperSection[];
  answerKey: PaperAnswerKeyItem[];
  formatting: PaperFormattingSettings;
  createdAt: string;
  sourceModel?: string;
}
