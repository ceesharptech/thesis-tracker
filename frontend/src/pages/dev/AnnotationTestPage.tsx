/**
 * AnnotationTestPage.tsx
 *
 * Dev-only test route at `/annotation-test`.
 * NOT behind auth, NOT linked from any real navigation menu.
 *
 * Provides a file picker to load a local PDF via URL.createObjectURL(),
 * then renders it using the same AnnotationViewer component the real
 * app pages will use.
 *
 * Phase 1: file picker + bare viewer only.
 * Phase 5 will add the Supervisor/Student mode toggle.
 *
 * @see ANNOTATION_FEATURE_CONTEXT.md § 7  (test route spec)
 * @see ANNOTATION_FEATURE_CONTEXT.md § 10 Phase 1
 */

import { useCallback, useRef, useState } from "react";
import AnnotationViewer from "@/components/annotation/AnnotationViewer";

/** Fixed submission ID for local test persistence (Phase 3+). */
const TEST_SUBMISSION_ID = "local-test";

export default function AnnotationTestPage() {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
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
      setPdfUrl(objectUrl);
      setFileName(file.name);
    },
    [],
  );

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

      {/* ── Viewer area ──────────────────────────────────────────────────── */}
      <main className="flex-1 min-h-0">
        {pdfUrl ? (
          <AnnotationViewer
            pdfSource={pdfUrl}
            submissionId={TEST_SUBMISSION_ID}
            readOnly={false}
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
    </div>
  );
}
