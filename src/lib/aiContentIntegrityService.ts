import { Question, AssessmentQuestion, NcertQuestion, DifficultyLevel } from '../types';
import {
  normalizeScientificContent,
  validateScientificContent,
  cleanEscapedBackslashes,
  convertMathSymbolsToLatex,
  sanitizeQuestionObject,
  sanitizeAssessmentObject,
  KNOWN_CHEMICAL_FORMULAS,
  KNOWN_CHEMICAL_ELEMENTS,
} from './scientificIntegrityService';
import { calculateTextSimilarity, normalizeQuestionText } from './qualityEngine';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type IntegrityStatus =
  | 'GENERATING'
  | 'VALIDATING'
  | 'VERIFIED'
  | 'REJECTED'
  | 'REGENERATION_REQUIRED';

export interface LayerValidationResult {
  passed: boolean;
  score: number; // 0 to 100
  notes: string[];
}

export interface ContentIntegrityResult {
  passed: boolean;
  overallScore: number; // 0 to 100 (Threshold >= 90 for VERIFIED)
  status: IntegrityStatus;
  sanitizedItem: any;
  rejectionReasons: string[];
  layerResults: {
    structure: LayerValidationResult;
    subjectClassMatch: LayerValidationResult;
    substantiveContent: LayerValidationResult;
    optionsAndAnswer: LayerValidationResult;
    scientificFormula: LayerValidationResult;
    duplicateCheck: LayerValidationResult;
  };
  fingerprint: string;
}

export interface BatchIntegrityResult {
  totalProcessed: number;
  verifiedCount: number;
  rejectedCount: number;
  answerDistribution: Record<string, number>;
  isAnswerBiased: boolean;
  verifiedItems: any[];
  rejectedItems: Array<{ item: any; reasons: string[] }>;
  averageQualityScore: number;
  diagnosticSummary: string;
}

// ============================================================================
// PROHIBITED / PLACEHOLDER PATTERNS (Anti-Template & Anti-Slop Filter)
// ============================================================================

const BANNED_PLACEHOLDER_REGEXES: RegExp[] = [
  /core\s+foundational\s+principle/i,
  /plausible\s+distractor/i,
  /alternative\s+distractor/i,
  /sample\s+question/i,
  /dummy\s+question/i,
  /test\s+question/i,
  /\bplaceholder\b/i,
  /option\s+[a-d]\s+text/i,
  /option\s+[a-d]\s+with\s+\$latex\$/i,
  /complete\s+accuracy/i,
  /conceptual\s+variation/i,
  /limited\s+scope/i,
  /generic\s+explanation/i,
  /which\s+of\s+the\s+following\s+statements\s+represents\s+the\s+most\s+accurate\s+pedagogical/i,
  /aligns\s+strictly\s+with\s+the\s+.*curriculum\s+standards/i,
  /options\s+[a-d],\s*[a-d],\s*and\s*[a-d]\s+contain\s+conceptual\s+distortions/i,
  /options\s+[a-d]\s+and\s+[a-d]\s+are\s+incorrect/i,
  /\blorem\s+ipsum\b/i,
  /insert\s+(?:question|answer|option|formula)\s+here/i,
  /svgsvgsvg/i,
  /\{\{[^}]*\}\}/,
  /\[INSERT[^\]]*\]/i,
  /\bundefined\b/i,
  /\bNaN\b/,
  /\bnull\b/i,
  /as\s+an\s+ai\b/i,
  /here\s+is\s+the\s+json\b/i,
  /output\s+only\s+valid\s+json\b/i,
];

// ============================================================================
// SUBJECT DOMAIN VOCABULARY & SUBSTANTIVE MATRICES
// ============================================================================

const MATH_SUBSTANTIVE_KEYWORDS = [
  'solve', 'equation', 'root', 'roots', 'polynomial', 'quadratic', 'linear',
  'discriminant', 'zeroes', 'zeros', 'coefficient', 'matrix', 'matrices',
  'determinant', 'vector', 'calculus', 'derivative', 'integral', 'limit',
  'function', 'domain', 'range', 'trigonometry', 'sin', 'cos', 'tan', 'sec',
  'cosec', 'cot', 'angle', 'triangle', 'circle', 'radius', 'diameter',
  'perimeter', 'area', 'volume', 'sphere', 'cylinder', 'cone', 'pythagoras',
  'arithmetic', 'progression', 'geometric', 'ratio', 'proportion', 'fraction',
  'decimal', 'percentage', 'probability', 'statistics', 'mean', 'median',
  'mode', 'variance', 'deviation', 'coordinate', 'distance', 'slope',
  'intercept', 'theorem', 'lcm', 'hcf', 'prime', 'factorization', 'rational',
  'irrational', 'logarithm', 'exponent', 'power', 'series', 'sequence',
  'parallel', 'perpendicular', 'hypotenuse', 'tangent', 'chord', 'secant',
  'value of', 'evaluate', 'simplify', 'find x', 'find y', 'find the value',
];

const PHYSICS_SUBSTANTIVE_KEYWORDS = [
  'velocity', 'acceleration', 'force', 'mass', 'gravity', 'gravitation',
  'momentum', 'friction', 'inertia', 'newton', 'energy', 'kinetic', 'potential',
  'work', 'power', 'joule', 'watt', 'pascal', 'pressure', 'density', 'buoyancy',
  'archimedes', 'temperature', 'heat', 'thermal', 'thermodynamics', 'optics',
  'reflection', 'refraction', 'focal', 'lens', 'mirror', 'magnification',
  'current', 'voltage', 'resistance', 'ohm', 'resistor', 'circuit', 'ampere',
  'coulomb', 'magnetic', 'electromagnetism', 'induction', 'flux', 'faraday',
  'wave', 'frequency', 'wavelength', 'amplitude', 'sound', 'light', 'photon',
  'doppler', 'dispersion', 'interference', 'diffraction', 'si unit',
];

const CHEMISTRY_SUBSTANTIVE_KEYWORDS = [
  'reaction', 'chemical', 'equation', 'reactants', 'products', 'balanced',
  'acid', 'base', 'salt', 'ph', 'litmus', 'neutralization', 'oxidation',
  'reduction', 'redox', 'electron', 'proton', 'neutron', 'atomic', 'valency',
  'isotope', 'isobar', 'periodic', 'table', 'metal', 'non-metal', 'metalloid',
  'compound', 'mixture', 'element', 'molecule', 'mole', 'molar', 'mass',
  'concentration', 'solution', 'solute', 'solvent', 'precipitate', 'catalyst',
  'exothermic', 'endothermic', 'hydrocarbon', 'alkane', 'alkene', 'alkyne',
  'organic', 'functional', 'group', 'ester', 'alcohol', 'corrosion', 'rusting',
];

const BIOLOGY_SUBSTANTIVE_KEYWORDS = [
  'cell', 'tissue', 'organ', 'organism', 'photosynthesis', 'respiration',
  'chlorophyll', 'chloroplast', 'mitochondria', 'dna', 'rna', 'chromosome',
  'gene', 'genetics', 'heredity', 'mendel', 'enzyme', 'protein', 'hormone',
  'circulatory', 'heart', 'blood', 'artery', 'vein', 'hemoglobin', 'digestive',
  'stomach', 'intestine', 'enzyme', 'nervous', 'neuron', 'brain', 'reflex',
  'excretory', 'kidney', 'nephron', 'reproduction', 'gamete', 'fertilization',
  'embryo', 'ecosystem', 'food chain', 'biodiversity', 'evolution', 'species',
];

// ============================================================================
// CORE VALIDATION HELPERS
// ============================================================================

/**
 * Checks if a given text string contains banned placeholder or template phrases.
 */
export function isBannedPlaceholderText(text: string): { isBanned: boolean; matchedPhrase?: string } {
  if (!text || typeof text !== 'string') return { isBanned: false };

  for (const regex of BANNED_PLACEHOLDER_REGEXES) {
    const match = text.match(regex);
    if (match) {
      return { isBanned: true, matchedPhrase: match[0] };
    }
  }

  return { isBanned: false };
}

/**
 * Generates an immutable content fingerprint for a question object
 */
export function generateQuestionFingerprint(q: any): string {
  const normText = normalizeQuestionText(q.question || q.text || '');
  const subject = (q.subject || '').toLowerCase().trim();
  const options = q.options ? Object.values(q.options).map((v: any) => normalizeQuestionText(String(v))).sort().join('|') : '';
  const payload = `${subject}::${normText}::${options}`;
  
  // Simple deterministic hash for browser & server
  let hash = 0;
  for (let i = 0; i < payload.length; i++) {
    const char = payload.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return `FP-${Math.abs(hash).toString(16)}-${normText.slice(0, 10).replace(/\s+/g, '_')}`;
}

/**
 * Checks if the question possesses real subject domain substance.
 */
export function validateSubjectDomainSubstance(
  questionText: string,
  options: Record<string, string> | undefined,
  subject: string,
  topic?: string
): { passed: boolean; score: number; details: string[] } {
  const notes: string[] = [];
  let score = 100;

  if (!questionText || questionText.trim().length < 15) {
    return { passed: false, score: 0, details: ['Question text is empty or too short.'] };
  }

  const combinedContent = (
    questionText + ' ' +
    (options ? Object.values(options).join(' ') : '') + ' ' +
    (topic || '')
  ).toLowerCase();

  const subLower = (subject || '').toLowerCase();

  // 1. Mathematics & Math Pedagogy Check
  if (subLower.includes('math') || subLower.includes('algebra') || subLower.includes('geometry') || subLower.includes('ganita')) {
    const hasMathKeyword = MATH_SUBSTANTIVE_KEYWORDS.some(kw => combinedContent.includes(kw));
    const hasNumbers = /\d+/.test(questionText);
    const hasLatexFormula = /\$[^$]+\$/.test(questionText) || /\\(?:frac|sqrt|alpha|beta|pi|int|sum|times|div|pm|le|ge|neq)/.test(questionText);
    const hasEquation = /[=+\-*/^]/.test(questionText);
    const hasPedagogicalMath = /cra|manipulative|misconception|place value|number sense|scaffold|word problem|fraction strip|remedial|diagnostic/i.test(combinedContent);

    const mathScoreFactors = [hasMathKeyword, hasNumbers, hasLatexFormula, hasEquation, hasPedagogicalMath].filter(Boolean).length;

    if (mathScoreFactors < 1) {
      score -= 30;
      notes.push('Mathematical content lacking authentic numerical, algebraic, geometric, or pedagogical math concepts.');
    }
  }

  // 2. Physics & Science Pedagogy Check
  else if (subLower.includes('physic') || (subLower.includes('science') && (topic || '').toLowerCase().includes('physic'))) {
    const hasPhysicsKeyword = PHYSICS_SUBSTANTIVE_KEYWORDS.some(kw => combinedContent.includes(kw));
    const hasUnitsOrFormulas = /\b(m\/s|m\/s\^2|kg|n|j|w|v|a|ohm|c|pa|hz)\b/i.test(combinedContent) || /\$[^$]+\$/.test(questionText);
    const hasPhysicsPedagogy = /5e|inquiry|experiment|lab|demonstration|misconception|scaffolding|conceptual/i.test(combinedContent);

    if (!hasPhysicsKeyword && !hasUnitsOrFormulas && !hasPhysicsPedagogy) {
      score -= 30;
      notes.push('Physics question lacks authentic physical concepts, variables, or pedagogical science context.');
    }
  }

  // 3. Chemistry Check
  else if (subLower.includes('chem') || (subLower.includes('science') && (topic || '').toLowerCase().includes('chem'))) {
    const hasChemKeyword = CHEMISTRY_SUBSTANTIVE_KEYWORDS.some(kw => combinedContent.includes(kw));
    const hasChemFormula = KNOWN_CHEMICAL_FORMULAS.some(f => combinedContent.includes(f.toLowerCase())) ||
      KNOWN_CHEMICAL_ELEMENTS.has(questionText.slice(0, 3)) ||
      /\$[^$]*\\rightarrow[^$]*\$/.test(questionText);
    const hasChemPedagogy = /lab safety|titration|reaction|misconception|orbital|inquiry|demonstration/i.test(combinedContent);

    if (!hasChemKeyword && !hasChemFormula && !hasChemPedagogy) {
      score -= 30;
      notes.push('Chemistry question lacks authentic chemical reactions, compounds, or science laboratory context.');
    }
  }

  // 4. Biology Check
  else if (subLower.includes('bio') || (subLower.includes('science') && (topic || '').toLowerCase().includes('bio'))) {
    const hasBioKeyword = BIOLOGY_SUBSTANTIVE_KEYWORDS.some(kw => combinedContent.includes(kw));
    const hasBioPedagogy = /microscope|specimen|inquiry|ecosystem|heredity|organism|pedagogy|diagram/i.test(combinedContent);
    if (!hasBioKeyword && !hasBioPedagogy) {
      score -= 30;
      notes.push('Biology question lacks authentic biological terminology or pedagogical context.');
    }
  }

  score = Math.max(0, Math.min(100, score));
  return {
    passed: score >= 70,
    score,
    details: notes.length > 0 ? notes : ['Passed subject domain substance verification.'],
  };
}

/**
 * Validates the MCQ Options and Answer Relationship.
 * Enforces:
 * - Exactly 4 distinct options (A, B, C, D)
 * - No placeholder/dummy options (e.g. Option A, distractor B)
 * - Correct answer must be A, B, C, or D
 * - Options cannot be identical
 */
export function validateMCQOptionsAndAnswer(
  options: Record<string, string> | any,
  correctAnswer: string,
  explanation: string,
  questionType?: string
): { passed: boolean; score: number; details: string[] } {
  const notes: string[] = [];
  let score = 100;
  const qType = (questionType || '').toLowerCase();
  const isTrueFalse = qType.includes('true') || qType.includes('false');

  if (!options || typeof options !== 'object') {
    return { passed: false, score: 0, details: ['Missing options object.'] };
  }

  const optA = (options.A || options.a || (Array.isArray(options) ? options[0] : '') || '').trim();
  const optB = (options.B || options.b || (Array.isArray(options) ? options[1] : '') || '').trim();
  const optC = (options.C || options.c || (Array.isArray(options) ? options[2] : '') || '').trim();
  const optD = (options.D || options.d || (Array.isArray(options) ? options[3] : '') || '').trim();

  if (isTrueFalse) {
    // True/False validation only requires 2 options (A & B or True & False)
    if (!optA || !optB) {
      score -= 40;
      notes.push('True/False question requires both True and False options.');
    }
    const cleanAns = (correctAnswer || '').trim().toUpperCase();
    if (!['A', 'B', 'TRUE', 'FALSE', 'T', 'F'].includes(cleanAns)) {
      score -= 30;
      notes.push(`Invalid True/False answer indicator "${correctAnswer}". Must be 'A', 'B', 'True', or 'False'.`);
    }
  } else {
    const optArray = [optA, optB, optC, optD];

    // 1. Completeness Check
    const emptyCount = optArray.filter(o => o.length === 0).length;
    if (emptyCount > 0) {
      score -= 40;
      notes.push(`MCQ has ${emptyCount} empty option(s). Exactly 4 non-empty options required.`);
    }

    // 2. Uniqueness Check
    const normalizedOpts = optArray.map(o => o.toLowerCase().replace(/\s+/g, ' '));
    const uniqueSet = new Set(normalizedOpts);
    if (uniqueSet.size < 4 && emptyCount === 0) {
      score -= 40;
      notes.push('MCQ options contain duplicate or identical choices.');
    }

    // 3. Placeholder Option Check
    for (let i = 0; i < optArray.length; i++) {
      const optLabel = ['A', 'B', 'C', 'D'][i];
      const bannedCheck = isBannedPlaceholderText(optArray[i]);
      if (bannedCheck.isBanned) {
        score -= 50;
        notes.push(`Option ${optLabel} contains prohibited placeholder artifact: "${bannedCheck.matchedPhrase}".`);
      }
    }

    // 4. Correct Answer Indicator Check
    const cleanAns = (correctAnswer || '').trim().toUpperCase();
    if (!['A', 'B', 'C', 'D'].includes(cleanAns)) {
      score -= 40;
      notes.push(`Invalid correct answer indicator "${correctAnswer}". Must be strictly 'A', 'B', 'C', or 'D'.`);
    }
  }

  // 5. Explanation / Hint Check
  const cleanExp = (explanation || '').trim();
  if (!cleanExp || cleanExp.length < 10) {
    score -= 15;
    notes.push('Explanation or evaluation rubric is missing or too brief (< 10 characters).');
  } else {
    const expBannedCheck = isBannedPlaceholderText(cleanExp);
    if (expBannedCheck.isBanned) {
      score -= 40;
      notes.push(`Explanation contains prohibited placeholder text: "${expBannedCheck.matchedPhrase}".`);
    }
  }

  score = Math.max(0, Math.min(100, score));
  return {
    passed: score >= 75,
    score,
    details: notes.length > 0 ? notes : ['Passed options and answer relationship integrity.'],
  };
}

/**
 * Checks a batch of questions for Answer Bias (e.g. all answers = 'A').
 * If a single option constitutes > 65% of a batch of 4+ questions, flags answer bias.
 */
export function checkAnswerDistributionBias(questions: any[]): {
  isBiased: boolean;
  distribution: Record<string, number>;
  dominantOption?: string;
  dominantPercentage?: number;
} {
  const distribution: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 };
  let totalMCQ = 0;

  for (const q of questions) {
    const ans = (q.correctAnswer || q.answer || '').trim().toUpperCase();
    if (['A', 'B', 'C', 'D'].includes(ans)) {
      distribution[ans] = (distribution[ans] || 0) + 1;
      totalMCQ++;
    }
  }

  if (totalMCQ < 4) {
    return { isBiased: false, distribution };
  }

  let dominantOption = 'A';
  let maxCount = 0;

  for (const [opt, count] of Object.entries(distribution)) {
    if (count > maxCount) {
      maxCount = count;
      dominantOption = opt;
    }
  }

  const dominantPercentage = Math.round((maxCount / totalMCQ) * 100);
  const isBiased = dominantPercentage > 65;

  return {
    isBiased,
    distribution,
    dominantOption: isBiased ? dominantOption : undefined,
    dominantPercentage: isBiased ? dominantPercentage : undefined,
  };
}

/**
 * Shuffles MCQ options safely and recomputes the correct answer key
 * to eliminate artificial position bias without altering the problem logic.
 */
export function shuffleMCQOptions(q: any, targetOption?: 'A' | 'B' | 'C' | 'D'): any {
  if (!q.options) return q;

  const currentAnsKey = (q.correctAnswer || q.answer || 'A').toUpperCase() as 'A' | 'B' | 'C' | 'D';
  const oldOptions = {
    A: q.options.A || '',
    B: q.options.B || '',
    C: q.options.C || '',
    D: q.options.D || '',
  };

  const correctText = oldOptions[currentAnsKey] || oldOptions.A;
  const otherTexts = ['A', 'B', 'C', 'D']
    .filter(k => k !== currentAnsKey)
    .map(k => (oldOptions as any)[k]);

  // Determine new key for correct answer
  const keys: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D'];
  const newAnsKey = targetOption || keys[Math.floor(Math.random() * keys.length)];

  const newOptions: Record<string, string> = {};
  newOptions[newAnsKey] = correctText;

  let otherIdx = 0;
  for (const k of keys) {
    if (k !== newAnsKey) {
      newOptions[k] = otherTexts[otherIdx++] || '';
    }
  }

  return {
    ...q,
    options: newOptions,
    correctAnswer: newAnsKey,
    answer: newAnsKey,
  };
}

// ============================================================================
// MAIN UNIFIED CONTENT INTEGRITY SERVICE
// ============================================================================

export class AIContentIntegrityService {
  /**
   * Evaluates a single question through the 6-layer verification pipeline.
   */
  public static validateQuestion(
    rawQ: any,
    context: {
      subject?: string;
      classLevel?: string;
      topic?: string;
      questionType?: string;
      minQualityScore?: number;
      existingBank?: any[];
    } = {}
  ): ContentIntegrityResult {
    const minThreshold = context.minQualityScore ?? 88;
    const notes: string[] = [];
    const rejectionReasons: string[] = [];

    // Sanitize object and scientific notation first
    const sanitized = sanitizeQuestionObject(rawQ);
    const qText = (sanitized.question || sanitized.text || '').trim();

    // ----------------------------------------------------
    // LAYER 1: Structural & Schema Integrity
    // ----------------------------------------------------
    const structureNotes: string[] = [];
    let structurePassed = true;
    let structureScore = 100;

    if (!qText || qText.length < 15) {
      structurePassed = false;
      structureScore = 0;
      structureNotes.push('Question statement is missing or too short (< 15 characters).');
      rejectionReasons.push('STRUCTURAL: Missing or incomplete question text');
    }

    const structureResult: LayerValidationResult = {
      passed: structurePassed,
      score: structureScore,
      notes: structureNotes.length > 0 ? structureNotes : ['Passed structural schema requirements.'],
    };

    // ----------------------------------------------------
    // LAYER 2: Subject & Class/Grade Verification
    // ----------------------------------------------------
    const targetSubject = context.subject || sanitized.subject || 'General';
    const domainCheck = validateSubjectDomainSubstance(
      qText,
      sanitized.options,
      targetSubject,
      context.topic || sanitized.topic
    );

    if (!domainCheck.passed) {
      rejectionReasons.push(...domainCheck.details);
    }

    const subjectClassResult: LayerValidationResult = {
      passed: domainCheck.passed,
      score: domainCheck.score,
      notes: domainCheck.details,
    };

    // ----------------------------------------------------
    // LAYER 3: Substantive Content & Anti-Placeholder Gate
    // ----------------------------------------------------
    const subNotes: string[] = [];
    let subScore = 100;
    let subPassed = true;

    // Test for banned placeholder patterns across all fields
    const questionBanned = isBannedPlaceholderText(qText);
    if (questionBanned.isBanned) {
      subPassed = false;
      subScore -= 60;
      subNotes.push(`Prohibited placeholder pattern in question: "${questionBanned.matchedPhrase}".`);
      rejectionReasons.push(`PLACEHOLDER_ARTIFACT: "${questionBanned.matchedPhrase}" in question`);
    }

    const hintOrExp = (sanitized.hint || sanitized.explanation || '').trim();
    const expBanned = isBannedPlaceholderText(hintOrExp);
    if (expBanned.isBanned) {
      subPassed = false;
      subScore -= 40;
      subNotes.push(`Prohibited placeholder pattern in explanation: "${expBanned.matchedPhrase}".`);
      rejectionReasons.push(`PLACEHOLDER_ARTIFACT: "${expBanned.matchedPhrase}" in explanation`);
    }

    const substantiveResult: LayerValidationResult = {
      passed: subPassed,
      score: Math.max(0, subScore),
      notes: subNotes.length > 0 ? subNotes : ['Passed anti-placeholder and substantive authenticity gate.'],
    };

    // ----------------------------------------------------
    // LAYER 4: Question Type Options & Answer Relationship Gate
    // ----------------------------------------------------
    let optionsResult: LayerValidationResult;
    const qTypeStr = String(sanitized.questionType || context.questionType || '').toLowerCase();
    const isTrueFalse = qTypeStr.includes('true') || qTypeStr.includes('false');
    const isNonMCQ = !isTrueFalse && (
      qTypeStr.includes('fill') ||
      qTypeStr.includes('match') ||
      qTypeStr.includes('one word') ||
      qTypeStr.includes('short') ||
      qTypeStr.includes('long') ||
      qTypeStr.includes('essay') ||
      qTypeStr.includes('descriptive')
    );

    if (isNonMCQ) {
      optionsResult = {
        passed: true,
        score: 100,
        notes: [`${sanitized.questionType || 'Subjective/Textual'} question format verified - options check bypassed.`],
      };
    } else if (isTrueFalse || sanitized.options || sanitized.optionA || sanitized.option_a || qTypeStr.includes('mcq')) {
      const opts = sanitized.options || {
        A: sanitized.optionA || sanitized.option_a || (isTrueFalse ? 'True' : ''),
        B: sanitized.optionB || sanitized.option_b || (isTrueFalse ? 'False' : ''),
        C: sanitized.optionC || sanitized.option_c || '',
        D: sanitized.optionD || sanitized.option_d || '',
      };
      const optCheck = validateMCQOptionsAndAnswer(
        opts,
        sanitized.correctAnswer || sanitized.answer || 'A',
        hintOrExp,
        sanitized.questionType || (isTrueFalse ? 'True/False' : 'MCQ')
      );
      if (!optCheck.passed) {
        rejectionReasons.push(...optCheck.details);
      }
      optionsResult = {
        passed: optCheck.passed,
        score: optCheck.score,
        notes: optCheck.details,
      };
    } else {
      optionsResult = {
        passed: true,
        score: 100,
        notes: ['Question format does not require option validation.'],
      };
    }

    // ----------------------------------------------------
    // LAYER 5: Scientific & Mathematical Formula Integrity
    // ----------------------------------------------------
    const formulaVal = validateScientificContent(qText);
    const formulaNotes: string[] = [...formulaVal.issues];
    let formulaScore = 100;
    if (!formulaVal.valid) {
      formulaScore -= formulaVal.issues.length * 25;
      rejectionReasons.push(...formulaVal.issues);
    }

    const scientificResult: LayerValidationResult = {
      passed: formulaVal.valid,
      score: Math.max(0, formulaScore),
      notes: formulaNotes.length > 0 ? formulaNotes : ['Passed mathematical & scientific LaTeX validation.'],
    };

    // ----------------------------------------------------
    // LAYER 6: Semantic Duplicate & Repetition Check
    // ----------------------------------------------------
    let duplicatePassed = true;
    let duplicateScore = 100;
    const dupNotes: string[] = [];

    if (Array.isArray(context.existingBank) && context.existingBank.length > 0) {
      let maxSim = 0;
      let matchedId: string | undefined;

      for (const item of context.existingBank) {
        if (!item) continue;
        if (item.id && sanitized.id && item.id === sanitized.id) continue;
        const itemText = item.question || item.text || '';
        const sim = calculateTextSimilarity(qText, itemText);
        if (sim > maxSim) {
          maxSim = sim;
          matchedId = item.id;
        }
      }

      if (maxSim >= 75) {
        duplicatePassed = false;
        duplicateScore = Math.max(0, 100 - maxSim);
        dupNotes.push(`High semantic similarity (${maxSim}%) with existing question ${matchedId || ''}.`);
        rejectionReasons.push(`DUPLICATE: ${maxSim}% similarity with bank item`);
      }
    }

    const duplicateResult: LayerValidationResult = {
      passed: duplicatePassed,
      score: duplicateScore,
      notes: dupNotes.length > 0 ? dupNotes : ['Passed duplicate & repetition check.'],
    };

    // ----------------------------------------------------
    // FINAL QUALITY GATE CALCULATION
    // ----------------------------------------------------
    const overallScore = Math.round(
      structureResult.score * 0.20 +
      subjectClassResult.score * 0.20 +
      substantiveResult.score * 0.25 +
      optionsResult.score * 0.15 +
      scientificResult.score * 0.10 +
      duplicateResult.score * 0.10
    );

    const allPassed =
      structureResult.passed &&
      subjectClassResult.passed &&
      substantiveResult.passed &&
      optionsResult.passed &&
      scientificResult.passed &&
      duplicateResult.passed &&
      overallScore >= minThreshold;

    const status: IntegrityStatus = allPassed ? 'VERIFIED' : 'REJECTED';

    // Assign verified quality metadata to the sanitized item
    sanitized.qualityScore = overallScore;
    sanitized.verified = allPassed;
    sanitized.verificationStatus = status;
    sanitized.fingerprint = generateQuestionFingerprint(sanitized);
    sanitized.validationNotes = [
      ...structureResult.notes,
      ...subjectClassResult.notes,
      ...substantiveResult.notes,
      ...optionsResult.notes,
      ...scientificResult.notes,
    ];

    return {
      passed: allPassed,
      overallScore,
      status,
      sanitizedItem: sanitized,
      rejectionReasons,
      layerResults: {
        structure: structureResult,
        subjectClassMatch: subjectClassResult,
        substantiveContent: substantiveResult,
        optionsAndAnswer: optionsResult,
        scientificFormula: scientificResult,
        duplicateCheck: duplicateResult,
      },
      fingerprint: sanitized.fingerprint,
    };
  }

  /**
   * Validates and verifies an entire batch of generated questions.
   * Filters out rejected items, rebalances answer distributions if biased,
   * and provides comprehensive diagnostics.
   */
  public static validateBatch(
    rawBatch: any[],
    context: {
      subject?: string;
      classLevel?: string;
      minQualityScore?: number;
      existingBank?: any[];
      autoRebalanceAnswers?: boolean;
    } = {}
  ): BatchIntegrityResult {
    if (!Array.isArray(rawBatch) || rawBatch.length === 0) {
      return {
        totalProcessed: 0,
        verifiedCount: 0,
        rejectedCount: 0,
        answerDistribution: { A: 0, B: 0, C: 0, D: 0 },
        isAnswerBiased: false,
        verifiedItems: [],
        rejectedItems: [],
        averageQualityScore: 0,
        diagnosticSummary: 'Empty question batch provided.',
      };
    }

    const verifiedItems: any[] = [];
    const rejectedItems: Array<{ item: any; reasons: string[] }> = [];
    const currentBank = [...(context.existingBank || [])];

    for (let i = 0; i < rawBatch.length; i++) {
      const raw = rawBatch[i];
      const result = this.validateQuestion(raw, {
        ...context,
        existingBank: currentBank,
      });

      if (result.passed) {
        verifiedItems.push(result.sanitizedItem);
        currentBank.push(result.sanitizedItem);
      } else {
        rejectedItems.push({
          item: raw,
          reasons: result.rejectionReasons,
        });
      }
    }

    // Check answer distribution bias
    const biasCheck = checkAnswerDistributionBias(verifiedItems);
    let finalVerified = verifiedItems;

    // If answer distribution is heavily biased (e.g. 90% 'A') and autoRebalance is enabled,
    // safely redistribute answer keys so options A, B, C, D are balanced
    if (biasCheck.isBiased && context.autoRebalanceAnswers !== false && finalVerified.length >= 4) {
      const targetKeys: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D'];
      finalVerified = finalVerified.map((item, idx) => {
        const target = targetKeys[idx % 4];
        return shuffleMCQOptions(item, target);
      });
    }

    const avgScore = finalVerified.length > 0
      ? Math.round(finalVerified.reduce((sum, item) => sum + (item.qualityScore || 90), 0) / finalVerified.length)
      : 0;

    const postBiasCheck = checkAnswerDistributionBias(finalVerified);

    const summary = `Processed ${rawBatch.length} items: ${finalVerified.length} Verified, ${rejectedItems.length} Rejected. Avg Quality: ${avgScore}/100. Answer Dist: A:${postBiasCheck.distribution.A || 0}, B:${postBiasCheck.distribution.B || 0}, C:${postBiasCheck.distribution.C || 0}, D:${postBiasCheck.distribution.D || 0}.`;

    return {
      totalProcessed: rawBatch.length,
      verifiedCount: finalVerified.length,
      rejectedCount: rejectedItems.length,
      answerDistribution: postBiasCheck.distribution,
      isAnswerBiased: postBiasCheck.isBiased,
      verifiedItems: finalVerified,
      rejectedItems,
      averageQualityScore: avgScore,
      diagnosticSummary: summary,
    };
  }
}
