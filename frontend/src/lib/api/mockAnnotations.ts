/**
 * mockAnnotations.ts
 *
 * ALL functions in this file are temporary mocks backed by `localStorage`.
 * Each one stands in for a specific backend endpoint (named in its comment)
 * and has the exact signature the real API call will have, so swapping to
 * the real backend later is a one-line change inside the function body —
 * no component should need to change.
 *
 * Storage key: `mock-annotations-${submissionId}`
 * Stored value: the JSON string produced by the viewer from EmbedPDF's
 * `exportAnnotations()` (an array of `{ annotation }` items).
 *
 * @see ANNOTATION_FEATURE_CONTEXT.md § 2 and § 5
 */

const storageKey = (submissionId: string) =>
  `mock-annotations-${submissionId}`;

// TODO(backend): Replace with a real API call once the backend developer
// delivers these endpoints (same read logic serves both roles for now — the
// real backend will enforce role-based access; the mock does not need to):
//   GET /supervisor/submissions/{id}/annotations
//   GET /student/submissions/{id}/annotations
// Real response: { annotations_data: string | null }  (the stored JSON string)
export const getAnnotationsData = async (
  submissionId: string,
): Promise<string | null> => {
  return localStorage.getItem(storageKey(submissionId));
};

// TODO(backend): Replace with a real API call once the backend developer
// delivers this endpoint.
// Real endpoint: PUT /supervisor/submissions/{id}/annotations
// Real request body: { annotations_data: string }
// Real response: { success: true }
//
// NOTE: the real endpoint is a FULL-REPLACE PUT of the whole annotation
// array, not a per-annotation patch. The viewer currently autosaves ~500ms
// after every committed annotation change; reconsider the save frequency
// (e.g. explicit Save, longer debounce, or a PATCH-style endpoint) when the
// real backend is wired in.
export const saveAnnotationsData = async (
  submissionId: string,
  data: string,
): Promise<void> => {
  localStorage.setItem(storageKey(submissionId), data);
};

// TODO(backend): Replace with a real API call once the backend developer
// delivers this endpoint.
// Real endpoint: PATCH /student/submissions/{id}/annotations/resolve
// Real request body: { annotation_id: string }
// Real response: { success: true }
// Real behavior: server parses the stored JSON, finds the matching
// annotation id, sets custom.resolved = true, re-saves.
// (Not called by anything until Phase 5.)
export const resolveAnnotationMock = async (
  submissionId: string,
  annotationId: string,
): Promise<void> => {
  const raw = localStorage.getItem(storageKey(submissionId));
  if (!raw) return;
  const parsed = JSON.parse(raw);
  for (const item of parsed) {
    if (item.annotation?.id === annotationId) {
      item.annotation.custom = { ...item.annotation.custom, resolved: true };
    }
  }
  localStorage.setItem(storageKey(submissionId), JSON.stringify(parsed));
};

// DEV ONLY — NO BACKEND EQUIVALENT. Used by the /annotation-test page's
// "Clear saved annotations" button. Do not call from real app pages.
export const clearAnnotationsDataMock = async (
  submissionId: string,
): Promise<void> => {
  localStorage.removeItem(storageKey(submissionId));
};
