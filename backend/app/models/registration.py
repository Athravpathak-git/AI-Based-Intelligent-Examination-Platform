from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.db.database import Base

class ExamRegistration(Base):
    __tablename__ = "exam_registrations"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    exam_id = Column(Integer, ForeignKey("exams.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    registered_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    status = Column(String(50), default="REGISTERED", nullable=False)  # REGISTERED, CANCELLED

    # Relationships
    exam = relationship("Exam", back_populates="registrations")
    student = relationship("User", back_populates="registrations")

    __table_args__ = (
        UniqueConstraint("exam_id", "student_id", name="uq_exam_student_registration"),
    )
