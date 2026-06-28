// src/lib/api/supervisor.ts
import client from "./client";
import type {
  Student,
  Submission,
  Comment,
  StudentImportRow,
  PublishabilityStatus,
} from "@/types";

export const getStudents = async () => {
  // GET /ROUTE_PLACEHOLDER/supervisor/students
  const res = await client.get("ROUTE_PLACEHOLDER/supervisor/students");
  return res.data as Student[];
};

export const seedStudents = async (rows: StudentImportRow[]) => {
  // POST /ROUTE_PLACEHOLDER/supervisor/students/seed
  // Body: { students: StudentImportRow[] }
  // Response: { created: number, skipped: number, errors: string[] }
  const res = await client.post("ROUTE_PLACEHOLDER/supervisor/students/seed", {
    students: rows,
  });
  return res.data as { created: number; skipped: number; errors: string[] };
};

export const getStudentDetail = async (studentId: string) => {
  // GET /ROUTE_PLACEHOLDER/supervisor/students/:id
  const res = await client.get(
    `ROUTE_PLACEHOLDER/supervisor/students/${studentId}`,
  );
  return res.data as Student;
};

export const getStudentSubmissions = async (studentId: string) => {
  // GET /ROUTE_PLACEHOLDER/supervisor/students/:id/submissions
  const res = await client.get(
    `ROUTE_PLACEHOLDER/supervisor/students/${studentId}/submissions`,
  );
  return res.data as Submission[];
};

export const updatePublishabilityStatus = async (
  studentId: string,
  status: PublishabilityStatus,
) => {
  // PATCH /ROUTE_PLACEHOLDER/supervisor/students/:id/status
  // Body: { status }
  const res = await client.patch(
    `ROUTE_PLACEHOLDER/supervisor/students/${studentId}/status`,
    { status },
  );
  return res.data as { success: boolean };
};

export const getComments = async (submissionId: string) => {
  // GET /ROUTE_PLACEHOLDER/supervisor/submissions/:id/comments
  const res = await client.get(
    `ROUTE_PLACEHOLDER/supervisor/submissions/${submissionId}/comments`,
  );
  return res.data as Comment[];
};

export const addComment = async (submissionId: string, body: string) => {
  // POST /ROUTE_PLACEHOLDER/supervisor/submissions/:id/comments
  // Body: { body }
  const res = await client.post(
    `ROUTE_PLACEHOLDER/supervisor/submissions/${submissionId}/comments`,
    { body },
  );
  return res.data as Comment;
};
