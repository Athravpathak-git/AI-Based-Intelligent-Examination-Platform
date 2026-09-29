import pytest
import uuid
from datetime import datetime, timedelta, timezone
from fastapi import status
from sqlalchemy.orm import Session
from app.models.user import User, UserRole
from app.models.exam import Exam
from app.models.question import QuestionBank, Option, QuestionType, DifficultyLevel
from app.core.security import hash_password

def test_complete_e2e_application_flow(client, db_session: Session):
    """
    Test the complete end-to-end lifecycle as specified in Requirement 3:
    - Registration & Registration Number generation
    - Login & JWT Token issuance
    - Role-based access enforcement
    - Student dashboard & Exam listing
    - Exam registration & Instruction acceptance
    - Session start & timer verification
    - Answer saving (MCQ & Short Answer)
    - Proctoring event tracking
    - Session heartbeat
    - Exam submission & auto-scoring
    - Examiner valuation workspace
    - Subjective grading
    - Finalization & Result publication
    - Student result scorecard & PDF report
    - Re-attempt permission workflow
    - Notifications & read status
    - Profile update & password change
    """

    # 1. Registration
    unique_suffix = uuid.uuid4().hex[:6]
    stu_email = f"priya_{unique_suffix}@example.com"
    reg_payload = {
        "name": "Priya Sharma",
        "email": stu_email,
        "password": "Password123!",
        "role": "STUDENT",
        "college": "Institute of Technology",
        "course": "B.Tech",
        "specialization": "Computer Science"
    }
    reg_res = client.post("/api/auth/register", json=reg_payload)
    assert reg_res.status_code == status.HTTP_201_CREATED, reg_res.text
    student_data = reg_res.json()
    assert student_data["email"] == stu_email
    assert "registration_number" in student_data
    assert student_data["registration_number"].startswith("STU-")

    # 2. Login
    login_res = client.post("/api/auth/login", json={
        "email": stu_email,
        "password": "Password123!"
    })
    assert login_res.status_code == status.HTTP_200_OK, login_res.text
    token_data = login_res.json()
    student_token = token_data["access_token"]
    student_headers = {"Authorization": f"Bearer {student_token}"}
    student_id = token_data["user_id"]

    # Examiner & Admin accounts
    examiner_email = f"examiner_{unique_suffix}@example.com"
    admin_email = f"admin_{unique_suffix}@example.com"
    examiner = User(
        name="Prof. Sarah Jenkins",
        email=examiner_email,
        password_hash=hash_password("examiner123"),
        role=UserRole.EXAMINER,
        is_active=True
    )
    admin = User(
        name="System Admin",
        email=admin_email,
        password_hash=hash_password("admin123"),
        role=UserRole.ADMIN,
        is_active=True
    )
    db_session.add_all([examiner, admin])
    db_session.commit()

    examiner_login = client.post("/api/auth/login", json={
        "email": examiner_email,
        "password": "examiner123"
    })
    examiner_token = examiner_login.json()["access_token"]
    examiner_headers = {"Authorization": f"Bearer {examiner_token}"}

    admin_login = client.post("/api/auth/login", json={
        "email": admin_email,
        "password": "admin123"
    })
    admin_token = admin_login.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # 3. Role-Based Access Control
    rb_res = client.get("/api/auth/admin/users", headers=student_headers)
    assert rb_res.status_code == status.HTTP_403_FORBIDDEN

    # 4. Create Questions (Examiner)
    q1 = QuestionBank(
        subject="Computer Science",
        question_text=f"Time complexity of binary search? {unique_suffix}",
        question_type=QuestionType.MCQ,
        difficulty=DifficultyLevel.EASY,
        marks=2.0,
        is_active=True,
        options=[
            Option(option_text="O(n)", is_correct=False),
            Option(option_text="O(log n)", is_correct=True),
            Option(option_text="O(n^2)", is_correct=False),
        ]
    )
    q2 = QuestionBank(
        subject="Computer Science",
        question_text=f"Explain Virtual Memory. {unique_suffix}",
        question_type=QuestionType.SHORT_ANSWER,
        difficulty=DifficultyLevel.MEDIUM,
        marks=5.0,
        is_active=True
    )
    db_session.add_all([q1, q2])
    db_session.commit()

    # Create Exam via API
    now = datetime.now(timezone.utc)
    exam_payload = {
        "name": f"Operating Systems Midterm {unique_suffix}",
        "subject": "Computer Science",
        "duration_minutes": 45,
        "start_time": (now - timedelta(minutes=5)).isoformat(),
        "end_time": (now + timedelta(hours=24)).isoformat(),
        "total_questions": 2,
        "maximum_marks": 7.0,
        "passing_marks": 3.0,
        "webcam_monitoring_enabled": True,
        "maximum_tab_switch_warnings": 3
    }
    create_exam_res = client.post("/api/exams", json=exam_payload, headers=examiner_headers)
    assert create_exam_res.status_code == status.HTTP_201_CREATED, create_exam_res.text
    exam_id = create_exam_res.json()["id"]

    # 5. Student Dashboard & Exam listing
    exam_list_res = client.get("/api/exams", headers=student_headers)
    assert exam_list_res.status_code == status.HTTP_200_OK
    exams = exam_list_res.json()
    assert any(e["id"] == exam_id for e in exams)

    # 6. Student Registers for Exam
    reg_exam_res = client.post(f"/api/exams/{exam_id}/register", headers=student_headers)
    assert reg_exam_res.status_code in [status.HTTP_200_OK, status.HTTP_201_CREATED]

    # 7. Student Accepts Instructions
    ack_res = client.post(f"/api/exams/{exam_id}/accept-instructions", json={"accepted": True}, headers=student_headers)
    assert ack_res.status_code == status.HTTP_200_OK

    # 8. Start Exam Session
    session_res = client.post(f"/api/exams/{exam_id}/start-session", headers=student_headers)
    assert session_res.status_code == status.HTTP_200_OK
    session_data = session_res.json()
    session_id = session_data["session_id"]
    assert session_data["remaining_seconds"] > 0
    assert len(session_data["questions"]) == 2

    # 9. Heartbeat Sync
    hb_res = client.get(f"/api/sessions/{session_id}/heartbeat", headers=student_headers)
    assert hb_res.status_code == status.HTTP_200_OK
    assert hb_res.json()["status"] == "ACTIVE"

    # 10. Proctoring Event
    event_res = client.post(
        f"/api/sessions/{session_id}/proctor-event",
        json={"event_type": "TAB_SWITCH", "event_data": {"test": "e2e"}, "severity": "MEDIUM"},
        headers=student_headers
    )
    assert event_res.status_code == status.HTTP_200_OK
    assert event_res.json()["current_warnings"] == 1

    # 11. Answer Saving
    mcq_q = next((q for q in session_data["questions"] if q.get("options")), None)
    subj_q = next((q for q in session_data["questions"] if not q.get("options")), None)

    if mcq_q:
        opt_id = mcq_q["options"][0]["id"]
        ans1_res = client.post(
            f"/api/sessions/{session_id}/save-answer",
            json={"question_id": mcq_q["id"], "selected_option_ids": [opt_id], "is_marked_for_review": False},
            headers=student_headers
        )
        assert ans1_res.status_code == status.HTTP_200_OK

    if subj_q:
        ans2_res = client.post(
            f"/api/sessions/{session_id}/save-answer",
            json={"question_id": subj_q["id"], "answer_text": "Virtual memory provides address isolation and paging.", "is_marked_for_review": False},
            headers=student_headers
        )
        assert ans2_res.status_code == status.HTTP_200_OK

    # 12. Exam Submission
    sub_res = client.post(f"/api/sessions/{session_id}/submit", headers=student_headers)
    assert sub_res.status_code == status.HTTP_200_OK
    sub_data = sub_res.json()
    result_id = sub_data["result_id"]
    assert result_id is not None

    # 13. Valuation Queue (Examiner)
    queue_res = client.get("/api/evaluations/pending", headers=examiner_headers)
    assert queue_res.status_code == status.HTTP_200_OK
    queue_items = queue_res.json()
    assert any(item["session_id"] == session_id for item in queue_items)

    # 14. Examiner grades subjective question
    if subj_q:
        grade_res = client.post(
            f"/api/evaluations/session/{session_id}/grade-question",
            json={"question_id": subj_q["id"], "marks_awarded": 4.5, "evaluator_feedback": "Accurate explanation."},
            headers=examiner_headers
        )
        assert grade_res.status_code == status.HTTP_200_OK

    # 15. Finalize Evaluation (Examiner)
    finalize_res = client.post(
        f"/api/evaluations/session/{session_id}/finalize",
        json={"evaluator_remarks": "Completed evaluation."},
        headers=examiner_headers
    )
    assert finalize_res.status_code == status.HTTP_200_OK

    # 16. Publish Official Result (Admin)
    pub_res = client.post(
        f"/api/evaluations/session/{session_id}/publish",
        json={"evaluator_remarks": "Official publication approved."},
        headers=admin_headers
    )
    assert pub_res.status_code == status.HTTP_200_OK

    # 17. Student Views Published Scorecard
    res_card = client.get(f"/api/results/{result_id}", headers=student_headers)
    assert res_card.status_code == status.HTTP_200_OK
    scorecard = res_card.json()
    assert scorecard["result_id"] == result_id
    assert scorecard["evaluation_status"] == "PUBLISHED"

    # 18. Student PDF Scorecard Download
    pdf_res = client.get(f"/api/results/{result_id}/download/pdf", headers=student_headers)
    assert pdf_res.status_code == status.HTTP_200_OK
    assert "application/pdf" in pdf_res.headers.get("content-type", "")

    # 19. Re-attempt Request Workflow (Examiner requests for student, Admin approves)
    req_res = client.post(
        "/api/exam-access/request",
        json={"exam_id": exam_id, "student_id": student_id, "reason": "Power outage during last section"},
        headers=examiner_headers
    )
    assert req_res.status_code == status.HTTP_201_CREATED, req_res.text
    perm_id = req_res.json()["id"]

    # Admin approves re-attempt
    approve_res = client.post(
        f"/api/exam-access/{perm_id}/approve",
        json={"notes": "Approved for re-take"},
        headers=admin_headers
    )
    assert approve_res.status_code == status.HTTP_200_OK
    assert approve_res.json()["status"] == "ACTIVE"

    # 20. Notifications Check
    notif_res = client.get("/api/notifications", headers=student_headers)
    assert notif_res.status_code == status.HTTP_200_OK
    assert len(notif_res.json()) >= 1
    n_id = notif_res.json()[0]["id"]
    mark_res = client.post(f"/api/notifications/{n_id}/read", headers=student_headers)
    assert mark_res.status_code == status.HTTP_200_OK

    # 21. Profile & Password Update
    prof_update = client.put(
        "/api/auth/profile",
        json={"name": "Priya S. Sharma", "city": "Mumbai", "mobile_number": "9876543210"},
        headers=student_headers
    )
    assert prof_update.status_code == status.HTTP_200_OK
    assert prof_update.json()["name"] == "Priya S. Sharma"

    pwd_res = client.post(
        "/api/auth/change-password",
        json={
            "current_password": "Password123!",
            "new_password": "NewPassword456!",
            "confirm_password": "NewPassword456!"
        },
        headers=student_headers
    )
    assert pwd_res.status_code == status.HTTP_200_OK
