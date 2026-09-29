import pytest
import uuid
from datetime import datetime, timedelta, timezone
from fastapi import status
from sqlalchemy.orm import Session
from app.models.user import User, UserRole
from app.models.exam import Exam
from app.models.session import ExamSession, Answer
from app.models.proctor import ProctorEvent
from app.models.question import QuestionBank, Option, QuestionType, DifficultyLevel
from app.core.security import hash_password

def test_live_monitoring_endpoints(client, db_session: Session):
    """Verify Examiner and Admin real-time monitoring endpoints and RBAC."""
    suffix = uuid.uuid4().hex[:6]
    
    # 1. Create Examiner, Admin, and Student
    examiner = User(
        name="Dr. Examiner",
        email=f"examiner_{suffix}@test.com",
        password_hash=hash_password("Password123!"),
        role=UserRole.EXAMINER,
        is_active=True
    )
    admin = User(
        name="Admin User",
        email=f"admin_{suffix}@test.com",
        password_hash=hash_password("Password123!"),
        role=UserRole.ADMIN,
        is_active=True
    )
    student = User(
        name="Rohan Gupta",
        email=f"rohan_{suffix}@test.com",
        password_hash=hash_password("Password123!"),
        role=UserRole.STUDENT,
        registration_number=f"STU-{suffix.upper()}",
        is_active=True
    )
    db_session.add_all([examiner, admin, student])
    db_session.commit()
    db_session.refresh(examiner)
    db_session.refresh(admin)
    db_session.refresh(student)

    # Log in each user
    login_examiner = client.post("/api/auth/login", json={"email": examiner.email, "password": "Password123!"})
    examiner_token = login_examiner.json()["access_token"]
    examiner_headers = {"Authorization": f"Bearer {examiner_token}"}

    login_admin = client.post("/api/auth/login", json={"email": admin.email, "password": "Password123!"})
    admin_token = login_admin.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    login_student = client.post("/api/auth/login", json={"email": student.email, "password": "Password123!"})
    student_token = login_student.json()["access_token"]
    student_headers = {"Authorization": f"Bearer {student_token}"}

    # 2. Student cannot access monitoring (Forbidden 403)
    stu_res = client.get("/api/monitoring/live", headers=student_headers)
    assert stu_res.status_code == status.HTTP_403_FORBIDDEN

    # 3. Create Exam by Examiner
    now = datetime.now(timezone.utc)
    exam = Exam(
        name="Algorithms Midterm",
        subject="Computer Science",
        duration_minutes=60,
        start_time=now - timedelta(hours=1),
        end_time=now + timedelta(hours=3),
        total_questions=2,
        maximum_marks=10.0,
        created_by=examiner.id
    )
    db_session.add(exam)
    db_session.commit()
    db_session.refresh(exam)

    # 4. Create Active Session for Student with Proctor Events
    session = ExamSession(
        exam_id=exam.id,
        student_id=student.id,
        status="ACTIVE",
        started_at=now - timedelta(minutes=15),
        session_token=f"token-{suffix}"
    )
    db_session.add(session)
    db_session.commit()
    db_session.refresh(session)

    # Add Proctor Events
    evt1 = ProctorEvent(
        session_id=session.id,
        event_type="TAB_SWITCH",
        severity="MEDIUM",
        event_data={"count": 1},
        created_at=now - timedelta(minutes=10)
    )
    evt2 = ProctorEvent(
        session_id=session.id,
        event_type="FULLSCREEN_EXIT",
        severity="HIGH",
        event_data={},
        created_at=now - timedelta(minutes=5)
    )
    db_session.add_all([evt1, evt2])
    db_session.commit()

    # 5. Test GET /api/monitoring/live as Examiner
    res_examiner = client.get("/api/monitoring/live", headers=examiner_headers)
    assert res_examiner.status_code == status.HTTP_200_OK
    data = res_examiner.json()
    assert "sessions" in data
    assert data["total_active_candidates"] >= 1
    assert data["total_violations_recorded"] >= 2
    matched = [s for s in data["sessions"] if s["session_id"] == session.id]
    assert len(matched) == 1
    sess_item = matched[0]
    assert sess_item["student_name"] == "Rohan Gupta"
    assert sess_item["tab_switch_count"] >= 1
    assert sess_item["fullscreen_exit_count"] >= 1
    assert sess_item["remaining_seconds"] > 0
    assert sess_item["status"] == "ACTIVE"

    # 6. Test GET /api/monitoring/live as Admin with filters
    res_admin = client.get(f"/api/monitoring/live?exam_id={exam.id}", headers=admin_headers)
    assert res_admin.status_code == status.HTTP_200_OK
    admin_data = res_admin.json()
    assert len(admin_data["sessions"]) == 1

    # Search filter
    res_search = client.get(f"/api/monitoring/live?search=Rohan", headers=admin_headers)
    assert res_search.status_code == status.HTTP_200_OK
    assert len(res_search.json()["sessions"]) >= 1

    # 7. Test GET /api/monitoring/session/{session_id}
    detail_res = client.get(f"/api/monitoring/session/{session.id}", headers=examiner_headers)
    assert detail_res.status_code == status.HTTP_200_OK
    detail_data = detail_res.json()
    assert detail_data["session"]["session_id"] == session.id
    assert len(detail_data["events"]) >= 2
