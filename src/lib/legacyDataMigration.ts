/**
 * Legacy Data Migration & MCQ Schema Normalization Engine
 * 
 * Auto-corrects legacy or corrupted records where:
 * - The question is an MCQ / Multiple Choice question
 * - The "options" field is empty/blank or improperly formatted
 * - The "answer" field erroneously contains the split-pipe choices (e.g. "Option A | Option B | Option C | Option D")
 * 
 * Standardizes:
 * - "options" strictly to 4 choices separated by " | "
 * - "answer" strictly to a single capital letter ("A", "B", "C", or "D")
 * - SAQ / LAQ "options" strictly to "" (empty string)
 */

import { Assessment, AssessmentQuestion, Question } from '../types';
import { sanitizeMathAndChemistryText } from './mathSanitizer';

/**
 * Strips leading option labels like "Option A:", "A.", "1)", "(A)", etc.
 */
export function stripLeadingOptionLabel(optionText: string): string {
  if (!optionText || typeof optionText !== 'string') return '';
  let cleaned = optionText.trim();
  if (!cleaned) return '';

  // Strip "Option A:", "Option A -", "Option A.", "Option A", "Option 1:", etc.
  cleaned = cleaned.replace(/^Option\s+[A-Za-z0-9]+[\s.:\-]*\s*/i, '').trim();

  // Strip leading option label prefixes like A), B), C), D), A., B., (A), [A], a), b), 1), 2)
  cleaned = cleaned.replace(/^(?:[\(\[]?[A-Za-z0-9]{1,2}[\)\].:\-]\s*|[\(\[]?[A-Za-z0-9]{1,2}[\)\].]\s*)/i, '').trim();

  return cleaned;
}

/**
 * Extracts a single capital letter ('A' | 'B' | 'C' | 'D') for MCQ answer keys
 */
export function extractCleanAnswerLetter(rawAnswer: any, optionsTextOrArray?: string | string[]): string {
  if (!rawAnswer) return 'A';
  const str = String(rawAnswer).trim();

  // Direct match for single letter A, B, C, D
  const singleLetterMatch = str.match(/^[(\[]?([A-D])[)\]\.\:\-]?$/i);
  if (singleLetterMatch) {
    return singleLetterMatch[1].toUpperCase();
  }

  // Check common prefixes like "Option A", "Choice B", "Answer: C"
  const prefixMatch = str.match(/(?:Option|Choice|Answer|Key)\s*[:\-]?\s*([A-D])\b/i);
  if (prefixMatch) {
    return prefixMatch[1].toUpperCase();
  }

  // If answer is full option text, try matching against options choices
  let choices: string[] = [];
  if (typeof optionsTextOrArray === 'string' && optionsTextOrArray.includes('|')) {
    choices = optionsTextOrArray.split('|').map(c => stripLeadingOptionLabel(c.trim()).toLowerCase());
  } else if (Array.isArray(optionsTextOrArray)) {
    choices = optionsTextOrArray.map(c => stripLeadingOptionLabel(String(c).trim()).toLowerCase());
  }

  if (choices.length > 0) {
    const cleanRaw = stripLeadingOptionLabel(str).toLowerCase();
    const idx = choices.findIndex(c => c && (c === cleanRaw || cleanRaw.includes(c) || c.includes(cleanRaw)));
    if (idx !== -1 && idx < 4) {
      return String.fromCharCode(65 + idx);
    }
  }

  // Check if string begins with A, B, C, D
  const firstChar = str.charAt(0).toUpperCase();
  if (['A', 'B', 'C', 'D'].includes(firstChar)) {
    return firstChar;
  }

  return 'A';
}

/**
 * Smart migration utility function that dynamically detects and auto-corrects legacy or corrupted MCQ records.
 * Condition: If an existing record is detected as "MCQ" or "Multiple Choice" AND its options field is empty/blank
 * BUT its answer field contains the split-pipe choices (e.g., text containing 'Option A | Option B...'):
 * Action: dynamically parses that text, splits it by '|', populates options correctly, and sets answer to single letter.
 */
export function migrateLegacyMcqRecord<T extends Record<string, any>>(q: T): T {
  if (!q || typeof q !== 'object') return q;
  const cloned: any = { ...q };

  const rawType = String(cloned.type || cloned.questionType || '').trim();
  const typeLower = rawType.toLowerCase();
  const isMcq =
    typeLower.includes('mcq') ||
    typeLower.includes('multiple choice') ||
    typeLower.includes('multiple_choice') ||
    (!typeLower.includes('short') && !typeLower.includes('long') && !typeLower.includes('true') && !typeLower.includes('match') && !typeLower.includes('blank'));

  const isSaq = typeLower.includes('short answer') || typeLower === 'saq' || typeLower.includes('short');
  const isLaq = typeLower.includes('long answer') || typeLower === 'laq' || typeLower.includes('essay') || typeLower.includes('descriptive');
  const isSaqOrLaq = isSaq || isLaq;

  // Handle Short/Long Answer Questions: options must strictly be empty string ""
  if (isSaqOrLaq) {
    cloned.options = '';
    cloned.optionA = '';
    cloned.optionB = '';
    cloned.optionC = '';
    cloned.optionD = '';
    cloned.optionsObj = { A: '', B: '', C: '', D: '' };
    return cloned as T;
  }

  // Only proceed with MCQ normalization for MCQ question types
  if (!isMcq) {
    return cloned as T;
  }

  // Check if options is currently empty or invalid
  let optionsEmpty = false;
  if (!cloned.options) {
    optionsEmpty = true;
  } else if (typeof cloned.options === 'string') {
    optionsEmpty = cloned.options.trim().length === 0;
  } else if (typeof cloned.options === 'object') {
    optionsEmpty = !cloned.options.A && !cloned.options.B && !cloned.options.C && !cloned.options.D &&
      !cloned.options.a && !cloned.options.b && !cloned.options.c && !cloned.options.d;
  }

  const rawAnswer = String(cloned.answer || cloned.correctAnswer || '').trim();
  const hasPipedAnswer = rawAnswer.includes('|');

  // CRITICAL MIGRATION CASE:
  // Options is empty/blank BUT answer contains split-pipe choices!
  if (optionsEmpty && hasPipedAnswer) {
    const rawChoices = rawAnswer.split('|').map(s => s.trim()).filter(Boolean);
    if (rawChoices.length >= 2) {
      let detectedLetter = 'A';
      const cleanChoices = rawChoices.map((choice, idx) => {
        const letter = String.fromCharCode(65 + idx);
        if (/\b(?:correct|true|✓|\*|yes)\b/i.test(choice)) {
          detectedLetter = letter;
        }
        const withoutMarker = choice.replace(/[\(（]?(?:correct|✓|\*|true)[\)）]?/gi, '').trim();
        return sanitizeMathAndChemistryText(stripLeadingOptionLabel(withoutMarker));
      });

      // Ensure 4 choices
      while (cleanChoices.length < 4) {
        cleanChoices.push(`Option ${String.fromCharCode(65 + cleanChoices.length)}`);
      }

      const pipedOptions = cleanChoices.slice(0, 4).join(' | ');
      cloned.options = pipedOptions;
      cloned.optionA = cleanChoices[0];
      cloned.optionB = cleanChoices[1];
      cloned.optionC = cleanChoices[2];
      cloned.optionD = cleanChoices[3];
      cloned.optionsObj = {
        A: cleanChoices[0],
        B: cleanChoices[1],
        C: cleanChoices[2],
        D: cleanChoices[3],
      };

      // If original correctAnswer was already an unambiguous single letter, keep it
      const origCorrect = String(cloned.correctAnswer || '').trim().toUpperCase();
      if (['A', 'B', 'C', 'D'].includes(origCorrect)) {
        detectedLetter = origCorrect;
      }

      cloned.answer = detectedLetter;
      cloned.correctAnswer = detectedLetter;
      return cloned as T;
    }
  }

  // STANDARD MCQ NORMALIZATION:
  // Ensure options field is standard 4-choice pipe separated string and answer is single letter
  let choices: string[] = [];

  if (typeof cloned.options === 'string' && cloned.options.includes('|')) {
    choices = cloned.options.split('|').map(c => sanitizeMathAndChemistryText(stripLeadingOptionLabel(c.trim()))).filter(Boolean);
  } else if (cloned.options && typeof cloned.options === 'object') {
    const optA = cloned.options.A || cloned.options.a || cloned.optionA || cloned.option_a || '';
    const optB = cloned.options.B || cloned.options.b || cloned.optionB || cloned.option_b || '';
    const optC = cloned.options.C || cloned.options.c || cloned.optionC || cloned.option_c || '';
    const optD = cloned.options.D || cloned.options.d || cloned.optionD || cloned.option_d || '';
    choices = [optA, optB, optC, optD].map(c => sanitizeMathAndChemistryText(stripLeadingOptionLabel(String(c).trim()))).filter(Boolean);
  } else if (cloned.optionA || cloned.optionB) {
    const optA = cloned.optionA || cloned.option_a || '';
    const optB = cloned.optionB || cloned.option_b || '';
    const optC = cloned.optionC || cloned.option_c || '';
    const optD = cloned.optionD || cloned.option_d || '';
    choices = [optA, optB, optC, optD].map(c => sanitizeMathAndChemistryText(stripLeadingOptionLabel(String(c).trim()))).filter(Boolean);
  }

  if (choices.length >= 2) {
    while (choices.length < 4) {
      choices.push(`Option ${String.fromCharCode(65 + choices.length)}`);
    }

    const finalChoices = choices.slice(0, 4);
    const pipedOptions = finalChoices.join(' | ');

    cloned.options = pipedOptions;
    cloned.optionA = finalChoices[0];
    cloned.optionB = finalChoices[1];
    cloned.optionC = finalChoices[2];
    cloned.optionD = finalChoices[3];
    cloned.optionsObj = {
      A: finalChoices[0],
      B: finalChoices[1],
      C: finalChoices[2],
      D: finalChoices[3],
    };

    const cleanLetter = extractCleanAnswerLetter(cloned.answer || cloned.correctAnswer || 'A', finalChoices);
    cloned.answer = cleanLetter;
    cloned.correctAnswer = cleanLetter;
  }

  return cloned as T;
}

/**
 * Migrates and heals an entire Assessment object and all its embedded questions
 */
export function migrateLegacyAssessmentRecord(asm: Assessment): Assessment {
  if (!asm || typeof asm !== 'object') return asm;
  const questions = Array.isArray(asm.questions)
    ? asm.questions.map(q => migrateLegacyMcqRecord(q))
    : [];

  return {
    ...asm,
    questions,
  };
}
