/**
 * AnnotationSidebar.tsx
 *
 * The 320px right panel listing all annotations for the open document.
 * Sorted by page number then creation time (parent should pass pre-sorted).
 *
 * Supervisor mode (readOnly = false):
 *   - Each card has Edit (pencil) and Delete (trash) ghost buttons
 *   - Edit turns the comment body into an inline textarea
 *   - Delete shows a confirm step before calling onDelete
 *
 * Student mode (readOnly = true):
 *   - "Mark resolved" button on unresolved cards → calls onResolve
 *   - Resolved cards show a green "Resolved" badge
 *
 * Clicking any card calls onAnnotationClick which:
 *   - Scrolls the PDFViewer to that page
 *   - Sets activeAnnotationId (triggers highlight pulse)
 *
 * @see ThesisFlow Annotation Implementation Plan § 5.6 (AnnotationSidebar spec)
 */

import { useState, useCallback } from "react";
import { formatDistanceToNow } from "date-fns";
import type { Annotation } from "@/types";
import { cn } from "../../../@/lib/utils";

// ─── Props ────────────────────────────────────────────────────────────────────

interface AnnotationSidebarProps {
  annotations: Annotation[];
  activeAnnotationId: string | null;
  onAnnotationClick: (annotation: Annotation) => void;
  /** Supervisor only: called after user confirms deletion. */
  onDelete?: (annotationId: string) => Promise<void>;
  /** Supervisor only: called after user saves an inline edit. */
  onEdit?: (annotationId: string, comment: string) => Promise<void>;
  /** Student only: mark an annotation as resolved. */
  onResolve?: (annotationId: string) => Promise<void>;
  readOnly: boolean;
}

// ─── Sub-component: inline edit form ─────────────────────────────────────────

function InlineEditor({
  initialComment,
  onSave,
  onCancel,
}: {
  initialComment: string;
  onSave: (comment: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initialComment);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!value.trim() || saving) return;
    setSaving(true);
    try {
      await onSave(value.trim());
    } catch {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 mt-1">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") onCancel();
        }}
        rows={3}
        autoFocus
        className={cn(
          "w-full resize-none rounded-lg border border-tf-gray-200 px-2 py-1.5",
          "text-sm text-tf-black focus:outline-none focus:ring-2",
          "focus:ring-tf-blue-500/30 focus:border-tf-blue-500 transition-colors",
        )}
      />
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={!value.trim() || saving}
          className={cn(
            "flex-1 py-1 text-xs font-medium rounded-lg bg-tf-black text-white",
            "hover:bg-tf-gray-900 transition-colors",
            "disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5",
          )}
        >
          {saving && (
            <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          )}
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          onClick={onCancel}
          className="flex-1 py-1 text-xs rounded-lg border border-tf-gray-200 text-tf-gray-700 hover:bg-tf-gray-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Sub-component: single annotation card ────────────────────────────────────

function AnnotationCard({
  annotation,
  isActive,
  readOnly,
  onAnnotationClick,
  onDelete,
  onEdit,
  onResolve,
}: {
  annotation: Annotation;
  isActive: boolean;
  readOnly: boolean;
  onAnnotationClick: (a: Annotation) => void;
  onDelete?: (id: string) => Promise<void>;
  onEdit?: (id: string, comment: string) => Promise<void>;
  onResolve?: (id: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [resolving, setResolving] = useState(false);

  const handleDelete = async () => {
    if (!onDelete) return;
    setDeleting(true);
    try {
      await onDelete(annotation.id);
    } catch {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const handleResolve = async () => {
    if (!onResolve) return;
    setResolving(true);
    try {
      await onResolve(annotation.id);
    } catch {
      setResolving(false);
    }
  };

  // Format the timestamp — handle missing Z suffix (same pattern as existing pages)
  const formattedTime = (() => {
    try {
      const iso = annotation.createdAt.endsWith("Z")
        ? annotation.createdAt
        : `${annotation.createdAt}Z`;
      return formatDistanceToNow(new Date(iso), { addSuffix: true });
    } catch {
      return "";
    }
  })();

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={isActive}
      onClick={() => onAnnotationClick(annotation)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onAnnotationClick(annotation);
      }}
      className={cn(
        "rounded-xl border transition-all duration-150 cursor-pointer select-none",
        "hover:border-tf-gray-200 hover:shadow-sm",
        isActive
          ? "border-tf-blue-500 bg-tf-blue-50/40 border-l-2 border-l-tf-blue-700"
          : "border-tf-gray-100 bg-white",
      )}
    >
      <div className="p-3 flex flex-col gap-2">
        {/* Header: page badge + author + time */}
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-tf-blue-50 text-tf-blue-700">
            P.{annotation.pageNumber}
          </span>
          <div className="flex items-center gap-1 ml-auto">
            <span className="text-xs text-tf-gray-400 truncate max-w-[100px]">
              {annotation.authorName}
            </span>
            <span className="text-xs text-tf-gray-300">·</span>
            <span className="text-xs text-tf-gray-400 whitespace-nowrap">
              {formattedTime}
            </span>
          </div>
        </div>

        {/* Selected text excerpt */}
        {annotation.selectedText && (
          <p className="text-xs text-tf-gray-500 italic line-clamp-2 leading-relaxed border-l-2 border-yellow-300 pl-2">
            "{annotation.selectedText}"
          </p>
        )}

        {/* Comment body or inline editor */}
        {editing ? (
          <InlineEditor
            initialComment={annotation.comment}
            onSave={async (updated) => {
              await onEdit?.(annotation.id, updated);
              setEditing(false);
            }}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <p className="text-sm text-tf-gray-700 leading-relaxed">
            {annotation.comment}
          </p>
        )}

        {/* ── Resolved badge (student view) ──────────────────────────────── */}
        {annotation.resolved && (
          <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-tf-green-50 text-tf-green-700 self-start">
            <span className="w-1.5 h-1.5 rounded-full bg-tf-green-700" />
            Resolved
          </span>
        )}

        {/* ── Supervisor actions (edit / delete) ─────────────────────────── */}
        {!readOnly && !editing && (
          <div
            className="flex items-center gap-1.5 mt-1"
            onClick={(e) => e.stopPropagation()} // don't trigger card click
          >
            {confirmDelete ? (
              // Confirm step
              <div className="flex items-center gap-1.5 w-full">
                <span className="text-xs text-tf-red-700 flex-1">
                  Delete annotation?
                </span>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="text-xs px-2 py-0.5 rounded-lg bg-tf-red-700 text-white hover:bg-red-800 transition-colors disabled:opacity-60"
                >
                  {deleting ? "…" : "Yes"}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="text-xs px-2 py-0.5 rounded-lg border border-tf-gray-200 text-tf-gray-700 hover:bg-tf-gray-50 transition-colors"
                >
                  No
                </button>
              </div>
            ) : (
              <>
                {/* Edit button */}
                <button
                  aria-label="Edit annotation"
                  onClick={() => setEditing(true)}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs text-tf-gray-500 hover:text-tf-black hover:bg-tf-gray-50 transition-colors"
                >
                  {/* Pencil icon (inline SVG to avoid extra dependency) */}
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                  Edit
                </button>

                {/* Delete button */}
                <button
                  aria-label="Delete annotation"
                  onClick={() => setConfirmDelete(true)}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs text-tf-gray-500 hover:text-tf-red-700 hover:bg-tf-red-50 transition-colors"
                >
                  {/* Trash icon */}
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14H6L5 6" />
                    <path d="M10 11v6M14 11v6" />
                    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                  </svg>
                  Delete
                </button>
              </>
            )}
          </div>
        )}

        {/* ── Student: Mark resolved button ──────────────────────────────── */}
        {readOnly && !annotation.resolved && (
          <div
            className="mt-1"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleResolve}
              disabled={resolving}
              className={cn(
                "text-xs px-2.5 py-1 rounded-lg border border-tf-green-700/30",
                "text-tf-green-700 hover:bg-tf-green-50 transition-colors",
                "disabled:opacity-60 disabled:cursor-not-allowed",
                "flex items-center gap-1.5",
              )}
            >
              {resolving && (
                <span className="w-3 h-3 border-2 border-tf-green-700/30 border-t-tf-green-700 rounded-full animate-spin" />
              )}
              {resolving ? "Marking…" : "Mark resolved"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main sidebar component ───────────────────────────────────────────────────

export default function AnnotationSidebar({
  annotations,
  activeAnnotationId,
  onAnnotationClick,
  onDelete,
  onEdit,
  onResolve,
  readOnly,
}: AnnotationSidebarProps) {
  // Stable click handler passed down to each card
  const handleClick = useCallback(
    (annotation: Annotation) => {
      onAnnotationClick(annotation);
    },
    [onAnnotationClick],
  );

  return (
    <aside
      className="flex flex-col h-full bg-tf-gray-50 border-l border-tf-gray-100"
      style={{ width: 320, minWidth: 320 }}
      aria-label="Annotations panel"
    >
      {/* Sidebar header */}
      <div className="px-4 py-3 border-b border-tf-gray-100 bg-white flex items-center justify-between">
        <h2 className="text-sm font-semibold text-tf-black">
          Annotations
        </h2>
        {annotations.length > 0 && (
          <span className="text-xs text-tf-gray-400">
            {annotations.length} total
          </span>
        )}
      </div>

      {/* Annotation list */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {annotations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            {/* Annotation icon placeholder */}
            <div className="w-10 h-10 rounded-full bg-tf-gray-100 flex items-center justify-center">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-tf-gray-400"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <p className="text-sm text-tf-gray-400 max-w-[200px] leading-relaxed">
              {readOnly
                ? "No annotations from your supervisor yet."
                : "Select text on the PDF to add an annotation."}
            </p>
          </div>
        ) : (
          annotations.map((annotation) => (
            <AnnotationCard
              key={annotation.id}
              annotation={annotation}
              isActive={annotation.id === activeAnnotationId}
              readOnly={readOnly}
              onAnnotationClick={handleClick}
              onDelete={onDelete}
              onEdit={onEdit}
              onResolve={onResolve}
            />
          ))
        )}
      </div>

      {/* Footer hint (supervisor only) */}
      {!readOnly && annotations.length > 0 && (
        <div className="px-4 py-2.5 border-t border-tf-gray-100 bg-white">
          <p className="text-xs text-tf-gray-400 text-center">
            Click a card to jump to the highlight
          </p>
        </div>
      )}
    </aside>
  );
}

export type { AnnotationSidebarProps };
