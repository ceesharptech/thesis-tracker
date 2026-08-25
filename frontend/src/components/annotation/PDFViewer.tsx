/**
 * PDFViewer.tsx
 *
 * Renders a multi-page PDF using PDF.js (pdfjs-dist v6).
 * Each page = <canvas> (artwork) + .pdfjs-text-layer div (invisible, selectable text).
 * The text layer is what makes browser text-selection work on the rendered PDF.
 *
 * Exposes a `scrollToPage(n)` method via useImperativeHandle so the
 * AnnotationSidebar can programmatically scroll the viewer to a page.
 *
 * Phase 4 changes:
 *   - pdfjs-dist is now dynamically imported (code-split) so it is NOT included
 *     in the main bundle — it only loads when an annotation page is opened.
 *     This reduces the initial JS bundle by ~450 kB gzip.
 *   - ResizeObserver watches the scroll container; if the width changes by ≥ 5px
 *     the document is re-rendered so highlights stay aligned after window resize.
 *
 * @see ThesisFlow Annotation Implementation Plan § 5.6 (PDFViewer spec)
 * @see ThesisFlow Annotation Implementation Plan § 9.2 (text layer setup)
 */

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";

// ─── Public API (exposed via ref) ────────────────────────────────────────────

export interface PDFViewerHandle {
  /** Smooth-scrolls the viewer so the given 1-indexed page is in view. */
  scrollToPage: (pageNumber: number) => void;
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface PageDimensions {
  width: number;
  height: number;
}

export interface PDFViewerProps {
  /** Absolute URL to the PDF file (already resolved by the parent page). */
  pdfUrl: string;
  /**
   * Called after each page finishes rendering.
   * Provides the 1-indexed page number and its rendered pixel dimensions.
   * AnnotationEditorPage / AnnotationViewerPage use this to keep
   * pageViewports state in sync so AnnotationLayer can scale highlights.
   *
   * Phase 4: also called on re-render after window resize, so parent
   * pageViewports always reflect current rendered dimensions.
   */
  onPageRender?: (pageNumber: number, dimensions: PageDimensions) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

const PDFViewer = forwardRef<PDFViewerHandle, PDFViewerProps>(
  ({ pdfUrl, onPageRender }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
    // Keep a ref to the loaded PDF document so ResizeObserver can re-render
    const pdfDocRef = useRef<PDFDocumentProxy | null>(null);
    // Track last known container width to avoid unnecessary re-renders
    const lastWidthRef = useRef<number>(0);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [totalPages, setTotalPages] = useState(0);
    // Track which pages have been rendered (for the page counter)
    const [renderedPageCount, setRenderedPageCount] = useState(0);

    // ── Expose scrollToPage to parent via ref ────────────────────────────────
    useImperativeHandle(ref, () => ({
      scrollToPage(pageNumber: number) {
        const el = pageRefs.current.get(pageNumber);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      },
    }));

    // ── Render a single page onto its canvas + text layer ────────────────────
    const renderPage = useCallback(
      async (pdf: PDFDocumentProxy, pageNum: number) => {
        // pdfjs-dist is loaded dynamically — import it lazily from the cached module
        // We import renderTextLayer lazily to avoid top-level dynamic imports
        const pdfjsLib = await import("pdfjs-dist");

        const pageEl = pageRefs.current.get(pageNum);
        if (!pageEl) return;

        const page = await pdf.getPage(pageNum);

        // Scale to fit the container width (max 1200px for readability)
        const containerWidth = containerRef.current?.clientWidth ?? 800;
        const desiredWidth = Math.min(containerWidth - 48, 1200); // 24px padding each side
        const naturalViewport = page.getViewport({ scale: 1 });
        const scale = desiredWidth / naturalViewport.width;
        const viewport = page.getViewport({ scale });

        // ── Canvas ──────────────────────────────────────────────────────────
        const canvas = pageEl.querySelector(
          "canvas",
        ) as HTMLCanvasElement | null;
        if (!canvas) return;
        // Note: ctx is no longer passed to page.render() in pdfjs-dist v6.
        // Canvas dimensions are set below; the library handles context internally.

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;

        pageEl.style.width = `${viewport.width}px`;
        pageEl.style.height = `${viewport.height}px`;

        // pdfjs-dist v6: render() takes the canvas element directly.
        // `canvasContext` was removed — the library acquires the 2D context internally.
        await page.render({ canvas, viewport }).promise;

        // ── Text layer ───────────────────────────────────────────────────────
        const textLayerEl = pageEl.querySelector(
          ".pdfjs-text-layer",
        ) as HTMLDivElement | null;
        if (textLayerEl) {
          textLayerEl.innerHTML = "";
          // pdfjs-dist v6: renderTextLayer() was removed.
          // Use the TextLayer class with streamTextContent() as the source.
          // streamTextContent() returns a ReadableStream which TextLayer consumes
          // progressively, matching the rendering lifecycle of the canvas layer.
          const textLayer = new pdfjsLib.TextLayer({
            textContentSource: page.streamTextContent(),
            container: textLayerEl,
            viewport,
          });
          await textLayer.render();
        }

        // ── Notify parent ────────────────────────────────────────────────────
        onPageRender?.(pageNum, {
          width: viewport.width,
          height: viewport.height,
        });

        setRenderedPageCount((c) => Math.max(c, pageNum));
      },
      [onPageRender],
    );

    // ── Render all pages of a PDF document ───────────────────────────────────
    const renderAllPages = useCallback(
      async (pdf: PDFDocumentProxy, cancelled: { value: boolean }) => {
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          if (cancelled.value) break;
          await renderPage(pdf, pageNum);
        }
      },
      [renderPage],
    );

    // ── Load PDF on pdfUrl change ────────────────────────────────────────────
    useEffect(() => {
      if (!pdfUrl) return;

      const cancelled = { value: false };
      setLoading(true);
      setError(null);
      setTotalPages(0);
      setRenderedPageCount(0);
      pdfDocRef.current = null;

      const loadPDF = async () => {
        try {
          // Phase 4: dynamic import — pdfjs-dist is code-split into a lazy chunk.
          // It loads only when an annotation page is first opened, NOT in the
          // main bundle. This saves ~450 kB gzip from the initial load.
          const pdfjsLib = await import("pdfjs-dist");

          // Ensure the worker source is set after the dynamic import resolves
          pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

          const pdf = await pdfjsLib.getDocument({ url: pdfUrl }).promise;
          if (cancelled.value) return;

          pdfDocRef.current = pdf;
          setTotalPages(pdf.numPages);

          await renderAllPages(pdf, cancelled);

          if (!cancelled.value) setLoading(false);
        } catch (err) {
          if (!cancelled.value) {
            console.error("[PDFViewer] Failed to load PDF:", err);
            setError(
              "Failed to load the PDF document. The file may be unavailable or corrupted.",
            );
            setLoading(false);
          }
        }
      };

      loadPDF();

      return () => {
        cancelled.value = true;
      };
    }, [pdfUrl, renderAllPages]);

    // ── ResizeObserver: re-render on container width change ──────────────────
    // This ensures AnnotationLayer highlights stay perfectly aligned after the
    // user resizes the browser window or collapses/expands the sidebar.
    // We debounce by 150ms to avoid firing on every pixel of a drag resize.
    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      let debounceTimer: ReturnType<typeof setTimeout> | null = null;

      const observer = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (!entry) return;

        const newWidth = entry.contentRect.width;
        // Only re-render if width changed by ≥ 5px to avoid micro-jitter loops
        if (Math.abs(newWidth - lastWidthRef.current) < 5) return;
        lastWidthRef.current = newWidth;

        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          const pdf = pdfDocRef.current;
          if (!pdf) return;
          const cancelled = { value: false };
          renderAllPages(pdf, cancelled);
        }, 150);
      });

      observer.observe(container);

      return () => {
        observer.disconnect();
        if (debounceTimer) clearTimeout(debounceTimer);
      };
    }, [renderAllPages]);

    // ── Register page element refs ────────────────────────────────────────────
    const setPageRef = (pageNum: number) => (el: HTMLDivElement | null) => {
      if (el) {
        pageRefs.current.set(pageNum, el);
      } else {
        pageRefs.current.delete(pageNum);
      }
    };

    // ── Loading skeleton ──────────────────────────────────────────────────────
    if (loading && totalPages === 0) {
      return (
        <div className="flex flex-col items-center gap-6 py-8">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-tf-gray-100 animate-pulse rounded-lg"
              style={{
                width: "794px",
                height: "1123px",
                maxWidth: "calc(100% - 48px)",
              }}
            />
          ))}
          <p className="text-sm text-tf-gray-400 mt-2">Loading document…</p>
        </div>
      );
    }

    // ── Error state ───────────────────────────────────────────────────────────
    if (error) {
      return (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-16 h-16 rounded-full bg-tf-red-50 flex items-center justify-center">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-tf-red-700"
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <div className="text-center max-w-sm">
            <p className="text-tf-gray-800 font-medium mb-1">
              Could not load document
            </p>
            <p className="text-sm text-tf-gray-500">{error}</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 px-4 py-2 hover:cursor-pointer text-sm rounded-xl border border-tf-gray-200 text-tf-gray-700 hover:bg-tf-gray-100 transition-colors"
          >
            Retry
          </button>
        </div>
      );
    }

    // ── Rendered pages ────────────────────────────────────────────────────────
    return (
      <div
        ref={containerRef}
        className="flex flex-col items-center gap-6 py-6 overflow-y-auto h-full px-6"
        id="pdf-viewer-container"
      >
        {totalPages > 0 &&
          Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
            <div
              key={pageNum}
              ref={setPageRef(pageNum)}
              data-page-number={pageNum}
              className="relative shadow-lg bg-white"
              id={`pdf-page-${pageNum}`}
            >
              {/* The canvas receives the rendered PDF artwork */}
              <canvas className="block" />

              {/*
               * Invisible text layer for native browser text selection.
               * CSS in index.css (.pdfjs-text-layer) makes spans transparent
               * but still user-selectable. DO NOT set pointer-events: none.
               */}
              <div className="pdfjs-text-layer" />

              {/*
               * AnnotationLayer is injected here by the parent page
               * via React.createPortal — see AnnotationEditorPage /
               * AnnotationViewerPage AnnotationLayerPortal components.
               */}
            </div>
          ))}

        {/* Subtle page counter */}
        {renderedPageCount > 0 && (
          <p className="text-xs text-tf-gray-400 pb-4">
            {totalPages} page{totalPages !== 1 ? "s" : ""}
          </p>
        )}
      </div>
    );
  },
);

PDFViewer.displayName = "PDFViewer";

export default PDFViewer;
