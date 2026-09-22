"""Add subjects table and topic/subtopic/is_active/tags to question_bank

Revision ID: 005_subjects_and_topics
Revises: 004_master_requirements
Create Date: 2026-09-05 16:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "005_subjects_and_topics"
down_revision: Union[str, None] = "004_master_requirements"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # 1. Create subjects master table
    op.create_table(
        "subjects",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True, nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("code", sa.String(length=50), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_subjects_id", "subjects", ["id"], unique=False)
    op.create_index("ix_subjects_name", "subjects", ["name"], unique=True)
    op.create_index("ix_subjects_code", "subjects", ["code"], unique=True)
    op.create_index("ix_subjects_is_active", "subjects", ["is_active"], unique=False)

    # 2. Add topic, subtopic, tags, is_active to question_bank
    op.add_column("question_bank", sa.Column("topic", sa.String(length=100), nullable=True))
    op.add_column("question_bank", sa.Column("subtopic", sa.String(length=100), nullable=True))
    op.add_column("question_bank", sa.Column("tags", sa.String(length=255), nullable=True))
    op.add_column("question_bank", sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False))

    op.create_index("ix_question_bank_topic", "question_bank", ["topic"], unique=False)
    op.create_index("ix_question_bank_subtopic", "question_bank", ["subtopic"], unique=False)
    op.create_index("ix_question_bank_is_active", "question_bank", ["is_active"], unique=False)
    op.create_index("ix_question_bank_subject_topic", "question_bank", ["subject", "topic"], unique=False)
    op.create_index("ix_question_bank_filter_idx", "question_bank", ["subject", "difficulty", "question_type"], unique=False)

def downgrade() -> None:
    op.drop_index("ix_question_bank_filter_idx", table_name="question_bank")
    op.drop_index("ix_question_bank_subject_topic", table_name="question_bank")
    op.drop_index("ix_question_bank_is_active", table_name="question_bank")
    op.drop_index("ix_question_bank_subtopic", table_name="question_bank")
    op.drop_index("ix_question_bank_topic", table_name="question_bank")
    op.drop_column("question_bank", "is_active")
    op.drop_column("question_bank", "tags")
    op.drop_column("question_bank", "subtopic")
    op.drop_column("question_bank", "topic")

    op.drop_index("ix_subjects_is_active", table_name="subjects")
    op.drop_index("ix_subjects_code", table_name="subjects")
    op.drop_index("ix_subjects_name", table_name="subjects")
    op.drop_index("ix_subjects_id", table_name="subjects")
    op.drop_table("subjects")
