import pytest
from fastapi import status

def test_user_registration(client):
    """Test successful user registration."""
    response = client.post(
        "/api/auth/register",
        json={
            "name": "Jane Student",
            "email": "jane@example.com",
            "password": "securepassword123",
            "role": "STUDENT"
        }
    )
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["name"] == "Jane Student"
    assert data["email"] == "jane@example.com"
    assert data["role"] == "STUDENT"
    assert "password_hash" not in data

def test_duplicate_email_registration_rejected(client, test_student):
    """Test registration with existing email is rejected with 409 Conflict."""
    response = client.post(
        "/api/auth/register",
        json={
            "name": "Another Student",
            "email": test_student.email,
            "password": "password456",
            "role": "STUDENT"
        }
    )
    assert response.status_code == status.HTTP_409_CONFLICT
    assert "already exists" in response.json()["detail"]

def test_login_success(client, test_student):
    """Test login with valid credentials."""
    response = client.post(
        "/api/auth/login",
        json={"email": test_student.email, "password": "student123"}
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["role"] == "STUDENT"
    assert data["user_id"] == test_student.id

def test_login_invalid_password(client, test_student):
    """Test login with incorrect password is rejected with 401 Unauthorized."""
    response = client.post(
        "/api/auth/login",
        json={"email": test_student.email, "password": "wrongpassword"}
    )
    assert response.status_code == status.HTTP_401_UNAUTHORIZED

def test_login_nonexistent_user(client):
    """Test login with non-registered email."""
    response = client.post(
        "/api/auth/login",
        json={"email": "nobody@example.com", "password": "anypassword"}
    )
    assert response.status_code == status.HTTP_401_UNAUTHORIZED

def test_get_current_user_profile(client, student_auth_headers, test_student):
    """Test GET /api/auth/me returns authenticated user."""
    response = client.get("/api/auth/me", headers=student_auth_headers)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["email"] == test_student.email
    assert data["id"] == test_student.id

def test_unauthenticated_request_rejected(client):
    """Test accessing protected route without token returns 401."""
    response = client.get("/api/auth/me")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED

def test_student_forbidden_from_examiner_endpoints(client, student_auth_headers):
    """Test student role is forbidden (403) from creating questions."""
    response = client.post(
        "/api/questions",
        json={
            "subject": "Mathematics",
            "question_text": "What is 2 + 2?",
            "question_type": "MCQ",
            "difficulty": "EASY",
            "marks": 1.0,
            "negative_marks": 0.0,
            "options": [
                {"option_text": "3", "is_correct": False},
                {"option_text": "4", "is_correct": True}
            ]
        },
        headers=student_auth_headers
    )
    assert response.status_code == status.HTTP_403_FORBIDDEN
