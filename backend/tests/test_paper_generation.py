from datetime import datetime, timedelta, timezone
from fastapi import status
from app.core.security import create_access_token

def seed_test_questions(client, examiner_auth_headers, subject="Geometry", count=10):
    """Seed multiple MCQ questions for testing randomization."""
    for i in range(count):
        difficulty = "EASY" if i < 5 else "HARD"
        client.post(
            "/api/questions",
            json={
                "subject": subject,
                "question_text": f"Geometry Question #{i+1} concerning angles and shapes?",
                "question_type": "MCQ",
                "difficulty": difficulty,
                "marks": 2.0,
                "negative_marks": 0.5,
                "options": [
                    {"option_text": f"Answer Option A{i}", "is_correct": True, "option_order": 0},
                    {"option_text": f"Answer Option B{i}", "is_correct": False, "option_order": 1},
                    {"option_text": f"Answer Option C{i}", "is_correct": False, "option_order": 2},
                    {"option_text": f"Answer Option D{i}", "is_correct": False, "option_order": 3}
                ]
            },
            headers=examiner_auth_headers
        )

def test_paper_generation_timing_restrictions(client, examiner_auth_headers, student_auth_headers):
    """Test start window validation: before start, inside window, and after end."""
    now = datetime.now(timezone.utc)
    seed_test_questions(client, examiner_auth_headers, subject="Algebra", count=5)

    # 1. Exam scheduled in future
    future_exam = client.post(
        "/api/exams",
        json={
            "name": "Future Exam",
            "subject": "Algebra",
            "duration_minutes": 30,
            "start_time": (now + timedelta(hours=2)).isoformat(),
            "end_time": (now + timedelta(hours=4)).isoformat(),
            "total_questions": 3,
            "maximum_marks": 6.0
        },
        headers=examiner_auth_headers
    ).json()

    res_future = client.post(
        f"/api/exams/{future_exam['id']}/generate-paper",
        headers=student_auth_headers
    )
    assert res_future.status_code == status.HTTP_400_BAD_REQUEST
    assert "has not started yet" in res_future.json()["detail"]

    # 2. Exam ended in past
    past_exam = client.post(
        "/api/exams",
        json={
            "name": "Past Exam",
            "subject": "Algebra",
            "duration_minutes": 30,
            "start_time": (now - timedelta(hours=5)).isoformat(),
            "end_time": (now - timedelta(hours=2)).isoformat(),
            "total_questions": 3,
            "maximum_marks": 6.0
        },
        headers=examiner_auth_headers
    ).json()

    res_past = client.post(
        f"/api/exams/{past_exam['id']}/generate-paper",
        headers=student_auth_headers
    )
    assert res_past.status_code == status.HTTP_400_BAD_REQUEST
    assert "window has ended" in res_past.json()["detail"]

    # 3. Active exam
    active_exam = client.post(
        "/api/exams",
        json={
            "name": "Active Exam",
            "subject": "Algebra",
            "duration_minutes": 30,
            "start_time": (now - timedelta(minutes=15)).isoformat(),
            "end_time": (now + timedelta(minutes=45)).isoformat(),
            "total_questions": 3,
            "maximum_marks": 6.0
        },
        headers=examiner_auth_headers
    ).json()

    res_active = client.post(
        f"/api/exams/{active_exam['id']}/generate-paper",
        headers=student_auth_headers
    )
    assert res_active.status_code == status.HTTP_200_OK
    assert len(res_active.json()["questions"]) == 3

def test_paper_generation_is_deterministic_per_student(client, examiner_auth_headers, student_auth_headers):
    """Test that the same student receives the EXACT same paper on repeat generation calls."""
    now = datetime.now(timezone.utc)
    seed_test_questions(client, examiner_auth_headers, subject="DeterminismTest", count=8)

    exam = client.post(
        "/api/exams",
        json={
            "name": "Deterministic Exam",
            "subject": "DeterminismTest",
            "duration_minutes": 45,
            "start_time": (now - timedelta(minutes=10)).isoformat(),
            "end_time": (now + timedelta(minutes=50)).isoformat(),
            "total_questions": 4,
            "maximum_marks": 8.0,
            "randomize_questions": True,
            "randomize_options": True,
            "per_student_unique_paper": True
        },
        headers=examiner_auth_headers
    ).json()

    # Call 1
    res1 = client.post(f"/api/exams/{exam['id']}/generate-paper", headers=student_auth_headers)
    assert res1.status_code == status.HTTP_200_OK
    data1 = res1.json()

    # Call 2
    res2 = client.post(f"/api/exams/{exam['id']}/generate-paper", headers=student_auth_headers)
    assert res2.status_code == status.HTTP_200_OK
    data2 = res2.json()

    # Verify questions and option orders are identical
    q_ids1 = [q["id"] for q in data1["questions"]]
    q_ids2 = [q["id"] for q in data2["questions"]]
    assert q_ids1 == q_ids2, "Same student must receive identical questions across regeneration"

    for q1, q2 in zip(data1["questions"], data2["questions"]):
        opt_ids1 = [o["id"] for o in q1["options"]]
        opt_ids2 = [o["id"] for o in q2["options"]]
        assert opt_ids1 == opt_ids2, "Same student must receive identical option order"

def test_paper_generation_security_strips_correct_answer(client, examiner_auth_headers, student_auth_headers):
    """Verify that is_correct is never exposed to students in the generated paper."""
    now = datetime.now(timezone.utc)
    seed_test_questions(client, examiner_auth_headers, subject="SecuritySubject", count=3)

    exam = client.post(
        "/api/exams",
        json={
            "name": "Security Exam",
            "subject": "SecuritySubject",
            "duration_minutes": 30,
            "start_time": (now - timedelta(minutes=5)).isoformat(),
            "end_time": (now + timedelta(minutes=25)).isoformat(),
            "total_questions": 2,
            "maximum_marks": 4.0
        },
        headers=examiner_auth_headers
    ).json()

    response = client.post(f"/api/exams/{exam['id']}/generate-paper", headers=student_auth_headers)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()

    for q in data["questions"]:
        assert "expected_answer" not in q
        assert "model_answer" not in q
        for opt in q["options"]:
            assert "is_correct" not in opt, "Security violation: is_correct exposed in student payload!"

def test_different_students_receive_different_papers(client, examiner_auth_headers, db_session):
    """Test that two different students receive different question permutations from a pool."""
    now = datetime.now(timezone.utc)
    seed_test_questions(client, examiner_auth_headers, subject="VariationPool", count=15)

    from app.models.user import User, UserRole
    from app.core.security import hash_password
    s1 = User(id=101, name="Student 1", email="s101@test.com", password_hash=hash_password("p1"), role=UserRole.STUDENT)
    s2 = User(id=202, name="Student 2", email="s202@test.com", password_hash=hash_password("p2"), role=UserRole.STUDENT)
    db_session.add(s1)
    db_session.add(s2)
    db_session.commit()

    exam = client.post(
        "/api/exams",
        json={
            "name": "Variation Exam",
            "subject": "VariationPool",
            "duration_minutes": 60,
            "start_time": (now - timedelta(minutes=5)).isoformat(),
            "end_time": (now + timedelta(minutes=55)).isoformat(),
            "total_questions": 5,
            "maximum_marks": 10.0,
            "randomize_questions": True,
            "randomize_options": True,
            "per_student_unique_paper": True
        },
        headers=examiner_auth_headers
    ).json()

    # Token for student 101
    token1 = create_access_token({"sub": "101", "email": "s101@test.com", "role": "STUDENT"})
    res1 = client.post(f"/api/exams/{exam['id']}/generate-paper", headers={"Authorization": f"Bearer {token1}"})

    # Token for student 202
    token2 = create_access_token({"sub": "202", "email": "s202@test.com", "role": "STUDENT"})
    res2 = client.post(f"/api/exams/{exam['id']}/generate-paper", headers={"Authorization": f"Bearer {token2}"})

    assert res1.status_code == status.HTTP_200_OK
    assert res2.status_code == status.HTTP_200_OK

    q_ids1 = [q["id"] for q in res1.json()["questions"]]
    q_ids2 = [q["id"] for q in res2.json()["questions"]]

    # With 15 questions choosing 5, permutations are extremely unlikely to collide
    assert q_ids1 != q_ids2, "Different students should receive different randomized papers"
