/**
 * AnnotationViewer.tsx
 *
 * Wraps <EmbedPDF> to render a PDF as a scrollable, multi-page view using
 * PDFium (WebAssembly) via @embedpdf/engines, with highlight annotations,
 * comments, and mock persistence.
 *
 * Plugins: DocumentManager, Viewport, Scroll, Render (Phase 1);
 * InteractionManager, Selection, History, Annotation, Zoom (Phase 2).
 * Zoom is only used by the temporary toolbar zoom controls (test aid).
 *
 * Phase 3 adds (all inside <AnnotationWorkspace>, because the hooks need the
 * EmbedPDF context):
 *  - Load: getAnnotationsData(submissionId) -> parse -> importAnnotations()
 *  - Comment popup (CommentEditor) for user-drawn highlights
 *  - Autosave (debounced) via exportAnnotations() -> saveAnnotationsData()
 *
 * How user-drawn highlights are told apart from imported ones
 * (verified against @embedpdf/plugin-annotation 2.15.1 source):
 *  - A user-drawn highlight goes through createAnnotation(), which emits a
 *    `create` event with `committed: false` and later (after the engine
 *    commit) a second `create` with `committed: true`.
 *  - importAnnotations() does NOT emit the `committed: false` create; it only
 *    emits the `committed: true` create when the import is committed.
 *  So we record ids seen in a `committed: false` create (and with no comment
 *    yet) and open the popup only when that same id later gets its
 *    `committed: true` create. Imported ids are additionally tracked by id and
 *    their initial commit event is ignored for autosave.
 *
 * `readOnly` currently only hides the toolbar and disables the popup and
 * autosave; the per-annotation readOnly flag on import is Phase 5.
 *
 * @see ANNOTATION_FEATURE_CONTEXT.md § 8 (AnnotationViewer spec)
 * @see ANNOTATION_FEATURE_CONTEXT.md § 10 Phases 1-3
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { EmbedPDF } from "@embedpdf/core/react";
import { createPluginRegistration } from "@embedpdf/core";
import { usePdfiumEngine } from "@embedpdf/engines/react";
import { DocumentManagerPluginPackage } from "@embedpdf/plugin-document-manager/react";
import {
  ViewportPluginPackage,
  Viewport,
} from "@embedpdf/plugin-viewport/react";
import { ScrollPluginPackage, Scroller } from "@embedpdf/plugin-scroll/react";
import {
  RenderPluginPackage,
  RenderLayer,
} from "@embedpdf/plugin-render/react";
import {
  InteractionManagerPluginPackage,
  GlobalPointerProvider,
  PagePointerProvider,
} from "@embedpdf/plugin-interaction-manager/react";
import {
  SelectionPluginPackage,
  SelectionLayer,
} from "@embedpdf/plugin-selection/react";
import { HistoryPluginPackage } from "@embedpdf/plugin-history/react";
import {
  AnnotationPluginPackage,
  AnnotationLayer,
  useAnnotation,
} from "@embedpdf/plugin-annotation/react";
import type {
  AnnotationSelectionMenuProps,
  AnnotationTransferItem,
} from "@embedpdf/plugin-annotation/react";
import { ZoomPluginPackage, ZoomMode } from "@embedpdf/plugin-zoom/react";
import { PdfAnnotationSubtype } from "@embedpdf/models";
import type { PdfAnnotationObject } from "@embedpdf/models";
import AnnotationToolbar from "./AnnotationToolbar";
import type { SaveStatus } from "./AnnotationToolbar";
import CommentEditor from "./CommentEditor";
import {
  parseAnnotations,
  serializeAnnotations,
} from "./annotationSerialization";
import {
  getAnnotationsData,
  saveAnnotationsData,
} from "@/lib/api/mockAnnotations";

// ─── Props ────────────────────────────────────────────────────────────────────

export interface AnnotationUser {
  id: string;
  name: string;
}

interface AnnotationViewerProps {
  /** URL or object URL (blob) pointing to the PDF to render. */
  pdfSource: string;
  /** Submission ID used as the persistence key (via the mock API layer). */
  submissionId: string;
  /**
   * When true, the viewer is read-only (student mode): no toolbar, no comment
   * popup, no autosave. (Per-annotation readOnly flags are Phase 5.)
   */
  readOnly: boolean;
  /** Author attached to new comments. */
  currentUser: AnnotationUser;
  /**
   * Optional: called whenever the committed (commented) highlight list
   * changes. Lets the host page (debug panel now, sidebar in Phase 4) mirror
   * the annotations without reaching into the plugin.
   */
  onAnnotationsChange?: (annotations: PdfAnnotationObject[]) => void;
}

// ─── Pending-comment context (feeds the in-page popup) ───────────────────────

interface PendingComment {
  id: string;
  pageIndex: number;
  quote: string;
}

interface PendingCommentContextValue {
  pending: PendingComment | null;
  save: (text: string) => void;
  cancel: () => void;
  onDraftChange: (draft: string) => void;
}

const PendingCommentContext = createContext<PendingCommentContextValue | null>(
  null,
);

/**
 * Rendered by <AnnotationLayer selectionMenu> for every annotation. It only
 * produces output for the highlight that is awaiting a comment. The layer
 * positions `menuWrapperProps` relative to the annotation and keeps it in
 * sync with scroll and zoom, so the popup stays anchored for free. It is
 * rendered regardless of selection state, so clicking elsewhere on the page
 * does not dismiss it.
 */
function PendingCommentMenu({
  context,
  menuWrapperProps,
  rect,
}: AnnotationSelectionMenuProps) {
  const ctx = useContext(PendingCommentContext);
  if (!ctx?.pending || context.annotation.object.id !== ctx.pending.id) {
    return null;
  }
  return (
    <div {...menuWrapperProps}>
      <div
        style={{
          position: "absolute",
          top: rect.size.height + 8,
          left: 0,
          pointerEvents: "auto",
          zIndex: 50,
        }}
      >
        <CommentEditor
          key={ctx.pending.id}
          quote={ctx.pending.quote}
          onSave={ctx.save}
          onCancel={ctx.cancel}
          onDraftChange={ctx.onDraftChange}
        />
      </div>
    </div>
  );
}

const renderSelectionMenu = (props: AnnotationSelectionMenuProps) => (
  <PendingCommentMenu {...props} />
);

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SAVE_DEBOUNCE_MS = 500;

/** Adapt an EmbedPDF Task to a Promise (Task exposes wait(resolve, reject)). */
function taskToPromise<T>(task: {
  wait: (ok: (v: T) => void, err: (e: unknown) => void) => void;
}): Promise<T> {
  return new Promise<T>((resolve, reject) => task.wait(resolve, reject));
}

const hasOurCustomData = (a: PdfAnnotationObject) =>
  typeof a.custom?.authorId === "string" && a.custom.authorId.length > 0;

// ─── Workspace (lives inside <EmbedPDF>) ─────────────────────────────────────

interface WorkspaceProps {
  documentId: string;
  submissionId: string;
  readOnly: boolean;
  currentUser: AnnotationUser;
  onAnnotationsChange?: (annotations: PdfAnnotationObject[]) => void;
}

function AnnotationWorkspace({
  documentId,
  submissionId,
  readOnly,
  currentUser,
  onAnnotationsChange,
}: WorkspaceProps) {
  const { provides: annotation } = useAnnotation(documentId);

  const [pending, setPending] = useState<PendingComment | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

  // Refs hold the mutable bookkeeping so event handlers never go stale.
  const pendingRef = useRef<PendingComment | null>(null);
  const draftRef = useRef("");
  /** Ids seen in a `committed:false` create that still need a comment. */
  const userDrawnRef = useRef(new Set<string>());
  /** Ids we imported; their initial commit event must not trigger autosave. */
  const importedRef = useRef(new Set<string>());
  const loadKeyRef = useRef<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentUserRef = useRef(currentUser);
  currentUserRef.current = currentUser;
  const onChangeRef = useRef(onAnnotationsChange);
  onChangeRef.current = onAnnotationsChange;

  const setPendingBoth = useCallback((p: PendingComment | null) => {
    pendingRef.current = p;
    draftRef.current = "";
    setPending(p);
  }, []);

  // ── Mirror the committed highlight list to the host page ─────────────────
  const emitList = useCallback(() => {
    if (!annotation || !onChangeRef.current) return;
    try {
      const list = annotation
        .getAnnotations()
        .filter(
          (ta) =>
            ta.commitState !== "deleted" &&
            ta.object.type === PdfAnnotationSubtype.HIGHLIGHT &&
            hasOurCustomData(ta.object),
        )
        .map((ta) => ta.object);
      onChangeRef.current(list);
    } catch {
      /* annotation state not ready yet */
    }
  }, [annotation]);

  // ── Autosave ─────────────────────────────────────────────────────────────
  const runSave = useCallback(async () => {
    // Never persist while a comment is pending; finishPending() re-schedules.
    if (readOnly || !annotation || pendingRef.current) return;
    setSaveStatus("saving");
    try {
      const items = await taskToPromise<AnnotationTransferItem[]>(
        annotation.exportAnnotations(),
      );
      await saveAnnotationsData(submissionId, serializeAnnotations(items));
      setSaveStatus("saved");
    } catch (err) {
      console.error("[annotations] Autosave failed:", err);
      setSaveStatus("error");
    }
  }, [annotation, readOnly, submissionId]);

  const scheduleSave = useCallback(() => {
    if (readOnly) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(runSave, SAVE_DEBOUNCE_MS);
  }, [readOnly, runSave]);

  useEffect(
    () => () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    },
    [],
  );

  // ── Pending-comment resolution ───────────────────────────────────────────
  const savePending = useCallback(
    (text: string) => {
      const p = pendingRef.current;
      if (!p || !annotation) return;
      const existing = annotation.getAnnotationById(p.id)?.object.custom ?? {};
      setPendingBoth(null);
      annotation.updateAnnotation(p.pageIndex, p.id, {
        contents: text,
        // Merge so EmbedPDF's own custom.text (the highlighted text) survives.
        custom: {
          ...existing,
          resolved: false,
          // currentUser is supplied by the host page (mock user on the test
          // route; the logged-in user from the auth store in Phase 6).
          authorId: currentUserRef.current.id,
          authorName: currentUserRef.current.name,
        },
      });
      scheduleSave();
    },
    [annotation, scheduleSave, setPendingBoth],
  );

  const cancelPending = useCallback(() => {
    const p = pendingRef.current;
    if (!p || !annotation) return;
    setPendingBoth(null);
    // A highlight with no comment must never persist.
    annotation.deleteAnnotation(p.pageIndex, p.id);
    scheduleSave();
  }, [annotation, scheduleSave, setPendingBoth]);

  const onDraftChange = useCallback((draft: string) => {
    draftRef.current = draft;
  }, []);

  // ── Load saved annotations (idempotent, error-tolerant) ──────────────────
  useEffect(() => {
    if (!annotation) return;
    // Guard by (document, submission) so StrictMode's double effect and any
    // re-render never import twice. Deliberately NOT cancelled on cleanup:
    // under StrictMode the first run must be allowed to finish.
    const key = `${documentId}|${submissionId}`;
    if (loadKeyRef.current === key) return;
    loadKeyRef.current = key;

    (async () => {
      let raw: string | null = null;
      try {
        raw = await getAnnotationsData(submissionId);
      } catch (err) {
        console.warn("[annotations] Could not read saved annotations:", err);
      }

      const items = parseAnnotations(raw); // never throws, never wipes storage

      let existingIds = new Set<string>();
      try {
        existingIds = new Set(annotation.getAnnotations().map((t) => t.object.id));
      } catch {
        /* state not initialised yet; the import below is queued by the plugin */
      }
      const fresh = items.filter((i) => !existingIds.has(i.annotation.id));
      fresh.forEach((i) => importedRef.current.add(i.annotation.id));

      if (fresh.length > 0) {
        try {
          // Queued by the plugin until the document's initial load completes.
          annotation.importAnnotations(fresh);
        } catch (err) {
          console.warn("[annotations] Import failed:", err);
        }
      }
      emitList();
    })();
  }, [annotation, documentId, submissionId, emitList]);

  // ── Annotation events ────────────────────────────────────────────────────
  useEffect(() => {
    if (!annotation) return;
    const unsubscribe = annotation.onAnnotationEvent((ev) => {
      if (ev.type === "loaded") {
        emitList();
        return;
      }
      if (ev.documentId !== documentId) return;
      const a = ev.annotation;
      const id = a.id;

      if (ev.type === "create") {
        if (!ev.committed) {
          // User-drawn (or an undo of a delete). Only uncommented highlights
          // that we did not import count as awaiting a comment.
          const alreadyCommented = !!a.contents?.trim() || hasOurCustomData(a);
          if (
            !readOnly &&
            a.type === PdfAnnotationSubtype.HIGHLIGHT &&
            !alreadyCommented &&
            !importedRef.current.has(id)
          ) {
            userDrawnRef.current.add(id);
          }
          return;
        }
        // committed:true
        if (userDrawnRef.current.has(id)) {
          userDrawnRef.current.delete(id);

          // A previous popup is still open: resolve it first. Non-empty draft
          // is kept as that highlight's comment; empty draft discards it.
          const prev = pendingRef.current;
          if (prev) {
            const draft = draftRef.current.trim();
            if (draft) savePending(draft);
            else cancelPending();
          }

          const quote =
            typeof a.custom?.text === "string" ? (a.custom.text as string) : "";
          setPendingBoth({ id, pageIndex: ev.pageIndex, quote });
          // Select it so the toolbar Delete button works on it.
          annotation.selectAnnotation(ev.pageIndex, id);
          emitList();
          return; // never autosave an uncommented highlight
        }
        if (importedRef.current.has(id)) {
          importedRef.current.delete(id); // the import's own commit event
          setTimeout(emitList, 0);
          return;
        }
      }

      if (ev.type === "delete" && pendingRef.current?.id === id) {
        // Pending highlight removed from elsewhere (e.g. toolbar Delete).
        userDrawnRef.current.delete(id);
        setPendingBoth(null);
      }
      if (ev.type === "delete") userDrawnRef.current.delete(id);

      setTimeout(emitList, 0);
      if (ev.committed) scheduleSave();
    });
    return unsubscribe;
  }, [
    annotation,
    documentId,
    readOnly,
    emitList,
    savePending,
    cancelPending,
    scheduleSave,
    setPendingBoth,
  ]);

  const ctxValue = useMemo<PendingCommentContextValue>(
    () => ({
      pending,
      save: savePending,
      cancel: cancelPending,
      onDraftChange,
    }),
    [pending, savePending, cancelPending, onDraftChange],
  );

  return (
    <PendingCommentContext.Provider value={ctxValue}>
      <div className="flex flex-col h-full w-full">
        {!readOnly && (
          <AnnotationToolbar documentId={documentId} saveStatus={saveStatus} />
        )}
        <div className="flex-1 min-h-0">
          <GlobalPointerProvider documentId={documentId}>
            <Viewport documentId={documentId} className="bg-tf-gray-100">
              <Scroller
                documentId={documentId}
                renderPage={(pageLayout) => (
                  <PagePointerProvider
                    key={pageLayout.pageIndex}
                    documentId={documentId}
                    pageIndex={pageLayout.pageIndex}
                  >
                    <RenderLayer
                      documentId={documentId}
                      pageIndex={pageLayout.pageIndex}
                      draggable={false}
                      onDragStart={(e) => e.preventDefault()}
                      style={{ userSelect: "none" }}
                    />
                    <SelectionLayer
                      documentId={documentId}
                      pageIndex={pageLayout.pageIndex}
                    />
                    <AnnotationLayer
                      documentId={documentId}
                      pageIndex={pageLayout.pageIndex}
                      selectionMenu={renderSelectionMenu}
                    />
                  </PagePointerProvider>
                )}
              />
            </Viewport>
          </GlobalPointerProvider>
        </div>
      </div>
    </PendingCommentContext.Provider>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AnnotationViewer({
  pdfSource,
  submissionId,
  readOnly,
  currentUser,
  onAnnotationsChange,
}: AnnotationViewerProps) {
  const { engine, isLoading: engineLoading, error: engineError } = usePdfiumEngine();

  // Build the plugin registrations. DocumentManager receives the pdfSource
  // as the initial document to open. Memoize so the array identity is stable
  // across re-renders (EmbedPDF compares by reference).
  const plugins = useMemo(
    () => [
      createPluginRegistration(DocumentManagerPluginPackage, {
        initialDocuments: [{ url: pdfSource }],
      }),
      createPluginRegistration(ViewportPluginPackage),
      createPluginRegistration(ScrollPluginPackage),
      createPluginRegistration(RenderPluginPackage),
      // Pointer events from the comment popup must not reach the page's
      // text-selection / highlight handlers.
      createPluginRegistration(InteractionManagerPluginPackage, {
        exclusionRules: { dataAttributes: ["data-no-interaction"] },
      }),
      createPluginRegistration(SelectionPluginPackage),
      createPluginRegistration(HistoryPluginPackage),
      createPluginRegistration(AnnotationPluginPackage),
      createPluginRegistration(ZoomPluginPackage, {
        defaultZoomLevel: ZoomMode.FitWidth,
      }),
    ],
    [pdfSource],
  );

  // ── Engine loading state ──────────────────────────────────────────────────
  if (engineError) {
    return (
      <div className="flex items-center justify-center h-full w-full">
        <div className="text-center space-y-2 max-w-sm">
          <p className="text-tf-gray-800 font-medium">
            Failed to initialize PDF engine
          </p>
          <p className="text-sm text-tf-gray-500">
            {engineError.message || "An unknown error occurred."}
          </p>
        </div>
      </div>
    );
  }

  if (engineLoading || !engine) {
    return (
      <div className="flex items-center justify-center h-full w-full">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-tf-gray-300 border-t-tf-black rounded-full animate-spin" />
          <p className="text-sm text-tf-gray-500">Loading PDF engine…</p>
        </div>
      </div>
    );
  }

  // ── Render the viewer ─────────────────────────────────────────────────────
  return (
    <EmbedPDF engine={engine} plugins={plugins}>
      {(state) =>
        state.activeDocumentId ? (
          <AnnotationWorkspace
            documentId={state.activeDocumentId}
            submissionId={submissionId}
            readOnly={readOnly}
            currentUser={currentUser}
            onAnnotationsChange={onAnnotationsChange}
          />
        ) : (
          <div className="flex items-center justify-center h-full w-full">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-tf-gray-300 border-t-tf-black rounded-full animate-spin" />
              <p className="text-sm text-tf-gray-500">Loading document…</p>
            </div>
          </div>
        )
      }
    </EmbedPDF>
  );
}
