import pytest
from fastapi import status

def test_create_valid_mcq(client, examiner_auth_headers):
    """Test creating a valid MCQ with exactly one correct option."""
    response = client.post(
        "/api/questions",
        json={
            "subject": "Physics",
            "question_text": "What is the speed of light in vacuum?",
            "question_type": "MCQ",
            "difficulty": "EASY",
            "marks": 2.0,
            "negative_marks": 0.5,
            "options": [
                {"option_text": "3 x 10^8 m/s", "is_correct": True, "option_order": 0},
                {"option_text": "3 x 10^6 m/s", "is_correct": False, "option_order": 1},
                {"option_text": "1.5 x 10^8 m/s", "is_correct": False, "option_order": 2}
            ]
        },
        headers=examiner_auth_headers
    )
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["subject"] == "Physics"
    assert data["marks"] == 2.0
    assert data["negative_marks"] == 0.5
    assert len(data["options"]) == 3

def test_mcq_zero_correct_options_rejected(client, examiner_auth_headers):
    """Test MCQ with zero correct options returns 400 Bad Request."""
    response = client.post(
        "/api/questions",
        json={
            "subject": "Physics",
            "question_text": "Faulty MCQ with no correct answer",
            "question_type": "MCQ",
            "difficulty": "EASY",
            "marks": 1.0,
            "negative_marks": 0.0,
            "options": [
                {"option_text": "Wrong A", "is_correct": False},
                {"option_text": "Wrong B", "is_correct": False}
            ]
        },
        headers=examiner_auth_headers
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "exactly 1 correct option" in response.json()["detail"]

def test_mcq_multiple_correct_options_rejected(client, examiner_auth_headers):
    """Test MCQ with multiple correct options returns 400 Bad Request."""
    response = client.post(
        "/api/questions",
        json={
            "subject": "Physics",
            "question_text": "Faulty MCQ with two correct answers",
            "question_type": "MCQ",
            "difficulty": "EASY",
            "marks": 1.0,
            "negative_marks": 0.0,
            "options": [
                {"option_text": "Option 1", "is_correct": True},
                {"option_text": "Option 2", "is_correct": True}
            ]
        },
        headers=examiner_auth_headers
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "exactly 1 correct option" in response.json()["detail"]

def test_create_valid_multi_select(client, examiner_auth_headers):
    """Test creating a valid MULTI_SELECT with at least 2 correct options."""
    response = client.post(
        "/api/questions",
        json={
            "subject": "Computer Science",
            "question_text": "Which of the following are relational database management systems?",
            "question_type": "MULTI_SELECT",
            "difficulty": "MEDIUM",
            "marks": 3.0,
            "negative_marks": 1.0,
            "options": [
                {"option_text": "PostgreSQL", "is_correct": True, "option_order": 0},
                {"option_text": "MySQL", "is_correct": True, "option_order": 1},
                {"option_text": "Redis", "is_correct": False, "option_order": 2}
            ]
        },
        headers=examiner_auth_headers
    )
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["question_type"] == "MULTI_SELECT"
    assert len(data["options"]) == 3

def test_multi_select_single_correct_rejected(client, examiner_auth_headers):
    """Test MULTI_SELECT with only 1 correct option returns 400 Bad Request."""
    response = client.post(
        "/api/questions",
        json={
            "subject": "Computer Science",
            "question_text": "Invalid multi-select",
            "question_type": "MULTI_SELECT",
            "difficulty": "MEDIUM",
            "marks": 2.0,
            "options": [
                {"option_text": "Option A", "is_correct": True},
                {"option_text": "Option B", "is_correct": False}
            ]
        },
        headers=examiner_auth_headers
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "at least 2 correct options" in response.json()["detail"]

def test_create_text_and_image_questions(client, examiner_auth_headers):
    """Test creating SHORT_ANSWER, LONG_ANSWER, and IMAGE_UPLOAD question types."""
    for q_type in ["SHORT_ANSWER", "LONG_ANSWER", "IMAGE_UPLOAD"]:
        response = client.post(
            "/api/questions",
            json={
                "subject": "Biology",
                "question_text": f"Sample {q_type} prompt",
                "question_type": q_type,
                "difficulty": "HARD",
                "marks": 5.0,
                "negative_marks": 0.0,
                "expected_answer": "Expected key concepts",
                "model_answer": "Complete model essay answer"
            },
            headers=examiner_auth_headers
        )
        assert response.status_code == status.HTTP_201_CREATED
        assert response.json()["question_type"] == q_type

def test_invalid_marks_rejected(client, examiner_auth_headers):
    """Test non-positive marks and negative negative_marks are rejected."""
    # Zero marks
    res1 = client.post(
        "/api/questions",
        json={
            "subject": "Math",
            "question_text": "Sample",
            "question_type": "SHORT_ANSWER",
            "marks": 0.0
        },
        headers=examiner_auth_headers
    )
    assert res1.status_code in [status.HTTP_400_BAD_REQUEST, status.HTTP_422_UNPROCESSABLE_ENTITY]

    # Negative negative_marks
    res2 = client.post(
        "/api/questions",
        json={
            "subject": "Math",
            "question_text": "Sample",
            "question_type": "SHORT_ANSWER",
            "marks": 2.0,
            "negative_marks": -1.0
        },
        headers=examiner_auth_headers
    )
    assert res2.status_code in [status.HTTP_400_BAD_REQUEST, status.HTTP_422_UNPROCESSABLE_ENTITY]

def test_filter_questions(client, examiner_auth_headers):
    """Test filtering questions by subject, difficulty, and question_type."""
    # Seed 3 questions
    client.post(
        "/api/questions",
        json={
            "subject": "Chemistry",
            "question_text": "Water formula?",
            "question_type": "MCQ",
            "difficulty": "EASY",
            "marks": 1.0,
            "options": [{"option_text": "H2O", "is_correct": True}, {"option_text": "CO2", "is_correct": False}]
        },
        headers=examiner_auth_headers
    )
    client.post(
        "/api/questions",
        json={
            "subject": "Chemistry",
            "question_text": "Explain chemical bonding.",
            "question_type": "LONG_ANSWER",
            "difficulty": "HARD",
            "marks": 10.0
        },
        headers=examiner_auth_headers
    )

    # Filter by subject
    res = client.get("/api/questions?subject=Chemistry", headers=examiner_auth_headers)
    assert res.status_code == status.HTTP_200_OK
    assert len(res.json()) >= 2

    # Filter by difficulty
    res_diff = client.get("/api/questions?subject=Chemistry&difficulty=HARD", headers=examiner_auth_headers)
    assert res_diff.status_code == status.HTTP_200_OK
    assert all(q["difficulty"] == "HARD" for q in res_diff.json())

    # Combined filter
    res_combo = client.get("/api/questions?subject=Chemistry&difficulty=EASY&question_type=MCQ", headers=examiner_auth_headers)
    assert res_combo.status_code == status.HTTP_200_OK
    assert len(res_combo.json()) >= 1
    assert res_combo.json()[0]["question_type"] == "MCQ"

def test_update_and_delete_question(client, examiner_auth_headers):
    """Test updating and deleting questions."""
    create_res = client.post(
        "/api/questions",
        json={
            "subject": "History",
            "question_text": "Original text?",
            "question_type": "SHORT_ANSWER",
            "difficulty": "MEDIUM",
            "marks": 2.0
        },
        headers=examiner_auth_headers
    )
    q_id = create_res.json()["id"]

    # Update
    update_res = client.put(
        f"/api/questions/{q_id}",
        json={"question_text": "Updated question text?"},
        headers=examiner_auth_headers
    )
    assert update_res.status_code == status.HTTP_200_OK
    assert update_res.json()["question_text"] == "Updated question text?"

    # Delete
    delete_res = client.delete(f"/api/questions/{q_id}", headers=examiner_auth_headers)
    assert delete_res.status_code == status.HTTP_204_NO_CONTENT

    # Verify not found
    get_res = client.get(f"/api/questions/{q_id}", headers=examiner_auth_headers)
    assert get_res.status_code == status.HTTP_404_NOT_FOUND
