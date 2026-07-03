import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text, Enum as SQLEnum
from database import Base
import enum

class UserRole(str, enum.Enum):
    SUPERVISOR = "supervisor"
    STUDENT = "student"

class PublishabilityStatus(str, enum.Enum):
    PUBLISHABLE = "publishable"
    NOT_PUBLISHABLE = "not_publishable"
    NEEDS_FURTHER_WORK = "needs_further_work"
    DISAPPROVED = "disapproved"

class ChapterLabel(str, enum.Enum):
    CHAPTER_1 = "Chapter 1"
    CHAPTER_2 = "Chapter 2"
    CHAPTER_3 = "Chapter 3"
    CHAPTER_4 = "Chapter 4"
    CHAPTER_5 = "Chapter 5"
    FULL_DRAFT = "Full draft"
    OTHER = "Other"

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    identifier = Column(String, unique=True, nullable=False, index=True)  # email or matric
    hashed_password = Column(String, nullable=False)
    role = Column(SQLEnum(UserRole), nullable=False)
    is_first_login = Column(Integer, default=1)  # SQLite bool
    created_at = Column(DateTime, default=datetime.utcnow)

class Student(Base):
    __tablename__ = "students"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), unique=True)
    name = Column(String, nullable=False)
    matric_number = Column(String, unique=True, nullable=False, index=True)
    project_title = Column(String, nullable=False)
    department = Column(String, nullable=False)
    publishability_status = Column(SQLEnum(PublishabilityStatus), nullable=True)
    submission_count = Column(Integer, default=0)
    last_submission_at = Column(DateTime, nullable=True)
    last_chapter_submitted = Column(SQLEnum(ChapterLabel), nullable=True)
    supervisor_notes = Column(Text, nullable=True)

class Submission(Base):
    __tablename__ = "submissions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    student_id = Column(String, ForeignKey("students.id"), nullable=False)
    chapter_label = Column(SQLEnum(ChapterLabel), nullable=False)
    file_url = Column(String, nullable=False)
    file_name = Column(String, nullable=False)
    file_type = Column(String, nullable=False)  # pdf or docx
    file_size_bytes = Column(Integer, nullable=False)
    student_note = Column(Text, nullable=True)
    uploaded_at = Column(DateTime, default=datetime.utcnow)

class Comment(Base):
    __tablename__ = "comments"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    submission_id = Column(String, ForeignKey("submissions.id"), nullable=False)
    author_name = Column(String, nullable=False)
    body = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
