import pytest
from starlette.testclient import TestClient
from app.main import app
from app.core.security import create_access_token
from app.models.user import UserRole
from app.services.monitoring_signaling import signaling_manager

def test_webrtc_signaling_lifecycle(client: TestClient, db_session):
    """Test full WebRTC signaling connection, stream request, offer/answer routing, and disconnect."""
    from app.models.user import User
    from app.models.exam import Exam
    from app.models.session import ExamSession
    from datetime import datetime, timezone, timedelta

    # 1. Setup Student, Examiner, and active ExamSession
    student = User(
        name="Live Student",
        email="live.student@example.com",
        password_hash="fakehash",
        role=UserRole.STUDENT,
        is_active=True
    )
    examiner = User(
        name="Live Examiner",
        email="live.examiner@example.com",
        password_hash="fakehash",
        role=UserRole.EXAMINER,
        is_active=True
    )
    db_session.add_all([student, examiner])
    db_session.commit()
    db_session.refresh(student)
    db_session.refresh(examiner)

    now = datetime.now(timezone.utc)
    exam = Exam(
        name="WebRTC Test Exam",
        subject="Computer Networks",
        duration_minutes=60,
        start_time=now - timedelta(minutes=5),
        end_time=now + timedelta(hours=2),
        total_questions=10,
        maximum_marks=100.0,
        created_by=examiner.id
    )
    db_session.add(exam)
    db_session.commit()
    db_session.refresh(exam)

    import uuid
    session = ExamSession(
        exam_id=exam.id,
        student_id=student.id,
        session_token=uuid.uuid4().hex,
        status="ACTIVE",
        started_at=now - timedelta(minutes=2)
    )
    db_session.add(session)
    db_session.commit()
    db_session.refresh(session)

    student_token = create_access_token({"sub": str(student.id), "role": student.role.value})
    examiner_token = create_access_token({"sub": str(examiner.id), "role": examiner.role.value})

    # 2. Candidate connects to signaling WebSocket
    with client.websocket_connect(f"/monitoring/ws/candidate/{session.id}?token={student_token}") as cand_ws:
        assert session.id in signaling_manager.candidates
        cand_conn = signaling_manager.candidates[session.id]
        assert cand_conn.student_name == "Live Student"

        # Candidate can send ping
        cand_ws.send_json({"type": "ping"})
        cand_resp = cand_ws.receive_json()
        assert cand_resp["type"] == "pong"

        # 3. Examiner connects to signaling WebSocket
        with client.websocket_connect(f"/monitoring/ws/examiner?token={examiner_token}") as exam_ws:
            assert examiner.id in signaling_manager.examiners

            # Examiner receives initial list of active candidates
            init_msg = exam_ws.receive_json()
            assert init_msg["type"] == "INITIAL_ONLINE_CANDIDATES"
            active_sids = [c["session_id"] for c in init_msg["candidates"]]
            assert session.id in active_sids

            # 4. Examiner requests stream from Candidate
            exam_ws.send_json({"type": "request_stream", "session_id": session.id})

            # Candidate receives stream_requested
            cand_req = cand_ws.receive_json()
            assert cand_req["type"] == "stream_requested"
            assert cand_req["examiner_user_id"] == examiner.id

            # 5. Candidate sends SDP Offer for Examiner
            fake_sdp = {"type": "offer", "sdp": "v=0\r\no=- 123 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\n"}
            cand_ws.send_json({
                "type": "offer",
                "target_user_id": examiner.id,
                "sdp": fake_sdp
            })

            # Examiner receives SDP Offer
            exam_offer = exam_ws.receive_json()
            assert exam_offer["type"] == "offer"
            assert exam_offer["session_id"] == session.id
            assert exam_offer["sdp"] == fake_sdp

            # 6. Examiner sends SDP Answer back to Candidate
            fake_answer = {"type": "answer", "sdp": "v=0\r\no=- 456 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\n"}
            exam_ws.send_json({
                "type": "answer",
                "session_id": session.id,
                "sdp": fake_answer
            })

            # Candidate receives SDP Answer
            cand_ans = cand_ws.receive_json()
            assert cand_ans["type"] == "answer"
            assert cand_ans["examiner_user_id"] == examiner.id
            assert cand_ans["sdp"] == fake_answer

            # 7. Candidate sends real-time proctoring status update
            cand_ws.send_json({
                "type": "proctor_status",
                "face_detected": False,
                "multiple_faces": True,
                "tab_switch_count": 1
            })

            # Examiner receives real-time proctor update
            exam_proctor = exam_ws.receive_json()
            assert exam_proctor["type"] == "CANDIDATE_PROCTOR_UPDATE"
            assert exam_proctor["session_id"] == session.id
            assert exam_proctor["data"]["face_detected"] is False
            assert exam_proctor["data"]["multiple_faces"] is True

        # Examiner disconnected
        assert examiner.id not in signaling_manager.examiners

    # Candidate disconnected
    assert session.id not in signaling_manager.candidates
