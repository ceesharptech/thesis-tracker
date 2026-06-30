import client from "./client";
import type { Student, StudentImportRow } from "@/types";

export const getStudents = async () => {
  const res = await client.get("/supervisor/students");
  return res.data as Student[];
};

export const getDashboardStats = async () => {
  const res = await client.get("/supervisor/dashboard");
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
  return res.data as Student;
};
