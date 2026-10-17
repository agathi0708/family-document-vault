"""change OCR confidence to float

Revision ID: aed8fe6c6e55
Revises: ab7c5ddbf301
Create Date: 2026-10-06 12:32:25.993080
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "aed8fe6c6e55"
down_revision: Union[str, Sequence[str], None] = "ab7c5ddbf301"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.alter_column(
        "ocr_results",
        "confidence",
        existing_type=sa.INTEGER(),
        type_=sa.Float(),
        existing_nullable=True,
        postgresql_using="confidence::double precision",
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.alter_column(
        "ocr_results",
        "confidence",
        existing_type=sa.Float(),
        type_=sa.INTEGER(),
        existing_nullable=True,
        postgresql_using="ROUND(confidence)::integer",
    )