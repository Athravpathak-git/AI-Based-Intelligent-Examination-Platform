"""Add evaluator_feedback to answers table

Revision ID: 007_add_evaluator_feedback
Revises: 006_week1_3_completion
Create Date: 2026-09-06 13:25:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '007_add_evaluator_feedback'
down_revision: Union[str, None] = '006_week1_3_completion'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    conn = op.get_bind()
    conn.execute(sa.text('ALTER TABLE answers ADD COLUMN IF NOT EXISTS evaluator_feedback TEXT;'))

def downgrade() -> None:
    op.drop_column('answers', 'evaluator_feedback')
