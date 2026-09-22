from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict

class ExamAccessGrantRequest(BaseModel):
    exam_id: int
    student_id: int
    max_additional_attempts: int = Field(default=1, ge=1, le=10)
    expires_at: Optional[datetime] = None
    reason: Optional[str] = Field(default="Authorized Re-attempt", max_length=500)
    notes: Optional[str] = Field(default=None, max_length=1000)

class ReattemptRequestCreate(BaseModel):
    exam_id: int
    student_id: Optional[int] = None
    reason: str = Field(..., min_length=3, max_length=500)
    notes: Optional[str] = None

class ReattemptActionRequest(BaseModel):
    notes: Optional[str] = None

class ExamAccessResponse(BaseModel):
    id: int
    exam_id: int
    exam_name: Optional[str] = None
    student_id: int
    student_name: Optional[str] = None
    student_email: Optional[str] = None
    student_registration_number: Optional[str] = None
    granted_by: Optional[int] = None
    grantor_name: Optional[str] = None
    requested_by_id: Optional[int] = None
    requester_name: Optional[str] = None
    permission_type: str
    max_additional_attempts: int
    attempts_used: int
    status: str
    reason: Optional[str] = None
    notes: Optional[str] = None
    granted_at: datetime
    expires_at: Optional[datetime] = None
    revoked_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ExamInstructionAcceptanceRequest(BaseModel):
    accepted: bool = True

class ExamInstructionAcceptanceResponse(BaseModel):
    id: int
    exam_id: int
    student_id: int
    session_id: Optional[int] = None
    accepted: bool
    accepted_at: datetime

    model_config = ConfigDict(from_attributes=True)

class StudentAttemptHistoryItem(BaseModel):
    session_id: int
    attempt_number: int
    exam_id: int
    exam_name: str
    started_at: datetime
    submitted_at: Optional[datetime] = None
    status: str
    score: Optional[float] = None
    maximum_marks: Optional[float] = None
    percentage: Optional[float] = None
    result_status: Optional[str] = None
    violations_count: int = 0

class EligibleCandidateResponse(BaseModel):
    student_id: int
    name: str
    student_name: Optional[str] = None
    email: str
    student_email: Optional[str] = None
    registration_number: Optional[str] = None
    student_registration_number: Optional[str] = None
    attempt_count: int = 1
    latest_session_id: int
    latest_status: str
    latest_submitted_at: Optional[datetime] = None
    latest_score: Optional[float] = None
    maximum_marks: Optional[float] = None
    percentage: Optional[float] = None
    pending_request_exists: bool = False
    active_permission_exists: bool = False

