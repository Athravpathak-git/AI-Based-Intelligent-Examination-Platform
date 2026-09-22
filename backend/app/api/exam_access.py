from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.core.dependencies import (
    get_db,
    get_current_user,
    require_student,
    require_examiner,
    require_admin,
    require_examiner_or_admin
)
from app.models.user import User, UserRole
from app.models.exam import Exam
from app.models.session import ExamSession
from app.models.result import Result
from app.models.proctor import ProctorEvent
from app.models.attempt_permission import ExamAttemptPermission
from app.schemas.exam_access import (
    ExamAccessGrantRequest,
    ReattemptRequestCreate,
    ReattemptActionRequest,
    ExamAccessResponse,
    StudentAttemptHistoryItem,
    EligibleCandidateResponse
)
from app.services.notification_service import create_notification

router = APIRouter(prefix="/exam-access", tags=["Exam Re-attempt Access"])

def _build_permission_response(p: ExamAttemptPermission) -> ExamAccessResponse:
    return ExamAccessResponse(
        id=p.id,
        exam_id=p.exam_id,
        exam_name=p.exam.name if p.exam else None,
        student_id=p.student_id,
        student_name=p.student.name if p.student else None,
        student_email=p.student.email if p.student else None,
        student_registration_number=p.student.registration_number if p.student else None,
        granted_by=p.granted_by,
        grantor_name=p.grantor.name if p.grantor else None,
        requested_by_id=p.requested_by_id,
        requester_name=p.requested_by.name if p.requested_by else None,
        permission_type=p.permission_type,
        max_additional_attempts=p.max_additional_attempts,
        attempts_used=p.attempts_used,
        status=p.status,
        reason=p.reason,
        notes=p.notes,
        granted_at=p.granted_at,
        expires_at=p.expires_at,
        revoked_at=p.revoked_at,
        created_at=p.created_at
    )

@router.post("/grant", response_model=ExamAccessResponse, status_code=status.HTTP_201_CREATED)
def grant_exam_reattempt(
    req: ExamAccessGrantRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Directly grant re-attempt access permission to a student.
    - STRICT: Only Administrators can directly grant re-attempts.
    - Examiners must submit a re-attempt request for admin approval.
    """
    exam = db.query(Exam).filter(Exam.id == req.exam_id).first()
    if not exam:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exam not found.")

    student = db.query(User).filter(User.id == req.student_id, User.role == UserRole.STUDENT).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found.")

    now = datetime.now(timezone.utc)

    # Check if there is an existing ACTIVE permission and update it or create new
    existing_perm = (
        db.query(ExamAttemptPermission)
        .filter(
            ExamAttemptPermission.exam_id == req.exam_id,
            ExamAttemptPermission.student_id == req.student_id,
            ExamAttemptPermission.status == "ACTIVE"
        )
        .first()
    )

    if existing_perm:
        existing_perm.max_additional_attempts = req.max_additional_attempts
        existing_perm.expires_at = req.expires_at
        existing_perm.reason = req.reason
        existing_perm.notes = req.notes
        existing_perm.granted_by = current_user.id
        existing_perm.granted_at = now
        db.commit()
        db.refresh(existing_perm)

        create_notification(
            db=db,
            user_id=req.student_id,
            type="REATTEMPT_APPROVED",
            title="Re-attempt Access Granted",
            message=f"You have been granted re-attempt access for '{exam.name}' by Admin {current_user.name}.",
            link="/student"
        )
        return _build_permission_response(existing_perm)

    new_perm = ExamAttemptPermission(
        exam_id=req.exam_id,
        student_id=req.student_id,
        granted_by=current_user.id,
        requested_by_id=None,
        permission_type="REATTEMPT",
        max_additional_attempts=req.max_additional_attempts,
        attempts_used=0,
        status="ACTIVE",
        reason=req.reason,
        notes=req.notes,
        granted_at=now,
        expires_at=req.expires_at
    )
    db.add(new_perm)
    db.commit()
    db.refresh(new_perm)

    create_notification(
        db=db,
        user_id=req.student_id,
        type="REATTEMPT_APPROVED",
        title="Re-attempt Access Granted",
        message=f"You have been granted re-attempt access for '{exam.name}' by Admin {current_user.name}.",
        link="/student"
    )

    return _build_permission_response(new_perm)

@router.post("/request", response_model=ExamAccessResponse, status_code=status.HTTP_201_CREATED)
def request_exam_reattempt(
    req: ReattemptRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_examiner)
):
    """
    Examiner submits a re-attempt request for a student on an examination they own.
    - Status is created as PENDING_ADMIN_APPROVAL.
    - Examiner CANNOT directly grant final access.
    - Students are strictly forbidden from submitting requests.
    """
    if not req.student_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A student must be specified for the re-attempt request."
        )

    exam = db.query(Exam).filter(Exam.id == req.exam_id).first()
    if not exam:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exam not found.")

    if current_user.role == UserRole.EXAMINER and exam.created_by is not None and exam.created_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Examiners are strictly restricted from requesting re-attempts for examinations created by other faculty."
        )

    student = db.query(User).filter(User.id == req.student_id, User.role == UserRole.STUDENT).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student candidate not found.")

    existing = (
        db.query(ExamAttemptPermission)
        .filter(
            ExamAttemptPermission.exam_id == req.exam_id,
            ExamAttemptPermission.student_id == req.student_id,
            ExamAttemptPermission.status.in_(["PENDING_ADMIN_APPROVAL", "ACTIVE"])
        )
        .first()
    )
    if existing:
        if existing.status == "ACTIVE":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Student already has an active authorized permission for this exam."
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A re-attempt request for this student is already pending administrator approval."
        )

    now = datetime.now(timezone.utc)
    new_perm = ExamAttemptPermission(
        exam_id=req.exam_id,
        student_id=req.student_id,
        granted_by=None,
        requested_by_id=current_user.id,
        permission_type="REATTEMPT",
        max_additional_attempts=1,
        attempts_used=0,
        status="PENDING_ADMIN_APPROVAL",
        reason=req.reason,
        notes=req.notes,
        granted_at=now
    )
    db.add(new_perm)
    db.commit()
    db.refresh(new_perm)

    # Notify all active Admins of the pending request
    admins = db.query(User).filter(User.role == UserRole.ADMIN, User.is_active == True).all()
    for admin in admins:
        create_notification(
            db=db,
            user_id=admin.id,
            type="REATTEMPT_REQUEST",
            title="Examiner Re-attempt Request",
            message=f"Examiner {current_user.name} requested a re-attempt for {student.name} on '{exam.name}'.",
            link="/admin/exam-access"
        )

    # Acknowledge to examiner
    create_notification(
        db=db,
        user_id=current_user.id,
        type="REATTEMPT_REQUEST",
        title="Re-attempt Request Submitted",
        message=f"Your re-attempt request for student {student.name} on '{exam.name}' is pending admin approval.",
        link="/examiner/exam-access"
    )

    return _build_permission_response(new_perm)

@router.post("/{permission_id}/approve", response_model=ExamAccessResponse)
def approve_exam_reattempt(
    permission_id: int,
    action: Optional[ReattemptActionRequest] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Administrator approves a pending examiner re-attempt request.
    - Status becomes ACTIVE.
    - Student is notified and may now attempt the exam.
    """
    perm = db.query(ExamAttemptPermission).filter(ExamAttemptPermission.id == permission_id).first()
    if not perm:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Permission record not found.")

    if perm.status != "PENDING_ADMIN_APPROVAL" and perm.status != "PENDING":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot approve permission in status {perm.status}. Must be PENDING_ADMIN_APPROVAL."
        )

    now = datetime.now(timezone.utc)
    perm.status = "ACTIVE"
    perm.granted_by = current_user.id
    perm.granted_at = now
    if action and action.notes:
        perm.notes = (perm.notes or "") + f"\nAdmin Approval Note: {action.notes}".strip()

    db.commit()
    db.refresh(perm)

    exam_title = perm.exam.name if perm.exam else "your examination"
    create_notification(
        db=db,
        user_id=perm.student_id,
        type="REATTEMPT_APPROVED",
        title="Re-attempt Request Approved",
        message=f"Your re-attempt for '{exam_title}' has been approved by the Administrator. You may now attempt the exam.",
        link="/student"
    )

    if perm.requested_by_id:
        create_notification(
            db=db,
            user_id=perm.requested_by_id,
            type="REATTEMPT_APPROVED",
            title="Re-attempt Request Approved",
            message=f"Admin {current_user.name} approved your re-attempt request for student {perm.student.name if perm.student else 'candidate'} on '{exam_title}'.",
            link="/examiner/exam-access"
        )

    return _build_permission_response(perm)

@router.post("/{permission_id}/reject", response_model=ExamAccessResponse)
def reject_exam_reattempt(
    permission_id: int,
    action: Optional[ReattemptActionRequest] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Administrator rejects a pending examiner re-attempt request.
    - Status becomes REJECTED.
    """
    perm = db.query(ExamAttemptPermission).filter(ExamAttemptPermission.id == permission_id).first()
    if not perm:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Permission record not found.")

    now = datetime.now(timezone.utc)
    perm.status = "REJECTED"
    perm.revoked_at = now
    if action and action.notes:
        perm.notes = (perm.notes or "") + f"\nAdmin Rejection Reason: {action.notes}".strip()

    db.commit()
    db.refresh(perm)

    exam_title = perm.exam.name if perm.exam else "examination"
    if perm.requested_by_id:
        create_notification(
            db=db,
            user_id=perm.requested_by_id,
            type="REATTEMPT_REJECTED",
            title="Re-attempt Request Rejected",
            message=f"Admin {current_user.name} rejected your re-attempt request for student {perm.student.name if perm.student else 'candidate'} on '{exam_title}'.",
            link="/examiner/exam-access"
        )

    return _build_permission_response(perm)

@router.post("/{permission_id}/revoke", response_model=ExamAccessResponse)
def revoke_exam_reattempt(
    permission_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Administrator revokes an active re-attempt permission."""
    perm = db.query(ExamAttemptPermission).filter(ExamAttemptPermission.id == permission_id).first()
    if not perm:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Permission record not found.")

    perm.status = "REVOKED"
    perm.revoked_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(perm)

    create_notification(
        db=db,
        user_id=perm.student_id,
        type="REATTEMPT_REJECTED",
        title="Re-attempt Permission Revoked",
        message=f"Your re-attempt permission for '{perm.exam.name if perm.exam else 'examination'}' has been revoked by the Administrator.",
        link="/student"
    )

    return _build_permission_response(perm)

@router.get("", response_model=List[ExamAccessResponse])
def list_exam_permissions(
    exam_id: Optional[int] = Query(None),
    student_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_examiner_or_admin)
):
    """List re-attempt permissions (scoped by role)."""
    query = db.query(ExamAttemptPermission)

    if exam_id:
        query = query.filter(ExamAttemptPermission.exam_id == exam_id)
    if student_id:
        query = query.filter(ExamAttemptPermission.student_id == student_id)
    if status:
        query = query.filter(ExamAttemptPermission.status == status)

    records = query.order_by(ExamAttemptPermission.id.desc()).all()
    return [_build_permission_response(p) for p in records]

@router.get("/pending", response_model=List[ExamAccessResponse])
def list_pending_reattempt_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Admin retrieves all pending examiner re-attempt requests."""
    records = (
        db.query(ExamAttemptPermission)
        .filter(ExamAttemptPermission.status.in_(["PENDING_ADMIN_APPROVAL", "PENDING"]))
        .order_by(ExamAttemptPermission.id.desc())
        .all()
    )
    return [_build_permission_response(p) for p in records]

@router.get("/my-requests", response_model=List[ExamAccessResponse])
def get_my_reattempt_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_examiner)
):
    """Examiner retrieves all re-attempt requests they have submitted."""
    records = (
        db.query(ExamAttemptPermission)
        .filter(ExamAttemptPermission.requested_by_id == current_user.id)
        .order_by(ExamAttemptPermission.id.desc())
        .all()
    )
    return [_build_permission_response(p) for p in records]

@router.get("/history/{student_id}", response_model=List[StudentAttemptHistoryItem])
def get_student_attempt_history(
    student_id: int,
    exam_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_examiner_or_admin)
):
    """Retrieve complete chronological attempt history for a student."""
    query = (
        db.query(ExamSession)
        .filter(ExamSession.student_id == student_id)
    )

    if exam_id:
        query = query.filter(ExamSession.exam_id == exam_id)

    sessions = query.order_by(ExamSession.started_at.asc()).all()

    history: List[StudentAttemptHistoryItem] = []
    exam_attempt_counts: dict = {}

    for s in sessions:
        exam_attempt_counts[s.exam_id] = exam_attempt_counts.get(s.exam_id, 0) + 1
        att_num = exam_attempt_counts[s.exam_id]

        res = db.query(Result).filter(Result.session_id == s.id).first()
        violations = db.query(ProctorEvent).filter(ProctorEvent.session_id == s.id).count()

        history.append(StudentAttemptHistoryItem(
            session_id=s.id,
            attempt_number=att_num,
            exam_id=s.exam_id,
            exam_name=s.exam.name if s.exam else f"Exam #{s.exam_id}",
            started_at=s.started_at,
            submitted_at=s.submitted_at,
            status=s.status,
            score=res.total_marks if res else None,
            maximum_marks=res.maximum_marks if res else (s.exam.maximum_marks if s.exam else None),
            percentage=res.percentage if res else None,
            result_status=res.status if res else None,
            violations_count=violations
        ))

    return history

@router.get("/eligible-candidates/{exam_id}", response_model=List[EligibleCandidateResponse])
def get_eligible_reattempt_candidates(
    exam_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_examiner_or_admin)
):
    """
    Retrieve candidates who have submitted/completed an attempt for this examination,
    making them eligible for an examiner re-attempt petition or admin grant.
    - Examiners are restricted to viewing eligible candidates for their own exams.
    - Admins can view for any exam.
    """
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exam not found.")

    # Query all completed or submitted sessions for this exam
    finished_statuses = ["SUBMITTED", "SUBMITTED_VIOLATION", "COMPLETED", "EXPIRED", "TIME_EXPIRED"]
    sessions = (
        db.query(ExamSession)
        .filter(
            ExamSession.exam_id == exam_id,
            (ExamSession.status.in_(finished_statuses)) | (ExamSession.submitted_at.isnot(None))
        )
        .order_by(ExamSession.started_at.asc())
        .all()
    )

    # Group sessions by student_id
    student_sessions_map: dict = {}
    for s in sessions:
        student_sessions_map.setdefault(s.student_id, []).append(s)

    eligible_candidates: List[EligibleCandidateResponse] = []

    for student_id, stu_sessions in student_sessions_map.items():
        student = db.query(User).filter(User.id == student_id).first()
        if not student:
            continue

        latest_session = stu_sessions[-1]
        res = db.query(Result).filter(Result.session_id == latest_session.id).first()

        # Check existing re-attempt permission state
        pending_perm = (
            db.query(ExamAttemptPermission)
            .filter(
                ExamAttemptPermission.exam_id == exam_id,
                ExamAttemptPermission.student_id == student_id,
                ExamAttemptPermission.status.in_(["PENDING_ADMIN_APPROVAL", "PENDING"])
            )
            .first()
        )
        active_perm = (
            db.query(ExamAttemptPermission)
            .filter(
                ExamAttemptPermission.exam_id == exam_id,
                ExamAttemptPermission.student_id == student_id,
                ExamAttemptPermission.status == "ACTIVE"
            )
            .first()
        )

        display_name = student.name or f"Candidate #{student.id}"
        reg_num = student.registration_number or f"STU-{student.id:06d}"

        eligible_candidates.append(EligibleCandidateResponse(
            student_id=student.id,
            name=display_name,
            student_name=display_name,
            email=student.email,
            student_email=student.email,
            registration_number=reg_num,
            student_registration_number=reg_num,
            attempt_count=len(stu_sessions),
            latest_session_id=latest_session.id,
            latest_status=latest_session.status,
            latest_submitted_at=latest_session.submitted_at,
            latest_score=res.total_marks if res else None,
            maximum_marks=res.maximum_marks if res else (exam.maximum_marks if exam else None),
            percentage=res.percentage if res else None,
            pending_request_exists=pending_perm is not None,
            active_permission_exists=active_perm is not None
        ))

    return eligible_candidates

