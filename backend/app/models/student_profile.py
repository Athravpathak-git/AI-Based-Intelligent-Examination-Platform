from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.db.database import Base

class StudentProfile(Base):
    __tablename__ = "student_profiles"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)

    # Personal Information
    date_of_birth = Column(String(50), nullable=True)
    gender = Column(String(20), nullable=True)
    mobile_number = Column(String(20), nullable=True)
    profile_photo_url = Column(String(500), nullable=True)

    # Academic Information
    college = Column(String(255), nullable=True)
    university = Column(String(255), nullable=True)
    course = Column(String(255), nullable=True)
    specialization = Column(String(255), nullable=True)
    year_semester = Column(String(50), nullable=True)
    enrollment_number = Column(String(100), nullable=True)
    graduation_year = Column(Integer, nullable=True)

    # Address Information
    address = Column(String(500), nullable=True)
    city = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    country = Column(String(100), nullable=True, default="India")
    pin_code = Column(String(20), nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    user = relationship("User", back_populates="student_profile")
