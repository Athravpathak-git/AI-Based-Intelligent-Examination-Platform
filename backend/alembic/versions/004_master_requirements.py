"""Add password_reset_tokens, exam_attempt_permissions, exam_instruction_acceptances, and exam is_deleted

Revision ID: 004_master_requirements
Revises: 003_profile_extras
Create Date: 2026-09-05 14:15:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "004_master_requirements"
down_revision: Union[str, None] = "003_profile_extras"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # 1. Create password_reset_tokens table
    op.create_table(
        "password_reset_tokens",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("token_hash", sa.String(length=255), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_password_reset_tokens_id", "password_reset_tokens", ["id"], unique=False)
    op.create_index("ix_password_reset_tokens_user_id", "password_reset_tokens", ["user_id"], unique=False)
    op.create_index("ix_password_reset_tokens_token_hash", "password_reset_tokens", ["token_hash"], unique=False)

    # 2. Create exam_attempt_permissions table
    op.create_table(
        "exam_attempt_permissions",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True, nullable=False),
        sa.Column("exam_id", sa.Integer(), sa.ForeignKey("exams.id", ondelete="CASCADE"), nullable=False),
        sa.Column("student_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("granted_by", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("permission_type", sa.String(length=50), server_default="REATTEMPT", nullable=False),
        sa.Column("max_additional_attempts", sa.Integer(), server_default="1", nullable=False),
        sa.Column("attempts_used", sa.Integer(), server_default="0", nullable=False),
        sa.Column("status", sa.String(length=50), server_default="ACTIVE", nullable=False),
        sa.Column("reason", sa.String(length=500), nullable=True),
        sa.Column("notes", sa.String(length=1000), nullable=True),
        sa.Column("granted_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_exam_attempt_permissions_id", "exam_attempt_permissions", ["id"], unique=False)
    op.create_index("ix_exam_attempt_permissions_exam_id", "exam_attempt_permissions", ["exam_id"], unique=False)
    op.create_index("ix_exam_attempt_permissions_student_id", "exam_attempt_permissions", ["student_id"], unique=False)

    # 3. Create exam_instruction_acceptances table
    op.create_table(
        "exam_instruction_acceptances",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True, nullable=False),
        sa.Column("session_id", sa.Integer(), sa.ForeignKey("exam_sessions.id", ondelete="CASCADE"), nullable=True),
        sa.Column("student_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("exam_id", sa.Integer(), sa.ForeignKey("exams.id", ondelete="CASCADE"), nullable=False),
        sa.Column("accepted", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("accepted_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_exam_instruction_acceptances_id", "exam_instruction_acceptances", ["id"], unique=False)
    op.create_index("ix_exam_instruction_acceptances_student_id", "exam_instruction_acceptances", ["student_id"], unique=False)
    op.create_index("ix_exam_instruction_acceptances_exam_id", "exam_instruction_acceptances", ["exam_id"], unique=False)

    # 4. Add is_deleted to exams
    op.add_column("exams", sa.Column("is_deleted", sa.Boolean(), server_default=sa.text("false"), nullable=False))

def downgrade() -> None:
    op.drop_column("exams", "is_deleted")
    op.drop_index("ix_exam_instruction_acceptances_exam_id", table_name="exam_instruction_acceptances")
    op.drop_index("ix_exam_instruction_acceptances_student_id", table_name="exam_instruction_acceptances")
    op.drop_index("ix_exam_instruction_acceptances_id", table_name="exam_instruction_acceptances")
    op.drop_table("exam_instruction_acceptances")
    op.drop_index("ix_exam_attempt_permissions_student_id", table_name="exam_attempt_permissions")
    op.drop_index("ix_exam_attempt_permissions_exam_id", table_name="exam_attempt_permissions")
    op.drop_index("ix_exam_attempt_permissions_id", table_name="exam_attempt_permissions")
    op.drop_table("exam_attempt_permissions")
    op.drop_index("ix_password_reset_tokens_token_hash", table_name="password_reset_tokens")
    op.drop_index("ix_password_reset_tokens_user_id", table_name="password_reset_tokens")
    op.drop_index("ix_password_reset_tokens_id", table_name="password_reset_tokens")
    op.drop_table("password_reset_tokens")
