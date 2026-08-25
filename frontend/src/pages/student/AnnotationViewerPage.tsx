/**
 * AnnotationViewerPage.tsx
 *
 * Read-only annotation viewer for students.
 * Route: /student/submission/:id/annotate
 *
 * Same layout as AnnotationEditorPage but with:
 *   - readOnly={true} on AnnotationLayer (no selection, pointer-events: none)
 *   - No CommentPopup, no edit/delete controls
 *   - AnnotationSidebar shows "Mark resolved" buttons
 *   - Topbar shows annotation count summary
 *
 * WORKAROUND: `annotationCount` is fetched by calling getSubmissionAnnotations()
 * on mount (the annotation array length is used as the count). Once the backend
 * adds annotation_count to SubmissionResponse, this secondary fetch can be
 * eliminated and the count read directly from submission.annotationCount.
 *
 * @see ThesisFlow Annotation Implementation Plan § 5.6 (AnnotationViewerPage spec)
 * @see ThesisFlow Annotation Implementation Plan § 8.3 (PDF URL resolution)
 * @see ThesisFlow Annotation Implementation Plan § 9.4 (resolved annotations)
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import { toast } from "sonner";

import PDFViewer, {
  type PDFViewerHandle,
  type PageDimensions,
} from "@/components/annotation/PDFViewer";
import AnnotationLayer from "@/components/annotation/AnnotationLayer";
import AnnotationSidebar from "@/components/annotation/AnnotationSidebar";

import {
  getSubmissionDetail,
  getSubmissionAnnotations,
  resolveAnnotation,
} from "@/lib/api/student";
import { getErrorMessage } from "@/lib/error";

import type { Annotation, PendingAnnotation, Submission } from "@/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

function resolvePdfUrl(submission: Submission): string {
  return submission.pdfUrl
    ? `${BASE_URL}${submission.pdfUrl}`
    : `${BASE_URL}${submission.fileUrl}`;
}

// ─── Portal helper (same pattern as AnnotationEditorPage) ────────────────────

function AnnotationLayerPortal({
  pageEl,
  pageNumber,
  pageWidth,
  pageHeight,
  annotations,
  activeAnnotationId,
}: {
  pageEl: HTMLElement;
  pageNumber: number;
  pageWidth: number;
  pageHeight: number;
  annotations: Annotation[];
  activeAnnotationId: string | null;
}) {
  return createPortal(
    <AnnotationLayer
      pageNumber={pageNumber}
      pageWidth={pageWidth}
      pageHeight={pageHeight}
      annotations={annotations}
      readOnly={true}
      activeAnnotationId={activeAnnotationId}
    />,
    pageEl,
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AnnotationViewerPage() {
  const { id: submissionId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [submission, setSubmission] = useState<Submission | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [activeAnnotationId, setActiveAnnotationId] = useState<string | null>(
    null,
  );
  const [pageViewports, setPageViewports] = useState<
    Record<number, PageDimensions>
  >({});
  const [loading, setLoading] = useState(true);

  const pdfViewerRef = useRef<PDFViewerHandle>(null);

  // ── Fetch submission + annotations on mount ───────────────────────────────
  useEffect(() => {
    if (!submissionId) return;

    Promise.all([
      getSubmissionDetail(submissionId),
      getSubmissionAnnotations(submissionId),
    ])
      .then(([subData, annotationsData]) => {
        setSubmission(subData);
        // Sort by page number then creation time (matching sidebar sort order)
        setAnnotations(
          [...annotationsData].sort(
            (a, b) =>
              a.pageNumber - b.pageNumber ||
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
          ),
        );
      })
      .catch((err) =>
        toast.error(getErrorMessage(err) || "Failed to load annotations"),
      )
      .finally(() => setLoading(false));
  }, [submissionId]);

  // ── Page render callback ──────────────────────────────────────────────────
  const handlePageRender = useCallback(
    (pageNumber: number, dims: PageDimensions) => {
      setPageViewports((prev) => ({ ...prev, [pageNumber]: dims }));
    },
    [],
  );

  // ── Sidebar annotation click → scroll + activate ─────────────────────────
  const handleAnnotationClick = useCallback((annotation: Annotation) => {
    setActiveAnnotationId(annotation.id);
    pdfViewerRef.current?.scrollToPage(annotation.pageNumber);
  }, []);

  // ── Mark resolved (optimistic update) ────────────────────────────────────
  const handleResolve = useCallback(async (annotationId: string) => {
    // Optimistic: flip resolved flag immediately
    setAnnotations((prev) =>
      prev.map((a) => (a.id === annotationId ? { ...a, resolved: true } : a)),
    );
    try {
      await resolveAnnotation(annotationId);
    } catch (err) {
      // Revert on failure
      toast.error(getErrorMessage(err) || "Failed to mark as resolved");
      setAnnotations((prev) =>
        prev.map((a) =>
          a.id === annotationId ? { ...a, resolved: false } : a,
        ),
      );
    }
  }, []);

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-tf-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-tf-gray-200 border-t-tf-black rounded-full animate-spin" />
          <p className="text-sm text-tf-gray-500">Loading annotations…</p>
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
            ← Go back
          </button>
        </div>
      </div>
    );
  }

  const pdfUrl = resolvePdfUrl(submission);
  const annotationCount = annotations.length;
  const resolvedCount = annotations.filter((a) => a.resolved).length;

  return (
    <div className="flex flex-col h-screen bg-tf-gray-50 overflow-hidden">
      {/* ── Topbar ─────────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between h-12 px-4 bg-white border-b border-tf-gray-100 shrink-0 z-20">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate(`/student/submission/${submissionId}`)}
            className="text-sm text-tf-gray-500 hover:text-tf-black transition-colors whitespace-nowrap flex items-center gap-1"
          >
            ← Back to submission
          </button>
          <span className="text-tf-gray-300 hidden md:block">|</span>
          <span className="text-sm text-tf-gray-500 hidden md:block truncate">
            {submission.chapterLabel}
          </span>
        </div>

        {/* Annotation summary */}
        <div className="flex items-center gap-2 text-xs shrink-0">
          {annotationCount > 0 ? (
            <span className="text-tf-gray-500">
              {resolvedCount}/{annotationCount} resolved
            </span>
          ) : (
            <span className="text-tf-gray-400">No annotations yet</span>
          )}
        </div>
      </header>

      {/* ── Body: PDF area + Sidebar ─────────────────────────────────────────  */}
      <div className="flex flex-1 overflow-hidden">
        {/* PDF scroll area */}
        <div className="flex-1 overflow-hidden relative">
          <PDFViewer
            ref={pdfViewerRef}
            pdfUrl={pdfUrl}
            onPageRender={handlePageRender}
          />

          {/* AnnotationLayer per page (read-only, pointer-events: none) */}
          {Object.entries(pageViewports).map(([pageNumStr, dims]) => {
            const pageNumber = Number(pageNumStr);
            const pageAnnotations = annotations.filter(
              (a) => a.pageNumber === pageNumber,
            );
            const pageEl = document.getElementById(`pdf-page-${pageNumber}`);
            if (!pageEl) return null;

            return (
              <AnnotationLayerPortal
                key={pageNumber}
                pageEl={pageEl}
                pageNumber={pageNumber}
                pageWidth={dims.width}
                pageHeight={dims.height}
                annotations={pageAnnotations}
                activeAnnotationId={activeAnnotationId}
              />
            );
          })}
        </div>

        {/* Annotation sidebar — student mode */}
        <AnnotationSidebar
          annotations={annotations}
          activeAnnotationId={activeAnnotationId}
          onAnnotationClick={handleAnnotationClick}
          onResolve={handleResolve}
          readOnly={true}
        />
      </div>
    </div>
  );
}
