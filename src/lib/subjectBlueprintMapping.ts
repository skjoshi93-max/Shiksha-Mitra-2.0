/**
 * CBSE Class 6-12 Subject-Aware Blueprint Mapping
 * 
 * Standard and valid question type mappings based on authentic CBSE examination
 * blueprints (Classes 6 through 12).
 */

export type CbseSubjectCategoryKey = 
  | 'SCIENCE'
  | 'MATHEMATICS'
  | 'LANGUAGES'
  | 'SOCIAL_SCIENCE'
  | 'COMMERCE_CS'
  | 'GENERAL';

export interface CbseSubjectBlueprint {
  key: CbseSubjectCategoryKey;
  label: string;
  categoryTitle: string;
  subTitle: string;
  badgeColor: {
    bg: string;
    text: string;
    border: string;
    accent: string;
    darkBg: string;
    darkText: string;
    darkBorder: string;
  };
  sampleSubjects: string[];
  questionTypes: string[];
  description: string;
  examContext: string;
}

/**
 * 1. SCIENCE (Physics, Chemistry, Biology, General Science, EVS)
 * Auto-select:
 * - Multiple Choice (MCQ)
 * - Short Answer Questions (SAQ)
 * - Long Answer Questions (LAQ)
 * - Fill in the Blanks
 * - True / False
 * - One Word / Very Short Answer
 * - Assertion & Reason
 * - Case-Based / Passage-Based Questions
 * - Diagram / Graphical-Based Questions
 */
export const SCIENCE_QUESTION_TYPES: readonly string[] = [
  'Multiple Choice (MCQ)',
  'Short Answer Questions (SAQ)',
  'Long Answer Questions (LAQ)',
  'Fill in the Blanks',
  'True / False',
  'One Word / Very Short Answer',
  'Assertion & Reason',
  'Case-Based / Passage-Based Questions',
  'Diagram / Graphical-Based Questions',
] as const;

/**
 * 2. MATHEMATICS (Math, Applied Math, Numerical Reasoning)
 * Auto-select:
 * - Multiple Choice (MCQ)
 * - Short Answer Questions (SAQ)
 * - Long Answer Questions (LAQ)
 * - Fill in the Blanks
 * - One Word / Very Short Answer
 * - Solve the Following (Math/Numerical special)
 * - Case-Based / Passage-Based Questions
 * - Diagram / Graphical-Based Questions
 */
export const MATHEMATICS_QUESTION_TYPES: readonly string[] = [
  'Multiple Choice (MCQ)',
  'Short Answer Questions (SAQ)',
  'Long Answer Questions (LAQ)',
  'Fill in the Blanks',
  'One Word / Very Short Answer',
  'Solve the Following (Math/Numerical special)',
  'Case-Based / Passage-Based Questions',
  'Diagram / Graphical-Based Questions',
] as const;

/**
 * 3. ENGLISH & LANGUAGES (Hindi, Sanskrit, Regional Languages, Foreign Languages)
 * Auto-select:
 * - Multiple Choice (MCQ)
 * - Short Answer Questions (SAQ)
 * - Long Answer Questions (LAQ)
 * - Fill in the Blanks
 * - One Word / Very Short Answer
 * - Match the Following
 * - Case-Based / Passage-Based Questions
 * - Grammar & Comprehension
 */
export const LANGUAGES_QUESTION_TYPES: readonly string[] = [
  'Multiple Choice (MCQ)',
  'Short Answer Questions (SAQ)',
  'Long Answer Questions (LAQ)',
  'Fill in the Blanks',
  'One Word / Very Short Answer',
  'Match the Following',
  'Case-Based / Passage-Based Questions',
  'Grammar & Comprehension',
] as const;

/**
 * 4. SOCIAL SCIENCE & HUMANITIES (History, Civics, Geography, Economics, Sociology, Political Science)
 * Auto-select:
 * - Multiple Choice (MCQ)
 * - Short Answer Questions (SAQ)
 * - Long Answer Questions (LAQ)
 * - Fill in the Blanks
 * - True / False
 * - One Word / Very Short Answer
 * - Match the Following
 * - Assertion & Reason
 * - Case-Based / Passage-Based Questions
 * - Diagram / Graphical-Based Questions (for Maps/Graphs)
 */
export const SOCIAL_SCIENCE_QUESTION_TYPES: readonly string[] = [
  'Multiple Choice (MCQ)',
  'Short Answer Questions (SAQ)',
  'Long Answer Questions (LAQ)',
  'Fill in the Blanks',
  'True / False',
  'One Word / Very Short Answer',
  'Match the Following',
  'Assertion & Reason',
  'Case-Based / Passage-Based Questions',
  'Diagram / Graphical-Based Questions',
] as const;

/**
 * 5. COMMERCE & COMPUTER SCIENCE (Accountancy, Business Studies, IP, CS, IT, AI)
 * Auto-select:
 * - Multiple Choice (MCQ)
 * - Short Answer Questions (SAQ)
 * - Long Answer Questions (LAQ)
 * - Fill in the Blanks
 * - True / False
 * - One Word / Very Short Answer
 * - Solve the Following (Math/Numerical special) (for Accounts/Coding)
 * - Assertion & Reason
 * - Case-Based / Passage-Based Questions
 */
export const COMMERCE_CS_QUESTION_TYPES: readonly string[] = [
  'Multiple Choice (MCQ)',
  'Short Answer Questions (SAQ)',
  'Long Answer Questions (LAQ)',
  'Fill in the Blanks',
  'True / False',
  'One Word / Very Short Answer',
  'Solve the Following (Math/Numerical special)',
  'Assertion & Reason',
  'Case-Based / Passage-Based Questions',
] as const;

/**
 * Comprehensive CBSE Blueprint Metadata Matrix
 */
export const CBSE_BLUEPRINT_REGISTRY: Record<CbseSubjectCategoryKey, CbseSubjectBlueprint> = {
  SCIENCE: {
    key: 'SCIENCE',
    label: 'Science (PCB & General Science)',
    categoryTitle: 'CBSE Science Blueprint',
    subTitle: 'Physics, Chemistry, Biology & General Science (Class 6-12)',
    badgeColor: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-200',
      accent: 'emerald-500',
      darkBg: 'dark:bg-emerald-950/60',
      darkText: 'dark:text-emerald-300',
      darkBorder: 'dark:border-emerald-800',
    },
    sampleSubjects: ['Science', 'Physics', 'Chemistry', 'Biology', 'General Science', 'EVS', 'Environmental Studies', 'Biotechnology'],
    questionTypes: [...SCIENCE_QUESTION_TYPES],
    description: 'Auto-selects 9 question types covering experimental inquiry, conceptual definitions, scientific reasoning (Assertion & Reason), diagrams/apparatus, and case studies.',
    examContext: 'Aligned with CBSE Class 6-10 General Science & Class 11-12 Physics, Chemistry & Biology exam patterns.',
  },
  MATHEMATICS: {
    key: 'MATHEMATICS',
    label: 'Mathematics & Numeracy',
    categoryTitle: 'CBSE Mathematics Blueprint',
    subTitle: 'Mathematics & Applied Mathematics (Class 6-12)',
    badgeColor: {
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      border: 'border-blue-200',
      accent: 'blue-500',
      darkBg: 'dark:bg-blue-950/60',
      darkText: 'dark:text-blue-300',
      darkBorder: 'dark:border-blue-800',
    },
    sampleSubjects: ['Mathematics', 'Applied Mathematics', 'Ganit Prakash', 'Maths', 'Vedic Math', 'Quantitative Aptitude'],
    questionTypes: [...MATHEMATICS_QUESTION_TYPES],
    description: 'Auto-selects 8 question types emphasizing step-by-step problem solving, numerical methods, geometric proofs, graphical interpretations, and case scenarios.',
    examContext: 'Aligned with CBSE Ganita Prakash (Class 6), Secondary Maths (9-10), and Senior Secondary (11-12) standards.',
  },
  LANGUAGES: {
    key: 'LANGUAGES',
    label: 'English & Languages',
    categoryTitle: 'CBSE Languages Blueprint',
    subTitle: 'English, Hindi, Sanskrit & Regional Languages (Class 6-12)',
    badgeColor: {
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      border: 'border-amber-200',
      accent: 'amber-500',
      darkBg: 'dark:bg-amber-950/60',
      darkText: 'dark:text-amber-300',
      darkBorder: 'dark:border-amber-800',
    },
    sampleSubjects: ['English', 'Hindi', 'Sanskrit', 'Poorvi', 'Honeysuckle', 'Beehive', 'Sparsh', 'Kshitij', 'French', 'German', 'Regional Languages'],
    questionTypes: [...LANGUAGES_QUESTION_TYPES],
    description: 'Auto-selects 8 question types focusing on reading comprehension, grammar mechanics, literary analysis, vocabulary matching, and contextual prose.',
    examContext: 'Aligned with CBSE Class 6-12 Language & Literature, Communicative English, and Core Hindi/Sanskrit curriculum.',
  },
  SOCIAL_SCIENCE: {
    key: 'SOCIAL_SCIENCE',
    label: 'Social Science & Humanities',
    categoryTitle: 'CBSE Social Science Blueprint',
    subTitle: 'History, Geography, Civics, Economics & Sociology (Class 6-12)',
    badgeColor: {
      bg: 'bg-orange-50',
      text: 'text-orange-700',
      border: 'border-orange-200',
      accent: 'orange-500',
      darkBg: 'dark:bg-orange-950/60',
      darkText: 'dark:text-orange-300',
      darkBorder: 'dark:border-orange-800',
    },
    sampleSubjects: ['Social Science', 'History', 'Civics', 'Geography', 'Economics', 'Political Science', 'Sociology', 'Psychology', 'Social Studies', 'Our Pasts', 'Contemporary India', 'Democratic Politics'],
    questionTypes: [...SOCIAL_SCIENCE_QUESTION_TYPES],
    description: 'Auto-selects 10 question types encompassing source-based inquiries, map/graphical items, chronological matching, socio-economic case passages, and critical reasoning.',
    examContext: 'Aligned with CBSE Class 6-10 Social Science and Class 11-12 Humanities/Arts exam patterns.',
  },
  COMMERCE_CS: {
    key: 'COMMERCE_CS',
    label: 'Commerce & Computer Science',
    categoryTitle: 'CBSE Commerce & CS Blueprint',
    subTitle: 'Accountancy, Business Studies, CS, IP & Information Tech (Class 6-12)',
    badgeColor: {
      bg: 'bg-purple-50',
      text: 'text-purple-700',
      border: 'border-purple-200',
      accent: 'purple-500',
      darkBg: 'dark:bg-purple-950/60',
      darkText: 'dark:text-purple-300',
      darkBorder: 'dark:border-purple-800',
    },
    sampleSubjects: ['Accountancy', 'Business Studies', 'Computer Science', 'Information Technology', 'Informatics Practices', 'Artificial Intelligence', 'Coding', 'Commerce', 'Entrepreneurship', 'IP', 'CS'],
    questionTypes: [...COMMERCE_CS_QUESTION_TYPES],
    description: 'Auto-selects 9 question types designed for computational problem solving, ledger/financial calculations, case study analysis, and algorithmic reasoning.',
    examContext: 'Aligned with CBSE Senior Secondary Commerce stream and IT/CS vocational skill subjects.',
  },
  GENERAL: {
    key: 'GENERAL',
    label: 'General & Comprehensive',
    categoryTitle: 'CBSE Standard Blueprint',
    subTitle: 'Interdisciplinary & General Assessments',
    badgeColor: {
      bg: 'bg-indigo-50',
      text: 'text-indigo-700',
      border: 'border-indigo-200',
      accent: 'indigo-500',
      darkBg: 'dark:bg-indigo-950/60',
      darkText: 'dark:text-indigo-300',
      darkBorder: 'dark:border-indigo-800',
    },
    sampleSubjects: ['General Teaching', 'General Knowledge', 'Pedagogy', 'Interdisciplinary'],
    questionTypes: [
      'Multiple Choice (MCQ)',
      'Short Answer Questions (SAQ)',
      'Long Answer Questions (LAQ)',
      'Fill in the Blanks',
      'True / False',
      'One Word / Very Short Answer',
      'Match the Following',
      'Assertion & Reason',
      'Case-Based / Passage-Based Questions',
    ],
    description: 'Auto-selects standard foundational question types appropriate for multi-disciplinary or general evaluations.',
    examContext: 'Balanced assessment blueprint for general subjects.',
  },
};

/**
 * Robust Subject Classifier
 * Determines the CBSE blueprint category based on subject name and book title.
 */
export function detectSubjectCategory(subject: string = '', bookTitle: string = ''): CbseSubjectBlueprint {
  const combined = `${subject} ${bookTitle}`.toLowerCase();

  // 1. MATHEMATICS
  if (
    combined.includes('math') ||
    combined.includes('ganit') ||
    combined.includes('algebra') ||
    combined.includes('geometry') ||
    combined.includes('calculus') ||
    combined.includes('trigonometry') ||
    combined.includes('arithmetic') ||
    combined.includes('numerical') ||
    combined.includes('statistics')
  ) {
    return CBSE_BLUEPRINT_REGISTRY.MATHEMATICS;
  }

  // 2. COMMERCE & COMPUTER SCIENCE (Must check before general science/languages)
  if (
    combined.includes('account') ||
    combined.includes('business') ||
    combined.includes('b.st') ||
    combined.includes('bst') ||
    combined.includes('computer') ||
    combined.includes('informatics') ||
    combined.includes('information tech') ||
    combined.includes('coding') ||
    combined.includes('artificial intell') ||
    combined.includes('cyber') ||
    combined.includes('entrepreneur') ||
    combined.includes('commerce') ||
    combined.includes('cs') ||
    combined.includes('ip') ||
    /\bit\b/.test(combined)
  ) {
    return CBSE_BLUEPRINT_REGISTRY.COMMERCE_CS;
  }

  // 3. ENGLISH & LANGUAGES
  if (
    combined.includes('english') ||
    combined.includes('hindi') ||
    combined.includes('sanskrit') ||
    combined.includes('poorvi') ||
    combined.includes('honeysuckle') ||
    combined.includes('honeycomb') ||
    combined.includes('beehive') ||
    combined.includes('sparsh') ||
    combined.includes('kshitij') ||
    combined.includes('kritika') ||
    combined.includes('sanchayan') ||
    combined.includes('marathi') ||
    combined.includes('tamil') ||
    combined.includes('telugu') ||
    combined.includes('kannada') ||
    combined.includes('gujarati') ||
    combined.includes('bengali') ||
    combined.includes('punjabi') ||
    combined.includes('urdu') ||
    combined.includes('french') ||
    combined.includes('german') ||
    combined.includes('spanish') ||
    combined.includes('grammar') ||
    combined.includes('literature') ||
    combined.includes('language')
  ) {
    return CBSE_BLUEPRINT_REGISTRY.LANGUAGES;
  }

  // 4. SOCIAL SCIENCE & HUMANITIES (Must check before science to avoid 'Social Science' matching 'Science')
  if (
    combined.includes('social') ||
    combined.includes('history') ||
    combined.includes('civic') ||
    combined.includes('geograph') ||
    combined.includes('econom') ||
    combined.includes('politic') ||
    combined.includes('sociolog') ||
    combined.includes('psycholog') ||
    combined.includes('sst') ||
    combined.includes('our past') ||
    combined.includes('democratic') ||
    combined.includes('contemporary india') ||
    combined.includes('bharat') ||
    combined.includes('humanities')
  ) {
    return CBSE_BLUEPRINT_REGISTRY.SOCIAL_SCIENCE;
  }

  // 5. SCIENCE (Physics, Chemistry, Biology, General Science, EVS)
  if (
    combined.includes('physic') ||
    combined.includes('chemist') ||
    combined.includes('biolog') ||
    combined.includes('science') ||
    combined.includes('evs') ||
    combined.includes('environment') ||
    combined.includes('botany') ||
    combined.includes('zoology') ||
    combined.includes('biotech') ||
    combined.includes('curiosity') ||
    combined.includes('vigyan')
  ) {
    return CBSE_BLUEPRINT_REGISTRY.SCIENCE;
  }

  // Fallback
  return CBSE_BLUEPRINT_REGISTRY.GENERAL;
}

/**
 * Returns the exact auto-selected question types array for a given subject & book.
 */
export function getBlueprintQuestionTypesForSubject(subject: string = '', bookTitle: string = ''): string[] {
  const blueprint = detectSubjectCategory(subject, bookTitle);
  return [...blueprint.questionTypes];
}

/**
 * List of all 5 CBSE Blueprints + General for quick switching and selector chips
 */
export const ALL_CBSE_BLUEPRINTS: CbseSubjectBlueprint[] = [
  CBSE_BLUEPRINT_REGISTRY.SCIENCE,
  CBSE_BLUEPRINT_REGISTRY.MATHEMATICS,
  CBSE_BLUEPRINT_REGISTRY.LANGUAGES,
  CBSE_BLUEPRINT_REGISTRY.SOCIAL_SCIENCE,
  CBSE_BLUEPRINT_REGISTRY.COMMERCE_CS,
];
