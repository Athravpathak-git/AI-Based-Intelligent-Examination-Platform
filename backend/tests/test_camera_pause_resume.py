import uuid
from datetime import datetime, timezone, timedelta
import pytest
from fastapi import status
from app.models.session import ExamSession
from app.models.proctor import ProctorEvent

def seed_test_questions(client, headers):
    client.post(
        "/api/questions",
        json={
            "subject": "Physics",
            "question_text": f"Define velocity {uuid.uuid4().hex[:4]}",
            "question_type": "SHORT_ANSWER",
            "difficulty": "EASY",
            "marks": 5.0
        },
        headers=headers
    )

def test_camera_pause_and_resume_lifecycle(client, test_examiner, examiner_auth_headers, db_session):
    """
    Test camera disconnect pause and resume workflow:
    1. Create an exam and register student
    2. Start exam session
    3. Pause camera -> status CAMERA_PAUSED, events logged, timer frozen
    4. Heartbeat reflects CAMERA_PAUSED and frozen timer
    5. Save answer while paused -> rejected
    6. Resume camera -> status ACTIVE, events logged, timer resumed
    """
    seed_test_questions(client, examiner_auth_headers)

    # 1. Create student
    stu_email = f"stu_cam_{uuid.uuid4().hex[:8]}@test.com"
    client.post(
        "/api/auth/register",
        json={"name": "Cam Student", "email": stu_email, "password": "password123", "role": "STUDENT"}
    )
    login_res = client.post("/api/auth/login", json={"email": stu_email, "password": "password123"})
    stu_token = login_res.json()["access_token"]
    stu_headers = {"Authorization": f"Bearer {stu_token}"}

    # 2. Create exam
    now = datetime.now(timezone.utc)
    exam_payload = {
        "name": f"Camera Proctoring Test {uuid.uuid4().hex[:4]}",
        "subject": "Physics",
        "duration_minutes": 45,
        "total_questions": 1,
        "maximum_marks": 5.0,
        "start_time": (now - timedelta(minutes=5)).isoformat(),
        "end_time": (now + timedelta(hours=2)).isoformat(),
        "webcam_monitoring_enabled": True,
        "maximum_tab_switch_warnings": 3
    }
    exam_res = client.post("/api/exams", json=exam_payload, headers=examiner_auth_headers)
    assert exam_res.status_code == status.HTTP_201_CREATED
    exam_id = exam_res.json()["id"]

    # Register student for exam
    reg_exam_res = client.post(f"/api/exams/{exam_id}/register", headers=stu_headers)
    assert reg_exam_res.status_code in [status.HTTP_200_OK, status.HTTP_201_CREATED]

    # 3. Start exam session
    start_res = client.post(f"/api/exams/{exam_id}/start-session", headers=stu_headers)
    assert start_res.status_code == status.HTTP_200_OK
    session_data = start_res.json()
    session_id = session_data["session_id"]
    initial_remaining = session_data["remaining_seconds"]
    assert session_data["status"] == "ACTIVE"

    # 4. Pause camera
    pause_res = client.post(f"/api/sessions/{session_id}/pause-camera", headers=stu_headers)
    assert pause_res.status_code == status.HTTP_200_OK
    pause_data = pause_res.json()
    assert pause_data["status"] == "CAMERA_PAUSED"
    assert pause_data["remaining_seconds"] <= initial_remaining

    # Verify session in DB
    sess_db = db_session.query(ExamSession).filter(ExamSession.id == session_id).first()
    assert sess_db.status == "CAMERA_PAUSED"

    # Verify proctor events
    events = (
        db_session.query(ProctorEvent)
        .filter(ProctorEvent.session_id == session_id)
        .order_by(ProctorEvent.id.desc())
        .all()
    )
    event_types = [e.event_type for e in events]
    assert "CAMERA_DISCONNECTED" in event_types
    assert "EXAM_CAMERA_PAUSED" in event_types

    # 5. Check heartbeat while paused
    hb_res = client.get(f"/api/sessions/{session_id}/heartbeat", headers=stu_headers)
    assert hb_res.status_code == status.HTTP_200_OK
    hb_data = hb_res.json()
    assert hb_data["status"] == "CAMERA_PAUSED"
    assert hb_data["remaining_seconds"] == pause_data["remaining_seconds"]

    # 6. Attempt to save answer while paused -> rejected
    first_q_id = session_data["questions"][0]["id"]
    save_res = client.post(
        f"/api/sessions/{session_id}/save-answer",
        json={"question_id": first_q_id, "text_answer": "Velocity is speed in a direction"},
        headers=stu_headers
    )
    assert save_res.status_code == status.HTTP_400_BAD_REQUEST

    # 7. Resume camera
    resume_res = client.post(f"/api/sessions/{session_id}/resume-camera", headers=stu_headers)
    assert resume_res.status_code == status.HTTP_200_OK
    resume_data = resume_res.json()
    assert resume_data["status"] == "ACTIVE"
    # Ensure remaining time is preserved (within a couple seconds of paused time)
    assert resume_data["remaining_seconds"] >= pause_data["remaining_seconds"] - 5

    # Verify resume events in DB
    events_after = (
        db_session.query(ProctorEvent)
        .filter(ProctorEvent.session_id == session_id)
        .order_by(ProctorEvent.id.desc())
        .all()
    )
    after_types = [e.event_type for e in events_after]
    assert "CAMERA_RECONNECTED" in after_types
    assert "EXAM_CAMERA_RESUMED" in after_types
