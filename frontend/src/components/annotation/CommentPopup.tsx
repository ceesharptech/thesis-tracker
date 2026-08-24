/**
 * CommentPopup.tsx
 *
 * A floating card that appears after the supervisor completes a text selection.
 * Positioned near the bottom of the selection bounding rect, clamped to the
 * viewport so it never renders off-screen.
 *
 * Behaviour:
 *  - Auto-focuses the textarea on mount
 *  - Save button is disabled while textarea is empty or a save is in progress
 *  - Escape key calls onCancel
 *  - Clicking inside the popup does NOT close it
 *  - Clicking outside the popup calls onCancel
 *
 * @see ThesisFlow Annotation Implementation Plan § 5.6 (CommentPopup spec)
 */

import {
  useEffect,
  useRef,
  useState,
  useCallback,
  type KeyboardEvent,
} from "react";
import { cn } from "../../../@/lib/utils";

// ─── Props ────────────────────────────────────────────────────────────────────

interface CommentPopupProps {
  /**
   * Viewport-relative position for the popup's top-left corner.
   * Clamped so the popup stays on-screen.
   */
  position: { top: number; left: number };
  /** The highlighted text (shown as preview inside the popup). */
  selectedText: string;
  /**
   * Called when the supervisor clicks Save. Receives the comment body.
   * The parent is responsible for the API call and should return a promise;
   * the popup shows a saving spinner while it resolves.
   */
  onSave: (comment: string) => Promise<void>;
  /** Called on Cancel or Escape. Parent clears pendingAnnotation state. */
  onCancel: () => void;
}

// Popup width in px — must match the style below for clamping math
const POPUP_WIDTH = 320;
const POPUP_ESTIMATED_HEIGHT = 220;
const VIEWPORT_PADDING = 16;

// ─── Component ────────────────────────────────────────────────────────────────

export default function CommentPopup({
  position,
  selectedText,
  onSave,
  onCancel,
}: CommentPopupProps) {
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  // ── Auto-focus textarea ───────────────────────────────────────────────────
  useEffect(() => {
    // Short delay so the popup finishes mounting before focus
    const timer = setTimeout(() => textareaRef.current?.focus(), 50);
    return () => clearTimeout(timer);
  }, []);

  // ── Outside-click detection ───────────────────────────────────────────────
  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(e.target as Node)
      ) {
        onCancel();
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [onCancel]);

  // ── Escape key ────────────────────────────────────────────────────────────
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      }
    },
    [onCancel],
  );

  // ── Save handler ──────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!comment.trim() || saving) return;
    setSaving(true);
    try {
      await onSave(comment.trim());
      // Parent clears pendingAnnotation on success, which unmounts this popup.
    } catch {
      // Parent shows toast.error(); keep popup open so user can retry.
      setSaving(false);
    }
  }, [comment, saving, onSave]);

  // ── Clamp position to viewport ────────────────────────────────────────────
  const clampedLeft = Math.min(
    Math.max(position.left, VIEWPORT_PADDING),
    window.innerWidth - POPUP_WIDTH - VIEWPORT_PADDING,
  );
  const clampedTop = Math.min(
    Math.max(position.top, VIEWPORT_PADDING),
    window.innerHeight - POPUP_ESTIMATED_HEIGHT - VIEWPORT_PADDING,
  );

  return (
    <div
      ref={popupRef}
      role="dialog"
      aria-label="Add annotation comment"
      // Stop propagation so mousedown inside popup doesn't dismiss it
      onPointerDown={(e) => e.stopPropagation()}
      style={{
        position: "fixed",
        top: clampedTop,
        left: clampedLeft,
        width: POPUP_WIDTH,
        zIndex: 50,
      }}
      className={cn(
        "bg-white rounded-xl border border-tf-gray-100 shadow-xl",
        "flex flex-col gap-3 p-4",
        // Subtle entrance animation
        "animate-in fade-in slide-in-from-bottom-2 duration-150",
      )}
    >
      {/* Selected text preview */}
      {selectedText && (
        <div className="flex items-start gap-2">
          {/* Yellow accent bar mimicking the highlight colour */}
          <div
            className="w-1 shrink-0 rounded-full mt-0.5"
            style={{
              height: "auto",
              minHeight: "1.25rem",
              background: "rgba(255, 220, 0, 0.8)",
              alignSelf: "stretch",
            }}
          />
          <p className="text-xs text-tf-gray-500 italic line-clamp-2 leading-relaxed">
            "{selectedText}"
          </p>
        </div>
      )}

      {/* Comment textarea */}
      <textarea
        ref={textareaRef}
        id="annotation-comment-input"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Add a comment…"
        disabled={saving}
        rows={4}
        className={cn(
          "w-full resize-none rounded-lg border border-tf-gray-200 px-3 py-2",
          "text-sm text-tf-black placeholder:text-tf-gray-400",
          "focus:outline-none focus:ring-2 focus:ring-tf-blue-500/30 focus:border-tf-blue-500",
          "transition-colors disabled:opacity-60 disabled:cursor-not-allowed",
        )}
        style={{ minHeight: 80 }}
      />

      {/* Actions */}
      <div className="flex items-center justify-end gap-2">
        <button
          onClick={onCancel}
          disabled={saving}
          className={cn(
            "px-3 py-1.5 text-sm rounded-lg border border-tf-gray-200",
            "text-tf-gray-700 hover:bg-tf-gray-50 transition-colors",
            "disabled:opacity-60 disabled:cursor-not-allowed",
          )}
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={!comment.trim() || saving}
          className={cn(
            "px-3 py-1.5 text-sm rounded-lg font-medium",
            "bg-tf-black text-white",
            "hover:bg-tf-gray-900 transition-colors",
            "disabled:opacity-40 disabled:cursor-not-allowed",
            "flex items-center gap-2",
          )}
        >
          {saving && (
            <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          )}
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}

export type { CommentPopupProps };
