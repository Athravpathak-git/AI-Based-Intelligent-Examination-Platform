from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, JSON, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from app.db.database import Base

class ExamSession(Base):
    __tablename__ = "exam_sessions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    exam_id = Column(Integer, ForeignKey("exams.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    started_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    submitted_at = Column(DateTime(timezone=True), nullable=True)
    status = Column(String(50), default="ACTIVE", nullable=False)  # ACTIVE, SUBMITTED, EXPIRED
    session_token = Column(String(255), unique=True, index=True, nullable=False)
    suspicion_score = Column(Float, default=0.0, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    exam = relationship("Exam", back_populates="sessions")
    student = relationship("User", back_populates="sessions")
    answers = relationship("Answer", back_populates="session", cascade="all, delete-orphan")
    result = relationship("Result", back_populates="session", uselist=False, cascade="all, delete-orphan")
    proctor_events = relationship("ProctorEvent", back_populates="session", cascade="all, delete-orphan")

    __table_args__ = (
        # Prevent multiple active sessions for the same student on the same exam
        # We enforce in code/query or partial unique constraint
    )

class Answer(Base):
    __tablename__ = "answers"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    session_id = Column(Integer, ForeignKey("exam_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    question_id = Column(Integer, ForeignKey("question_bank.id", ondelete="CASCADE"), nullable=False, index=True)
    selected_option_ids = Column(JSON, nullable=True)  # List of integer option IDs
    answer_text = Column(Text, nullable=True)
    image_path = Column(String(500), nullable=True)
    thumbnail_path = Column(String(500), nullable=True)
    ocr_text = Column(Text, nullable=True)
    ai_suggested_marks = Column(Float, nullable=True)
    ai_justification = Column(Text, nullable=True)
    ai_evaluation = Column(JSON, nullable=True)
    submitted_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    marks_awarded = Column(Float, nullable=True)
    evaluator_feedback = Column(Text, nullable=True)
    is_marked_for_review = Column(Boolean, default=False, nullable=False)
    is_evaluated = Column(Boolean, default=False, nullable=False)

    # Relationships
    session = relationship("ExamSession", back_populates="answers")
    question = relationship("QuestionBank", back_populates="answers")
