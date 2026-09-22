from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.db.database import Base

class ExamAttemptPermission(Base):
    __tablename__ = "exam_attempt_permissions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    exam_id = Column(Integer, ForeignKey("exams.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    granted_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    requested_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    permission_type = Column(String(50), default="REATTEMPT", nullable=False)
    max_additional_attempts = Column(Integer, default=1, nullable=False)
    attempts_used = Column(Integer, default=0, nullable=False)
    status = Column(String(50), default="ACTIVE", nullable=False)  # PENDING_ADMIN_APPROVAL, ACTIVE, USED, REVOKED, REJECTED, EXPIRED
    reason = Column(String(500), nullable=True)
    notes = Column(String(1000), nullable=True)
    granted_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    revoked_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    exam = relationship("Exam")
    student = relationship("User", foreign_keys=[student_id])
    grantor = relationship("User", foreign_keys=[granted_by])
    requested_by = relationship("User", foreign_keys=[requested_by_id])

class ExamInstructionAcceptance(Base):
    __tablename__ = "exam_instruction_acceptances"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    session_id = Column(Integer, ForeignKey("exam_sessions.id", ondelete="CASCADE"), nullable=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    exam_id = Column(Integer, ForeignKey("exams.id", ondelete="CASCADE"), nullable=False, index=True)
    accepted = Column(Boolean, default=True, nullable=False)
    accepted_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    student = relationship("User", foreign_keys=[student_id])
    exam = relationship("Exam", foreign_keys=[exam_id])
    session = relationship("ExamSession", foreign_keys=[session_id])
