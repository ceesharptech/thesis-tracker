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
  isFirstLogin: boolean;
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
