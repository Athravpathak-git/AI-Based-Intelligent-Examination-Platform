from datetime import datetime
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field, ConfigDict
from app.schemas.question import QuestionStudentResponse

class AnswerSubmitItem(BaseModel):
    question_id: int
    selected_option_ids: Optional[List[int]] = None
    answer_text: Optional[str] = None
    image_path: Optional[str] = None

class ProctorEventCreate(BaseModel):
    event_type: str  # TAB_SWITCH, WINDOW_BLUR, WINDOW_FOCUS, WEBCAM_DISCONNECTED
    event_data: Optional[Dict[str, Any]] = None
    severity: str = "LOW"  # LOW, MEDIUM, HIGH, CRITICAL

class ProctorEventResponse(BaseModel):
    id: int
    session_id: int
    event_type: str
    event_data: Optional[Dict[str, Any]] = None
    severity: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ProctorEventActionResponse(BaseModel):
    id: int
    session_id: int
    event_type: str
    severity: str = "LOW"
    event_data: Optional[Dict[str, Any]] = None
    created_at: datetime
    warning_issued: bool = False
    current_warnings: int = 0
    maximum_allowed: int = 0
    auto_submitted: bool = False
    session_status: str = "ACTIVE"
    submission_reason: Optional[str] = None
    result_id: Optional[int] = None
    message: str = ""

    model_config = ConfigDict(from_attributes=True)

class SessionHeartbeatResponse(BaseModel):
    session_id: int
    status: str
    remaining_seconds: int
    tab_switch_count: int
    auto_submitted: bool = False
    result_id: Optional[int] = None
    submission_reason: Optional[str] = None
    suspicion_score: Optional[float] = 0.0

    model_config = ConfigDict(from_attributes=True)

class SavedAnswerItem(BaseModel):
    question_id: int
    selected_option_ids: Optional[List[int]] = None
    answer_text: Optional[str] = None
    image_path: Optional[str] = None
    is_marked_for_review: bool = False

    model_config = ConfigDict(from_attributes=True)

class SessionStartResponse(BaseModel):
    session_id: int
    exam_id: int
    exam_name: str
    subject: str
    duration_minutes: int
    started_at: datetime
    remaining_seconds: int
    status: str
    session_token: str
    exam_access_token: Optional[str] = None
    maximum_tab_switch_warnings: int
    current_tab_warnings: int
    tab_switch_count: Optional[int] = 0
    submission_reason: Optional[str] = None
    webcam_monitoring_enabled: bool
    questions: List[QuestionStudentResponse]
    saved_answers: Optional[List[SavedAnswerItem]] = None

class AnswerSaveRequest(BaseModel):
    question_id: int
    selected_option_ids: Optional[List[int]] = None
    answer_text: Optional[str] = None
    text_answer: Optional[str] = None
    image_path: Optional[str] = None
    is_marked_for_review: Optional[bool] = False

class AnswerSaveResponse(BaseModel):
    status: str
    question_id: int
    is_marked_for_review: bool = False
    saved_at: datetime

class QuestionResultBreakdown(BaseModel):
    question_id: int
    question_text: str
    question_type: str
    marks_possible: float
    marks_awarded: float
    negative_marks_deducted: float
    is_correct: bool
    is_attempted: bool
    is_marked_for_review: Optional[bool] = False
    selected_option_ids: Optional[List[int]] = None
    correct_option_ids: Optional[List[int]] = None
    student_text_answer: Optional[str] = None
    evaluator_feedback: Optional[str] = None
    image_path: Optional[str] = None
    thumbnail_path: Optional[str] = None
    ocr_text: Optional[str] = None
    ai_suggested_marks: Optional[float] = None
    ai_justification: Optional[str] = None
    ai_evaluation: Optional[Dict[str, Any]] = None
    model_answer: Optional[str] = None
    explanation: Optional[str] = None
    is_evaluated: Optional[bool] = False
    options_info: Optional[List[Dict[str, Any]]] = None
    translations: Optional[Dict[str, str]] = None

class ExamSubmissionResult(BaseModel):
    result_id: int
    exam_id: int
    exam_name: str
    subject: str
    student_id: int
    student_name: str
    registration_number: Optional[str] = None
    session_id: int
    attempt_number: Optional[int] = 1
    student_enrollment_number: Optional[str] = None
    total_questions: int
    attempted_questions: int
    correct_answers: int
    incorrect_answers: int
    unanswered_questions: int
    total_marks: Optional[float] = 0.0
    negative_marks_deducted: float = 0.0
    maximum_marks: float = 0.0
    percentage: Optional[float] = 0.0
    passed: Optional[bool] = False
    status: Optional[str] = "PASSED"
    result_status: Optional[str] = "PASSED"
    evaluation_status: Optional[str] = "SUBMITTED"
    is_published: Optional[bool] = False
    evaluation_finalized_at: Optional[datetime] = None
    result_published_at: Optional[datetime] = None
    evaluated_by_id: Optional[int] = None
    evaluated_by_name: Optional[str] = None
    evaluator_remarks: Optional[str] = None
    submission_status: Optional[str] = None
    submission_reason: Optional[str] = None
    suspicion_score: Optional[float] = 0.0
    submitted_at: datetime
    breakdown: Optional[List[QuestionResultBreakdown]] = None

    model_config = ConfigDict(from_attributes=True)

class SubjectiveReviewItem(BaseModel):
    question_id: int
    marks_awarded: float
    feedback: Optional[str] = None

class ReviewResultRequest(BaseModel):
    question_reviews: List[SubjectiveReviewItem]
    status: Optional[str] = None

class ImageUploadResponse(BaseModel):
    status: str = "uploaded"
    session_id: int
    question_id: int
    image_path: str
    thumbnail_path: str
    ocr_text: Optional[str] = None
    uploaded_at: datetime

    model_config = ConfigDict(from_attributes=True)

# Dedicated Valuation API Schemas
class GradeQuestionRequest(BaseModel):
    question_id: int
    marks_awarded: float
    evaluator_feedback: Optional[str] = None

class FinalizeEvaluationRequest(BaseModel):
    evaluator_remarks: Optional[str] = None
    status: Optional[str] = None

class PublishResultRequest(BaseModel):
    evaluator_remarks: Optional[str] = None
    status: Optional[str] = None

class PendingEvaluationItem(BaseModel):
    session_id: int
    result_id: Optional[int] = None
    exam_id: int
    exam_name: str
    subject: str
    student_id: int
    student_name: str
    registration_number: Optional[str] = None
    attempt_number: int = 1
    submitted_at: datetime
    evaluation_status: str
    total_questions: int
    evaluated_questions: int
    progress_percentage: float
    has_subjective: bool

class EvaluationSessionDetailResponse(BaseModel):
    session_id: int
    result_id: Optional[int] = None
    exam_id: int
    exam_name: str
    subject: str
    maximum_marks: float
    duration_minutes: int
    student_id: int
    student_name: str
    registration_number: Optional[str] = None
    student_email: Optional[str] = None
    attempt_number: int = 1
    started_at: datetime
    submitted_at: datetime
    evaluation_status: str
    is_finalized: bool
    is_published: bool
    evaluation_finalized_at: Optional[datetime] = None
    result_published_at: Optional[datetime] = None
    evaluated_by_id: Optional[int] = None
    evaluated_by_name: Optional[str] = None
    evaluator_remarks: Optional[str] = None
    total_questions: int
    evaluated_questions: int
    progress_percentage: float
    current_total_marks: float
    status: Optional[str] = None
    questions: List[QuestionResultBreakdown]


