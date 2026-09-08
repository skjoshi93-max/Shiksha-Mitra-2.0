import React, { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Minimize2,
  Download, 
  X, 
  BookOpen, 
  RotateCw,
  AlertTriangle,
  Loader2,
  Sun,
  Moon,
  Sparkles
} from 'lucide-react';
import { getNcertPdfBlob, saveNcertPdfBlob } from '../lib/db';

// Configure pdfjs worker safely
if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
  } catch (_) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.10.38'}/pdf.worker.min.mjs`;
  }
}

export interface InteractivePdfViewerProps {
  pdfUrl?: string;
  fallbackUrls?: string[];
  sourcePdfHash?: string;
  pdfBuffer?: ArrayBuffer;
  pdfData?: any;
  title: string;
  initialPage?: number;
  subtitle?: string;
  theme?: 'light' | 'dark';
  onClose?: () => void;
}

export const InteractivePdfViewer: React.FC<InteractivePdfViewerProps> = ({
  pdfUrl = '',
  fallbackUrls = [],
  sourcePdfHash,
  pdfBuffer,
  pdfData,
  title,
  initialPage = 1,
  subtitle,
  theme: initialTheme = 'dark',
  onClose,
}) => {
  const [theme, setTheme] = useState<'light' | 'dark'>(initialTheme);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(initialPage);
  const [scale, setScale] = useState<number>(1.0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [pageInput, setPageInput] = useState<string>(String(initialPage));
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isFlipping, setIsFlipping] = useState<boolean>(false);
  const [flipDirection, setFlipDirection] = useState<'next' | 'prev' | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const pageCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const activeRenderTaskRef = useRef<any>(null);

  // Load PDF document with IndexedDB caching and candidate fallbacks
  useEffect(() => {
    let isMounted = true;

    const loadPdf = async () => {
      setLoading(true);
      setError(null);

      let effectiveHash = sourcePdfHash || '';
      if (pdfUrl) {
        const hashMatch = pdfUrl.match(/\/api\/pdf\/([a-zA-Z0-9_-]+)/);
        if (hashMatch && hashMatch[1]) {
          effectiveHash = hashMatch[1];
        }
      }
      if (!effectiveHash) {
        effectiveHash = 'ncert-book-pdf';
      }

      let loadedBuffer: ArrayBuffer | null = pdfBuffer || null;

      // 1. Check local IndexedDB binary cache
      if (!loadedBuffer) {
        try {
          if (effectiveHash) {
            loadedBuffer = await getNcertPdfBlob(effectiveHash);
          }
        } catch (dbErr) {
          console.warn('IndexedDB PDF cache check notice:', dbErr);
        }
      }

      // 2. Fetch from candidate URLs
      if (!loadedBuffer) {
        const candidateUrls = [
          pdfUrl,
          ...fallbackUrls,
          ...(effectiveHash ? [`/api/pdf/${effectiveHash}`] : []),
        ].filter((u, idx, arr) => Boolean(u) && arr.indexOf(u) === idx);

        let lastErr = 'Unable to fetch PDF document';
        for (const urlToFetch of candidateUrls) {
          if (!isMounted) return;
          try {
            const res = await fetch(urlToFetch);
            if (res.ok) {
              const buffer = await res.arrayBuffer();
              if (buffer && buffer.byteLength > 100) {
                loadedBuffer = buffer;
                if (effectiveHash) {
                  saveNcertPdfBlob(effectiveHash, buffer).catch(() => {});
                }
                break;
              }
            } else {
              lastErr = `HTTP ${res.status} from ${urlToFetch}`;
            }
          } catch (fetchErr: any) {
            lastErr = fetchErr?.message || 'Network error fetching PDF';
          }
        }

        if (!loadedBuffer) {
          if (!isMounted) return;
          setError(lastErr);
          setLoading(false);
          return;
        }
      }

      if (!isMounted) return;

      try {
        const dataCopy = loadedBuffer instanceof ArrayBuffer
          ? new Uint8Array(loadedBuffer.slice(0))
          : new Uint8Array(loadedBuffer);
        const loadingTask = pdfjsLib.getDocument({
          data: dataCopy,
          cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist/cmaps/',
          cMapPacked: true,
        });

        const doc = await loadingTask.promise;
        if (!isMounted) return;

        setPdfDoc(doc);
        setNumPages(doc.numPages);

        const validStart = Math.max(1, Math.min(initialPage, doc.numPages));
        setCurrentPage(validStart);
        setPageInput(String(validStart));
        
        setTimeout(() => {
          if (isMounted) {
            setLoading(false);
          }
        }, 300);
      } catch (pdfErr: any) {
        console.error('Failed to parse PDF binary via pdfjs-dist:', pdfErr);
        if (isMounted) {
          setError(pdfErr.message || 'Failed to parse PDF document.');
          setLoading(false);
        }
      }
    };

    loadPdf();

    return () => {
      isMounted = false;
    };
  }, [pdfUrl, sourcePdfHash, fallbackUrls.join(','), pdfBuffer]);

  // Strictly render ONE single active page at a time
  useEffect(() => {
    let isCancelled = false;

    if (!pdfDoc || loading || !pageCanvasRef.current) return;

    // Cancel previous ongoing render task if active
    if (activeRenderTaskRef.current) {
      try {
        activeRenderTaskRef.current.cancel();
      } catch (_) {}
      activeRenderTaskRef.current = null;
    }

    const renderSingleActivePage = async () => {
      const canvas = pageCanvasRef.current;
      if (!canvas) return;

      const safePage = Math.max(1, Math.min(currentPage, numPages));

      try {
        const page = await pdfDoc.getPage(safePage);
        if (isCancelled) return;

        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) return;

        const pixelRatio = window.devicePixelRatio || 1;
        const viewport = page.getViewport({ scale: scale * 1.15 * pixelRatio });

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.width = `${viewport.width / pixelRatio}px`;
        canvas.style.height = `${viewport.height / pixelRatio}px`;

        ctx.fillStyle = theme === 'dark' ? '#0f172a' : '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const renderContext = {
          canvasContext: ctx,
          viewport: viewport,
        };

        const renderTask = page.render(renderContext);
        activeRenderTaskRef.current = renderTask;

        await renderTask.promise;
        if (activeRenderTaskRef.current === renderTask) {
          activeRenderTaskRef.current = null;
        }
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException' && !isCancelled) {
          console.warn(`Render error on page ${safePage}:`, err);
        }
      }
    };

    renderSingleActivePage();
    setPageInput(String(currentPage));

    return () => {
      isCancelled = true;
      if (activeRenderTaskRef.current) {
        try {
          activeRenderTaskRef.current.cancel();
        } catch (_) {}
        activeRenderTaskRef.current = null;
      }
    };
  }, [pdfDoc, currentPage, scale, numPages, theme, loading]);

  // Keyboard navigation for page flip
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        handleNextPage();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        handlePrevPage();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, numPages, isFlipping]);

  // Page Navigation Handlers (Strictly 1 page per step)
  const handleNextPage = () => {
    if (isFlipping || currentPage >= numPages) return;
    setIsFlipping(true);
    setFlipDirection('next');
    setTimeout(() => {
      setCurrentPage(prev => Math.min(prev + 1, numPages));
      setIsFlipping(false);
      setFlipDirection(null);
    }, 350);
  };

  const handlePrevPage = () => {
    if (isFlipping || currentPage <= 1) return;
    setIsFlipping(true);
    setFlipDirection('prev');
    setTimeout(() => {
      setCurrentPage(prev => Math.max(prev - 1, 1));
      setIsFlipping(false);
      setFlipDirection(null);
    }, 350);
  };

  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPageInput(e.target.value);
  };

  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseInt(pageInput.trim(), 10);
    if (!isNaN(p) && p >= 1 && p <= numPages) {
      setCurrentPage(p);
    } else {
      setPageInput(String(currentPage));
    }
  };

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.15, 2.2));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.15, 0.65));
  const handleResetZoom = () => setScale(1.0);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const handleDownload = async () => {
    setDownloadProgress(true);
    try {
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = `${title.replace(/\s+/g, '_')}_HD.pdf`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setTimeout(() => setDownloadProgress(false), 800);
    }
  };

  const isDark = theme === 'dark';

  return (
    <div 
      ref={containerRef}
      id="interactive-pdf-viewer-root"
      className={`fixed inset-0 z-50 flex flex-col select-none transition-colors duration-300 font-sans ${
        isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-800'
      }`}
    >
      <style>{`
        /* 3D Perspective & Page Turn Animation */
        .perspective-book {
          perspective: 1600px;
          transform-style: preserve-3d;
        }
        
        .single-page-card {
          transform-origin: center center;
          transition: transform 0.35s cubic-bezier(0.25, 1, 0.5, 1), box-shadow 0.3s ease;
          backface-visibility: hidden;
        }

        .single-page-flip-next {
          animation: singleFlipNext 0.35s cubic-bezier(0.25, 1, 0.5, 1) forwards;
          transform-origin: left center;
        }

        .single-page-flip-prev {
          animation: singleFlipPrev 0.35s cubic-bezier(0.25, 1, 0.5, 1) forwards;
          transform-origin: right center;
        }

        @keyframes singleFlipNext {
          0% { transform: rotateY(0deg); opacity: 1; }
          50% { transform: rotateY(-35deg) scale(0.98); opacity: 0.85; }
          100% { transform: rotateY(0deg); opacity: 1; }
        }

        @keyframes singleFlipPrev {
          0% { transform: rotateY(0deg); opacity: 1; }
          50% { transform: rotateY(35deg) scale(0.98); opacity: 0.85; }
          100% { transform: rotateY(0deg); opacity: 1; }
        }

        /* Dog-ear Page Corner Curl Hover Effect */
        .corner-curl-zone {
          position: absolute;
          width: 50px;
          height: 50px;
          z-index: 30;
          cursor: pointer;
        }

        .corner-curl-tr { top: 0; right: 0; }
        .corner-curl-br { bottom: 0; right: 0; }
        .corner-curl-tl { top: 0; left: 0; }
        .corner-curl-bl { bottom: 0; left: 0; }

        .dog-ear-curl-tr {
          position: absolute;
          top: 0;
          right: 0;
          width: 0;
          height: 0;
          border-style: solid;
          border-width: 0 38px 38px 0;
          border-color: transparent ${isDark ? '#334155' : '#cbd5e1'} transparent transparent;
          filter: drop-shadow(-3px 3px 4px rgba(0,0,0,0.25));
          transition: all 0.2s ease-out;
        }

        .corner-curl-zone:hover .dog-ear-curl-tr {
          border-width: 0 50px 50px 0;
          border-color: transparent ${isDark ? '#475569' : '#94a3b8'} transparent transparent;
          filter: drop-shadow(-4px 4px 6px rgba(0,0,0,0.35));
        }

        .dog-ear-curl-br {
          position: absolute;
          bottom: 0;
          right: 0;
          width: 0;
          height: 0;
          border-style: solid;
          border-width: 0 0 38px 38px;
          border-color: transparent transparent ${isDark ? '#334155' : '#cbd5e1'} transparent;
          filter: drop-shadow(-3px -3px 4px rgba(0,0,0,0.25));
          transition: all 0.2s ease-out;
        }

        .corner-curl-zone:hover .dog-ear-curl-br {
          border-width: 0 0 50px 50px;
          border-color: transparent transparent ${isDark ? '#475569' : '#94a3b8'} transparent;
          filter: drop-shadow(-4px -4px 6px rgba(0,0,0,0.35));
        }

        .dog-ear-curl-tl {
          position: absolute;
          top: 0;
          left: 0;
          width: 0;
          height: 0;
          border-style: solid;
          border-width: 38px 38px 0 0;
          border-color: ${isDark ? '#334155' : '#cbd5e1'} transparent transparent transparent;
          filter: drop-shadow(3px 3px 4px rgba(0,0,0,0.25));
          transition: all 0.2s ease-out;
        }

        .corner-curl-zone:hover .dog-ear-curl-tl {
          border-width: 50px 50px 0 0;
          border-color: ${isDark ? '#475569' : '#94a3b8'} transparent transparent transparent;
          filter: drop-shadow(4px 4px 6px rgba(0,0,0,0.35));
        }

        .dog-ear-curl-bl {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 0;
          height: 0;
          border-style: solid;
          border-width: 38px 0 0 38px;
          border-color: transparent transparent transparent ${isDark ? '#334155' : '#cbd5e1'};
          filter: drop-shadow(3px -3px 4px rgba(0,0,0,0.25));
          transition: all 0.2s ease-out;
        }

        .corner-curl-zone:hover .dog-ear-curl-bl {
          border-width: 50px 0 0 50px;
          border-color: transparent transparent transparent ${isDark ? '#475569' : '#94a3b8'};
          filter: drop-shadow(4px -4px 6px rgba(0,0,0,0.35));
        }
      `}</style>

      {/* TOP TOOLBAR */}
      <div 
        id="pdf-action-toolbar"
        className={`shrink-0 z-40 flex flex-wrap items-center justify-between px-4 sm:px-6 py-2.5 border-b shadow-sm transition-colors duration-200 gap-3 ${
          isDark 
            ? 'bg-slate-900 border-slate-800 text-slate-100' 
            : 'bg-white border-slate-200 text-slate-800'
        }`}
      >
        {/* Left Side: Document Title Badge */}
        <div className="flex items-center gap-3 min-w-0">
          <div className={`p-2 rounded-xl border shrink-0 ${
            isDark ? 'bg-indigo-950/60 border-indigo-900 text-indigo-400' : 'bg-indigo-50 border-indigo-200 text-indigo-600'
          }`}>
            <BookOpen className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0 max-w-[180px] sm:max-w-xs md:max-w-md">
            <h3 className="text-xs sm:text-sm font-black truncate">{title}</h3>
            {subtitle && (
              <p className={`text-[10px] font-bold uppercase tracking-wider truncate ${
                isDark ? 'text-slate-400' : 'text-slate-500'
              }`}>
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Center: Pagination & Zoom Controls */}
        {!loading && !error && numPages > 0 && (
          <div className="flex items-center gap-2">
            {/* Pagination Controls */}
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-xl border text-xs font-bold ${
              isDark ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}>
              <button
                id="btn-nav-prev"
                onClick={handlePrevPage}
                disabled={currentPage <= 1 || isFlipping}
                className="p-1 rounded-lg hover:bg-indigo-600 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-inherit transition-all cursor-pointer"
                title="Previous Page (Left Arrow)"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <form onSubmit={handlePageInputSubmit} className="flex items-center gap-1">
                <input
                  type="text"
                  value={pageInput}
                  onChange={handlePageInputChange}
                  className={`w-12 text-center border rounded-lg py-0.5 px-1 text-xs font-black focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                    isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
                <span className="text-[11px] opacity-70">of {numPages}</span>
              </form>

              <button
                id="btn-nav-next"
                onClick={handleNextPage}
                disabled={currentPage >= numPages || isFlipping}
                className="p-1 rounded-lg hover:bg-indigo-600 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-inherit transition-all cursor-pointer"
                title="Next Page (Right Arrow)"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Zoom Controls */}
            <div className={`flex items-center gap-1 px-2 py-1 rounded-xl border text-xs font-bold ${
              isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-100 border-slate-200'
            }`}>
              <button
                onClick={handleZoomOut}
                disabled={scale <= 0.65}
                className={`p-1.5 rounded-lg hover:bg-indigo-600 hover:text-white disabled:opacity-30 transition-all cursor-pointer ${
                  isDark ? 'text-slate-300' : 'text-slate-700'
                }`}
                title="Zoom Out"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </button>

              <button
                onClick={handleResetZoom}
                className={`px-1.5 py-0.5 rounded-md text-[11px] font-black transition-all cursor-pointer hover:underline ${
                  isDark ? 'text-slate-200' : 'text-slate-800'
                }`}
                title="Reset Zoom"
              >
                {Math.round(scale * 100)}%
              </button>

              <button
                onClick={handleZoomIn}
                disabled={scale >= 2.2}
                className={`p-1.5 rounded-lg hover:bg-indigo-600 hover:text-white disabled:opacity-30 transition-all cursor-pointer ${
                  isDark ? 'text-slate-300' : 'text-slate-700'
                }`}
                title="Zoom In"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Right Side: HD Download Button, Theme Toggle, Fullscreen, Close */}
        <div className="flex items-center gap-2">
          {/* HD PDF Download Button */}
          <button
            id="btn-hd-pdf-download"
            onClick={handleDownload}
            disabled={downloadProgress}
            className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white text-xs font-black shadow-md shadow-indigo-600/25 transition-all active:scale-95 cursor-pointer"
            title="Download HD PDF Document"
          >
            <Download className="h-3.5 w-3.5 shrink-0" />
            <span className="tracking-wide hidden sm:inline">HD PDF DOWNLOAD</span>
            <span className="tracking-wide sm:hidden">DOWNLOAD</span>
          </button>

          {/* Theme Switcher */}
          <button
            onClick={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
            className={`p-2 rounded-xl border transition-all cursor-pointer ${
              isDark 
                ? 'bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-700' 
                : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
            }`}
            title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className={`p-2 rounded-xl border transition-all cursor-pointer hidden sm:flex ${
              isDark 
                ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700' 
                : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
            }`}
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>

          {/* Close Modal Button */}
          <button
            onClick={onClose}
            className={`p-2 rounded-xl border transition-all cursor-pointer ${
              isDark 
                ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:bg-rose-950/60 hover:border-rose-800' 
                : 'bg-slate-100 border-slate-300 text-slate-600 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200'
            }`}
            title="Close Viewer"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>
      </div>

      {/* MAIN DOCUMENT PREVIEW CANVAS (STRICTLY ONE ACTIVE PAGE) */}
      <div 
        id="pdf-canvas-viewport"
        className={`flex-1 overflow-auto p-4 sm:p-8 flex items-center justify-center relative perspective-book ${
          isDark ? 'bg-slate-950' : 'bg-slate-100'
        }`}
      >
        {/* LOADING STATE: Document Skeleton */}
        {loading && (
          <div className="flex flex-col items-center justify-center my-auto space-y-6 animate-pulse">
            <div className={`w-[300px] sm:w-[420px] md:w-[520px] h-[420px] sm:h-[580px] md:h-[680px] rounded-2xl border p-8 flex flex-col justify-between shadow-2xl relative overflow-hidden ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="space-y-4">
                <div className={`h-7 w-3/4 rounded-lg ${isDark ? 'bg-slate-800' : 'bg-slate-200'} animate-pulse`} />
                <div className={`h-3.5 w-full rounded ${isDark ? 'bg-slate-800/60' : 'bg-slate-100'} animate-pulse`} />
                <div className={`h-3.5 w-5/6 rounded ${isDark ? 'bg-slate-800/60' : 'bg-slate-100'} animate-pulse`} />
                <div className={`h-3.5 w-4/6 rounded ${isDark ? 'bg-slate-800/60' : 'bg-slate-100'} animate-pulse`} />
                <div className={`h-40 w-full rounded-xl mt-6 ${isDark ? 'bg-slate-800/40' : 'bg-slate-100'} animate-pulse`} />
              </div>
              <div className="flex justify-between items-center pt-4 border-t border-slate-800/40">
                <div className={`h-3 w-16 rounded ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
                <div className={`h-3 w-8 rounded ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
              </div>
            </div>

            <div className="flex items-center gap-2.5 text-xs font-black text-indigo-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Opening HD NCERT Book Canvas...</span>
            </div>
          </div>
        )}

        {/* ERROR STATE */}
        {error && (
          <div className={`text-center max-w-md p-8 rounded-3xl border space-y-4 shadow-2xl my-auto ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto" />
            <h4 className="text-base font-black">Unable to open PDF preview</h4>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{error}</p>
            <div className="pt-2 flex justify-center gap-3">
              <button
                onClick={handleDownload}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black transition-all cursor-pointer flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Download PDF
              </button>
              <button
                onClick={onClose}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* SINGLE ACTIVE PAGE VIEW WITH CORNER CURL & 3D TURN */}
        {!loading && !error && (
          <div className="flex flex-col items-center justify-center my-auto transition-all duration-300">
            <div className={`relative rounded-2xl shadow-2xl border p-1 sm:p-2 overflow-hidden transition-all single-page-card ${
              isFlipping ? (flipDirection === 'next' ? 'single-page-flip-next' : 'single-page-flip-prev') : ''
            } ${
              isDark ? 'bg-slate-900 border-slate-800 shadow-black/80' : 'bg-white border-slate-300 shadow-slate-400/40'
            }`}>
              {/* Corner Curl Zones (Next on Right, Prev on Left) */}
              {currentPage < numPages && (
                <>
                  <div 
                    className="corner-curl-zone corner-curl-tr"
                    onClick={handleNextPage}
                    title="Click to Flip Next Page"
                  >
                    <div className="dog-ear-curl-tr" />
                  </div>
                  <div 
                    className="corner-curl-zone corner-curl-br"
                    onClick={handleNextPage}
                    title="Click to Flip Next Page"
                  >
                    <div className="dog-ear-curl-br" />
                  </div>
                </>
              )}

              {currentPage > 1 && (
                <>
                  <div 
                    className="corner-curl-zone corner-curl-tl"
                    onClick={handlePrevPage}
                    title="Click to Flip Previous Page"
                  >
                    <div className="dog-ear-curl-tl" />
                  </div>
                  <div 
                    className="corner-curl-zone corner-curl-bl"
                    onClick={handlePrevPage}
                    title="Click to Flip Previous Page"
                  >
                    <div className="dog-ear-curl-bl" />
                  </div>
                </>
              )}

              {/* SINGLE RENDERED CANVAS */}
              <canvas ref={pageCanvasRef} className="block max-w-full rounded-xl" />
            </div>

            {/* Bottom Navigation Ribbon */}
            <div className={`mt-5 flex items-center gap-4 px-5 py-2 rounded-full border text-xs font-black shadow-lg transition-all ${
              isDark ? 'bg-slate-900/90 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700'
            }`}>
              <button
                onClick={handlePrevPage}
                disabled={currentPage <= 1 || isFlipping}
                className="flex items-center gap-1 hover:text-indigo-500 disabled:opacity-30 transition-colors cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Previous</span>
              </button>

              <div className={`h-3 w-[1px] ${isDark ? 'bg-slate-700' : 'bg-slate-300'}`} />

              <span className="text-[11px] font-black text-indigo-400 tracking-wider">
                Page {currentPage} of {numPages}
              </span>

              <div className={`h-3 w-[1px] ${isDark ? 'bg-slate-700' : 'bg-slate-300'}`} />

              <button
                onClick={handleNextPage}
                disabled={currentPage >= numPages || isFlipping}
                className="flex items-center gap-1 hover:text-indigo-500 disabled:opacity-30 transition-colors cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
