import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.user import User, UserRole
from app.models.question import QuestionBank, Option, QuestionType, DifficultyLevel
from app.models.exam import Exam
from app.models.registration import ExamRegistration
from app.models.session import ExamSession, Answer
from app.models.result import Result
from app.models.attempt_permission import ExamAttemptPermission, ExamInstructionAcceptance
from app.core.security import hash_password

def test_flexible_question_count_and_insufficient_pool(client: TestClient, admin_auth_headers: dict, db_session: Session):
    """Verify flexible question count creation and insufficient pool rejection."""
    timestamp = int(datetime.now(timezone.utc).timestamp())
    subject = f"FlexSubject_{timestamp}"

    # 1. Create 3 questions for subject
    for i in range(3):
        q = QuestionBank(
            subject=subject,
            question_text=f"Question {i+1} for {subject}",
            question_type=QuestionType.MCQ,
            difficulty=DifficultyLevel.EASY,
            marks=2.0
        )
        db_session.add(q)
        db_session.flush()
        opt1 = Option(question_id=q.id, option_text="Option A", is_correct=True, option_order=0)
        opt2 = Option(question_id=q.id, option_text="Option B", is_correct=False, option_order=1)
        db_session.add_all([opt1, opt2])
    db_session.commit()

    now = datetime.now(timezone.utc)
    start_time = (now - timedelta(minutes=5)).isoformat()
    end_time = (now + timedelta(hours=2)).isoformat()

    # 2. Attempt to create exam with 10 questions (insufficient pool: 3 < 10) -> Should fail
    res_insufficient = client.post(
        "/api/exams",
        json={
            "name": f"Insufficient Exam {timestamp}",
            "subject": subject,
            "duration_minutes": 30,
            "start_time": start_time,
            "end_time": end_time,
            "total_questions": 10,
            "maximum_marks": 20.0
        },
        headers=admin_auth_headers
    )
    assert res_insufficient.status_code == 400
    assert "Insufficient questions" in res_insufficient.json()["detail"]

    # 3. Create exam with exactly 3 questions -> Should succeed
    res_exact = client.post(
        "/api/exams",
        json={
            "name": f"Exact Exam {timestamp}",
            "subject": subject,
            "duration_minutes": 30,
            "start_time": start_time,
            "end_time": end_time,
            "total_questions": 3,
            "maximum_marks": 6.0
        },
        headers=admin_auth_headers
    )
    assert res_exact.status_code == 201
    created_exam = res_exact.json()
    assert created_exam["total_questions"] == 3

def test_forgot_and_reset_password_flow(client: TestClient, db_session: Session):
    """Verify forgot password generic response, token validation, single-use, and login."""
    timestamp = int(datetime.now(timezone.utc).timestamp())
    email = f"reset_test_{timestamp}@example.com"
    old_pass = "OldPassword123!"
    new_pass = "NewSecurePassword456!"

    user = User(
        name="Reset Test User",
        email=email,
        password_hash=hash_password(old_pass),
        role=UserRole.STUDENT,
        is_active=True
    )
    db_session.add(user)
    db_session.commit()

    # 1. Non-existent email -> Returns generic message
    res_non_existent = client.post("/api/auth/forgot-password", json={"email": "non_existent@example.com"})
    assert res_non_existent.status_code == 200
    assert "instructions have been sent" in res_non_existent.json()["message"]
    assert res_non_existent.json()["debug_token"] is None

    # 2. Existing email -> Returns generic message + debug_token
    res_forgot = client.post("/api/auth/forgot-password", json={"email": email})
    assert res_forgot.status_code == 200
    token = res_forgot.json()["debug_token"]
    assert token is not None

    # 3. Reset password with invalid token -> 400
    res_bad_reset = client.post("/api/auth/reset-password", json={"token": "invalid-token", "new_password": new_pass})
    assert res_bad_reset.status_code == 400

    # 4. Reset password with valid token -> 200
    res_valid_reset = client.post("/api/auth/reset-password", json={"token": token, "new_password": new_pass})
    assert res_valid_reset.status_code == 200

    # 5. Token is single-use: resetting again fails -> 400
    res_used_reset = client.post("/api/auth/reset-password", json={"token": token, "new_password": "ThirdPassword789!"})
    assert res_used_reset.status_code == 400

    # 6. Old password fails
    res_old_login = client.post("/api/auth/login", json={"email": email, "password": old_pass})
    assert res_old_login.status_code == 401

    # 7. New password succeeds
    res_new_login = client.post("/api/auth/login", json={"email": email, "password": new_pass})
    assert res_new_login.status_code == 200
    assert "access_token" in res_new_login.json()

def test_account_activation_and_deactivation(client: TestClient, admin_auth_headers: dict, db_session: Session):
    """Verify admin can deactivate student, inactive student login is blocked, reactivate works, and last admin protected."""
    timestamp = int(datetime.now(timezone.utc).timestamp())
    email = f"deact_test_{timestamp}@example.com"
    pwd = "StudentPassword123!"

    student = User(
        name="Deactivation Candidate",
        email=email,
        password_hash=hash_password(pwd),
        role=UserRole.STUDENT,
        is_active=True
    )
    db_session.add(student)
    db_session.commit()

    # 1. Active login works
    res_login_active = client.post("/api/auth/login", json={"email": email, "password": pwd})
    assert res_login_active.status_code == 200

    # 2. Admin deactivates student
    res_deactivate = client.put(
        f"/api/auth/admin/users/{student.id}/status?is_active=false",
        headers=admin_auth_headers
    )
    assert res_deactivate.status_code == 200
    assert res_deactivate.json()["is_active"] is False

    # 3. Inactive login fails with 403 Account is inactive
    res_login_inactive = client.post("/api/auth/login", json={"email": email, "password": pwd})
    assert res_login_inactive.status_code == 403
    assert "inactive" in res_login_inactive.json()["detail"].lower()

    # 4. Admin reactivates student
    res_reactivate = client.put(
        f"/api/auth/admin/users/{student.id}/status?is_active=true",
        headers=admin_auth_headers
    )
    assert res_reactivate.status_code == 200
    assert res_reactivate.json()["is_active"] is True

    # 5. Login works again
    res_login_reactivated = client.post("/api/auth/login", json={"email": email, "password": pwd})
    assert res_login_reactivated.status_code == 200

def test_exam_instructions_acceptance(client: TestClient, db_session: Session):
    """Verify student instruction acceptance audit record creation."""
    timestamp = int(datetime.now(timezone.utc).timestamp())
    student_email = f"accept_student_{timestamp}@example.com"
    pwd = "StudentPassword123!"

    student = User(
        name="Acceptance Student",
        email=student_email,
        password_hash=hash_password(pwd),
        role=UserRole.STUDENT,
        is_active=True
    )
    db_session.add(student)
    db_session.commit()

    login_res = client.post("/api/auth/login", json={"email": student_email, "password": pwd})
    token = login_res.json()["access_token"]
    student_headers = {"Authorization": f"Bearer {token}"}

    now = datetime.now(timezone.utc)
    exam = Exam(
        name=f"Instruction Exam {timestamp}",
        subject=f"Subject_{timestamp}",
        duration_minutes=30,
        start_time=now - timedelta(minutes=5),
        end_time=now + timedelta(hours=2),
        total_questions=1,
        maximum_marks=5.0
    )
    db_session.add(exam)
    db_session.commit()

    # Post instruction acceptance
    res_accept = client.post(
        f"/api/exams/{exam.id}/accept-instructions",
        json={"accepted": True},
        headers=student_headers
    )
    assert res_accept.status_code == 200
    data = res_accept.json()
    assert data["accepted"] is True
    assert data["exam_id"] == exam.id
    assert data["student_id"] == student.id

def test_reattempt_permission_workflow(client: TestClient, admin_auth_headers: dict, db_session: Session):
    """
    Comprehensive test for re-attempt permissions:
    1. Student completes an exam.
    2. Starting exam again without permission is blocked (403 REATTEMPT_ACCESS_REQUIRED).
    3. Examiner cannot grant re-attempt for another examiner's exam (403).
    4. Admin grants re-attempt.
    5. Student starts attempt #2 successfully.
    6. Both attempt #1 and attempt #2 remain recorded independently in database.
    """
    timestamp = int(datetime.now(timezone.utc).timestamp())
    subject = f"ReattemptSub_{timestamp}"

    # Setup 1 question
    q = QuestionBank(
        subject=subject,
        question_text=f"Sample Question {timestamp}",
        question_type=QuestionType.MCQ,
        difficulty=DifficultyLevel.EASY,
        marks=10.0
    )
    db_session.add(q)
    db_session.flush()
    opt = Option(question_id=q.id, option_text="A", is_correct=True, option_order=0)
    db_session.add(opt)
    db_session.commit()

    # Create Examiner 1 and Examiner 2
    examiner1 = User(
        name="Examiner One",
        email=f"ex1_{timestamp}@example.com",
        password_hash=hash_password("Pass123!"),
        role=UserRole.EXAMINER,
        is_active=True
    )
    examiner2 = User(
        name="Examiner Two",
        email=f"ex2_{timestamp}@example.com",
        password_hash=hash_password("Pass123!"),
        role=UserRole.EXAMINER,
        is_active=True
    )
    student = User(
        name="Reattempt Student",
        email=f"reatt_student_{timestamp}@example.com",
        password_hash=hash_password("Pass123!"),
        role=UserRole.STUDENT,
        is_active=True
    )
    db_session.add_all([examiner1, examiner2, student])
    db_session.commit()

    # Create exam owned by examiner1
    now = datetime.now(timezone.utc)
    exam = Exam(
        name=f"Reattempt Exam {timestamp}",
        subject=subject,
        duration_minutes=30,
        start_time=now - timedelta(minutes=5),
        end_time=now + timedelta(hours=2),
        total_questions=1,
        maximum_marks=10.0,
        created_by=examiner1.id
    )
    db_session.add(exam)
    db_session.commit()

    # Register student
    reg = ExamRegistration(exam_id=exam.id, student_id=student.id, status="REGISTERED")
    db_session.add(reg)
    db_session.commit()

    student_login = client.post("/api/auth/login", json={"email": student.email, "password": "Pass123!"})
    student_headers = {"Authorization": f"Bearer {student_login.json()['access_token']}"}

    # Attempt 1: Start session and submit
    res_s1 = client.post(f"/api/exams/{exam.id}/start-session", headers=student_headers)
    assert res_s1.status_code == 200
    s1_id = res_s1.json()["session_id"]

    # Submit Attempt 1
    res_sub1 = client.post(f"/api/sessions/{s1_id}/submit", headers=student_headers)
    assert res_sub1.status_code == 200
    assert res_sub1.json()["attempt_number"] == 1

    # Attempt 2 without permission -> MUST BE BLOCKED WITH 403
    res_blocked = client.post(f"/api/exams/{exam.id}/start-session", headers=student_headers)
    assert res_blocked.status_code == 403
    assert "REATTEMPT_ACCESS_REQUIRED" in res_blocked.json()["detail"]

    # Examiner 2 (unauthorized) tries to grant access -> 403 Forbidden
    ex2_login = client.post("/api/auth/login", json={"email": examiner2.email, "password": "Pass123!"})
    ex2_headers = {"Authorization": f"Bearer {ex2_login.json()['access_token']}"}

    res_unauth_grant = client.post(
        "/api/exam-access/grant",
        json={
            "exam_id": exam.id,
            "student_id": student.id,
            "max_additional_attempts": 1,
            "reason": "Unauthorized attempt by Examiner 2"
        },
        headers=ex2_headers
    )
    assert res_unauth_grant.status_code == 403

    # Admin grants re-attempt access
    res_grant = client.post(
        "/api/exam-access/grant",
        json={
            "exam_id": exam.id,
            "student_id": student.id,
            "max_additional_attempts": 1,
            "reason": "Administrative approval for technical glitch"
        },
        headers=admin_auth_headers
    )
    assert res_grant.status_code == 201
    assert res_grant.json()["status"] == "ACTIVE"

    # Attempt 2 with permission -> SUCCEEDS
    res_s2 = client.post(f"/api/exams/{exam.id}/start-session", headers=student_headers)
    assert res_s2.status_code == 200
    s2_id = res_s2.json()["session_id"]
    assert s2_id != s1_id  # Independent session created!

    # Submit Attempt 2
    res_sub2 = client.post(f"/api/sessions/{s2_id}/submit", headers=student_headers)
    assert res_sub2.status_code == 200
    assert res_sub2.json()["attempt_number"] == 2

    # Verify both attempts exist independently in database
    all_sessions = db_session.query(ExamSession).filter(ExamSession.exam_id == exam.id, ExamSession.student_id == student.id).all()
    assert len(all_sessions) == 2

    all_results = db_session.query(Result).filter(Result.exam_id == exam.id, Result.student_id == student.id).all()
    assert len(all_results) == 2
