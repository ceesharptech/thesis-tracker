/**
 * CommentEditor.tsx
 *
 * Small popup shown next to a freshly drawn highlight so the supervisor can
 * attach a comment. Pure presentational + keyboard handling; all annotation
 * API calls (updateAnnotation / deleteAnnotation) live in AnnotationViewer.
 *
 *  - Save (disabled when empty/whitespace): Ctrl/Cmd+Enter
 *  - Cancel (discards the highlight):       Escape
 *  - Textarea autofocuses.
 *
 * `data-no-interaction` tells EmbedPDF's interaction manager to ignore
 * pointer events originating here, so typing/clicking in the popup never
 * starts a new text selection / highlight on the page underneath.
 *
 * @see ANNOTATION_FEATURE_CONTEXT.md § 8 (CommentEditor spec)
 */

import { useEffect, useRef, useState } from "react";

const MAX_QUOTE_LENGTH = 120;

interface CommentEditorProps {
  /** The highlighted PDF text (may be empty if unavailable). */
  quote: string;
  onSave: (text: string) => void;
  onCancel: () => void;
  /** Reports the live draft so the parent can resolve it if the popup is superseded. */
  onDraftChange?: (draft: string) => void;
}

const truncate = (s: string) =>
  s.length > MAX_QUOTE_LENGTH ? `${s.slice(0, MAX_QUOTE_LENGTH).trimEnd()}…` : s;

const stop = (e: React.SyntheticEvent) => e.stopPropagation();

export default function CommentEditor({
  quote,
  onSave,
  onCancel,
  onDraftChange,
}: CommentEditorProps) {
  const [text, setText] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const canSave = text.trim().length > 0;

  // Keep latest handlers/values for the document-level key listener.
  const latest = useRef({ text, canSave, onSave, onCancel });
  latest.current = { text, canSave, onSave, onCancel };

  useEffect(() => {
    textareaRef.current?.focus({ preventScroll: true });
    // Make sure the popup is visible if the highlight is near the bottom of
    // the scroll container.
    rootRef.current?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const { text: t, canSave: ok, onSave: save, onCancel: cancel } =
        latest.current;
      if (e.key === "Escape") {
        e.preventDefault();
        cancel();
      } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (ok) save(t.trim());
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  return (
    <div
      ref={rootRef}
      id="annotation-comment-editor"
      data-no-interaction
      onPointerDown={stop}
      onMouseDown={stop}
      onClick={stop}
      onDoubleClick={stop}
      className="w-72 rounded-xl border border-tf-gray-300 bg-white p-3 text-left"
    >
      {quote && (
        <p className="mb-2 border-l-2 border-tf-gray-300 pl-2 text-xs italic text-tf-gray-500 line-clamp-3">
          “{truncate(quote)}”
        </p>
      )}
      <textarea
        ref={textareaRef}
        id="annotation-comment-textarea"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          onDraftChange?.(e.target.value);
        }}
        rows={3}
        placeholder="Add a comment…"
        className="w-full resize-none rounded-lg border border-tf-gray-200 px-2 py-1.5 text-sm text-tf-black outline-none focus:border-tf-black"
      />
      <div className="mt-2 flex items-center justify-between">
        <span className="text-[10px] text-tf-gray-400">
          Ctrl+Enter to save · Esc to cancel
        </span>
        <div className="flex gap-2">
          <button
            id="annotation-comment-cancel"
            type="button"
            onClick={onCancel}
            className="cursor-pointer rounded-lg border border-tf-gray-200 bg-white px-3 py-1 text-xs font-medium text-tf-gray-700 transition-colors hover:bg-tf-gray-100"
          >
            Cancel
          </button>
          <button
            id="annotation-comment-save"
            type="button"
            onClick={() => canSave && onSave(text.trim())}
            disabled={!canSave}
            className="cursor-pointer rounded-lg border border-tf-black bg-tf-black px-3 py-1 text-xs font-medium text-white transition-colors disabled:cursor-not-allowed disabled:opacity-40"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
