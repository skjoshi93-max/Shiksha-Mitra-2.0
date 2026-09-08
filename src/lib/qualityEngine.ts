import { Question, AssessmentQuestion } from '../types';

export type QuestionQualityStatus = 
  | 'GENERATED'
  | 'PROOFREAD'
  | 'VALIDATED'
  | 'DUPLICATE_REJECTED'
  | 'QUALITY_REJECTED'
  | 'FINAL';

export interface QualityResult {
  score: number;
  passed: boolean;
  notes: string[];
}

export interface DuplicateCheckResult {
  maxSimilarity: number;
  matchedQuestion?: any;
  matchedItem?: any;
  isDuplicate: boolean;
}

export interface RejectionLogEntry {
  id: string;
  questionText: string;
  reason: string; // e.g. "REJECTED — DUPLICATE", "REJECTED — CONTENT VALIDATION", etc.
  details: string[];
  matchId?: string;
  similarityScore?: number;
  timestamp: string;
  module: string;
  subject: string;
}

// 1. Text Normalization for Duplicate Detection
export function normalizeQuestionText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/["'`’“”]/g, '')
    .replace(/[^\w\s\u0900-\u097F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// 2. Comprehensive Proofreading & Quality Control Pipeline
export function proofreadAndValidateQuestion(q: any, minThreshold = 85): QualityResult {
  let score = 100;
  const notes: string[] = [];

  const text = (q.question || q.text || '').trim();

  // A. Length & Completeness Check
  if (!text || text.length < 20) {
    score -= 35;
    notes.push('Question statement is too short or incomplete (< 20 characters).');
  } else if (text.length > 800) {
    score -= 10;
    notes.push('Question statement is excessively long (> 800 characters).');
  }

  // B. Punctuation & Capitalization Check
  if (text && !/[?!.।]$/.test(text)) {
    score -= 8;
    notes.push('Question statement missing proper ending punctuation (?, ., or ।).');
  }

  const firstChar = text.charAt(0);
  if (firstChar && firstChar === firstChar.toLowerCase() && /[a-z]/i.test(firstChar)) {
    score -= 5;
    notes.push('Question statement should start with a capital letter.');
  }

  // C. AI Artifact & Leakage Detection
  const lowercaseText = text.toLowerCase();
  const bannedPhrases = [
    'as an ai',
    'here is the json',
    'here are the questions',
    'lorem ipsum',
    'dummy text',
    'insert question here',
    'sample question',
    'output only',
    'json schema',
  ];

  for (const phrase of bannedPhrases) {
    if (lowercaseText.includes(phrase)) {
      score -= 50;
      notes.push(`Detected prohibited AI prompt leakage or placeholder artifact: "${phrase}".`);
    }
  }

  // D. MCQ Options & Answer Validation (If options exist)
  const isMCQ = !!(
    q.options ||
    q.option_a || q.optionA ||
    q.option_b || q.optionB ||
    q.option_c || q.optionC ||
    q.option_d || q.optionD ||
    (q.questionType && typeof q.questionType === 'string' && (
      q.questionType.toLowerCase().includes('mcq') ||
      q.questionType.toLowerCase().includes('multiple choice') ||
      q.questionType.toLowerCase().includes('multiple-choice')
    ))
  );

  if (isMCQ) {
    const options = q.options || {
      A: q.option_a || q.optionA,
      B: q.option_b || q.optionB,
      C: q.option_c || q.optionC,
      D: q.option_d || q.optionD,
    };

    if (options && typeof options === 'object') {
      const keys = ['A', 'B', 'C', 'D'];
      let emptyCount = 0;
      const optionValues: string[] = [];

      keys.forEach(k => {
        const optVal = (options[k] || '').trim();
        if (!optVal) {
          emptyCount++;
        } else {
          optionValues.push(optVal.toLowerCase());
        }
      });

      if (emptyCount > 0) {
        score -= 30;
        notes.push(`MCQ has ${emptyCount} empty or missing option(s).`);
      }

      // Check for duplicate options
      const uniqueOptions = new Set(optionValues);
      if (uniqueOptions.size < optionValues.length) {
        score -= 25;
        notes.push('MCQ contains duplicate or identical options.');
      }

      // Check correct answer validity
      const correctAns = (q.correctAnswer || q.answer || '').trim().toUpperCase();
      if (correctAns && !['A', 'B', 'C', 'D', 'TRUE', 'FALSE'].includes(correctAns)) {
        score -= 20;
        notes.push(`Invalid correct answer indicator: "${correctAns}". Must be A, B, C, or D.`);
      }
    }
  }

  // E. Hint / Explanation Check
  const explanation = (q.hint || q.explanation || '').trim();
  if (!explanation || explanation.length < 10) {
    score -= 10;
    notes.push('Missing or inadequate explanation/evaluation rubric.');
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  const passed = score >= minThreshold;

  if (passed && notes.length === 0) {
    notes.push('Passed all centralized AI proofreading & quality control benchmarks.');
  }

  return { score, passed, notes };
}

// Alias for backward compatibility across modules
export function assessQuestionQuality(q: any, minThreshold = 85): QualityResult {
  return proofreadAndValidateQuestion(q, minThreshold);
}

// 3. Advanced Semantic Similarity & Duplicate Detection
export function calculateTextSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;

  const s1 = normalizeQuestionText(str1);
  const s2 = normalizeQuestionText(str2);

  if (s1 === s2) return 100;
  if (!s1 || !s2) return 0;

  // Word Jaccard
  const words1 = new Set(s1.split(/\s+/).filter(w => w.length > 2));
  const words2 = new Set(s2.split(/\s+/).filter(w => w.length > 2));

  if (words1.size === 0 || words2.size === 0) return 0;

  let intersection = 0;
  words1.forEach(w => {
    if (words2.has(w)) intersection++;
  });

  const union = new Set([...words1, ...words2]).size;
  const jaccardScore = union > 0 ? (intersection / union) * 100 : 0;

  // 3-Gram Character Overlap
  const getGrams = (str: string) => {
    const grams = new Set<string>();
    for (let i = 0; i <= str.length - 3; i++) {
      grams.add(str.substring(i, i + 3));
    }
    return grams;
  };

  const g1 = getGrams(s1);
  const g2 = getGrams(s2);

  let gIntersect = 0;
  g1.forEach(g => {
    if (g2.has(g)) gIntersect++;
  });
  const gUnion = new Set([...g1, ...g2]).size;
  const gramScore = gUnion > 0 ? (gIntersect / gUnion) * 100 : 0;

  const combined = Math.round(jaccardScore * 0.6 + gramScore * 0.4);
  return Math.min(100, Math.max(0, combined));
}

// 4. Portal-Wide Duplicate Checker against saved and current batch questions
export function findDuplicateInBank(
  target: any,
  existingQuestions: any[],
  thresholdPercent = 75
): DuplicateCheckResult {
  const targetText = target.question || target.text || '';
  if (!targetText) return { maxSimilarity: 0, isDuplicate: false };

  let maxSimilarity = 0;
  let matchedItem: any = undefined;

  for (const item of existingQuestions) {
    if (!item) continue;
    const itemText = item.question || item.text || '';
    if (!itemText) continue;

    // Avoid self-match if IDs match
    if (target.id && item.id && target.id === item.id) continue;

    const sim = calculateTextSimilarity(targetText, itemText);
    if (sim > maxSimilarity) {
      maxSimilarity = sim;
      matchedItem = item;
    }
  }

  return {
    maxSimilarity,
    matchedQuestion: matchedItem,
    matchedItem,
    isDuplicate: maxSimilarity >= thresholdPercent,
  };
}

// 5. Portal-Wide Persistent Question Registry Manager
const PORTAL_REGISTRY_KEY = 'shikshamitra_portal_question_registry_v1';
const PORTAL_REJECTION_LOGS_KEY = 'shikshamitra_portal_rejection_logs_v1';

export function getPortalSavedQuestions(): any[] {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(PORTAL_REGISTRY_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    }
  } catch (err) {
    console.warn('Error reading portal question registry:', err);
  }
  return [];
}

export function registerSavedQuestions(newQuestions: any[]): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage && Array.isArray(newQuestions)) {
      const existing = getPortalSavedQuestions();
      const existingTexts = new Set(existing.map(q => normalizeQuestionText(q.question || q.text || '')));

      const uniqueToAdd = newQuestions.filter(q => {
        const t = normalizeQuestionText(q.question || q.text || '');
        if (!t || existingTexts.has(t)) return false;
        existingTexts.add(t);
        return true;
      });

      if (uniqueToAdd.length > 0) {
        const updated = [...existing, ...uniqueToAdd];
        // Keep last 2000 questions to avoid storage bloat
        const trimmed = updated.slice(-2000);
        window.localStorage.setItem(PORTAL_REGISTRY_KEY, JSON.stringify(trimmed));
      }
    }
  } catch (err) {
    console.warn('Error saving to portal question registry:', err);
  }
}

// 6. Quality Rejection Logging
export function getRejectionLogs(): RejectionLogEntry[] {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(PORTAL_REJECTION_LOGS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    }
  } catch (err) {
    console.warn('Error reading rejection logs:', err);
  }
  return [];
}

export function logRejection(entry: Omit<RejectionLogEntry, 'timestamp'>): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const existing = getRejectionLogs();
      const fullEntry: RejectionLogEntry = {
        ...entry,
        timestamp: new Date().toISOString(),
      };
      const updated = [fullEntry, ...existing].slice(0, 500); // Keep last 500 logs
      window.localStorage.setItem(PORTAL_REJECTION_LOGS_KEY, JSON.stringify(updated));
    }
  } catch (err) {
    console.warn('Error saving rejection log:', err);
  }
}

// 7. Standardized Pipeline Processing Wrapper (Generate -> Proofread -> Validate -> Duplicate Check -> Final)
export function processQuestionThroughPipeline(
  rawQuestion: any,
  existingBank: any[],
  moduleName = 'General',
  minThreshold = 85,
  similarityThreshold = 75
): { status: QuestionQualityStatus; processedQuestion?: any; rejectionReason?: string } {
  // State: GENERATED
  rawQuestion.status = 'GENERATED';

  // State: PROOFREAD & VALIDATED
  const quality = proofreadAndValidateQuestion(rawQuestion, minThreshold);
  rawQuestion.qualityScore = quality.score;
  rawQuestion.status = 'PROOFREAD';

  if (!quality.passed) {
    rawQuestion.status = 'QUALITY_REJECTED';
    let reasonType = 'REJECTED — CONTENT VALIDATION';
    const notesLower = quality.notes.join(' ').toLowerCase();
    if (notesLower.includes('grammar') || notesLower.includes('punctuation') || notesLower.includes('capital')) {
      reasonType = 'REJECTED — LANGUAGE/GRAMMAR';
    } else if (notesLower.includes('option') || notesLower.includes('answer')) {
      reasonType = 'REJECTED — INVALID MCQ OPTIONS';
    }
    logRejection({
      id: rawQuestion.id || `Q-${Date.now()}`,
      questionText: rawQuestion.question || rawQuestion.text || '',
      reason: reasonType,
      details: quality.notes,
      module: moduleName,
      subject: rawQuestion.subject || 'General',
    });
    return { status: 'QUALITY_REJECTED', rejectionReason: reasonType };
  }
  rawQuestion.status = 'VALIDATED';

  // State: DUPLICATE CHECK (Against current bank + portal saved questions)
  const portalRegistry = getPortalSavedQuestions();
  const combinedBank = [...existingBank, ...portalRegistry];
  const dupCheck = findDuplicateInBank(rawQuestion, combinedBank, similarityThreshold);
  rawQuestion.duplicateSimilarity = dupCheck.maxSimilarity;

  if (dupCheck.isDuplicate) {
    rawQuestion.status = 'DUPLICATE_REJECTED';
    logRejection({
      id: rawQuestion.id || `Q-${Date.now()}`,
      questionText: rawQuestion.question || rawQuestion.text || '',
      reason: 'REJECTED — DUPLICATE',
      details: [`Matched existing question similarity at ${dupCheck.maxSimilarity}%`],
      matchId: dupCheck.matchedQuestion?.id,
      similarityScore: dupCheck.maxSimilarity,
      module: moduleName,
      subject: rawQuestion.subject || 'General',
    });
    return { status: 'DUPLICATE_REJECTED', rejectionReason: 'REJECTED — DUPLICATE' };
  }

  // State: FINAL
  rawQuestion.status = 'FINAL';
  return { status: 'FINAL', processedQuestion: rawQuestion };
}
