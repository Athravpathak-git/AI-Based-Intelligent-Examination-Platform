import uuid
from datetime import datetime, timedelta, timezone
import pytest
from app.core.security import create_access_token

def get_auth_token(client, email: str, password: str) -> str:
    res = client.post("/api/auth/login", json={"email": email, "password": password})
    return res.json()["access_token"]

def test_student_registration_with_comprehensive_profile(client):
    email = f"profile_stu_{uuid.uuid4().hex[:6]}@univ.edu"
    payload = {
        "name": "Jane Doe",
        "email": email,
        "password": "securepassword123",
        "role": "STUDENT",
        "date_of_birth": "2002-05-15",
        "gender": "Female",
        "mobile_number": "+91 9876543210",
        "college": "MIT College of Engineering",
        "university": "State Technical University",
        "course": "B.Tech",
        "specialization": "Computer Science",
        "year_semester": "4th Year / 7th Sem",
        "enrollment_number": "ENR-2022-9988",
        "graduation_year": 2026,
        "address": "123 Technology Park",
        "city": "Pune",
        "state": "Maharashtra",
        "country": "India",
        "pin_code": "411001"
    }

    res = client.post("/api/auth/register", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert data["email"] == email
    assert data["role"] == "STUDENT"
    assert data["registration_number"] is not None
    assert data["registration_number"].startswith("STU-")

    token = get_auth_token(client, email, "securepassword123")
    headers = {"Authorization": f"Bearer {token}"}
    me_res = client.get("/api/auth/me", headers=headers)
    assert me_res.status_code == 200

def test_candidate_roster_and_csv_export(client, test_examiner, examiner_auth_headers, test_admin, admin_auth_headers):
    client.post(
        "/api/questions",
        json={
            "subject": "Physics",
            "question_text": f"What is Newton's second law? {uuid.uuid4().hex[:4]}",
            "question_type": "SHORT_ANSWER",
            "difficulty": "EASY",
            "marks": 5.0
        },
        headers=examiner_auth_headers
    )

    now = datetime.now(timezone.utc)
    exam_payload = {
        "name": f"Physics Midterm {uuid.uuid4().hex[:6]}",
        "subject": "Physics",
        "duration_minutes": 45,
        "start_time": (now - timedelta(minutes=5)).isoformat(),
        "end_time": (now + timedelta(hours=2)).isoformat(),
        "total_questions": 1,
        "maximum_marks": 5.0,
        "negative_marking_enabled": False
    }
    exam_res = client.post("/api/exams", json=exam_payload, headers=examiner_auth_headers)
    assert exam_res.status_code == 201
    exam_id = exam_res.json()["id"]

    stu_email = f"candidate_csv_{uuid.uuid4().hex[:6]}@college.edu"
    client.post(
        "/api/auth/register",
        json={
            "name": "Candidate Alice",
            "email": stu_email,
            "password": "password123",
            "role": "STUDENT",
            "college": "Imperial College",
            "course": "Mechanical Engineering"
        }
    )
    stu_token = get_auth_token(client, stu_email, "password123")
    stu_headers = {"Authorization": f"Bearer {stu_token}"}

    reg_res = client.post(f"/api/exams/{exam_id}/register", headers=stu_headers)
    assert reg_res.status_code == 201

    candidates_res = client.get(f"/api/exams/{exam_id}/candidates", headers=examiner_auth_headers)
    assert candidates_res.status_code == 200
    candidates = candidates_res.json()
    assert len(candidates) >= 1
    alice = next((c for c in candidates if c["email"] == stu_email), None)
    assert alice is not None
    assert alice["college"] == "Imperial College"
    assert alice["course"] == "Mechanical Engineering"
    assert alice["attempt_status"] == "NOT_STARTED"

    csv_res = client.get(f"/api/exams/{exam_id}/candidates/export/csv", headers=examiner_auth_headers)
    assert csv_res.status_code == 200
    assert "Candidate Name" in csv_res.text
    assert "Candidate Alice" in csv_res.text
    assert "Imperial College" in csv_res.text

    admin_csv_res = client.get("/api/exams/admin/candidates/export/csv", headers=admin_auth_headers)
    assert admin_csv_res.status_code == 200
    assert "Candidate Alice" in admin_csv_res.text

def test_subjective_review_and_scoring(client, test_examiner, examiner_auth_headers):
    q_res = client.post(
        "/api/questions",
        json={
            "subject": "Philosophy",
            "question_text": f"Discuss utilitarianism vs deontology {uuid.uuid4().hex[:4]}",
            "question_type": "LONG_ANSWER",
            "difficulty": "HARD",
            "marks": 10.0
        },
        headers=examiner_auth_headers
    )
    assert q_res.status_code == 201
    q_id = q_res.json()["id"]

    now = datetime.now(timezone.utc)
    exam_res = client.post(
        "/api/exams",
        json={
            "name": f"Ethics Exam {uuid.uuid4().hex[:6]}",
            "subject": "Philosophy",
            "duration_minutes": 60,
            "start_time": (now - timedelta(minutes=5)).isoformat(),
            "end_time": (now + timedelta(hours=3)).isoformat(),
            "total_questions": 1,
            "maximum_marks": 10.0,
            "negative_marking_enabled": False
        },
        headers=examiner_auth_headers
    )
    exam_id = exam_res.json()["id"]

    stu_email = f"ethics_student_{uuid.uuid4().hex[:6]}@test.com"
    client.post(
        "/api/auth/register",
        json={"name": "Ethics Student", "email": stu_email, "password": "password123", "role": "STUDENT"}
    )
    stu_token = get_auth_token(client, stu_email, "password123")
    stu_headers = {"Authorization": f"Bearer {stu_token}"}

    client.post(f"/api/exams/{exam_id}/register", headers=stu_headers)
    session_res = client.post(f"/api/exams/{exam_id}/start-session", headers=stu_headers)
    assert session_res.status_code == 200
    session_id = session_res.json()["session_id"]

    save_res = client.post(
        f"/api/sessions/{session_id}/save-answer",
        json={
            "question_id": q_id,
            "text_answer": "Kant argued for categorical imperatives...",
            "is_marked_for_review": True
        },
        headers=stu_headers
    )
    assert save_res.status_code == 200
    assert save_res.json()["is_marked_for_review"] is True

    submit_res = client.post(f"/api/sessions/{session_id}/submit", headers=stu_headers)
    assert submit_res.status_code == 200
    submit_data = submit_res.json()
    result_id = submit_data["result_id"]

    assert submit_data["status"] == "UNDER_REVIEW"
    assert submit_data["breakdown"][0]["is_marked_for_review"] is True

    review_res = client.put(
        f"/api/results/{result_id}/review",
        json={
            "question_reviews": [
                {
                    "question_id": q_id,
                    "marks_awarded": 8.5,
                    "feedback": "Thorough argument and strong philosophical analysis."
                }
            ],
            "status": "PASSED"
        },
        headers=examiner_auth_headers
    )
    assert review_res.status_code == 200
    rev_data = review_res.json()
    assert rev_data["total_marks"] == 8.5
    assert rev_data["percentage"] == 85.0
    assert rev_data["status"] == "PASSED"
    assert rev_data["passed"] is True
