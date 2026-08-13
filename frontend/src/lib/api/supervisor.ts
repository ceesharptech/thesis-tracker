import client from "./client";
import type {
  Student,
  StudentImportRow,
  Submission,
  Comment,
  PublishabilityStatus,
  ChapterLabel,
  Annotation,
  AnnotationRect,
} from "@/types";

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
   * Until then, the viewer fetches annotations separately to get the count.
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

type RawStudent = {
  id: string;
  name: string;
  matric_number?: string;
  matricNumber?: string;
  project_title?: string;
  projectTitle?: string;
  department: string;
  publishability_status?: PublishabilityStatus;
  publishabilityStatus?: PublishabilityStatus;
  submission_count?: number;
  submissionCount?: number;
  last_submission_at?: string | null;
  lastSubmissionAt?: string | null;
  last_chapter_submitted?: string | null;
  lastChapterSubmitted?: string | null;
  supervisor_notes?: string | null;
  supervisorNotes?: string | null;
  pending_submissions_count?: number;
  pendingSubmissionsCount?: number;
};

const mapStudent = (student: RawStudent): Student => ({
  id: student.id,
  name: student.name,
  matricNumber: student.matric_number ?? student.matricNumber ?? "",
  projectTitle: student.project_title ?? student.projectTitle ?? "",
  department: student.department,
  publishabilityStatus:
    student.publishability_status ?? student.publishabilityStatus ?? null,
  submissionCount: student.submission_count ?? student.submissionCount ?? 0,
  lastSubmissionAt:
    student.last_submission_at ?? student.lastSubmissionAt ?? null,
  lastChapterSubmitted: (student.last_chapter_submitted ??
    student.lastChapterSubmitted ??
    null) as ChapterLabel | null,
  supervisorNotes: student.supervisor_notes ?? student.supervisorNotes ?? null,
  pendingSubmissionsCount:
    student.pending_submissions_count ?? student.pendingSubmissionsCount ?? 0,
});

export const getStudents = async () => {
  const res = await client.get("/supervisor/students");

  // Map FastAPI's snake_case to frontend's camelCase
  return res.data.map(mapStudent) as Student[];
};

// Search endpoint for students, returns a list of students matching the query (not implemented in backend yet)
export const searchStudents = async (query: string) => {
  const res = await client.get("/supervisor/students/search", {
    params: { q: query },
  });
  return res.data.map(mapStudent) as Student[];
};

export const getDashboardStats = async () => {
  const res = await client.get("/supervisor/dashboard");
  // If the backend wraps the response (e.g., {"data": {...}}), you might need to return res.data.data here.
  return res.data as {
    total_students: number;
    total_submissions: number;
    pending_reviews: number;
    publishable_count: number;
  };
};

export const uploadStudentsExcel = async (file: File) => {
  const form = new FormData();
  form.append("file", file);
  const res = await client.post("/supervisor/upload-students", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data as { imported: number; failed: StudentImportRow[] };
};

export const createStudent = async (data: {
  name: string;
  matricNumber: string;
  projectTitle: string;
  department: string;
}) => {
  const res = await client.post("/supervisor/student", {
    name: data.name,
    matric_number: data.matricNumber,
    project_title: data.projectTitle,
    department: data.department,
  });
  return mapStudent(res.data);
};

export const getStudentDetail = async (studentId: string) => {
  const res = await client.get(`/supervisor/student/${studentId}`);
  return mapStudent(res.data);
};

export const getStudentSubmissions = async (studentId: string) => {
  const res = await client.get(`/supervisor/student/${studentId}/submissions`);
  return res.data.map((sub: RawSubmission) => ({
    id: sub.id,
    studentId: sub.student_id ?? sub.studentId,
    chapterLabel: (sub.chapter_label ?? sub.chapterLabel) as ChapterLabel,
    fileUrl: sub.file_url ?? sub.fileUrl,
    fileName: sub.file_name ?? sub.fileName,
    fileType: (sub.file_type ?? sub.fileType) as "pdf" | "docx",
    fileSizeBytes: sub.file_size_bytes ?? sub.fileSizeBytes,
    studentNote: sub.student_note ?? sub.studentNote,
    uploadedAt: sub.uploaded_at ?? sub.uploadedAt,
    commentCount: sub.comment_count ?? sub.commentCount ?? 0,
    // Annotation feature: pdf_url is the converted PDF path for DOCX uploads.
    // Falls back to null — AnnotationEditorPage uses fileUrl directly when null.
    pdfUrl: sub.pdf_url ?? sub.pdfUrl ?? null,
    // WORKAROUND: annotation_count not yet on SubmissionResponse.
    // Remove ?? undefined once backend adds annotation_count to the schema.
    annotationCount: sub.annotation_count ?? sub.annotationCount ?? undefined,
  })) as Submission[];
};

export const updatePublishabilityStatus = async (
  studentId: string,
  status: PublishabilityStatus,
) => {
  const res = await client.put(
    `/supervisor/student/${studentId}/publishability`,
    {
      status,
    },
  );
  return mapStudent(res.data);
};

export const updateStudentNotes = async (studentId: string, note: string) => {
  const res = await client.put(`/supervisor/student/${studentId}/notes`, {
    note,
  });
  return mapStudent(res.data);
};

export const getComments = async (submissionId: string) => {
  const res = await client.get(
    `/supervisor/submissions/${submissionId}/comments`,
  );
  return res.data.map((comment: RawComment) => ({
    id: comment.id,
    submissionId: comment.submission_id ?? comment.submissionId,
    authorName: comment.author_name ?? comment.authorName,
    body: comment.body,
    createdAt: comment.created_at ?? comment.createdAt,
  })) as Comment[];
};

export const addComment = async (submissionId: string, body: string) => {
  const res = await client.post(
    `/supervisor/submissions/${submissionId}/comments`,
    {
      author_name: "Supervisor",
      body,
    },
  );
  return {
    id: res.data.id,
    submissionId: res.data.submission_id ?? res.data.submissionId,
    authorName: res.data.author_name ?? res.data.authorName,
    body: res.data.body,
    createdAt: res.data.created_at ?? res.data.createdAt,
  } as Comment;
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
 * GET /supervisor/submissions/{id}/annotations
 * Returns all annotations for a submission ordered by page then created_at.
 * Returns [] when no annotations exist (not a 404).
 */
export const getAnnotations = async (submissionId: string): Promise<Annotation[]> => {
  const res = await client.get(`/supervisor/submissions/${submissionId}/annotations`);
  return (res.data as RawAnnotation[]).map(mapAnnotation);
};

/**
 * POST /supervisor/submissions/{id}/annotations
 * Creates a new annotation. author_id is set server-side from the JWT.
 * rects is stringified here before sending; parsed on the returned object.
 */
export const createAnnotation = async (
  submissionId: string,
  payload: {
    pageNumber: number;
    rects: AnnotationRect[];
    selectedText: string;
    comment: string;
  },
): Promise<Annotation> => {
  const body = {
    page_number: payload.pageNumber,
    rects: JSON.stringify(payload.rects),  // backend expects JSON string
    selected_text: payload.selectedText,
    comment: payload.comment,
  };
  const res = await client.post(
    `/supervisor/submissions/${submissionId}/annotations`,
    body,
  );
  return mapAnnotation(res.data as RawAnnotation);
};

/**
 * PATCH /supervisor/annotations/{id}
 * Edits the comment text of an existing annotation.
 * Only the author can edit their own annotations (validated server-side).
 */
export const updateAnnotation = async (
  annotationId: string,
  comment: string,
): Promise<Annotation> => {
  const res = await client.patch(`/supervisor/annotations/${annotationId}`, {
    comment,
  });
  return mapAnnotation(res.data as RawAnnotation);
};

/**
 * DELETE /supervisor/annotations/{id}
 * Permanently deletes an annotation. Only the author can delete (server-side).
 */
export const deleteAnnotation = async (annotationId: string): Promise<void> => {
  await client.delete(`/supervisor/annotations/${annotationId}`);
};
