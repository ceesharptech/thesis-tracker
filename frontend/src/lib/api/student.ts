import client from "./client";
import type { Submission, Comment, ChapterLabel } from "@/types";

export const getMySubmissions = async () => {
  const res = await client.get("/student/submissions");
  return res.data as Submission[];
};

export const getSubmissionDetail = async (submissionId: string) => {
  const res = await client.get(`/student/submissions/${submissionId}`);
  return res.data as Submission;
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
  return res.data as Submission;
};

export const getSubmissionComments = async (submissionId: string) => {
  const res = await client.get(`/student/submissions/${submissionId}/comments`);
  return res.data as Comment[];
};
