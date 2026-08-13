export type UserRole = "supervisor" | "student";

export type PublishabilityStatus =
  | "publishable"
  | "not_publishable"
  | "needs_further_work"
  | "disapproved"
  | null;

export type ChapterLabel =
  | "Chapter 1"
  | "Chapter 2"
  | "Chapter 3"
  | "Chapter 4"
  | "Chapter 5"
  | "Full draft"
  | "Other";

export interface AuthUser {
  id: string;
  name: string;
  role: UserRole;
  identifier: string;
  is_first_login: boolean;
}

export interface SupervisorNote {
  text: string;
  createdAt: string;
  author: string;
}

export interface Student {
  id: string;
  name: string;
  matricNumber: string;
  projectTitle: string;
  department: string;
  publishabilityStatus: PublishabilityStatus;
  submissionCount: number;
  lastSubmissionAt: string | null;
  lastChapterSubmitted: ChapterLabel | null;
  supervisorNotes: string | null;
  pendingSubmissionsCount: number;
}

export interface Submission {
  id: string;
  studentId: string;
  chapterLabel: ChapterLabel;
  fileUrl: string;
  fileName: string;
  fileType: "pdf" | "docx";
  fileSizeBytes: number;
  studentNote: string | null;
  uploadedAt: string;
  commentCount: number;
  /**
   * Path to the server-converted PDF version of a DOCX submission.
   * Null when the original upload was already a PDF (fileUrl is used directly).
   * Populated by the backend after LibreOffice conversion.
   * @see ThesisFlow Annotation Implementation Plan § 3.2
   */
  pdfUrl: string | null;
  /**
   * Total count of inline annotations on this submission.
   * Populated by the backend on SubmissionResponse.
   * WORKAROUND: Until backend exposes this field, the AnnotationViewerPage
   * fetches getAnnotations() on mount to determine count. Remove workaround
   * once backend adds annotation_count to SubmissionResponse.
   */
  annotationCount?: number;
}

export interface Comment {
  id: string;
  submissionId: string;
  authorName: string;
  body: string;
  createdAt: string;
}

export interface StudentImportRow {
  name: string;
  matricNumber: string;
  projectTitle: string;
  department: string;
  isValid: boolean;
  errors: string[];
}

// ─── Annotation feature types ────────────────────────────────────────────────
// Added for PDF/DOCX inline annotation feature.
// @see ThesisFlow Annotation Implementation Plan § 5.2

/**
 * A single highlight rectangle stored as page-fraction coordinates (0.0–1.0).
 * Zoom-independent: multiply by the rendered page pixel dimensions to get
 * absolute pixel positions for rendering.
 */
export interface AnnotationRect {
  x: number;      // fraction of page width,  0.0–1.0
  y: number;      // fraction of page height, 0.0–1.0
  width: number;  // fraction of page width
  height: number; // fraction of page height
}

/**
 * A fully saved annotation as returned by the backend.
 * NOTE: the backend stores `rects` as a JSON string. Parsing/stringifying
 * happens exclusively in the API layer (supervisor.ts / student.ts).
 * All components always receive AnnotationRect[], never raw strings.
 */
export interface Annotation {
  id: string;
  submissionId: string;
  pageNumber: number;
  rects: AnnotationRect[];  // parsed from JSON string on receipt
  selectedText: string;
  comment: string;
  authorId: string;
  authorName: string;
  resolved: boolean;
  createdAt: string;        // ISO 8601 string
}

/**
 * A text selection in progress that has not yet been saved as an Annotation.
 * Exists only in local component state while CommentPopup is open.
 */
export interface PendingAnnotation {
  pageNumber: number;
  rects: AnnotationRect[];
  selectedText: string;
}
