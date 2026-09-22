import uuid
from datetime import datetime, timedelta, timezone
import pytest
from app.models.user import User, UserRole
from app.core.security import hash_password, create_access_token

def test_multi_examiner_valuation_and_student_isolation(client, db_session, test_examiner, examiner_auth_headers, test_admin, admin_auth_headers):
    """
    End-to-End Multi-Examiner Valuation & Result Publication Test:
    1. Examiner A creates an assessment with 1 MCQ and 1 Short Answer question.
    2. Student 1 registers, starts exam session, and submits both answers.
    3. Immediate status: AWAITING_SUBJECTIVE_EVALUATION, result is_published=False.
    4. Student 1 cannot view marks before result publication (marks concealed / unpublished).
    5. Examiner B (distinct user, not creator) accesses evaluation queue:
       - Sees Examiner A's exam and Student 1's submission.
       - Grades subjective question with marks and feedback.
       - Finalizes valuation -> READY_FOR_PUBLICATION.
       - Publishes result -> PUBLISHED.
    6. Student 1 now accesses scorecard:
       - Result is released. Total marks reflect MCQ + Subjective.
       - Professional PDF download succeeds (%PDF- header).
    7. Student 2 tries to access Student 1's result -> 403 Forbidden (Strict candidate isolation).
    8. Student 2 tries to download Student 1's PDF -> 403 Forbidden.
    9. Admin has unrestricted access to view and download all results.
    """
    now = datetime.now(timezone.utc)
    uid = uuid.uuid4().hex[:6]

    # Create Examiner B (different user, not the creator)
    examiner_b = User(
        name="Examiner Beta",
        email=f"examiner_b_{uid}@exam.com",
        password_hash=hash_password("pass123"),
        role=UserRole.EXAMINER,
        is_active=True
    )
    # Create Student 1 and Student 2
    student_1 = User(
        name="Candidate Alpha",
        email=f"student_1_{uid}@exam.com",
        registration_number=f"REG-A-{uid}",
        password_hash=hash_password("pass123"),
        role=UserRole.STUDENT,
        is_active=True
    )
    student_2 = User(
        name="Candidate Beta",
        email=f"student_2_{uid}@exam.com",
        registration_number=f"REG-B-{uid}",
        password_hash=hash_password("pass123"),
        role=UserRole.STUDENT,
        is_active=True
    )
    db_session.add_all([examiner_b, student_1, student_2])
    db_session.commit()
    db_session.refresh(examiner_b)
    db_session.refresh(student_1)
    db_session.refresh(student_2)

    token_b = create_access_token({"sub": str(examiner_b.id), "email": examiner_b.email, "role": examiner_b.role.value})
    examiner_b_headers = {"Authorization": f"Bearer {token_b}"}

    token_s1 = create_access_token({"sub": str(student_1.id), "email": student_1.email, "role": student_1.role.value})
    student_1_headers = {"Authorization": f"Bearer {token_s1}"}

    token_s2 = create_access_token({"sub": str(student_2.id), "email": student_2.email, "role": student_2.role.value})
    student_2_headers = {"Authorization": f"Bearer {token_s2}"}

    subject_name = f"ValuationDomain_{uid}"

    # Step 1: Examiner A creates questions in this subject
    # Question 1: MCQ (5 marks)
    q1_resp = client.post(
        "/api/questions",
        json={
            "subject": subject_name,
            "question_text": "What is the capital of France?",
            "question_type": "MCQ",
            "difficulty": "EASY",
            "marks": 5.0,
            "options": [
                {"option_text": "Paris", "is_correct": True},
                {"option_text": "London", "is_correct": False},
                {"option_text": "Berlin", "is_correct": False},
                {"option_text": "Rome", "is_correct": False}
            ]
        },
        headers=examiner_auth_headers
    )
    assert q1_resp.status_code == 201, f"Failed to create MCQ: {q1_resp.text}"
    q1_data = q1_resp.json()
    paris_opt_id = [opt["id"] for opt in q1_data["options"] if opt["option_text"] == "Paris"][0]

    # Question 2: Short Answer (10 marks)
    q2_resp = client.post(
        "/api/questions",
        json={
            "subject": subject_name,
            "question_text": "Explain the significance of neural network backpropagation.",
            "question_type": "SHORT_ANSWER",
            "difficulty": "MEDIUM",
            "marks": 10.0
        },
        headers=examiner_auth_headers
    )
    assert q2_resp.status_code == 201, f"Failed to create Subjective Question: {q2_resp.text}"
    q2_data = q2_resp.json()

    # Step 2: Examiner A configures Exam
    exam_payload = {
        "name": f"Global Valuation Exam {uid}",
        "subject": subject_name,
        "duration_minutes": 45,
        "start_time": (now - timedelta(minutes=10)).isoformat(),
        "end_time": (now + timedelta(hours=3)).isoformat(),
        "total_questions": 2,
        "maximum_marks": 15.0,
        "negative_marking_enabled": False,
        "maximum_tab_switch_warnings": 3,
        "webcam_monitoring_enabled": True
    }
    create_exam_res = client.post("/api/exams", json=exam_payload, headers=examiner_auth_headers)
    assert create_exam_res.status_code == 201, f"Failed to create exam: {create_exam_res.text}"
    exam_id = create_exam_res.json()["id"]

    # Step 3: Student 1 registers for exam
    reg_res = client.post(f"/api/exams/{exam_id}/register", headers=student_1_headers)
    assert reg_res.status_code in [200, 201]

    # Step 4: Student 1 starts session
    start_res = client.post(f"/api/exams/{exam_id}/start-session", headers=student_1_headers)
    assert start_res.status_code == 200
    session_data = start_res.json()
    session_id = session_data["session_id"]
    questions = session_data["questions"]
    assert len(questions) == 2

    # Map question IDs
    mcq_q = next(q for q in questions if q["question_type"] == "MCQ")
    subj_q = next(q for q in questions if q["question_type"] == "SHORT_ANSWER")

    # Step 5: Student 1 submits answers
    # MCQ answer: Paris
    save_mcq_res = client.post(
        f"/api/sessions/{session_id}/save-answer",
        json={"question_id": mcq_q["id"], "selected_option_ids": [paris_opt_id]},
        headers=student_1_headers
    )
    assert save_mcq_res.status_code == 200

    # Subjective answer text
    save_subj_res = client.post(
        f"/api/sessions/{session_id}/save-answer",
        json={
            "question_id": subj_q["id"],
            "answer_text": "Backpropagation computes the gradient of the loss function with respect to weights using the chain rule, enabling gradient descent optimization."
        },
        headers=student_1_headers
    )
    assert save_subj_res.status_code == 200

    # Submit the session
    submit_res = client.post(f"/api/sessions/{session_id}/submit", headers=student_1_headers)
    assert submit_res.status_code == 200
    submit_data = submit_res.json()
    result_id = submit_data["result_id"]

    # Step 6: Verify status is UNDER_REVIEW and result is concealed before publication
    assert submit_data["status"] == "UNDER_REVIEW"

    # Student 1 attempts to read result before publication -> should indicate unpublished / pending valuation
    view_res_s1 = client.get(f"/api/results/{result_id}", headers=student_1_headers)
    assert view_res_s1.status_code == 200
    assert view_res_s1.json()["is_published"] is False
    assert view_res_s1.json()["evaluation_status"] in ["AWAITING_SUBJECTIVE_EVALUATION", "EVALUATION_IN_PROGRESS"]
    assert view_res_s1.json()["total_marks"] == 0.0  # Marks concealed from student before declaration

    # Step 7: Examiner B (NOT Examiner A) accesses valuation queue
    pending_res_b = client.get("/api/evaluations/pending", headers=examiner_b_headers)
    assert pending_res_b.status_code == 200
    pending_list_b = pending_res_b.json()
    matching_pending = [item for item in pending_list_b if item["session_id"] == session_id]
    assert len(matching_pending) == 1, f"Examiner B should see Student 1's pending valuation session: {pending_list_b}"
    assert matching_pending[0]["exam_id"] == exam_id

    # Examiner B views the session valuation details
    detail_res_b = client.get(f"/api/evaluations/session/{session_id}", headers=examiner_b_headers)
    assert detail_res_b.status_code == 200
    detail_data_b = detail_res_b.json()
    assert len(detail_data_b["questions"]) == 2

    # Step 8: Examiner B grades the subjective question
    grade_res_b = client.post(
        f"/api/evaluations/session/{session_id}/grade-question",
        json={
            "question_id": subj_q["id"],
            "marks_awarded": 9.0,
            "evaluator_feedback": "Exemplary understanding of chain rule and optimization."
        },
        headers=examiner_b_headers
    )
    assert grade_res_b.status_code == 200
    assert grade_res_b.json()["status"] == "success"
    assert grade_res_b.json()["marks_awarded"] == 9.0

    # Step 9: Examiner B finalizes evaluation
    finalize_res_b = client.post(f"/api/evaluations/session/{session_id}/finalize", headers=examiner_b_headers)
    assert finalize_res_b.status_code == 200
    assert finalize_res_b.json()["evaluation_status"] == "READY_FOR_PUBLICATION"

    # Step 10: Examiner B publishes result
    publish_res_b = client.post(f"/api/evaluations/session/{session_id}/publish", headers=examiner_b_headers)
    assert publish_res_b.status_code == 200
    assert publish_res_b.json()["evaluation_status"] == "PUBLISHED"
    assert publish_res_b.json()["status"] == "success"

    # Step 11: Student 1 verifies result is published with correct total marks (5 MCQ + 9 Subj = 14)
    s1_published_res = client.get(f"/api/results/{result_id}", headers=student_1_headers)
    assert s1_published_res.status_code == 200
    s1_pub_data = s1_published_res.json()
    assert s1_pub_data["is_published"] is True
    assert s1_pub_data["total_marks"] == 14.0
    assert s1_pub_data["percentage"] == pytest.approx(93.33, 0.1)

    # Student 1 downloads PDF scorecard
    pdf_res_s1 = client.get(f"/api/results/{result_id}/download/pdf", headers=student_1_headers)
    assert pdf_res_s1.status_code == 200
    assert pdf_res_s1.headers["content-type"] == "application/pdf"
    assert pdf_res_s1.content.startswith(b"%PDF-")

    # Step 12: Strict Student Isolation -> Student 2 CANNOT access Student 1's result
    s2_tamper_res = client.get(f"/api/results/{result_id}", headers=student_2_headers)
    assert s2_tamper_res.status_code == 403, "Student 2 must NOT access Student 1's result"

    s2_pdf_tamper_res = client.get(f"/api/results/{result_id}/download/pdf", headers=student_2_headers)
    assert s2_pdf_tamper_res.status_code == 403, "Student 2 must NOT download Student 1's PDF scorecard"

    # Step 13: Admin Unrestricted Access
    admin_view_res = client.get(f"/api/results/{result_id}", headers=admin_auth_headers)
    assert admin_view_res.status_code == 200
    assert admin_view_res.json()["total_marks"] == 14.0

    admin_pdf_res = client.get(f"/api/results/{result_id}/download/pdf", headers=admin_auth_headers)
    assert admin_pdf_res.status_code == 200
    assert admin_pdf_res.content.startswith(b"%PDF-")
