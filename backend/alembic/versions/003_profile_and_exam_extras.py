"""Add student_profiles, exam description and negative_mark_value, answer review mark, and result status

Revision ID: 003_profile_extras
Revises: 002_reg_exam
Create Date: 2026-09-05 00:37:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "003_profile_extras"
down_revision: Union[str, None] = "002_reg_exam"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # 1. Create student_profiles table
    op.create_table(
        "student_profiles",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("date_of_birth", sa.String(length=50), nullable=True),
        sa.Column("gender", sa.String(length=20), nullable=True),
        sa.Column("mobile_number", sa.String(length=20), nullable=True),
        sa.Column("profile_photo_url", sa.String(length=500), nullable=True),
        sa.Column("college", sa.String(length=255), nullable=True),
        sa.Column("university", sa.String(length=255), nullable=True),
        sa.Column("course", sa.String(length=255), nullable=True),
        sa.Column("specialization", sa.String(length=255), nullable=True),
        sa.Column("year_semester", sa.String(length=50), nullable=True),
        sa.Column("enrollment_number", sa.String(length=100), nullable=True),
        sa.Column("graduation_year", sa.Integer(), nullable=True),
        sa.Column("address", sa.String(length=500), nullable=True),
        sa.Column("city", sa.String(length=100), nullable=True),
        sa.Column("state", sa.String(length=100), nullable=True),
        sa.Column("country", sa.String(length=100), server_default="India", nullable=True),
        sa.Column("pin_code", sa.String(length=20), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("user_id", name="uq_student_profiles_user_id")
    )
    op.create_index("ix_student_profiles_id", "student_profiles", ["id"], unique=False)
    op.create_index("ix_student_profiles_user_id", "student_profiles", ["user_id"], unique=True)

    # 2. Add description and negative_mark_value to exams
    op.add_column("exams", sa.Column("description", sa.String(length=1000), nullable=True))
    op.add_column("exams", sa.Column("negative_mark_value", sa.Float(), server_default="0.0", nullable=True))

    # 3. Add is_marked_for_review to answers
    op.add_column("answers", sa.Column("is_marked_for_review", sa.Boolean(), server_default=sa.text("false"), nullable=False))

    # 4. Add status to results
    op.add_column("results", sa.Column("status", sa.String(length=50), server_default="PASSED", nullable=False))

def downgrade() -> None:
    op.drop_column("results", "status")
    op.drop_column("answers", "is_marked_for_review")
    op.drop_column("exams", "negative_mark_value")
    op.drop_column("exams", "description")
    op.drop_index("ix_student_profiles_user_id", table_name="student_profiles")
    op.drop_index("ix_student_profiles_id", table_name="student_profiles")
    op.drop_table("student_profiles")
