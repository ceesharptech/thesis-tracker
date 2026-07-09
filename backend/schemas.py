from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from models import UserRole, PublishabilityStatus, ChapterLabel

# ─── Auth ───
class AuthUser(BaseModel):
    id: str
    name: str
    role: UserRole
    identifier: str
    isFirstLogin: bool = Field(alias="is_first_login")

    class Config:
        from_attributes = True
        populate_by_name = True

class LoginRequest(BaseModel):
    identifier: str
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: AuthUser

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

# ─── Student (list view) ───
class StudentListItem(BaseModel):
    id: str
    name: str
    matricNumber: str = Field(alias="matric_number")
    projectTitle: str = Field(alias="project_title")
    department: str
    publishabilityStatus: Optional[PublishabilityStatus] = Field(alias="publishability_status")
    submissionCount: int = Field(alias="submission_count")
    lastSubmissionAt: Optional[datetime] = Field(alias="last_submission_at")
    lastChapterSubmitted: Optional[ChapterLabel] = Field(alias="last_chapter_submitted")
    supervisorNotes: Optional[str] = Field(alias="supervisor_notes")
    pendingSubmissionsCount: int = Field(alias="pending_submissions_count", default=0)

    class Config:
        from_attributes = True
        populate_by_name = True

# ─── Submission ───
class SubmissionOut(BaseModel):
    id: str
    studentId: str = Field(alias="student_id")
    chapterLabel: ChapterLabel = Field(alias="chapter_label")
    fileUrl: str = Field(alias="file_url")
    fileName: str = Field(alias="file_name")
    fileType: str = Field(alias="file_type")
    fileSizeBytes: int = Field(alias="file_size_bytes")
    studentNote: Optional[str] = Field(alias="student_note")
    uploadedAt: datetime = Field(alias="uploaded_at")
    commentCount: int = 0

    class Config:
        from_attributes = True
        populate_by_name = True

class CommentOut(BaseModel):
    id: str
    submissionId: str = Field(alias="submission_id")
    authorName: str = Field(alias="author_name")
    body: str
    createdAt: datetime = Field(alias="created_at")

    class Config:
        from_attributes = True
        populate_by_name = True

class CommentCreate(BaseModel):
    author_name: str
    body: str

# ─── Upload / Import ───
class StudentImportRow(BaseModel):
    name: str
    matricNumber: str
    projectTitle: str
    department: str
    isValid: bool = True
    errors: List[str] = []

class BulkImportResponse(BaseModel):
    imported: int
    failed: List[StudentImportRow]

# ─── Dashboard ───
class SupervisorDashboardStats(BaseModel):
    total_students: int
    total_submissions: int
    pending_reviews: int
    publishable_count: int

class PublishabilityUpdate(BaseModel):
    status: PublishabilityStatus

class SupervisorNoteEntry(BaseModel):
    text: str
    createdAt: datetime = Field(alias="created_at")
    author: str

    class Config:
        populate_by_name = True


class SupervisorNotesUpdate(BaseModel):
    note: str

class StudentCreate(BaseModel):
    name: str
    matric_number: str
    project_title: str
    department: str
