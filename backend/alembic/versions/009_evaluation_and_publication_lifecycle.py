"""Add evaluation lifecycle and audit fields to results and answers

Revision ID: 009_evaluation_lifecycle
Revises: 008_reattempt_approval_workflow
Create Date: 2026-09-22 10:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '009_evaluation_lifecycle'
down_revision: Union[str, None] = '008_reattempt_approval_workflow'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    conn = op.get_bind()
    conn.execute(sa.text('''
        ALTER TABLE results
        ADD COLUMN IF NOT EXISTS evaluation_status VARCHAR(50) DEFAULT 'SUBMITTED',
        ADD COLUMN IF NOT EXISTS evaluation_finalized_at TIMESTAMP WITH TIME ZONE NULL,
        ADD COLUMN IF NOT EXISTS result_published_at TIMESTAMP WITH TIME ZONE NULL,
        ADD COLUMN IF NOT EXISTS evaluated_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS evaluator_remarks TEXT NULL,
        ADD COLUMN IF NOT EXISTS pdf_download_count INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS pdf_last_downloaded_at TIMESTAMP WITH TIME ZONE NULL;
    '''))
    conn.execute(sa.text('''
        CREATE INDEX IF NOT EXISTS ix_results_evaluation_status
        ON results (evaluation_status);
    '''))
    conn.execute(sa.text('''
        ALTER TABLE answers
        ADD COLUMN IF NOT EXISTS is_evaluated BOOLEAN DEFAULT FALSE;
    '''))

def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(sa.text('DROP INDEX IF EXISTS ix_results_evaluation_status;'))
    conn.execute(sa.text('''
        ALTER TABLE results
        DROP COLUMN IF EXISTS evaluation_status,
        DROP COLUMN IF EXISTS evaluation_finalized_at,
        DROP COLUMN IF EXISTS result_published_at,
        DROP COLUMN IF EXISTS evaluated_by_id,
        DROP COLUMN IF EXISTS evaluator_remarks,
        DROP COLUMN IF EXISTS pdf_download_count,
        DROP COLUMN IF EXISTS pdf_last_downloaded_at;
    '''))
    conn.execute(sa.text('ALTER TABLE answers DROP COLUMN IF EXISTS is_evaluated;'))
