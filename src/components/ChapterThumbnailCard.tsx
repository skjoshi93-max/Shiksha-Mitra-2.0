import React from 'react';
import { BookOpen, FileText, Trash2 } from 'lucide-react';
import { NcertChapter } from '../types';

interface ChapterThumbnailCardProps {
  chapter: NcertChapter;
  bookTitle: string;
  classLevel: string;
  subject: string;
  publisher: string;
  sourcePdfHash: string;
  onViewPdf: (chapter: NcertChapter) => void;
  onDeleteChapter?: (chapterId: string) => void;
}

export const ChapterThumbnailCard: React.FC<ChapterThumbnailCardProps> = ({
  chapter,
  bookTitle,
  classLevel,
  subject,
  publisher,
  sourcePdfHash,
  onViewPdf,
  onDeleteChapter,
}) => {
  const parseChapterNo = (numVal: string | number): number => {
    if (typeof numVal === 'number') return numVal;
    const extracted = numVal?.match(/\d+/);
    return extracted ? parseInt(extracted[0], 10) : (typeof chapter.chapterNumber === 'number' ? chapter.chapterNumber : 1);
  };

  const chNum = parseChapterNo(chapter.chapterNumber);
  // Global File Name Parsing Fix: Strictly use and display the EXACT original file name / chapter title without auto-prefixing
  const displayTitle = chapter.chapterTitle || chapter.originalFileName?.replace(/\.pdf$/i, '') || chapter.fileName?.replace(/\.pdf$/i, '') || `Chapter ${chNum}`;

  const finalPageStart = chapter.pageStart || 1;
  const finalPageEnd = chapter.pageEnd || chapter.pages || finalPageStart;
  const pageRangeText = finalPageEnd && finalPageEnd > finalPageStart 
    ? `Page ${finalPageStart} to ${finalPageEnd}` 
    : `Page ${finalPageStart}`;

  return (
    <div
      id={`chapter-card-${chapter.id}`}
      className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
    >
      <div>
        {/* 3D Premium Vector File/Folder Illustration Card */}
        <a
          href={chapter.filePath ? `/api/ncert/stream-pdf?path=${encodeURIComponent(chapter.filePath)}&hash=${sourcePdfHash}` : `/api/pdf/${sourcePdfHash}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => {
            if (!e.ctrlKey && !e.metaKey && e.button === 0) {
              e.preventDefault();
              onViewPdf(chapter);
            }
          }}
          className="relative rounded-2xl overflow-hidden aspect-[16/10] bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-950 mb-4 border border-slate-100 dark:border-slate-800 shadow-inner flex flex-col justify-between p-3.5 select-none cursor-pointer group-hover:border-indigo-400/50 transition-all block"
        >
          {/* Background Ambient Glow */}
          <div className="absolute -top-8 -right-8 w-28 h-28 bg-indigo-500/20 rounded-full blur-xl pointer-events-none" />
          <div className="absolute -bottom-8 -left-8 w-28 h-28 bg-purple-500/20 rounded-full blur-xl pointer-events-none" />

          {/* Header Badges */}
          <div className="relative z-10 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-200 bg-indigo-950/85 px-2.5 py-1 rounded-lg backdrop-blur-xs border border-indigo-800/50 shadow-xs">
              NCERT {classLevel}
            </span>
            <span className="text-[10px] font-bold text-slate-200 bg-slate-900/85 px-2.5 py-1 rounded-lg border border-slate-700/50 backdrop-blur-xs shadow-xs">
              {subject}
            </span>
          </div>

          {/* Authentic First-Page PDF Cover Snapshot or Vector Illustration Fallback */}
          {chapter.thumbnailDataUrl ? (
            <div className="absolute inset-0 z-0 bg-slate-900 overflow-hidden">
              <img
                src={chapter.thumbnailDataUrl}
                alt={displayTitle}
                className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-slate-950/60 pointer-events-none" />
            </div>
          ) : (
            /* Central 3D Vector Folder / Document Graphic Fallback */
            <div className="my-auto flex flex-col items-center justify-center relative z-10 py-1">
              <div className="relative w-20 h-16 group-hover:scale-105 transition-transform duration-300">
                <svg viewBox="0 0 120 100" className="w-full h-full drop-shadow-2xl" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Back Folder Layer */}
                  <path d="M10 25C10 21.6863 12.6863 19 16 19H45L55 29H104C107.314 29 110 31.6863 110 35V81C110 84.3137 107.314 87 104 87H16C12.6863 87 10 84.3137 10 81V25Z" fill="url(#folderBack)" />
                  {/* Document Sheet */}
                  <rect x="25" y="12" width="70" height="50" rx="6" fill="url(#docGradient)" />
                  <rect x="35" y="22" width="40" height="5" rx="2.5" fill="#6366f1" opacity="0.8" />
                  <rect x="35" y="32" width="50" height="4" rx="2" fill="#a5b4fc" opacity="0.7" />
                  <rect x="35" y="41" width="30" height="4" rx="2" fill="#a5b4fc" opacity="0.7" />
                  {/* Front Folder Flap */}
                  <path d="M10 37C10 33.6863 12.6863 31 16 31H104C107.314 31 110 33.6863 110 37V83C110 86.3137 107.314 89 104 89H16C12.6863 89 10 86.3137 10 83V37Z" fill="url(#folderFront)" />
                  {/* Glowing Badge */}
                  <circle cx="92" cy="62" r="10" fill="#4f46e5" />
                  <path d="M88 62L91 65L97 59" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  <defs>
                    <linearGradient id="folderBack" x1="10" y1="19" x2="110" y2="87" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#312e81" />
                      <stop offset="1" stopColor="#1e1b4b" />
                    </linearGradient>
                    <linearGradient id="folderFront" x1="10" y1="31" x2="110" y2="89" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#4f46e5" />
                      <stop offset="1" stopColor="#3730a3" />
                    </linearGradient>
                    <linearGradient id="docGradient" x1="25" y1="12" x2="95" y2="62" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#ffffff" />
                      <stop offset="1" stopColor="#e0e7ff" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>
          )}

          {/* Bottom Floating Badges */}
          <div className="relative z-10 flex items-center justify-between pt-1">
            <div className="flex items-center gap-1.5">
              <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-indigo-600 text-white shadow-xs">
                Ch {chNum}
              </span>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-600 text-white shadow-xs">
                PDF
              </span>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-slate-900/90 text-slate-200 backdrop-blur-md">
              Page {finalPageStart}
            </span>
          </div>
        </a>

        {/* Chapter Title & Page info */}
        <h4 className="text-sm font-black text-slate-900 dark:text-white line-clamp-2 leading-snug mb-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
          {displayTitle}
        </h4>
        <p className="text-xs font-bold text-slate-400 dark:text-slate-500 mb-4">
          {pageRangeText}
        </p>
      </div>

      {/* Direct Open PDF Button & Delete Action */}
      <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
        <a
          id={`view-chapter-pdf-${chapter.id}`}
          href={chapter.filePath ? `/api/ncert/stream-pdf?path=${encodeURIComponent(chapter.filePath)}&hash=${sourcePdfHash}` : `/api/pdf/${sourcePdfHash}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => {
            if (!e.ctrlKey && !e.metaKey && e.button === 0) {
              e.preventDefault();
              onViewPdf(chapter);
            }
          }}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white dark:bg-indigo-950/60 dark:hover:bg-indigo-600 dark:text-indigo-300 dark:hover:text-white font-extrabold text-xs transition-all cursor-pointer"
        >
          <BookOpen className="h-3.5 w-3.5" />
          <span>View Chapter PDF</span>
        </a>

        {onDeleteChapter && (
          <button
            onClick={() => onDeleteChapter(chapter.id)}
            className="p-2.5 rounded-xl bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-600 dark:bg-slate-800 dark:hover:bg-red-950/50 dark:text-slate-400 dark:hover:text-red-400 transition-all cursor-pointer"
            title="Delete Chapter"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
