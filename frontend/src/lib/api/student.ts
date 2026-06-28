// src/lib/api/student.ts
import client from "./client";
import type { Submission, Comment, ChapterLabel } from "@/types";

export const getMySubmissions = async () => {
  // GET /ROUTE_PLACEHOLDER/student/submissions
  const res = await client.get("ROUTE_PLACEHOLDER/student/submissions");
  return res.data as Submission[];
};

export const getSubmissionDetail = async (submissionId: string) => {
  // GET /ROUTE_PLACEHOLDER/student/submissions/:id
  const res = await client.get(
    `ROUTE_PLACEHOLDER/student/submissions/${submissionId}`,
  );
  return res.data as Submission;
};

export const uploadSubmission = async (
  chapterLabel: ChapterLabel,
  file: File,
  note?: string,
) => {
  // POST /ROUTE_PLACEHOLDER/student/submissions
  // Body: FormData { chapter_label, file, note? }
  const form = new FormData();
  form.append("chapter_label", chapterLabel);
  form.append("file", file);
  if (note) form.append("note", note);
  const res = await client.post("ROUTE_PLACEHOLDER/student/submissions", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data as Submission;
};

export const getSubmissionComments = async (submissionId: string) => {
  // GET /ROUTE_PLACEHOLDER/student/submissions/:id/comments
  const res = await client.get(
    `ROUTE_PLACEHOLDER/student/submissions/${submissionId}/comments`,
  );
  return res.data as Comment[];
};
