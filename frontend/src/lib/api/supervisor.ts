import client from "./client";
import type {
  Student,
  StudentImportRow,
  Submission,
  Comment,
  PublishabilityStatus,
} from "@/types";

export const getStudents = async () => {
  const res = await client.get("/supervisor/students");

  // Map FastAPI's snake_case to frontend's camelCase
  return res.data.map((student: any) => ({
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
  } as Student;
};

// ... keep your Phase 4 stubs below
export const getStudentSubmissions = async (studentId: string) => {
  return [] as Submission[];
};
export const updatePublishabilityStatus = async (
  studentId: string,
  status: PublishabilityStatus,
) => {
  return { success: true };
};
export const getComments = async (submissionId: string) => {
  return [] as Comment[];
};
export const addComment = async (submissionId: string, body: string) => {
  return {} as Comment;
};
