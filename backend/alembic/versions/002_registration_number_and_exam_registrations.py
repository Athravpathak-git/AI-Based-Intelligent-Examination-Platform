"""Add registration_number to users and create exam_registrations table

Revision ID: 002_registration_number_and_exam_registrations
Revises: 001_initial_schema
Create Date: 2026-09-04 23:15:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "002_reg_exam"
down_revision: Union[str, None] = "001_initial_schema"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # 1. Add registration_number column to users table
    op.add_column(
        "users",
        sa.Column("registration_number", sa.String(length=50), nullable=True)
    )
    op.create_index(
        "ix_users_registration_number",
        "users",
        ["registration_number"],
        unique=True
    )

    # 2. Create exam_registrations table
    op.create_table(
        "exam_registrations",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True, nullable=False),
        sa.Column("exam_id", sa.Integer(), sa.ForeignKey("exams.id", ondelete="CASCADE"), nullable=False),
        sa.Column("student_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("registered_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("status", sa.String(length=50), server_default="REGISTERED", nullable=False),
        sa.UniqueConstraint("exam_id", "student_id", name="uq_exam_student_registration")
    )
    op.create_index("ix_exam_registrations_id", "exam_registrations", ["id"], unique=False)
    op.create_index("ix_exam_registrations_exam_id", "exam_registrations", ["exam_id"], unique=False)
    op.create_index("ix_exam_registrations_student_id", "exam_registrations", ["student_id"], unique=False)

def downgrade() -> None:
    op.drop_index("ix_exam_registrations_student_id", table_name="exam_registrations")
    op.drop_index("ix_exam_registrations_exam_id", table_name="exam_registrations")
    op.drop_index("ix_exam_registrations_id", table_name="exam_registrations")
    op.drop_table("exam_registrations")

    op.drop_index("ix_users_registration_number", table_name="users")
    op.drop_column("users", "registration_number")
