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
 * @see ThesisFlow Annotation Implementation Plan § 5.6 (PDFViewer spec)
 * @see ThesisFlow Annotation Implementation Plan § 9.2 (text layer setup)
 */

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import * as pdfjsLib from "pdfjs-dist";
import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";

// pdfjs-dist v6 ships ESM-only workers.
// The worker file was copied to public/ during Phase 1 setup.
// Using an absolute public path so Vite serves it as a static asset.
pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

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

interface PDFViewerProps {
  /** Absolute URL to the PDF file (already resolved by the parent page). */
  pdfUrl: string;
  /**
   * Called after each page finishes rendering.
   * Provides the 1-indexed page number and its rendered pixel dimensions.
   * AnnotationEditorPage / AnnotationViewerPage use this to keep
   * pageViewports state in sync so AnnotationLayer can scale highlights.
   */
  onPageRender?: (
    pageNumber: number,
    dimensions: PageDimensions,
  ) => void;
}

// ─── Page state ───────────────────────────────────────────────────────────────

interface RenderedPage {
  pageNumber: number;
  width: number;
  height: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

const PDFViewer = forwardRef<PDFViewerHandle, PDFViewerProps>(
  ({ pdfUrl, onPageRender }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [pages, setPages] = useState<RenderedPage[]>([]);
    const [totalPages, setTotalPages] = useState(0);

    // ── Expose scrollToPage to parent via ref ────────────────────────────────
    useImperativeHandle(ref, () => ({
      scrollToPage(pageNumber: number) {
        const el = pageRefs.current.get(pageNumber);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      },
    }));

    // ── Load and render PDF on pdfUrl change ─────────────────────────────────
    useEffect(() => {
      if (!pdfUrl) return;

      let cancelled = false;
      setLoading(true);
      setError(null);
      setPages([]);

      const renderPDF = async () => {
        try {
          // Load the PDF document
          const loadingTask = pdfjsLib.getDocument({ url: pdfUrl });
          const pdf: PDFDocumentProxy = await loadingTask.promise;

          if (cancelled) return;

          setTotalPages(pdf.numPages);

          // Render pages sequentially to avoid canvas memory contention
          for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            if (cancelled) break;
            await renderPage(pdf, pageNum);
          }

          if (!cancelled) setLoading(false);
        } catch (err) {
          if (!cancelled) {
            console.error("[PDFViewer] Failed to load PDF:", err);
            setError(
              "Failed to load the PDF document. The file may be unavailable or corrupted.",
            );
            setLoading(false);
          }
        }
      };

      renderPDF();

      return () => {
        cancelled = true;
      };
    }, [pdfUrl]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Render a single page onto its canvas + text layer ────────────────────
    const renderPage = async (pdf: PDFDocumentProxy, pageNum: number) => {
      const pageEl = pageRefs.current.get(pageNum);
      if (!pageEl) return;

      const page: PDFPageProxy = await pdf.getPage(pageNum);

      // Use a scale that gives roughly 1.5× the natural resolution for clarity
      const desiredWidth = Math.min(
        pageEl.parentElement?.clientWidth ?? 800,
        1200,
      );
      const naturalViewport = page.getViewport({ scale: 1 });
      const scale = desiredWidth / naturalViewport.width;
      const viewport = page.getViewport({ scale });

      // ── Canvas ────────────────────────────────────────────────────────────
      const canvas = pageEl.querySelector(
        "canvas",
      ) as HTMLCanvasElement | null;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;

      // Set the page wrapper to match canvas dimensions so overlays align
      pageEl.style.width = `${viewport.width}px`;
      pageEl.style.height = `${viewport.height}px`;

      await page.render({ canvas, canvasContext: ctx, viewport }).promise;

      // ── Text layer ────────────────────────────────────────────────────────
      // The text layer renders transparent <span>s over the canvas.
      // These spans are what the browser "selects" when the user drags.
      // CSS for .pdfjs-text-layer is defined in src/index.css.
      const textLayerEl = pageEl.querySelector(
        ".pdfjs-text-layer",
      ) as HTMLDivElement | null;
      if (textLayerEl) {
        textLayerEl.innerHTML = ""; // Clear if re-rendering

        const textContent = await page.getTextContent();

        const textLayer = new pdfjsLib.TextLayer({
          textContentSource: textContent,
          container: textLayerEl,
          viewport,
        });
        await textLayer.render();
      }

      // ── Notify parent of rendered dimensions ──────────────────────────────
      setPages((prev) => {
        const existing = prev.find((p) => p.pageNumber === pageNum);
        if (existing) return prev; // already recorded
        return [...prev, { pageNumber: pageNum, width: viewport.width, height: viewport.height }];
      });

      onPageRender?.(pageNum, {
        width: viewport.width,
        height: viewport.height,
      });
    };

    // ── Register / unregister page element refs ───────────────────────────────
    const setPageRef = (pageNum: number) => (el: HTMLDivElement | null) => {
      if (el) {
        pageRefs.current.set(pageNum, el);
      } else {
        pageRefs.current.delete(pageNum);
      }
    };

    // ── Loading skeleton ──────────────────────────────────────────────────────
    if (loading && pages.length === 0) {
      return (
        <div className="flex flex-col items-center gap-6 py-8">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-tf-gray-100 animate-pulse rounded-lg"
              style={{ width: "794px", height: "1123px", maxWidth: "100%" }}
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
          <div className="w-16 h-16 rounded-full bg-tf-red-50 flex items-center justify-center text-tf-red-700 text-2xl">
            ⚠
          </div>
          <p className="text-tf-gray-700 font-medium text-center max-w-sm">
            {error}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 px-4 py-2 text-sm rounded-xl border border-tf-gray-200 text-tf-gray-700 hover:bg-tf-gray-50 transition-colors"
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
        className="flex flex-col items-center gap-6 py-6 overflow-y-auto h-full"
        id="pdf-viewer-container"
      >
        {/*
         * We render page slot divs for ALL pages upfront (even before the
         * canvas data is ready) so pageRefs are available during renderPage.
         * totalPages is set synchronously when the PDF doc loads.
         */}
        {totalPages > 0 &&
          Array.from({ length: totalPages }, (_, i) => i + 1).map(
            (pageNum) => (
              <div
                key={pageNum}
                ref={setPageRef(pageNum)}
                data-page-number={pageNum}
                className="relative shadow-lg bg-white"
                style={{ position: "relative" }}
                id={`pdf-page-${pageNum}`}
              >
                {/* The canvas receives the rendered PDF artwork */}
                <canvas className="block" />

                {/*
                 * The text layer sits absolutely over the canvas.
                 * pointer-events: auto (from index.css) so selection works.
                 * DO NOT set pointer-events: none here.
                 */}
                <div className="pdfjs-text-layer" />

                {/*
                 * AnnotationLayer is rendered as a sibling by the parent page
                 * (AnnotationEditorPage / AnnotationViewerPage), not here.
                 * The parent maps over pageViewports state and places one
                 * AnnotationLayer per page inside each pdf-page-{n} container.
                 */}
              </div>
            ),
          )}

        {/* Subtle page counter at the bottom */}
        {pages.length > 0 && (
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
export type { PDFViewerProps };
