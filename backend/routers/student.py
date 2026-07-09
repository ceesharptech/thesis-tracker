from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from database import get_db
from models import Submission, Comment, Student, ChapterLabel
from schemas import SubmissionOut, CommentOut
from dependencies import require_student, get_current_user
from services.file_storage import save_upload_file
from sqlalchemy import func
from datetime import datetime

router = APIRouter(prefix="/student", tags=["Student"], dependencies=[Depends(require_student)])

@router.get("/submissions", response_model=list[SubmissionOut])
def get_my_submissions(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
    
    subs = db.query(Submission).filter(Submission.student_id == student.id).all()
    # Add comment counts
    result = []
    for s in subs:
        count = db.query(Comment).filter(Comment.submission_id == s.id).count()
        s.commentCount = count
        result.append(s)
    return result

@router.post("/submissions", response_model=SubmissionOut)
async def upload_submission(
    chapter_label: str = Form(...),
    file: UploadFile = File(...),
    note: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
    
    # Validate file
    allowed = {"application/pdf": "pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx"}
    if file.content_type not in allowed:
        raise HTTPException(status_code=400, detail="Only PDF and DOCX allowed")
    
    file_url, file_name, size = await save_upload_file(file)

    now = datetime.utcnow()
    sub = Submission(
        student_id=student.id,
        chapter_label=chapter_label,
        file_url=file_url,
        file_name=file_name,
        file_type=allowed[file.content_type],
        file_size_bytes=size,
        student_note=note,
        uploaded_at=now,
    )
    db.add(sub)

    # Update student stats
    student.submission_count += 1
    student.last_submission_at = now
    student.last_chapter_submitted = chapter_label
    
    db.commit()
    db.refresh(sub)
    return sub

@router.get("/submissions/{submission_id}", response_model=SubmissionOut)
def get_submission_detail(
    submission_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    sub = db.query(Submission).filter(
        Submission.id == submission_id,
        Submission.student_id == student.id if student else None
    ).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")
    return sub

@router.get("/submissions/{submission_id}/comments", response_model=list[CommentOut])
def get_comments(submission_id: str, db: Session = Depends(get_db)):
    comments = db.query(Comment).filter(Comment.submission_id == submission_id).all()
    return comments


@router.get("/supervisor-notes")
def get_supervisor_notes(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
    return {"supervisor_notes": student.supervisor_notes}
