/**
 * AnnotationLayer.tsx
 *
 * A transparent overlay rendered absolutely over a single PDF page.
 * Has two responsibilities:
 *   1. Text-selection detection (supervisor mode only) — listens for mouseup,
 *      reads window.getSelection(), converts to page-fraction rects, calls
 *      onSelectionComplete with a PendingAnnotation.
 *   2. Highlight rendering — paints saved annotations as yellow <div>s scaled
 *      by the page pixel dimensions (coordinates are stored as fractions).
 *
 * `readOnly = true`  → student view: no selection listener, pointer-events: none
 * `readOnly = false` → supervisor view: selection active, highlights are interactive
 *
 * @see ThesisFlow Annotation Implementation Plan § 5.6 (AnnotationLayer spec)
 * @see ThesisFlow Annotation Implementation Plan § 9.1 (coordinate system)
 * @see ThesisFlow Annotation Implementation Plan § 9.3 (selection detection)
 * @see ThesisFlow Annotation Implementation Plan § 9.4 (resolved annotations)
 */

import { useCallback, useRef } from "react";
import type { Annotation, PendingAnnotation, AnnotationRect } from "@/types";

// ─── Props ────────────────────────────────────────────────────────────────────

interface AnnotationLayerProps {
  pageNumber: number;
  /** Rendered pixel width of this page (from PDFViewer onPageRender). */
  pageWidth: number;
  /** Rendered pixel height of this page (from PDFViewer onPageRender). */
  pageHeight: number;
  /** Annotations already filtered to this page number by the parent. */
  annotations: Annotation[];
  /**
   * Called when the supervisor completes a non-empty text selection.
   * Not called when readOnly is true.
   */
  onSelectionComplete?: (pending: PendingAnnotation) => void;
  /** true = student read-only view. false = supervisor annotation mode. */
  readOnly: boolean;
  /** ID of the annotation currently selected in the sidebar (drives pulse). */
  activeAnnotationId?: string | null;
}

// ─── Coordinate helpers ───────────────────────────────────────────────────────

/**
 * Converts a stored fraction rect to absolute pixel dimensions.
 * Inverse of the fractionalRect helper used during selection.
 */
function toPixelRect(
  rect: AnnotationRect,
  pageWidth: number,
  pageHeight: number,
) {
  return {
    left: rect.x * pageWidth,
    top: rect.y * pageHeight,
    width: rect.width * pageWidth,
    height: rect.height * pageHeight,
  };
}

// ─── Highlight colours ────────────────────────────────────────────────────────

const HIGHLIGHT_NORMAL = "rgba(255, 220, 0, 0.35)";
const HIGHLIGHT_RESOLVED = "rgba(150, 150, 150, 0.20)";
const BORDER_HOVER = "1px solid rgba(255, 180, 0, 0.8)";
const BORDER_ACTIVE = "2px solid #185FA5"; // tf-blue-700

// ─── Component ────────────────────────────────────────────────────────────────

export default function AnnotationLayer({
  pageNumber,
  pageWidth,
  pageHeight,
  annotations,
  onSelectionComplete,
  readOnly,
  activeAnnotationId,
}: AnnotationLayerProps) {
  // Track which annotation is being hovered for tooltip
  const hoveredRef = useRef<string | null>(null);

  // ── Text-selection handler (supervisor only) ──────────────────────────────
  const handleMouseUp = useCallback(() => {
    if (readOnly) return;

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.toString().trim()) {
      return;
    }

    // Find the page container this layer belongs to
    const pageEl = document.getElementById(`pdf-page-${pageNumber}`);
    if (!pageEl) return;

    const range = selection.getRangeAt(0);

    // Verify selection is within this page's DOM subtree
    if (!pageEl.contains(range.commonAncestorContainer)) return;

    const pageRect = pageEl.getBoundingClientRect();

    // getClientRects() returns one rect per line of a multi-line selection
    const clientRects = Array.from(range.getClientRects());
    if (clientRects.length === 0) return;

    // Convert each line rect to page-fraction coordinates.
    // Clamped to [0,1] to guard against rects that slightly overflow the page.
    const rects: AnnotationRect[] = clientRects
      .filter((r) => r.width > 0 && r.height > 0) // skip zero-size artefacts
      .map((r) => ({
        x: Math.max(0, (r.left - pageRect.left) / pageRect.width),
        y: Math.max(0, (r.top - pageRect.top) / pageRect.height),
        width: Math.min(1, r.width / pageRect.width),
        height: Math.min(1, r.height / pageRect.height),
      }));

    if (rects.length === 0) return;

    const selectedText = selection.toString().trim();

    // Clear the browser selection so the highlights take visual ownership
    selection.removeAllRanges();

    onSelectionComplete?.({ pageNumber, rects, selectedText });
  }, [readOnly, pageNumber, onSelectionComplete]);

  // ── Pulse animation: add/remove class via DOM to avoid re-render ──────────
  const handlePulseEnd = useCallback(
    (annotationId: string, el: HTMLDivElement | null) => {
      if (!el) return;
      if (annotationId === activeAnnotationId) {
        el.classList.add("annotation-pulse");
        el.onanimationend = () => el.classList.remove("annotation-pulse");
      }
    },
    [activeAnnotationId],
  );

  // ── In read-only mode the layer is invisible to pointer events ────────────
  // The text layer beneath still receives clicks/selection (pointer-events: auto).
  const overlayPointerEvents = readOnly ? "none" : "auto";

  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: overlayPointerEvents,
        zIndex: 10,
      }}
      onMouseUp={readOnly ? undefined : handleMouseUp}
    >
      {annotations.map((annotation) => {
        const isActive = annotation.id === activeAnnotationId;
        const isResolved = annotation.resolved;
        const highlightColor = isResolved ? HIGHLIGHT_RESOLVED : HIGHLIGHT_NORMAL;

        return annotation.rects.map((rect, rectIdx) => {
          const px = toPixelRect(rect, pageWidth, pageHeight);
          const rectKey = `${annotation.id}-${rectIdx}`;

          return (
            <div
              key={rectKey}
              ref={(el) => {
                // Trigger pulse when this rect belongs to the newly active annotation
                if (isActive && rectIdx === 0) {
                  handlePulseEnd(annotation.id, el);
                }
              }}
              title={
                // Show a short tooltip with the comment preview on hover
                annotation.comment.length > 80
                  ? `${annotation.comment.slice(0, 80)}…`
                  : annotation.comment
              }
              style={{
                position: "absolute",
                left: px.left,
                top: px.top,
                width: px.width,
                height: px.height,
                background: highlightColor,
                border: isActive ? BORDER_ACTIVE : "1px solid transparent",
                borderRadius: "1px",
                cursor: readOnly ? "default" : "pointer",
                transition: "border-color 0.15s ease, background 0.15s ease",
                // In supervisor mode each rect triggers hover styling via CSS
                // (we use inline style overrides via onMouseEnter/Leave below)
                boxSizing: "border-box",
              }}
              onMouseEnter={
                readOnly
                  ? undefined
                  : (e) => {
                      (e.currentTarget as HTMLDivElement).style.border =
                        BORDER_HOVER;
                      hoveredRef.current = annotation.id;
                    }
              }
              onMouseLeave={
                readOnly
                  ? undefined
                  : (e) => {
                      (e.currentTarget as HTMLDivElement).style.border =
                        isActive ? BORDER_ACTIVE : "1px solid transparent";
                      hoveredRef.current = null;
                    }
              }
            />
          );
        });
      })}
    </div>
  );
}

export type { AnnotationLayerProps };
