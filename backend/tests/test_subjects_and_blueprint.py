import pytest
from datetime import datetime, timedelta, timezone
from fastapi import status
from sqlalchemy.orm import Session
from app.models.question import QuestionBank, Option, QuestionType, DifficultyLevel
from app.models.subject import Subject

def test_subject_management_and_taxonomy(client, admin_auth_headers, examiner_auth_headers, db_session: Session):
    """Test Admin can create and list subjects, and retrieve subject taxonomy."""
    # Seed a question with topic/subtopic
    q = QuestionBank(
        subject="Mathematics",
        topic="Calculus",
        subtopic="Integrals",
        question_text="Evaluate integral of x dx",
        question_type=QuestionType.MCQ,
        difficulty=DifficultyLevel.EASY,
        marks=2.0,
        is_active=True
    )
    db_session.add(q)
    db_session.commit()

    # 1. Admin creates a new subject
    timestamp = int(datetime.now(timezone.utc).timestamp())
    sub_code = f"SUB_{timestamp}"[:10]
    res = client.post(
        "/api/subjects/",
        json={
            "name": f"Robotics {timestamp}",
            "code": sub_code,
            "description": "Autonomous systems and kinematics.",
            "is_active": True
        },
        headers=admin_auth_headers
    )
    assert res.status_code == status.HTTP_201_CREATED
    data = res.json()
    assert data["code"] == sub_code.upper()

    # 2. Examiner lists subjects
    list_res = client.get("/api/subjects/", headers=examiner_auth_headers)
    assert list_res.status_code == status.HTTP_200_OK
    subjects = list_res.json()
    assert any(s["code"] == sub_code.upper() for s in subjects)

    # 3. Retrieve taxonomy
    tax_res = client.get("/api/subjects/Mathematics/taxonomy", headers=examiner_auth_headers)
    assert tax_res.status_code == status.HTTP_200_OK
    tax_data = tax_res.json()
    assert "taxonomy" in tax_data
    assert "Calculus" in tax_data["taxonomy"]

def test_question_bank_stats_and_pagination(client, examiner_auth_headers, db_session: Session):
    """Verify question stats endpoint and pagination limits (25, 50, 100, 250)."""
    # Seed 30 questions into test db
    for i in range(30):
        sub = "Mathematics" if i < 20 else "Physics"
        q = QuestionBank(
            subject=sub,
            question_text=f"Test Question #{i+1} for scaling check",
            question_type=QuestionType.MCQ,
            difficulty=DifficultyLevel.EASY if i % 2 == 0 else DifficultyLevel.MEDIUM,
            marks=2.0,
            is_active=True
        )
        db_session.add(q)
        db_session.flush()
        opt1 = Option(question_id=q.id, option_text="A", is_correct=True, option_order=0)
        opt2 = Option(question_id=q.id, option_text="B", is_correct=False, option_order=1)
        db_session.add_all([opt1, opt2])
    db_session.commit()

    # 1. Check stats summary
    res = client.get("/api/questions/stats/summary", headers=examiner_auth_headers)
    assert res.status_code == status.HTTP_200_OK
    stats = res.json()
    assert stats["total_questions"] >= 30
    assert stats["active_questions"] >= 30
    assert stats["by_subject"]["Mathematics"] >= 20
    assert stats["by_subject"]["Physics"] >= 10

    # 2. Test pagination with supported page sizes (25, 50, 100, 250)
    page_res = client.get("/api/questions?page=1&limit=25", headers=examiner_auth_headers)
    assert page_res.status_code == status.HTTP_200_OK
    assert len(page_res.json()) == 25

def test_mixed_subject_blueprint_distribution_and_sampling(client, examiner_auth_headers, student_auth_headers, db_session: Session):
    """Test mixed-subject exam blueprint generates paper with exact distribution and no duplicate IDs."""
    # Seed 10 Mathematics questions
    for i in range(10):
        q = QuestionBank(
            subject="Mathematics",
            question_text=f"Math Question #{i+1}",
            question_type=QuestionType.MCQ,
            difficulty=DifficultyLevel.EASY,
            marks=2.0,
            is_active=True
        )
        db_session.add(q)
        db_session.flush()
        opt1 = Option(question_id=q.id, option_text="Opt A", is_correct=True, option_order=0)
        opt2 = Option(question_id=q.id, option_text="Opt B", is_correct=False, option_order=1)
        db_session.add_all([opt1, opt2])

    # Seed 8 Computer Science questions
    for i in range(8):
        q = QuestionBank(
            subject="Computer Science",
            question_text=f"CS Question #{i+1}",
            question_type=QuestionType.MCQ,
            difficulty=DifficultyLevel.MEDIUM,
            marks=3.0,
            is_active=True
        )
        db_session.add(q)
        db_session.flush()
        opt1 = Option(question_id=q.id, option_text="Opt 1", is_correct=True, option_order=0)
        opt2 = Option(question_id=q.id, option_text="Opt 2", is_correct=False, option_order=1)
        db_session.add_all([opt1, opt2])
    db_session.commit()

    now = datetime.now(timezone.utc)
    start_time = (now - timedelta(minutes=5)).isoformat()
    end_time = (now + timedelta(hours=2)).isoformat()

    # Create mixed-subject exam: 6 Math + 4 CS = 10 total questions
    create_res = client.post(
        "/api/exams",
        json={
            "name": "Mixed STEM Assessment",
            "subject": "Mathematics",
            "duration_minutes": 45,
            "start_time": start_time,
            "end_time": end_time,
            "total_questions": 10,
            "maximum_marks": 25.0,
            "randomize_questions": True,
            "question_selection_rules": [
                {
                    "subject": "Mathematics",
                    "difficulty": "EASY",
                    "question_type": "MCQ",
                    "count": 6
                },
                {
                    "subject": "Computer Science",
                    "difficulty": "MEDIUM",
                    "question_type": "MCQ",
                    "count": 4
                }
            ]
        },
        headers=examiner_auth_headers
    )
    assert create_res.status_code == status.HTTP_201_CREATED
    exam = create_res.json()
    exam_id = exam["id"]

    # Student registers for exam
    client.post(f"/api/exams/{exam_id}/register", headers=student_auth_headers)

    # Student accepts instructions
    client.post(f"/api/exams/{exam_id}/instructions/accept", headers=student_auth_headers)

    # Student generates paper
    paper_res = client.post(f"/api/exams/{exam_id}/generate-paper", headers=student_auth_headers)
    assert paper_res.status_code == status.HTTP_200_OK
    paper = paper_res.json()
    questions = paper["questions"]

    # Invariants verification
    assert len(questions) == 10
    q_ids = [q["id"] for q in questions]
    assert len(set(q_ids)) == 10  # No duplicate question IDs

    # Verify exact distribution
    math_count = sum(1 for q in questions if q["subject"] == "Mathematics")
    cs_count = sum(1 for q in questions if q["subject"] == "Computer Science")
    assert math_count == 6
    assert cs_count == 4

    # Ensure student NEVER receives correct answers
    for q in questions:
        for opt in q["options"]:
            assert "is_correct" not in opt
