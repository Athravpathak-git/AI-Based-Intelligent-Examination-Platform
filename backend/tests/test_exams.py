from datetime import datetime, timedelta, timezone
from fastapi import status

def test_create_valid_exam(client, examiner_auth_headers):
    """Test creating an exam with valid configuration."""
    now = datetime.now(timezone.utc)
    start = now + timedelta(hours=1)
    end = now + timedelta(hours=3)

    # Seed 2 questions for Math
    client.post(
        "/api/questions",
        json={
            "subject": "Mathematics",
            "question_text": "Solve x + 2 = 5",
            "question_type": "SHORT_ANSWER",
            "difficulty": "EASY",
            "marks": 2.0
        },
        headers=examiner_auth_headers
    )
    client.post(
        "/api/questions",
        json={
            "subject": "Mathematics",
            "question_text": "Derivative of x^2?",
            "question_type": "SHORT_ANSWER",
            "difficulty": "MEDIUM",
            "marks": 3.0
        },
        headers=examiner_auth_headers
    )

    response = client.post(
        "/api/exams",
        json={
            "name": "Midterm Calculus",
            "subject": "Mathematics",
            "duration_minutes": 60,
            "start_time": start.isoformat(),
            "end_time": end.isoformat(),
            "total_questions": 2,
            "maximum_marks": 5.0,
            "negative_marking_enabled": True,
            "randomize_questions": True,
            "randomize_options": True,
            "per_student_unique_paper": True,
            "maximum_tab_switch_warnings": 3,
            "webcam_monitoring_enabled": True,
            "gaze_sensitivity": 0.6
        },
        headers=examiner_auth_headers
    )
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["name"] == "Midterm Calculus"
    assert data["duration_minutes"] == 60
    assert data["negative_marking_enabled"] is True
    assert data["gaze_sensitivity"] == 0.6

def test_invalid_exam_timing_rejected(client, examiner_auth_headers):
    """Test exam with end_time before or equal to start_time is rejected."""
    now = datetime.now(timezone.utc)
    response = client.post(
        "/api/exams",
        json={
            "name": "Invalid Timing Exam",
            "subject": "Mathematics",
            "duration_minutes": 30,
            "start_time": (now + timedelta(hours=2)).isoformat(),
            "end_time": (now + timedelta(hours=1)).isoformat(),  # Before start!
            "total_questions": 1,
            "maximum_marks": 10.0
        },
        headers=examiner_auth_headers
    )
    assert response.status_code in [status.HTTP_400_BAD_REQUEST, status.HTTP_422_UNPROCESSABLE_ENTITY]

def test_invalid_duration_and_marks_rejected(client, examiner_auth_headers):
    """Test duration <= 0, total_questions <= 0, and maximum_marks <= 0 are rejected."""
    now = datetime.now(timezone.utc)
    start = (now + timedelta(hours=1)).isoformat()
    end = (now + timedelta(hours=2)).isoformat()

    # Zero duration
    res1 = client.post(
        "/api/exams",
        json={
            "name": "Zero Duration",
            "subject": "Mathematics",
            "duration_minutes": 0,
            "start_time": start,
            "end_time": end,
            "total_questions": 1,
            "maximum_marks": 10.0
        },
        headers=examiner_auth_headers
    )
    assert res1.status_code in [status.HTTP_400_BAD_REQUEST, status.HTTP_422_UNPROCESSABLE_ENTITY]

    # Negative gaze sensitivity
    res2 = client.post(
        "/api/exams",
        json={
            "name": "Bad Gaze",
            "subject": "Mathematics",
            "duration_minutes": 30,
            "start_time": start,
            "end_time": end,
            "total_questions": 1,
            "maximum_marks": 10.0,
            "gaze_sensitivity": -0.2
        },
        headers=examiner_auth_headers
    )
    assert res2.status_code in [status.HTTP_400_BAD_REQUEST, status.HTTP_422_UNPROCESSABLE_ENTITY]

def test_question_selection_rules_shortage_rejected(client, examiner_auth_headers):
    """Test that requesting more questions than exist in question bank returns clear shortage error."""
    now = datetime.now(timezone.utc)
    start = (now + timedelta(hours=1)).isoformat()
    end = (now + timedelta(hours=2)).isoformat()

    # Request 5 HARD MCQ in Physics when none exist
    response = client.post(
        "/api/exams",
        json={
            "name": "Quantum Physics Exam",
            "subject": "Physics",
            "duration_minutes": 90,
            "start_time": start,
            "end_time": end,
            "total_questions": 5,
            "maximum_marks": 20.0,
            "question_selection_rules": [
                {
                    "subject": "Physics",
                    "difficulty": "HARD",
                    "question_type": "MCQ",
                    "count": 5
                }
            ]
        },
        headers=examiner_auth_headers
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    detail = response.json()["detail"]
    assert "Insufficient questions" in detail
    assert "HARD" in detail
