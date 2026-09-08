import { NcertBook } from '../types';
import { CLASS_6_POORVI_BOOK } from './verifiedSolutionsData';

export const STANDARD_NCERT_CLASSES: string[] = [
  'Class 6',
  'Class 7',
  'Class 8',
  'Class 9',
  'Class 10',
  'Class 11',
  'Class 12',
];

export const STANDARD_NCERT_SUBJECTS: string[] = [
  'English',
  'Mathematics',
  'Science',
  'Social Science',
  'Hindi',
  'Sanskrit',
];

// Verified Official NCERT Textbooks with authentic Tiwari Academy curriculum structure
export const ALL_DEFAULT_NCERT_BOOKS: NcertBook[] = [
  CLASS_6_POORVI_BOOK,
];
export const DEFAULT_NCERT_BOOKS: NcertBook[] = [
  CLASS_6_POORVI_BOOK,
];
export const DEFAULT_DEMO_PDFS: Record<string, string> = {};

