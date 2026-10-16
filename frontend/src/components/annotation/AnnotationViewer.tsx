/**
 * AnnotationViewer.tsx
 *
 * Wraps <EmbedPDF> to render a PDF as a scrollable, multi-page view using
 * PDFium (WebAssembly) via @embedpdf/engines.
 *
 * Base rendering plugins (Phase 1): DocumentManager, Viewport, Scroll, Render
 * Phase 2 adds: InteractionManager, Selection, History, Annotation, plus Zoom
 * (zoom is only used by the temporary toolbar zoom controls for verification).
 * No persistence (load/save) yet — that is Phase 3.
 *
 * Props `submissionId` and `readOnly` are accepted now but unused until
 * Phase 3+ (mock persistence) and Phase 5 (student read-only mode).
 *
 * @see ANNOTATION_FEATURE_CONTEXT.md § 8 (AnnotationViewer spec)
 * @see ANNOTATION_FEATURE_CONTEXT.md § 10 Phase 1
 */

import { useMemo } from "react";
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
} from "@embedpdf/plugin-annotation/react";
import { ZoomPluginPackage, ZoomMode } from "@embedpdf/plugin-zoom/react";
import AnnotationToolbar from "./AnnotationToolbar";

// ─── Props ────────────────────────────────────────────────────────────────────

interface AnnotationViewerProps {
  /** URL or object URL (blob) pointing to the PDF to render. */
  pdfSource: string;
  /**
   * Submission ID for annotation persistence.
   * Not used in Phase 1 — accepted now to keep the interface stable.
   */
  submissionId: string;
  /**
   * When true, the viewer is read-only (student mode).
   * Not used in Phase 1 — accepted now to keep the interface stable.
   */
  readOnly: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AnnotationViewer({
  pdfSource,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  submissionId: _submissionId,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  readOnly: _readOnly,
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
      createPluginRegistration(InteractionManagerPluginPackage),
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
          <div className="flex flex-col h-full w-full">
            {!_readOnly && (
              <AnnotationToolbar documentId={state.activeDocumentId} />
            )}
            <div className="flex-1 min-h-0">
              <GlobalPointerProvider documentId={state.activeDocumentId}>
                <Viewport
                  documentId={state.activeDocumentId}
                  className="bg-tf-gray-100"
                >
                  <Scroller
                    documentId={state.activeDocumentId}
                    renderPage={(pageLayout) => (
                      <PagePointerProvider
                        key={pageLayout.pageIndex}
                        documentId={state.activeDocumentId!}
                        pageIndex={pageLayout.pageIndex}
                      >
                        <RenderLayer
                          documentId={state.activeDocumentId!}
                          pageIndex={pageLayout.pageIndex}
                          draggable={false}
                          onDragStart={(e) => e.preventDefault()}
                          style={{ userSelect: "none" }}
                        />
                        <SelectionLayer
                          documentId={state.activeDocumentId!}
                          pageIndex={pageLayout.pageIndex}
                        />
                        <AnnotationLayer
                          documentId={state.activeDocumentId!}
                          pageIndex={pageLayout.pageIndex}
                        />
                      </PagePointerProvider>
                    )}
                  />
                </Viewport>
              </GlobalPointerProvider>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full w-full">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-tf-gray-300 border-t-tf-black rounded-full animate-spin" />
              <p className="text-sm text-tf-gray-500">
                Loading document…
              </p>
            </div>
          </div>
        )
      }
    </EmbedPDF>
  );
}
