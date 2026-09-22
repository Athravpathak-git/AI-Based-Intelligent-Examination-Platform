"""Add notifications table, suspicion_score to exam_sessions and results, and OCR/AI fields to answers

Revision ID: 006_week1_3_completion
Revises: 005_subjects_and_topics
Create Date: 2026-09-05 21:50:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "006_week1_3_completion"
down_revision: Union[str, None] = "005_subjects_and_topics"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # 1. Create notifications table
    op.create_table(
        "notifications",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("type", sa.String(length=50), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("is_read", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("link", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_notifications_id", "notifications", ["id"], unique=False)
    op.create_index("ix_notifications_user_id", "notifications", ["user_id"], unique=False)

    # 2. Add suspicion_score to exam_sessions
    op.add_column("exam_sessions", sa.Column("suspicion_score", sa.Float(), server_default="0.0", nullable=False))

    # 3. Add suspicion_score to results
    op.add_column("results", sa.Column("suspicion_score", sa.Float(), server_default="0.0", nullable=False))

    # 4. Add OCR and AI grading fields to answers
    op.add_column("answers", sa.Column("thumbnail_path", sa.String(length=500), nullable=True))
    op.add_column("answers", sa.Column("ocr_text", sa.Text(), nullable=True))
    op.add_column("answers", sa.Column("ai_suggested_marks", sa.Float(), nullable=True))
    op.add_column("answers", sa.Column("ai_justification", sa.Text(), nullable=True))
    op.add_column("answers", sa.Column("ai_evaluation", sa.JSON(), nullable=True))

def downgrade() -> None:
    op.drop_column("answers", "ai_evaluation")
    op.drop_column("answers", "ai_justification")
    op.drop_column("answers", "ai_suggested_marks")
    op.drop_column("answers", "ocr_text")
    op.drop_column("answers", "thumbnail_path")
    op.drop_column("results", "suspicion_score")
    op.drop_column("exam_sessions", "suspicion_score")
    op.drop_index("ix_notifications_user_id", table_name="notifications")
    op.drop_index("ix_notifications_id", table_name="notifications")
    op.drop_table("notifications")
