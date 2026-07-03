export const CHAPTER_OPTIONS = [
  "Chapter 1",
  "Chapter 2",
  "Chapter 3",
  "Chapter 4",
  "Chapter 5",
  "Full draft",
  "Other",
] as const;

export const PUBLISHABILITY_OPTIONS = [
  { value: "publishable", label: "Publishable" },
  { value: "not_publishable", label: "Not Publishable" },
  { value: "needs_further_work", label: "Needs Further Work" },
  { value: "disapproved", label: "Disapproved" },
] as const;

export const EXCEL_COLUMN_MAP = {
  name: ["name", "full name", "student name"],
  matricNumber: ["matric", "matric number", "matriculation number", "reg no"],
  projectTitle: ["project title", "title", "project"],
  department: ["department", "dept"],
} as const;

export const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;
export const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
export const ALLOWED_EXCEL_TYPES = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
];
