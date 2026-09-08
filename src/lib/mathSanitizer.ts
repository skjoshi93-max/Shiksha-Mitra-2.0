/**
 * Comprehensive Math, Physics, and Chemistry Formula & LaTeX Sanitization Engine
 * Re-exports from centralized ScientificContentIntegrityService.
 */

export * from './scientificIntegrityService';
import { normalizeScientificContent } from './scientificIntegrityService';

// Backwards-compatible alias for existing components
export const sanitizeMathAndChemistryText = normalizeScientificContent;
