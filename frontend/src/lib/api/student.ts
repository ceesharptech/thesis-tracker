import client from "./client";
import type { Submission, Comment, ChapterLabel, SupervisorNote, Annotation, AnnotationRect } from "@/types";

type RawSubmission = {
  id: string;
  student_id?: string;
  studentId?: string;
  chapter_label?: string;
  chapterLabel?: ChapterLabel;
  file_url?: string;
  fileUrl?: string;
  file_name?: string;
  fileName?: string;
  file_type?: string;
  fileType?: "pdf" | "docx";
  file_size_bytes?: number;
  fileSizeBytes?: number;
  student_note?: string | null;
  studentNote?: string | null;
  uploaded_at?: string;
  uploadedAt?: string;
  comment_count?: number;
  commentCount?: number;
  /** New field added by backend for DOCX→PDF conversion (Annotation feature § 3.2) */
  pdf_url?: string | null;
  pdfUrl?: string | null;
  /**
   * WORKAROUND: Backend may add annotation_count to SubmissionResponse in the future.
   * Until then, AnnotationViewerPage fetches getAnnotations() to determine count.
   * Remove this field and the workaround once backend exposes annotation_count.
   */
  annotation_count?: number;
  annotationCount?: number;
};

type RawComment = {
  id: string;
  submission_id?: string;
  submissionId?: string;
  author_name?: string;
  authorName?: string;
  body: string;
  created_at?: string;
  createdAt?: string;
};

const mapSubmission = (sub: RawSubmission): Submission =>
  ({
    id: sub.id,
    studentId: sub.student_id ?? sub.studentId,
    chapterLabel: sub.chapter_label ?? sub.chapterLabel,
    fileUrl: sub.file_url ?? sub.fileUrl,
    fileName: sub.file_name ?? sub.fileName,
    fileType: sub.file_type ?? sub.fileType,
    fileSizeBytes: sub.file_size_bytes ?? sub.fileSizeBytes,
    studentNote: sub.student_note ?? sub.studentNote,
    uploadedAt: sub.uploaded_at ?? sub.uploadedAt,
    commentCount: sub.comment_count ?? sub.commentCount ?? 0,
    // Annotation feature: pdf_url is the converted PDF path for DOCX uploads.
    // Falls back to null — AnnotationViewerPage uses fileUrl directly when null.
    pdfUrl: sub.pdf_url ?? sub.pdfUrl ?? null,
    // WORKAROUND: annotation_count not yet on SubmissionResponse.
    // Remove ?? undefined once backend adds annotation_count to the schema.
    annotationCount: sub.annotation_count ?? sub.annotationCount ?? undefined,
  } as Submission);

const mapComment = (comment: RawComment): Comment =>
  ({
    id: comment.id,
    submissionId: comment.submission_id ?? comment.submissionId,
    authorName: comment.author_name ?? comment.authorName,
    body: comment.body,
    createdAt: comment.created_at ?? comment.createdAt,
  } as Comment);

export const getMySubmissions = async () => {
  const res = await client.get("/student/submissions");
  return res.data.map(mapSubmission) as Submission[];
};

export const getSubmissionDetail = async (submissionId: string) => {
  const res = await client.get(`/student/submissions/${submissionId}`);
  return mapSubmission(res.data) as Submission;
};

export const uploadSubmission = async (
  chapterLabel: ChapterLabel,
  file: File,
  note?: string,
) => {
  const form = new FormData();
  form.append("chapter_label", chapterLabel);
  form.append("file", file);
  if (note) form.append("note", note);
  const res = await client.post("/student/submissions", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return mapSubmission(res.data) as Submission;
};

export const getSubmissionComments = async (submissionId: string) => {
  const res = await client.get(`/student/submissions/${submissionId}/comments`);
  return res.data.map(mapComment) as Comment[];
};

export const getSupervisorNotes = async (): Promise<SupervisorNote[]> => {
  const res = await client.get("/student/supervisor-notes");
  const raw = res.data?.supervisor_notes;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

// ─── Annotation API functions (Annotation feature § 5.3) ─────────────────────
// All rects are stored as JSON strings in the backend but exposed as
// AnnotationRect[] here. JSON.parse / JSON.stringify happen only in this layer.

/** Raw annotation shape returned by the backend before camelCase mapping. */
type RawAnnotation = {
  id: string;
  submission_id: string;
  page_number: number;
  rects: string;         // JSON string of AnnotationRect[]
  selected_text: string;
  comment: string;
  author_id: string;
  author_name: string;
  resolved: boolean;
  created_at: string;
};

/** Maps a raw backend annotation to the frontend Annotation type. */
const mapAnnotation = (raw: RawAnnotation): Annotation => ({
  id: raw.id,
  submissionId: raw.submission_id,
  pageNumber: raw.page_number,
  rects: JSON.parse(raw.rects) as AnnotationRect[],
  selectedText: raw.selected_text,
  comment: raw.comment,
  authorId: raw.author_id,
  authorName: raw.author_name,
  resolved: raw.resolved,
  createdAt: raw.created_at,
});

/**
 * GET /student/submissions/{id}/annotations
 * Returns all annotations for a submission (read-only for the student).
 * Restricted server-side to submissions belonging to the requesting student.
 */
export const getAnnotations = async (submissionId: string): Promise<Annotation[]> => {
  const res = await client.get(`/student/submissions/${submissionId}/annotations`);
  return (res.data as RawAnnotation[]).map(mapAnnotation);
};

/**
 * PATCH /student/annotations/{id}/resolve
 * Marks a single annotation as resolved by the student.
 * Validated server-side: annotation must belong to the requesting student's submission.
 */
export const resolveAnnotation = async (annotationId: string): Promise<void> => {
  await client.patch(`/student/annotations/${annotationId}/resolve`);
};

