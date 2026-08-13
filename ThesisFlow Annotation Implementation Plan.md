## ThesisFlow

## PDF/DOCX Annotation Feature

## Implementation Plan — Frontend & Backend

Version 1.0 · June 2025 Status: Planning — Ready for implementation Scope: Additive feature on existing ThesisFlow beta

Stack: React + Vite (Frontend) · FastAPI + SQLite (Backend)


## 1. Overview

This document defines how the PDF/DOCX inline annotation feature will be built and integrated into the existing ThesisFlow beta application. It is intended to keep the frontend developer and backend developer in sync throughout the build. The existing system already handles student submission uploads, per-submission comments, and supervisor review. This feature extends that foundation by adding a document viewer where supervisors can highlight text directly on the rendered document and attach positioned comments, which students can then view and navigate.

ℹ This feature is purely additive. No existing database tables are modified. No existing API routes are changed. Everything described in this document is new code layered on top of the current system.

## 1.1 What we are building

- A full-screen document viewer that renders submitted PDFs directly in the browser

- A text-selection annotation tool for supervisors — highlight any text range, type a comment, save it

- A comment sidebar listing all annotations for the open document, with click-to- navigate behaviour

- A read-only version of the same viewer for students, showing the supervisor's highlights and comments

- Server-side DOCX-to-PDF conversion so both file types have an identical review experience

## 1.2 What we are NOT building

- Editing or modifying the original uploaded file in any way

- Replacing the existing per-submission general comment system — that stays as-is

- Real-time collaborative annotation — one supervisor, no concurrency requirements

- Any changes to authentication, student upload, or the existing dashboard flows


## 2. Technical Approach

## 2.1 How annotation works

PDF.js (Mozilla's open-source PDF renderer) renders each page of the document as a canvas element. On top of that canvas, PDF.js also renders an invisible text layer — a set of transparent HTML spans that mirror the text positions on the PDF. This text layer is what enables native browser text selection on a rendered PDF. The annotation tool listens for the browser's mouseup event on this text layer. When a selection is detected, it reads the selected text and calculates the bounding rectangles of the selection relative to the current page container. These rectangles, along with the selected text and the supervisor's comment, are saved to the database. The PDF file itself is never modified. When any user opens the annotation viewer, all saved annotations for that document version are fetched and rendered as coloured highlight overlays on top of the PDF pages, positioned using the stored coordinates.

## 2.2 Coordinate storage strategy

A single text selection can span multiple lines, which means multiple rectangles. The annotation stores rects as a JSON array rather than a single x/y/width/height:

rects: [{"x": 42.5, "y": 310.2, "width": 380.0, "height": 18.4}, {"x": 42.5, "y": 330.0, "width": 190.0, "height": 18.4}]

Coordinates are stored as fractions of the page dimensions (values between 0 and 1), not as pixel values. This makes highlights zoom-independent — they scale correctly when the user changes the zoom level without any recalculation.

ℹ Storing coordinates as page fractions is critical. If pixel coordinates are stored instead, highlights will render in the wrong position at any zoom level other than the one used when

the annotation was created.

## 2.3 DOCX handling

The existing system accepts both PDF and DOCX uploads. Annotating DOCX files natively in the browser is not feasible without a complex rendering engine. The approach is:

- When a student uploads a DOCX file, the backend converts it to PDF using LibreOffice running headlessly on the server

- The converted PDF is stored alongside the original DOCX file

- The supervisor always sees and annotates the PDF version

- The student can still download their original DOCX file at any time

- All annotations are stored against the PDF version

⚠ LibreOffice must be installed on the server where FastAPI runs. On Railway or Render, add the install command to the build script. On a local machine, install LibreOffice normally. The conversion runs as a subprocess call and adds negligible overhead to the upload.


## 2.4 Versioning principle

The existing system already creates a new submission record for every upload. Annotations are tied to a specific submission record (by submission_id), not to the student or chapter in general. This means:

- Annotations on version 1 of Chapter 2 are permanently associated with that exact file

- When a student resubmits Chapter 2, a new submission record is created and the supervisor annotates that new version independently

- Old annotations are never lost or overwritten

- The supervisor can open previous versions and see the original annotations


## 3. Database Changes — Backend

One new table is required. All existing tables remain unchanged.

## 3.1 New table: annotations

| Column | Type | Notes |
| --- | --- | --- |
| id | String (UUID) | Primary key. Generated server-side with uuid4() |
| submission_id | String (FK) | Foreign key → submissions.id. Each annotation |
|   |   | belongs to one submission version. |
| page_number | Integer | 1-indexed page number the annotation appears on. |
| rects | Text (JSON) | JSON array of {x, y, width, height} objects. Values are |
|   |   | page fractions (0.0–1.0). Stored as a JSON string in |
|   |   | SQLite. |
| selected_text | Text | The raw text content of the highlighted selection. |
|   |   | Used as a fallback identifier if coordinates shift. |
| comment | Text | The supervisor's comment body. |
| author_id | String (FK) | Foreign key → users.id. The user who created the |
|   |   | annotation. |
| resolved | Boolean | Default false. Set to true by the student when they |
|   |   | have addressed the comment. Included now to avoid |
|   |   | a future migration. |
| created_at | DateTime | Server-side UTC timestamp. |

## 3.2 Submissions table — one new column

A single column is added to the existing submissions table to store the PDF version of a DOCX upload:

| Column | Type | Notes |
| --- | --- | --- |
| pdf_url | String (nullable) Path to the converted PDF. Null if the original upload |   |
|   |   | was already a PDF (file_url is used directly in that |
|   |   | case). Populated during upload if file_type is docx. |


## 3.3 SQLAlchemy model additions

B A C K E N D / M O D E L S . P Y — A D D T H E A N N O T A T I O N M O D E L

class Annotation(Base): __tablename__ = "annotations"

Column(String, primary_key=True, default=lambda: str(uuid4())) submission_id = Column(String, ForeignKey("submissions.id"), nullable=False) page_number = Column(Integer, nullable=False) rects = Column(Text, nullable=False) # JSON string selected_text = Column(Text, nullable=False) comment = Column(Text, nullable=False) author_id = Column(String, ForeignKey("users.id"), nullable=False) resolved = Column(Boolean, default=False, nullable=False) created_at = Column(DateTime,

default=datetime.utcnow)

back_populates="annotations") author = relationship("User")

B A C K E N D / M O D E L S . P Y — A D D T O S U B M I S S I O N M O D E L

pdf_url = Column(String, nullable=True) annotations = relationship("Annotation",

back_populates="submission", cascade="all, delete-orphan")

- 3.4 Migration

The backend developer adds a migration step to backend/migrate.py that handles both changes on existing databases:

\# In migrate.py — add to the migration sequence: # 1. ALTER TABLE submissions ADD COLUMN pdf_url TEXT # 2. CREATE TABLE annotations (...) if it does not exist ℹ Base.metadata.create_all() will create the annotations table automatically on a fresh database. The migrate.py change is only needed for existing databases that already have a

submissions table without the pdf_url column.

id =

submission = relationship("Submission",


## 4. New Backend API Endpoints

All new endpoints follow the same patterns as existing routes: JWT auth via the depends(get_current_user) dependency, Pydantic schemas for request/response, SQLAlchemy for database access.

## 4.1 Endpoint summary

| Meth | Route | Auth | Description |
| --- | --- | --- | --- |
| od |   |   |   |
| GET | /supervisor/submissions/{id}/ | Supervisor Get all annotations for a submission |   |
|   | annotations |   |   |
| POST /supervisor/submissions/{id}/ |   | Supervisor Create a new annotation |   |
|   | annotations |   |   |
| PATC | /supervisor/annotations/{id} | Supervisor Edit an annotation comment |   |
| H |   |   |   |
| DELE | /supervisor/annotations/{id} | Supervisor Delete an annotation |   |
| TE |   |   |   |
| GET | /student/submissions/{id}/ | Student | Get all annotations (read-only) |
|   | annotations |   |   |
| PATC | /student/annotations/{id}/ | Student | Mark annotation as resolved |
| H | resolve |   |   |

## 4.2 Request and response schemas

```
P Y D A N T I C S C H E M A S T O A D D I N B A C K E N D / S C H E M A S . P Y
# Request: create annotation class AnnotationCreate(BaseModel): page_number:
int rects: str # JSON string of [{x,y,width,height}, ...]
selected_text: str comment: str # Response: single annotation class
AnnotationResponse(BaseModel): id: str submission_id: str
page_number: int rects: str selected_text: str comment: str
author_id: str author_name: str # join from users.name — include for
display resolved: bool created_at: datetime class Config:
from_attributes = True # Request: edit annotation comment class
AnnotationUpdate(BaseModel): comment: str
```

## 4.3 Detailed endpoint specifications

## GET /supervisor/submissions/{id}/annotations

Returns all annotations for a submission, ordered by page_number then created_at ascending.

- Auth: supervisor JWT required


- Path param: submission id (string UUID)

- Response: array of AnnotationResponse

- Returns empty array if no annotations exist (not a 404)

## POST /supervisor/submissions/{id}/annotations

Creates a new annotation on a submission.

- Auth: supervisor JWT required

- Path param: submission id

- Body: AnnotationCreate

- Sets author_id to current user's id from the JWT

- Response: AnnotationResponse (201)

- Validate: submission must exist and belong to a student under this supervisor

## PATCH /supervisor/annotations/{id}

Updates the comment text of an existing annotation.

- Auth: supervisor JWT required

- Validate: annotation author_id must match current user — supervisors cannot edit each other's annotations

- Body: AnnotationUpdate

- Response: updated AnnotationResponse

## DELETE /supervisor/annotations/{id}

Permanently deletes an annotation.

- Auth: supervisor JWT required

- Validate: author_id must match current user

- Response: { "success": true } (200)

## GET /student/submissions/{id}/annotations

Returns all annotations for a submission. Identical data to the supervisor endpoint but gated to the student role and restricted to submissions belonging to the requesting student.

- Auth: student JWT required

- Validate: submission.student_id must match the requesting student's student record

- Response: array of AnnotationResponse, same shape as supervisor response

## PATCH /student/annotations/{id}/resolve

Marks a single annotation as resolved. Used by the student to indicate they have addressed the feedback.

- Auth: student JWT required

- Validate: the annotation's submission must belong to the requesting student

- Body: none required

- Response: { "resolved": true }


## 4.4 DOCX conversion endpoint change

The existing POST /student/submissions endpoint is modified to add conversion logic after the file is saved. No change to the request or response schema — the frontend sends the same FormData it always has.

P S E U D O C O D E F O R T H E M O D I F I E D U P L O A D H A N D L E R

\# After saving the uploaded file to disk as before: if file_type == "docx": pdf_path = convert_docx_to_pdf(saved_file_path, output_dir="uploads/submissions") submission.pdf_url = f"/uploads/{os.path.basename(pdf_path)}" else:

submission.pdf_url = None # file_url is the PDF directly db.commit()

C O N V E R S I O N H E L P E R — A D D T O B A C K E N D / S E R V I C E S / F I L E _ S T O R A G E . P Y

import subprocess, os def convert_docx_to_pdf(input_path: str, output_dir: str) -> str: """Convert a DOCX file to PDF using LibreOffice headless. Returns the path to the generated PDF file."""

subprocess.run(

"--outdir", output_dir, input_path],

timeout=30, ) base = os.path.splitext(os.path.basename(input_path))[0] pdf_path = os.path.join(output_dir, f"{base}.pdf") if not

os.path.exists(pdf_path):

{pdf_path} not found") return pdf_path

ℹ LibreOffice install command for Render/Railway build scripts: apt-get install -y libreoffice

The SubmissionResponse schema must be updated to include the pdf_url field so the frontend knows which URL to load in the viewer.

["libreoffice", "--headless", "--convert-to", "pdf",

check=True,

raise RuntimeError(f"Conversion failed:


## 5. Frontend Implementation

## 5.1 New dependency

```
npm install pdfjs-dist
```

pdfjs-dist is the only new dependency. It ships with a web worker that handles PDF parsing off the main thread. The worker file must be served as a static asset — copy it to the public folder and reference it when initialising PDF.js:

```
import * as pdfjsLib from "pdfjs-dist" pdfjsLib.GlobalWorkerOptions.workerSrc =
"/pdf.worker.min.js"
# Copy the worker file to your public directory: cp
node_modules/pdfjs-dist/build/pdf.worker.min.js public/
```

## 5.2 New TypeScript types

```
A D D T O S R C / T Y P E S / I N D E X . T S
export interface AnnotationRect { x: number // fraction of page width,
0.0–1.0 y: number // fraction of page height, 0.0–1.0 width:
number // fraction of page width height: number // fraction of page height }
export interface Annotation { id: string submissionId: string pageNumber:
number rects: AnnotationRect[] // parsed from the JSON string stored in DB
selectedText: string comment: string authorId: string authorName: string
resolved: boolean createdAt: string } export interface PendingAnnotation
{ pageNumber: number rects: AnnotationRect[] selectedText: string }
```

Note: the backend stores rects as a JSON string. The frontend parses it with JSON.parse on receipt and stringifies it with JSON.stringify before sending. Handle this in the API layer functions, not in components.

## 5.3 New API functions

```
A D D T O S R C / L I B / A P I / S U P E R V I S O R . T S
export const getAnnotations = async (submissionId: string) => { const res =
await client.get(`/supervisor/submissions/${submissionId}/annotations`) return
(res.data as any[]).map(a => ({ ...a, rects: JSON.parse(a.rects) })) as
Annotation[] } export const createAnnotation = async ( submissionId: string,
payload: { pageNumber: number; rects: AnnotationRect[]; selectedText: string;
comment: string } ) => { const body = { page_number: payload.pageNumber,
rects: JSON.stringify(payload.rects), selected_text: payload.selectedText,
comment: payload.comment, } const res = await
client.post(`/supervisor/submissions/${submissionId}/annotations`, body) return
{ ...res.data, rects: JSON.parse(res.data.rects) } as Annotation } export const
updateAnnotation = async (annotationId: string, comment: string) => { const res
= await client.patch(`/supervisor/annotations/${annotationId}`, { comment })
return { ...res.data, rects: JSON.parse(res.data.rects) } as Annotation } export
const deleteAnnotation = async (annotationId: string) => { await
client.delete(`/supervisor/annotations/${annotationId}`) }
A D D T O S R C / L I B / A P I / S T U D E N T . T S
export const getAnnotations = async (submissionId: string) => { const res =
await client.get(`/student/submissions/${submissionId}/annotations`) return
(res.data as any[]).map(a => ({ ...a, rects: JSON.parse(a.rects) })) as
Annotation[] } export const resolveAnnotation = async (annotationId: string) =>
{ await client.patch(`/student/annotations/${annotationId}/resolve`) }
```


## 5.4 New file structure

All new files are added inside the existing src/ directory. No existing files are moved or renamed.

```
src/ ├── components/ │ └── annotation/ ← new folder │
├── PDFViewer.tsx ← renders PDF pages with text layer │ ├──
AnnotationLayer.tsx ← handles selection + highlight rendering │
├── CommentPopup.tsx ← floating input shown after text selection │
└── AnnotationSidebar.tsx ← right panel listing all annotations └── pages/
├── supervisor/ │ └── AnnotationEditorPage.tsx ← new route: supervisor
annotates └── student/ └── AnnotationViewerPage.tsx ← new route:
student reads annotations
```

## 5.5 New routes

A D D T O S R C / A P P . T S X I N S I D E T H E S U P E R V I S O R A N D S T U D E N T

R O U T E G R O U P S

// Inside supervisor routes: <Route path="/supervisor/submission/:id/annotate" element={<AnnotationEditorPage />} /> // Inside student routes: <Route path="/student/submission/:id/annotate" element={<AnnotationViewerPage />} />

Entry points to these routes: on the supervisor's student detail page, each submission entry gets an "Annotate" button. On the student's submission detail page, a "View annotations" button appears if the submission has a comment count greater than zero.

## 5.6 Component specifications

## PDFViewer.tsx

Renders a multi-page PDF using PDF.js. Each page consists of a canvas element with a text layer div stacked on top via absolute positioning. The text layer is what enables native text selection.

- Props: pdfUrl (string), onPageRender (callback called per page after render)

- Maintains a pages state array tracking rendered page dimensions

- Exposes a scrollToPage(pageNumber) method via useImperativeHandle for the sidebar to call

- Each page wrapper is position: relative and has a data-page-number attribute for coordinate calculations

- The text layer div receives the class pdfjs-text-layer and the PDF.js renderTextLayer output

- Do not disable pointer-events on the text layer — selection must work

## AnnotationLayer.tsx

A transparent overlay positioned absolutely over each PDF page. Has two responsibilities: listening for text selection events and rendering existing highlight rectangles.

- Props: pageNumber, pageWidth, pageHeight, annotations (filtered to this page), onSelectionComplete (callback), readOnly (boolean)

- On mouseup (when not readOnly): calls window.getSelection(), checks the selection is non-empty and within this page, calculates fractional rects relative to the page container, calls onSelectionComplete with a PendingAnnotation object


- Renders each annotation's rects as absolutely positioned div elements with background rgba(255, 220, 0, 0.35)

- On annotation hover: border becomes 1px solid rgba(255, 180, 0, 0.8) and a tooltip shows the comment preview

- When readOnly is false: supervisor mode. When true: student mode — no mouseup listener, pointer-events: none on the overlay so clicks pass through to the text layer

- Active annotation (selected in sidebar): highlight border changes to 2px solid #185FA5 and briefly pulses via a CSS animation

## CommentPopup.tsx

A small floating card that appears after the supervisor completes a text selection. Positioned near the bottom of the selection bounding rect.

- Props: position ({top, left}), selectedText, onSave (comment: string) => void, onCancel () => void

- Contains a textarea (min-height 80px) and Save / Cancel buttons

- Save is disabled while the textarea is empty

- Closes on Escape key

- Does not close if the user clicks inside it

- Position is clamped to the viewport so it never renders off-screen

## AnnotationSidebar.tsx

The right panel listing all annotations for the open document, sorted by page number then creation time.

- Props: annotations, onAnnotationClick, onDelete (supervisor only), onResolve (student only), readOnly, activeAnnotationId

- Each annotation card: page badge (e.g. "P.4"), selected text excerpt (italic, truncated to 2 lines), comment body, author name, timestamp

- Active annotation card has a 2px left border in #185FA5

- onAnnotationClick: calls the PDFViewer scrollToPage ref, sets the annotation as active, triggers the highlight pulse animation

- Supervisor mode: each card has an Edit (pencil icon) and Delete (trash icon) ghost button. Edit turns the comment body into an inline textarea.

- Student mode: each card has a "Mark resolved" button if resolved is false. Resolved annotations show a green "Resolved" badge instead.

## AnnotationEditorPage.tsx (supervisor)

The full-screen annotation page for the supervisor. Opened via /supervisor/submission/:id/annotate.

- Fetches submission detail and all annotations on mount using Promise.all

- Determines the PDF URL: if submission.pdf_url is set, use that; otherwise use submission.file_url

- Layout: fixed topbar (48px) + PDF canvas area (fills remaining width minus sidebar) + AnnotationSidebar (320px fixed right)


- Topbar: back link to the student detail page, student name and chapter label as the title, page counter

- Manages pendingAnnotation state — set when the user completes a selection, cleared when CommentPopup is saved or cancelled

- On CommentPopup save: calls createAnnotation(), adds the returned annotation to local state, clears pending

- Passes readOnly={false} to AnnotationLayer

## AnnotationViewerPage.tsx (student)

The read-only annotation viewer for students. Opened via /student/submission/:id/annotate.

- Same layout as the editor but with readOnly={true} passed to AnnotationLayer

- No CommentPopup, no delete or edit controls

- AnnotationSidebar shows "Mark resolved" button on unresolved cards

- Calls resolveAnnotation() on mark resolved, updates local state optimistically

- Topbar: back link to submission detail, "X annotations from your supervisor" summary


## 6. Build Phases and Sequencing

The feature is built in four phases. Backend and frontend can work in parallel during phases 1 and 2.

| Phase Backend tasks |   | Frontend tasks |
| --- | --- | --- |
| Phase | — Add Annotation model to models.py — | — Install pdfjs-dist, copy worker to |
| 1 | Add pdf_url column to Submission | public/ — Add Annotation types to |
| Foun | model — Update migrate.py — Update | types/index.ts — Add annotation API |
| datio | SubmissionResponse schema to include | functions to supervisor.ts and student.ts |
| n (2–3 | pdf_url — Add LibreOffice conversion | — Build PDFViewer.tsx and verify it |
| days) | helper to file_storage.py — Wire | renders a real PDF |
|   | conversion into POST |   |
|   | /student/submissions |   |
| Phase | — Build GET and POST | — Build AnnotationLayer.tsx (selection |
| 2 | /supervisor/submissions/{id}/annotations | detection + highlight rendering) — Build |
| Annot | — Build PATCH and DELETE | CommentPopup.tsx — Build |
| ation | /supervisor/annotations/{id} — Build | AnnotationSidebar.tsx — Build |
| engin | GET | AnnotationEditorPage.tsx wiring all |
| e (3–5 | /student/submissions/{id}/annotations — | components together |
| days) | Build PATCH |   |
|   | /student/annotations/{id}/resolve — Test |   |
|   | all endpoints via /docs |   |
| Phase | — No new backend work in this phase — Build AnnotationViewerPage.tsx — |   |
| 3 |   | Add "Annotate" button to supervisor |
| Stude |   | student detail — Add "View annotations" |
| nt |   | button to student submission detail — |
| view |   | Add new routes to App.tsx |
| (1–2 |   |   |
| days) |   |   |
| Phase | — End-to-end test: upload DOCX, verify | — Zoom handling: verify highlights scale |
| 4 | PDF generated — Test annotation CRUD | correctly at 75%, 100%, 125% — Mobile |
| Polish | via the UI — Verify student cannot access | check: viewer must be usable on a phone |
| and | supervisor annotation endpoints | screen — Error states: PDF fails to load, |
| test |   | annotation save fails — Smoke test the |
| (1–2 |   | full workflow |
| days) |   |   |


## 7. End-to-End Smoke Test Checklist

Run through this checklist together before marking the feature complete.

## DOCX conversion

- Student uploads a DOCX file → submission record has pdf_url populated

- PDF renders correctly in the annotation viewer

- Student can still download the original DOCX from the existing download link

- Student uploads a PDF → pdf_url is null → file_url is used in the viewer directly

## Supervisor annotation flow

- Supervisor opens a student submission and clicks "Annotate"

- PDF renders all pages correctly

- Supervisor selects text → CommentPopup appears near the selection

- Supervisor types a comment and clicks Save → highlight appears on the page

- Annotation appears in the sidebar immediately without page refresh

- Supervisor clicks a sidebar annotation → page scrolls to the correct location → highlight pulses

- Supervisor edits an annotation comment inline → change saves correctly

- Supervisor deletes an annotation → it disappears from sidebar and page

- Supervisor changes zoom level → all highlights remain in the correct position

## Student annotation view

- Student sees annotation count badge on their submission in the dashboard

- Student opens submission detail and clicks "View annotations"

- PDF loads with yellow highlights visible on the correct text

- Student clicks a sidebar annotation → PDF scrolls to the correct page

- Student clicks "Mark resolved" annotation card shows "Resolved" badge →

- Student cannot create, edit, or delete annotations

## Security

- Student cannot call POST /supervisor/submissions/{id}/annotations — returns 403

- Student cannot view another student's annotations — returns 403

- Supervisor cannot resolve annotations (student-only action)


## 8. Frontend–Backend Integration Contract

This section defines the exact shape of the data exchanged. Both sides implement to this contract independently and integration should work without surprises.

## 8.1 AnnotationResponse shape

| Field | Type | Example |
| --- | --- | --- |
| id | string | "a3f8c1d2-..." |
| submission_id | string | "b9e2f7a1-..." |
| page_number | number | 3 |
| rects | string (JSON) | "[{\"x\":0.12,\"y\":0.44,\"width\":0.74,\"height\":0.03}]" |
| selected_text | string | "The proposed methodology demonstrates..." |
| comment | string | "Please expand this section with more references." |
| author_id | string | "c1a2b3d4-..." |
| author_name | string | "Dr. Emeka Obi" |
| resolved | boolean | false |
| created_at | string (ISO) | "2025-06-12T14:32:00Z" |

## 8.2 SubmissionResponse — updated shape

The existing SubmissionResponse must now include pdf_url. The backend developer adds this field to the Pydantic schema. The frontend reads it to determine which URL to load in the PDF viewer.

| Field | Type | Notes |
| --- | --- | --- |
| pdf_url | string | null Null if original upload was PDF. Set to converted PDF |   |
|   |   | path if original was DOCX. Frontend uses this field; falls |
|   |   | back to file_url if null. |

## 8.3 Frontend logic for PDF URL resolution

```
// In both AnnotationEditorPage and AnnotationViewerPage: const pdfUrl =
submission.pdfUrl ? `${import.meta.env.VITE_API_BASE_URL}${submission.pdfUrl}`
: `${import.meta.env.VITE_API_BASE_URL}${submission.fileUrl}`
```


## 9. Implementation Notes and Decisions

## 9.1 Coordinate system

All annotation coordinates are stored as fractions of the page dimensions, not pixel values. When rendering:

```
// Convert stored fractions to pixel positions for rendering: const pixelRect = {
left: rect.x * pageWidth, top: rect.y * pageHeight, width:
rect.width * pageWidth, height: rect.height * pageHeight, } // Convert
browser pixel coordinates to fractions for saving: const fractionalRect = { x:
browserRect.x / pageWidth, y: browserRect.y / pageHeight,
width: browserRect.width / pageWidth, height: browserRect.height /
pageHeight, }
```

pageWidth and pageHeight come from the PDF.js page viewport object after the page renders. Store these in the PDFViewer's page state and pass them to each AnnotationLayer.

## 9.2 Text layer setup

After rendering a PDF page canvas, the text layer must be initialised separately:

```
import { renderTextLayer } from "pdfjs-dist" const textLayerDiv =
document.createElement("div") textLayerDiv.className = "pdfjs-text-layer"
pageContainer.appendChild(textLayerDiv) const textContent = await
page.getTextContent() await renderTextLayer({ textContentSource: textContent,
container: textLayerDiv, viewport: viewport, }).promise
```

Add the text layer CSS to src/index.css. PDF.js ships a default text layer stylesheet — import it or copy the critical rules (position: absolute, white-space: pre, cursor: text, opacity: 1, mix- blend-mode: multiply).

## 9.3 Selection detection

```
const handleMouseUp = (pageNumber: number, pageEl: HTMLElement) => { const
selection = window.getSelection() if (!selection || selection.isCollapsed || !
selection.toString().trim()) return const range = selection.getRangeAt(0)
const pageRect = pageEl.getBoundingClientRect() // Get all client rects for
multi-line selections const clientRects = Array.from(range.getClientRects())
const rects = clientRects.map(r => ({ x: (r.left - pageRect.left) /
pageRect.width, y: (r.top - pageRect.top) / pageRect.height,
width: r.width / pageRect.width, height: r.height
/ pageRect.height, })) const selectedText = selection.toString().trim()
onSelectionComplete({ pageNumber, rects, selectedText })
selection.removeAllRanges() }
```

## 9.4 Resolved annotations (student view)

Resolved annotations remain visible in the viewer — they are not hidden. The yellow highlight changes to a light gray (background: rgba(150, 150, 150, 0.2)) and the sidebar card shows a green "Resolved" badge. This matches the expectation that the supervisor can see what has and has not been addressed.


## 9.5 No real-time updates needed

This is a single-supervisor system. There is no scenario where two people are in the annotation viewer simultaneously. Standard fetch-on-mount with optimistic local state

updates is sufficient. No WebSocket or polling required.


## 10. Summary — What Each Developer Builds

## Backend developer

- Add Annotation SQLAlchemy model to models.py

- Add pdf_url column to Submission model

- Update migrate.py to handle existing databases

- Update SubmissionResponse Pydantic schema to include pdf_url

- Add convert_docx_to_pdf helper to services/file_storage.py

- Wire conversion into the existing POST /student/submissions handler

- Add 6 new annotation endpoints across supervisor.py and student.py routers

- Ensure LibreOffice is available in the deployment environment

- Test all endpoints via FastAPI /docs before frontend integration

## Frontend developer

- Install pdfjs-dist and configure the web worker

- Add Annotation TypeScript types to types/index.ts

- Add annotation API functions to supervisor.ts and student.ts

- Build PDFViewer.tsx, AnnotationLayer.tsx, CommentPopup.tsx, AnnotationSidebar.tsx

- Build AnnotationEditorPage.tsx (supervisor) and AnnotationViewerPage.tsx (student)

- Add two new routes to App.tsx

- Add "Annotate" entry point to supervisor student detail page

- Add "View annotations" entry point to student submission detail page

- Handle PDF URL resolution (pdf_url fallback to file_url)

ThesisFlow · PDF Annotation Implementation Plan · Version 1.0 · June 2025
