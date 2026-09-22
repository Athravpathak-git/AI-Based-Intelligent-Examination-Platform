from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator, ConfigDict
from app.models.question import QuestionType, DifficultyLevel

class OptionCreate(BaseModel):
    option_text: str = Field(..., min_length=1)
    is_correct: bool = False
    option_order: int = 0

class OptionUpdate(BaseModel):
    id: Optional[int] = None
    option_text: str = Field(..., min_length=1)
    is_correct: bool = False
    option_order: int = 0

class OptionResponse(BaseModel):
    id: int
    option_text: str
    is_correct: bool
    option_order: int

    model_config = ConfigDict(from_attributes=True)

class OptionStudentResponse(BaseModel):
    id: int
    option_text: str
    option_order: int

    model_config = ConfigDict(from_attributes=True)

class QuestionCreate(BaseModel):
    subject: str = Field(..., min_length=1, max_length=100)
    topic: Optional[str] = None
    subtopic: Optional[str] = None
    question_text: str = Field(..., min_length=3)
    question_type: QuestionType
    difficulty: DifficultyLevel = DifficultyLevel.MEDIUM
    marks: float = Field(default=1.0, gt=0, le=100)
    negative_marks: float = Field(default=0.0, ge=0)
    expected_answer: Optional[str] = None
    model_answer: Optional[str] = None
    explanation: Optional[str] = None
    tags: Optional[str] = None
    is_active: bool = True
    options: Optional[List[OptionCreate]] = []

class QuestionUpdate(BaseModel):
    subject: Optional[str] = Field(None, min_length=1, max_length=100)
    topic: Optional[str] = None
    subtopic: Optional[str] = None
    question_text: Optional[str] = Field(None, min_length=3)
    question_type: Optional[QuestionType] = None
    difficulty: Optional[DifficultyLevel] = None
    marks: Optional[float] = Field(None, gt=0, le=100)
    negative_marks: Optional[float] = Field(None, ge=0)
    expected_answer: Optional[str] = None
    model_answer: Optional[str] = None
    explanation: Optional[str] = None
    tags: Optional[str] = None
    is_active: Optional[bool] = None
    options: Optional[List[OptionUpdate]] = None

class QuestionResponse(BaseModel):
    id: int
    subject: str
    topic: Optional[str] = None
    subtopic: Optional[str] = None
    question_text: str
    question_type: QuestionType
    difficulty: DifficultyLevel
    marks: float
    negative_marks: float
    expected_answer: Optional[str] = None
    model_answer: Optional[str] = None
    explanation: Optional[str] = None
    tags: Optional[str] = None
    is_active: bool = True
    created_by: Optional[int] = None
    created_at: datetime
    options: List[OptionResponse] = []

    model_config = ConfigDict(from_attributes=True)

class QuestionStudentResponse(BaseModel):
    id: int
    subject: str
    question_text: str
    question_type: QuestionType
    difficulty: DifficultyLevel
    marks: float
    options: List[OptionStudentResponse] = []

    model_config = ConfigDict(from_attributes=True)

class QuestionImportOptionItem(BaseModel):
    option_text: str
    is_correct: bool = False
    option_order: int = 0

class QuestionImportItem(BaseModel):
    row_index: int
    subject: str = ""
    topic: Optional[str] = None
    subtopic: Optional[str] = None
    question_text: str = ""
    question_type: str = "MCQ"
    difficulty: str = "MEDIUM"
    marks: float = 1.0
    negative_marks: float = 0.0
    options: List[QuestionImportOptionItem] = []
    expected_answer: Optional[str] = None
    model_answer: Optional[str] = None
    explanation: Optional[str] = None
    tags: Optional[str] = None
    status: str = "VALID"  # "VALID" | "INVALID" | "DUPLICATE"
    errors: List[str] = []
    warnings: List[str] = []

class QuestionImportPreviewResponse(BaseModel):
    filename: str
    file_type: str
    total_detected: int
    valid_count: int
    invalid_count: int
    duplicate_count: int
    questions: List[QuestionImportItem]

class QuestionImportConfirmRequest(BaseModel):
    questions: List[QuestionImportItem]
    skip_invalid: bool = True
    allow_duplicates: bool = False

class QuestionImportConfirmResponse(BaseModel):
    imported_count: int
    skipped_invalid_count: int
    skipped_duplicate_count: int
    message: str
