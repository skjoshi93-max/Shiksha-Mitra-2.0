import * as pdfjsLib from 'pdfjs-dist';
import { getNcertPdfBlob, saveNcertPdfBlob } from './db';

// Set up worker source for pdfjs-dist
if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
  } catch (_) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.10.38'}/pdf.worker.min.mjs`;
  }
}

// In-memory cache for page thumbnails: cacheKey = `${sourceHashOrId}_page_${pageNum}`
const thumbnailMemoryCache = new Map<string, string>();

/**
 * Authoritative PDF Page Renderer
 * Renders any page of a PDF document with exact dimensions, aspect ratio, clean white background, and caching.
 */
export interface RenderPdfPageResult {
  dataUrl: string;
  numPages: number;
  width: number;
  height: number;
  aspectRatio: number;
  pageNumber: number;
}

export async function renderPdfPage(
  source: ArrayBuffer | Uint8Array | string | Blob,
  pageNumber: number = 1,
  options?: {
    maxWidth?: number;
    targetHeight?: number;
    cacheKey?: string;
    quality?: number;
    format?: 'image/jpeg' | 'image/png' | 'image/webp';
  }
): Promise<RenderPdfPageResult> {
  const maxWidth = options?.maxWidth || 480;
  const quality = options?.quality || 0.88;
  const format = options?.format || 'image/jpeg';
  const fullCacheKey = options?.cacheKey ? `${options.cacheKey}_p${pageNumber}_w${maxWidth}` : null;

  if (fullCacheKey && thumbnailMemoryCache.has(fullCacheKey)) {
    const cached = thumbnailMemoryCache.get(fullCacheKey)!;
    return {
      dataUrl: cached,
      numPages: 0,
      width: maxWidth,
      height: Math.round(maxWidth * 1.333),
      aspectRatio: 0.75,
      pageNumber,
    };
  }

  try {
    let resolvedSource: any = source;

    if (source instanceof Blob) {
      resolvedSource = new Uint8Array(await source.arrayBuffer());
    } else if (source instanceof ArrayBuffer) {
      resolvedSource = new Uint8Array(source);
    } else if (typeof source === 'string' && options?.cacheKey) {
      const hashOnly = options.cacheKey.split('_')[0];
      const localBuffer = await getNcertPdfBlob(hashOnly);
      if (localBuffer) {
        resolvedSource = new Uint8Array(localBuffer);
      }
    }

    let loadingTask: any;
    if (typeof resolvedSource === 'string') {
      loadingTask = pdfjsLib.getDocument({
        url: resolvedSource,
        cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist/cmaps/',
        cMapPacked: true,
      });
    } else if (resolvedSource instanceof Uint8Array || resolvedSource instanceof ArrayBuffer) {
      const byteArr = resolvedSource instanceof ArrayBuffer ? new Uint8Array(resolvedSource) : resolvedSource;
      const clonedBuffer = byteArr.buffer.slice(byteArr.byteOffset, byteArr.byteOffset + byteArr.byteLength);

      loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(clonedBuffer),
        cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist/cmaps/',
        cMapPacked: true,
      });
    } else {
      throw new Error('Unsupported PDF source type');
    }

    const pdfDoc = await loadingTask.promise;
    const totalPages = pdfDoc.numPages || 1;
    const safePageNum = Math.max(1, Math.min(pageNumber, totalPages));
    const page = await pdfDoc.getPage(safePageNum);

    const initialViewport = page.getViewport({ scale: 1.0 });
    const originalWidth = initialViewport.width || 400;
    const originalHeight = initialViewport.height || 600;
    const aspectRatio = originalWidth / Math.max(1, originalHeight);

    let scale = 1.0;
    if (options?.targetHeight) {
      scale = options.targetHeight / originalHeight;
    } else if (maxWidth) {
      scale = maxWidth / originalWidth;
    }
    scale = Math.min(2.0, Math.max(0.2, scale));

    const viewport = page.getViewport({ scale });
    const width = Math.max(10, Math.floor(viewport.width));
    const height = Math.max(10, Math.floor(viewport.height));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { alpha: false });

    if (!ctx) {
      throw new Error('Failed to create canvas 2D context');
    }

    // Fill solid white background to eliminate transparency or distortion
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

    const renderContext = {
      canvasContext: ctx,
      viewport: viewport,
    };

    await page.render(renderContext).promise;
    const dataUrl = canvas.toDataURL(format, quality);

    if (fullCacheKey) {
      thumbnailMemoryCache.set(fullCacheKey, dataUrl);
    }

    return {
      dataUrl,
      numPages: totalPages,
      width,
      height,
      aspectRatio,
      pageNumber: safePageNum,
    };
  } catch (err) {
    console.warn(`[Authoritative PDF Renderer] Error rendering page ${pageNumber}:`, err);
    throw err;
  }
}

/**
 * Render a specific page of a PDF as a high-quality JPEG/PNG data URL.
 * @param source PDF array buffer, Uint8Array, or URL
 * @param pageNumber 1-indexed page number
 * @param cacheKey optional key for instant memory retrieval
 * @param maxWidth max thumbnail width in pixels (default 400)
 */
export async function renderChapterThumbnailWithMetadata(
  source: ArrayBuffer | Uint8Array | string | Blob,
  pageNumber: number = 1,
  cacheKey?: string,
  maxWidth: number = 400
): Promise<{ dataUrl: string; numPages: number }> {
  const result = await renderPdfPage(source, pageNumber, { maxWidth, cacheKey });
  return { dataUrl: result.dataUrl, numPages: result.numPages };
}

/**
 * Render a specific page of a PDF as a high-quality JPEG/PNG data URL.
 */
export async function renderChapterPageThumbnail(
  source: ArrayBuffer | Uint8Array | string,
  pageNumber: number = 1,
  cacheKey?: string,
  maxWidth: number = 400
): Promise<string> {
  const result = await renderChapterThumbnailWithMetadata(source, pageNumber, cacheKey, maxWidth);
  return result.dataUrl;
}

/**
 * Clear cached thumbnails
 */
export function clearThumbnailCache(): void {
  thumbnailMemoryCache.clear();
}

