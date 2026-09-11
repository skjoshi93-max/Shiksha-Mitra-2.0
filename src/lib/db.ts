import { openDB, IDBPDatabase } from 'idb';
import { Question, SettingsState, Assessment, NcertBook, NcertQuestion, DailyExportFile, ChapterThumbnailRecord } from '../types';
import { DEFAULT_SETTINGS } from './constants';
import { DEMO_ASSESSMENTS, generateAll69Assessments } from './assessmentConstants';
import { CLASS_6_POORVI_BOOK, VERIFIED_POORVI_SOLUTIONS } from './verifiedSolutionsData';
import { cleanLatexToPlainMath } from './unifiedQuestionExport';
import {
  sanitizeQuestionObject,
  sanitizeAssessmentObject,
  sanitizeMathAndChemistryText,
  migrateLegacyAssessmentRecord,
  migrateLegacyMcqRecord,
} from './mathSanitizer';

export type { NcertBook, NcertQuestion, DailyExportFile, ChapterThumbnailRecord };


const DB_NAME = 'ShikshaMitraQuestionBankDB';
const DB_VERSION = 8;

interface DBData {
  questions: {
    key: string;
    value: Question;
    indexes: {
      category: string;
      difficulty: string;
      subject: string;
      active: number;
    };
  };
  assessments: {
    key: string;
    value: Assessment;
    indexes: {
      subject: string;
      active: number;
      slug: string;
    };
  };
  ncertBooks: {
    key: string;
    value: NcertBook;
    indexes: {
      classLevel: string;
      subject: string;
      pdfHash: string;
      status: string;
    };
  };
  ncertQuestions: {
    key: string;
    value: NcertQuestion;
    indexes: {
      bookId: string;
      chapterId: string;
      subject: string;
    };
  };
  ncertPdfBlobs: {
    key: string;
    value: { hash: string; data: ArrayBuffer; updatedAt: string };
  };
  settings: {
    key: string;
    value: { key: string; data: any };
  };
  deletedRecords: {
    key: string;
    value: { id: string; entity: string; recordId: string; deletedAt: string };
    indexes: {
      entity: string;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<DBData>> | null = null;

export function getDB(): Promise<IDBPDatabase<DBData>> {
  if (!dbPromise) {
    dbPromise = openDB<DBData>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (!db.objectStoreNames.contains('questions')) {
          const questionStore = db.createObjectStore('questions', { keyPath: 'id' });
          questionStore.createIndex('category', 'category');
          questionStore.createIndex('difficulty', 'difficulty');
          questionStore.createIndex('subject', 'subject');
          questionStore.createIndex('active', 'active');
        }
        if (!db.objectStoreNames.contains('assessments')) {
          const asmStore = db.createObjectStore('assessments', { keyPath: 'id' });
          asmStore.createIndex('subject', 'subject');
          asmStore.createIndex('active', 'active');
          asmStore.createIndex('slug', 'slug');
        }
        if (!db.objectStoreNames.contains('ncertBooks')) {
          const ncertStore = db.createObjectStore('ncertBooks', { keyPath: 'id' });
          ncertStore.createIndex('classLevel', 'classLevel');
          ncertStore.createIndex('subject', 'subject');
          ncertStore.createIndex('pdfHash', 'pdfHash');
          ncertStore.createIndex('status', 'status');
        }
        if (!db.objectStoreNames.contains('ncertQuestions')) {
          const ncertQStore = db.createObjectStore('ncertQuestions', { keyPath: 'id' });
          ncertQStore.createIndex('bookId', 'bookId');
          ncertQStore.createIndex('chapterId', 'chapterId');
          ncertQStore.createIndex('subject', 'subject');
        }
        if (!db.objectStoreNames.contains('dailyBatches')) {
          const batchStore = db.createObjectStore('dailyBatches', { keyPath: 'id' });
          batchStore.createIndex('moduleId', 'moduleId');
          batchStore.createIndex('batchDate', 'batchDate');
          batchStore.createIndex('status', 'status');
        }
        if (!db.objectStoreNames.contains('dailyExportFiles')) {
          const fileStore = db.createObjectStore('dailyExportFiles', { keyPath: 'id' });
          fileStore.createIndex('moduleId', 'moduleId');
          fileStore.createIndex('batchDate', 'batchDate');
          fileStore.createIndex('downloadStatus', 'downloadStatus');
        }
        if (!db.objectStoreNames.contains('moduleCounters')) {
          db.createObjectStore('moduleCounters', { keyPath: 'moduleId' });
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains('deletedRecords')) {
          const tombStore = db.createObjectStore('deletedRecords', { keyPath: 'id' });
          tombStore.createIndex('entity', 'entity');
        }
        if (!db.objectStoreNames.contains('ncertPdfBlobs')) {
          db.createObjectStore('ncertPdfBlobs', { keyPath: 'hash' });
        }
        if (db.objectStoreNames.contains('driveDiscoveryIndex')) {
          db.deleteObjectStore('driveDiscoveryIndex');
        }
      },
    });
  }
  return dbPromise;
}

// ==========================================
// PERSISTENT TOMBSTONE & DELETION ENGINE
// ==========================================

export async function recordTombstone(entity: string, recordId: string): Promise<void> {
  try {
    const db = await getDB();
    const key = `${entity}_${recordId}`;
    await db.put('deletedRecords', {
      id: key,
      entity,
      recordId,
      deletedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error(`Error recording tombstone for ${entity} ${recordId}:`, err);
  }
}

export async function removeTombstone(entity: string, recordId: string): Promise<void> {
  try {
    const db = await getDB();
    const key = `${entity}_${recordId}`;
    await db.delete('deletedRecords', key);
  } catch (err) {
    console.error(`Error removing tombstone for ${entity} ${recordId}:`, err);
  }
}

export async function getTombstonesForEntity(entity: string): Promise<Set<string>> {
  try {
    const db = await getDB();
    const all = await db.getAll('deletedRecords');
    const set = new Set<string>();
    if (Array.isArray(all)) {
      for (const t of all) {
        if (t && t.entity === entity && t.recordId) {
          set.add(t.recordId);
        }
      }
    }
    return set;
  } catch (err) {
    console.error(`Error fetching tombstones for ${entity}:`, err);
    return new Set<string>();
  }
}

// ==========================================
// QUESTION STORE FUNCTIONS
// ==========================================

export async function getAllQuestions(): Promise<Question[]> {
  try {
    const db = await getDB();
    const tombstones = await getTombstonesForEntity('questions');
    const questions = await db.getAll('questions');
    const cleanQuestions = (questions || []).filter(
      q => q && q.id && !tombstones.has(q.id) && !q.isDemo && !q.id?.includes('demo')
    );
    return cleanQuestions;
  } catch (error) {
    console.error('Error fetching questions from IndexedDB:', error);
    return [];
  }
}

export async function saveQuestion(question: Question): Promise<void> {
  const db = await getDB();
  const cleanQ = sanitizeQuestionObject(question);
  await db.put('questions', cleanQ);
  if (cleanQ.id) {
    await removeTombstone('questions', cleanQ.id);
  }
}

export async function saveQuestionsBatch(questions: Question[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('questions', 'readwrite');
  const store = tx.objectStore('questions');
  for (const q of questions) {
    const cleanQ = sanitizeQuestionObject(q);
    await store.put(cleanQ);
  }
  await tx.done;
  for (const q of questions) {
    if (q.id) {
      await removeTombstone('questions', q.id);
    }
  }
}

export async function deleteQuestion(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('questions', id);
  await recordTombstone('questions', id);
}

export async function deleteQuestionsBatch(ids: string[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('questions', 'readwrite');
  const store = tx.objectStore('questions');
  for (const id of ids) {
    await store.delete(id);
  }
  await tx.done;
  for (const id of ids) {
    await recordTombstone('questions', id);
  }
}

export async function clearAllQuestions(): Promise<void> {
  const db = await getDB();
  await db.clear('questions');
}

export async function getSettings(): Promise<SettingsState> {
  try {
    const db = await getDB();
    const record = await db.get('settings', 'app_settings');
    if (record && record.data) {
      return { ...DEFAULT_SETTINGS, ...record.data };
    }
    return DEFAULT_SETTINGS;
  } catch (error) {
    console.error('Error fetching settings from IndexedDB:', error);
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: SettingsState): Promise<void> {
  const db = await getDB();
  await db.put('settings', { key: 'app_settings', data: settings });
}

export async function exportBackupJSON(): Promise<string> {
  const questions = await getAllQuestions();
  const assessments = await getAllAssessments();
  const settings = await getSettings();
  const backup = {
    app: 'Shiksha Mitra 2.0 Pro',
    version: '2.0.0',
    exportedAt: new Date().toISOString(),
    totalQuestions: questions.length,
    totalAssessments: assessments.length,
    settings,
    questions,
    assessments,
  };
  return JSON.stringify(backup, null, 2);
}

export async function importBackupJSON(jsonStr: string): Promise<{ success: boolean; count: number; message: string }> {
  try {
    const data = JSON.parse(jsonStr);
    const questions: Question[] = data.questions || data.questionBank?.questions || [];
    const assessments: Assessment[] = data.assessments || [];
    
    if (Array.isArray(questions) && questions.length > 0) {
      await saveQuestionsBatch(questions);
    }
    if (Array.isArray(assessments) && assessments.length > 0) {
      for (const asm of assessments) {
        await saveAssessment(asm);
      }
    }
    if (data.settings) {
      await saveSettings(data.settings);
    }
    return { success: true, count: questions.length + assessments.length, message: `Successfully restored backup (${questions.length} questions, ${assessments.length} assessments)` };
  } catch (err: any) {
    return { success: false, count: 0, message: `Failed to parse backup JSON: ${err.message}` };
  }
}

// ==========================================
// ASSESSMENT STORE FUNCTIONS
// ==========================================

export async function getAllAssessments(): Promise<Assessment[]> {
  try {
    const db = await getDB();
    const tombstones = await getTombstonesForEntity('assessments');
    const assessments = await db.getAll('assessments');
    const clean = (assessments || [])
      .filter(a => a && a.id && !tombstones.has(a.id))
      .map(a => migrateLegacyAssessmentRecord(a));
    return clean;
  } catch (error) {
    console.error('Error fetching assessments from IndexedDB:', error);
    return [];
  }
}

export async function saveAssessment(assessment: Assessment): Promise<void> {
  const db = await getDB();
  const migrated = migrateLegacyAssessmentRecord(assessment);
  const cleanAsm = sanitizeAssessmentObject(migrated);
  await db.put('assessments', cleanAsm);
  if (cleanAsm.id) {
    await removeTombstone('assessments', cleanAsm.id);
  }
}

export async function deleteAssessment(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('assessments', id);
  await recordTombstone('assessments', id);
}

export async function deleteAssessmentsBatch(ids: string[]): Promise<void> {
  for (const id of ids) {
    await deleteAssessment(id);
  }
}

export async function clearAllAssessments(): Promise<void> {
  const all = await getAllAssessments();
  for (const a of all) {
    await deleteAssessment(a.id);
  }
}

export async function repairMathFormulasInExistingDb(): Promise<void> {
  try {
    const db = await getDB();
    
    // 1. Repair normal questions in IndexedDB
    const questionsTx = db.transaction('questions', 'readwrite');
    const questionsStore = questionsTx.objectStore('questions');
    const questions = await questionsStore.getAll();
    let questionsUpdated = 0;
    for (const q of questions) {
      if (q) {
        const migrated = migrateLegacyMcqRecord(q);
        const sanitized = sanitizeQuestionObject(migrated);
        // Compare serialized or key fields
        if (JSON.stringify(sanitized) !== JSON.stringify(q)) {
          await questionsStore.put(sanitized);
          questionsUpdated++;
        }
      }
    }
    await questionsTx.done;
    if (questionsUpdated > 0) {
      console.log(`[Math Formula DB Repair] Sanitized & updated ${questionsUpdated} questions in DB with LaTeX delimiters.`);
    }

    // 2. Repair NCERT questions in IndexedDB
    try {
      const ncertTx = db.transaction('ncertQuestions', 'readwrite');
      const ncertStore = ncertTx.objectStore('ncertQuestions');
      const ncertQuestions = await ncertStore.getAll();
      let ncertUpdated = 0;
      for (const nq of ncertQuestions) {
        if (nq) {
          const migrated = migrateLegacyMcqRecord(nq);
          const sanitized = sanitizeQuestionObject(migrated);
          if (JSON.stringify(sanitized) !== JSON.stringify(nq)) {
            await ncertStore.put(sanitized);
            ncertUpdated++;
          }
        }
      }
      await ncertTx.done;
      if (ncertUpdated > 0) {
        console.log(`[Math Formula DB Repair] Sanitized & updated ${ncertUpdated} NCERT questions in DB.`);
      }
    } catch (_) {}

    // 3. Repair assessments in IndexedDB
    const assessmentsTx = db.transaction('assessments', 'readwrite');
    const assessmentsStore = assessmentsTx.objectStore('assessments');
    const assessments = await assessmentsStore.getAll();
    let assessmentsUpdated = 0;
    for (const asm of assessments) {
      if (asm) {
        const migrated = migrateLegacyAssessmentRecord(asm);
        const sanitized = sanitizeAssessmentObject(migrated);
        if (JSON.stringify(sanitized) !== JSON.stringify(asm)) {
          await assessmentsStore.put(sanitized);
          assessmentsUpdated++;
        }
      }
    }
    await assessmentsTx.done;
    if (assessmentsUpdated > 0) {
      console.log(`[Math Formula DB Repair] Sanitized & updated ${assessmentsUpdated} assessments in DB with LaTeX delimiters.`);
    }

    // 4. Repair already generated dailyExportFiles (CSV files)
    const filesTx = db.transaction('dailyExportFiles', 'readwrite');
    const filesStore = filesTx.objectStore('dailyExportFiles');
    const files = await filesStore.getAll();
    let filesUpdated = 0;
    for (const f of files) {
      if (f && f.csvContent) {
        const originalContent = f.csvContent;
        // Clean and normalize math and chemistry formatting via ScientificContentIntegrityService
        const cleaned = sanitizeMathAndChemistryText(originalContent);
        if (cleaned !== originalContent) {
          f.csvContent = cleaned;
          await filesStore.put(f);
          filesUpdated++;
        }
      }
    }
    await filesTx.done;
    if (filesUpdated > 0) {
      console.log(`[Math Formula DB Repair] Auto-applied clean scientific formulas to ${filesUpdated} already generated CSV files.`);
    }
  } catch (err) {
    console.error('[Math Formula DB Repair] Failed running database formula correction:', err);
  }
}

// ==========================================
// NCERT BOOK STORE FUNCTIONS & CROSS-DEVICE SYNC
// ==========================================

let isMigrationRunning = false;

export async function migrateToVerifiedNcertSolutions(): Promise<void> {
  if (isMigrationRunning) return;
  isMigrationRunning = true;
  try {
    const db = await getDB();
    const settingsRecord = await db.get('settings', 'app_settings');
    const appSettings = settingsRecord?.data || {};

    if (!appSettings.ncert_poorvi_verified_migrated_v3) {
      console.log('[Migration] 🚀 Starting NCERT Solutions Complete Re-Mapping to Tiwari Academy Standard...');

      // 1. Seed the verified Class 6 English (Poorvi) textbook into ncertBooks
      await db.put('ncertBooks', CLASS_6_POORVI_BOOK);
      await removeTombstone('ncertBooks', CLASS_6_POORVI_BOOK.id);

      // 2. Pre-cache all 15 chapters of verified solutions in localStorage for instant retrieval
      const AUTO_CACHE_KEY_PREFIX = 'academic_auto_cache_';
      const ncertQuestionsToSeed: NcertQuestion[] = [];

      for (const [chTitle, sol] of Object.entries(VERIFIED_POORVI_SOLUTIONS)) {
        const matchingChapter = CLASS_6_POORVI_BOOK.chapters.find(
          c => c.chapterTitle.toLowerCase().trim() === chTitle.toLowerCase().trim()
        );
        const chapterId = matchingChapter ? matchingChapter.id : `ch_${chTitle.replace(/\s+/g, '_').toLowerCase()}`;

        // Cache solutions for Tile 1 (Solutions Vault)
        const solCacheKey = `${AUTO_CACHE_KEY_PREFIX}sol_${CLASS_6_POORVI_BOOK.id}_${chapterId}`;
        try {
          localStorage.setItem(solCacheKey, JSON.stringify(sol));
        } catch (e) {}

        // Cache bilingual summaries for Tile 2 (English Summaries)
        if (sol.bilingualSummary) {
          const sumCacheKey = `${AUTO_CACHE_KEY_PREFIX}sum_${CLASS_6_POORVI_BOOK.id}_${chapterId}`;
          try {
            localStorage.setItem(sumCacheKey, JSON.stringify(sol));
          } catch (e) {}
        }

        // Convert exercises into standard NcertQuestion entities for question bank integration
        if (Array.isArray(sol.exercises)) {
          sol.exercises.forEach((ex, exIdx) => {
            if (Array.isArray(ex.items)) {
              ex.items.forEach((item, itemIdx) => {
                ncertQuestionsToSeed.push({
                  id: `NQ-${CLASS_6_POORVI_BOOK.id}-${chapterId}-E${exIdx + 1}-Q${itemIdx + 1}`,
                  bookId: CLASS_6_POORVI_BOOK.id,
                  chapterId: chapterId,
                  sourcePdfHash: CLASS_6_POORVI_BOOK.pdfHash,
                  sourceContentHash: sol.uniqueChapterHash || 'poorvi_verified',
                  board: 'CBSE',
                  grade: 'Class 6',
                  subject: 'English',
                  publisher: 'NCERT',
                  book: 'Poorvi',
                  chapter: chTitle,
                  topic: ex.exerciseTitle || 'Textbook Solutions',
                  type: 'Short Answer',
                  difficulty: 'Medium',
                  marks: 3,
                  text: item.question,
                  optionA: '',
                  optionB: '',
                  optionC: '',
                  optionD: '',
                  answer: item.answer + (item.stepByStepExplanation ? `\n\nExplanation: ${item.stepByStepExplanation}` : ''),
                  fingerprint: `${chTitle}_${item.question.slice(0, 40)}`,
                });
              });
            }
          });
        }
      }

      if (ncertQuestionsToSeed.length > 0) {
        const tx = db.transaction('ncertQuestions', 'readwrite');
        const store = tx.objectStore('ncertQuestions');
        for (const q of ncertQuestionsToSeed) {
          await store.put(q);
        }
        await tx.done;
      }

      // Mark migration flag as active
      const updatedSettings = {
        ...DEFAULT_SETTINGS,
        ...appSettings,
        ncert_poorvi_verified_migrated_v3: true,
      };
      await db.put('settings', { key: 'app_settings', data: updatedSettings });
      console.log('[Migration] ✅ Successfully migrated NCERT solutions to verified Tiwari Academy structure!');
    }

    // Always run the math formula DB repair on app load to ensure clean single backslashes
    await repairMathFormulasInExistingDb();
  } catch (err) {
    console.error('[Migration] Failed to run verified NCERT solutions migration:', err);
  } finally {
    isMigrationRunning = false;
  }
}

export async function getAllNcertBooks(): Promise<NcertBook[]> {
  try {
    // Run migration if needed
    await migrateToVerifiedNcertSolutions();

    const db = await getDB();
    const tombstones = await getTombstonesForEntity('ncertBooks');
    const books = await db.getAll('ncertBooks');
    const validBooks = (books || []).filter(b => b && b.id && !tombstones.has(b.id));

    // Ensure verified Poorvi book is returned if no books exist
    if (!validBooks.some(b => b.id === CLASS_6_POORVI_BOOK.id) && !tombstones.has(CLASS_6_POORVI_BOOK.id)) {
      validBooks.unshift(CLASS_6_POORVI_BOOK);
    }

    // Global Dropdown Duplicate Fix:
    // Deduplicate books by classLevel + subject + edition so that duplicates NEVER appear in UI.
    // Every edition appears as a unique, single entry containing all its corresponding uploaded lesson files.
    const dedupedMap = new Map<string, NcertBook>();
    const toDeleteIds: string[] = [];

    for (const b of validBooks) {
      const classNorm = (b.classLevel || '').replace(/\D+/g, '');
      const subNorm = (b.subject || '').toLowerCase().trim();
      const rawEd = (b.edition || '2026-27').trim();
      const edNorm = rawEd.toLowerCase().trim();
      const dedupKey = `${classNorm}_${subNorm}_${edNorm}`;

      if (!dedupedMap.has(dedupKey)) {
        dedupedMap.set(dedupKey, {
          ...b,
          edition: rawEd,
          chapters: Array.isArray(b.chapters) ? [...b.chapters] : [],
          fileItems: Array.isArray(b.fileItems) ? [...b.fileItems] : [],
        });
      } else {
        // Merge chapters from duplicate book into canonical book
        const canonical = dedupedMap.get(dedupKey)!;
        const existingChIds = new Set((canonical.chapters || []).map(c => c.id));
        const existingFileKeys = new Set((canonical.chapters || []).map(c => 
          (c.fileName || c.chapterTitle || '').toLowerCase().trim()
        ));
        const mergedChapters = [...(canonical.chapters || [])];

        for (const ch of (b.chapters || [])) {
          const chKey = (ch.fileName || ch.chapterTitle || '').toLowerCase().trim();
          if (!existingChIds.has(ch.id) && (!chKey || !existingFileKeys.has(chKey))) {
            mergedChapters.push(ch);
            existingChIds.add(ch.id);
            if (chKey) existingFileKeys.add(chKey);
          }
        }
        canonical.chapters = mergedChapters;
        canonical.pageCount = Math.max(canonical.pageCount || 0, b.pageCount || 0);
        canonical.fileSize = (canonical.fileSize || 0) + (b.fileSize || 0);
        canonical.totalFiles = mergedChapters.length;
        canonical.processedFiles = mergedChapters.length;
        toDeleteIds.push(b.id);
      }
    }

    // Clean up duplicate records from IndexedDB in background
    if (toDeleteIds.length > 0) {
      try {
        const tx = db.transaction('ncertBooks', 'readwrite');
        for (const delId of toDeleteIds) {
          await tx.store.delete(delId);
        }
        await tx.done;
      } catch (_) {}
    }

    return Array.from(dedupedMap.values());
  } catch (error) {
    console.error('Error fetching NCERT books from IndexedDB:', error);
    return [CLASS_6_POORVI_BOOK];
  }
}

export async function getNcertBookById(id: string): Promise<NcertBook | undefined> {
  const db = await getDB();
  const tombstones = await getTombstonesForEntity('ncertBooks');
  if (tombstones.has(id)) return undefined;
  return await db.get('ncertBooks', id);
}

export async function saveNcertBook(book: NcertBook): Promise<void> {
  const now = Date.now();
  const enrichedBook: NcertBook = {
    ...book,
    updatedAt: book.updatedAt || new Date(now).toISOString(),
    updatedTimestamp: book.updatedTimestamp || now,
  };

  const db = await getDB();
  
  // Check for any existing duplicate book with exact same class, subject, and edition
  const allBooks = await db.getAll('ncertBooks');
  const classNorm = (book.classLevel || '').replace(/\D+/g, '');
  const subNorm = (book.subject || '').toLowerCase().trim();
  const rawEd = (book.edition || '2026-27').trim();
  const edNorm = rawEd.toLowerCase().trim();

  const duplicate = allBooks.find(b => {
    if (!b || b.id === book.id) return false;
    const bClass = (b.classLevel || '').replace(/\D+/g, '');
    const bSub = (b.subject || '').toLowerCase().trim();
    const bEd = (b.edition || '2026-27').toLowerCase().trim();
    return bClass === classNorm && bSub === subNorm && bEd === edNorm;
  });

  if (duplicate) {
    // Merge chapters and delete the duplicate entry so ONLY ONE ENTRY PER EDITION exists!
    const existingChIds = new Set((enrichedBook.chapters || []).map(c => c.id));
    const existingFileKeys = new Set((enrichedBook.chapters || []).map(c => 
      (c.fileName || c.chapterTitle || '').toLowerCase().trim()
    ));
    const mergedChapters = [...(enrichedBook.chapters || [])];
    for (const ch of (duplicate.chapters || [])) {
      const chKey = (ch.fileName || ch.chapterTitle || '').toLowerCase().trim();
      if (!existingChIds.has(ch.id) && (!chKey || !existingFileKeys.has(chKey))) {
        mergedChapters.push(ch);
        existingChIds.add(ch.id);
        if (chKey) existingFileKeys.add(chKey);
      }
    }
    enrichedBook.chapters = mergedChapters;
    enrichedBook.totalFiles = mergedChapters.length;
    enrichedBook.processedFiles = mergedChapters.length;
    try {
      await db.delete('ncertBooks', duplicate.id);
    } catch (_) {}
  }

  await db.put('ncertBooks', enrichedBook);
  if (book.id) {
    await removeTombstone('ncertBooks', book.id);
  }

  // Push immediately to server manifest in background for multi-device sync
  fetch('/api/ncert/books', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ book: enrichedBook }),
  }).catch((err) => console.warn('Background server book sync notice:', err));
}

export async function deleteNcertBook(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('ncertBooks', id);
  await recordTombstone('ncertBooks', id);

  // Also delete associated questions for this book
  const allQuestions = await db.getAll('ncertQuestions');
  const bookQuestions = (allQuestions || []).filter(q => q.bookId === id);
  if (bookQuestions.length > 0) {
    const tx = db.transaction('ncertQuestions', 'readwrite');
    const store = tx.objectStore('ncertQuestions');
    for (const q of bookQuestions) {
      await store.delete(q.id);
    }
    await tx.done;
    for (const q of bookQuestions) {
      await recordTombstone('ncertQuestions', q.id);
    }
  }

  // Propagate deletion to server manifest and physically unlinks files from disk
  try {
    await fetch(`/api/ncert/books/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  } catch (err) {
    console.warn('Background server book delete notice:', err);
  }
}

export async function deleteNcertChapter(bookId: string, chapterId: string): Promise<NcertBook | undefined> {
  const book = await getNcertBookById(bookId);
  if (!book) return undefined;

  const now = Date.now();
  const updatedChapters = (book.chapters || []).filter(ch => ch.id !== chapterId);
  let updatedBook: NcertBook = {
    ...book,
    chapters: updatedChapters,
    updatedAt: new Date(now).toISOString(),
    updatedTimestamp: now,
  };

  const db = await getDB();
  await db.put('ncertBooks', updatedBook);

  // Propagate chapter deletion to server (which permanently unlinks the physical PDF on disk)
  try {
    const res = await fetch(`/api/ncert/books/${encodeURIComponent(bookId)}/chapters/${encodeURIComponent(chapterId)}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.book) {
        updatedBook = data.book;
        await db.put('ncertBooks', updatedBook);
      }
    }
  } catch (err) {
    console.warn('Background server chapter delete notice:', err);
  }

  return updatedBook;
}

/**
 * Universal Multi-Device Auto-Sync Engine:
 * Compares client IndexedDB with server filesystem manifest using Last-Write-Wins (LWW)
 * and Tombstone protection. Updates from PC, Phone, or Tablet are synced immediately!
 */
export async function syncNcertBooksWithServer(): Promise<NcertBook[]> {
  try {
    const localBooks = await getAllNcertBooks();
    const tombstonesSet = await getTombstonesForEntity('ncertBooks');
    const clientTombstones = Array.from(tombstonesSet);

    const res = await fetch('/api/ncert/books/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientBooks: localBooks,
        clientLastModified: Date.now(),
        clientTombstones,
      }),
    });

    if (!res.ok) {
      return localBooks;
    }

    const data = await res.json();
    if (!data.success || !Array.isArray(data.books)) {
      return localBooks;
    }

    const serverBooks: NcertBook[] = data.books;
    const serverTombstones: string[] = Array.isArray(data.tombstones) ? data.tombstones : [];

    const db = await getDB();
    const tx = db.transaction(['ncertBooks', 'deletedRecords'], 'readwrite');
    const bookStore = tx.objectStore('ncertBooks');
    const tombStore = tx.objectStore('deletedRecords');

    // 1. Record any new tombstones from server
    for (const tombId of serverTombstones) {
      await bookStore.delete(tombId);
      await tombStore.put({
        id: `ncertBooks_${tombId}`,
        entity: 'ncertBooks',
        recordId: tombId,
        deletedAt: new Date().toISOString(),
      });
    }

    // 2. Put synced books into local IndexedDB with additive merging
    const mergedResultsMap = new Map<string, NcertBook>();

    // First add local non-tombstoned books
    for (const lBook of localBooks) {
      if (lBook && lBook.id && !serverTombstones.includes(lBook.id) && !tombstonesSet.has(lBook.id)) {
        mergedResultsMap.set(lBook.id, lBook);
      }
    }

    // Merge server books (adding or updating)
    for (const sBook of serverBooks) {
      if (sBook && sBook.id && !serverTombstones.includes(sBook.id) && !tombstonesSet.has(sBook.id)) {
        const local = mergedResultsMap.get(sBook.id);
        if (!local) {
          mergedResultsMap.set(sBook.id, sBook);
        } else {
          const sTime = sBook.updatedTimestamp || (sBook.updatedAt ? new Date(sBook.updatedAt).getTime() : 0);
          const lTime = local.updatedTimestamp || (local.updatedAt ? new Date(local.updatedAt).getTime() : 0);
          if (sTime >= lTime) {
            mergedResultsMap.set(sBook.id, sBook);
          }
        }
      }
    }

    const mergedResults = Array.from(mergedResultsMap.values());
    for (const b of mergedResults) {
      await bookStore.put(b);
    }

    await tx.done;
    return mergedResults;
  } catch (syncErr) {
    console.warn('Auto-sync with server failed, using local IndexedDB books:', syncErr);
    return await getAllNcertBooks();
  }
}

// ==========================================
// NCERT PDF STORAGE - LIGHTWEIGHT TEXT PATHS ONLY
// (Rule 5: Zero PDF binary data in IndexedDB)
// ==========================================

export async function saveNcertPdfBlob(hash: string, data?: ArrayBuffer | Uint8Array | Blob): Promise<void> {
  // Purged to strictly save lightweight text file paths instead of binary bloat
  return;
}

export async function getNcertPdfBlob(hash: string): Promise<ArrayBuffer | null> {
  // Always stream directly from local storage via /api/ncert/stream-pdf
  return null;
}

export async function deleteNcertPdfBlob(hash: string): Promise<void> {
  try {
    if (!hash) return;
    const db = await getDB();
    if (db.objectStoreNames.contains('ncertPdfBlobs')) {
      await db.delete('ncertPdfBlobs', hash);
    }
  } catch (_) {}
}

// ==========================================
// NCERT QUESTION STORE FUNCTIONS
// ==========================================

export async function getAllNcertQuestions(): Promise<NcertQuestion[]> {
  try {
    const db = await getDB();
    const tombstones = await getTombstonesForEntity('ncertQuestions');
    const questions = await db.getAll('ncertQuestions');
    return (questions || []).filter(q => q && q.id && !tombstones.has(q.id));
  } catch (error) {
    console.error('Error fetching NCERT questions from IndexedDB:', error);
    return [];
  }
}

export async function saveNcertQuestionsBatch(questions: NcertQuestion[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('ncertQuestions', 'readwrite');
  const store = tx.objectStore('ncertQuestions');
  for (const q of questions) {
    const cleanQ = sanitizeQuestionObject(q);
    await store.put(cleanQ);
  }
  await tx.done;
  for (const q of questions) {
    if (q.id) {
      await removeTombstone('ncertQuestions', q.id);
    }
  }
}

// ==========================================
// DAILY EXPORT CSV FILES STORE & CROSS-DEVICE SYNC
// ==========================================

export async function getAllDailyExportFiles(): Promise<DailyExportFile[]> {
  try {
    const db = await getDB();
    const tombstones = await getTombstonesForEntity('dailyExportFiles');
    const files = await db.getAll('dailyExportFiles');
    const cleanFiles = (files || []).filter((f: any) => f && f.id && !tombstones.has(f.id));
    return cleanFiles.sort((a: any, b: any) => {
      const tsA = a.updatedTimestamp || new Date(a.createdDate || 0).getTime();
      const tsB = b.updatedTimestamp || new Date(b.createdDate || 0).getTime();
      return tsB - tsA;
    });
  } catch (error) {
    console.error('Error fetching daily export files from IndexedDB:', error);
    return [];
  }
}

export async function saveDailyExportFile(file: DailyExportFile): Promise<void> {
  try {
    const db = await getDB();
    const record: DailyExportFile = {
      ...file,
      updatedTimestamp: file.updatedTimestamp || Date.now(),
      createdDate: file.createdDate || new Date().toISOString(),
      downloadStatus: file.downloadStatus || 'NOT DOWNLOADED',
    };
    await db.put('dailyExportFiles', record);
    if (record.id) {
      await removeTombstone('dailyExportFiles', record.id);
    }

    // Propagate to server for instant cross-device availability
    fetch('/api/ncert/csv-files', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
    }).catch(err => console.warn('Background server CSV save notice:', err));

    window.dispatchEvent(new CustomEvent('daily-export-files-changed', { detail: { file: record } }));
  } catch (err) {
    console.error('Failed to save daily export file:', err);
  }
}

export async function deleteDailyExportFile(id: string): Promise<void> {
  try {
    const db = await getDB();
    await db.delete('dailyExportFiles', id);
    await recordTombstone('dailyExportFiles', id);

    // Propagate deletion to server
    fetch(`/api/ncert/csv-files/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }).catch(err => console.warn('Background server CSV delete notice:', err));

    window.dispatchEvent(new CustomEvent('daily-export-files-changed', { detail: { deletedId: id } }));
  } catch (err) {
    console.error('Failed to delete daily export file:', err);
  }
}

export async function deleteDailyExportFilesBatch(ids: string[]): Promise<void> {
  for (const id of ids) {
    await deleteDailyExportFile(id);
  }
}

export async function clearAllDailyExportFiles(moduleId?: string): Promise<void> {
  const all = await getAllDailyExportFiles();
  for (const f of all) {
    if (!moduleId || f.moduleId === moduleId) {
      await deleteDailyExportFile(f.id);
    }
  }
}

export async function updateDailyExportFileStatus(id: string, status: 'DOWNLOADED' | 'NOT DOWNLOADED'): Promise<void> {
  try {
    const db = await getDB();
    const file = await db.get('dailyExportFiles', id);
    if (file) {
      const updated: DailyExportFile = {
        ...file,
        downloadStatus: status,
        downloadedDate: status === 'DOWNLOADED' ? new Date().toISOString() : file.downloadedDate,
        updatedTimestamp: Date.now(),
      };
      await db.put('dailyExportFiles', updated);

      fetch(`/api/ncert/csv-files/${encodeURIComponent(id)}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ downloadStatus: status }),
      }).catch(err => console.warn('Background server status update notice:', err));

      window.dispatchEvent(new CustomEvent('daily-export-files-changed', { detail: { file: updated } }));
    }
  } catch (err) {
    console.error('Failed to update daily export file status:', err);
  }
}

/**
 * Universal Multi-Device CSV Files Auto-Sync:
 * Syncs generated CSVs between client IndexedDB and server manifest
 */
export async function syncDailyExportFilesWithServer(): Promise<DailyExportFile[]> {
  try {
    const localFiles = await getAllDailyExportFiles();
    const tombstonesSet = await getTombstonesForEntity('dailyExportFiles');
    const clientTombstones = Array.from(tombstonesSet);

    const res = await fetch('/api/ncert/csv-files/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientFiles: localFiles,
        clientTombstones,
      }),
    });

    if (!res.ok) return localFiles;

    const data = await res.json();
    if (!data.success || !Array.isArray(data.files)) return localFiles;

    const serverFiles: DailyExportFile[] = data.files;
    const serverTombstones: string[] = Array.isArray(data.tombstones) ? data.tombstones : [];

    const db = await getDB();
    const tx = db.transaction(['dailyExportFiles', 'deletedRecords'], 'readwrite');
    const fileStore = tx.objectStore('dailyExportFiles');
    const tombStore = tx.objectStore('deletedRecords');

    for (const tombId of serverTombstones) {
      await fileStore.delete(tombId);
      await tombStore.put({
        id: `dailyExportFiles_${tombId}`,
        entity: 'dailyExportFiles',
        recordId: tombId,
        deletedAt: new Date().toISOString(),
      });
    }

    const mergedResults: DailyExportFile[] = [];
    for (const sFile of serverFiles) {
      if (sFile && sFile.id && !serverTombstones.includes(sFile.id) && !tombstonesSet.has(sFile.id)) {
        await fileStore.put(sFile);
        mergedResults.push(sFile);
      }
    }

    await tx.done;
    return mergedResults.sort((a, b) => {
      const tsA = a.updatedTimestamp || new Date(a.createdDate || 0).getTime();
      const tsB = b.updatedTimestamp || new Date(b.createdDate || 0).getTime();
      return tsB - tsA;
    });
  } catch (err) {
    console.warn('Auto-sync daily CSV files failed, using local IndexedDB:', err);
    return await getAllDailyExportFiles();
  }
}

// ==========================================
// CHAPTER THUMBNAIL CACHE & PERMANENT MATCHING
// ==========================================

export async function saveChapterThumbnail(record: ChapterThumbnailRecord): Promise<void> {
  if (!record || !record.thumbnailDataUrl) return;
  try {
    fetch('/api/ncert/chapter-thumbnails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
    }).catch(err => console.warn('Background server chapter thumbnail save notice:', err));
  } catch (_) {}
}




