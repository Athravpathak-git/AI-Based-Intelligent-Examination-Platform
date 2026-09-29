from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import distinct
from app.core.dependencies import get_db, get_current_user, require_admin, require_examiner_or_admin
from app.models.user import User
from app.models.subject import Subject
from app.models.question import QuestionBank
from app.schemas.subject import SubjectCreate, SubjectUpdate, SubjectResponse

router = APIRouter(prefix="/subjects", tags=["Subject Management"])

@router.get("", response_model=List[SubjectResponse])
@router.get("/", response_model=List[SubjectResponse], include_in_schema=False)
def list_subjects(
    active_only: bool = Query(True),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List subjects. Students and examiners receive active subjects; admins can view all."""
    query = db.query(Subject)
    if active_only and current_user.role.value != "ADMIN":
        query = query.filter(Subject.is_active == True)
    elif active_only:
        query = query.filter(Subject.is_active == True)

    if search:
        query = query.filter(Subject.name.ilike(f"%{search.strip()}%") | Subject.code.ilike(f"%{search.strip()}%"))

    return query.order_by(Subject.name.asc()).all()

@router.post("", response_model=SubjectResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=SubjectResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
def create_subject(
    subject_in: SubjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Admin creates a new subject master record."""
    existing_name = db.query(Subject).filter(Subject.name.ilike(subject_in.name.strip())).first()
    if existing_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Subject with name '{subject_in.name}' already exists."
        )

    existing_code = db.query(Subject).filter(Subject.code.ilike(subject_in.code.strip())).first()
    if existing_code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Subject with code '{subject_in.code}' already exists."
        )

    new_sub = Subject(
        name=subject_in.name.strip(),
        code=subject_in.code.strip().upper(),
        description=subject_in.description,
        is_active=subject_in.is_active
    )
    db.add(new_sub)
    db.commit()
    db.refresh(new_sub)
    return new_sub

@router.get("/{subject_id}", response_model=SubjectResponse)
def get_subject(
    subject_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get subject details by ID."""
    sub = db.query(Subject).filter(Subject.id == subject_id).first()
    if not sub:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found")
    return sub

@router.put("/{subject_id}", response_model=SubjectResponse)
def update_subject(
    subject_id: int,
    subject_in: SubjectUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Admin updates subject details."""
    sub = db.query(Subject).filter(Subject.id == subject_id).first()
    if not sub:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found")

    if subject_in.name is not None and subject_in.name.strip().lower() != sub.name.lower():
        if db.query(Subject).filter(Subject.name.ilike(subject_in.name.strip()), Subject.id != subject_id).first():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Subject name in use.")
        sub.name = subject_in.name.strip()

    if subject_in.code is not None and subject_in.code.strip().upper() != sub.code.upper():
        if db.query(Subject).filter(Subject.code.ilike(subject_in.code.strip()), Subject.id != subject_id).first():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Subject code in use.")
        sub.code = subject_in.code.strip().upper()

    if subject_in.description is not None:
        sub.description = subject_in.description
    if subject_in.is_active is not None:
        sub.is_active = subject_in.is_active

    db.commit()
    db.refresh(sub)
    return sub

@router.delete("/{subject_id}")
def delete_subject(
    subject_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Admin deactivates subject."""
    sub = db.query(Subject).filter(Subject.id == subject_id).first()
    if not sub:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found")

    sub.is_active = False
    db.commit()
    return {"message": f"Subject '{sub.name}' deactivated successfully."}

@router.get("/{subject_name}/taxonomy")
def get_subject_taxonomy(
    subject_name: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_examiner_or_admin)
):
    """Get topic -> subtopic hierarchy for a subject from question bank."""
    rows = (
        db.query(QuestionBank.topic, QuestionBank.subtopic)
        .filter(QuestionBank.subject.ilike(subject_name.strip()), QuestionBank.is_active == True)
        .distinct()
        .all()
    )

    taxonomy = {}
    for topic, subtopic in rows:
        t = topic or "General"
        if t not in taxonomy:
            taxonomy[t] = []
        if subtopic and subtopic not in taxonomy[t]:
            taxonomy[t].append(subtopic)

    return {"subject": subject_name, "taxonomy": taxonomy}
