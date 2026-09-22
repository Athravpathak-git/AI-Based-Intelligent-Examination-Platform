from typing import List, Optional
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from app.db.database import SessionLocal
from app.core.dependencies import (
    get_db,
    get_current_user,
    require_student,
    require_examiner_or_admin
)
from app.models.user import User
from app.models.proctor import ProctorEvent
from app.models.session import ExamSession, Answer
from app.models.question import QuestionBank, QuestionType
from app.schemas.session import (
    SessionStartResponse,
    AnswerSaveRequest,
    AnswerSaveResponse,
    ImageUploadResponse,
    ProctorEventCreate,
    ProctorEventResponse,
    ProctorEventActionResponse,
    SessionHeartbeatResponse,
    ExamSubmissionResult
)
from app.services.image_service import save_and_thumbnail_image
from app.services.ocr_service import extract_text_from_image
from app.services.session_service import (
    get_or_create_exam_session,
    save_session_answer,
    record_proctor_event,
    finalize_and_grade_session,
    check_session_heartbeat
)

router = APIRouter(tags=["Exam Sessions"])

@router.post("/exams/{exam_id}/start-session", response_model=SessionStartResponse)
def api_start_or_resume_session(
    exam_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_student)
):
    """Initialize or resume an active exam session with server-authoritative timer."""
    return get_or_create_exam_session(db, exam_id, current_user)

@router.get("/sessions/{session_id}/heartbeat", response_model=SessionHeartbeatResponse)
def api_session_heartbeat(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_student)
):
    """Server-authoritative heartbeat check for remaining time and session active state."""
    return check_session_heartbeat(db, session_id=session_id, student=current_user)

@router.post("/sessions/{session_id}/save-answer", response_model=AnswerSaveResponse)
def api_save_answer(
    session_id: int,
    ans_in: AnswerSaveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_student)
):
    """Persist candidate's draft answer for a question in an active exam session."""
    resolved_text = ans_in.answer_text if ans_in.answer_text is not None else ans_in.text_answer
    ans = save_session_answer(
        db,
        session_id=session_id,
        student=current_user,
        question_id=ans_in.question_id,
        selected_option_ids=ans_in.selected_option_ids,
        answer_text=resolved_text,
        image_path=ans_in.image_path,
        is_marked_for_review=ans_in.is_marked_for_review
    )
    return AnswerSaveResponse(
        status="saved",
        question_id=ans.question_id,
        is_marked_for_review=bool(ans.is_marked_for_review),
        saved_at=ans.submitted_at
    )

@router.post("/sessions/{session_id}/upload-image", response_model=ImageUploadResponse)
def api_upload_session_image(
    session_id: int,
    question_id: int = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_student)
):
    """Upload a handwritten or diagram answer image, generate 200x200 thumbnail, run OCR, and persist."""
    session = db.query(ExamSession).filter(ExamSession.id == session_id).first()
    if not session or session.student_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exam session not found or access denied.")

    if session.status != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot upload image. Session status is {session.status}."
        )

    question = db.query(QuestionBank).filter(QuestionBank.id == question_id).first()
    if not question:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found.")

    if question.question_type != QuestionType.IMAGE_UPLOAD:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Question #{question_id} is of type {question.question_type.value}, not IMAGE_UPLOAD."
        )

    image_path, thumbnail_path = save_and_thumbnail_image(session_id, question_id, file)
    ocr_text = extract_text_from_image(image_path)

    now = datetime.now(timezone.utc)
    answer = db.query(Answer).filter(
        Answer.session_id == session_id,
        Answer.question_id == question_id
    ).first()

    if answer:
        answer.image_path = image_path
        answer.thumbnail_path = thumbnail_path
        answer.ocr_text = ocr_text
        answer.submitted_at = now
    else:
        answer = Answer(
            session_id=session_id,
            question_id=question_id,
            image_path=image_path,
            thumbnail_path=thumbnail_path,
            ocr_text=ocr_text,
            submitted_at=now
        )
        db.add(answer)

    db.commit()
    db.refresh(answer)

    return ImageUploadResponse(
        status="uploaded",
        session_id=session_id,
        question_id=question_id,
        image_path=image_path,
        thumbnail_path=thumbnail_path,
        ocr_text=ocr_text,
        uploaded_at=now
    )


@router.post("/sessions/{session_id}/proctor-event", response_model=ProctorEventActionResponse)
def api_log_proctor_event(
    session_id: int,
    event_in: ProctorEventCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_student)
):
    """Log visibility, focus, tab switch, or webcam events. Auto-submits on violation threshold."""
    return record_proctor_event(
        db,
        session_id=session_id,
        student=current_user,
        event_type=event_in.event_type,
        event_data=event_in.event_data,
        severity=event_in.severity
    )

@router.get("/sessions/{session_id}/proctor-events", response_model=List[ProctorEventResponse])
def api_get_session_proctor_events(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_examiner_or_admin)
):
    """Retrieve security and proctoring event log for a session (Examiner / Admin only)."""
    return (
        db.query(ProctorEvent)
        .filter(ProctorEvent.session_id == session_id)
        .order_by(ProctorEvent.created_at.asc())
        .all()
    )

@router.post("/sessions/{session_id}/submit", response_model=ExamSubmissionResult)
def api_submit_exam_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_student)
):
    """Finalize examination session, execute automatic scoring with negative marking, and return scorecard."""
    return finalize_and_grade_session(db, session_id=session_id, student=current_user)

@router.websocket("/ws/sessions/{session_id}/heartbeat")
async def websocket_session_heartbeat(websocket: WebSocket, session_id: int):
    """Bidirectional WebSocket heartbeat endpoint for continuous timer, state, and proctoring sync."""
    await websocket.accept()
    from app.services.session_service import VIOLATION_EVENT_TYPES, ensure_utc
    db = SessionLocal()
    try:
        while True:
            # Client sends periodic ping (e.g. every 10s)
            try:
                msg = await websocket.receive_text()
            except Exception:
                break

            session = db.query(ExamSession).filter(ExamSession.id == session_id).first()
            if not session:
                await websocket.send_json({"error": "Session not found", "status": "NOT_FOUND"})
                break

            now = datetime.now(timezone.utc)
            exam = session.exam
            started_at = ensure_utc(session.started_at)
            deadline = min(started_at + timedelta(minutes=exam.duration_minutes), ensure_utc(exam.end_time))
            remaining = max(0, int((deadline - now).total_seconds()))

            violation_count = (
                db.query(ProctorEvent)
                .filter(
                    ProctorEvent.session_id == session_id,
                    ProctorEvent.event_type.in_(VIOLATION_EVENT_TYPES),
                    ProctorEvent.severity.in_(["MEDIUM", "HIGH", "CRITICAL"])
                )
                .count()
            )

            if remaining <= 0 and session.status == "ACTIVE":
                try:
                    finalize_and_grade_session(db, session_id, session.student, auto_reason="TIME_EXPIRED")
                    db.refresh(session)
                except Exception:
                    pass

            result = db.query(Result).filter(Result.session_id == session_id).first()

            response = {
                "session_id": session.id,
                "status": session.status,
                "remaining_seconds": remaining,
                "violation_count": violation_count,
                "suspicion_score": session.suspicion_score or 0.0,
                "auto_submitted": session.status != "ACTIVE",
                "result_id": result.id if result else None
            }
            await websocket.send_json(response)
    except WebSocketDisconnect:
        # Network disconnect does NOT count as cheating
        pass
    except Exception:
        pass
    finally:
        db.close()

