import pytest
from fastapi.testclient import TestClient
from app.main import app

def test_admin_list_and_manage_users(client, test_admin, test_student, test_examiner, admin_auth_headers, student_auth_headers):
    # 1. Non-admin blocked from listing users
    forbidden_res = client.get(
        "/api/auth/admin/users",
        headers=student_auth_headers
    )
    assert forbidden_res.status_code == 403

    # 2. Admin lists users
    list_res = client.get(
        "/api/auth/admin/users",
        headers=admin_auth_headers
    )
    assert list_res.status_code == 200
    users = list_res.json()
    assert len(users) >= 3

    # 3. Filter by role
    examiners_res = client.get(
        "/api/auth/admin/users?role=EXAMINER",
        headers=admin_auth_headers
    )
    assert examiners_res.status_code == 200
    for u in examiners_res.json():
        assert u["role"] == "EXAMINER"

    # 4. Toggle active status
    target_user_id = users[0]["id"]
    orig_status = users[0]["is_active"]
    toggle_res = client.put(
        f"/api/auth/admin/users/{target_user_id}/status?is_active={not orig_status}",
        headers=admin_auth_headers
    )
    assert toggle_res.status_code == 200
    assert toggle_res.json()["is_active"] != orig_status

    # Restore status
    client.put(
        f"/api/auth/admin/users/{target_user_id}/status?is_active={orig_status}",
        headers=admin_auth_headers
    )
