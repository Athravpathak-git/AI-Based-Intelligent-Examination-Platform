from datetime import datetime, timedelta, timezone
import pytest
from fastapi.testclient import TestClient
from app.main import app

def test_student_exam_registration_flow(client, test_student, test_examiner, examiner_auth_headers, student_auth_headers):
    """Verify student exam registration, duplicate prevention, and candidate listing."""
    # Seed questions for subject
    client.post(
        "/api/questions",
        json={"subject": "Mathematics", "question_text": "Q1 for registration test", "question_type": "SHORT_ANSWER", "difficulty": "EASY", "marks": 5.0},
        headers=examiner_auth_headers
    )
    client.post(
        "/api/questions",
        json={"subject": "Mathematics", "question_text": "Q2 for registration test", "question_type": "SHORT_ANSWER", "difficulty": "EASY", "marks": 5.0},
        headers=examiner_auth_headers
    )

    now = datetime.now(timezone.utc)
    # 1. Create an upcoming exam
    exam_payload = {
        "name": "Physics Quantum Midterm",
        "subject": "Mathematics",
        "duration_minutes": 60,
        "start_time": (now + timedelta(hours=2)).isoformat(),
        "end_time": (now + timedelta(hours=5)).isoformat(),
        "total_questions": 2,
        "maximum_marks": 10.0,
        "negative_marking_enabled": True,
        "webcam_monitoring_enabled": True
    }
    create_res = client.post(
        "/api/exams",
        json=exam_payload,
        headers=examiner_auth_headers
    )
    assert create_res.status_code == 201
    exam_id = create_res.json()["id"]

    # 2. Register student for this exam
    reg_res = client.post(
        f"/api/exams/{exam_id}/register",
        headers=student_auth_headers
    )
    assert reg_res.status_code == 201
    data = reg_res.json()
    assert data["exam_id"] == exam_id
    assert data["status"] == "REGISTERED"

    # 3. Duplicate registration rejected
    dup_res = client.post(
        f"/api/exams/{exam_id}/register",
        headers=student_auth_headers
    )
    assert dup_res.status_code == 409

    # 4. Student sees registered exam in my-registrations
    my_regs = client.get(
        "/api/exams/my-registrations",
        headers=student_auth_headers
    )
    assert my_regs.status_code == 200
    my_exam_ids = [r["exam_id"] for r in my_regs.json()]
    assert exam_id in my_exam_ids

    # 5. Examiner sees registered candidate
    cand_res = client.get(
        f"/api/exams/{exam_id}/candidates",
        headers=examiner_auth_headers
    )
    assert cand_res.status_code == 200
    candidates = cand_res.json()
    assert len(candidates) >= 1
    emails = [c["email"] for c in candidates]
    assert "student@exam.com" in emails
    assert candidates[0]["registration_number"] is not None

    # 6. Student can cancel registration before exam starts
    cancel_res = client.delete(
        f"/api/exams/{exam_id}/register",
        headers=student_auth_headers
    )
    assert cancel_res.status_code == 200

    # 7. Re-registration works after cancellation
    rereg_res = client.post(
        f"/api/exams/{exam_id}/register",
        headers=student_auth_headers
    )
    assert rereg_res.status_code == 201


