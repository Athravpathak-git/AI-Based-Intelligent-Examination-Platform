import uuid
from datetime import datetime, timedelta, timezone
import pytest
from app.models.result import Result

def get_auth_token(client, email, password):
    res = client.post("/api/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200
    return res.json()["access_token"]

def test_authoritative_result_status_persistence_below_50_passed(client, db_session, test_examiner, examiner_auth_headers):
    """
    Test Scenario A:
    1. Candidate completes an exam with score below 50% (e.g. 20%).
    2. Examiner explicitly selects status = 'PASSED'.
    3. Save evaluation, finalize evaluation, publish result.
    4. Re-fetch result via all endpoints:
       - status MUST remain 'PASSED'
       - passed MUST be True
    5. Official PDF download and CSV export must reflect 'PASSED'.
    6. Student analytics must reflect passed_exams += 1.
    """
    uid = uuid.uuid4().hex[:6]
    subj = f"CS_{uid}"

    # 1. Create Question
    q_res = client.post(
        "/api/questions",
        json={
            "subject": subj,
            "question_text": f"Explain recursion in depth {uid}",
            "question_type": "SHORT_ANSWER",
            "difficulty": "MEDIUM",
            "marks": 10.0
        },
        headers=examiner_auth_headers
    )
    assert q_res.status_code == 201
    q_id = q_res.json()["id"]

    # 2. Create Exam
    now = datetime.now(timezone.utc)
    exam_res = client.post(
        "/api/exams",
        json={
            "name": f"Low Score Exam {uid}",
            "subject": subj,
            "duration_minutes": 60,
            "start_time": (now - timedelta(minutes=5)).isoformat(),
            "end_time": (now + timedelta(hours=3)).isoformat(),
            "total_questions": 1,
            "maximum_marks": 10.0,
            "negative_marking_enabled": False
        },
        headers=examiner_auth_headers
    )
    assert exam_res.status_code == 201
    exam_id = exam_res.json()["id"]

    # 3. Create Student
    stu_email = f"student_low_{uid}@exam.com"
    reg_user_resp = client.post(
        "/api/auth/register",
        json={
            "name": f"Candidate LowScore {uid}",
            "email": stu_email,
            "password": "password123",
            "role": "STUDENT"
        }
    )
    assert reg_user_resp.status_code == 201
    stu_token = get_auth_token(client, stu_email, "password123")
    stu_headers = {"Authorization": f"Bearer {stu_token}"}

    # 4. Register & Start Session
    reg_exam_resp = client.post(f"/api/exams/{exam_id}/register", headers=stu_headers)
    assert reg_exam_resp.status_code == 201
    start_resp = client.post(f"/api/exams/{exam_id}/start-session", headers=stu_headers)
    assert start_resp.status_code == 200
    session_id = start_resp.json()["session_id"]

    # Save answer & submit session
    save_resp = client.post(
        f"/api/sessions/{session_id}/save-answer",
        json={"question_id": q_id, "text_answer": "Function calls itself until base case."},
        headers=stu_headers
    )
    assert save_resp.status_code == 200

    sub_resp = client.post(f"/api/sessions/{session_id}/submit", headers=stu_headers)
    assert sub_resp.status_code == 200
    sub_data = sub_resp.json()
    result_id = sub_data["result_id"]

    # 5. Examiner grades: awards 2.0 / 10.0 (20%)
    grade_resp = client.post(
        f"/api/evaluations/session/{session_id}/grade-question",
        json={"question_id": q_id, "marks_awarded": 2.0, "evaluator_feedback": "Fair attempt."},
        headers=examiner_auth_headers
    )
    assert grade_resp.status_code == 200

    # 6. Examiner finalizes with status override 'PASSED'
    fin_resp = client.post(
        f"/api/evaluations/session/{session_id}/finalize",
        json={"evaluator_remarks": "Official pass granted by committee.", "status": "PASSED"},
        headers=examiner_auth_headers
    )
    assert fin_resp.status_code == 200

    # Verify result in DB has status 'PASSED'
    res_db = db_session.query(Result).filter(Result.session_id == session_id).first()
    assert res_db is not None
    assert res_db.status == "PASSED"
    assert res_db.percentage == 20.0

    # 7. Examiner publishes result with status 'PASSED'
    pub_resp = client.post(
        f"/api/evaluations/session/{session_id}/publish",
        json={"evaluator_remarks": "Officially published.", "status": "PASSED"},
        headers=examiner_auth_headers
    )
    assert pub_resp.status_code == 200

    # 8. Re-fetch result via GET /api/results/{id}
    res_get = client.get(f"/api/results/{result_id}", headers=stu_headers)
    assert res_get.status_code == 200
    res_json = res_get.json()
    assert res_json["status"] == "PASSED"
    assert res_json["passed"] is True
    assert res_json["percentage"] == 20.0

    # 9. Re-fetch result via GET /api/results/by-session/{session_id}
    res_sess = client.get(f"/api/results/by-session/{session_id}", headers=stu_headers)
    assert res_sess.status_code == 200
    assert res_sess.json()["status"] == "PASSED"
    assert res_sess.json()["passed"] is True

    # 10. Examiner lists results via GET /api/results/exam/{exam_id}
    exam_res = client.get(f"/api/results/exam/{exam_id}", headers=examiner_auth_headers)
    assert exam_res.status_code == 200
    exam_results = exam_res.json()
    match = next(r for r in exam_results if r["session_id"] == session_id)
    assert match["status"] == "PASSED"
    assert match["passed"] is True

    # 11. Student downloads official PDF
    pdf_resp = client.get(f"/api/results/{result_id}/download/pdf", headers=stu_headers)
    assert pdf_resp.status_code == 200
    assert pdf_resp.content.startswith(b"%PDF-")

    # 12. Examiner exports CSV
    csv_resp = client.get(f"/api/results/exam/{exam_id}/export/csv", headers=examiner_auth_headers)
    assert csv_resp.status_code == 200
    assert "PASSED" in csv_resp.text

    # 13. Student analytics reflects passed_exams = 1, failed_exams = 0
    anal_resp = client.get("/api/analytics/student", headers=stu_headers)
    assert anal_resp.status_code == 200
    anal_json = anal_resp.json()
    assert anal_json["passed_exams"] == 1
    assert anal_json["failed_exams"] == 0


def test_authoritative_result_status_persistence_above_50_failed(client, db_session, test_examiner, examiner_auth_headers):
    """
    Test Scenario B:
    1. Candidate completes an exam with score 50% or above (e.g. 80%).
    2. Examiner explicitly selects status = 'FAILED'.
    3. Save, finalize, publish.
    4. Re-fetch result:
       - status MUST remain 'FAILED'
       - passed MUST be False
    5. Official PDF and CSV export must reflect 'FAILED'.
    6. Student analytics must reflect failed_exams += 1.
    """
    uid = uuid.uuid4().hex[:6]
    subj = f"Physics_{uid}"

    # 1. Create Question
    q_res = client.post(
        "/api/questions",
        json={
            "subject": subj,
            "question_text": f"Define Newton third law in detail {uid}",
            "question_type": "SHORT_ANSWER",
            "difficulty": "EASY",
            "marks": 10.0
        },
        headers=examiner_auth_headers
    )
    assert q_res.status_code == 201
    q_id = q_res.json()["id"]

    # 2. Create Exam
    now = datetime.now(timezone.utc)
    exam_res = client.post(
        "/api/exams",
        json={
            "name": f"High Score Exam {uid}",
            "subject": subj,
            "duration_minutes": 60,
            "start_time": (now - timedelta(minutes=5)).isoformat(),
            "end_time": (now + timedelta(hours=3)).isoformat(),
            "total_questions": 1,
            "maximum_marks": 10.0,
            "negative_marking_enabled": False
        },
        headers=examiner_auth_headers
    )
    assert exam_res.status_code == 201
    exam_id = exam_res.json()["id"]

    # 3. Create Student
    stu_email = f"student_high_{uid}@exam.com"
    client.post(
        "/api/auth/register",
        json={
            "name": f"Candidate HighScore {uid}",
            "email": stu_email,
            "password": "password123",
            "role": "STUDENT"
        }
    )
    stu_token = get_auth_token(client, stu_email, "password123")
    stu_headers = {"Authorization": f"Bearer {stu_token}"}

    # 4. Register & Start Session
    client.post(f"/api/exams/{exam_id}/register", headers=stu_headers)
    start_resp = client.post(f"/api/exams/{exam_id}/start-session", headers=stu_headers)
    assert start_resp.status_code == 200
    session_id = start_resp.json()["session_id"]

    # Save answer & submit
    client.post(
        f"/api/sessions/{session_id}/save-answer",
        json={"question_id": q_id, "text_answer": "For every action there is an equal and opposite reaction."},
        headers=stu_headers
    )
    sub_resp = client.post(f"/api/sessions/{session_id}/submit", headers=stu_headers)
    assert sub_resp.status_code == 200
    result_id = sub_resp.json()["result_id"]

    # 5. Examiner grades: awards 8.0 / 10.0 (80%)
    client.post(
        f"/api/evaluations/session/{session_id}/grade-question",
        json={"question_id": q_id, "marks_awarded": 8.0, "evaluator_feedback": "Rule breach noted."},
        headers=examiner_auth_headers
    )

    # 6. Examiner finalizes with status 'FAILED'
    fin_resp = client.post(
        f"/api/evaluations/session/{session_id}/finalize",
        json={"evaluator_remarks": "Verdict: FAILED due to disciplinary review.", "status": "FAILED"},
        headers=examiner_auth_headers
    )
    assert fin_resp.status_code == 200

    # 7. Examiner publishes with status 'FAILED'
    pub_resp = client.post(
        f"/api/evaluations/session/{session_id}/publish",
        json={"evaluator_remarks": "Verdict: FAILED.", "status": "FAILED"},
        headers=examiner_auth_headers
    )
    assert pub_resp.status_code == 200

    res_db = db_session.query(Result).filter(Result.session_id == session_id).first()
    assert res_db is not None
    assert res_db.status == "FAILED"
    assert res_db.percentage == 80.0

    # 8. Re-fetch via GET /api/results/{id}
    res_get = client.get(f"/api/results/{result_id}", headers=stu_headers)
    assert res_get.status_code == 200
    res_json = res_get.json()
    assert res_json["status"] == "FAILED"
    assert res_json["passed"] is False
    assert res_json["percentage"] == 80.0

    # 9. PDF Download
    pdf_resp = client.get(f"/api/results/{result_id}/download/pdf", headers=stu_headers)
    assert pdf_resp.status_code == 200
    assert pdf_resp.content.startswith(b"%PDF-")

    # 10. CSV Export contains FAILED
    csv_resp = client.get(f"/api/results/exam/{exam_id}/export/csv", headers=examiner_auth_headers)
    assert csv_resp.status_code == 200
    assert "FAILED" in csv_resp.text

    # 11. Student analytics reflects failed_exams = 1, passed_exams = 0
    anal_resp = client.get("/api/analytics/student", headers=stu_headers)
    assert anal_resp.status_code == 200
    anal_json = anal_resp.json()
    assert anal_json["passed_exams"] == 0
    assert anal_json["failed_exams"] == 1


def test_attempt_isolation_authoritative_status(client, db_session, test_examiner, examiner_auth_headers, test_admin, admin_auth_headers):
    """
    Test Scenario C:
    - Candidate takes Exam Attempt 1 -> Marked FAILED (status='FAILED', passed=False).
    - Admin grants permission, candidate takes Attempt 2.
    - Candidate completes Attempt 2 -> Marked PASSED (status='PASSED', passed=True).
    - Verify Attempt 1 and Attempt 2 results remain strictly independent!
    """
    uid = uuid.uuid4().hex[:6]
    subj = f"Math_{uid}"

    # 1. Create Question
    q_res = client.post(
        "/api/questions",
        json={
            "subject": subj,
            "question_text": f"Calculate integral of x^2 {uid}",
            "question_type": "SHORT_ANSWER",
            "difficulty": "EASY",
            "marks": 10.0
        },
        headers=examiner_auth_headers
    )
    assert q_res.status_code == 201
    q_id = q_res.json()["id"]

    # 2. Create Exam
    now = datetime.now(timezone.utc)
    exam_res = client.post(
        "/api/exams",
        json={
            "name": f"Multi Attempt Exam {uid}",
            "subject": subj,
            "duration_minutes": 60,
            "start_time": (now - timedelta(minutes=5)).isoformat(),
            "end_time": (now + timedelta(hours=3)).isoformat(),
            "total_questions": 1,
            "maximum_marks": 10.0,
            "negative_marking_enabled": False
        },
        headers=examiner_auth_headers
    )
    assert exam_res.status_code == 201
    exam_id = exam_res.json()["id"]

    # 3. Create Student
    stu_email = f"student_multi_{uid}@exam.com"
    stu_reg = client.post(
        "/api/auth/register",
        json={
            "name": f"Candidate MultiAttempt {uid}",
            "email": stu_email,
            "password": "password123",
            "role": "STUDENT"
        }
    )
    stu_id = stu_reg.json()["id"]
    stu_token = get_auth_token(client, stu_email, "password123")
    stu_headers = {"Authorization": f"Bearer {stu_token}"}

    # Attempt 1
    client.post(f"/api/exams/{exam_id}/register", headers=stu_headers)
    start1 = client.post(f"/api/exams/{exam_id}/start-session", headers=stu_headers)
    assert start1.status_code == 200
    sess1_id = start1.json()["session_id"]
    client.post(f"/api/sessions/{sess1_id}/submit", headers=stu_headers)

    # Grade & publish Attempt 1 as FAILED
    client.post(
        f"/api/evaluations/session/{sess1_id}/grade-question",
        json={"question_id": q_id, "marks_awarded": 2.0},
        headers=examiner_auth_headers
    )
    client.post(
        f"/api/evaluations/session/{sess1_id}/finalize",
        json={"status": "FAILED"},
        headers=examiner_auth_headers
    )
    client.post(
        f"/api/evaluations/session/{sess1_id}/publish",
        json={"status": "FAILED"},
        headers=examiner_auth_headers
    )

    # Admin grants re-attempt permission
    grant_resp = client.post(
        "/api/exam-access/grant",
        json={
            "exam_id": exam_id,
            "student_id": stu_id,
            "max_additional_attempts": 1,
            "reason": "Administrative approval for re-attempt."
        },
        headers=admin_auth_headers
    )
    assert grant_resp.status_code == 201

    # Attempt 2
    start2 = client.post(f"/api/exams/{exam_id}/start-session", headers=stu_headers)
    assert start2.status_code == 200
    sess2_id = start2.json()["session_id"]
    assert sess2_id != sess1_id

    client.post(f"/api/sessions/{sess2_id}/submit", headers=stu_headers)

    # Grade & publish Attempt 2 as PASSED
    client.post(
        f"/api/evaluations/session/{sess2_id}/grade-question",
        json={"question_id": q_id, "marks_awarded": 9.0},
        headers=examiner_auth_headers
    )
    client.post(
        f"/api/evaluations/session/{sess2_id}/finalize",
        json={"status": "PASSED"},
        headers=examiner_auth_headers
    )
    client.post(
        f"/api/evaluations/session/{sess2_id}/publish",
        json={"status": "PASSED"},
        headers=examiner_auth_headers
    )

    # Re-verify Attempt 1
    res1 = client.get(f"/api/results/by-session/{sess1_id}", headers=stu_headers).json()
    assert res1["status"] == "FAILED"
    assert res1["passed"] is False
    assert res1["attempt_number"] == 1

    # Re-verify Attempt 2
    res2 = client.get(f"/api/results/by-session/{sess2_id}", headers=stu_headers).json()
    assert res2["status"] == "PASSED"
    assert res2["passed"] is True
    assert res2["attempt_number"] == 2
