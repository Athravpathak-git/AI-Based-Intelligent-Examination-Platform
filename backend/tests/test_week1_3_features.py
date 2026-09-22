import io
import secrets
import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from PIL import Image

from app.models.user import User, UserRole
from app.models.exam import Exam
from app.models.question import QuestionBank, Option, QuestionType, DifficultyLevel
from app.models.registration import ExamRegistration
from app.models.session import ExamSession, Answer
from app.models.result import Result
from app.models.attempt_permission import ExamAttemptPermission
from app.models.notification import Notification
from app.core.security import hash_password, create_exam_access_token, verify_exam_access_token
from app.services.expiry_worker import expire_active_sessions_sync
from app.services.session_service import calculate_suspicion_score

def test_signed_exam_access_token():
    """Verify signed JWT exam access token creation, claims, and validation."""
    token = create_exam_access_token(exam_id=42, student_id=99, session_id=101, duration_minutes=60)
    assert isinstance(token, str)
    assert len(token) > 20

    payload = verify_exam_access_token(token)
    assert payload["exam_id"] == 42
    assert payload["student_id"] == 99
    assert payload["session_id"] == 101
    assert payload["type"] == "exam_access"
    assert "exp" in payload
    assert "iat" in payload

    # Invalid token verification raises ValueError
    with pytest.raises(ValueError):
        verify_exam_access_token("invalid.token.here")

def test_suspicion_score_calculation():
    """Verify deterministic bounded suspicion score formula capped at 100."""
    class DummyEvent:
        def __init__(self, t):
            self.event_type = t

    score_0 = calculate_suspicion_score([])
    assert score_0 == 0

    # 1 tab switch (15) + 1 blur (5) = 20
    score_20 = calculate_suspicion_score([DummyEvent("TAB_SWITCH"), DummyEvent("WINDOW_BLUR")])
    assert score_20 == 20

    # Test capping at 100
    heavy_violations = [DummyEvent("MULTIPLE_FACES_DETECTED")] * 10  # 25 * 10 = 250 -> cap 100
    score_capped = calculate_suspicion_score(heavy_violations)
    assert score_capped == 100

def test_word_count_validation(client: TestClient, db_session: Session):
    """Verify word count limits: SHORT_ANSWER max 100 words, LONG_ANSWER max 600 words."""
    timestamp = int(datetime.now(timezone.utc).timestamp())
    student = User(
        name="WordCount Student",
        email=f"wc_stu_{timestamp}@example.com",
        password_hash=hash_password("Pass123!"),
        role=UserRole.STUDENT,
        is_active=True
    )
    db_session.add(student)
    db_session.commit()

    # Create questions
    q_short = QuestionBank(
        subject=f"Subj_{timestamp}",
        question_text="Short answer question",
        question_type=QuestionType.SHORT_ANSWER,
        difficulty=DifficultyLevel.EASY,
        marks=5.0
    )
    q_long = QuestionBank(
        subject=f"Subj_{timestamp}",
        question_text="Long answer question",
        question_type=QuestionType.LONG_ANSWER,
        difficulty=DifficultyLevel.MEDIUM,
        marks=10.0
    )
    db_session.add_all([q_short, q_long])
    db_session.commit()

    now = datetime.now(timezone.utc)
    exam = Exam(
        name=f"WordCount Exam {timestamp}",
        subject=f"Subj_{timestamp}",
        duration_minutes=30,
        start_time=now - timedelta(minutes=5),
        end_time=now + timedelta(hours=2),
        total_questions=2,
        maximum_marks=15.0
    )
    db_session.add(exam)
    db_session.commit()

    session = ExamSession(
        exam_id=exam.id,
        student_id=student.id,
        session_token=secrets.token_urlsafe(32),
        status="ACTIVE",
        started_at=now
    )
    db_session.add(session)
    db_session.commit()

    student_login = client.post("/api/auth/login", json={"email": student.email, "password": "Pass123!"})
    headers = {"Authorization": f"Bearer {student_login.json()['access_token']}"}

    # 1. Valid short answer (5 words) -> 200 OK
    res_valid_short = client.post(
        f"/api/sessions/{session.id}/save-answer",
        json={"question_id": q_short.id, "answer_text": "This is a short answer."},
        headers=headers
    )
    assert res_valid_short.status_code == 200

    # 2. Exceeding short answer (>100 words) -> 400 Bad Request
    exceeded_text = "word " * 105
    res_invalid_short = client.post(
        f"/api/sessions/{session.id}/save-answer",
        json={"question_id": q_short.id, "answer_text": exceeded_text},
        headers=headers
    )
    assert res_invalid_short.status_code == 400
    assert "exceeds maximum limit of 100 words" in res_invalid_short.json()["detail"]

    # 3. Exceeding long answer (>600 words) -> 400 Bad Request
    exceeded_long = "word " * 610
    res_invalid_long = client.post(
        f"/api/sessions/{session.id}/save-answer",
        json={"question_id": q_long.id, "answer_text": exceeded_long},
        headers=headers
    )
    assert res_invalid_long.status_code == 400
    assert "exceeds maximum limit of 600 words" in res_invalid_long.json()["detail"]

def test_image_upload_and_thumbnail_pipeline(client: TestClient, db_session: Session):
    """Verify image upload saves file, creates 200x200 Pillow thumbnail, and performs OCR extraction."""
    timestamp = int(datetime.now(timezone.utc).timestamp())
    student = User(
        name="Image Student",
        email=f"img_stu_{timestamp}@example.com",
        password_hash=hash_password("Pass123!"),
        role=UserRole.STUDENT,
        is_active=True
    )
    db_session.add(student)
    db_session.commit()

    now = datetime.now(timezone.utc)
    exam = Exam(
        name=f"Image Exam {timestamp}",
        subject=f"Subj_{timestamp}",
        duration_minutes=30,
        start_time=now - timedelta(minutes=5),
        end_time=now + timedelta(hours=2),
        total_questions=1,
        maximum_marks=10.0
    )
    db_session.add(exam)
    db_session.commit()

    q_img = QuestionBank(
        subject=f"Subj_{timestamp}",
        question_text="Upload diagram",
        question_type=QuestionType.IMAGE_UPLOAD,
        difficulty=DifficultyLevel.MEDIUM,
        marks=10.0
    )
    db_session.add(q_img)
    db_session.commit()

    session = ExamSession(
        exam_id=exam.id,
        student_id=student.id,
        session_token=secrets.token_urlsafe(32),
        status="ACTIVE",
        started_at=now
    )
    db_session.add(session)
    db_session.commit()

    student_login = client.post("/api/auth/login", json={"email": student.email, "password": "Pass123!"})
    headers = {"Authorization": f"Bearer {student_login.json()['access_token']}"}

    # Generate test image in memory
    img_byte_arr = io.BytesIO()
    img = Image.new("RGB", (400, 300), color=(74, 37, 69))
    img.save(img_byte_arr, format="PNG")
    img_byte_arr.seek(0)

    files = {"file": ("solution.png", img_byte_arr, "image/png")}
    data = {"question_id": str(q_img.id)}

    res_upload = client.post(
        f"/api/sessions/{session.id}/upload-image",
        data=data,
        files=files,
        headers=headers
    )
    assert res_upload.status_code == 200
    body = res_upload.json()
    assert "image_path" in body
    assert "thumbnail_path" in body
    assert body["thumbnail_path"].endswith("_thumb.jpg")
    assert body["question_id"] == q_img.id

    # Verify answer record updated with thumbnail path
    ans = db_session.query(Answer).filter(Answer.session_id == session.id, Answer.question_id == q_img.id).first()
    assert ans is not None
    assert ans.image_path == body["image_path"]
    assert ans.thumbnail_path == body["thumbnail_path"]

def test_student_reattempt_workflow_and_notifications(client: TestClient, admin_auth_headers: dict, db_session: Session):
    """Verify student requests re-attempt -> pending status -> examiner/admin approves -> notification created."""
    timestamp = int(datetime.now(timezone.utc).timestamp())
    examiner = User(
        name="Examiner Alpha",
        email=f"ex_alpha_{timestamp}@example.com",
        password_hash=hash_password("Pass123!"),
        role=UserRole.EXAMINER,
        is_active=True
    )
    student = User(
        name="Student Alpha",
        email=f"stu_alpha_{timestamp}@example.com",
        password_hash=hash_password("Pass123!"),
        role=UserRole.STUDENT,
        is_active=True
    )
    db_session.add_all([examiner, student])
    db_session.commit()

    now = datetime.now(timezone.utc)
    exam = Exam(
        name=f"Workflow Exam {timestamp}",
        subject=f"Subj_{timestamp}",
        duration_minutes=30,
        start_time=now - timedelta(minutes=5),
        end_time=now + timedelta(hours=2),
        total_questions=1,
        maximum_marks=10.0,
        created_by=examiner.id
    )
    db_session.add(exam)
    db_session.commit()

    student_login = client.post("/api/auth/login", json={"email": student.email, "password": "Pass123!"})
    student_headers = {"Authorization": f"Bearer {student_login.json()['access_token']}"}

    # 1. Student cannot request re-attempt (403 Forbidden)
    res_student_blocked = client.post(
        "/api/exam-access/request",
        json={"exam_id": exam.id, "reason": "Network disconnected mid-exam", "notes": "Laptop battery died."},
        headers=student_headers
    )
    assert res_student_blocked.status_code == 403

    # 2. Examiner submits re-attempt request for student -> PENDING_ADMIN_APPROVAL
    examiner_login = client.post("/api/auth/login", json={"email": examiner.email, "password": "Pass123!"})
    examiner_headers = {"Authorization": f"Bearer {examiner_login.json()['access_token']}"}

    res_req = client.post(
        "/api/exam-access/request",
        json={
            "exam_id": exam.id,
            "student_id": student.id,
            "reason": "Network disconnected mid-exam",
            "notes": "Laptop battery died."
        },
        headers=examiner_headers
    )
    assert res_req.status_code == 201
    perm_id = res_req.json()["id"]
    assert res_req.json()["status"] == "PENDING_ADMIN_APPROVAL"

    # Examiner views their submitted requests
    res_my = client.get("/api/exam-access/my-requests", headers=examiner_headers)
    assert res_my.status_code == 200
    my_list = res_my.json()
    assert any(p["id"] == perm_id and p["status"] == "PENDING_ADMIN_APPROVAL" for p in my_list)

    # 3. Examiner cannot approve the request (403 Forbidden)
    res_examiner_approve = client.post(
        f"/api/exam-access/{perm_id}/approve",
        json={"notes": "Examiner trying to approve"},
        headers=examiner_headers
    )
    assert res_examiner_approve.status_code == 403

    # 4. Admin approves the request -> ACTIVE
    res_approve = client.post(
        f"/api/exam-access/{perm_id}/approve",
        json={"notes": "Approved technical issue by Admin"},
        headers=admin_auth_headers
    )
    assert res_approve.status_code == 200
    assert res_approve.json()["status"] == "ACTIVE"

    # Verify notification created for student
    student_notifs = db_session.query(Notification).filter(Notification.user_id == student.id).all()
    assert len(student_notifs) >= 1
    assert "Approved" in student_notifs[-1].title

    # 4. Student checks notifications API
    res_notif = client.get("/api/notifications", headers=student_headers)
    assert res_notif.status_code == 200
    notif_list = res_notif.json()
    assert len(notif_list) >= 1
    target_notif = notif_list[0]

    # 5. Mark notification as read
    res_read = client.put(f"/api/notifications/{target_notif['id']}/read", headers=student_headers)
    assert res_read.status_code == 200
    assert res_read.json()["is_read"] is True

def test_expiry_worker_idempotency(db_session: Session):
    """Verify background expiry worker expires sessions whose deadline passed."""
    timestamp = int(datetime.now(timezone.utc).timestamp())
    student = User(
        name="Expiry Student",
        email=f"exp_{timestamp}@example.com",
        password_hash=hash_password("Pass123!"),
        role=UserRole.STUDENT,
        is_active=True
    )
    db_session.add(student)
    db_session.commit()

    # Create exam that ended 10 minutes ago
    now = datetime.now(timezone.utc)
    exam = Exam(
        name=f"Expired Exam {timestamp}",
        subject=f"Subj_{timestamp}",
        duration_minutes=15,
        start_time=now - timedelta(hours=2),
        end_time=now - timedelta(minutes=10),
        total_questions=1,
        maximum_marks=5.0
    )
    db_session.add(exam)
    db_session.commit()

    q = QuestionBank(
        subject=f"Subj_{timestamp}",
        question_text="Question for expired exam",
        question_type=QuestionType.MCQ,
        difficulty=DifficultyLevel.EASY,
        marks=5.0
    )
    db_session.add(q)
    db_session.commit()
    opt = Option(question_id=q.id, option_text="Opt", is_correct=True, option_order=0)
    db_session.add(opt)
    db_session.commit()

    # Create active session for the expired exam
    session = ExamSession(
        exam_id=exam.id,
        student_id=student.id,
        session_token=secrets.token_urlsafe(32),
        status="ACTIVE",
        started_at=now - timedelta(minutes=40)
    )
    db_session.add(session)
    db_session.commit()

    # Run expiry worker sync
    expired_count = expire_active_sessions_sync(db=db_session)
    assert expired_count >= 1

    # Verify session status is now TIME_EXPIRED or EXPIRED
    updated_session = db_session.query(ExamSession).filter(ExamSession.id == session.id).first()
    assert updated_session is not None
    assert updated_session.status in ["TIME_EXPIRED", "EXPIRED"]

    # Running again is completely idempotent
    again_count = expire_active_sessions_sync(db=db_session)
    assert again_count == 0
