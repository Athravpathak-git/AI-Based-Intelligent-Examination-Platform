from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.db.database import Base

class Exam(Base):
    __tablename__ = "exams"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    subject = Column(String(100), nullable=False, index=True)
    description = Column(String(1000), nullable=True)
    duration_minutes = Column(Integer, nullable=False)
    start_time = Column(DateTime(timezone=True), nullable=False)
    end_time = Column(DateTime(timezone=True), nullable=False)
    total_questions = Column(Integer, nullable=False)
    maximum_marks = Column(Float, nullable=False)
    negative_marking_enabled = Column(Boolean, default=False, nullable=False)
    negative_mark_value = Column(Float, default=0.0, nullable=True)
    randomize_questions = Column(Boolean, default=True, nullable=False)
    randomize_options = Column(Boolean, default=True, nullable=False)
    per_student_unique_paper = Column(Boolean, default=True, nullable=False)
    maximum_tab_switch_warnings = Column(Integer, default=3, nullable=False)
    webcam_monitoring_enabled = Column(Boolean, default=True, nullable=False)
    gaze_sensitivity = Column(Float, default=0.5, nullable=False)
    question_selection_rules = Column(JSON, nullable=True)  # List of {subject, difficulty, question_type, count}
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    is_deleted = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    creator = relationship("User", back_populates="exams")
    exam_questions = relationship("ExamQuestion", back_populates="exam", cascade="all, delete-orphan", order_by="ExamQuestion.question_order")
    sessions = relationship("ExamSession", back_populates="exam", cascade="all, delete-orphan")
    results = relationship("Result", back_populates="exam", cascade="all, delete-orphan")
    registrations = relationship("ExamRegistration", back_populates="exam", cascade="all, delete-orphan")

class ExamQuestion(Base):
    __tablename__ = "exam_questions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    exam_id = Column(Integer, ForeignKey("exams.id", ondelete="CASCADE"), nullable=False, index=True)
    question_id = Column(Integer, ForeignKey("question_bank.id", ondelete="CASCADE"), nullable=False, index=True)
    marks_override = Column(Float, nullable=True)
    question_order = Column(Integer, default=0, nullable=False)

    # Relationships
    exam = relationship("Exam", back_populates="exam_questions")
    question = relationship("QuestionBank", back_populates="exam_questions")
