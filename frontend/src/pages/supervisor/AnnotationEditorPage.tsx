/**
 * AnnotationEditorPage.tsx
 *
 * Full-screen annotation workspace for the supervisor.
 * Route: /supervisor/submission/:id/annotate
 *
 * Layout (outside AppShell — no sidebar/topbar from the shell):
 *   ┌──────────────── 48px topbar ─────────────────────────────────┐
 *   │ ← Back  |  [Student Name] · [Chapter Label]    Page X of Y  │
 *   ├──────────────── PDF canvas area ──────────────┬── 320px ─────┤
 *   │                                               │  Annotation  │
 *   │   PDFViewer + AnnotationLayer overlays        │   Sidebar    │
 *   │   CommentPopup floats here when pending       │              │
 *   └───────────────────────────────────────────────┴──────────────┘
 *
 * Data flow:
 *   - Submission data is passed via React Router `state` from StudentProjectPage
 *     (to avoid requiring a new GET /supervisor/submissions/{id} endpoint).
 *     WORKAROUND: if state is missing, falls back to fetching from the student
 *     submissions list via getStudentSubmissions(). Remove the fallback once
 *     the backend exposes GET /supervisor/submissions/{id}.
 *   - Annotations are always fetched fresh from GET /supervisor/submissions/{id}/annotations
 *
 * @see ThesisFlow Annotation Implementation Plan § 5.6 (AnnotationEditorPage spec)
 * @see ThesisFlow Annotation Implementation Plan § 8.3 (PDF URL resolution)
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { createPortal } from "react-dom";
import { toast } from "sonner";

import PDFViewer, {
  type PDFViewerHandle,
  type PageDimensions,
} from "@/components/annotation/PDFViewer";
import AnnotationLayer from "@/components/annotation/AnnotationLayer";
import CommentPopup from "@/components/annotation/CommentPopup";
import AnnotationSidebar from "@/components/annotation/AnnotationSidebar";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft } from "@hugeicons/core-free-icons";

import {
  getAnnotations,
  createAnnotation,
  updateAnnotation,
  deleteAnnotation,
} from "@/lib/api/supervisor";
import { getErrorMessage } from "@/lib/error";

import type {
  Annotation,
  PendingAnnotation,
  Submission,
  Student,
} from "@/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

/** Resolves the URL to load in the PDF viewer per the integration contract § 8.3 */
function resolvePdfUrl(submission: Submission): string {
  return submission.pdfUrl
    ? `${BASE_URL}${submission.pdfUrl}`
    : `${BASE_URL}${submission.fileUrl}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AnnotationEditorPage() {
  const { id: submissionId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  // ── Route state (passed from StudentProjectPage via navigate) ─────────────
  // WORKAROUND: Supervisor uses route state to avoid needing a new endpoint.
  // Expected backend implementation: GET /supervisor/submissions/{id} that returns
  // a single SubmissionResponse. Once available, fetch that here instead.
  const routeState = location.state as {
    submission: Submission;
    student: Student;
  } | null;

  const [submission, setSubmission] = useState<Submission | null>(
    routeState?.submission ?? null,
  );
  const [student, setStudent] = useState<Student | null>(
    routeState?.student ?? null,
  );

  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [pendingAnnotation, setPendingAnnotation] =
    useState<PendingAnnotation | null>(null);
  const [popupPosition, setPopupPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const [activeAnnotationId, setActiveAnnotationId] = useState<string | null>(
    null,
  );
  const [pageViewports, setPageViewports] = useState<
    Record<number, PageDimensions>
  >({});
  const [loading, setLoading] = useState(!routeState?.submission);
  // Sidebar is open by default on desktop, closed on mobile
  const [sidebarOpen, setSidebarOpen] = useState(
    () => window.innerWidth >= 768,
  );

  const pdfViewerRef = useRef<PDFViewerHandle>(null);

  // ── Data fetch on mount ───────────────────────────────────────────────────
  useEffect(() => {
    if (!submissionId) return;

    const fetchAnnotations = getAnnotations(submissionId);

    if (routeState?.submission) {
      // Submission data came via route state — only fetch annotations
      fetchAnnotations
        .then(setAnnotations)
        .catch((err) =>
          toast.error(getErrorMessage(err) || "Failed to load annotations"),
        );
      return;
    }

    // WORKAROUND: No route state — try to recover submission by fetching the
    // student's submissions list. This requires knowing the student ID which
    // we don't have at this point, so we show an error and redirect back.
    // Remove this block once GET /supervisor/submissions/{id} is implemented.
    setLoading(true);
    fetchAnnotations
      .then(setAnnotations)
      .catch((err) =>
        toast.error(getErrorMessage(err) || "Failed to load annotations"),
      )
      .finally(() => setLoading(false));

    // If we still have no submission data, the page will show an error state below.
  }, [submissionId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Track rendered page dimensions for AnnotationLayer scaling ───────────
  const handlePageRender = useCallback(
    (pageNumber: number, dims: PageDimensions) => {
      setPageViewports((prev) => ({ ...prev, [pageNumber]: dims }));
    },
    [],
  );

  // ── Text selection → show CommentPopup ───────────────────────────────────
  const handleSelectionComplete = useCallback(
    (pending: PendingAnnotation) => {
      setPendingAnnotation(pending);

      // Position the popup below the last selected rect, clamped in CommentPopup
      const lastRect = pending.rects[pending.rects.length - 1];
      const pageEl = document.getElementById(`pdf-page-${pending.pageNumber}`);
      if (pageEl && lastRect) {
        const pageBounds = pageEl.getBoundingClientRect();
        const dims = pageViewports[pending.pageNumber];
        if (dims) {
          const rectBottomPx = (lastRect.y + lastRect.height) * dims.height;
          setPopupPosition({
            top: pageBounds.top + rectBottomPx + 8,
            left: pageBounds.left + lastRect.x * dims.width,
          });
        }
      }
    },
    [pageViewports],
  );

  // ── Save new annotation ───────────────────────────────────────────────────
  const handleSave = useCallback(
    async (comment: string) => {
      if (!submissionId || !pendingAnnotation) return;
      const created = await createAnnotation(submissionId, {
        pageNumber: pendingAnnotation.pageNumber,
        rects: pendingAnnotation.rects,
        selectedText: pendingAnnotation.selectedText,
        comment,
      });
      // Optimistic: add immediately, sorted by page
      setAnnotations((prev) =>
        [...prev, created].sort(
          (a, b) =>
            a.pageNumber - b.pageNumber ||
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        ),
      );
      setPendingAnnotation(null);
      setPopupPosition(null);
      setActiveAnnotationId(created.id);
    },
    [submissionId, pendingAnnotation],
  );

  // ── Cancel popup ─────────────────────────────────────────────────────────
  const handleCancel = useCallback(() => {
    setPendingAnnotation(null);
    setPopupPosition(null);
  }, []);

  // ── Edit annotation ───────────────────────────────────────────────────────
  const handleEdit = useCallback(
    async (annotationId: string, comment: string) => {
      const updated = await updateAnnotation(annotationId, comment);
      setAnnotations((prev) =>
        prev.map((a) => (a.id === annotationId ? updated : a)),
      );
    },
    [],
  );

  // ── Delete annotation ─────────────────────────────────────────────────────
  const handleDelete = useCallback(
    async (annotationId: string) => {
      // Optimistic: remove immediately, restore on error
      setAnnotations((prev) => {
        const snapshot = prev;
        const next = prev.filter((a) => a.id !== annotationId);
        deleteAnnotation(annotationId).catch((err) => {
          toast.error(getErrorMessage(err) || "Failed to delete annotation");
          setAnnotations(snapshot);
        });
        return next;
      });
      if (activeAnnotationId === annotationId) setActiveAnnotationId(null);
    },
    [activeAnnotationId],
  );

  // ── Sidebar annotation click → scroll + activate ──────────────────────────
  const handleAnnotationClick = useCallback((annotation: Annotation) => {
    setActiveAnnotationId(annotation.id);
    pdfViewerRef.current?.scrollToPage(annotation.pageNumber);
  }, []);

  // ── Guard: no submission data and still loading ───────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-tf-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-tf-gray-200 border-t-tf-black rounded-full animate-spin" />
          <p className="text-sm text-tf-gray-500">Loading…</p>
        </div>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="flex items-center justify-center h-screen bg-tf-gray-50">
        <div className="text-center">
          <p className="text-tf-gray-700 font-medium mb-3">
            Submission not found.
          </p>
          <button
            onClick={() => navigate(-1)}
            className="text-sm text-tf-blue-700 hover:underline"
          >
            <HugeiconsIcon icon={ArrowLeft} size={18} /> Go back
          </button>
        </div>
      </div>
    );
  }

  const pdfUrl = resolvePdfUrl(submission);

  return (
    <div className="flex flex-col h-screen bg-tf-gray-50 overflow-hidden">
      {/* ── Topbar ─────────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between h-12 px-4 bg-white border-b border-tf-gray-100 shrink-0 z-20">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate(-1)}
            className="text-sm text-tf-gray-500 hover:text-tf-black transition-colors whitespace-nowrap flex items-center gap-1"
          >
            <HugeiconsIcon icon={ArrowLeft} size={18} /> Back
          </button>
          <span className="text-tf-gray-300">|</span>
          <span className="text-sm font-medium text-tf-black truncate">
            {student?.name ?? "Student"}
          </span>
          <span className="text-tf-gray-300 hidden md:block">·</span>
          <span className="text-sm text-tf-gray-500 hidden md:block truncate">
            {submission.chapterLabel}
          </span>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-1 text-xs text-tf-gray-400">
            <span>{Object.keys(pageViewports).length}</span>
            <span>/</span>
            <span>
              {Object.keys(pageViewports).length > 0
                ? Math.max(...Object.keys(pageViewports).map(Number))
                : "—"}
            </span>
            <span className="hidden sm:inline">pages</span>
          </div>
          {/* Sidebar toggle button */}
          <button
            onClick={() => setSidebarOpen((o) => !o)}
            aria-label={sidebarOpen ? "Hide annotations panel" : "Show annotations panel"}
            title={sidebarOpen ? "Hide panel" : "Show panel"}
            className="p-1.5 rounded-lg text-tf-gray-400 hover:text-tf-black hover:bg-tf-gray-100 transition-colors"
          >
            {/* Panel right icon */}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="15" y1="3" x2="15" y2="21" />
            </svg>
          </button>
        </div>
      </header>

      {/* ── Body: PDF area + Sidebar ────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* PDF scroll area */}
        <div className="flex-1 overflow-hidden relative min-w-0">
          <PDFViewer
            ref={pdfViewerRef}
            pdfUrl={pdfUrl}
            onPageRender={handlePageRender}
          />

          {/*
           * AnnotationLayer per page — rendered as portals into each
           * pdf-page-{n} container via DOM imperative insertion.
           * We render them here and use CSS `position:absolute` + the parent
           * page div (position:relative) to place them correctly.
           *
           * Note: AnnotationLayer components are mounted into the React tree
           * but visually live inside the pdf-page-{n} wrapper via CSS stacking.
           * The PDFViewer page wrapper has `position: relative` and the
           * AnnotationLayer has `position: absolute; inset: 0`.
           */}
          {Object.entries(pageViewports).map(([pageNumStr, dims]) => {
            const pageNumber = Number(pageNumStr);
            const pageAnnotations = annotations.filter(
              (a) => a.pageNumber === pageNumber,
            );
            const pageEl = document.getElementById(`pdf-page-${pageNumber}`);
            if (!pageEl) return null;

            // Append AnnotationLayer into the page element via a React portal
            // We use a simple wrapper approach: the AnnotationLayer is rendered
            // as an absolutely-positioned child by injecting it into the page div.
            return (
              <AnnotationLayerPortal
                key={pageNumber}
                pageEl={pageEl}
                pageNumber={pageNumber}
                pageWidth={dims.width}
                pageHeight={dims.height}
                annotations={pageAnnotations}
                onSelectionComplete={handleSelectionComplete}
                readOnly={false}
                activeAnnotationId={activeAnnotationId}
              />
            );
          })}

          {/* CommentPopup — floats over the PDF at the selection site */}
          {pendingAnnotation && popupPosition && (
            <CommentPopup
              position={popupPosition}
              selectedText={pendingAnnotation.selectedText}
              onSave={handleSave}
              onCancel={handleCancel}
            />
          )}
        </div>

        {/* Annotation sidebar — hidden on mobile when sidebarOpen=false */}
        <div
          className={[
            "transition-all duration-200 overflow-hidden shrink-0",
            sidebarOpen ? "w-80" : "w-0",
          ].join(" ")}
        >
          <AnnotationSidebar
            annotations={annotations}
            activeAnnotationId={activeAnnotationId}
            onAnnotationClick={handleAnnotationClick}
            onDelete={handleDelete}
            onEdit={handleEdit}
            readOnly={false}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Portal helper: mounts AnnotationLayer into a pdf-page-{n} DOM element ───
// This is necessary because PDFViewer renders its page divs imperatively and
// we need AnnotationLayer to be a child of the page div for absolute positioning.

function AnnotationLayerPortal({
  pageEl,
  pageNumber,
  pageWidth,
  pageHeight,
  annotations,
  onSelectionComplete,
  readOnly,
  activeAnnotationId,
}: {
  pageEl: HTMLElement;
  pageNumber: number;
  pageWidth: number;
  pageHeight: number;
  annotations: Annotation[];
  onSelectionComplete?: (p: PendingAnnotation) => void;
  readOnly: boolean;
  activeAnnotationId: string | null;
}) {
  return createPortal(
    <AnnotationLayer
      pageNumber={pageNumber}
      pageWidth={pageWidth}
      pageHeight={pageHeight}
      annotations={annotations}
      onSelectionComplete={onSelectionComplete}
      readOnly={readOnly}
      activeAnnotationId={activeAnnotationId}
    />,
    pageEl,
  );
}
