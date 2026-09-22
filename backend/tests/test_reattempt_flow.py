import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.user import User, UserRole
from app.models.question import QuestionBank, Option, QuestionType, DifficultyLevel
from app.models.exam import Exam
from app.models.registration import ExamRegistration
from app.models.session import ExamSession
from app.models.result import Result
from app.models.attempt_permission import ExamAttemptPermission
from app.core.security import hash_password, create_access_token


@pytest.fixture
def reattempt_setup(db_session: Session):
    """Setup base models: 2 examiners, 1 student, 1 admin, 1 question, and 1 exam owned by examiner 1."""
    timestamp = int(datetime.now(timezone.utc).timestamp())
    subject = f"ReattemptSubject_{timestamp}"

    # Create 1 question
    q = QuestionBank(
        subject=subject,
        question_text=f"Sample Question for {subject}",
        question_type=QuestionType.MCQ,
        difficulty=DifficultyLevel.EASY,
        marks=10.0
    )
    db_session.add(q)
    db_session.flush()
    opt1 = Option(question_id=q.id, option_text="Alpha", is_correct=True, option_order=0)
    opt2 = Option(question_id=q.id, option_text="Beta", is_correct=False, option_order=1)
    db_session.add_all([opt1, opt2])
    db_session.commit()

    # Create Users
    owning_examiner = User(
        name="Owning Examiner",
        email=f"owner_{timestamp}@example.com",
        password_hash=hash_password("Pass123!"),
        role=UserRole.EXAMINER,
        is_active=True
    )
    unrelated_examiner = User(
        name="Unrelated Examiner",
        email=f"unrelated_{timestamp}@example.com",
        password_hash=hash_password("Pass123!"),
        role=UserRole.EXAMINER,
        is_active=True
    )
    student = User(
        name="Reattempt Candidate",
        email=f"candidate_{timestamp}@example.com",
        password_hash=hash_password("Pass123!"),
        role=UserRole.STUDENT,
        is_active=True
    )
    admin = User(
        name="Admin Boss",
        email=f"admin_{timestamp}@example.com",
        password_hash=hash_password("Pass123!"),
        role=UserRole.ADMIN,
        is_active=True
    )
    db_session.add_all([owning_examiner, unrelated_examiner, student, admin])
    db_session.commit()

    # Create Exam owned by owning_examiner
    now = datetime.now(timezone.utc)
    exam = Exam(
        name=f"Reattempt Verification Exam {timestamp}",
        subject=subject,
        duration_minutes=30,
        start_time=now - timedelta(minutes=10),
        end_time=now + timedelta(hours=2),
        total_questions=1,
        maximum_marks=10.0,
        created_by=owning_examiner.id
    )
    db_session.add(exam)
    db_session.commit()

    # Register student
    reg = ExamRegistration(exam_id=exam.id, student_id=student.id, status="REGISTERED")
    db_session.add(reg)
    db_session.commit()

    # Generate Auth Tokens
    student_token = create_access_token({"sub": str(student.id), "email": student.email, "role": student.role.value})
    owner_token = create_access_token({"sub": str(owning_examiner.id), "email": owning_examiner.email, "role": owning_examiner.role.value})
    unrelated_token = create_access_token({"sub": str(unrelated_examiner.id), "email": unrelated_examiner.email, "role": unrelated_examiner.role.value})
    admin_token = create_access_token({"sub": str(admin.id), "email": admin.email, "role": admin.role.value})

    return {
        "owning_examiner": owning_examiner,
        "unrelated_examiner": unrelated_examiner,
        "student": student,
        "admin": admin,
        "exam": exam,
        "student_headers": {"Authorization": f"Bearer {student_token}"},
        "owner_headers": {"Authorization": f"Bearer {owner_token}"},
        "unrelated_headers": {"Authorization": f"Bearer {unrelated_token}"},
        "admin_headers": {"Authorization": f"Bearer {admin_token}"}
    }


def test_reattempt_comprehensive_flow(client: TestClient, db_session: Session, reattempt_setup: dict):
    """
    Tests A through K:
    - Test A: Completed attempt + no permission => start denied (403)
    - Test B: Student cannot request re-attempt (403 Forbidden)
    - Test C: Examiner cannot directly grant re-attempt (403 Forbidden)
    - Test D: Unrelated Examiner cannot request re-attempt on another examiner's exam (403 Forbidden)
    - Test E: Owning Examiner requests re-attempt => status PENDING_ADMIN_APPROVAL
    - Test F: While PENDING_ADMIN_APPROVAL, student cannot start session (403)
    - Test G: Examiner cannot approve re-attempt (403 Forbidden)
    - Test H: Admin rejects re-attempt => status REJECTED => student still cannot start (403)
    - Test I: Admin approves re-attempt => status ACTIVE => student can start Attempt #2
    - Test J: Attempt #1 is preserved and untouched in DB, Attempt #2 has independent session ID
    - Test K: Admin can directly grant re-attempt for Attempt #3 => all 3 attempts preserved
    """
    setup = reattempt_setup
    exam = setup["exam"]
    student = setup["student"]
    student_headers = setup["student_headers"]
    owner_headers = setup["owner_headers"]
    unrelated_headers = setup["unrelated_headers"]
    admin_headers = setup["admin_headers"]

    # =========================================================================
    # Step 1: Initial Attempt #1 -> Start, Submit, and Verify Result
    # =========================================================================
    res_s1 = client.post(f"/api/exams/{exam.id}/start-session", headers=student_headers)
    assert res_s1.status_code == 200, f"Failed to start initial session: {res_s1.text}"
    s1_data = res_s1.json()
    s1_id = s1_data["session_id"]

    # Submit Session #1
    res_sub1 = client.post(f"/api/sessions/{s1_id}/submit", headers=student_headers)
    assert res_sub1.status_code == 200, f"Failed to submit initial session: {res_sub1.text}"
    result1_data = res_sub1.json()
    assert result1_data["attempt_number"] == 1
    old_session = db_session.query(ExamSession).filter(ExamSession.id == s1_id).first()
    assert old_session.status == "SUBMITTED"
    old_result = db_session.query(Result).filter(Result.session_id == s1_id).first()
    assert old_result is not None
    old_result_marks = old_result.total_marks

    # Check student exam detail reflects completed status
    res_exam_view = client.get(f"/api/exams/{exam.id}", headers=student_headers)
    assert res_exam_view.status_code == 200
    assert res_exam_view.json()["is_completed"] is True
    assert res_exam_view.json()["has_active_reattempt"] is False
    assert res_exam_view.json()["can_start"] is False

    # =========================================================================
    # TEST A: Completed attempt + no permission => start denied (403)
    # =========================================================================
    res_blocked_no_perm = client.post(f"/api/exams/{exam.id}/start-session", headers=student_headers)
    assert res_blocked_no_perm.status_code == 403
    assert "REATTEMPT_ACCESS_REQUIRED" in res_blocked_no_perm.json()["detail"]

    # =========================================================================
    # TEST B: Student cannot request re-attempt (403 Forbidden)
    # =========================================================================
    res_student_req = client.post(
        "/api/exam-access/request",
        json={"exam_id": exam.id, "reason": "Student trying to request"},
        headers=student_headers
    )
    assert res_student_req.status_code == 403, "Students must NOT be permitted to request re-attempts"

    # =========================================================================
    # TEST C: Examiner cannot directly grant re-attempt (403 Forbidden)
    # =========================================================================
    res_owner_direct_grant = client.post(
        "/api/exam-access/grant",
        json={
            "exam_id": exam.id,
            "student_id": student.id,
            "max_additional_attempts": 1,
            "reason": "Examiner trying to directly grant"
        },
        headers=owner_headers
    )
    assert res_owner_direct_grant.status_code == 403, "Examiners cannot directly grant re-attempts"

    # =========================================================================
    # TEST D: Unrelated Examiner cannot request re-attempt on another examiner's exam (403)
    # =========================================================================
    res_unrelated_req = client.post(
        "/api/exam-access/request",
        json={
            "exam_id": exam.id,
            "student_id": student.id,
            "reason": "Unauthorized examiner requesting"
        },
        headers=unrelated_headers
    )
    assert res_unrelated_req.status_code == 403
    assert "Examiners are strictly restricted" in res_unrelated_req.json()["detail"]

    # =========================================================================
    # TEST E: Owning Examiner requests re-attempt => status PENDING_ADMIN_APPROVAL
    # =========================================================================
    res_req = client.post(
        "/api/exam-access/request",
        json={
            "exam_id": exam.id,
            "student_id": student.id,
            "reason": "Candidate experienced verified technical disruption during attempt 1"
        },
        headers=owner_headers
    )
    assert res_req.status_code == 201
    perm_id = res_req.json()["id"]
    assert res_req.json()["status"] == "PENDING_ADMIN_APPROVAL"
    assert res_req.json()["requested_by_id"] == setup["owning_examiner"].id

    # =========================================================================
    # TEST F: While PENDING_ADMIN_APPROVAL, student cannot start session (403)
    # =========================================================================
    res_start_pending = client.post(f"/api/exams/{exam.id}/start-session", headers=student_headers)
    assert res_start_pending.status_code == 403
    assert "REATTEMPT_ACCESS_REQUIRED" in res_start_pending.json()["detail"]

    # =========================================================================
    # TEST G: Examiner cannot approve re-attempt (403 Forbidden)
    # =========================================================================
    res_owner_approve = client.post(
        f"/api/exam-access/{perm_id}/approve",
        json={"notes": "Examiner trying to approve"},
        headers=owner_headers
    )
    assert res_owner_approve.status_code == 403, "Examiner cannot approve re-attempt request"

    # =========================================================================
    # TEST H: Admin rejects re-attempt => status REJECTED => student still cannot start (403)
    # =========================================================================
    res_admin_reject = client.post(
        f"/api/exam-access/{perm_id}/reject",
        json={"notes": "Insufficient documentation of outage"},
        headers=admin_headers
    )
    assert res_admin_reject.status_code == 200
    assert res_admin_reject.json()["status"] == "REJECTED"

    # Student still blocked
    res_start_rejected = client.post(f"/api/exams/{exam.id}/start-session", headers=student_headers)
    assert res_start_rejected.status_code == 403
    assert "REATTEMPT_ACCESS_REQUIRED" in res_start_rejected.json()["detail"]

    # =========================================================================
    # TEST I: Owning Examiner re-submits with proof, Admin approves => ACTIVE
    # =========================================================================
    res_req2 = client.post(
        "/api/exam-access/request",
        json={
            "exam_id": exam.id,
            "student_id": student.id,
            "reason": "Submitted ISP outage certificate"
        },
        headers=owner_headers
    )
    assert res_req2.status_code == 201
    perm2_id = res_req2.json()["id"]
    assert res_req2.json()["status"] == "PENDING_ADMIN_APPROVAL"

    # Admin approves
    res_admin_approve = client.post(
        f"/api/exam-access/{perm2_id}/approve",
        json={"notes": "ISP documentation verified by Admin"},
        headers=admin_headers
    )
    assert res_admin_approve.status_code == 200
    assert res_admin_approve.json()["status"] == "ACTIVE"

    # Verify student exam detail now reports active reattempt
    res_exam_active = client.get(f"/api/exams/{exam.id}", headers=student_headers)
    assert res_exam_active.status_code == 200
    assert res_exam_active.json()["has_active_reattempt"] is True
    assert res_exam_active.json()["can_start"] is True

    # =========================================================================
    # TEST J: Student can now start Attempt #2 -> creates NEW independent session
    # =========================================================================
    res_s2 = client.post(f"/api/exams/{exam.id}/start-session", headers=student_headers)
    assert res_s2.status_code == 200
    s2_data = res_s2.json()
    s2_id = s2_data["session_id"]
    assert s2_id != s1_id, "Re-attempt must yield a NEW independent session ID"

    # Verify old session and result are preserved untouched
    db_session.expire_all()
    s1_check = db_session.query(ExamSession).filter(ExamSession.id == s1_id).first()
    assert s1_check is not None
    assert s1_check.status == "SUBMITTED"
    r1_check = db_session.query(Result).filter(Result.session_id == s1_id).first()
    assert r1_check is not None
    assert r1_check.total_marks == old_result_marks

    # Permission is consumed (status == "USED")
    consumed_perm = db_session.query(ExamAttemptPermission).filter(ExamAttemptPermission.id == perm2_id).first()
    assert consumed_perm.attempts_used == 1
    assert consumed_perm.status == "USED"

    # Submit Attempt #2
    res_sub2 = client.post(f"/api/sessions/{s2_id}/submit", headers=student_headers)
    assert res_sub2.status_code == 200
    assert res_sub2.json()["attempt_number"] == 2

    # Attempt #3 without permission fails
    res_start_unauthorized_3 = client.post(f"/api/exams/{exam.id}/start-session", headers=student_headers)
    assert res_start_unauthorized_3.status_code == 403
    assert "REATTEMPT_ACCESS_REQUIRED" in res_start_unauthorized_3.json()["detail"]

    # =========================================================================
    # TEST K: Admin directly grants re-attempt for Attempt #3 => all 3 preserved
    # =========================================================================
    res_admin_grant = client.post(
        "/api/exam-access/grant",
        json={
            "exam_id": exam.id,
            "student_id": student.id,
            "max_additional_attempts": 1,
            "reason": "Administrative executive grant for attempt 3"
        },
        headers=admin_headers
    )
    assert res_admin_grant.status_code == 201
    assert res_admin_grant.json()["status"] == "ACTIVE"

    # Student starts Attempt #3
    res_s3 = client.post(f"/api/exams/{exam.id}/start-session", headers=student_headers)
    assert res_s3.status_code == 200
    s3_id = res_s3.json()["session_id"]
    assert s3_id not in [s1_id, s2_id]

    # Verify all 3 sessions exist in database
    all_sessions = db_session.query(ExamSession).filter(
        ExamSession.exam_id == exam.id,
        ExamSession.student_id == student.id
    ).all()
    assert len(all_sessions) == 3
