/**
 * Scientific Content Integrity Service
 * 
 * Centralized, permanent application-level architecture engine that enforces
 * scientific-content integrity (Mathematics, Physics, Chemistry) across all Classes 1-12.
 * 
 * Features:
 * 1. Scientific & LaTeX Content Normalization
 * 2. Strict Syntactic & Semantic Validation (delimiters, braces, formulas)
 * 3. RFC 4180-Compliant CSV Serialization (preserving LaTeX verbatim, zero column splitting)
 * 4. RFC 4180-Compliant CSV Parsing (preserving LaTeX and multi-line formulas)
 * 5. Full Round-Trip Integrity Verification (Object -> CSV -> Object)
 * 6. Global Question & Assessment Sanitizers
 */

import { Question, Assessment, NcertQuestion, AssessmentQuestion } from '../types';

// Common chemical formulas and species dictionary
export const KNOWN_CHEMICAL_FORMULAS = [
  'H2O', 'CO2', 'H2SO4', 'CaCO3', 'NaCl', 'NaOH', 'HCl', 'HNO3',
  'CH4', 'C6H12O6', 'NH3', 'O2', 'N2', 'Cl2', 'H2', 'Fe2O3',
  'Al2O3', 'CuSO4', 'ZnSO4', 'MgSO4', 'KMnO4', 'Ca(OH)2', 'Mg(OH)2',
  'NaHCO3', 'Na2CO3', 'K2Cr2O7', 'Pb(NO3)2', 'BaSO4', 'AgCl', 'NaNO3',
  'FeSO4', 'KClO3', 'MnO2', 'H2O2', 'C2H5OH', 'CH3COOH', 'H3PO4',
  'NH4Cl', 'Cu(NO3)2', 'ZnCl2', 'AlCl3', 'FeCl3', 'FeCl2', 'SO2',
  'SO3', 'NO2', 'N2O', 'PCl5', 'PCl3', 'SF6', 'CO', 'CaO', 'MgO',
  'CuO', 'ZnO', 'PbO', 'AgNO3', 'BaCl2', 'FeS', 'H2S', 'PbI2', 'KNO3',
  'CaCl2', 'KCl', 'MgCl2', 'KI', 'NaBr', 'KBr', 'CaSO4', 'Na2SO4',
  'K2SO4', 'Cu(OH)2', 'Fe(OH)3', 'Al(OH)3', 'NH4OH', 'H2CO3', 'C2H4',
  'C2H2', 'C3H8', 'C4H10', 'C6H6', 'CH3OH', 'HCOOH', 'CH3COONa'
];

export const KNOWN_CHEMICAL_ELEMENTS = new Set([
  'H','He','Li','Be','B','C','N','O','F','Ne','Na','Mg','Al','Si','P','S','Cl','Ar',
  'K','Ca','Sc','Ti','V','Cr','Mn','Fe','Co','Ni','Cu','Zn','Ga','Ge','As','Se','Br','Kr',
  'Rb','Sr','Y','Zr','Nb','Mo','Tc','Ru','Rh','Pd','Ag','Cd','In','Sn','Sb','Te','I','Xe',
  'Cs','Ba','La','Ce','Pr','Nd','Pm','Sm','Eu','Gd','Tb','Dy','Ho','Er','Tm','Yb','Lu',
  'Hf','Ta','W','Re','Os','Ir','Pt','Au','Hg','Tl','Pb','Bi','Po','At','Rn','Fr','Ra','Ac',
  'Th','Pa','U','Np','Pu','Am','Cm','Bk','Cf','Es','Fm','Md','No','Lr'
]);

export const KNOWN_POLYATOMIC_BASES = new Set([
  'NH4', 'H3O', 'OH', 'NO3', 'NO2', 'HCO3', 'HSO4', 'HSO3', 'MnO4', 'ClO4', 'ClO3',
  'ClO2', 'ClO', 'CH3COO', 'SO4', 'SO3', 'CO3', 'CrO4', 'Cr2O7', 'HPO4', 'C2O4',
  'PO4', 'PO3', 'BO3', 'AsO4', 'N3', 'O2', 'S2', 'CN', 'SCN'
]);

/**
 * Normalizes backslash escapes (e.g. \\\\frac -> \frac, \\( -> $)
 */
export function cleanEscapedBackslashes(text: string): string {
  if (!text) return '';
  return text
    // Replace 4+ or 2 backslashes before LaTeX commands with a single backslash
    .replace(/\\\\+([a-zA-Z]+|[{}()_^\[\]|\\<>~])/g, '\\$1')
    // Standardize \( ... \) to $ ... $
    .replace(/\\\(([\s\S]*?)\\\)/g, '$$$1$$')
    // Standardize \[ ... \] to $$ ... $$
    .replace(/\\\[([\s\S]*?)\\\]/g, '$$$$$1$$$$')
    // Standardize \\$ to $
    .replace(/\\(\$)/g, '$1');
}

/**
 * Formats a raw chemical compound string into LaTeX with subscripts
 */
export function formatChemicalFormulaToLatex(formula: string): string {
  if (!formula) return '';
  let trimmed = formula.trim();

  // If already full LaTeX wrapped, return as is
  if (trimmed.startsWith('\\text{') || trimmed.includes('\\ce{')) {
    return trimmed;
  }

  // Handle parenthesized groups like Ca(OH)2 or (NH4)2SO4 or Pb(NO3)2
  trimmed = trimmed.replace(/\(([A-Za-z0-9]+)\)(\d*)/g, (_, inner, sub) => {
    const formattedInner = formatSimpleFormula(inner);
    return sub ? `(${formattedInner})_{${sub}}` : `(${formattedInner})`;
  });

  return formatSimpleFormula(trimmed);
}

function formatSimpleFormula(formula: string): string {
  return formula.replace(/([A-Z][a-z]?)(\d+)?/g, (_, elem, count) => {
    if (count) {
      return `\\text{${elem}}_{${count}}`;
    }
    return `\\text{${elem}}`;
  });
}

/**
 * Formats a chemical reaction equation into LaTeX
 */
export function formatChemicalReactionToLatex(reaction: string): string {
  if (!reaction) return '';
  let clean = reaction.trim();

  // Normalize reaction arrows
  clean = clean.replace(/\s*(=>|->|-->|→|⇌|⇄|\\rightarrow|\\rightleftharpoons)\s*/g, ' \\rightarrow ');

  // Handle gas / precipitate markers
  clean = clean.replace(/\s*\(s\)/gi, '\\text{ (s)}')
               .replace(/\s*\(l\)/gi, '\\text{ (l)}')
               .replace(/\s*\(g\)/gi, '\\text{ (g)}')
               .replace(/\s*\(aq\)/gi, '\\text{ (aq)}')
               .replace(/\s*(\^|↑|\\uparrow)/g, '\\uparrow')
               .replace(/\s*(v|↓|\\downarrow)/g, '\\downarrow');

  // Split into reactants and products
  const sides = clean.split('\\rightarrow');
  if (sides.length === 2) {
    const formatSide = (side: string) => {
      return side.split('+').map(term => {
        const trimmedTerm = term.trim();
        if (!trimmedTerm) return '';
        const coeffMatch = trimmedTerm.match(/^(\d+)?\s*([A-Za-z0-9()_{}\^\\]+)(.*)$/);
        if (coeffMatch) {
          const coeff = coeffMatch[1] ? `${coeffMatch[1]}` : '';
          const compound = coeffMatch[2];
          const rest = coeffMatch[3] || '';
          const formattedCompound = formatChemicalFormulaToLatex(compound);
          return `${coeff}${formattedCompound}${rest}`.trim();
        }
        return formatChemicalFormulaToLatex(trimmedTerm);
      }).join(' + ');
    };

    return `${formatSide(sides[0])} \\rightarrow ${formatSide(sides[1])}`;
  }

  return clean;
}

/**
 * Converts standard mathematical, physics, and scientific unicode symbols to LaTeX
 */
export function convertMathSymbolsToLatex(text: string): string {
  return text
    .replace(/±/g, '\\pm ')
    .replace(/×/g, '\\times ')
    .replace(/÷/g, '\\div ')
    .replace(/≤/g, '\\le ')
    .replace(/≥/g, '\\ge ')
    .replace(/≠/g, '\\ne ')
    .replace(/≈/g, '\\approx ')
    .replace(/≡/g, '\\equiv ')
    .replace(/∝/g, '\\propto ')
    .replace(/∞/g, '\\infty ')
    .replace(/π/g, '\\pi ')
    .replace(/θ/g, '\\theta ')
    .replace(/α/g, '\\alpha ')
    .replace(/β/g, '\\beta ')
    .replace(/γ/g, '\\gamma ')
    .replace(/δ/g, '\\delta ')
    .replace(/λ/g, '\\lambda ')
    .replace(/μ/g, '\\mu ')
    .replace(/σ/g, '\\sigma ')
    .replace(/ω/g, '\\omega ')
    .replace(/Ω/g, '\\Omega ')
    .replace(/Δ|∆/g, '\\Delta ')
    .replace(/∑/g, '\\sum ')
    .replace(/∫/g, '\\int ')
    .replace(/√(\d+|[a-zA-Z]+)/g, '\\sqrt{$1}')
    .replace(/√\(([^)]+)\)/g, '\\sqrt{$1}')
    .replace(/(\d+(?:\.\d+)?)\s*°\s*C\b/g, '$1^\\circ\\text{C}')
    .replace(/(\d+(?:\.\d+)?)\s*°\s*F\b/g, '$1^\\circ\\text{F}')
    .replace(/(\d+(?:\.\d+)?)\s*°/g, '$1^\\circ');
}

/**
 * Master Normalizer for Mathematical, Physics, and Chemistry Text.
 * Enforces standardized LaTeX format with $...$ for inline and $$...$$ for block formulas.
 */
export function normalizeScientificContent(rawText: string): string {
  if (!rawText || typeof rawText !== 'string') return rawText || '';

  // 1. Clean backslashes
  let text = cleanEscapedBackslashes(rawText);

  // 2. Convert raw unicode math symbols to LaTeX
  text = convertMathSymbolsToLatex(text);

  // 3. Segment existing LaTeX expressions ($...$ and $$...$$) to avoid double-processing
  const segments: { type: 'latex' | 'text'; content: string; isDisplay?: boolean }[] = [];
  const mathRegex = /(\$\$[\s\S]*?\$\$|\$[^\$\n]+?\$)/g;
  let lastIdx = 0;
  let match: RegExpExecArray | null;

  while ((match = mathRegex.exec(text)) !== null) {
    if (match.index > lastIdx) {
      segments.push({ type: 'text', content: text.substring(lastIdx, match.index) });
    }
    const raw = match[0];
    const isDisplay = raw.startsWith('$$') && raw.endsWith('$$');
    const mathContent = isDisplay ? raw.slice(2, -2).trim() : raw.slice(1, -1).trim();
    segments.push({ type: 'latex', content: mathContent, isDisplay });
    lastIdx = mathRegex.lastIndex;
  }

  if (lastIdx < text.length) {
    segments.push({ type: 'text', content: text.substring(lastIdx) });
  }

  // 4. Process non-LaTeX text segments to detect un-delimited math and chemistry
  const processedSegments = segments.map(seg => {
    if (seg.type === 'latex') {
      let inner = cleanEscapedBackslashes(seg.content);
      inner = convertMathSymbolsToLatex(inner);
      inner = inner.replace(/\\frac\s*\{/g, '\\frac{')
                   .replace(/\\sqrt\s*\{/g, '\\sqrt{')
                   .replace(/\\text\s*\{/g, '\\text{');
      return seg.isDisplay ? `$$${inner}$$` : `$${inner}$`;
    }

    let t = seg.content;

    // 4a. Detect chemical reactions
    const chemicalReactionRegex = /\b(\d*\s*[A-Z][a-z0-9()_{}\^]*\s*(?:\+\s*\d*\s*[A-Z][a-z0-9()_{}\^]*\s*)*)\s*(?:->|-->|=>|→|\\rightarrow)\s*(\d*\s*[A-Z][a-z0-9()_{}\^]*\s*(?:\+\s*\d*\s*[A-Z][a-z0-9()_{}\^]*\s*)*)\b/g;
    t = t.replace(chemicalReactionRegex, (rxn) => {
      const formatted = formatChemicalReactionToLatex(rxn);
      return `$${formatted}$`;
    });

    // 4b. Detect known chemical formulas
    for (const formula of KNOWN_CHEMICAL_FORMULAS) {
      const pattern = new RegExp(`(?<![A-Za-z0-9_\\\\])\\b(${formula})\\b(?![A-Za-z0-9_])`, 'g');
      t = t.replace(pattern, (_, matchForm) => {
        const formatted = formatChemicalFormulaToLatex(matchForm);
        return `$${formatted}$`;
      });
    }

    // 4c. Detect chemical ions e.g. Ca2+, SO4^2-, Fe3+, Na+, Cl-
    const ionRegex = /\b([A-Z][a-z]?(?:\d+)?)\s*(\^\{?\d*[+-]\}?|[1-4]?[+-])(?![A-Za-z0-9_+-])/g;
    t = t.replace(ionRegex, (match, base, charge) => {
      if (!KNOWN_CHEMICAL_ELEMENTS.has(base) && !KNOWN_POLYATOMIC_BASES.has(base) && !KNOWN_CHEMICAL_FORMULAS.includes(base)) {
        return match;
      }
      let cleanCharge = charge.replace(/[\^{}]/g, '');
      const formattedBase = formatChemicalFormulaToLatex(base);
      return `$${formattedBase}^{${cleanCharge}}$`;
    });

    // 4d. Detect pH expressions
    t = t.replace(/\b(pH\s*(=|<|>|<=|>=)\s*\d+(?:\.\d+)?)\b/g, (m) => {
      return `$\\text{${m.trim()}}$`;
    });

    // 4e. Detect un-delimited LaTeX commands
    const latexCmdRegex = /(\\(?:frac|sqrt|alpha|beta|gamma|delta|Delta|epsilon|theta|lambda|mu|pi|sigma|phi|omega|Omega|pm|times|div|leq|geq|le|ge|neq|ne|approx|infty|cdot|int|sum|prod|lim|sin|cos|tan|cot|sec|cosec|log|ln|degree|circ|partial|to|rightarrow|uparrow|downarrow|mathbf|text|left|right|vec|hat|bar)\b[\s\S]*?(?=[,\s;?!]|$|(?:\b[A-Z][a-z]+)))/g;
    t = t.replace(latexCmdRegex, (m) => {
      const trimmed = m.trim();
      if (trimmed.startsWith('$') && trimmed.endsWith('$')) return trimmed;
      return `$${trimmed}$`;
    });

    // 4f. Detect algebraic equations / powers / physics formulas / relations (e.g. 2x+5=15, E = mc^2, F = ma, v = u + at, x <= 5, x >= 10, x != 0)
    const mathRelRegex = /(?<![A-Za-z0-9_\$])\b([0-9a-zA-Z_()^\\/+\-*\s]+(?:<=|>=|!=|=|\\le|\\ge|\\ne|\\leq|\\geq|\\neq)[0-9a-zA-Z_()^\\/+\-*\s]+)\b(?![A-Za-z0-9_\$])/g;
    t = t.replace(mathRelRegex, (m) => {
      const trimmed = m.trim();
      const hasMathSymbol = /[0-9xyzabcmvutFEgkhpqrw]|[-+*/^\\<>=]/.test(trimmed);
      const isPlainWord = /^[A-Za-z\s]+$/.test(trimmed);
      if (hasMathSymbol && !isPlainWord) {
        let converted = convertMathSymbolsToLatex(trimmed);
        converted = converted.replace(/<=/g, '\\le ').replace(/>=/g, '\\ge ').replace(/!=/g, '\\ne ');
        return `$${converted.trim()}$`;
      }
      return m;
    });

    const mathPowerRegex = /(?<![A-Za-z0-9_\$])\b([a-zA-Z]\^[0-9a-zA-Z{}]+(?:\s*[-+*/]\s*[0-9a-zA-Z_\^\\\/{}+*()]+)*)\b(?![A-Za-z0-9_\$])/g;
    t = t.replace(mathPowerRegex, (m) => {
      return `$${m.trim()}$`;
    });

    // 4g. Detect standalone fractions in math contexts
    t = t.replace(/(?<=\b(?:value of|fraction|equals|sum of|ratio|is|calculate|find)\s+)(\d+)\/(\d+)\b/gi, (_, num, den) => {
      return `$\\frac{${num}}{${den}}$`;
    });

    // 4h. Detect coordinate points
    t = t.replace(/\b([A-Z])\s*\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)/g, (_, point, x, y) => {
      return `$${point}(${x}, ${y})$`;
    });

    // 4i. Detect temperatures with degree units
    t = t.replace(/(\d+(?:\.\d+)?\^\\circ\\text\{[CF]\})/g, '$1');
    t = t.replace(/(\d+(?:\.\d+)?\^\\circ)/g, '$1');

    return t;
  });

  let result = processedSegments.join('');

  // 5. Final cleanup: remove empty or doubled delimiters
  result = result
    .replace(/\$\$+/g, '$$')
    .replace(/\$\s*\$/g, '')
    .replace(/\$([^\$\n]+)\$/g, (_, inner) => `$${inner.trim()}$`);

  return result;
}

/**
 * Validates the syntactic and structural integrity of scientific text
 */
export function validateScientificContent(text: string): { valid: boolean; issues: string[]; normalizedText: string } {
  const issues: string[] = [];
  if (!text || typeof text !== 'string') {
    return { valid: true, issues: [], normalizedText: '' };
  }

  const normalized = normalizeScientificContent(text);

  // Check 1: Balanced LaTeX dollar delimiters
  const singleDollars = (normalized.match(/(?<!\$)\$(?!\$)/g) || []).length;
  if (singleDollars % 2 !== 0) {
    issues.push('Unbalanced inline math delimiter ($). Found odd count of single dollar signs.');
  }

  const doubleDollars = (normalized.match(/\$\$/g) || []).length;
  if (doubleDollars % 2 !== 0) {
    issues.push('Unbalanced display math delimiter ($$). Found odd count of double dollar signs.');
  }

  // Check 2: Balanced braces inside math expressions
  const mathSegments = normalized.match(/(\$\$[\s\S]*?\$\$|\$[^\$\n]+?\$)/g) || [];
  for (const m of mathSegments) {
    let braceCount = 0;
    for (const char of m) {
      if (char === '{') braceCount++;
      if (char === '}') braceCount--;
      if (braceCount < 0) {
        issues.push(`Mismatched closing brace '}' in formula: ${m}`);
        break;
      }
    }
    if (braceCount > 0) {
      issues.push(`Unclosed opening brace '{' in formula: ${m}`);
    }
  }

  return {
    valid: issues.length === 0,
    issues,
    normalizedText: normalized,
  };
}

/**
 * RFC 4180 Compliant CSV Cell Serializer
 * Preserves mathematical LaTeX verbatim without destructive character conversions.
 * Correctly escapes internal double quotes and wraps cells in quotes if they contain
 * quotes, commas, newlines, or LaTeX backslashes.
 */
export function serializeCsvCell(val: any): string {
  if (val === null || val === undefined) return '""';
  const str = typeof val === 'string' ? val : String(val);
  
  // Normalize scientific content first so formulas are standard LaTeX
  const normalized = normalizeScientificContent(str);
  
  // RFC 4180 standard escaping: escape " -> ""
  const escaped = normalized.replace(/"/g, '""');
  return `"${escaped}"`;
}

/**
 * Serializes a full row of values into an RFC 4180 CSV row
 */
export function serializeCsvRow(values: any[]): string {
  return values.map(v => serializeCsvCell(v)).join(',');
}

/**
 * RFC 4180 Compliant CSV Line / String Parser.
 * Handles embedded commas, escaped quotes, multiline content, and complex LaTeX notations.
 */
export function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        // Check for escaped quote ""
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i += 2;
          continue;
        } else {
          inQuotes = false;
          i++;
          continue;
        }
      } else {
        current += char;
        i++;
        continue;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
        i++;
        continue;
      } else if (char === ',') {
        result.push(current);
        current = '';
        i++;
        continue;
      } else {
        current += char;
        i++;
        continue;
      }
    }
  }

  result.push(current);
  return result;
}

/**
 * Parses full multi-line CSV text into array of rows respecting RFC 4180 quoted newlines.
 */
export function parseCsvContent(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;
  let i = 0;

  // Strip UTF-8 BOM if present
  const text = csvText.startsWith('\uFEFF') ? csvText.slice(1) : csvText;

  while (i < text.length) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < text.length && text[i + 1] === '"') {
          currentCell += '"';
          i += 2;
          continue;
        } else {
          inQuotes = false;
          i++;
          continue;
        }
      } else {
        currentCell += char;
        i++;
        continue;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
        i++;
        continue;
      } else if (char === ',') {
        currentRow.push(currentCell);
        currentCell = '';
        i++;
        continue;
      } else if (char === '\r') {
        if (i + 1 < text.length && text[i + 1] === '\n') {
          i++;
        }
        currentRow.push(currentCell);
        currentCell = '';
        if (currentRow.length > 0) {
          rows.push(currentRow);
          currentRow = [];
        }
        i++;
        continue;
      } else if (char === '\n') {
        currentRow.push(currentCell);
        currentCell = '';
        if (currentRow.length > 0) {
          rows.push(currentRow);
          currentRow = [];
        }
        i++;
        continue;
      } else {
        currentCell += char;
        i++;
        continue;
      }
    }
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell);
    rows.push(currentRow);
  }

  return rows;
}

/**
 * Validates a CSV row structure and data completeness
 */
export function validateCsvRow(row: string[], expectedColumns?: number): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  if (!Array.isArray(row) || row.length === 0) {
    return { valid: false, issues: ['Row is empty or invalid'] };
  }

  if (expectedColumns && row.length !== expectedColumns) {
    issues.push(`Column count mismatch: Expected ${expectedColumns}, got ${row.length}`);
  }

  // Validate each cell's scientific content
  row.forEach((cell, idx) => {
    const check = validateScientificContent(cell);
    if (!check.valid) {
      issues.push(`Column ${idx + 1} formula error: ${check.issues.join('; ')}`);
    }
  });

  return {
    valid: issues.length === 0,
    issues,
  };
}

/**
 * Validates Round-Trip Integrity for a Question Object
 * Question -> CSV Serialization -> CSV Parsing -> Reconstituted Object
 */
export function validateRoundTrip(question: Question | AssessmentQuestion | any): { success: boolean; differences?: string[] } {
  const diffs: string[] = [];
  
  const opts = (question as any).options || {};
  const optA = opts.A || opts.a || (question as any).option_a || (question as any).optionA || '';
  const optB = opts.B || opts.b || (question as any).option_b || (question as any).optionB || '';
  const optC = opts.C || opts.c || (question as any).option_c || (question as any).optionC || '';
  const optD = opts.D || opts.d || (question as any).option_d || (question as any).optionD || '';

  // 1. Serialize question fields to CSV
  const serialized = [
    serializeCsvCell(question.id),
    serializeCsvCell(question.question || (question as any).text || ''),
    serializeCsvCell(question.category || (question as any).topic || ''),
    serializeCsvCell(question.difficulty),
    serializeCsvCell(question.subject),
    serializeCsvCell(optA),
    serializeCsvCell(optB),
    serializeCsvCell(optC),
    serializeCsvCell(optD),
    serializeCsvCell((question as any).correctAnswer || (question as any).answer || ''),
    serializeCsvCell((question as any).explanation || ''),
    serializeCsvCell((question as any).hint || ''),
  ].join(',');

  // 2. Parse back
  const parsed = parseCsvLine(serialized);

  // 3. Compare semantic text
  const normOriginalQ = normalizeScientificContent(question.question || (question as any).text || '');
  const normParsedQ = normalizeScientificContent(parsed[1] || '');

  if (normOriginalQ !== normParsedQ) {
    diffs.push(`Question text mismatch:\nOriginal: ${normOriginalQ}\nParsed:   ${normParsedQ}`);
  }

  return {
    success: diffs.length === 0,
    differences: diffs.length > 0 ? diffs : undefined,
  };
}

/**
 * Sanitizes any Question object (or NcertQuestion / AssessmentQuestion)
 */
export function sanitizeQuestionObject<T extends Record<string, any>>(q: T): T {
  if (!q || typeof q !== 'object') return q;
  const cloned: any = { ...q };

  if (typeof cloned.question === 'string') {
    cloned.question = normalizeScientificContent(cloned.question);
  }
  if (typeof cloned.text === 'string') {
    cloned.text = normalizeScientificContent(cloned.text);
  }

  if (cloned.options && typeof cloned.options === 'object') {
    const newOptions: Record<string, string> = {};
    for (const [key, val] of Object.entries(cloned.options)) {
      newOptions[key] = typeof val === 'string' ? normalizeScientificContent(val) : (val as string);
    }
    cloned.options = newOptions;
  }

  if (typeof cloned.optionA === 'string') cloned.optionA = normalizeScientificContent(cloned.optionA);
  if (typeof cloned.optionB === 'string') cloned.optionB = normalizeScientificContent(cloned.optionB);
  if (typeof cloned.optionC === 'string') cloned.optionC = normalizeScientificContent(cloned.optionC);
  if (typeof cloned.optionD === 'string') cloned.optionD = normalizeScientificContent(cloned.optionD);

  if (typeof cloned.option_a === 'string') cloned.option_a = normalizeScientificContent(cloned.option_a);
  if (typeof cloned.option_b === 'string') cloned.option_b = normalizeScientificContent(cloned.option_b);
  if (typeof cloned.option_c === 'string') cloned.option_c = normalizeScientificContent(cloned.option_c);
  if (typeof cloned.option_d === 'string') cloned.option_d = normalizeScientificContent(cloned.option_d);

  if (typeof cloned.explanation === 'string') {
    cloned.explanation = normalizeScientificContent(cloned.explanation);
  }
  if (typeof cloned.hint === 'string') {
    cloned.hint = normalizeScientificContent(cloned.hint);
  }
  if (typeof cloned.answer === 'string') {
    cloned.answer = normalizeScientificContent(cloned.answer);
  }
  if (typeof cloned.correctAnswerText === 'string') {
    cloned.correctAnswerText = normalizeScientificContent(cloned.correctAnswerText);
  }

  return cloned as T;
}

/**
 * Sanitizes a complete Assessment object including all embedded questions
 */
export function sanitizeAssessmentObject<T extends Record<string, any>>(asm: T): T {
  if (!asm || typeof asm !== 'object') return asm;
  const cloned: any = { ...asm };

  if (typeof cloned.title === 'string') {
    cloned.title = normalizeScientificContent(cloned.title);
  }
  if (typeof cloned.description === 'string') {
    cloned.description = normalizeScientificContent(cloned.description);
  }

  if (Array.isArray(cloned.questions)) {
    cloned.questions = cloned.questions.map((q: any) => sanitizeQuestionObject(q));
  }

  return cloned as T;
}

/**
 * Service Object Bundle for Unified Export/Import
 */
export const ScientificContentIntegrityService = {
  normalizeScientificContent,
  validateScientificContent,
  serializeCsvCell,
  serializeCsvRow,
  parseCsvLine,
  parseCsvContent,
  validateCsvRow,
  validateRoundTrip,
  sanitizeQuestionObject,
  sanitizeAssessmentObject,
  cleanEscapedBackslashes,
  formatChemicalFormulaToLatex,
  formatChemicalReactionToLatex,
  convertMathSymbolsToLatex,
};
