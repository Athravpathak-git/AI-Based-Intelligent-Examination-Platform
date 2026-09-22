from datetime import datetime, timezone
from typing import List, Union, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session
from app.core.dependencies import (
    get_db,
    get_current_user,
    require_student,
    require_admin,
    require_examiner_or_admin
)
from app.models.user import User, UserRole
from app.models.exam import Exam
from app.models.registration import ExamRegistration
from app.models.session import ExamSession
from app.models.attempt_permission import ExamAttemptPermission, ExamInstructionAcceptance
from app.schemas.exam_access import ExamInstructionAcceptanceRequest, ExamInstructionAcceptanceResponse
from app.schemas.exam import (
    ExamCreate,
    ExamUpdate,
    ExamResponse,
    ExamStudentListResponse,
    ExamRegistrationResponse,
    ExamCandidateResponse,
    PaperGenerateResponse
)
from app.services.exam_service import (
    create_exam,
    update_exam,
    delete_exam,
    register_student_for_exam,
    cancel_student_registration,
    get_student_registrations,
    get_exam_candidates,
    export_exam_candidates_csv,
    export_all_platform_candidates_csv
)
from app.services.paper_generator import generate_paper_for_student, ensure_utc

router = APIRouter(prefix="/exams", tags=["Exams"])

@router.post("", response_model=ExamResponse, status_code=status.HTTP_201_CREATED)
def api_create_exam(
    exam_in: ExamCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_examiner_or_admin)
):
    """Create a new exam with configuration rules and question quotas (Examiner / Admin only)."""
    return create_exam(db, exam_in, creator_id=current_user.id)

@router.get("/my-registrations", response_model=List[ExamRegistrationResponse])
def api_get_my_registrations(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_student)
):
    """List all exams registered by the current student."""
    return get_student_registrations(db, student_id=current_user.id)

@router.get("", response_model=Union[List[ExamResponse], List[ExamStudentListResponse]])
def api_list_exams(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """List exams. Students receive a student-safe list with registration status; Examiners receive full configuration details."""
    exams = db.query(Exam).filter(Exam.is_deleted == False).order_by(Exam.start_time.desc()).all()

    if current_user.role == UserRole.STUDENT:
        now = datetime.now(timezone.utc)
        # Fetch current active registrations for this student
        student_reg_ids = {
            r.exam_id
            for r in db.query(ExamRegistration.exam_id)
            .filter(ExamRegistration.student_id == current_user.id, ExamRegistration.status == "REGISTERED")
            .all()
        }

        # Fetch completed sessions for this student
        completed_sessions = (
            db.query(ExamSession.exam_id)
            .filter(
                ExamSession.student_id == current_user.id,
                ExamSession.status.in_(["SUBMITTED", "SUBMITTED_VIOLATION", "EXPIRED", "TIME_EXPIRED"])
            )
            .all()
        )
        student_completed_ids = {s.exam_id for s in completed_sessions}

        # Fetch active unconsumed re-attempt permissions for this student
        active_perms = (
            db.query(ExamAttemptPermission)
            .filter(
                ExamAttemptPermission.student_id == current_user.id,
                ExamAttemptPermission.status == "ACTIVE"
            )
            .all()
        )
        active_reattempt_ids = {
            p.exam_id
            for p in active_perms
            if p.attempts_used < p.max_additional_attempts
            and (p.expires_at is None or ensure_utc(p.expires_at) >= now)
        }

        items = []
        for e in exams:
            is_reg = (e.id in student_reg_ids)
            is_comp = (e.id in student_completed_ids)
            has_perm = (e.id in active_reattempt_ids)
            # Reattempt permission keeps window open for authorized candidate
            is_active_win = has_perm or (ensure_utc(e.start_time) <= now <= ensure_utc(e.end_time))
            # Start is allowed if: (registered and not completed) OR (has approved unconsumed reattempt permission)
            can_start_val = is_active_win and ((not is_comp and is_reg) or has_perm)

            items.append(
                ExamStudentListResponse(
                    id=e.id,
                    name=e.name,
                    subject=e.subject,
                    duration_minutes=e.duration_minutes,
                    start_time=e.start_time,
                    end_time=e.end_time,
                    total_questions=e.total_questions,
                    maximum_marks=e.maximum_marks,
                    negative_marking_enabled=e.negative_marking_enabled,
                    webcam_monitoring_enabled=e.webcam_monitoring_enabled,
                    is_active_window=is_active_win,
                    is_registered=(is_reg or has_perm),
                    is_completed=is_comp,
                    has_active_reattempt=has_perm,
                    can_start=can_start_val
                )
            )
        return items

    return exams

@router.get("/admin/candidates", response_model=List[ExamCandidateResponse])
def api_get_admin_candidates(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Platform-wide candidate roster for administrators across all examinations."""
    exams = db.query(Exam).order_by(Exam.id.desc()).all()
    all_candidates = []
    for exam in exams:
        candidates = get_exam_candidates(db, exam.id)
        all_candidates.extend(candidates)
    return all_candidates

@router.get("/admin/candidates/export/csv")
def api_export_admin_candidates_csv(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Platform-wide candidate roster export for administrators across all examinations."""
    csv_str = export_all_platform_candidates_csv(db)
    return Response(
        content=csv_str,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=platform_candidates_roster.csv"}
    )

@router.get("/{exam_id}", response_model=ExamResponse)
def api_get_exam(
    exam_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve details of a single exam configuration."""
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exam not found")
    
    resp = ExamResponse.model_validate(exam)
    if current_user.role == UserRole.STUDENT:
        now = datetime.now(timezone.utc)
        reg = db.query(ExamRegistration).filter(
            ExamRegistration.exam_id == exam_id,
            ExamRegistration.student_id == current_user.id,
            ExamRegistration.status == "REGISTERED"
        ).first()
        is_comp = db.query(ExamSession).filter(
            ExamSession.exam_id == exam_id,
            ExamSession.student_id == current_user.id,
            ExamSession.status.in_(["SUBMITTED", "SUBMITTED_VIOLATION", "EXPIRED", "TIME_EXPIRED"])
        ).first() is not None

        perm = (
            db.query(ExamAttemptPermission)
            .filter(
                ExamAttemptPermission.exam_id == exam_id,
                ExamAttemptPermission.student_id == current_user.id,
                ExamAttemptPermission.status == "ACTIVE"
            )
            .order_by(ExamAttemptPermission.id.desc())
            .first()
        )
        has_perm = (
            perm is not None
            and perm.attempts_used < perm.max_additional_attempts
            and (perm.expires_at is None or ensure_utc(perm.expires_at) >= now)
        )
        is_active_win = has_perm or (ensure_utc(exam.start_time) <= now <= ensure_utc(exam.end_time))
        resp.is_registered = (reg is not None) or has_perm
        resp.is_completed = is_comp
        resp.has_active_reattempt = has_perm
        resp.can_start = is_active_win and ((not is_comp and (reg is not None)) or has_perm)
    return resp

@router.put("/{exam_id}", response_model=ExamResponse)
def api_update_exam(
    exam_id: int,
    exam_in: ExamUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_examiner_or_admin)
):
    """Update exam configuration (Examiner / Admin only)."""
    return update_exam(db, exam_id, exam_in)

@router.delete("/{exam_id}", status_code=status.HTTP_204_NO_CONTENT)
def api_delete_exam(
    exam_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_examiner_or_admin)
):
    """Delete an exam safely (Examiner / Admin only)."""
    delete_exam(db, exam_id)
    return None

@router.post("/{exam_id}/register", response_model=ExamRegistrationResponse, status_code=status.HTTP_201_CREATED)
def api_register_for_exam(
    exam_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_student)
):
    """Register the authenticated student for an upcoming exam."""
    reg = register_student_for_exam(db, exam_id, student=current_user)
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    return ExamRegistrationResponse(
        id=reg.id,
        exam_id=reg.exam_id,
        student_id=reg.student_id,
        registered_at=reg.registered_at,
        status=reg.status,
        exam_name=exam.name if exam else None,
        subject=exam.subject if exam else None,
        start_time=exam.start_time if exam else None,
        end_time=exam.end_time if exam else None,
        duration_minutes=exam.duration_minutes if exam else None,
        is_registered=True
    )

@router.delete("/{exam_id}/register", status_code=status.HTTP_200_OK)
def api_cancel_exam_registration(
    exam_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_student)
):
    """Cancel registration for an exam before the start window begins."""
    cancel_student_registration(db, exam_id, student=current_user)
    return {"message": "Exam registration successfully cancelled"}

@router.get("/{exam_id}/candidates", response_model=List[ExamCandidateResponse])
def api_get_exam_candidates(
    exam_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_examiner_or_admin)
):
    """List registered candidates for an exam (Examiner / Admin only)."""
    return get_exam_candidates(db, exam_id)

@router.get("/{exam_id}/candidates/export/csv")
def api_export_exam_candidates_csv(
    exam_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_examiner_or_admin)
):
    """Export registered candidates roster for a specific exam to CSV."""
    candidates = get_exam_candidates(db, exam_id)
    csv_str = export_exam_candidates_csv(candidates)
    return Response(
        content=csv_str,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=exam_{exam_id}_candidates.csv"}
    )

@router.post("/{exam_id}/generate-paper", response_model=PaperGenerateResponse)
def api_generate_paper(
    exam_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Deterministically generate the student's exam paper."""
    return generate_paper_for_student(db, exam_id, student_id=current_user.id)

@router.post("/{exam_id}/accept-instructions", response_model=ExamInstructionAcceptanceResponse)
def api_accept_exam_instructions(
    exam_id: int,
    req: Optional[ExamInstructionAcceptanceRequest] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_student)
):
    """Record student's explicit agreement to examination rules and instructions."""
    exam = db.query(Exam).filter(Exam.id == exam_id, Exam.is_deleted == False).first()
    if not exam:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exam not found.")

    accepted_val = req.accepted if req is not None else True
    acceptance = ExamInstructionAcceptance(
        student_id=current_user.id,
        exam_id=exam_id,
        accepted=accepted_val,
        accepted_at=datetime.now(timezone.utc)
    )
    db.add(acceptance)
    db.commit()
    db.refresh(acceptance)
    return acceptance

