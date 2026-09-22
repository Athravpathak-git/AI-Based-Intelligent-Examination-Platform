"""Add requested_by_id to exam_attempt_permissions table

Revision ID: 008_reattempt_approval_workflow
Revises: 007_add_evaluator_feedback
Create Date: 2026-09-21 10:30:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '008_reattempt_approval_workflow'
down_revision: Union[str, None] = '007_add_evaluator_feedback'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    conn = op.get_bind()
    conn.execute(sa.text('''
        ALTER TABLE exam_attempt_permissions
        ADD COLUMN IF NOT EXISTS requested_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
    '''))
    conn.execute(sa.text('''
        CREATE INDEX IF NOT EXISTS ix_exam_attempt_permissions_requested_by_id
        ON exam_attempt_permissions (requested_by_id);
    '''))

def downgrade() -> None:
    op.drop_index('ix_exam_attempt_permissions_requested_by_id', table_name='exam_attempt_permissions')
    op.drop_column('exam_attempt_permissions', 'requested_by_id')
