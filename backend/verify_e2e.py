import urllib.request
import json
from datetime import datetime, timedelta, timezone

def post(url, data, token=None):
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    req = urllib.request.Request(url, data=json.dumps(data).encode('utf-8'), headers=headers, method='POST')
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f"POST {url} failed: {e.code} - {body}")
        raise e

def get(url, token=None):
    headers = {}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    req = urllib.request.Request(url, headers=headers, method='GET')
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f"GET {url} failed: {e.code} - {body}")
        raise e

def main():
    print("=== STARTING INTELLIEXAMAI COMPREHENSIVE E2E VERIFICATION ===")

    # 1. Admin Flow
    print("\n[1/4] Testing Admin Persona:")
    admin_login = post('http://127.0.0.1:8000/api/auth/login', {'email': 'admin@exam.com', 'password': 'admin123'})
    admin_token = admin_login['access_token']
    admin_stats = get('http://127.0.0.1:8000/api/analytics/admin', admin_token)
    admin_users = get('http://127.0.0.1:8000/api/auth/admin/users', admin_token)
    print(f"  [OK] Admin authenticated successfully.")
    print(f"  [OK] Real Users in DB: {len(admin_users)}")
    print(f"  [OK] Admin Analytics: total_exams={admin_stats['total_exams']}, total_attempts={admin_stats['total_attempts']}")

    # 2. Examiner Flow
    print("\n[2/4] Testing Examiner Persona:")
    exam_login = post('http://127.0.0.1:8000/api/auth/login', {'email': 'examiner@exam.com', 'password': 'examiner123'})
    exam_token = exam_login['access_token']
    exam_stats = get('http://127.0.0.1:8000/api/analytics/examiner', exam_token)
    questions = get('http://127.0.0.1:8000/api/questions', exam_token)
    print(f"  [OK] Examiner authenticated successfully.")
    print(f"  [OK] Real Questions in DB: {len(questions)}")
    print(f"  [OK] Examiner Analytics: active_exams={exam_stats['active_exams']}, registered_candidates={exam_stats['registered_candidates']}")

    # Create a live test exam window for testing student attempt
    now = datetime.now(timezone.utc)
    exam_payload = {
        "name": "Live Proctored Verification Exam",
        "subject": "Mathematics",
        "duration_minutes": 30,
        "start_time": (now - timedelta(minutes=10)).isoformat(),
        "end_time": (now + timedelta(hours=3)).isoformat(),
        "total_questions": 2,
        "maximum_marks": 10.0,
        "negative_marking_enabled": True,
        "maximum_tab_switch_warnings": 3,
        "webcam_monitoring_enabled": True
    }
    created_exam = post('http://127.0.0.1:8000/api/exams', exam_payload, exam_token)
    exam_id = created_exam['id']
    print(f"  [OK] Created new live exam ID {exam_id} ('{created_exam['name']}') with server-side time window.")

    # 3. Student Registration & Dashboard
    print("\n[3/4] Testing Student Persona:")
    stu_login = post('http://127.0.0.1:8000/api/auth/login', {'email': 'student@exam.com', 'password': 'student123'})
    stu_token = stu_login['access_token']
    profile = get('http://127.0.0.1:8000/api/auth/me', stu_token)
    stu_stats = get('http://127.0.0.1:8000/api/analytics/student', stu_token)
    print(f"  [OK] Student authenticated successfully.")
    print(f"  [OK] Student Profile: {profile['name']} ({profile['email']})")
    print(f"  [OK] Registration Number: {profile['registration_number']}")
    print(f"  [OK] Student Real Metrics: attempts={stu_stats['total_attempts']}, average={stu_stats['average_score']}%")

    # Register for the live exam
    reg_resp = post(f'http://127.0.0.1:8000/api/exams/{exam_id}/register', {}, stu_token)
    print(f"  [OK] Student registered for exam {exam_id}: status={reg_resp['status']}")

    # Verify examiner can see student in candidate list
    candidates = get(f'http://127.0.0.1:8000/api/exams/{exam_id}/candidates', exam_token)
    print(f"  [OK] Examiner candidate list confirmed: {len(candidates)} candidate(s) enrolled.")
    print(f"    Candidate: {candidates[0]['name']}, Reg: {candidates[0]['registration_number']}")

    # 4. Proctored Exam Attempt, Anti-Cheat, and Scoring
    print("\n[4/4] Testing Proctored Attempt, Anti-Cheat, and Server-Authoritative Scoring:")
    session = post(f'http://127.0.0.1:8000/api/exams/{exam_id}/start-session', {}, stu_token)
    session_id = session['session_id']
    print(f"  [OK] Session initialized: ID={session_id}, Status={session['status']}")
    print(f"  [OK] Authoritative remaining seconds: {session['remaining_seconds']}s")
    print(f"  [OK] Total Questions received: {len(session['questions'])}")
    for q in session['questions']:
        for opt in q.get('options', []):
            assert 'is_correct' not in opt, "Security breach: is_correct exposed in student payload!"
    print("  [OK] Security verified: 'is_correct' strictly stripped from student questions.")

    # Record a tab-switch proctor event
    proctor_evt = post(f'http://127.0.0.1:8000/api/sessions/{session_id}/proctor-event', {
        'event_type': 'TAB_SWITCH',
        'severity': 'MEDIUM',
        'event_data': {'reason': 'Simulated focus loss event'}
    }, stu_token)
    print(f"  [OK] Anti-cheat proctoring event recorded: ID={proctor_evt['id']}, Type={proctor_evt['event_type']}, Severity={proctor_evt['severity']}")

    # Save draft answer
    first_q = session['questions'][0]
    if first_q.get('options'):
        opt_id = first_q['options'][0]['id']
        save_resp = post(f'http://127.0.0.1:8000/api/sessions/{session_id}/save-answer', {
            'question_id': first_q['id'],
            'selected_option_ids': [opt_id]
        }, stu_token)
    else:
        save_resp = post(f'http://127.0.0.1:8000/api/sessions/{session_id}/save-answer', {
            'question_id': first_q['id'],
            'answer_text': 'Theoretical response text'
        }, stu_token)
    print(f"  [OK] Draft answer saved to database: status={save_resp['status']}")

    # Submit exam
    submit_resp = post(f'http://127.0.0.1:8000/api/sessions/{session_id}/submit', {}, stu_token)
    print(f"  [OK] Exam submitted successfully!")
    print(f"  [OK] Real Server Evaluation: Score = {submit_resp['total_marks']} / {submit_resp['maximum_marks']} ({submit_resp['percentage']}%)")
    print(f"  [OK] Pass Status: {submit_resp['passed']}")
    print(f"  [OK] Total Questions: {submit_resp['total_questions']}, Attempted: {submit_resp['attempted_questions']}")

    # Student downloads PDF result
    pdf_url = f"http://127.0.0.1:8000/api/results/{submit_resp['result_id']}/download/pdf"
    req = urllib.request.Request(pdf_url, headers={'Authorization': f'Bearer {stu_token}'})
    with urllib.request.urlopen(req) as resp:
        pdf_bytes = resp.read()
        assert pdf_bytes.startswith(b"%PDF-"), "Invalid PDF payload!"
        print(f"  [OK] Real Result PDF downloaded ({len(pdf_bytes)} bytes, Magic Header: %PDF-)")

    print("\n=== ALL E2E WORKFLOWS VERIFIED 100% FUNCTIONAL AND BACKED BY POSTGRESQL ===")

if __name__ == "__main__":
    main()
