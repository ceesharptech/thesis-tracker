import client from "./client";
import type {
  Student,
  StudentImportRow,
  Submission,
  Comment,
  PublishabilityStatus,
  ChapterLabel,
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
};

export const getStudents = async () => {
  const res = await client.get("/supervisor/students");

  // Map FastAPI's snake_case to frontend's camelCase
  return res.data.map((student: RawStudent) => ({
    id: student.id,
    name: student.name,
    matricNumber: student.matric_number ?? student.matricNumber,
    projectTitle: student.project_title ?? student.projectTitle,
    department: student.department,
    publishabilityStatus:
      student.publishability_status ?? student.publishabilityStatus,
    submissionCount: student.submission_count ?? student.submissionCount,
    lastSubmissionAt: student.last_submission_at ?? student.lastSubmissionAt,
    lastChapterSubmitted:
      student.last_chapter_submitted ?? student.lastChapterSubmitted,
    supervisorNotes: student.supervisor_notes ?? student.supervisorNotes,
  })) as Student[];
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

export const getStudentDetail = async (studentId: string) => {
  const res = await client.get(`/supervisor/student/${studentId}`);
  // We will need to map this one to camelCase too when we get to Phase 4
  return {
    ...res.data,
    matricNumber: res.data.matric_number ?? res.data.matricNumber,
    projectTitle: res.data.project_title ?? res.data.projectTitle,
    publishabilityStatus:
      res.data.publishability_status ?? res.data.publishabilityStatus,
    submissionCount: res.data.submission_count ?? res.data.submissionCount,
    lastSubmissionAt: res.data.last_submission_at ?? res.data.lastSubmissionAt,
    lastChapterSubmitted:
      res.data.last_chapter_submitted ?? res.data.lastChapterSubmitted,
    supervisorNotes: res.data.supervisor_notes ?? res.data.supervisorNotes,
  } as Student;
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
  })) as Submission[];
};

export const updatePublishabilityStatus = async (
  studentId: string,
  status: PublishabilityStatus,
) => {
  const res = await client.put(`/supervisor/student/${studentId}/publishability`, {
    status,
  });
  return {
    ...res.data,
    matricNumber: res.data.matric_number ?? res.data.matricNumber,
    projectTitle: res.data.project_title ?? res.data.projectTitle,
    publishabilityStatus:
      res.data.publishability_status ?? res.data.publishabilityStatus,
    submissionCount: res.data.submission_count ?? res.data.submissionCount,
    lastSubmissionAt: res.data.last_submission_at ?? res.data.lastSubmissionAt,
    lastChapterSubmitted:
      res.data.last_chapter_submitted ?? res.data.lastChapterSubmitted,
    supervisorNotes: res.data.supervisor_notes ?? res.data.supervisorNotes,
  } as Student;
};

export const updateStudentNotes = async (studentId: string, notes: string) => {
  const res = await client.put(`/supervisor/student/${studentId}/notes`, {
    notes,
  });
  return {
    ...res.data,
    matricNumber: res.data.matric_number ?? res.data.matricNumber,
    projectTitle: res.data.project_title ?? res.data.projectTitle,
    publishabilityStatus:
      res.data.publishability_status ?? res.data.publishabilityStatus,
    submissionCount: res.data.submission_count ?? res.data.submissionCount,
    lastSubmissionAt: res.data.last_submission_at ?? res.data.lastSubmissionAt,
    lastChapterSubmitted:
      res.data.last_chapter_submitted ?? res.data.lastChapterSubmitted,
    supervisorNotes: res.data.supervisor_notes ?? res.data.supervisorNotes,
  } as Student;
};

export const getComments = async (submissionId: string) => {
  const res = await client.get(`/supervisor/submissions/${submissionId}/comments`);
  return res.data.map((comment: RawComment) => ({
    id: comment.id,
    submissionId: comment.submission_id ?? comment.submissionId,
    authorName: comment.author_name ?? comment.authorName,
    body: comment.body,
    createdAt: comment.created_at ?? comment.createdAt,
  })) as Comment[];
};

export const addComment = async (submissionId: string, body: string) => {
  const res = await client.post(`/supervisor/submissions/${submissionId}/comments`, {
    author_name: "Supervisor",
    body,
  });
  return {
    id: res.data.id,
    submissionId: res.data.submission_id ?? res.data.submissionId,
    authorName: res.data.author_name ?? res.data.authorName,
    body: res.data.body,
    createdAt: res.data.created_at ?? res.data.createdAt,
  } as Comment;
};
