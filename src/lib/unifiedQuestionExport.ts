import * as XLSX from 'xlsx';
import { Question, Assessment } from '../types';
import { getLockedExportFilename, CentralModuleKey } from './exportFilenameRegistry';
import {
  ScientificContentIntegrityService,
  serializeCsvCell,
  normalizeScientificContent,
  sanitizeQuestionObject,
  sanitizeAssessmentObject
} from './scientificIntegrityService';

// ============================================================================
// LOCKED SCHEMAS (ABSOLUTE MASTER TEMPLATES)
// ============================================================================

export const MASTER_SCHEMAS: Record<CentralModuleKey, { headers: readonly string[]; templateFilename: string; sheetName: string }> = {
  // MODULE 1: Interview Bank -> interview_questions_sample.xlsx
  interview_bank: {
    templateFilename: 'interview_questions_sample.xlsx',
    sheetName: 'Interview Bank AI',
    headers: [
      'question',
      'category',
      'subject',
      'grade_band',
      'difficulty',
      'time_seconds',
      'max_score',
      'expected_keywords',
    ] as const,
  },

  // MODULE 2: NCERT / Master Question Bank -> master_question_bank_template.xlsx
  ncert_pdf: {
    templateFilename: 'master_question_bank_template.xlsx',
    sheetName: 'CSV question paper Generator',
    headers: [
      'board',
      'grade',
      'subject',
      'publisher',
      'book',
      'chapter',
      'topic',
      'type',
      'difficulty',
      'marks',
      'text',
      'option_a',
      'option_b',
      'option_c',
      'option_d',
      'answer',
    ] as const,
  },

  // MODULE 3: Skill Assessments -> assessment_questions_template.xlsx
  skill_assessment: {
    templateFilename: 'assessment_questions_template.xlsx',
    sheetName: 'Skill Assessment Questions',
    headers: [
      'question',
      'type',
      'options',
      'answer',
      'marks',
    ] as const,
  },
};

/**
 * Optional plain math converter for plain-text contexts
 */
export function cleanLatexToPlainMath(text: string): string {
  if (text === null || text === undefined) return '';
  return normalizeScientificContent(String(text));
}

// CSV Escaping Helper using RFC 4180 preserving LaTeX intact
function escapeCSVCell(val: any): string {
  return serializeCsvCell(val);
}

// ============================================================================
// HARD SCHEMA VALIDATION
// ============================================================================
export function validateExportHeaders(
  moduleKey: CentralModuleKey,
  generatedHeaders: string[]
): { valid: boolean; error?: string } {
  const schema = MASTER_SCHEMAS[moduleKey];
  if (!schema) {
    return { valid: false, error: `Unknown module key: ${moduleKey}` };
  }

  const expectedHeaders = schema.headers;

  if (generatedHeaders.length !== expectedHeaders.length) {
    return {
      valid: false,
      error: `Header count mismatch for ${moduleKey}. Expected ${expectedHeaders.length}, got ${generatedHeaders.length}.`,
    };
  }

  for (let i = 0; i < expectedHeaders.length; i++) {
    if (generatedHeaders[i] !== expectedHeaders[i]) {
      return {
        valid: false,
        error: `Header mismatch at index ${i} for ${moduleKey}. Expected "${expectedHeaders[i]}", got "${generatedHeaders[i]}".`,
      };
    }
  }

  return { valid: true };
}

// Helper to trigger browser XLSX file download
export function triggerXlsxDownload(
  headers: readonly string[] | string[],
  rows: any[][],
  filename: string,
  sheetName: string = 'Question Bank'
) {
  const cleanFilename = filename.toLowerCase().endsWith('.csv')
    ? filename.replace(/\.csv$/i, '.xlsx')
    : filename.toLowerCase().endsWith('.xlsx')
    ? filename
    : `${filename}.xlsx`;

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([headers as string[], ...rows]);
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = cleanFilename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Alias for backwards compatibility
export const triggerCsvDownload = (csvContent: string, filename: string) => {
  downloadFile(filename, csvContent);
};

export function downloadFile(filename: string, content: string) {
  const xlsxFilename = filename.toLowerCase().endsWith('.csv')
    ? filename.replace(/\.csv$/i, '.xlsx')
    : filename;

  let sheetName = 'Question Bank';

  try {
    const workbook = XLSX.read(content, { type: 'string' });
    const firstSheetName = workbook.SheetNames[0] || 'Sheet1';
    const worksheet = workbook.Sheets[firstSheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
    if (rows && rows.length > 0) {
      const headers = rows[0].map(h => String(h).trim().toLowerCase());
      if (headers.length === 5 && headers.includes('question') && headers.includes('options')) {
        sheetName = MASTER_SCHEMAS.skill_assessment.sheetName;
      } else if (headers.length === 8 || (headers.includes('question') && headers.includes('expected_keywords'))) {
        sheetName = MASTER_SCHEMAS.interview_bank.sheetName;
      } else if (headers.length === 16 || headers.includes('board') || headers.includes('option_a')) {
        sheetName = MASTER_SCHEMAS.ncert_pdf.sheetName;
      } else {
        sheetName = firstSheetName;
      }
      const dataRows = rows.slice(1);
      triggerXlsxDownload(rows[0], dataRows, xlsxFilename, sheetName);
      return;
    }
  } catch (err) {
    console.warn('XLSX parse fallback for stored file content:', err);
  }

  // Fallback if raw text
  const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length > 0) {
    const rawHeaders = lines[0].split(',');
    const headers = rawHeaders.map(h => h.trim().toLowerCase());
    if (headers.length === 5 && headers.includes('question') && headers.includes('options')) {
      sheetName = MASTER_SCHEMAS.skill_assessment.sheetName;
    } else if (headers.length === 8 || (headers.includes('question') && headers.includes('expected_keywords'))) {
      sheetName = MASTER_SCHEMAS.interview_bank.sheetName;
    } else if (headers.length === 16 || headers.includes('board') || headers.includes('option_a')) {
      sheetName = MASTER_SCHEMAS.ncert_pdf.sheetName;
    }
    const dataRows = lines.slice(1).map(l => l.split(','));
    triggerXlsxDownload(rawHeaders, dataRows, xlsxFilename, sheetName);
  }
}

export function buildInterviewBankCSV(questions: Question[]): string {
  const schema = MASTER_SCHEMAS.interview_bank;
  const headers = [...schema.headers];
  const rows = questions.map(rawQ => {
    const q = sanitizeQuestionObject(rawQ);
    return [
      escapeCSVCell(q.question || (q as any).text || ''),
      escapeCSVCell(q.category || 'Subject Knowledge'),
      escapeCSVCell(q.subject || 'General Teaching'),
      escapeCSVCell((q as any).grade_band || (q as any).gradeBand || (q as any).grade || '9-12'),
      escapeCSVCell(q.difficulty || 'Medium'),
      escapeCSVCell((q as any).time_seconds !== undefined ? (q as any).time_seconds : (q.timeLimit !== undefined ? q.timeLimit : 120)),
      escapeCSVCell((q as any).max_score !== undefined ? (q as any).max_score : (q.maxScore !== undefined ? q.maxScore : 10)),
      escapeCSVCell((q as any).expected_keywords !== undefined ? (q as any).expected_keywords : (Array.isArray(q.tags) ? q.tags.join(', ') : (q.hint || (typeof q.tags === 'string' ? q.tags : '')))),
    ];
  });
  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

export function buildNcertPDFCSV(questions: Question[] | any[]): string {
  const schema = MASTER_SCHEMAS.ncert_pdf;
  const headers = [...schema.headers];
  const rows = questions.map(rawQ => {
    const q = sanitizeQuestionObject(rawQ);
    const opts = q.options || {};
    let optA = '';
    let optB = '';
    let optC = '';
    let optD = '';

    if (typeof opts === 'object' && !Array.isArray(opts)) {
      optA = opts.A || opts.a || opts.option_a || opts.optionA || '';
      optB = opts.B || opts.b || opts.option_b || opts.optionB || '';
      optC = opts.C || opts.c || opts.option_c || opts.optionC || '';
      optD = opts.D || opts.d || opts.option_d || opts.optionD || '';
    } else if (Array.isArray(opts)) {
      optA = opts[0] || '';
      optB = opts[1] || '';
      optC = opts[2] || '';
      optD = opts[3] || '';
    }

    if (!optA) optA = (q as any).option_a || (q as any).optionA || '';
    if (!optB) optB = (q as any).option_b || (q as any).optionB || '';
    if (!optC) optC = (q as any).option_c || (q as any).optionC || '';
    if (!optD) optD = (q as any).option_d || (q as any).optionD || '';

    return [
      escapeCSVCell((q as any).board || 'CBSE'),
      escapeCSVCell((q as any).grade || (q as any).classLevel || 'Class 10'),
      escapeCSVCell(q.subject || 'General Science'),
      escapeCSVCell((q as any).publisher || 'NCERT'),
      escapeCSVCell((q as any).book || 'Standard Textbook'),
      escapeCSVCell((q as any).chapter || (q as any).chapterTitle || 'Chapter 1'),
      escapeCSVCell((q as any).topic || q.category || 'General Concept'),
      escapeCSVCell((q as any).type || q.questionType || 'MCQ'),
      escapeCSVCell(q.difficulty || 'Medium'),
      escapeCSVCell((q as any).marks !== undefined ? (q as any).marks : (q.maxScore !== undefined ? q.maxScore : 1)),
      escapeCSVCell((q as any).text || q.question || ''),
      escapeCSVCell(optA),
      escapeCSVCell(optB),
      escapeCSVCell(optC),
      escapeCSVCell(optD),
      escapeCSVCell((q as any).answer || q.correctAnswer || ''),
    ];
  });
  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

/**
 * Strips leading option labels (such as A), B), C), D), A., (A), Option A:, etc.)
 * permanently and keeps clean option text.
 */
export function stripLeadingOptionLabel(optionText: string): string {
  if (!optionText || typeof optionText !== 'string') return '';
  let cleaned = optionText.trim();
  if (!cleaned) return '';

  // 1. Strip "Option A:", "Option A -", "Option A.", "Option A", "Option 1:", etc. (case insensitive)
  cleaned = cleaned.replace(/^Option\s+[A-Za-z0-9]+[\s.:\-]*\s*/i, '').trim();

  // 2. Strip leading option label prefixes like A), B), C), D), A., B., C., D., (A), (B), [A], [B], a), b), c), d), a., b., c., d., (a), (b), 1), 2), 1., 2., (1), (2)
  cleaned = cleaned.replace(/^(?:[\(\[]?[A-Za-z0-9]{1,2}[\)\].:\-]\s*|[\(\[]?[A-Za-z0-9]{1,2}[\)\].]\s*)/i, '').trim();

  return cleaned;
}

/**
 * Formats Skill Assessment options with pipe separators (|) and no leading option labels.
 */
export function formatSkillAssessmentOptions(opts: any, q?: any): string {
  let parts: string[] = [];

  if (typeof opts === 'string') {
    parts = opts.split('|').map(p => stripLeadingOptionLabel(p)).filter(Boolean);
  } else if (Array.isArray(opts)) {
    parts = opts.map(p => stripLeadingOptionLabel(String(p))).filter(Boolean);
  } else if (opts && typeof opts === 'object') {
    const rawA = opts.A || opts.a || opts.option_a || opts.optionA || '';
    const rawB = opts.B || opts.b || opts.option_b || opts.optionB || '';
    const rawC = opts.C || opts.c || opts.option_c || opts.optionC || '';
    const rawD = opts.D || opts.d || opts.option_d || opts.optionD || '';

    const list = [rawA, rawB, rawC, rawD];
    parts = list.map(item => stripLeadingOptionLabel(String(item))).filter(Boolean);
  }

  if (parts.length === 0 && q && typeof q === 'object') {
    const rawA = (q as any).option_a || (q as any).optionA || '';
    const rawB = (q as any).option_b || (q as any).optionB || '';
    const rawC = (q as any).option_c || (q as any).optionC || '';
    const rawD = (q as any).option_d || (q as any).optionD || '';

    const list = [rawA, rawB, rawC, rawD];
    parts = list.map(item => stripLeadingOptionLabel(String(item))).filter(Boolean);
  }

  return parts.join(' | ');
}

// ============================================================================
// UNIFIED QUESTION EXPORT ENGINE (XLSX WORKBOOK GENERATOR)
// ============================================================================

/**
 * MODULE 1: Interview Question Bank Export (XLSX)
 */
export function exportInterviewBankToXLSX(questions: Question[], customFilename?: string): boolean {
  const schema = MASTER_SCHEMAS.interview_bank;
  const headers = [...schema.headers];

  const validation = validateExportHeaders('interview_bank', headers);
  if (!validation.valid) {
    alert(`EXPORT BLOCKED BY VALIDATOR: ${validation.error}`);
    console.error(`Export validation failed: ${validation.error}`);
    return false;
  }

  const rows = questions.map(rawQ => {
    const q = sanitizeQuestionObject(rawQ);
    return [
      q.question || (q as any).text || '',
      q.category || 'Subject Knowledge',
      q.subject || 'General Teaching',
      (q as any).grade_band || (q as any).gradeBand || (q as any).grade || '9-12',
      q.difficulty || 'Medium',
      (q as any).time_seconds !== undefined ? (q as any).time_seconds : (q.timeLimit !== undefined ? q.timeLimit : 120),
      (q as any).max_score !== undefined ? (q as any).max_score : (q.maxScore !== undefined ? q.maxScore : 10),
      (q as any).expected_keywords !== undefined
        ? (q as any).expected_keywords
        : (Array.isArray(q.tags) ? q.tags.join(', ') : (q.hint || (typeof q.tags === 'string' ? q.tags : ''))),
    ];
  });

  const filename = customFilename || getLockedExportFilename('interview_bank', 'xlsx');
  triggerXlsxDownload(headers, rows, filename, schema.sheetName);
  return true;
}

export const exportInterviewBankToCSV = exportInterviewBankToXLSX;

/**
 * MODULE 2: NCERT / Master Question Bank Export (XLSX)
 */
export function exportMasterQuestionBankToXLSX(questions: Question[] | any[], customFilename?: string): boolean {
  const schema = MASTER_SCHEMAS.ncert_pdf;
  const headers = [...schema.headers];

  const validation = validateExportHeaders('ncert_pdf', headers);
  if (!validation.valid) {
    alert(`EXPORT BLOCKED BY VALIDATOR: ${validation.error}`);
    console.error(`Export validation failed: ${validation.error}`);
    return false;
  }

  const rows = questions.map(rawQ => {
    const q = sanitizeQuestionObject(rawQ);
    const opts = q.options || {};
    let optA = '';
    let optB = '';
    let optC = '';
    let optD = '';

    if (typeof opts === 'object' && !Array.isArray(opts)) {
      optA = opts.A || opts.a || opts.option_a || opts.optionA || '';
      optB = opts.B || opts.b || opts.option_b || opts.optionB || '';
      optC = opts.C || opts.c || opts.option_c || opts.optionC || '';
      optD = opts.D || opts.d || opts.option_d || opts.optionD || '';
    } else if (Array.isArray(opts)) {
      optA = opts[0] || '';
      optB = opts[1] || '';
      optC = opts[2] || '';
      optD = opts[3] || '';
    }

    if (!optA) optA = (q as any).option_a || (q as any).optionA || '';
    if (!optB) optB = (q as any).option_b || (q as any).optionB || '';
    if (!optC) optC = (q as any).option_c || (q as any).optionC || '';
    if (!optD) optD = (q as any).option_d || (q as any).optionD || '';

    return [
      (q as any).board || 'CBSE',
      (q as any).grade || (q as any).classLevel || 'Class 10',
      q.subject || 'General Science',
      (q as any).publisher || 'NCERT',
      (q as any).book || 'Standard Textbook',
      (q as any).chapter || (q as any).chapterTitle || 'Chapter 1',
      (q as any).topic || q.category || 'General Concept',
      (q as any).type || q.questionType || 'MCQ',
      q.difficulty || 'Medium',
      (q as any).marks !== undefined ? (q as any).marks : (q.maxScore !== undefined ? q.maxScore : 1),
      (q as any).text || q.question || '',
      optA,
      optB,
      optC,
      optD,
      (q as any).answer || q.correctAnswer || '',
    ];
  });

  const filename = customFilename || getLockedExportFilename('ncert_pdf', 'xlsx');
  triggerXlsxDownload(headers, rows, filename, schema.sheetName);
  return true;
}

export const exportMasterQuestionBankToCSV = exportMasterQuestionBankToXLSX;

/**
 * MODULE 3: Skill Assessment Questions Export (XLSX)
 */
export function exportAssessmentQuestionsToXLSX(
  assessmentOrQuestions: Assessment | any,
  customFilename?: string
): boolean {
  let questions: any[] = [];
  let slug = 'assessment-questions';

  if (Array.isArray(assessmentOrQuestions)) {
    questions = assessmentOrQuestions;
  } else if (assessmentOrQuestions && Array.isArray(assessmentOrQuestions.questions)) {
    questions = assessmentOrQuestions.questions;
    slug = assessmentOrQuestions.slug || 'assessment-questions';
  } else {
    alert('Invalid assessment object provided for export.');
    return false;
  }

  const schema = MASTER_SCHEMAS.skill_assessment;
  const headers = [...schema.headers];

  const validation = validateExportHeaders('skill_assessment', headers);
  if (!validation.valid) {
    alert(`EXPORT BLOCKED BY VALIDATOR: ${validation.error}`);
    console.error(`Export validation failed: ${validation.error}`);
    return false;
  }

  const rows = questions.map(rawQ => {
    const q = sanitizeQuestionObject(rawQ);

    const optionsStr = formatSkillAssessmentOptions(q.options, q);

    const questionText = q.question || (q as any).text || '';
    const type = (q as any).type || q.questionType || 'MCQ';
    const answer = (q as any).answer || q.correctAnswer || '';
    const marks = (q as any).marks !== undefined ? (q as any).marks : (q.maxScore !== undefined ? q.maxScore : 1);

    return [
      questionText,
      type,
      optionsStr,
      answer,
      marks,
    ];
  });

  const filename = customFilename || getLockedExportFilename('skill_assessment', 'xlsx', slug);
  triggerXlsxDownload(headers, rows, filename, schema.sheetName);
  return true;
}

export const exportAssessmentQuestionsToCSV = exportAssessmentQuestionsToXLSX;

/**
 * MODULE 4: Course Certification Assessment Data Bank Exporter (16-Column Master Schema)
 * Generates an Excel (.xlsx) file matching the exact 16-column master schema:
 * board, grade, subject, publisher, book, chapter, topic, type, difficulty, marks, text, option_a, option_b, option_c, option_d, answer
 */
export function exportCourseAssessmentDataBankToXLSX(
  courseOrAssessment: any,
  customFilename?: string
): boolean {
  let questions: any[] = [];
  let courseTitle = 'Professional Certification Course';
  let courseSubject = 'General Professional';
  let classLevel = 'Professional & Administrative Cadres';
  let board = 'iGOT Karmayogi Framework / Govt. of India';
  let slug = 'course-assessment-databank';

  if (!courseOrAssessment) {
    alert('Invalid course assessment data provided for export.');
    return false;
  }

  if (courseOrAssessment.scenarioQuestions && Array.isArray(courseOrAssessment.scenarioQuestions)) {
    questions = courseOrAssessment.scenarioQuestions;
    courseTitle = courseOrAssessment.title || courseTitle;
    courseSubject = courseOrAssessment.subject || courseSubject;
    classLevel = courseOrAssessment.classLevel || classLevel;
    board = courseOrAssessment.board || board;
    slug = (courseOrAssessment.title || 'course').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  } else if (courseOrAssessment.questions && Array.isArray(courseOrAssessment.questions)) {
    questions = courseOrAssessment.questions;
    courseTitle = courseOrAssessment.title || courseTitle;
    courseSubject = courseOrAssessment.subject || courseSubject;
    classLevel = courseOrAssessment.classLevel || classLevel;
    board = courseOrAssessment.board || board;
    slug = courseOrAssessment.slug || (courseOrAssessment.title || 'course').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  } else if (Array.isArray(courseOrAssessment)) {
    questions = courseOrAssessment;
  }

  if (questions.length === 0) {
    alert('No assessment questions found to export.');
    return false;
  }

  // 16-Column Master Schema (NCERT / Data Bank Standard)
  const schema = MASTER_SCHEMAS.ncert_pdf;
  const headers = [...schema.headers];

  const rows = questions.map((rawQ, idx) => {
    const q = sanitizeQuestionObject(rawQ);
    const opts = q.options || {};
    let optA = '';
    let optB = '';
    let optC = '';
    let optD = '';

    if (typeof opts === 'object' && !Array.isArray(opts)) {
      optA = opts.A || opts.a || opts.option_a || opts.optionA || '';
      optB = opts.B || opts.b || opts.option_b || opts.optionB || '';
      optC = opts.C || opts.c || opts.option_c || opts.optionC || '';
      optD = opts.D || opts.d || opts.option_d || opts.optionD || '';
    } else if (Array.isArray(opts)) {
      optA = opts[0] || '';
      optB = opts[1] || '';
      optC = opts[2] || '';
      optD = opts[3] || '';
    }

    if (!optA) optA = (q as any).option_a || (q as any).optionA || '';
    if (!optB) optB = (q as any).option_b || (q as any).optionB || '';
    if (!optC) optC = (q as any).option_c || (q as any).optionC || '';
    if (!optD) optD = (q as any).option_d || (q as any).optionD || '';

    // Strip leading "A)", "Option A:", etc. for pristine option text
    optA = stripLeadingOptionLabel(optA);
    optB = stripLeadingOptionLabel(optB);
    optC = stripLeadingOptionLabel(optC);
    optD = stripLeadingOptionLabel(optD);

    const questionText = q.question || (q as any).text || '';
    const answer = (q as any).answer || q.correctAnswer || 'A';
    const topic = q.topic || (q as any).chapter || `Module ${((idx % 4) + 1)} Competency`;
    const difficulty = q.difficulty || (idx % 3 === 0 ? 'Hard' : idx % 2 === 0 ? 'Medium' : 'Easy');
    const marks = (q as any).marks !== undefined ? (q as any).marks : 1;

    return [
      board,
      classLevel,
      courseSubject,
      'iGOT Karmayogi / ShikshaMitra Data Bank',
      courseTitle,
      `Module ${((idx % 4) + 1)}: ${topic}`,
      topic,
      'Scenario MCQ',
      difficulty,
      marks,
      questionText,
      optA,
      optB,
      optC,
      optD,
      answer,
    ];
  });

  const timestamp = new Date().toISOString().split('T')[0];
  const filename = customFilename || `Course_Assessment_DataBank_${slug}_${timestamp}.xlsx`;
  triggerXlsxDownload(headers, rows, filename, 'Course Assessment Data Bank');
  return true;
}
