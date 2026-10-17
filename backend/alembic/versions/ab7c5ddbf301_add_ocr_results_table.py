"""add OCR results table

Revision ID: ab7c5ddbf301
Revises: 95d7fe2cea42
Create Date: 2026-10-06 11:46:48.318276

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "ab7c5ddbf301"
down_revision: Union[str, Sequence[str], None] = "95d7fe2cea42"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""

    op.create_table(
        "ocr_results",
        sa.Column(
            "id",
            sa.Integer(),
            nullable=False,
        ),
        sa.Column(
            "document_id",
            sa.Integer(),
            nullable=False,
        ),
        sa.Column(
            "extracted_text",
            sa.Text(),
            nullable=False,
        ),
        sa.Column(
            "language",
            sa.String(length=50),
            nullable=True,
        ),
        sa.Column(
            "confidence",
            sa.Integer(),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["document_id"],
            ["documents.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(
        op.f("ix_ocr_results_document_id"),
        "ocr_results",
        ["document_id"],
        unique=True,
    )

    op.create_index(
        op.f("ix_ocr_results_id"),
        "ocr_results",
        ["id"],
        unique=False,
    )


def downgrade() -> None:
    """Downgrade schema."""

    op.drop_index(
        op.f("ix_ocr_results_id"),
        table_name="ocr_results",
    )

    op.drop_index(
        op.f("ix_ocr_results_document_id"),
        table_name="ocr_results",
    )

    op.drop_table("ocr_results")