/**
 * AnnotationTestPage.tsx
 *
 * Dev-only test route at `/annotation-test`.
 * NOT behind auth, NOT linked from any real navigation menu.
 *
 * Provides a file picker to load a local PDF via URL.createObjectURL(),
 * then renders it using the same AnnotationViewer component the real
 * app pages will use. Annotations persist through the mock API layer,
 * keyed per file (name + size + lastModified) so one PDF's annotations never
 * show up on another.
 *
 * Phase 3: per-file persistence, mock user, clear button, temporary debug
 * panel. Phase 5 will add the Supervisor/Student mode toggle.
 *
 * @see ANNOTATION_FEATURE_CONTEXT.md § 7  (test route spec)
 * @see ANNOTATION_FEATURE_CONTEXT.md § 10 Phase 3
 */

import { useCallback, useRef, useState } from "react";
import type { PdfAnnotationObject } from "@embedpdf/models";
import AnnotationViewer from "@/components/annotation/AnnotationViewer";
import { clearAnnotationsDataMock } from "@/lib/api/mockAnnotations";

// TODO(auth): the real pages (Phase 6) will pass the logged-in user from the
// auth store. This mock user stands in for it on the dev test route only.
const MOCK_USER = { id: "mock-supervisor-id", name: "Test Supervisor" };

/** Per-file storage key so annotations never leak between different PDFs. */
const submissionIdForFile = (file: File) =>
  `local-${file.name}-${file.size}-${file.lastModified}`;

export default function AnnotationTestPage() {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  /** Bumped to force a clean viewer remount (new file / after clearing). */
  const [viewerNonce, setViewerNonce] = useState(0);
  const [annotations, setAnnotations] = useState<PdfAnnotationObject[]>([]);
  const [debugOpen, setDebugOpen] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Revoke previous object URL to avoid memory leaks
  const prevUrlRef = useRef<string | null>(null);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Revoke old URL
      if (prevUrlRef.current) {
        URL.revokeObjectURL(prevUrlRef.current);
      }

      const objectUrl = URL.createObjectURL(file);
      prevUrlRef.current = objectUrl;
      setAnnotations([]);
      setPdfUrl(objectUrl);
      setFileName(file.name);
      setSubmissionId(submissionIdForFile(file));
      setViewerNonce((n) => n + 1);
      // Allow re-picking the same file after a refresh/clear.
      e.target.value = "";
    },
    [],
  );

  const handleClear = useCallback(async () => {
    if (!submissionId) return;
    await clearAnnotationsDataMock(submissionId);
    setAnnotations([]);
    setViewerNonce((n) => n + 1); // remount so in-memory annotations vanish too
  }, [submissionId]);

  return (
    <div className="flex flex-col h-screen bg-tf-gray-50">
      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-tf-gray-200 bg-white shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-base font-semibold text-tf-black">
            Annotation Test
          </h1>
          {/* Dev badge */}
          <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase rounded-full bg-amber-100 text-amber-700 border border-amber-200">
            Dev Only
          </span>
        </div>

        <div className="flex items-center gap-3">
          {fileName && (
            <span className="text-sm text-tf-gray-500 max-w-[240px] truncate">
              {fileName}
            </span>
          )}
          {submissionId && (
            <button
              id="annotation-test-clear"
              type="button"
              onClick={handleClear}
              className="px-4 py-2 text-sm font-medium rounded-xl border border-red-200 text-red-700 bg-white hover:bg-red-50 transition-colors cursor-pointer"
            >
              Clear saved annotations for this file
            </button>
          )}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 text-sm font-medium rounded-xl border border-tf-gray-200 text-tf-gray-700 bg-white hover:bg-tf-gray-100 transition-colors cursor-pointer"
          >
            {pdfUrl ? "Change file" : "Open PDF"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      </header>

      <p className="px-6 py-2 text-xs text-tf-gray-500 bg-tf-gray-50 border-b border-tf-gray-200 shrink-0">
        Dev note: PDF object URLs do not survive a page refresh. After
        refreshing, pick the same file again and its saved annotations will be
        restored (they are stored per file in localStorage).
      </p>

      {/* ── Viewer area ──────────────────────────────────────────────────── */}
      <main className="flex-1 min-h-0">
        {pdfUrl && submissionId ? (
          <AnnotationViewer
            key={`${submissionId}-${viewerNonce}`}
            pdfSource={pdfUrl}
            submissionId={submissionId}
            readOnly={false}
            currentUser={MOCK_USER}
            onAnnotationsChange={setAnnotations}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-tf-gray-100 flex items-center justify-center">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-tf-gray-400"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="18" x2="12" y2="12" />
                <line x1="9" y1="15" x2="15" y2="15" />
              </svg>
            </div>
            <div>
              <p className="text-tf-gray-700 font-medium mb-1">
                No PDF loaded
              </p>
              <p className="text-sm text-tf-gray-400">
                Click "Open PDF" above to select a file from your computer
              </p>
            </div>
          </div>
        )}
      </main>

      {/* ── TEMPORARY debug panel ────────────────────────────────────────── */}
      {pdfUrl && (
        <section
          id="annotation-debug-panel"
          className="shrink-0 border-t border-tf-gray-200 bg-white"
        >
          <button
            type="button"
            onClick={() => setDebugOpen((o) => !o)}
            className="flex w-full cursor-pointer items-center justify-between px-6 py-2 text-left text-xs font-semibold text-tf-gray-700 hover:bg-tf-gray-50"
            aria-expanded={debugOpen}
          >
            <span>
              Debug: annotations ({annotations.length}){" "}
              <span className="font-normal text-tf-gray-400">
                — Temporary — replaced by the sidebar in Phase 4
              </span>
            </span>
            <span>{debugOpen ? "Hide" : "Show"}</span>
          </button>
          {debugOpen && (
            <div className="max-h-56 overflow-auto px-6 pb-3">
              {annotations.length === 0 ? (
                <p className="text-xs text-tf-gray-400">
                  No saved highlights yet.
                </p>
              ) : (
                <ul className="space-y-2">
                  {annotations.map((a) => (
                    <li
                      key={a.id}
                      className="rounded-lg border border-tf-gray-200 p-2 text-xs"
                    >
                      <div className="font-medium text-tf-gray-700">
                        Page {a.pageIndex + 1}
                      </div>
                      <div className="text-tf-gray-600">
                        contents: {a.contents ?? <em>(none)</em>}
                      </div>
                      <pre className="mt-1 overflow-x-auto rounded bg-tf-gray-50 p-1.5 text-[11px] text-tf-gray-600">
                        {JSON.stringify(a.custom, null, 2)}
                      </pre>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
