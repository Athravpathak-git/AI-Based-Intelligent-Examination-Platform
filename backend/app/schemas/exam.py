from datetime import datetime
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field, model_validator, ConfigDict
from app.models.question import QuestionType, DifficultyLevel
from app.schemas.question import QuestionStudentResponse

class QuestionSelectionRule(BaseModel):
    subject: Optional[str] = None
    topic: Optional[str] = None
    subtopic: Optional[str] = None
    difficulty: Optional[DifficultyLevel] = None
    question_type: Optional[QuestionType] = None
    count: int = Field(..., gt=0)

class ExamCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    subject: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=1000)
    duration_minutes: int = Field(..., gt=0)
    start_time: datetime
    end_time: datetime
    total_questions: int = Field(..., gt=0)
    maximum_marks: float = Field(..., gt=0)
    negative_marking_enabled: bool = False
    negative_mark_value: Optional[float] = Field(default=0.0, ge=0.0)
    randomize_questions: bool = True
    randomize_options: bool = True
    per_student_unique_paper: bool = True
    maximum_tab_switch_warnings: int = Field(default=3, ge=0)
    webcam_monitoring_enabled: bool = True
    gaze_sensitivity: float = Field(default=0.5, ge=0.0, le=1.0)
    question_selection_rules: Optional[List[QuestionSelectionRule]] = None

    @model_validator(mode="after")
    def validate_exam_times(self):
        if self.end_time <= self.start_time:
            raise ValueError("end_time must be after start_time")
        return self

class ExamUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    subject: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=1000)
    duration_minutes: Optional[int] = Field(None, gt=0)
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    total_questions: Optional[int] = Field(None, gt=0)
    maximum_marks: Optional[float] = Field(None, gt=0)
    negative_marking_enabled: Optional[bool] = None
    negative_mark_value: Optional[float] = Field(None, ge=0.0)
    randomize_questions: Optional[bool] = None
    randomize_options: Optional[bool] = None
    per_student_unique_paper: Optional[bool] = None
    maximum_tab_switch_warnings: Optional[int] = Field(None, ge=0)
    webcam_monitoring_enabled: Optional[bool] = None
    gaze_sensitivity: Optional[float] = Field(None, ge=0.0, le=1.0)
    question_selection_rules: Optional[List[QuestionSelectionRule]] = None

    @model_validator(mode="after")
    def validate_exam_times(self):
        if self.start_time and self.end_time and self.end_time <= self.start_time:
            raise ValueError("end_time must be after start_time")
        return self

class ExamResponse(BaseModel):
    id: int
    name: str
    subject: str
    description: Optional[str] = None
    duration_minutes: int
    start_time: datetime
    end_time: datetime
    total_questions: int
    maximum_marks: float
    negative_marking_enabled: bool
    negative_mark_value: Optional[float] = 0.0
    randomize_questions: bool
    randomize_options: bool
    per_student_unique_paper: bool
    maximum_tab_switch_warnings: int
    webcam_monitoring_enabled: bool
    gaze_sensitivity: float
    question_selection_rules: Optional[List[Dict[str, Any]]] = None
    created_by: Optional[int] = None
    created_at: datetime
    is_registered: Optional[bool] = None
    is_completed: Optional[bool] = None
    has_active_reattempt: Optional[bool] = None
    can_start: Optional[bool] = None

    model_config = ConfigDict(from_attributes=True)

class ExamStudentListResponse(BaseModel):
    id: int
    name: str
    subject: str
    description: Optional[str] = None
    duration_minutes: int
    start_time: datetime
    end_time: datetime
    total_questions: int
    maximum_marks: float
    negative_marking_enabled: bool
    negative_mark_value: Optional[float] = 0.0
    webcam_monitoring_enabled: bool
    is_active_window: bool
    is_registered: bool = False
    is_completed: bool = False
    has_active_reattempt: bool = False
    can_start: bool = False

    model_config = ConfigDict(from_attributes=True)

class ExamRegistrationResponse(BaseModel):
    id: int
    exam_id: int
    student_id: int
    registered_at: datetime
    status: str
    exam_name: Optional[str] = None
    subject: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    is_registered: bool = True

    model_config = ConfigDict(from_attributes=True)

class ExamCandidateResponse(BaseModel):
    id: int
    student_id: int
    name: str
    email: str
    registration_number: Optional[str] = None
    mobile_number: Optional[str] = None
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    college: Optional[str] = None
    university: Optional[str] = None
    course: Optional[str] = None
    specialization: Optional[str] = None
    year_semester: Optional[str] = None
    enrollment_number: Optional[str] = None
    graduation_year: Optional[int] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    pin_code: Optional[str] = None
    is_active: Optional[bool] = True
    user_created_at: Optional[datetime] = None
    exam_name: Optional[str] = None
    exam_subject: Optional[str] = None
    exam_status: Optional[str] = None
    maximum_marks: Optional[float] = None
    registered_at: datetime
    status: str
    attempt_status: Optional[str] = "NOT_STARTED"
    score: Optional[float] = None
    percentage: Optional[float] = None
    result_status: Optional[str] = None
    proctoring_violations_count: Optional[int] = 0

    model_config = ConfigDict(from_attributes=True)

class PaperGenerateResponse(BaseModel):
    exam_id: int
    exam_name: str
    subject: str
    duration_minutes: int
    total_questions: int
    maximum_marks: float
    start_time: datetime
    end_time: datetime
    student_id: int
    questions: List[QuestionStudentResponse]
