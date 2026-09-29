import pytest
import uuid
from datetime import datetime, timezone, timedelta
from starlette.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

from app.main import app
from app.core.security import create_access_token
from app.models.user import User, UserRole
from app.models.exam import Exam
from app.models.session import ExamSession
from app.models.proctor import ProctorEvent
from app.services.monitoring_signaling import signaling_manager


def _setup_exam_environment(db_session, max_warnings: int = 3):
    """Helper to set up student, examiner, exam, and active session."""
    student = User(
        name="Face Test Student",
        email=f"face.student.{uuid.uuid4().hex[:6]}@example.com",
        password_hash="fakehash",
        role=UserRole.STUDENT,
        is_active=True
    )
    examiner = User(
        name="Face Test Examiner",
        email=f"face.examiner.{uuid.uuid4().hex[:6]}@example.com",
        password_hash="fakehash",
        role=UserRole.EXAMINER,
        is_active=True
    )
    db_session.add_all([student, examiner])
    db_session.commit()
    db_session.refresh(student)
    db_session.refresh(examiner)

    now = datetime.now(timezone.utc)
    exam = Exam(
        name="Face & Telemetry Proctoring Exam",
        subject="AI Ethics",
        duration_minutes=60,
        start_time=now - timedelta(minutes=5),
        end_time=now + timedelta(hours=2),
        total_questions=2,
        maximum_marks=100.0,
        maximum_tab_switch_warnings=max_warnings,
        webcam_monitoring_enabled=True,
        created_by=examiner.id
    )
    db_session.add(exam)

    from app.models.question import QuestionBank, QuestionType
    q1 = QuestionBank(
        subject="AI Ethics",
        question_text="What is AI ethics?",
        question_type=QuestionType.SHORT_ANSWER,
        difficulty="EASY",
        marks=50.0,
        created_by=examiner.id
    )
    q2 = QuestionBank(
        subject="AI Ethics",
        question_text="Why is proctoring necessary?",
        question_type=QuestionType.SHORT_ANSWER,
        difficulty="EASY",
        marks=50.0,
        created_by=examiner.id
    )
    db_session.add_all([q1, q2])
    db_session.commit()
    db_session.refresh(exam)

    session = ExamSession(
        exam_id=exam.id,
        student_id=student.id,
        session_token=uuid.uuid4().hex,
        status="ACTIVE",
        started_at=now - timedelta(minutes=2)
    )
    db_session.add(session)
    db_session.commit()
    db_session.refresh(session)

    student_token = create_access_token({"sub": str(student.id), "role": student.role.value})
    examiner_token = create_access_token({"sub": str(examiner.id), "role": examiner.role.value})

    return {
        "student": student,
        "examiner": examiner,
        "exam": exam,
        "session": session,
        "student_token": student_token,
        "examiner_token": examiner_token
    }


def test_face_absent_violation_and_suspicion_score(client: TestClient, db_session):
    """Test recording FACE_ABSENT event, verifying warning issuance and suspicion score calculation."""
    env = _setup_exam_environment(db_session)
    session = env["session"]
    headers = {"Authorization": f"Bearer {env['student_token']}"}

    payload = {
        "event_type": "FACE_ABSENT",
        "severity": "HIGH",
        "event_data": {"absent_duration_seconds": 6.2, "faces_detected": 0}
    }
    resp = client.post(f"/sessions/{session.id}/proctor-event", json=payload, headers=headers)
    assert resp.status_code == 200
    data = resp.json()

    assert data["event_type"] == "FACE_ABSENT"
    assert data["warning_issued"] is True
    assert data["current_warnings"] == 1
    assert data["auto_submitted"] is False
    assert data["session_status"] == "ACTIVE"

    # Verify session suspicion score in DB
    db_session.refresh(session)
    assert session.suspicion_score == 20.0  # FACE_ABSENT weight is 20.0


def test_multiple_faces_detected_violation(client: TestClient, db_session):
    """Test recording MULTIPLE_FACES_DETECTED event and suspicion score weighting."""
    env = _setup_exam_environment(db_session)
    session = env["session"]
    headers = {"Authorization": f"Bearer {env['student_token']}"}

    payload = {
        "event_type": "MULTIPLE_FACES_DETECTED",
        "severity": "HIGH",
        "event_data": {"faces_detected": 2}
    }
    resp = client.post(f"/sessions/{session.id}/proctor-event", json=payload, headers=headers)
    assert resp.status_code == 200
    data = resp.json()

    assert data["event_type"] == "MULTIPLE_FACES_DETECTED"
    assert data["warning_issued"] is True
    assert data["current_warnings"] == 1

    # Verify session suspicion score in DB
    db_session.refresh(session)
    assert session.suspicion_score == 25.0  # MULTIPLE_FACES_DETECTED weight is 25.0


def test_auto_submit_on_exceeding_violation_threshold(client: TestClient, db_session):
    """Test that reaching > maximum_tab_switch_warnings automatically finalizes the exam session."""
    env = _setup_exam_environment(db_session, max_warnings=2)
    session = env["session"]
    headers = {"Authorization": f"Bearer {env['student_token']}"}

    # Violation 1: FACE_ABSENT -> Warning 1, ACTIVE
    r1 = client.post(
        f"/sessions/{session.id}/proctor-event",
        json={"event_type": "FACE_ABSENT", "severity": "HIGH", "event_data": {}},
        headers=headers
    )
    assert r1.status_code == 200
    d1 = r1.json()
    assert d1["current_warnings"] == 1
    assert d1["auto_submitted"] is False

    # Violation 2: MULTIPLE_FACES_DETECTED -> Warning 2, ACTIVE
    r2 = client.post(
        f"/sessions/{session.id}/proctor-event",
        json={"event_type": "MULTIPLE_FACES_DETECTED", "severity": "HIGH", "event_data": {}},
        headers=headers
    )
    assert r2.status_code == 200
    d2 = r2.json()
    assert d2["current_warnings"] == 2
    assert d2["auto_submitted"] is False

    # Violation 3: Another FACE_ABSENT -> Exceeds max 2 -> AUTO SUBMIT!
    r3 = client.post(
        f"/sessions/{session.id}/proctor-event",
        json={"event_type": "FACE_ABSENT", "severity": "HIGH", "event_data": {}},
        headers=headers
    )
    assert r3.status_code == 200
    d3 = r3.json()
    assert d3["current_warnings"] == 3
    assert d3["auto_submitted"] is True
    assert d3["session_status"] == "SUBMITTED_VIOLATION"

    # Verify DB status
    db_session.refresh(session)
    assert session.status == "SUBMITTED_VIOLATION"

    # Subsequent event should be idempotent
    r4 = client.post(
        f"/sessions/{session.id}/proctor-event",
        json={"event_type": "TAB_SWITCH", "severity": "MEDIUM", "event_data": {}},
        headers=headers
    )
    assert r4.status_code == 200
    d4 = r4.json()
    assert d4["auto_submitted"] is True
    assert d4["session_status"] == "SUBMITTED_VIOLATION"
    assert "already finalized" in d4["message"]


def test_browser_event_deduplication_policy(client: TestClient, db_session):
    """Test that rapid companion events (TAB_SWITCH + WINDOW_BLUR within 1.5s) are deduplicated."""
    env = _setup_exam_environment(db_session, max_warnings=3)
    session = env["session"]
    headers = {"Authorization": f"Bearer {env['student_token']}"}

    # First event: TAB_SWITCH
    r1 = client.post(
        f"/sessions/{session.id}/proctor-event",
        json={"event_type": "TAB_SWITCH", "severity": "MEDIUM", "event_data": {}},
        headers=headers
    )
    assert r1.status_code == 200
    assert r1.json()["current_warnings"] == 1

    # Second event arriving immediately: WINDOW_BLUR
    r2 = client.post(
        f"/sessions/{session.id}/proctor-event",
        json={"event_type": "WINDOW_BLUR", "severity": "MEDIUM", "event_data": {}},
        headers=headers
    )
    assert r2.status_code == 200
    # Because it is within 1.5s of TAB_SWITCH, it is treated as a duplicate (severity downgraded to LOW)
    # and current_warnings must remain 1
    assert r2.json()["current_warnings"] == 1


def test_real_time_face_telemetry_broadcast(client: TestClient, db_session):
    """Test candidate proctor status broadcast to examiner WebSocket channel."""
    env = _setup_exam_environment(db_session)
    session = env["session"]
    student_token = env["student_token"]
    examiner_token = env["examiner_token"]

    with client.websocket_connect(f"/monitoring/ws/candidate/{session.id}?token={student_token}") as cand_ws:
        with client.websocket_connect(f"/monitoring/ws/examiner?token={examiner_token}") as exam_ws:
            # Drain initial candidates list
            init_msg = exam_ws.receive_json()
            assert init_msg["type"] == "INITIAL_ONLINE_CANDIDATES"

            # Candidate transmits real-time face absence and multi-face telemetry
            cand_ws.send_json({
                "type": "proctor_status",
                "face_detected": False,
                "multiple_faces": True,
                "tab_switch_count": 2,
                "total_violations": 3
            })

            # Examiner receives CANDIDATE_PROCTOR_UPDATE
            exam_msg = exam_ws.receive_json()
            assert exam_msg["type"] == "CANDIDATE_PROCTOR_UPDATE"
            assert exam_msg["session_id"] == session.id
            assert exam_msg["data"]["face_detected"] is False
            assert exam_msg["data"]["multiple_faces"] is True
            assert exam_msg["data"]["tab_switch_count"] == 2

            # Candidate transmits camera off update
            cand_ws.send_json({
                "type": "camera_status",
                "active": False
            })

            # Examiner receives CANDIDATE_CAMERA_UPDATE
            cam_msg = exam_ws.receive_json()
            assert cam_msg["type"] == "CANDIDATE_CAMERA_UPDATE"
            assert cam_msg["session_id"] == session.id
            assert cam_msg["data"]["camera_active"] is False


def test_websocket_rbac_and_isolation(client: TestClient, db_session):
    """Test RBAC security enforcement for WebSocket endpoints."""
    env = _setup_exam_environment(db_session)
    session = env["session"]
    student_token = env["student_token"]
    examiner_token = env["examiner_token"]

    # 1. Other student cannot connect to candidate channel of a different student
    other_student = User(
        name="Intruder Student",
        email=f"intruder.{uuid.uuid4().hex[:6]}@example.com",
        password_hash="fakehash",
        role=UserRole.STUDENT,
        is_active=True
    )
    db_session.add(other_student)
    db_session.commit()
    db_session.refresh(other_student)
    intruder_token = create_access_token({"sub": str(other_student.id), "role": other_student.role.value})

    with pytest.raises(WebSocketDisconnect) as exc_info:
        with client.websocket_connect(f"/monitoring/ws/candidate/{session.id}?token={intruder_token}"):
            pass
    assert exc_info.value.code == 1008  # Policy violation

    # 2. Student cannot connect to examiner endpoint
    with pytest.raises(WebSocketDisconnect) as exc_info:
        with client.websocket_connect(f"/monitoring/ws/examiner?token={student_token}"):
            pass
    assert exc_info.value.code == 1008  # Policy violation

    # 3. Examiner cannot connect without valid token
    with pytest.raises(WebSocketDisconnect) as exc_info:
        with client.websocket_connect("/monitoring/ws/examiner?token=invalid_token"):
            pass
    assert exc_info.value.code == 1008  # Policy violation
