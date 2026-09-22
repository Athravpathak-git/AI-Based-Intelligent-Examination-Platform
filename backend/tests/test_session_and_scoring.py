import uuid
from datetime import datetime, timedelta, timezone
import pytest

def get_auth_token(client, email: str, password: str) -> str:
    res = client.post("/api/auth/login", json={"email": email, "password": password})
    return res.json()["access_token"]

def seed_math_questions(client, headers):
    client.post(
        "/api/questions",
        json={
            "subject": "Mathematics",
            "question_text": f"Solve x + 2 = {uuid.uuid4().hex[:4]}",
            "question_type": "SHORT_ANSWER",
            "difficulty": "EASY",
            "marks": 2.5
        },
        headers=headers
    )
    client.post(
        "/api/questions",
        json={
            "subject": "Mathematics",
            "question_text": f"Solve 2y = {uuid.uuid4().hex[:4]}",
            "question_type": "SHORT_ANSWER",
            "difficulty": "EASY",
            "marks": 2.5
        },
        headers=headers
    )

def test_session_start_save_and_grading(client, test_examiner, examiner_auth_headers):
    seed_math_questions(client, examiner_auth_headers)

    # 1. Register a fresh student with unique email
    stu_email = f"stu_session_{uuid.uuid4().hex[:8]}@test.com"
    reg_resp = client.post(
        "/api/auth/register",
        json={"name": "Test Session Student", "email": stu_email, "password": "password123", "role": "STUDENT"}
    )
    assert reg_resp.status_code == 201
    stu_token = get_auth_token(client, stu_email, "password123")

    now = datetime.now(timezone.utc)

    # 2. Examiner creates exam with negative marking enabled
    exam_payload = {
        "name": f"Midterm Scoring Test {uuid.uuid4().hex[:6]}",
        "subject": "Mathematics",
        "duration_minutes": 30,
        "start_time": (now - timedelta(minutes=5)).isoformat(),
        "end_time": (now + timedelta(hours=2)).isoformat(),
        "total_questions": 2,
        "maximum_marks": 5.0,
        "negative_marking_enabled": True,
        "maximum_tab_switch_warnings": 2,
        "webcam_monitoring_enabled": True
    }
    create_exam_res = client.post(
        "/api/exams",
        json=exam_payload,
        headers=examiner_auth_headers
    )
    assert create_exam_res.status_code == 201
    exam_id = create_exam_res.json()["id"]

    # 3. Student registers for exam
    client.post(
        f"/api/exams/{exam_id}/register",
        headers={"Authorization": f"Bearer {stu_token}"}
    )

    # 4. Student starts exam session
    start_res = client.post(
        f"/api/exams/{exam_id}/start-session",
        headers={"Authorization": f"Bearer {stu_token}"}
    )
    assert start_res.status_code == 200
    session_data = start_res.json()
    session_id = session_data["session_id"]
    assert session_data["status"] == "ACTIVE"
    assert session_data["remaining_seconds"] > 0
    questions = session_data["questions"]
    assert len(questions) == 2

    # Verify is_correct is NOT exposed in questions
    for q in questions:
        for opt in q["options"]:
            assert "is_correct" not in opt

    # 5. Save draft answers
    mcq_q = next((q for q in questions if q.get("options")), None)
    if mcq_q:
        opt0_id = mcq_q["options"][0]["id"]
        save_res = client.post(
            f"/api/sessions/{session_id}/save-answer",
            json={"question_id": mcq_q["id"], "selected_option_ids": [opt0_id]},
            headers={"Authorization": f"Bearer {stu_token}"}
        )
    else:
        save_res = client.post(
            f"/api/sessions/{session_id}/save-answer",
            json={"question_id": questions[0]["id"], "answer_text": "Sample answer response"},
            headers={"Authorization": f"Bearer {stu_token}"}
        )
    assert save_res.status_code == 200
    assert save_res.json()["status"] == "saved"

    # 6. Submit exam session
    submit_res = client.post(
        f"/api/sessions/{session_id}/submit",
        headers={"Authorization": f"Bearer {stu_token}"}
    )
    assert submit_res.status_code == 200
    result_data = submit_res.json()
    result_id = result_data["result_id"]
    assert result_data["total_questions"] == 2
    assert result_data["attempted_questions"] >= 1
    assert result_data["percentage"] >= 0.0

    # 7. Before publication: Student CANNOT download unpublished PDF (403 Forbidden)
    pre_pdf_res = client.get(
        f"/api/results/{result_id}/download/pdf",
        headers={"Authorization": f"Bearer {stu_token}"}
    )
    assert pre_pdf_res.status_code == 403

    # Examiner grades subjective questions
    for q in questions:
        client.post(
            f"/api/evaluations/session/{session_id}/grade-question",
            json={"question_id": q["id"], "marks_awarded": 2.5, "evaluator_feedback": "Good work"},
            headers=examiner_auth_headers
        )

    # Examiner publishes result
    pub_res = client.post(
        f"/api/evaluations/session/{session_id}/publish",
        headers=examiner_auth_headers
    )
    assert pub_res.status_code == 200

    # After publication: Student can download their own result PDF
    pdf_res = client.get(
        f"/api/results/{result_id}/download/pdf",
        headers={"Authorization": f"Bearer {stu_token}"}
    )
    assert pdf_res.status_code == 200
    assert pdf_res.content.startswith(b"%PDF-")

    # 8. Another student CANNOT view or download Student A's result
    other_email = f"other_stu_{uuid.uuid4().hex[:8]}@test.com"
    client.post(
        "/api/auth/register",
        json={"name": "Other Student", "email": other_email, "password": "password123", "role": "STUDENT"}
    )
    other_token = get_auth_token(client, other_email, "password123")

    forbidden_view = client.get(
        f"/api/results/{result_id}",
        headers={"Authorization": f"Bearer {other_token}"}
    )
    assert forbidden_view.status_code == 403

    forbidden_pdf = client.get(
        f"/api/results/{result_id}/download/pdf",
        headers={"Authorization": f"Bearer {other_token}"}
    )
    assert forbidden_pdf.status_code == 403

def test_tab_switch_violation_triggers_auto_submit(client, test_examiner, examiner_auth_headers):
    """Verify that exceeding maximum tab switch warnings auto-submits the exam."""
    seed_math_questions(client, examiner_auth_headers)

    stu_email = f"tab_stu_{uuid.uuid4().hex[:8]}@test.com"
    client.post(
        "/api/auth/register",
        json={"name": "Tab Switch Student", "email": stu_email, "password": "password123", "role": "STUDENT"}
    )
    stu_token = get_auth_token(client, stu_email, "password123")

    now = datetime.now(timezone.utc)
    exam_payload = {
        "name": f"Tab Security Test {uuid.uuid4().hex[:6]}",
        "subject": "Mathematics",
        "duration_minutes": 20,
        "start_time": (now - timedelta(minutes=2)).isoformat(),
        "end_time": (now + timedelta(hours=1)).isoformat(),
        "total_questions": 2,
        "maximum_marks": 5.0,
        "maximum_tab_switch_warnings": 1,  # Max 1 warning; 2nd violation auto-submits
        "webcam_monitoring_enabled": True
    }
    create_res = client.post("/api/exams", json=exam_payload, headers=examiner_auth_headers)
    exam_id = create_res.json()["id"]

    # Student must be registered for the exam
    reg_res = client.post(f"/api/exams/{exam_id}/register", headers={"Authorization": f"Bearer {stu_token}"})
    assert reg_res.status_code == 201

    start_res = client.post(f"/api/exams/{exam_id}/start-session", headers={"Authorization": f"Bearer {stu_token}"})
    assert start_res.status_code == 200
    session_id = start_res.json()["session_id"]

    # 1st tab switch event: Warning 1
    ev1 = client.post(
        f"/api/sessions/{session_id}/proctor-event",
        json={"event_type": "TAB_SWITCH", "severity": "MEDIUM"},
        headers={"Authorization": f"Bearer {stu_token}"}
    )
    assert ev1.status_code == 200

    # 2nd tab switch event: Exceeds max warnings (1) -> auto-submit triggered!
    ev2 = client.post(
        f"/api/sessions/{session_id}/proctor-event",
        json={"event_type": "TAB_SWITCH", "severity": "HIGH"},
        headers={"Authorization": f"Bearer {stu_token}"}
    )
    assert ev2.status_code == 200

    # Now attempt to save answer -> session is already submitted for violation
    attempt_save = client.post(
        f"/api/sessions/{session_id}/save-answer",
        json={"question_id": 1, "selected_option_ids": [1]},
        headers={"Authorization": f"Bearer {stu_token}"}
    )
    assert attempt_save.status_code == 400
    assert "SUBMITTED_VIOLATION" in attempt_save.json()["detail"]

def test_session_start_without_registration_rejected(client, test_examiner, examiner_auth_headers):
    """Verify that an unregistered student cannot start an exam session (HTTP 403)."""
    seed_math_questions(client, examiner_auth_headers)

    unreg_email = f"unreg_stu_{uuid.uuid4().hex[:8]}@test.com"
    client.post(
        "/api/auth/register",
        json={"name": "Unregistered Student", "email": unreg_email, "password": "password123", "role": "STUDENT"}
    )
    unreg_token = get_auth_token(client, unreg_email, "password123")

    now = datetime.now(timezone.utc)
    exam_payload = {
        "name": f"Unregistered Flow Test {uuid.uuid4().hex[:6]}",
        "subject": "Mathematics",
        "duration_minutes": 20,
        "start_time": (now - timedelta(minutes=2)).isoformat(),
        "end_time": (now + timedelta(hours=1)).isoformat(),
        "total_questions": 2,
        "maximum_marks": 5.0
    }
    create_res = client.post("/api/exams", json=exam_payload, headers=examiner_auth_headers)
    exam_id = create_res.json()["id"]

    # Student attempts to start WITHOUT registering
    start_res = client.post(
        f"/api/exams/{exam_id}/start-session",
        headers={"Authorization": f"Bearer {unreg_token}"}
    )
    assert start_res.status_code == 403
    assert "register" in start_res.json()["detail"].lower()

def test_authoritative_three_warnings_then_auto_submit(client, test_examiner, examiner_auth_headers):
    """Scenario A: maximum_tab_switch_warnings = 3.
    Violation 1 -> warning 1, ACTIVE
    Violation 2 -> warning 2, ACTIVE
    Violation 3 -> warning 3, ACTIVE
    Violation 4 -> AUTO SUBMITTED, SUBMITTED_VIOLATION, Result created
    """
    seed_math_questions(client, examiner_auth_headers)
    stu_email = f"stu_warn3_{uuid.uuid4().hex[:8]}@test.com"
    client.post(
        "/api/auth/register",
        json={"name": "Three Warning Student", "email": stu_email, "password": "password123", "role": "STUDENT"}
    )
    stu_token = get_auth_token(client, stu_email, "password123")
    now = datetime.now(timezone.utc)
    exam_res = client.post(
        "/api/exams",
        json={
            "name": f"Three Warnings Exam {uuid.uuid4().hex[:6]}",
            "subject": "Mathematics",
            "duration_minutes": 25,
            "start_time": (now - timedelta(minutes=1)).isoformat(),
            "end_time": (now + timedelta(hours=1)).isoformat(),
            "total_questions": 2,
            "maximum_marks": 5.0,
            "maximum_tab_switch_warnings": 3,
            "webcam_monitoring_enabled": False
        },
        headers=examiner_auth_headers
    )
    exam_id = exam_res.json()["id"]
    client.post(f"/api/exams/{exam_id}/register", headers={"Authorization": f"Bearer {stu_token}"})
    start_res = client.post(f"/api/exams/{exam_id}/start-session", headers={"Authorization": f"Bearer {stu_token}"})
    session_id = start_res.json()["session_id"]

    # Violation 1
    v1 = client.post(
        f"/api/sessions/{session_id}/proctor-event",
        json={"event_type": "TAB_SWITCH", "severity": "HIGH"},
        headers={"Authorization": f"Bearer {stu_token}"}
    )
    assert v1.status_code == 200
    d1 = v1.json()
    assert d1["warning_issued"] is True
    assert d1["current_warnings"] == 1
    assert d1["maximum_allowed"] == 3
    assert d1["auto_submitted"] is False
    assert d1["session_status"] == "ACTIVE"

    # Violation 2
    v2 = client.post(
        f"/api/sessions/{session_id}/proctor-event",
        json={"event_type": "TAB_SWITCH", "severity": "HIGH"},
        headers={"Authorization": f"Bearer {stu_token}"}
    )
    assert v2.status_code == 200
    d2 = v2.json()
    assert d2["warning_issued"] is True
    assert d2["current_warnings"] == 2
    assert d2["maximum_allowed"] == 3
    assert d2["auto_submitted"] is False
    assert d2["session_status"] == "ACTIVE"

    # Violation 3
    v3 = client.post(
        f"/api/sessions/{session_id}/proctor-event",
        json={"event_type": "TAB_SWITCH", "severity": "HIGH"},
        headers={"Authorization": f"Bearer {stu_token}"}
    )
    assert v3.status_code == 200
    d3 = v3.json()
    assert d3["warning_issued"] is True
    assert d3["current_warnings"] == 3
    assert d3["maximum_allowed"] == 3
    assert d3["auto_submitted"] is False
    assert d3["session_status"] == "ACTIVE"

    # Violation 4 -> AUTO SUBMIT
    v4 = client.post(
        f"/api/sessions/{session_id}/proctor-event",
        json={"event_type": "TAB_SWITCH", "severity": "HIGH"},
        headers={"Authorization": f"Bearer {stu_token}"}
    )
    assert v4.status_code == 200
    d4 = v4.json()
    assert d4["auto_submitted"] is True
    assert d4["session_status"] == "SUBMITTED_VIOLATION"
    assert d4["current_warnings"] == 4
    assert d4["result_id"] is not None
    assert d4["submission_reason"] == "Maximum proctoring violations reached"

    # Verify result is accessible by student
    res = client.get(f"/api/results/{d4['result_id']}", headers={"Authorization": f"Bearer {stu_token}"})
    assert res.status_code == 200
    assert res.json()["submission_status"] == "AUTO SUBMITTED"
    assert res.json()["submission_reason"] == "Maximum proctoring violations reached"

def test_zero_warnings_threshold_triggers_immediate_auto_submit(client, test_examiner, examiner_auth_headers):
    """Scenario B: maximum_tab_switch_warnings = 0.
    1st violation -> AUTO SUBMIT immediately.
    """
    seed_math_questions(client, examiner_auth_headers)
    stu_email = f"stu_warn0_{uuid.uuid4().hex[:8]}@test.com"
    client.post(
        "/api/auth/register",
        json={"name": "Zero Warning Student", "email": stu_email, "password": "password123", "role": "STUDENT"}
    )
    stu_token = get_auth_token(client, stu_email, "password123")
    now = datetime.now(timezone.utc)
    exam_res = client.post(
        "/api/exams",
        json={
            "name": f"Zero Warnings Exam {uuid.uuid4().hex[:6]}",
            "subject": "Mathematics",
            "duration_minutes": 25,
            "start_time": (now - timedelta(minutes=1)).isoformat(),
            "end_time": (now + timedelta(hours=1)).isoformat(),
            "total_questions": 2,
            "maximum_marks": 5.0,
            "maximum_tab_switch_warnings": 0,
            "webcam_monitoring_enabled": False
        },
        headers=examiner_auth_headers
    )
    exam_id = exam_res.json()["id"]
    client.post(f"/api/exams/{exam_id}/register", headers={"Authorization": f"Bearer {stu_token}"})
    start_res = client.post(f"/api/exams/{exam_id}/start-session", headers={"Authorization": f"Bearer {stu_token}"})
    session_id = start_res.json()["session_id"]

    v1 = client.post(
        f"/api/sessions/{session_id}/proctor-event",
        json={"event_type": "TAB_SWITCH", "severity": "HIGH"},
        headers={"Authorization": f"Bearer {stu_token}"}
    )
    assert v1.status_code == 200
    d1 = v1.json()
    assert d1["auto_submitted"] is True
    assert d1["session_status"] == "SUBMITTED_VIOLATION"
    assert d1["result_id"] is not None

def test_deduplicate_tab_switch_and_blur_events(client, test_examiner, examiner_auth_headers):
    """Scenario C & D: Same browser action producing TAB_SWITCH + WINDOW_BLUR within 1.5s
    counts as exactly ONE violation.
    """
    seed_math_questions(client, examiner_auth_headers)
    stu_email = f"stu_dedup_{uuid.uuid4().hex[:8]}@test.com"
    client.post(
        "/api/auth/register",
        json={"name": "Dedup Student", "email": stu_email, "password": "password123", "role": "STUDENT"}
    )
    stu_token = get_auth_token(client, stu_email, "password123")
    now = datetime.now(timezone.utc)
    exam_res = client.post(
        "/api/exams",
        json={
            "name": f"Dedup Exam {uuid.uuid4().hex[:6]}",
            "subject": "Mathematics",
            "duration_minutes": 25,
            "start_time": (now - timedelta(minutes=1)).isoformat(),
            "end_time": (now + timedelta(hours=1)).isoformat(),
            "total_questions": 2,
            "maximum_marks": 5.0,
            "maximum_tab_switch_warnings": 2,
            "webcam_monitoring_enabled": False
        },
        headers=examiner_auth_headers
    )
    exam_id = exam_res.json()["id"]
    client.post(f"/api/exams/{exam_id}/register", headers={"Authorization": f"Bearer {stu_token}"})
    start_res = client.post(f"/api/exams/{exam_id}/start-session", headers={"Authorization": f"Bearer {stu_token}"})
    session_id = start_res.json()["session_id"]

    # 1. TAB_SWITCH event
    v1 = client.post(
        f"/api/sessions/{session_id}/proctor-event",
        json={"event_type": "TAB_SWITCH", "severity": "HIGH"},
        headers={"Authorization": f"Bearer {stu_token}"}
    )
    assert v1.json()["current_warnings"] == 1

    # 2. Immediate WINDOW_BLUR event from the SAME user action
    v2 = client.post(
        f"/api/sessions/{session_id}/proctor-event",
        json={"event_type": "WINDOW_BLUR", "severity": "HIGH"},
        headers={"Authorization": f"Bearer {stu_token}"}
    )
    # Must NOT increment violation count: remains 1
    assert v2.json()["current_warnings"] == 1
    assert v2.json()["warning_issued"] is False

def test_heartbeat_sync_and_authoritative_timer(client, test_examiner, examiner_auth_headers):
    """Scenario F: Heartbeat endpoint returns authoritative status and timer."""
    seed_math_questions(client, examiner_auth_headers)
    stu_email = f"stu_hb_{uuid.uuid4().hex[:8]}@test.com"
    client.post(
        "/api/auth/register",
        json={"name": "Heartbeat Student", "email": stu_email, "password": "password123", "role": "STUDENT"}
    )
    stu_token = get_auth_token(client, stu_email, "password123")
    now = datetime.now(timezone.utc)
    exam_res = client.post(
        "/api/exams",
        json={
            "name": f"Heartbeat Exam {uuid.uuid4().hex[:6]}",
            "subject": "Mathematics",
            "duration_minutes": 25,
            "start_time": (now - timedelta(minutes=1)).isoformat(),
            "end_time": (now + timedelta(hours=1)).isoformat(),
            "total_questions": 2,
            "maximum_marks": 5.0,
            "maximum_tab_switch_warnings": 3,
            "webcam_monitoring_enabled": False
        },
        headers=examiner_auth_headers
    )
    exam_id = exam_res.json()["id"]
    client.post(f"/api/exams/{exam_id}/register", headers={"Authorization": f"Bearer {stu_token}"})
    start_res = client.post(f"/api/exams/{exam_id}/start-session", headers={"Authorization": f"Bearer {stu_token}"})
    session_id = start_res.json()["session_id"]

    # Query heartbeat
    hb_res = client.get(
        f"/api/sessions/{session_id}/heartbeat",
        headers={"Authorization": f"Bearer {stu_token}"}
    )
    assert hb_res.status_code == 200
    hb_data = hb_res.json()
    assert hb_data["session_id"] == session_id
    assert hb_data["status"] == "ACTIVE"
    assert hb_data["remaining_seconds"] > 1400
    assert hb_data["tab_switch_count"] == 0
    assert hb_data["auto_submitted"] is False

def test_idempotent_session_submission_no_duplicate_results(client, test_examiner, examiner_auth_headers):
    """Scenario E: Multiple submission calls return the same existing Result."""
    seed_math_questions(client, examiner_auth_headers)
    stu_email = f"stu_idem_{uuid.uuid4().hex[:8]}@test.com"
    client.post(
        "/api/auth/register",
        json={"name": "Idempotent Student", "email": stu_email, "password": "password123", "role": "STUDENT"}
    )
    stu_token = get_auth_token(client, stu_email, "password123")
    now = datetime.now(timezone.utc)
    exam_res = client.post(
        "/api/exams",
        json={
            "name": f"Idempotent Exam {uuid.uuid4().hex[:6]}",
            "subject": "Mathematics",
            "duration_minutes": 25,
            "start_time": (now - timedelta(minutes=1)).isoformat(),
            "end_time": (now + timedelta(hours=1)).isoformat(),
            "total_questions": 2,
            "maximum_marks": 5.0,
            "maximum_tab_switch_warnings": 3,
            "webcam_monitoring_enabled": False
        },
        headers=examiner_auth_headers
    )
    exam_id = exam_res.json()["id"]
    client.post(f"/api/exams/{exam_id}/register", headers={"Authorization": f"Bearer {stu_token}"})
    start_res = client.post(f"/api/exams/{exam_id}/start-session", headers={"Authorization": f"Bearer {stu_token}"})
    session_id = start_res.json()["session_id"]

    # First submit
    sub1 = client.post(f"/api/sessions/{session_id}/submit", headers={"Authorization": f"Bearer {stu_token}"})
    assert sub1.status_code == 200
    res1 = sub1.json()
    result_id_1 = res1["result_id"]

    # Second submit (concurrent or retried)
    sub2 = client.post(f"/api/sessions/{session_id}/submit", headers={"Authorization": f"Bearer {stu_token}"})
    assert sub2.status_code == 200
    res2 = sub2.json()
    result_id_2 = res2["result_id"]

    # Result ID must be identical (no duplicate records created)
    assert result_id_1 == result_id_2
    assert res1["total_marks"] == res2["total_marks"]

    # Heartbeat after submission returns finalized status and result_id
    hb = client.get(f"/api/sessions/{session_id}/heartbeat", headers={"Authorization": f"Bearer {stu_token}"})
    assert hb.status_code == 200
    assert hb.json()["auto_submitted"] is True
    assert hb.json()["result_id"] == result_id_1

    # Scorecard by session returns same result
    by_session = client.get(f"/api/results/by-session/{session_id}", headers={"Authorization": f"Bearer {stu_token}"})
    assert by_session.status_code == 200
    assert by_session.json()["result_id"] == result_id_1

