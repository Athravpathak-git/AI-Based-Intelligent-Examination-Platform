import pytest
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from app.models.user import User, UserRole
from app.models.exam import Exam
from app.models.notification import Notification
from app.core.security import hash_password
from app.schemas.exam import ExamCreate
from app.services.exam_service import create_exam, register_student_for_exam
from app.services.session_service import get_or_create_exam_session, finalize_and_grade_session
from app.models.question import QuestionBank, Option, QuestionType, DifficultyLevel

def test_notification_flow_on_exam_lifecycle(client, db_session: Session):
    timestamp = int(datetime.now(timezone.utc).timestamp())

    # 1. Create Examiner and Student users
    examiner = User(
        name="Exam Master",
        email=f"examiner_{timestamp}@test.com",
        password_hash=hash_password("Pass123!"),
        role=UserRole.EXAMINER,
        is_active=True
    )
    student = User(
        name="Test Student",
        email=f"student_{timestamp}@test.com",
        password_hash=hash_password("Pass123!"),
        role=UserRole.STUDENT,
        is_active=True
    )
    db_session.add_all([examiner, student])
    db_session.commit()

    # 2. Add sample question pool for subject
    subj = f"NotifSubj_{timestamp}"
    q = QuestionBank(
        subject=subj,
        question_text="Sample question?",
        question_type=QuestionType.MCQ,
        difficulty=DifficultyLevel.EASY,
        marks=2.0
    )
    db_session.add(q)
    db_session.commit()

    opt = Option(question_id=q.id, option_text="Opt A", is_correct=True, option_order=0)
    db_session.add(opt)
    db_session.commit()

    # 3. Create Exam via service
    now = datetime.now(timezone.utc)
    exam_in = ExamCreate(
        name=f"Notification Test Exam {timestamp}",
        subject=subj,
        duration_minutes=30,
        start_time=now - timedelta(minutes=5),
        end_time=now + timedelta(hours=2),
        total_questions=1,
        maximum_marks=2.0
    )
    created_exam = create_exam(db_session, exam_in, creator_id=examiner.id)

    # Verify notification created for examiner
    examiner_notifs = db_session.query(Notification).filter(Notification.user_id == examiner.id).all()
    assert len(examiner_notifs) >= 1
    assert any("Exam Scheduled" in n.title for n in examiner_notifs)

    # Verify notification created for student
    student_notifs = db_session.query(Notification).filter(Notification.user_id == student.id).all()
    assert len(student_notifs) >= 1
    assert any("New Exam Available" in n.title for n in student_notifs)

    # 4. Student registers for exam
    register_student_for_exam(db_session, created_exam.id, student)

    student_notifs_after_reg = db_session.query(Notification).filter(Notification.user_id == student.id).all()
    assert any("Registration Confirmed" in n.title for n in student_notifs_after_reg)

    examiner_notifs_after_reg = db_session.query(Notification).filter(Notification.user_id == examiner.id).all()
    assert any("New Candidate Registration" in n.title for n in examiner_notifs_after_reg)

    # 5. Start and Submit exam session
    session_start = get_or_create_exam_session(db_session, created_exam.id, student)
    finalize_and_grade_session(db_session, session_start.session_id, student)

    # Verify exam completed notification for student
    student_final_notifs = db_session.query(Notification).filter(Notification.user_id == student.id).all()
    assert any("Exam Submitted" in n.title for n in student_final_notifs)

    # Publish result as examiner
    login_resp = client.post("/api/auth/login", json={"email": examiner.email, "password": "Pass123!"})
    examiner_token = login_resp.json()["access_token"]
    pub_resp = client.post(
        f"/api/evaluations/session/{session_start.session_id}/publish",
        headers={"Authorization": f"Bearer {examiner_token}"}
    )
    assert pub_resp.status_code == 200

    # Verify result published notification for student
    student_pub_notifs = db_session.query(Notification).filter(Notification.user_id == student.id).all()
    assert any("Result" in n.title for n in student_pub_notifs)

    # Verify submission notification for examiner
    examiner_final_notifs = db_session.query(Notification).filter(Notification.user_id == examiner.id).all()
    assert any("Submission Received" in n.title for n in examiner_final_notifs)

def test_notification_api_endpoints(client, db_session: Session):
    timestamp = int(datetime.now(timezone.utc).timestamp())
    user = User(
        name="API Notif User",
        email=f"api_notif_{timestamp}@test.com",
        password_hash=hash_password("Pass123!"),
        role=UserRole.STUDENT,
        is_active=True
    )
    db_session.add(user)
    db_session.commit()

    # Login to get token
    login_resp = client.post("/api/auth/login", json={"email": user.email, "password": "Pass123!"})
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Add 2 unread notifications
    n1 = Notification(
        user_id=user.id,
        type="INFO",
        title="Test Notification 1",
        message="Message 1",
        is_read=False
    )
    n2 = Notification(
        user_id=user.id,
        type="SUCCESS",
        title="Test Notification 2",
        message="Message 2",
        is_read=False
    )
    db_session.add_all([n1, n2])
    db_session.commit()

    # GET /api/notifications
    get_resp = client.get("/api/notifications", headers=headers)
    assert get_resp.status_code == 200
    notifs = get_resp.json()
    assert len(notifs) >= 2
    unread = [n for n in notifs if not n["is_read"]]
    assert len(unread) >= 2

    # PUT /api/notifications/{id}/read
    read_resp = client.put(f"/api/notifications/{n1.id}/read", headers=headers)
    assert read_resp.status_code == 200
    assert read_resp.json()["is_read"] is True

    # PUT /api/notifications/read-all
    read_all_resp = client.put("/api/notifications/read-all", headers=headers)
    assert read_all_resp.status_code == 200
    assert read_all_resp.json()["updated_count"] >= 1

    # Verify all are now read
    get_resp_after = client.get("/api/notifications", headers=headers)
    assert all(n["is_read"] is True for n in get_resp_after.json())

