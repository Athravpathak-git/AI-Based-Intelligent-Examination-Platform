export type UserRole = "STUDENT" | "EXAMINER" | "ADMIN";

export type QuestionType =
  | "MCQ"
  | "MULTI_SELECT"
  | "SHORT_ANSWER"
  | "LONG_ANSWER"
  | "IMAGE_UPLOAD";

export type DifficultyLevel = "EASY" | "MEDIUM" | "HARD";

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  registration_number?: string;
  is_active: boolean;
  created_at?: string;
}

export interface Option {
  id?: number;
  option_text: string;
  is_correct: boolean;
  option_order?: number;
}

export interface Question {
  id: number;
  subject: string;
  topic?: string;
  subtopic?: string;
  question_text: string;
  question_type: QuestionType;
  difficulty: DifficultyLevel;
  marks: number;
  negative_marks: number;
  expected_answer?: string;
  model_answer?: string;
  explanation?: string;
  tags?: string;
  is_active?: boolean;
  options: Option[];
  created_by?: number;
  created_at?: string;
}

export interface QuestionSelectionRule {
  subject?: string;
  topic?: string;
  subtopic?: string;
  difficulty?: DifficultyLevel;
  question_type?: QuestionType;
  count: number;
}

export interface Subject {
  id: number;
  name: string;
  code: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Exam {
  id: number;
  name: string;
  subject: string;
  duration_minutes: number;
  start_time: string;
  end_time: string;
  total_questions: number;
  maximum_marks: number;
  passing_marks?: number;
  negative_marking_enabled: boolean;
  negative_mark_value?: number;
  randomize_questions: boolean;
  randomize_options: boolean;
  per_student_unique_paper: boolean;
  maximum_tab_switch_warnings: number;
  webcam_monitoring_enabled: boolean;
  gaze_sensitivity: number;
  question_selection_rules?: QuestionSelectionRule[];
  created_by?: number;
  created_at?: string;
  is_active_window?: boolean;
  is_registered?: boolean;
  has_active_reattempt?: boolean;
  is_completed?: boolean;
  can_start?: boolean;
}

export interface ExamRegistration {
  id: number;
  exam_id: number;
  student_id: number;
  registered_at: string;
  status: "REGISTERED" | "CANCELLED";
  exam_name?: string;
  subject?: string;
  start_time?: string;
  end_time?: string;
  duration_minutes?: number;
  is_registered?: boolean;
}

export interface Candidate {
  id: number;
  student_id: number;
  name: string;
  email: string;
  registration_number?: string;
  mobile_number?: string;
  date_of_birth?: string;
  gender?: string;
  college?: string;
  university?: string;
  course?: string;
  specialization?: string;
  year_semester?: string;
  enrollment_number?: string;
  graduation_year?: number | string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pin_code?: string;
  is_active?: boolean;
  user_created_at?: string;
  exam_name?: string;
  exam_subject?: string;
  exam_status?: string;
  maximum_marks?: number;
  registered_at: string;
  status: string;
  attempt_status?: string;
  score?: number | null;
  percentage?: number | null;
  result_status?: string | null;
  proctoring_violations_count?: number;
}

export interface StudentOption {
  id: number;
  option_text: string;
  option_order: number;
  translations?: Record<string, string>;
}

export interface StudentQuestion {
  id: number;
  subject: string;
  question_text: string;
  question_type: QuestionType;
  difficulty: DifficultyLevel;
  marks: number;
  negative_marks?: number;
  options: StudentOption[];
  translations?: Record<string, string>;
}

export interface GeneratedPaper {
  exam_id: number;
  exam_name: string;
  subject: string;
  duration_minutes: number;
  total_questions: number;
  maximum_marks: number;
  start_time: string;
  end_time: string;
  student_id: number;
  questions: StudentQuestion[];
}

export interface ExamSession {
  id?: number;
  session_id: number;
  exam_id: number;
  student_id: number;
  exam_name?: string;
  subject?: string;
  started_at?: string;
  submitted_at?: string;
  status: string;
  session_token?: string;
  duration_minutes: number;
  remaining_seconds: number;
  tab_switch_count?: number;
  maximum_tab_switch_warnings?: number;
  current_tab_warnings?: number;
  webcam_monitoring_enabled?: boolean;
  questions?: StudentQuestion[];
  saved_answers?: {
    question_id: number;
    selected_option_ids?: number[];
    answer_text?: string;
    image_path?: string;
    is_marked_for_review?: boolean;
  }[];
}

export interface QuestionResultBreakdown {
  question_id: number;
  question_text: string;
  question_type: string;
  marks_possible: number;
  marks_awarded: number;
  negative_marks_deducted: number;
  is_correct: boolean;
  is_attempted: boolean;
  is_evaluated?: boolean;
  is_marked_for_review?: boolean;
  selected_option_ids?: number[];
  correct_option_ids?: number[];
  student_text_answer?: string;
  evaluator_feedback?: string;
  image_path?: string;
  thumbnail_path?: string;
  ocr_text?: string;
  ai_suggested_marks?: number;
  ai_justification?: string;
  ai_evaluation?: {
    status?: string;
    suggested_marks?: number;
    justification?: string;
    matched_key_points?: string[];
    missed_key_points?: string[];
  };
  model_answer?: string;
  explanation?: string;
}

export interface ExamSubmissionResult {
  result_id: number;
  exam_id: number;
  exam_name: string;
  subject: string;
  student_id: number;
  student_name: string;
  registration_number?: string;
  session_id: number;
  total_questions: number;
  attempted_questions: number;
  correct_answers: number;
  incorrect_answers: number;
  unanswered_questions: number;
  total_marks: number;
  negative_marks_deducted: number;
  maximum_marks: number;
  percentage: number;
  passed: boolean;
  status?: string;
  result_status?: string;
  evaluation_status?: string;
  is_published?: boolean;
  evaluation_finalized_at?: string;
  result_published_at?: string;
  evaluated_by_id?: number;
  evaluated_by_name?: string;
  evaluator_remarks?: string;
  submission_status?: string;
  submission_reason?: string;
  submitted_at: string;
  score?: number;
  attempt_number?: number;
  completed_at?: string;
  breakdown: QuestionResultBreakdown[];
}

export interface PendingEvaluationItem {
  session_id: number;
  result_id?: number;
  exam_id: number;
  exam_name: string;
  subject: string;
  student_id: number;
  student_name: string;
  registration_number?: string;
  attempt_number: number;
  submitted_at: string;
  evaluation_status: string;
  total_questions: number;
  evaluated_questions: number;
  progress_percentage: number;
  has_subjective: boolean;
}

export interface EvaluationSessionDetailResponse {
  session_id: number;
  result_id?: number;
  exam_id: number;
  exam_name: string;
  subject: string;
  maximum_marks: number;
  duration_minutes: number;
  student_id: number;
  student_name: string;
  registration_number?: string;
  student_email?: string;
  attempt_number: number;
  started_at: string;
  submitted_at: string;
  evaluation_status: string;
  is_finalized: boolean;
  is_published: boolean;
  evaluation_finalized_at?: string;
  result_published_at?: string;
  evaluated_by_id?: number;
  evaluated_by_name?: string;
  evaluator_remarks?: string;
  total_questions: number;
  evaluated_questions: number;
  progress_percentage: number;
  current_total_marks: number;
  status?: string;
  questions: QuestionResultBreakdown[];
}

export interface ExamResult {
  id: number;
  exam_id: number;
  exam_name: string;
  subject: string;
  student_id: number;
  student_name: string;
  registration_number?: string;
  session_id: number;
  total_questions: number;
  attempted_questions: number;
  correct_answers: number;
  incorrect_answers: number;
  unanswered_questions: number;
  total_marks: number;
  negative_marks_deducted: number;
  final_score: number;
  maximum_marks: number;
  percentage: number;
  status: "PASSED" | "FAILED" | "COMPLETED";
  created_at: string;
}

export interface ProctorEvent {
  id: number;
  session_id: number;
  event_type: "TAB_SWITCH" | "WINDOW_BLUR" | "WINDOW_FOCUS" | "WEBCAM_DISCONNECTED";
  event_data?: any;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  created_at: string;
}

export interface QuestionImportOptionItem {
  option_text: string;
  is_correct: boolean;
  option_order?: number;
}

export interface QuestionImportItem {
  row_index: number;
  subject: string;
  topic?: string | null;
  subtopic?: string | null;
  question_text: string;
  question_type: QuestionType;
  difficulty: DifficultyLevel;
  marks: number;
  negative_marks: number;
  options: QuestionImportOptionItem[];
  expected_answer?: string | null;
  model_answer?: string | null;
  explanation?: string | null;
  tags?: string | null;
  status: "VALID" | "INVALID" | "DUPLICATE";
  errors: string[];
  warnings: string[];
  validation_errors?: string[];
}

export interface QuestionImportPreviewResponse {
  filename: string;
  file_type: string;
  total_detected: number;
  valid_count: number;
  invalid_count: number;
  duplicate_count: number;
  questions: QuestionImportItem[];
}

export interface QuestionImportConfirmRequest {
  questions: QuestionImportItem[];
  skip_invalid: boolean;
  allow_duplicates: boolean;
}

export interface QuestionImportConfirmResponse {
  imported_count: number;
  skipped_invalid_count: number;
  skipped_duplicate_count: number;
  message: string;
}

