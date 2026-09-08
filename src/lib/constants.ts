import { Question, SettingsState, GeneratorConfig, ShikshaMitraTemplate } from '../types';

export const DEFAULT_CATEGORIES = [
  'Subject Knowledge',
  'Pedagogy',
  'Behavioral',
  'Classroom Management',
  'Soft Skill',
  'Case Study',
];

export const DEFAULT_SUBJECTS = [
  'General Teaching',
  'Mathematics',
  'Science',
  'Hindi',
  'English',
  'Social Science',
  'Computer',
  'General Knowledge',
];

export const DEFAULT_QUESTION_TYPES = [
  'Conceptual',
  'Practical',
  'Scenario Based',
  'Classroom Situation',
  'Case Study',
  'Problem Solving',
  'Behavioral',
  'Pedagogical',
  'Subject Knowledge',
  'Classroom Management',
  'Student Psychology',
  'Communication',
  'Leadership',
  'Inclusive Education',
  'Assessment',
  'Teaching Methodology',
];

export const DEFAULT_SHIKSHAMITRA_TEMPLATE: ShikshaMitraTemplate = {
  id: 'shikshamitra-standard-v1',
  name: 'ShikshaMitra Standard Portal Format',
  fields: [
    { sourceKey: 'id', targetColumnName: 'Question ID', order: 1, required: true },
    { sourceKey: 'question', targetColumnName: 'Question Text', order: 2, required: true },
    { sourceKey: 'category', targetColumnName: 'Category', order: 3, required: true },
    { sourceKey: 'difficulty', targetColumnName: 'Difficulty Level', order: 4, required: true },
    { sourceKey: 'subject', targetColumnName: 'Subject', order: 5, required: true },
    { sourceKey: 'questionType', targetColumnName: 'Question Type', order: 6 },
    { sourceKey: 'timeLimit', targetColumnName: 'Time Limit (Sec)', order: 7 },
    { sourceKey: 'maxScore', targetColumnName: 'Max Score', order: 8 },
    { sourceKey: 'tags', targetColumnName: 'Tags', order: 9 },
    { sourceKey: 'hint', targetColumnName: 'Hint / Guidance', order: 10 },
    { sourceKey: 'active', targetColumnName: 'Active Flag', order: 11, transform: 'boolean_yes_no' },
    { sourceKey: 'createdDate', targetColumnName: 'Created Date', order: 12, transform: 'date_iso' },
  ],
  categoryMappings: {
    'Subject Knowledge': 'SUBJECT_KNOWLEDGE',
    'Pedagogy': 'PEDAGOGY',
    'Behavioral': 'BEHAVIORAL',
    'Classroom Management': 'CLASSROOM_MGMT',
    'Soft Skill': 'SOFT_SKILLS',
    'Case Study': 'CASE_STUDY',
  },
  difficultyMappings: {
    'Easy': 'EASY',
    'Medium': 'MEDIUM',
    'Hard': 'HARD',
  },
};

export const DEFAULT_SETTINGS: SettingsState = {
  bankName: 'Shiksha Mitra 2.0',
  defaultLanguage: 'English',
  defaultTimeLimit: 120,
  defaultMaxScore: 10,
  categories: DEFAULT_CATEGORIES,
  subjects: DEFAULT_SUBJECTS,
  questionTypes: DEFAULT_QUESTION_TYPES,
  difficultyDistribution: { Easy: 30, Medium: 50, Hard: 20 },
  qualityThreshold: 85,
  duplicateSensitivity: 75,
  templates: [DEFAULT_SHIKSHAMITRA_TEMPLATE],
  theme: 'light',
};

export const DEFAULT_GENERATOR_CONFIG: GeneratorConfig = {
  totalQuestions: 50,
  language: 'English',
  categories: DEFAULT_CATEGORIES,
  categoryDistribution: {
    'Subject Knowledge': 20,
    'Pedagogy': 20,
    'Behavioral': 15,
    'Classroom Management': 15,
    'Soft Skill': 15,
    'Case Study': 15,
  },
  difficultyDistribution: {
    Easy: 30,
    Medium: 50,
    Hard: 20,
  },
  subjects: ['General Teaching', 'Mathematics', 'Science', 'English'],
  questionTypes: DEFAULT_QUESTION_TYPES,
  defaultTimeLimit: 120,
  defaultMaxScore: 10,
  smartScoring: true,
  qualityThreshold: 85,
  duplicateSensitivity: 75,
};

export const DEMO_QUESTIONS: Question[] = [];
