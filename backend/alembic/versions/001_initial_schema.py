"""Initial schema migration for Weeks 1 and 2

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-09-04 21:30:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "001_initial_schema"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # 1. users table
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True, nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("role", sa.Enum("STUDENT", "EXAMINER", "ADMIN", name="user_role_enum"), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, default=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index(op.f("ix_users_id"), "users", ["id"], unique=False)
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)

    # 2. question_bank table
    op.create_table(
        "question_bank",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True, nullable=False),
        sa.Column("subject", sa.String(length=100), nullable=False),
        sa.Column("question_text", sa.Text(), nullable=False),
        sa.Column("question_type", sa.Enum("MCQ", "MULTI_SELECT", "SHORT_ANSWER", "LONG_ANSWER", "IMAGE_UPLOAD", name="question_type_enum"), nullable=False),
        sa.Column("difficulty", sa.Enum("EASY", "MEDIUM", "HARD", name="difficulty_level_enum"), nullable=False),
        sa.Column("marks", sa.Float(), nullable=False, default=1.0),
        sa.Column("negative_marks", sa.Float(), nullable=False, default=0.0),
        sa.Column("expected_answer", sa.Text(), nullable=True),
        sa.Column("model_answer", sa.Text(), nullable=True),
        sa.Column("explanation", sa.Text(), nullable=True),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index(op.f("ix_question_bank_id"), "question_bank", ["id"], unique=False)
    op.create_index(op.f("ix_question_bank_subject"), "question_bank", ["subject"], unique=False)
    op.create_index(op.f("ix_question_bank_question_type"), "question_bank", ["question_type"], unique=False)
    op.create_index(op.f("ix_question_bank_difficulty"), "question_bank", ["difficulty"], unique=False)

    # 3. options table
    op.create_table(
        "options",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True, nullable=False),
        sa.Column("question_id", sa.Integer(), sa.ForeignKey("question_bank.id", ondelete="CASCADE"), nullable=False),
        sa.Column("option_text", sa.Text(), nullable=False),
        sa.Column("is_correct", sa.Boolean(), nullable=False, default=False),
        sa.Column("option_order", sa.Integer(), nullable=False, default=0),
    )
    op.create_index(op.f("ix_options_id"), "options", ["id"], unique=False)
    op.create_index(op.f("ix_options_question_id"), "options", ["question_id"], unique=False)

    # 4. exams table
    op.create_table(
        "exams",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True, nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("subject", sa.String(length=100), nullable=False),
        sa.Column("duration_minutes", sa.Integer(), nullable=False),
        sa.Column("start_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("end_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("total_questions", sa.Integer(), nullable=False),
        sa.Column("maximum_marks", sa.Float(), nullable=False),
        sa.Column("negative_marking_enabled", sa.Boolean(), nullable=False, default=False),
        sa.Column("randomize_questions", sa.Boolean(), nullable=False, default=True),
        sa.Column("randomize_options", sa.Boolean(), nullable=False, default=True),
        sa.Column("per_student_unique_paper", sa.Boolean(), nullable=False, default=True),
        sa.Column("maximum_tab_switch_warnings", sa.Integer(), nullable=False, default=3),
        sa.Column("webcam_monitoring_enabled", sa.Boolean(), nullable=False, default=True),
        sa.Column("gaze_sensitivity", sa.Float(), nullable=False, default=0.5),
        sa.Column("question_selection_rules", sa.JSON(), nullable=True),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index(op.f("ix_exams_id"), "exams", ["id"], unique=False)
    op.create_index(op.f("ix_exams_subject"), "exams", ["subject"], unique=False)

    # 5. exam_questions table
    op.create_table(
        "exam_questions",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True, nullable=False),
        sa.Column("exam_id", sa.Integer(), sa.ForeignKey("exams.id", ondelete="CASCADE"), nullable=False),
        sa.Column("question_id", sa.Integer(), sa.ForeignKey("question_bank.id", ondelete="CASCADE"), nullable=False),
        sa.Column("marks_override", sa.Float(), nullable=True),
        sa.Column("question_order", sa.Integer(), nullable=False, default=0),
    )
    op.create_index(op.f("ix_exam_questions_id"), "exam_questions", ["id"], unique=False)
    op.create_index(op.f("ix_exam_questions_exam_id"), "exam_questions", ["exam_id"], unique=False)
    op.create_index(op.f("ix_exam_questions_question_id"), "exam_questions", ["question_id"], unique=False)

    # 6. exam_sessions table
    op.create_table(
        "exam_sessions",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True, nullable=False),
        sa.Column("exam_id", sa.Integer(), sa.ForeignKey("exams.id", ondelete="CASCADE"), nullable=False),
        sa.Column("student_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("status", sa.String(length=50), nullable=False, default="ACTIVE"),
        sa.Column("session_token", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index(op.f("ix_exam_sessions_id"), "exam_sessions", ["id"], unique=False)
    op.create_index(op.f("ix_exam_sessions_exam_id"), "exam_sessions", ["exam_id"], unique=False)
    op.create_index(op.f("ix_exam_sessions_student_id"), "exam_sessions", ["student_id"], unique=False)
    op.create_index(op.f("ix_exam_sessions_session_token"), "exam_sessions", ["session_token"], unique=True)

    # 7. answers table
    op.create_table(
        "answers",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True, nullable=False),
        sa.Column("session_id", sa.Integer(), sa.ForeignKey("exam_sessions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("question_id", sa.Integer(), sa.ForeignKey("question_bank.id", ondelete="CASCADE"), nullable=False),
        sa.Column("selected_option_ids", sa.JSON(), nullable=True),
        sa.Column("answer_text", sa.Text(), nullable=True),
        sa.Column("image_path", sa.String(length=500), nullable=True),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("marks_awarded", sa.Float(), nullable=True),
    )
    op.create_index(op.f("ix_answers_id"), "answers", ["id"], unique=False)
    op.create_index(op.f("ix_answers_session_id"), "answers", ["session_id"], unique=False)
    op.create_index(op.f("ix_answers_question_id"), "answers", ["question_id"], unique=False)

    # 8. results table
    op.create_table(
        "results",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True, nullable=False),
        sa.Column("exam_id", sa.Integer(), sa.ForeignKey("exams.id", ondelete="CASCADE"), nullable=False),
        sa.Column("student_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("session_id", sa.Integer(), sa.ForeignKey("exam_sessions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("total_marks", sa.Float(), nullable=False),
        sa.Column("maximum_marks", sa.Float(), nullable=False),
        sa.Column("percentage", sa.Float(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("session_id", name="uq_results_session_id"),
    )
    op.create_index(op.f("ix_results_id"), "results", ["id"], unique=False)
    op.create_index(op.f("ix_results_exam_id"), "results", ["exam_id"], unique=False)
    op.create_index(op.f("ix_results_student_id"), "results", ["student_id"], unique=False)

    # 9. proctor_events table
    op.create_table(
        "proctor_events",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True, nullable=False),
        sa.Column("session_id", sa.Integer(), sa.ForeignKey("exam_sessions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("event_type", sa.String(length=100), nullable=False),
        sa.Column("event_data", sa.JSON(), nullable=True),
        sa.Column("severity", sa.String(length=50), nullable=False, default="LOW"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index(op.f("ix_proctor_events_id"), "proctor_events", ["id"], unique=False)
    op.create_index(op.f("ix_proctor_events_session_id"), "proctor_events", ["session_id"], unique=False)

def downgrade() -> None:
    op.drop_table("proctor_events")
    op.drop_table("results")
    op.drop_table("answers")
    op.drop_table("exam_sessions")
    op.drop_table("exam_questions")
    op.drop_table("exams")
    op.drop_table("options")
    op.drop_table("question_bank")
    op.drop_table("users")
    op.execute("DROP TYPE IF EXISTS difficulty_level_enum CASCADE;")
    op.execute("DROP TYPE IF EXISTS question_type_enum CASCADE;")
    op.execute("DROP TYPE IF EXISTS user_role_enum CASCADE;")
