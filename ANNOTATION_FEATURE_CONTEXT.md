# ANNOTATION_FEATURE_CONTEXT.md
# ThesisFlow — PDF Annotation Feature — Frontend-Only Implementation
# Backend is not connected yet. Build this feature fully mocked and testable locally.

---

## 1. What we're building

Supervisors highlight text on a student's submitted PDF and attach a comment to
each highlight — similar to comments in Microsoft Word. Students view the same
PDF read-only, see the highlights and comments, and can mark each one as
resolved. Every annotation is tied to a specific submission version.

This replaces an earlier custom PDF.js-based annotation viewer that had an
unfixable text-layer sizing bug. We are now using **EmbedPDF**, a free,
MIT-licensed PDF library built on PDFium (WebAssembly) with a dedicated
annotation plugin. It handles text selection and highlight positioning
internally — we no longer write that logic ourselves.

## 2. Critical constraint — no backend yet

The backend developer has not implemented the annotation endpoints. **Do not
block on this.** Every place that would call a real backend endpoint must
instead use a **mock implementation with the exact same function signature**
the real API call will eventually have, so swapping to the real backend later
is a one-line change inside the function — nothing in any component should
need to change.

Mock persistence uses `localStorage`, keyed by submission ID. This is
temporary scaffolding, not a design decision — every mock function must have
a comment block explaining exactly what backend endpoint it stands in for.

```typescript
// TODO(backend): Replace with a real API call once the backend developer
// delivers this endpoint.
// Real endpoint: PUT /supervisor/submissions/{id}/annotations
// Real request body: { annotations_data: string }
// Real response: { success: true }
export const saveAnnotationsData = async (submissionId: string, data: string) => {
  localStorage.setItem(`mock-annotations-${submissionId}`, data)
}
```

Apply this pattern to every mocked function. See Section 5 for the full list.

## 3. Dependencies

Remove (if present from the earlier PDF.js attempt):
```bash
npm uninstall pdfjs-dist
```
Also delete any leftover custom PDF.js viewer/annotation components from that
earlier attempt (a custom `PDFViewer.tsx` or `AnnotationLayer.tsx` that does
manual canvas/text-layer rendering) — do not keep them alongside the new ones.

Install:
```bash
npm install @embedpdf/core @embedpdf/engines \
  @embedpdf/plugin-document-manager @embedpdf/plugin-viewport \
  @embedpdf/plugin-scroll @embedpdf/plugin-render \
  @embedpdf/plugin-annotation @embedpdf/plugin-interaction-manager \
  @embedpdf/plugin-selection @embedpdf/plugin-history
```
No manual worker file copying is needed — the engine package bundles cleanly
with Vite out of the box.

## 4. Data model

Annotations are EmbedPDF's own objects. Comment text goes in the annotation's
native `contents` field. Our own app-specific data (resolved status, author)
goes in the `custom` field, which EmbedPDF preserves untouched through
export/import.

```typescript
// src/types/index.ts — add these

export interface AnnotationCustomData {
  resolved: boolean
  authorId: string
  authorName: string
}

// The annotation objects flowing through the app are EmbedPDF's own
// PdfHighlightAnnoObject type, with our data nested in `custom`.
// Import PdfHighlightAnnoObject from '@embedpdf/models' where needed.
```

No threaded replies in this build — one comment per highlight only. This
matches the original scope and needs no extra data modeling.

## 5. Mock persistence contract

Four functions, each mocking a specific future backend endpoint. Build these
as real modules (not inline in components) so they're a clean drop-in swap
later.

```typescript
// src/lib/api/mockAnnotations.ts
// ALL functions in this file are temporary mocks. Every function has a
// comment stating the real endpoint it will be replaced by.

// TODO(backend): GET /supervisor/submissions/{id}/annotations
// TODO(backend): GET /student/submissions/{id}/annotations
// (same read logic serves both roles for now — the real backend will
// enforce role-based access; the mock does not need to)
export const getAnnotationsData = async (submissionId: string): Promise<string | null> => {
  return localStorage.getItem(`mock-annotations-${submissionId}`)
}

// TODO(backend): PUT /supervisor/submissions/{id}/annotations
// Real request body: { annotations_data: string }
export const saveAnnotationsData = async (submissionId: string, data: string): Promise<void> => {
  localStorage.setItem(`mock-annotations-${submissionId}`, data)
}

// TODO(backend): PATCH /student/submissions/{id}/annotations/resolve
// Real request body: { annotation_id: string }
// Real behavior: server parses the stored JSON, finds the matching
// annotation id, sets custom.resolved = true, re-saves.
export const resolveAnnotationMock = async (submissionId: string, annotationId: string): Promise<void> => {
  const raw = localStorage.getItem(`mock-annotations-${submissionId}`)
  if (!raw) return
  const parsed = JSON.parse(raw)
  for (const item of parsed) {
    if (item.annotation?.id === annotationId) {
      item.annotation.custom = { ...item.annotation.custom, resolved: true }
    }
  }
  localStorage.setItem(`mock-annotations-${submissionId}`, JSON.stringify(parsed))
}
```

## 6. File structure

```
src/
├── components/
│   └── annotation/
│       ├── AnnotationViewer.tsx     ← wraps <EmbedPDF>, registers plugins,
│       │                              loads/saves via the mock functions
│       ├── AnnotationToolbar.tsx    ← highlight tool + delete (supervisor)
│       ├── CommentEditor.tsx        ← popup shown after a highlight is
│       │                              created, captures the comment text
│       └── AnnotationSidebar.tsx    ← our own list UI, event-sourced
├── pages/
│   ├── dev/
│   │   └── AnnotationTestPage.tsx   ← LOCAL TEST ROUTE, see Section 7
│   ├── supervisor/
│   │   └── AnnotationEditorPage.tsx ← real app page, uses mocked persistence
│   └── student/
│       └── AnnotationViewerPage.tsx ← real app page, read-only, mocked persistence
└── lib/api/
    └── mockAnnotations.ts           ← Section 5
```

## 7. Local test route — required

Add a route at `/annotation-test` (not behind auth, not linked from any real
nav — dev-only). This is how the file's owner (not a developer) tests the
feature locally without any backend or real submission data.

Requirements:
- A "Change file" control that opens a native file picker (`accept=".pdf"`)
  and loads the selected local file directly via `URL.createObjectURL()` —
  no upload, no backend involved
- A small toggle to switch between **Supervisor mode** (can highlight and
  comment) and **Student mode** (read-only, can mark resolved) so both
  experiences are testable from the same file without needing two accounts
- Uses the same `AnnotationViewer`, `AnnotationToolbar`, `CommentEditor`, and
  `AnnotationSidebar` components the real app pages use — this route exists
  to exercise the real components, not a separate implementation
- Persists annotations via the same mock functions from Section 5, keyed by
  a fixed test submission ID (e.g. `"local-test"`) so reloading the page
  during testing preserves annotations made in the same session
- Small visible badge or label indicating this is a test/dev route, so it's
  never mistaken for a real screen

## 8. Component behavior notes

**AnnotationViewer.tsx**
- Props: `pdfSource` (a URL or object URL string), `submissionId`, `readOnly`
- Registers: DocumentManager, Viewport, Scroll, Render, InteractionManager,
  Selection, History, Annotation plugins
- On document loaded: calls `getAnnotationsData(submissionId)`, parses if
  present, calls `importAnnotations()`
- When `readOnly` is true: does not render `AnnotationToolbar`, sets the
  `readOnly` flag on all imported annotations before import

**AnnotationToolbar.tsx**
- Uses `useAnnotation(documentId)` hook
- "Highlight" button: `annotationApi.setActiveTool('highlight')`
- "Delete" button: deletes the currently selected annotation, disabled when
  nothing is selected
- "Save" button (or autosave on every annotation event): calls
  `exportAnnotations()` then `saveAnnotationsData()`

**CommentEditor.tsx**
- Subscribes to `onAnnotationEvent` — when a `'create'` event fires for a
  highlight annotation with `committed: true`, show a small popup near it
- Textarea + Save/Cancel
- Save: `updateAnnotation(pageIndex, id, { contents: text, custom: { resolved: false, authorId: 'mock-supervisor-id', authorName: 'Test Supervisor' } })`
  — the hardcoded author values are a mock; comment this clearly as standing
  in for the real logged-in user once auth is wired to this feature
- Cancel: deletes the highlight if no comment was written

**AnnotationSidebar.tsx**
- Local state seeded once via `exportAnnotations()` after load, kept in sync
  via `onAnnotationEvent` for create/update/delete
- Each card: page number, comment text, author, resolved badge if
  `custom.resolved` is true
- Click: selects the annotation and scrolls the viewer to its page
- Supervisor mode: edit/delete buttons per card
- Student mode: "Mark resolved" button calling `resolveAnnotationMock()`,
  then updating local state optimistically

## 9. Design system

Follow the existing ThesisFlow design system already established in the
codebase (black/white/off-white palette, the `tf-*` Tailwind color tokens,
border-only cards with no shadows, the existing badge and button styles).
The annotation sidebar and toolbar should look like they belong to the same
app as the rest of the dashboard — not like a third-party plugin UI bolted
on. Do not use EmbedPDF's default visual styling for the toolbar or sidebar;
those are built fully custom per this document. EmbedPDF's own components are
only used for the rendering/interaction mechanics (`<AnnotationLayer />`,
`<Scroller />`, `<Viewport />`), not for their default look.

---

## 10. Build Phases

Build and verify each phase in the browser before starting the next.

### Phase 1 — Bare viewer + local test route
- Install dependencies (Section 3)
- Remove old PDF.js annotation code if present
- Build `AnnotationViewer.tsx` with just DocumentManager, Viewport, Scroll,
  Render plugins registered — no annotation plugin yet
- Build `AnnotationTestPage.tsx` at `/annotation-test` with the file picker
  from Section 7 (skip the mode toggle for now)
- **Completion check:** picking a local PDF file renders it, scrollable,
  in the browser. No annotation functionality yet.

### Phase 2 — Annotation plugin + highlight creation
- Add InteractionManager, Selection, History, Annotation plugins to
  `AnnotationViewer.tsx`
- Build `AnnotationToolbar.tsx` with the highlight tool button
- Verify: selecting the highlight tool and dragging across text on the test
  PDF creates a highlight with correct positioning — test specifically with
  a multi-line selection and a selection near the right edge of the page
- **Completion check:** highlighting is accurate (no missing/extra text
  captured — verify this explicitly since it's the exact bug being replaced)
  and works across the full page width at different zoom levels.

### Phase 3 — Comments
- Build `CommentEditor.tsx`, wire to the `onAnnotationEvent` create event
- Build `mockAnnotations.ts` (Section 5)
- Wire save/load into `AnnotationViewer.tsx` and the toolbar's Save action
- **Completion check:** create a highlight, add a comment, refresh the page
  — the highlight and comment reload correctly from `localStorage`.

### Phase 4 — Sidebar
- Build `AnnotationSidebar.tsx`
- Wire into the test page alongside the toolbar
- **Completion check:** sidebar lists all annotations on the current PDF,
  clicking one scrolls to and highlights its location.

### Phase 5 — Student read-only mode + resolve
- Add the Supervisor/Student mode toggle to `AnnotationTestPage.tsx`
- Implement the `readOnly` behavior in `AnnotationViewer.tsx`
- Add "Mark resolved" to the sidebar for student mode, wired to
  `resolveAnnotationMock()`
- **Completion check:** in student mode, highlights and comments are visible
  but cannot be created/edited/deleted. Marking resolved updates the badge
  and survives a refresh.

### Phase 6 — Wire into real app pages
- Build `AnnotationEditorPage.tsx` (supervisor) and
  `AnnotationViewerPage.tsx` (student) using the same components, reading
  `submissionId` from the route and `pdfUrl`/`fileUrl` from the submission
  object already available in the app
- Add an "Annotate" entry point on the supervisor's student detail page and
  a "View annotations" entry point on the student's submission detail page
- These pages use the exact same mock functions from Section 5 — do not
  duplicate logic between the test route and the real pages
- **Completion check:** the feature is reachable from real app navigation,
  fully functional against the mock persistence layer, ready for the
  backend developer to swap in real endpoints later with no component
  changes required.

---

## 11. What "done" looks like

- `/annotation-test` route works fully standalone with any locally chosen PDF
- Highlighting is pixel-accurate — the bug from the previous implementation
  (mismatched captured text, width cutoff) does not reproduce under any
  zoom level or page width
- Full create → comment → save → reload → resolve loop works end to end
  against the mock persistence layer
- Every mocked function is clearly commented with the real endpoint it
  stands in for, so backend integration is a scoped, mechanical task later
- No leftover code from the previous PDF.js annotation attempt
