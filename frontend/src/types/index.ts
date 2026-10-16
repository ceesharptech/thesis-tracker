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

// ─── Annotation feature types (EmbedPDF-based) ──────────────────────────────
// The new annotation system uses EmbedPDF's native PdfHighlightAnnoObject type
// with our custom data in the `custom` field. Types for the new system are
// defined in ANNOTATION_FEATURE_CONTEXT.md § 4 and will be added here when
// needed (Phase 2+). The old pdfjs-based AnnotationRect / Annotation /
// PendingAnnotation types have been removed as part of the EmbedPDF migration.

export interface AnnotationCustomData {
  resolved: boolean;
  authorId: string;
  authorName: string;
}
