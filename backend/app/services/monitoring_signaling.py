from datetime import datetime, timezone
from typing import Dict, Optional, Set, List, Any
import logging
from fastapi import WebSocket

logger = logging.getLogger("monitoring_signaling")

class CandidateConnection:
    def __init__(
        self,
        session_id: int,
        student_id: int,
        student_name: str,
        exam_id: int,
        websocket: WebSocket
    ):
        self.session_id = session_id
        self.student_id = student_id
        self.student_name = student_name
        self.exam_id = exam_id
        self.websocket = websocket
        self.camera_active: bool = True
        self.face_detected: bool = True
        self.multiple_faces: bool = False
        self.tab_switches: int = 0
        self.suspicious_activity: int = 0
        self.connected_at = datetime.now(timezone.utc)
        self.last_heartbeat = datetime.now(timezone.utc)

class ExaminerConnection:
    def __init__(
        self,
        user_id: int,
        user_name: str,
        role: str,
        created_exam_ids: Optional[Set[int]],
        websocket: WebSocket
    ):
        self.user_id = user_id
        self.user_name = user_name
        self.role = role  # "EXAMINER" or "ADMIN"
        self.created_exam_ids = created_exam_ids  # None means ADMIN (unrestricted)
        self.websocket = websocket
        self.connected_at = datetime.now(timezone.utc)

class MonitoringSignalingManager:
    """
    Manages WebRTC signaling, live video stream negotiation, and real-time
    proctoring telemetry between active exam candidates and authorized examiners/admins.
    Strictly prevents unauthorized candidates from accessing any live streams.
    """
    def __init__(self):
        # session_id -> CandidateConnection
        self.candidates: Dict[int, CandidateConnection] = {}
        # user_id -> ExaminerConnection
        self.examiners: Dict[int, ExaminerConnection] = {}

    def is_examiner_authorized(self, examiner_user_id: int, exam_id: int) -> bool:
        """Check if the examiner/admin is authorized to view a stream for this exam."""
        examiner = self.examiners.get(examiner_user_id)
        if not examiner:
            return False
        if examiner.role == "ADMIN":
            return True
        if examiner.created_exam_ids is not None:
            return exam_id in examiner.created_exam_ids
        return False

    async def register_candidate(
        self,
        session_id: int,
        student_id: int,
        student_name: str,
        exam_id: int,
        websocket: WebSocket
    ) -> CandidateConnection:
        conn = CandidateConnection(
            session_id=session_id,
            student_id=student_id,
            student_name=student_name,
            exam_id=exam_id,
            websocket=websocket
        )
        self.candidates[session_id] = conn
        logger.info(f"Registered candidate session {session_id} for student {student_name} (exam {exam_id})")

        # Notify authorized examiners about candidate coming online
        await self.broadcast_candidate_status(
            session_id=session_id,
            status_type="CANDIDATE_ONLINE",
            data={
                "session_id": session_id,
                "student_id": student_id,
                "student_name": student_name,
                "exam_id": exam_id,
                "camera_active": conn.camera_active,
                "face_detected": conn.face_detected,
                "multiple_faces": conn.multiple_faces
            }
        )
        return conn

    async def disconnect_candidate(self, session_id: int):
        conn = self.candidates.pop(session_id, None)
        if conn:
            logger.info(f"Disconnected candidate session {session_id}")
            await self.broadcast_candidate_status(
                session_id=session_id,
                status_type="CANDIDATE_OFFLINE",
                data={"session_id": session_id, "reason": "DISCONNECTED"}
            )

    async def register_examiner(
        self,
        user_id: int,
        user_name: str,
        role: str,
        created_exam_ids: Optional[Set[int]],
        websocket: WebSocket
    ) -> ExaminerConnection:
        conn = ExaminerConnection(
            user_id=user_id,
            user_name=user_name,
            role=role,
            created_exam_ids=created_exam_ids,
            websocket=websocket
        )
        self.examiners[user_id] = conn
        logger.info(f"Registered examiner {user_name} ({role}, id {user_id})")

        # Send initial list of active candidate sessions authorized for this examiner
        active_list = []
        for sid, cand in self.candidates.items():
            if conn.role == "ADMIN" or (conn.created_exam_ids and cand.exam_id in conn.created_exam_ids):
                active_list.append({
                    "session_id": cand.session_id,
                    "student_id": cand.student_id,
                    "student_name": cand.student_name,
                    "exam_id": cand.exam_id,
                    "camera_active": cand.camera_active,
                    "face_detected": cand.face_detected,
                    "multiple_faces": cand.multiple_faces
                })

        try:
            await websocket.send_json({
                "type": "INITIAL_ONLINE_CANDIDATES",
                "candidates": active_list
            })
        except Exception as e:
            logger.warning(f"Failed to send initial candidate list to examiner {user_id}: {e}")

        return conn

    async def disconnect_examiner(self, user_id: int):
        self.examiners.pop(user_id, None)
        logger.info(f"Disconnected examiner id {user_id}")

    async def broadcast_candidate_status(self, session_id: int, status_type: str, data: Optional[Dict[str, Any]] = None):
        """Broadcast real-time candidate proctoring and connection events to authorized examiners."""
        cand = self.candidates.get(session_id)
        exam_id = cand.exam_id if cand else (data.get("exam_id") if data else None)

        msg = {
            "type": status_type,
            "session_id": session_id,
            "data": data or {},
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

        dead_examiners = []
        for uid, ex in self.examiners.items():
            # Check exam authorization
            if exam_id is not None:
                if ex.role != "ADMIN" and (ex.created_exam_ids is None or exam_id not in ex.created_exam_ids):
                    continue

            try:
                await ex.websocket.send_json(msg)
            except Exception:
                dead_examiners.append(uid)

        for uid in dead_examiners:
            self.examiners.pop(uid, None)

    async def send_to_candidate(self, session_id: int, message: Dict[str, Any]) -> bool:
        """Route WebRTC signaling message (e.g. stream request, offer, answer, ICE candidate) to candidate."""
        cand = self.candidates.get(session_id)
        if not cand:
            return False
        try:
            await cand.websocket.send_json(message)
            return True
        except Exception as e:
            logger.warning(f"Error sending message to candidate {session_id}: {e}")
            return False

    async def send_to_examiner(self, examiner_user_id: int, message: Dict[str, Any]) -> bool:
        """Route WebRTC signaling message (e.g. SDP offer, answer, ICE candidate) to target examiner."""
        examiner = self.examiners.get(examiner_user_id)
        if not examiner:
            return False
        try:
            await examiner.websocket.send_json(message)
            return True
        except Exception as e:
            logger.warning(f"Error sending message to examiner {examiner_user_id}: {e}")
            return False

# Global singleton signaling manager
signaling_manager = MonitoringSignalingManager()
