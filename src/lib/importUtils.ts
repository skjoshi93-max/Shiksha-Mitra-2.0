import * as XLSX from 'xlsx';
import { Question, ImportMapping, ImportValidationResult } from '../types';
import { assessQuestionQuality, findDuplicateInBank } from './qualityEngine';
import {
  sanitizeQuestionObject,
  validateScientificContent,
  parseCsvContent,
} from './scientificIntegrityService';

export function detectHeaders(fileContent: ArrayBuffer | string, extension: string): string[] {
  try {
    if (extension === 'json') {
      const data = JSON.parse(fileContent as string);
      const list = Array.isArray(data) ? data : data.questions || data.questionBank?.questions || [];
      if (list.length > 0) return Object.keys(list[0]);
      return [];
    }

    if (extension === 'csv' && typeof fileContent === 'string') {
      const rows = parseCsvContent(fileContent);
      if (rows.length > 0 && Array.isArray(rows[0])) {
        return rows[0].map(cell => cell.trim());
      }
    }

    const workbook = XLSX.read(fileContent, { type: extension === 'csv' || extension === 'txt' ? 'string' : 'array' });
    const firstSheet = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheet];
    const jsonRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
    if (jsonRows.length > 0 && Array.isArray(jsonRows[0])) {
      return jsonRows[0].map(cell => String(cell).trim());
    }
  } catch (err) {
    console.error('Error detecting headers:', err);
  }
  return [];
}

export function autoSuggestMappings(headers: string[]): ImportMapping[] {
  return headers.map(header => {
    const lower = header.toLowerCase().replace(/[^a-z0-9]/g, '');
    let targetField: keyof Question | 'ignore' = 'ignore';

    if (lower.includes('id') || lower === 'questionid' || lower === 'code') targetField = 'id';
    else if (lower.includes('question') || lower.includes('text') || lower.includes('prompt') || lower === 'q') targetField = 'question';
    else if (lower.includes('category') || lower.includes('domain') || lower.includes('cat')) targetField = 'category';
    else if (lower.includes('difficulty') || lower.includes('level') || lower.includes('diff')) targetField = 'difficulty';
    else if (lower.includes('subject') || lower.includes('topic')) targetField = 'subject';
    else if (lower.includes('type') || lower.includes('style')) targetField = 'questionType';
    else if (lower.includes('time') || lower.includes('duration') || lower.includes('sec')) targetField = 'timeLimit';
    else if (lower.includes('score') || lower.includes('marks') || lower.includes('points')) targetField = 'maxScore';
    else if (lower.includes('tag') || lower.includes('keyword')) targetField = 'tags';
    else if (lower.includes('hint') || lower.includes('rubric') || lower.includes('guidance') || lower.includes('answer')) targetField = 'hint';
    else if (lower.includes('active') || lower.includes('status')) targetField = 'active';

    return { csvHeader: header, targetField };
  });
}

export function parseAndValidateImport(
  fileContent: ArrayBuffer | string,
  extension: string,
  mappings: ImportMapping[],
  existingQuestions: Question[],
  qualityThreshold = 85,
  duplicateSensitivity = 75
): ImportValidationResult {
  const issues: string[] = [];
  const parsedQuestions: Question[] = [];

  try {
    let rawObjects: Record<string, any>[] = [];

    if (extension === 'json') {
      const data = JSON.parse(fileContent as string);
      const list = Array.isArray(data) ? data : data.questions || data.questionBank?.questions || [];
      rawObjects = list;
    } else if (extension === 'csv' && typeof fileContent === 'string') {
      const parsedRows = parseCsvContent(fileContent);
      if (parsedRows.length > 1) {
        const headers = parsedRows[0];
        for (let r = 1; r < parsedRows.length; r++) {
          const rowData = parsedRows[r];
          if (rowData.length === 0 || (rowData.length === 1 && !rowData[0].trim())) continue;
          const obj: Record<string, any> = {};
          headers.forEach((h, idx) => {
            obj[h] = rowData[idx] || '';
          });
          rawObjects.push(obj);
        }
      }
    } else {
      const workbook = XLSX.read(fileContent, { type: extension === 'csv' || extension === 'txt' ? 'string' : 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      rawObjects = XLSX.utils.sheet_to_json(worksheet);
    }

    const mapLookup = new Map<string, keyof Question>();
    mappings.forEach(m => {
      if (m.targetField !== 'ignore') {
        mapLookup.set(m.csvHeader, m.targetField);
      }
    });

    let rowIdx = 1;
    let duplicateCount = 0;
    let invalidCount = 0;

    for (const row of rawObjects) {
      rowIdx++;
      const qObj: Partial<Question> = {
        id: `SM-IMP-${Date.now().toString().slice(-4)}-${rowIdx}`,
        active: true,
        timeLimit: 120,
        maxScore: 10,
        tags: ['Imported'],
        hint: 'Review imported response metrics.',
        createdDate: new Date().toISOString(),
        updatedDate: new Date().toISOString(),
      };

      for (const [header, value] of Object.entries(row)) {
        const target = mapLookup.get(header);
        if (!target) continue;

        if (target === 'tags') {
          if (typeof value === 'string') {
            qObj.tags = value.split(/[,;]/).map(s => s.trim()).filter(Boolean);
          } else if (Array.isArray(value)) {
            qObj.tags = value.map(String);
          }
        } else if (target === 'timeLimit' || target === 'maxScore') {
          const num = parseInt(String(value), 10);
          if (!isNaN(num)) qObj[target] = num;
        } else if (target === 'active') {
          const s = String(value).toLowerCase();
          qObj.active = s === 'yes' || s === 'true' || s === '1' || s === 'active';
        } else {
          (qObj as any)[target] = String(value).trim();
        }
      }

      // Fallback text check
      if (!qObj.question) {
        invalidCount++;
        issues.push(`Row ${rowIdx}: Missing question text. Skipped.`);
        continue;
      }

      // Default fields if missing
      qObj.category = qObj.category || 'General Pedagogy';
      qObj.difficulty = (qObj.difficulty as any) || 'Medium';
      qObj.subject = qObj.subject || 'General Teaching';
      qObj.questionType = qObj.questionType || 'Conceptual';

      // Sanitize with ScientificContentIntegrityService
      const fullQ = sanitizeQuestionObject(qObj as Question);

      // Validate scientific integrity
      const sciCheck = validateScientificContent(fullQ.question || '');
      if (!sciCheck.valid) {
        issues.push(`Row ${rowIdx} formula warning: ${sciCheck.issues.join('; ')}`);
      }

      // Quality assessment
      const quality = assessQuestionQuality(fullQ, qualityThreshold);
      fullQ.qualityScore = quality.score;

      // Duplicate check
      const dupCheck = findDuplicateInBank(fullQ, [...existingQuestions, ...parsedQuestions], duplicateSensitivity);
      fullQ.duplicateSimilarity = dupCheck.maxSimilarity;

      if (dupCheck.maxSimilarity >= duplicateSensitivity) {
        duplicateCount++;
        issues.push(`Row ${rowIdx}: High similarity (${dupCheck.maxSimilarity}%) with existing ID ${dupCheck.matchedQuestion?.id}. Flagged.`);
      }

      parsedQuestions.push(fullQ);
    }

    return {
      totalRows: rawObjects.length,
      validRows: parsedQuestions.length,
      invalidRows: invalidCount,
      duplicateRows: duplicateCount,
      questions: parsedQuestions,
      issues,
    };
  } catch (err: any) {
    return {
      totalRows: 0,
      validRows: 0,
      invalidRows: 0,
      duplicateRows: 0,
      questions: [],
      issues: [`Import processing error: ${err.message}`],
    };
  }
}
