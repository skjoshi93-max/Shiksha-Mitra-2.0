import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Upload,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Loader2,
  Sparkles,
  Eye,
  Layers,
  Search,
  ZoomIn,
} from 'lucide-react';
import { renderPdfPage, RenderPdfPageResult } from '../lib/pdfThumbnailRenderer';
import { getNcertPdfBlob, getAllNcertBooks } from '../lib/db';
import { NcertBook } from '../types';

export interface PdfPageSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPage: (dataUrl: string, pageNumber: number, numPages: number) => void;
  initialPdfHash?: string;
  initialPageNumber?: number;
  chapterTitle?: string;
  classLevel?: string;
  subject?: string;
}

export const PdfPageSelectorModal: React.FC<PdfPageSelectorModalProps> = ({
  isOpen,
  onClose,
  onSelectPage,
  initialPdfHash,
  initialPageNumber = 1,
  chapterTitle,
  classLevel,
  subject,
}) => {
  const [pdfSource, setPdfSource] = useState<ArrayBuffer | Uint8Array | string | Blob | null>(null);
  const [pdfFileName, setPdfFileName] = useState<string>('');
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(initialPageNumber);
  const [renderedPages, setRenderedPages] = useState<Record<number, RenderPdfPageResult>>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [renderingPageNumber, setRenderingPageNumber] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filterPageInput, setFilterPageInput] = useState<string>('');

  const [availableBooks, setAvailableBooks] = useState<NcertBook[]>([]);
  const [selectedBookHash, setSelectedBookHash] = useState<string>(initialPdfHash || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load available books for switching PDFs
  useEffect(() => {
    if (!isOpen) return;
    async function loadBooks() {
      try {
        const list = await getAllNcertBooks();
        setAvailableBooks(list || []);
      } catch (err) {
        console.warn('Failed to load books for dropdown:', err);
      }
    }
    loadBooks();
  }, [isOpen]);

  // Sync selectedBookHash with initialPdfHash when it changes
  useEffect(() => {
    if (initialPdfHash) {
      setSelectedBookHash(initialPdfHash);
    }
  }, [initialPdfHash]);

  // Initialize PDF source from selectedBookHash or API
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    async function loadInitialPdf() {
      if (!selectedBookHash) {
        setPdfSource(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // 1. Check IndexedDB
        const localBlob = await getNcertPdfBlob(selectedBookHash);
        if (localBlob && isMounted) {
          setPdfSource(localBlob);
          setPdfFileName(`${selectedBookHash}.pdf`);
          return;
        }

        // 2. Fall back to /api/pdf/:hash URL
        const pdfUrl = `/api/pdf/${selectedBookHash}`;
        setPdfSource(pdfUrl);
        const bk = availableBooks.find(b => b.pdfHash === selectedBookHash);
        setPdfFileName(bk ? bk.bookTitle : `${selectedBookHash}.pdf`);
      } catch (err: any) {
        if (isMounted) setError('Could not load PDF document from storage: ' + (err.message || String(err)));
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadInitialPdf();
  }, [isOpen, selectedBookHash, availableBooks]);

  // Load page 1 and page count once pdfSource is ready
  useEffect(() => {
    if (!pdfSource || !isOpen) return;

    let isMounted = true;
    async function initPageDetails() {
      setLoading(true);
      setError(null);

      try {
        const firstPageResult = await renderPdfPage(pdfSource, initialPageNumber || 1, {
          maxWidth: 360,
          cacheKey: initialPdfHash || 'modal_pdf',
        });

        if (isMounted) {
          setNumPages(firstPageResult.numPages);
          setCurrentPage(firstPageResult.pageNumber);
          setRenderedPages((prev) => ({
            ...prev,
            [firstPageResult.pageNumber]: firstPageResult,
          }));
        }
      } catch (err: any) {
        if (isMounted) {
          setError('Failed to render PDF page. Please ensure the PDF is valid: ' + (err.message || String(err)));
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    initPageDetails();
  }, [pdfSource, isOpen, initialPageNumber, initialPdfHash]);

  // Render a specific page when requested
  const fetchPageThumbnail = async (pageNum: number) => {
    if (!pdfSource || pageNum < 1 || (numPages > 0 && pageNum > numPages)) return;
    if (renderedPages[pageNum]) {
      setCurrentPage(pageNum);
      return;
    }

    setRenderingPageNumber(pageNum);
    try {
      const result = await renderPdfPage(pdfSource, pageNum, {
        maxWidth: 360,
        cacheKey: initialPdfHash || 'modal_pdf',
      });

      setRenderedPages((prev) => ({
        ...prev,
        [pageNum]: result,
      }));
      setCurrentPage(pageNum);
    } catch (err: any) {
      console.warn(`Error rendering page ${pageNum}:`, err);
    } finally {
      setRenderingPageNumber(null);
    }
  };

  // Handle local file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setError('Selected file is not a valid PDF document.');
      return;
    }

    setError(null);
    setRenderedPages({});
    setPdfFileName(file.name);
    setPdfSource(file);
  };

  // Confirm selection
  const handleConfirmSelection = async () => {
    if (!pdfSource) return;

    setLoading(true);
    try {
      // Render high-res snapshot for final output
      const highResResult = await renderPdfPage(pdfSource, currentPage, {
        maxWidth: 640,
        quality: 0.92,
        cacheKey: initialPdfHash || 'modal_pdf',
      });

      onSelectPage(highResResult.dataUrl, currentPage, numPages || 1);
      onClose();
    } catch (err: any) {
      setError('Failed to extract final high-res cover: ' + (err.message || String(err)));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const currentResult = renderedPages[currentPage];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl relative flex flex-col max-h-[92vh] overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 flex items-center justify-center font-bold">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-teal-600 dark:text-teal-400 uppercase tracking-wider">
                  PDF Page Selector
                </span>
                {classLevel && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {classLevel} • {subject || 'Subject'}
                  </span>
                )}
              </div>
              <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white line-clamp-1">
                {chapterTitle || 'Select Cover Page from PDF Document'}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1">
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-bold flex items-center justify-between">
              <span>{error}</span>
              <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Top Control Bar: Upload PDF or Browse Existing */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-slate-100/70 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1 min-w-0">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 truncate">
                <FileText className="h-4 w-4 text-teal-600 shrink-0" />
                <span className="truncate max-w-[180px]" title={pdfFileName}>{pdfFileName || 'No PDF Document Selected'}</span>
                {numPages > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-teal-600 text-white text-[10px] font-extrabold shrink-0">
                    {numPages} Pages
                  </span>
                )}
              </div>

              {availableBooks.length > 0 && (
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider shrink-0">PDF Source:</span>
                  <select
                    value={selectedBookHash}
                    onChange={(e) => {
                      setSelectedBookHash(e.target.value);
                      setRenderedPages({});
                      setCurrentPage(1);
                    }}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs font-bold rounded-xl px-2 py-1.5 outline-none w-full max-w-sm truncate focus:ring-2 focus:ring-teal-500 cursor-pointer"
                  >
                    <option value="">-- Select from uploaded system PDFs --</option>
                    {availableBooks.map((bk) => (
                      <option key={bk.pdfHash} value={bk.pdfHash}>
                        [{bk.classLevel} - {bk.subject}] {bk.bookTitle}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-extrabold border border-slate-200 dark:border-slate-700 transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
              >
                <Upload className="h-3.5 w-3.5 text-teal-600" /> Upload Other PDF
              </button>
            </div>
          </div>

          {/* Main Work Area: Active Preview Box + Navigation Side */}
          {loading ? (
            <div className="py-20 text-center space-y-3">
              <Loader2 className="h-10 w-10 text-teal-600 animate-spin mx-auto" />
              <p className="text-xs font-extrabold text-slate-600 dark:text-slate-400">
                Loading & Rendering PDF Page Canvas...
              </p>
            </div>
          ) : !pdfSource ? (
            <div className="py-16 text-center space-y-4 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-6">
              <Upload className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto" />
              <div className="space-y-1">
                <h4 className="text-sm font-extrabold text-slate-800 dark:text-slate-200">No PDF Source Loaded</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Upload a PDF document to browse pages and select the exact page you wish to set as the cover thumbnail.
                </p>
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-black shadow-md cursor-pointer inline-flex items-center gap-2"
              >
                <Upload className="h-4 w-4" /> Select PDF File
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
              {/* Left View: High-Res Active Page Display Box */}
              <div className="md:col-span-7 bg-slate-950 rounded-2xl p-4 border border-slate-800 space-y-3 flex flex-col justify-between min-h-[360px]">
                <div className="relative aspect-[3/4] max-h-[380px] w-full bg-slate-900 rounded-xl overflow-hidden flex items-center justify-center border border-slate-800/80 mx-auto">
                  {currentResult ? (
                    <img
                      src={currentResult.dataUrl}
                      alt={`Page ${currentPage}`}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="text-center space-y-2">
                      <Loader2 className="h-8 w-8 text-teal-500 animate-spin mx-auto" />
                      <span className="text-xs font-bold text-slate-400 block">Rendering Page {currentPage}...</span>
                    </div>
                  )}

                  {/* Page Badge Overlay */}
                  <div className="absolute top-2.5 left-2.5 bg-slate-900/90 text-white px-2.5 py-1 rounded-lg text-xs font-extrabold border border-slate-700/80 backdrop-blur-xs">
                    Page {currentPage} {numPages > 0 ? `of ${numPages}` : ''}
                  </div>
                </div>

                {/* Page Scrubbing Buttons */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                  <button
                    onClick={() => fetchPageThumbnail(currentPage - 1)}
                    disabled={currentPage <= 1 || renderingPageNumber !== null}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-extrabold disabled:opacity-40 transition-all cursor-pointer flex items-center gap-1"
                  >
                    <ChevronLeft className="h-4 w-4" /> Prev Page
                  </button>

                  <span className="text-xs font-mono font-bold text-slate-300">
                    {currentPage} / {numPages}
                  </span>

                  <button
                    onClick={() => fetchPageThumbnail(currentPage + 1)}
                    disabled={currentPage >= numPages || renderingPageNumber !== null}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-extrabold disabled:opacity-40 transition-all cursor-pointer flex items-center gap-1"
                  >
                    Next Page <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Right View: Quick Jump Grid & Page Selection Controls */}
              <div className="md:col-span-5 space-y-4">
                <div className="space-y-1">
                  <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="h-4 w-4 text-teal-600" /> Page Thumbnails
                  </h4>
                  <p className="text-[11px] text-slate-500 leading-snug">
                    Click any page thumbnail below to inspect and select it as the permanent cover image.
                  </p>
                </div>

                {/* Quick Page Jump Input */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="number"
                      min={1}
                      max={numPages || 1}
                      placeholder="Jump to page #..."
                      value={filterPageInput}
                      onChange={(e) => setFilterPageInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const p = parseInt(filterPageInput, 10);
                          if (p >= 1 && p <= numPages) {
                            fetchPageThumbnail(p);
                            setFilterPageInput('');
                          }
                        }
                      }}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs font-bold rounded-xl pl-8 pr-3 py-2 outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <button
                    onClick={() => {
                      const p = parseInt(filterPageInput, 10);
                      if (p >= 1 && p <= numPages) {
                        fetchPageThumbnail(p);
                        setFilterPageInput('');
                      }
                    }}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold cursor-pointer"
                  >
                    Go
                  </button>
                </div>

                {/* Page Numbers Thumbnail Grid */}
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-[220px] overflow-y-auto p-1.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
                  {(() => {
                    const totalToShow = 25;
                    const startPage = Math.max(1, currentPage - Math.floor(totalToShow / 2));
                    const endPage = Math.min(numPages || 1, startPage + totalToShow - 1);
                    const finalStartPage = Math.max(1, endPage - totalToShow + 1);
                    return Array.from({ length: (endPage - finalStartPage + 1) }, (_, i) => finalStartPage + i).map((pNum) => {
                      const isSelected = currentPage === pNum;
                      return (
                        <button
                          key={pNum}
                          onClick={() => fetchPageThumbnail(pNum)}
                          className={`aspect-[3/4] rounded-xl border p-1 text-center font-extrabold text-xs transition-all relative overflow-hidden cursor-pointer flex flex-col items-center justify-center ${
                            isSelected
                              ? 'bg-teal-600 text-white border-teal-500 ring-2 ring-teal-400 shadow-md'
                              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-teal-500'
                          }`}
                        >
                          {renderedPages[pNum]?.dataUrl ? (
                            <img
                              src={renderedPages[pNum].dataUrl}
                              alt={`Pg ${pNum}`}
                              className="w-full h-full object-cover rounded-lg"
                            />
                          ) : (
                            <span>P.{pNum}</span>
                          )}
                          <span className="absolute bottom-1 right-1 bg-slate-900/80 text-white px-1 rounded text-[8px] font-mono">
                            {pNum}
                          </span>
                        </button>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold hover:bg-slate-200 cursor-pointer"
          >
            Cancel
          </button>

          <button
            onClick={handleConfirmSelection}
            disabled={!pdfSource || loading || !currentResult}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:brightness-105 active:scale-95 text-white text-xs font-black shadow-md shadow-teal-600/20 disabled:opacity-50 transition-all cursor-pointer flex items-center gap-2"
          >
            <Check className="h-4 w-4" /> Set Page {currentPage} as Chapter Cover
          </button>
        </div>
      </div>
    </div>
  );
};
