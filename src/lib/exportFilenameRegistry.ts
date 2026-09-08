// Centralized Registry for Locked Export Filenames
// Hard-coded final locked filenames per module

export type CentralModuleKey = 'interview_bank' | 'ncert_pdf' | 'skill_assessment';

export const LOCKED_BASE_FILENAMES: Record<CentralModuleKey, string> = {
  interview_bank: 'interview_questions_sample',
  ncert_pdf: 'master_question_bank_template',
  skill_assessment: 'assessment_questions_template',
};

export const LOCKED_XLSX_FILENAMES: Record<CentralModuleKey, string> = {
  interview_bank: 'interview_questions_sample.xlsx',
  ncert_pdf: 'master_question_bank_template.xlsx',
  skill_assessment: 'assessment_questions_template.xlsx',
};

// Kept for backwards compatibility
export const LOCKED_CSV_FILENAMES: Record<CentralModuleKey, string> = LOCKED_XLSX_FILENAMES;

/**
 * Returns the exact locked filename for a module and file extension.
 * Ensures no random timestamps, UUIDs, or dynamic strings alter the filename.
 * Supports assessment-wise slug resolution cleanly via the centralized registry.
 */
export function getLockedExportFilename(
  moduleKey: CentralModuleKey | string,
  extension: string = 'xlsx',
  slug?: string
): string {
  const ext = extension.startsWith('.') ? extension : `.${extension}`;

  if (slug && slug.trim()) {
    return `${slug.trim()}${ext}`;
  }

  const key = String(moduleKey).toLowerCase();

  if (key.includes('interview')) {
    return `${LOCKED_BASE_FILENAMES.interview_bank}${ext}`;
  }
  if (key.includes('ncert')) {
    return `${LOCKED_BASE_FILENAMES.ncert_pdf}${ext}`;
  }
  if (key.includes('assessment') || key.includes('skill')) {
    return `${LOCKED_BASE_FILENAMES.skill_assessment}${ext}`;
  }

  // Fallback default
  return `${LOCKED_BASE_FILENAMES.skill_assessment}${ext}`;
}
