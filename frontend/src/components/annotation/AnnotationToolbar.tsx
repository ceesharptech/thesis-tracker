/**
 * AnnotationToolbar.tsx
 *
 * Custom (ThesisFlow-styled) toolbar for the annotation feature.
 * Must be rendered INSIDE <EmbedPDF> because it reads plugin state via hooks.
 *
 * Phase 2 contents:
 *   - Highlight tool toggle  -> annotation scope `setActiveTool("highlight")`
 *   - Delete selected        -> annotation scope `deleteAnnotation(pageIndex, id)`
 *   - Zoom controls          -> TEMPORARY, only so highlight accuracy can be
 *                               verified at different zoom levels. Remove or
 *                               restyle before Phase 6.
 *
 * No "Save" button yet — depends on the Phase 3 persistence layer.
 *
 * @see ANNOTATION_FEATURE_CONTEXT.md § 8 (AnnotationToolbar spec)
 */

import { useAnnotation } from "@embedpdf/plugin-annotation/react";
import { useZoom } from "@embedpdf/plugin-zoom/react";

/** Tool id of EmbedPDF's built-in highlight tool (annotation plugin default tools). */
const HIGHLIGHT_TOOL_ID = "highlight";

interface AnnotationToolbarProps {
  documentId: string;
  /** Autosave status shown at the right of the action buttons. */
  saveStatus?: SaveStatus;
}

export type SaveStatus = "idle" | "saving" | "saved" | "error";

const STATUS_LABEL: Record<Exclude<SaveStatus, "idle">, string> = {
  saving: "Saving…",
  saved: "Saved",
  error: "Save failed",
};

const baseBtn =
  "px-4 py-2 text-sm font-medium rounded-xl border transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed";
const idleBtn = "border-tf-gray-200 text-tf-gray-700 bg-white hover:bg-tf-gray-100";
const activeBtn = "border-tf-black bg-tf-black text-white";

export default function AnnotationToolbar({
  documentId,
  saveStatus = "idle",
}: AnnotationToolbarProps) {
  const { state, provides } = useAnnotation(documentId);
  const { state: zoomState, provides: zoom } = useZoom(documentId);

  const highlightActive = state.activeToolId === HIGHLIGHT_TOOL_ID;
  const hasSelection = state.selectedUids.length > 0;

  const toggleHighlight = () => {
    provides?.setActiveTool(highlightActive ? null : HIGHLIGHT_TOOL_ID);
  };

  const deleteSelected = () => {
    if (!provides) return;
    const targets = provides.getSelectedAnnotations().map((ta) => ({
      pageIndex: ta.object.pageIndex,
      id: ta.object.id,
    }));
    if (targets.length) provides.deleteAnnotations(targets);
  };

  return (
    <div
      id="annotation-toolbar"
      className="flex items-center justify-between gap-3 px-6 py-2 border-b border-tf-gray-200 bg-white shrink-0"
    >
      <div className="flex items-center gap-2">
        <button
          id="annotation-toolbar-highlight"
          type="button"
          onClick={toggleHighlight}
          disabled={!provides}
          aria-pressed={highlightActive}
          className={`${baseBtn} ${highlightActive ? activeBtn : idleBtn}`}
        >
          Highlight
        </button>
        <button
          id="annotation-toolbar-delete"
          type="button"
          onClick={deleteSelected}
          disabled={!provides || !hasSelection}
          className={`${baseBtn} ${idleBtn}`}
        >
          Delete
        </button>
        {saveStatus !== "idle" && (
          <span
            id="annotation-save-status"
            role="status"
            className={`ml-2 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
              saveStatus === "error"
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-tf-gray-200 bg-tf-gray-50 text-tf-gray-600"
            }`}
          >
            {saveStatus === "saving" && (
              <span className="h-2.5 w-2.5 animate-spin rounded-full border border-tf-gray-300 border-t-tf-black" />
            )}
            {STATUS_LABEL[saveStatus]}
          </span>
        )}
      </div>

      {/* TEMPORARY zoom controls — Phase 2 verification only */}
      <div className="flex items-center gap-2">
        <button
          id="annotation-toolbar-zoom-out"
          type="button"
          onClick={() => zoom?.zoomOut()}
          disabled={!zoom}
          className={`${baseBtn} ${idleBtn}`}
          aria-label="Zoom out"
        >
          −
        </button>
        <span className="text-sm text-tf-gray-500 w-14 text-center tabular-nums">
          {Math.round((zoomState?.currentZoomLevel ?? 1) * 100)}%
        </span>
        <button
          id="annotation-toolbar-zoom-in"
          type="button"
          onClick={() => zoom?.zoomIn()}
          disabled={!zoom}
          className={`${baseBtn} ${idleBtn}`}
          aria-label="Zoom in"
        >
          +
        </button>
      </div>
    </div>
  );
}
