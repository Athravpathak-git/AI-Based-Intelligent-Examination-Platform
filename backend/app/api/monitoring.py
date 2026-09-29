import logging
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any, Set
from fastapi import APIRouter, Depends, HTTPException, Query, status, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from pydantic import BaseModel, ConfigDict

from app.core.dependencies import get_db, require_examiner_or_admin
from app.core.security import decode_access_token
from app.db.database import SessionLocal
from app.models.user import User, UserRole
from app.models.exam import Exam
from app.models.session import ExamSession, Answer
from app.models.proctor import ProctorEvent
from app.services.session_service import ensure_utc, SUSPICION_WEIGHTS
from app.services.monitoring_signaling import signaling_manager

logger = logging.getLogger("monitoring")

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
    is_streaming_live: bool = False

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
        elif sess.status == "CAMERA_PAUSED":
            pause_event = (
                db.query(ProctorEvent)
                .filter(ProctorEvent.session_id == sess.id, ProctorEvent.event_type == "EXAM_CAMERA_PAUSED")
                .order_by(ProctorEvent.id.desc())
                .first()
            )
            pause_time = ensure_utc(pause_event.created_at) if pause_event else now
            remaining = max(0, int((deadline - pause_time).total_seconds()))
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
        camera_active = sess.status != "CAMERA_PAUSED"
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
            cam_events = [e for e in events if e.event_type in ["WEBCAM_DISCONNECTED", "WEBCAM_CONNECTED", "CAMERA_DISCONNECTED", "CAMERA_RECONNECTED", "EXAM_CAMERA_PAUSED", "EXAM_CAMERA_RESUMED"]]
            if sess.status == "CAMERA_PAUSED" or (cam_events and cam_events[0].event_type in ["WEBCAM_DISCONNECTED", "CAMERA_DISCONNECTED", "EXAM_CAMERA_PAUSED"]):
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
            latest_event=latest_event_dict,
            is_streaming_live=sess.id in signaling_manager.candidates
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
        latest_event=formatted_events[0] if formatted_events else None,
        is_streaming_live=sess.id in signaling_manager.candidates
    )

    return LiveSessionDetailResponse(
        session=session_item,
        events=formatted_events,
        answers_count=len(answers)
    )

# ---------------------------------------------------------------------------
# Real-Time WebRTC Video Signaling & Monitoring Telemetry WebSockets
# ---------------------------------------------------------------------------

@router.websocket("/ws/candidate/{session_id}")
async def websocket_candidate_monitoring(
    websocket: WebSocket,
    session_id: int,
    token: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Candidate WebRTC signaling channel:
    - Candidate publishes their live webcam stream tracks to requesting examiners/admins.
    - Strictly prevents the candidate from subscribing to or viewing other candidates' streams.
    - Emits real-time proctoring telemetry updates (face detection, camera status).
    """
    # Fallback to query parameter or first-frame auth
    auth_token = token
    if not auth_token:
        # Check subprotocols or headers
        auth_header = websocket.headers.get("authorization")
        if auth_header and auth_header.startswith("Bearer "):
            auth_token = auth_header.split(" ")[1]

    if not auth_token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    try:
        payload = decode_access_token(auth_token)
        user_id = payload.get("sub")
        if not user_id:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
    except Exception:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user or not user.is_active or user.role != UserRole.STUDENT:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    session = db.query(ExamSession).filter(ExamSession.id == session_id).first()
    if not session or session.student_id != user.id or session.status not in ["ACTIVE", "CAMERA_PAUSED"]:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    exam_id = session.exam_id
    student_name = user.name

    await websocket.accept()
    conn = await signaling_manager.register_candidate(
        session_id=session_id,
        student_id=int(user_id),
        student_name=student_name,
        exam_id=exam_id,
        websocket=websocket
    )
    if session.status == "CAMERA_PAUSED":
        conn.camera_active = False

    try:
        while True:
            msg = await websocket.receive_json()
            mtype = msg.get("type")

            if mtype == "ping":
                await websocket.send_json({"type": "pong"})

            elif mtype == "camera_status":
                active = bool(msg.get("active", True))
                conn.camera_active = active
                await signaling_manager.broadcast_candidate_status(
                    session_id=session_id,
                    status_type="CANDIDATE_CAMERA_UPDATE",
                    data={"session_id": session_id, "camera_active": active}
                )

            elif mtype == "proctor_status":
                face_detected = bool(msg.get("face_detected", True))
                multiple_faces = bool(msg.get("multiple_faces", False))
                conn.face_detected = face_detected
                conn.multiple_faces = multiple_faces
                await signaling_manager.broadcast_candidate_status(
                    session_id=session_id,
                    status_type="CANDIDATE_PROCTOR_UPDATE",
                    data={
                        "session_id": session_id,
                        "face_detected": face_detected,
                        "multiple_faces": multiple_faces,
                        "tab_switch_count": msg.get("tab_switch_count"),
                        "total_violations": msg.get("total_violations")
                    }
                )

            elif mtype in ["offer", "answer", "ice_candidate"]:
                target_user_id = msg.get("target_user_id")
                if target_user_id:
                    forward_msg = {
                        "type": mtype,
                        "session_id": session_id,
                        "sdp": msg.get("sdp"),
                        "candidate": msg.get("candidate")
                    }
                    await signaling_manager.send_to_examiner(int(target_user_id), forward_msg)

    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.warning(f"Candidate websocket connection closed for session {session_id}: {e}")
    finally:
        await signaling_manager.disconnect_candidate(session_id)


@router.websocket("/ws/examiner")
async def websocket_examiner_monitoring(
    websocket: WebSocket,
    token: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Examiner/Admin WebRTC monitoring channel:
    - Receives live telemetry events for active candidates.
    - Initiates WebRTC live video streams for candidates in the monitoring grid.
    - Strictly enforces RBAC: Examiner only sees their own exams; Admin sees all exams.
    """
    auth_token = token
    if not auth_token:
        auth_header = websocket.headers.get("authorization")
        if auth_header and auth_header.startswith("Bearer "):
            auth_token = auth_header.split(" ")[1]

    if not auth_token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    try:
        payload = decode_access_token(auth_token)
        user_id = payload.get("sub")
        if not user_id:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
    except Exception:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user or not user.is_active or user.role not in [UserRole.EXAMINER, UserRole.ADMIN]:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    user_role = user.role.value
    user_name = user.name
    created_exam_ids: Optional[Set[int]] = None
    if user.role == UserRole.EXAMINER:
        created_exams = db.query(Exam.id).filter(Exam.created_by == user.id).all()
        created_exam_ids = {e[0] for e in created_exams}

    await websocket.accept()
    await signaling_manager.register_examiner(
        user_id=int(user_id),
        user_name=user_name,
        role=user_role,
        created_exam_ids=created_exam_ids,
        websocket=websocket
    )

    try:
        while True:
            msg = await websocket.receive_json()
            mtype = msg.get("type")

            if mtype == "ping":
                await websocket.send_json({"type": "pong"})

            elif mtype == "request_stream":
                session_id = msg.get("session_id")
                if session_id:
                    cand = signaling_manager.candidates.get(int(session_id))
                    if cand:
                        if user_role == "ADMIN" or (created_exam_ids is not None and cand.exam_id in created_exam_ids):
                            await signaling_manager.send_to_candidate(int(session_id), {
                                "type": "stream_requested",
                                "examiner_user_id": int(user_id),
                                "examiner_name": user_name
                            })
                        else:
                            await websocket.send_json({
                                "type": "ERROR",
                                "message": "Unauthorized to view stream for this exam session."
                            })
                    else:
                        await websocket.send_json({
                            "type": "CANDIDATE_OFFLINE",
                            "session_id": session_id
                        })

            elif mtype in ["offer", "answer", "ice_candidate", "close_stream"]:
                session_id = msg.get("session_id")
                if session_id:
                    cand = signaling_manager.candidates.get(int(session_id))
                    if cand:
                        if user_role == "ADMIN" or (created_exam_ids is not None and cand.exam_id in created_exam_ids):
                            forward_msg = {
                                "type": mtype,
                                "examiner_user_id": int(user_id),
                                "examiner_name": user_name,
                                "sdp": msg.get("sdp"),
                                "candidate": msg.get("candidate")
                            }
                            await signaling_manager.send_to_candidate(int(session_id), forward_msg)

    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.warning(f"Examiner websocket closed for user {user_id}: {e}")
    finally:
        await signaling_manager.disconnect_examiner(int(user_id))

