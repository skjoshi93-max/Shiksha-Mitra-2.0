/**
 * NCERT Curriculum Structure & Local Storage Schema
 * 
 * Defines standard Class 6 to 12 curriculum mapping with subjects
 * and high-performance path resolver for local book directory storage.
 */

export const NCERT_CLASSES = [
  'Class 6',
  'Class 7',
  'Class 8',
  'Class 9',
  'Class 10',
  'Class 11',
  'Class 12',
] as const;

export type NcertClassLevel = typeof NCERT_CLASSES[number];

export const SUBJECTS_BY_CLASS: Record<string, string[]> = {
  'Class 6': [
    'Mathematics',
    'Science',
    'Social Science',
    'English',
    'Hindi',
    'Sanskrit',
  ],
  'Class 7': [
    'Mathematics',
    'Science',
    'Social Science',
    'English',
    'Hindi',
    'Sanskrit',
  ],
  'Class 8': [
    'Mathematics',
    'Science',
    'Social Science',
    'English',
    'Hindi',
    'Sanskrit',
  ],
  'Class 9': [
    'Mathematics',
    'Science',
    'Social Science',
    'English',
    'Hindi',
    'Sanskrit',
    'Information Technology',
  ],
  'Class 10': [
    'Mathematics',
    'Science',
    'Social Science',
    'English',
    'Hindi',
    'Sanskrit',
    'Information Technology',
  ],
  'Class 11': [
    'Physics',
    'Chemistry',
    'Mathematics',
    'Biology',
    'English',
    'Hindi',
    'Computer Science',
    'Economics',
    'Accountancy',
    'Business Studies',
    'History',
    'Political Science',
    'Geography',
  ],
  'Class 12': [
    'Physics',
    'Chemistry',
    'Mathematics',
    'Biology',
    'English',
    'Hindi',
    'Computer Science',
    'Economics',
    'Accountancy',
    'Business Studies',
    'History',
    'Political Science',
    'Geography',
  ],
};

/**
 * Get available subjects for a selected class (guaranteed minimum 6 subjects)
 */
export function getSubjectsForClass(classLevel: string): string[] {
  const normalized = classLevel.trim();
  if (SUBJECTS_BY_CLASS[normalized]) {
    return SUBJECTS_BY_CLASS[normalized];
  }
  // Default fallback for any class
  return [
    'Mathematics',
    'Science',
    'Social Science',
    'English',
    'Hindi',
    'Sanskrit',
  ];
}

/**
 * Sanitize folder component for structured local storage
 * e.g. "Class 6" -> "Class_6", "Class 10" -> "Class_10"
 */
export function sanitizeClassFolder(classLevel: string): string {
  const match = (classLevel || '').match(/\d+/);
  if (match) {
    return `Class_${match[0]}`;
  }
  return (classLevel || 'Class_6').trim().replace(/\s+/g, '_');
}

/**
 * Sanitize subject folder component
 * e.g. "Social Science" -> "Social_Science", "Computer Science" -> "Computer_Science"
 */
export function sanitizeSubjectFolder(subject: string): string {
  return (subject || 'General')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_-]/g, '');
}

/**
 * Generates the clean standard storage path string:
 * e.g. "/stored_books/Class_6/Mathematics/Chapter_01.pdf"
 */
export function buildStoredBookPath(classLevel: string, subject: string, fileName: string): string {
  const classFolder = sanitizeClassFolder(classLevel);
  const subFolder = sanitizeSubjectFolder(subject);
  const cleanFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `/stored_books/${classFolder}/${subFolder}/${cleanFileName}`;
}
