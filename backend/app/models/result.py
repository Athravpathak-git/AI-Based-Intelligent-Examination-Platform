from datetime import datetime, timezone
from sqlalchemy import Column, Integer, Float, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.db.database import Base

class Result(Base):
    __tablename__ = "results"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    exam_id = Column(Integer, ForeignKey("exams.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    session_id = Column(Integer, ForeignKey("exam_sessions.id", ondelete="CASCADE"), nullable=False, unique=True)
    total_marks = Column(Float, nullable=False)
    maximum_marks = Column(Float, nullable=False)
    percentage = Column(Float, nullable=False)
    status = Column(String(50), default="PASSED", nullable=False)
    evaluation_status = Column(String(50), default="SUBMITTED", nullable=False, index=True)
    evaluation_finalized_at = Column(DateTime(timezone=True), nullable=True)
    result_published_at = Column(DateTime(timezone=True), nullable=True)
    evaluated_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    evaluator_remarks = Column(Text, nullable=True)
    pdf_download_count = Column(Integer, default=0, nullable=False)
    pdf_last_downloaded_at = Column(DateTime(timezone=True), nullable=True)
    suspicion_score = Column(Float, default=0.0, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    exam = relationship("Exam", back_populates="results")
    student = relationship("User", foreign_keys=[student_id], back_populates="results")
    evaluator = relationship("User", foreign_keys=[evaluated_by_id])
    session = relationship("ExamSession", back_populates="result")

