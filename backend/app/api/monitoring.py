from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, ConfigDict

from app.core.dependencies import get_db, require_examiner_or_admin
from app.models.user import User, UserRole
from app.models.exam import Exam
from app.models.session import ExamSession, Answer
from app.models.proctor import ProctorEvent
from app.services.session_service import ensure_utc, SUSPICION_WEIGHTS

router = APIRouter(prefix="/monitoring", tags=["Live Monitoring"])

class LiveCandidateSessionItem(BaseModel):
    session_id: int
    exam_id: int
    exam_name: str
    subject: str
    student_id: int
    student_name: str
    student_email: str
    registration_number: Optional[str] = None
    status: str
    started_at: datetime
    submitted_at: Optional[datetime] = None
    remaining_seconds: int
    total_questions: int
    answered_count: int
    marked_for_review_count: int
    camera_active: bool
    face_detected: bool
    tab_switch_count: int
    fullscreen_exit_count: int
    face_absent_count: int
    multiple_faces_count: int
    off_screen_gaze_count: int
    total_violations: int
    suspicion_score: float
    last_heartbeat_at: Optional[datetime] = None
    latest_event: Optional[Dict[str, Any]] = None

    model_config = ConfigDict(from_attributes=True)

class LiveMonitoringSummary(BaseModel):
    total_active_candidates: int
    total_completed: int
    total_violations_recorded: int
    total_flagged_suspicious: int
    sessions: List[LiveCandidateSessionItem]

class LiveSessionDetailResponse(BaseModel):
    session: LiveCandidateSessionItem
    events: List[Dict[str, Any]]
    answers_count: int

@router.get("/live", response_model=LiveMonitoringSummary)
def get_live_monitoring(
    exam_id: Optional[int] = Query(None, description="Filter by Exam ID"),
    status_filter: Optional[str] = Query(None, description="Filter by status (ACTIVE, SUBMITTED, etc.)"),
    search: Optional[str] = Query(None, description="Search candidate name or reg number"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_examiner_or_admin)
):
    """Retrieve real-time candidate session telemetry and proctoring metrics for active & recent exams."""
    now = datetime.now(timezone.utc)

    # Base query for exam sessions
    query = db.query(ExamSession).join(Exam, ExamSession.exam_id == Exam.id).join(User, ExamSession.student_id == User.id)

    # Scoping: Examiner only sees exams they created (unless Admin)
    if current_user.role == UserRole.EXAMINER:
        query = query.filter(Exam.created_by == current_user.id)

    if exam_id:
        query = query.filter(ExamSession.exam_id == exam_id)

    if status_filter:
        query = query.filter(ExamSession.status == status_filter)

    all_sessions = query.order_by(ExamSession.id.desc()).all()

    session_items: List[LiveCandidateSessionItem] = []
    total_active = 0
    total_completed = 0
    total_violations_recorded = 0
    total_suspicious = 0

    for sess in all_sessions:
        student = sess.student
        exam = sess.exam

        # Search filter
        if search:
            s_lower = search.lower().strip()
            name_match = student.name and s_lower in student.name.lower()
            email_match = student.email and s_lower in student.email.lower()
            reg_match = student.registration_number and s_lower in student.registration_number.lower()
            if not (name_match or email_match or reg_match):
                continue

        # Remaining seconds calculation
        started = ensure_utc(sess.started_at)
        duration_delta = timedelta(minutes=exam.duration_minutes)
        exam_end = ensure_utc(exam.end_time)
        deadline = min(started + duration_delta, exam_end)

        if sess.status == "ACTIVE":
            remaining = max(0, int((deadline - now).total_seconds()))
            total_active += 1
        else:
            remaining = 0
            total_completed += 1

        # Fetch proctor events for this session
        events = (
            db.query(ProctorEvent)
            .filter(ProctorEvent.session_id == sess.id)
            .order_by(ProctorEvent.id.desc())
            .all()
        )

        tab_switches = sum(1 for e in events if e.event_type == "TAB_SWITCH")
        fs_exits = sum(1 for e in events if e.event_type == "FULLSCREEN_EXIT")
        face_absents = sum(1 for e in events if e.event_type == "FACE_ABSENT")
        multi_faces = sum(1 for e in events if e.event_type in ["MULTIPLE_FACES_DETECTED", "MULTIPLE_FACES"])
        gaze_violations = sum(1 for e in events if e.event_type == "OFF_SCREEN_GAZE")

        total_session_violations = tab_switches + fs_exits + face_absents + multi_faces + gaze_violations
        total_violations_recorded += total_session_violations

        # Calculate / use suspicion score
        if sess.suspicion_score and sess.suspicion_score > 0:
            score = sess.suspicion_score
        else:
            raw_score = sum(SUSPICION_WEIGHTS.get(e.event_type, 0.0) for e in events)
            score = min(100.0, round(raw_score, 2))

        if score >= 30.0 or sess.status == "SUBMITTED_VIOLATION":
            total_suspicious += 1

        # Camera & Face detection telemetry
        camera_active = True
        face_detected = True
        last_heartbeat = None
        latest_event_dict = None

        if events:
            latest = events[0]
            latest_event_dict = {
                "id": latest.id,
                "event_type": latest.event_type,
                "severity": latest.severity,
                "created_at": latest.created_at.isoformat() if latest.created_at else None,
                "event_data": latest.event_data
            }
            last_heartbeat = latest.created_at

            # Check if camera was disconnected
            cam_events = [e for e in events if e.event_type in ["WEBCAM_DISCONNECTED", "WEBCAM_CONNECTED"]]
            if cam_events and cam_events[0].event_type == "WEBCAM_DISCONNECTED":
                camera_active = False

            # Check latest face event
            face_events = [e for e in events if e.event_type in ["FACE_ABSENT", "MULTIPLE_FACES_DETECTED", "MULTIPLE_FACES", "FACE_DETECTED"]]
            if face_events and face_events[0].event_type in ["FACE_ABSENT", "MULTIPLE_FACES_DETECTED", "MULTIPLE_FACES"]:
                face_detected = False

        # Answers telemetry
        answers = db.query(Answer).filter(Answer.session_id == sess.id).all()
        answered_cnt = sum(
            1 for a in answers
            if (a.selected_option_ids and len(a.selected_option_ids) > 0)
            or (a.answer_text and a.answer_text.strip())
            or (a.image_path)
        )
        marked_cnt = sum(1 for a in answers if a.is_marked_for_review)

        item = LiveCandidateSessionItem(
            session_id=sess.id,
            exam_id=exam.id,
            exam_name=exam.name,
            subject=exam.subject,
            student_id=student.id,
            student_name=student.name,
            student_email=student.email,
            registration_number=student.registration_number,
            status=sess.status,
            started_at=sess.started_at,
            submitted_at=sess.submitted_at,
            remaining_seconds=remaining,
            total_questions=exam.total_questions,
            answered_count=answered_cnt,
            marked_for_review_count=marked_cnt,
            camera_active=camera_active,
            face_detected=face_detected,
            tab_switch_count=tab_switches,
            fullscreen_exit_count=fs_exits,
            face_absent_count=face_absents,
            multiple_faces_count=multi_faces,
            off_screen_gaze_count=gaze_violations,
            total_violations=total_session_violations,
            suspicion_score=score,
            last_heartbeat_at=last_heartbeat,
            latest_event=latest_event_dict
        )
        session_items.append(item)

    return LiveMonitoringSummary(
        total_active_candidates=total_active,
        total_completed=total_completed,
        total_violations_recorded=total_violations_recorded,
        total_flagged_suspicious=total_suspicious,
        sessions=session_items
    )

@router.get("/session/{session_id}", response_model=LiveSessionDetailResponse)
def get_session_monitoring_detail(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_examiner_or_admin)
):
    """Retrieve itemized telemetry and full proctoring event audit trail for an individual candidate session."""
    now = datetime.now(timezone.utc)
    sess = db.query(ExamSession).filter(ExamSession.id == session_id).first()
    if not sess:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exam session not found.")

    exam = sess.exam
    student = sess.student

    if current_user.role == UserRole.EXAMINER and exam.created_by != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this session.")

    started = ensure_utc(sess.started_at)
    duration_delta = timedelta(minutes=exam.duration_minutes)
    exam_end = ensure_utc(exam.end_time)
    deadline = min(started + duration_delta, exam_end)
    remaining = max(0, int((deadline - now).total_seconds())) if sess.status == "ACTIVE" else 0

    events = (
        db.query(ProctorEvent)
        .filter(ProctorEvent.session_id == sess.id)
        .order_by(ProctorEvent.id.desc())
        .all()
    )

    tab_switches = sum(1 for e in events if e.event_type == "TAB_SWITCH")
    fs_exits = sum(1 for e in events if e.event_type == "FULLSCREEN_EXIT")
    face_absents = sum(1 for e in events if e.event_type == "FACE_ABSENT")
    multi_faces = sum(1 for e in events if e.event_type in ["MULTIPLE_FACES_DETECTED", "MULTIPLE_FACES"])
    gaze_violations = sum(1 for e in events if e.event_type == "OFF_SCREEN_GAZE")
    total_violations = tab_switches + fs_exits + face_absents + multi_faces + gaze_violations

    raw_score = sum(SUSPICION_WEIGHTS.get(e.event_type, 0.0) for e in events)
    score = min(100.0, round(raw_score, 2))

    camera_active = True
    face_detected = True
    cam_events = [e for e in events if e.event_type in ["WEBCAM_DISCONNECTED", "WEBCAM_CONNECTED"]]
    if cam_events and cam_events[0].event_type == "WEBCAM_DISCONNECTED":
        camera_active = False

    face_events = [e for e in events if e.event_type in ["FACE_ABSENT", "MULTIPLE_FACES_DETECTED", "MULTIPLE_FACES", "FACE_DETECTED"]]
    if face_events and face_events[0].event_type in ["FACE_ABSENT", "MULTIPLE_FACES_DETECTED", "MULTIPLE_FACES"]:
        face_detected = False

    answers = db.query(Answer).filter(Answer.session_id == sess.id).all()
    answered_cnt = sum(
        1 for a in answers
        if (a.selected_option_ids and len(a.selected_option_ids) > 0)
        or (a.answer_text and a.answer_text.strip())
        or (a.image_path)
    )
    marked_cnt = sum(1 for a in answers if a.is_marked_for_review)

    formatted_events = [
        {
            "id": e.id,
            "event_type": e.event_type,
            "severity": e.severity,
            "created_at": e.created_at.isoformat() if e.created_at else None,
            "event_data": e.event_data
        }
        for e in events
    ]

    session_item = LiveCandidateSessionItem(
        session_id=sess.id,
        exam_id=exam.id,
        exam_name=exam.name,
        subject=exam.subject,
        student_id=student.id,
        student_name=student.name,
        student_email=student.email,
        registration_number=student.registration_number,
        status=sess.status,
        started_at=sess.started_at,
        submitted_at=sess.submitted_at,
        remaining_seconds=remaining,
        total_questions=exam.total_questions,
        answered_count=answered_cnt,
        marked_for_review_count=marked_cnt,
        camera_active=camera_active,
        face_detected=face_detected,
        tab_switch_count=tab_switches,
        fullscreen_exit_count=fs_exits,
        face_absent_count=face_absents,
        multiple_faces_count=multi_faces,
        off_screen_gaze_count=gaze_violations,
        total_violations=total_violations,
        suspicion_score=score,
        last_heartbeat_at=events[0].created_at if events else None,
        latest_event=formatted_events[0] if formatted_events else None
    )

    return LiveSessionDetailResponse(
        session=session_item,
        events=formatted_events,
        answers_count=len(answers)
    )
