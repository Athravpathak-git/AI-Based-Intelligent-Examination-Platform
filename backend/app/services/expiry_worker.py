import asyncio
import logging
from datetime import datetime, timezone, timedelta
from app.db.database import SessionLocal
from app.models.session import ExamSession
from app.services.session_service import finalize_and_grade_session
from app.services.paper_generator import ensure_utc

logger = logging.getLogger("expiry_worker")

from typing import Optional
from sqlalchemy.orm import Session

def expire_active_sessions_sync(db: Optional[Session] = None) -> int:
    """Find all active exam sessions whose deadline has passed and finalize them with TIME_EXPIRED.
    Idempotent and server-authoritative.
    """
    should_close = False
    if db is None:
        db = SessionLocal()
        should_close = True
    try:
        now = datetime.now(timezone.utc)
        active_sessions = db.query(ExamSession).filter(ExamSession.status == "ACTIVE").all()
        expired_count = 0

        for session in active_sessions:
            exam = session.exam
            if not exam:
                continue

            session_deadline = ensure_utc(session.started_at) + timedelta(minutes=exam.duration_minutes)
            exam_end_utc = ensure_utc(exam.end_time)
            effective_deadline = min(session_deadline, exam_end_utc)

            if now >= effective_deadline:
                try:
                    finalize_and_grade_session(
                        db=db,
                        session_id=session.id,
                        student=session.student,
                        auto_reason="TIME_EXPIRED"
                    )
                    expired_count += 1
                    logger.info(f"Auto-expired session #{session.id} for student #{session.student_id} (Reason: TIME_EXPIRED).")
                except Exception as ex:
                    logger.error(f"Error finalizing expired session #{session.id}: {ex}")
                    db.rollback()

        return expired_count
    finally:
        db.close()

# APScheduler initialization
try:
    from apscheduler.schedulers.asyncio import AsyncIOScheduler
    scheduler = AsyncIOScheduler()
    scheduler.add_job(
        expire_active_sessions_sync,
        "interval",
        seconds=10,
        id="session_expiry_job",
        replace_existing=True
    )
except ImportError:
    scheduler = None

async def background_expiry_loop():
    """Asyncio background task running every 10 seconds as guaranteed runner."""
    while True:
        try:
            await asyncio.to_thread(expire_active_sessions_sync)
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Error in background expiry loop: {e}")
        await asyncio.sleep(10)
