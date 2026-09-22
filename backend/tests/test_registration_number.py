import re
import uuid
import pytest
from fastapi.testclient import TestClient
from app.main import app

def unique_email(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:8]}@test.com"

def test_student_auto_registration_number(client: TestClient):
    """Verify newly registered student automatically receives a unique STU-YYYY-XXXXXX number."""
    email = unique_email("david_student")
    response = client.post(
        "/api/auth/register",
        json={
            "name": "David Student",
            "email": email,
            "password": "password123",
            "role": "STUDENT"
        }
    )
    assert response.status_code == 201
    data = response.json()
    assert "registration_number" in data
    reg_num = data["registration_number"]
    assert reg_num is not None
    assert re.match(r"^STU-\d{4}-\d{6}$", reg_num)

def test_sequential_registration_numbers(client: TestClient):
    """Verify consecutive registrations increment the sequence number."""
    email1 = unique_email("seq1")
    res1 = client.post(
        "/api/auth/register",
        json={
            "name": "Seq Student One",
            "email": email1,
            "password": "password123",
            "role": "STUDENT"
        }
    )
    assert res1.status_code == 201
    reg1 = res1.json()["registration_number"]

    email2 = unique_email("seq2")
    res2 = client.post(
        "/api/auth/register",
        json={
            "name": "Seq Student Two",
            "email": email2,
            "password": "password123",
            "role": "STUDENT"
        }
    )
    assert res2.status_code == 201
    reg2 = res2.json()["registration_number"]

    assert reg1 != reg2
    seq1 = int(reg1.split("-")[-1])
    seq2 = int(reg2.split("-")[-1])
    assert seq2 == seq1 + 1

def test_registration_number_immutability(client: TestClient):
    """Verify student cannot change their registration number or role via profile update."""
    email = unique_email("immutable")
    # Register student
    reg_resp = client.post(
        "/api/auth/register",
        json={
            "name": "Immutable Student",
            "email": email,
            "password": "password123",
            "role": "STUDENT"
        }
    )
    assert reg_resp.status_code == 201
    orig_reg_num = reg_resp.json()["registration_number"]

    # Login to get token
    login_resp = client.post(
        "/api/auth/login",
        json={"email": email, "password": "password123"}
    )
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Attempt to update profile
    update_resp = client.put(
        "/api/auth/profile",
        json={"name": "Immutable Updated Name"},
        headers=headers
    )
    assert update_resp.status_code == 200
    updated_data = update_resp.json()
    assert updated_data["name"] == "Immutable Updated Name"
    # Registration number and role must stay unchanged
    assert updated_data["registration_number"] == orig_reg_num
    assert updated_data["role"] == "STUDENT"
