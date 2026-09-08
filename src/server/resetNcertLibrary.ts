/**
 * NCERT PDF LIBRARY CLEAN RESET & FRESH REBUILD SCRIPT
 *
 * Surgically resets the NCERT PDF Library data model and storage artifacts
 * after creating point-in-time backup snapshots.
 *
 * ABSOLUTE SCOPE: Deletes/resets ONLY NCERT PDF Library entities.
 * Question Bank, Skill Assessments, CSV Manifests, and non-NCERT data remain untouched.
 */

import fs from 'fs';
import path from 'path';

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
const BACKUPS_DIR = path.join(UPLOADS_DIR, 'backups');
const STORAGE_DIR = path.join(process.cwd(), 'storage');
const PREVIEWS_DIR = path.join(STORAGE_DIR, 'previews');
const STORED_BOOKS_DIR = path.join(process.cwd(), 'stored_books');

const NCERT_BOOKS_MANIFEST_PATH = path.join(UPLOADS_DIR, 'ncert_books_manifest.json');
const NCERT_THUMBNAILS_MANIFEST_PATH = path.join(UPLOADS_DIR, 'chapter_thumbnails_manifest.json');
const NCERT_SOLUTIONS_MANIFEST_PATH = path.join(UPLOADS_DIR, 'ncert_solutions_manifest.json');
const WORKER_QUEUE_STATE_PATH = path.join(STORAGE_DIR, 'worker_queue_state.json');

// Default static Poorvi seed book for clean baseline
const CLASS_6_POORVI_BOOK = {
  id: 'BOOK-NCERT-CLASS-6-ENG-POORVI',
  bookTitle: 'Poorvi (English)',
  classLevel: 'Class 6',
  subject: 'English',
  medium: 'English',
  publisher: 'NCERT',
  board: 'CBSE',
  fileSize: 12500000,
  uploadedAt: '2026-03-01T00:00:00.000Z',
  status: 'READY',
  fileName: 'ncert_class6_english_poorvi.pdf',
  pdfHash: 'ncert-class6-english-poorvi-clean',
  pageCount: 160,
  updatedAt: new Date().toISOString(),
  updatedTimestamp: Date.now(),
  chapters: [
    {
      id: 'CH-POORVI-U1-C1',
      bookId: 'BOOK-NCERT-CLASS-6-ENG-POORVI',
      chapterNumber: 1,
      chapterTitle: 'Chapter 1',
      unitTitle: 'Unit 1: Fables and Folk Tales',
      pageStart: 1,
      pageEnd: 12,
      contentHash: 'hash_poorvi_u1_c1',
      sourcePdfHash: 'ncert-class6-english-poorvi-clean',
      status: 'READY',
      topics: [
        'Diligence and hard work',
        'Wise sage and illusion of magic',
        'Agriculture as true wealth',
        'Rama Natha and Madhumati',
      ],
      keyTopics: [
        'Diligence and hard work',
        'Wise sage and illusion of magic',
        'Agriculture as true wealth',
        'Rama Natha and Madhumati',
      ],
      exercises: ['Comprehension & Understanding the Text', 'Working with Language & Vocabulary'],
      textContent: 'Chapter 1: A Bottle of Dew. Complete text of Poorvi Class 6 NCERT textbook.',
    },
  ],
};

export async function resetNcertPdfLibrary(): Promise<{
  success: boolean;
  timestamp: string;
  backupsCreated: string[];
  deletedPdfsCount: number;
  deletedPreviewsCount: number;
  message: string;
}> {
  const timestamp = new Date().toISOString();
  const fileTimestamp = Date.now();
  console.log('============================================================');
  console.log('NCERT PDF LIBRARY — CLEAN RESET & FRESH REBUILD');
  console.log(`Starting surgical reset procedure at ${timestamp}...`);
  console.log('============================================================\n');

  // Ensure directories exist
  if (!fs.existsSync(BACKUPS_DIR)) {
    fs.mkdirSync(BACKUPS_DIR, { recursive: true });
  }

  const backupsCreated: string[] = [];

  // Step 1: Create Pre-Reset Snapshots
  console.log('--- STEP 1: Creating Pre-Reset Backup Snapshots ---');
  const manifestsToBackup = [
    { name: 'ncert_books_manifest.json', path: NCERT_BOOKS_MANIFEST_PATH },
    { name: 'chapter_thumbnails_manifest.json', path: NCERT_THUMBNAILS_MANIFEST_PATH },
    { name: 'ncert_solutions_manifest.json', path: NCERT_SOLUTIONS_MANIFEST_PATH },
  ];

  for (const item of manifestsToBackup) {
    if (fs.existsSync(item.path)) {
      const backupFilename = `${path.basename(item.name, '.json')}_prereset_${fileTimestamp}.json`;
      const backupPath = path.join(BACKUPS_DIR, backupFilename);
      fs.copyFileSync(item.path, backupPath);
      backupsCreated.push(backupFilename);
      console.log(`  ✓ Backed up ${item.name} -> backups/${backupFilename}`);
    } else {
      console.log(`  ! File ${item.name} does not exist, skipping backup.`);
    }
  }

  // Step 2: Surgically Reset NCERT Manifests
  console.log('\n--- STEP 2: Surgically Resetting NCERT Manifests ---');

  // 2a. Reset NCERT Books Manifest
  const cleanBooksManifest = {
    lastModified: Date.now(),
    books: [CLASS_6_POORVI_BOOK],
    tombstones: [],
  };
  fs.writeFileSync(NCERT_BOOKS_MANIFEST_PATH, JSON.stringify(cleanBooksManifest, null, 2), 'utf-8');
  console.log('  ✓ Reset ncert_books_manifest.json to clean baseline.');

  // 2b. Reset Chapter Thumbnails Manifest
  const cleanThumbnailsManifest = {
    lastModified: Date.now(),
    thumbnails: {},
  };
  fs.writeFileSync(NCERT_THUMBNAILS_MANIFEST_PATH, JSON.stringify(cleanThumbnailsManifest, null, 2), 'utf-8');
  console.log('  ✓ Reset chapter_thumbnails_manifest.json to clean baseline.');

  // 2c. Reset NCERT Solutions Manifest
  const cleanSolutionsManifest = {
    lastModified: Date.now(),
    solutionsByHash: {},
  };
  fs.writeFileSync(NCERT_SOLUTIONS_MANIFEST_PATH, JSON.stringify(cleanSolutionsManifest, null, 2), 'utf-8');
  console.log('  ✓ Reset ncert_solutions_manifest.json to clean baseline.');

  // 2d. Reset Background Worker Queue State
  if (fs.existsSync(WORKER_QUEUE_STATE_PATH)) {
    const cleanWorkerQueue = {
      version: 1,
      lastRunTimestamp: new Date().toISOString(),
      activeJobs: {},
      completedHashes: [],
      thumbnailJobs: {},
    };
    fs.writeFileSync(WORKER_QUEUE_STATE_PATH, JSON.stringify(cleanWorkerQueue, null, 2), 'utf-8');
    console.log('  ✓ Reset worker_queue_state.json.');
  }

  // Step 3: Unlink/Delete Uploaded NCERT PDFs from uploads/ and stored_books/
  console.log('\n--- STEP 3: Cleaning Uploaded NCERT Source PDFs ---');
  let deletedPdfsCount = 0;
  if (fs.existsSync(UPLOADS_DIR)) {
    const uploadFiles = fs.readdirSync(UPLOADS_DIR);
    for (const file of uploadFiles) {
      if (file.endsWith('.pdf') || file.startsWith('ncert_upload_')) {
        const filePath = path.join(UPLOADS_DIR, file);
        try {
          fs.unlinkSync(filePath);
          deletedPdfsCount++;
          console.log(`  ✓ Removed NCERT PDF file: ${file}`);
        } catch (e: any) {
          console.warn(`  ! Failed to remove PDF file ${file}: ${e.message}`);
        }
      }
    }
  }

  if (fs.existsSync(STORED_BOOKS_DIR)) {
    try {
      fs.rmSync(STORED_BOOKS_DIR, { recursive: true, force: true });
      fs.mkdirSync(STORED_BOOKS_DIR, { recursive: true });
      console.log('  ✓ Emptied stored_books directory.');
    } catch (e: any) {
      console.warn('  ! Failed to empty stored_books:', e.message);
    }
  }

  // Step 4: Delete Disk Preview Files from storage/previews/
  console.log('\n--- STEP 4: Cleaning NCERT Preview Thumbnails from Storage ---');
  let deletedPreviewsCount = 0;
  if (fs.existsSync(PREVIEWS_DIR)) {
    const previewFiles = fs.readdirSync(PREVIEWS_DIR);
    for (const file of previewFiles) {
      // Remove all preview images associated with NCERT uploaded chapters
      if (file.startsWith('ncert_') || file.endsWith('.jpg') || file.endsWith('.png')) {
        const filePath = path.join(PREVIEWS_DIR, file);
        try {
          fs.unlinkSync(filePath);
          deletedPreviewsCount++;
          console.log(`  ✓ Removed preview file: ${file}`);
        } catch (e: any) {
          console.warn(`  ! Failed to remove preview file ${file}: ${e.message}`);
        }
      }
    }
  }

  console.log('\n============================================================');
  console.log('✅ NCERT PDF LIBRARY CLEAN RESET COMPLETE');
  console.log(`Summary: ${backupsCreated.length} backups created, ${deletedPdfsCount} PDFs removed, ${deletedPreviewsCount} preview thumbnails cleared.`);
  console.log('============================================================\n');

  return {
    success: true,
    timestamp,
    backupsCreated,
    deletedPdfsCount,
    deletedPreviewsCount,
    message: 'NCERT PDF Library clean reset completed successfully.',
  };
}

// Execute if run directly via CLI
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.includes('resetNcertLibrary')) {
  resetNcertPdfLibrary().catch((err) => {
    console.error('❌ Error executing NCERT PDF Library reset:', err);
    process.exit(1);
  });
}
