"""add family members

Revision ID: 70f9973634d3
Revises: 78fe2746fd34
Create Date: 2026-10-05 18:39:44.993147

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "70f9973634d3"
down_revision: Union[str, Sequence[str], None] = "78fe2746fd34"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""

    # Remove the old direct User -> Family relationship.
    op.drop_constraint(
        "fk_users_family_id_families",
        "users",
        type_="foreignkey",
    )

    op.drop_column(
        "users",
        "family_id",
    )

    # Create the family membership table.
    op.create_table(
        "family_members",
        sa.Column(
            "id",
            sa.Integer(),
            primary_key=True,
            nullable=False,
        ),
        sa.Column(
            "family_id",
            sa.Integer(),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            sa.Integer(),
            nullable=False,
        ),
        sa.Column(
            "role",
            sa.String(length=30),
            nullable=False,
        ),
        sa.Column(
            "joined_at",
            sa.DateTime(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["family_id"],
            ["families.id"],
            name="fk_family_members_family_id_families",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name="fk_family_members_user_id_users",
        ),
    )

    # Add indexes for the foreign-key columns.
    op.create_index(
        "ix_family_members_id",
        "family_members",
        ["id"],
        unique=False,
    )

    op.create_index(
        "ix_family_members_family_id",
        "family_members",
        ["family_id"],
        unique=False,
    )

    op.create_index(
        "ix_family_members_user_id",
        "family_members",
        ["user_id"],
        unique=False,
    )


def downgrade() -> None:
    """Downgrade schema."""

    # Remove indexes first.
    op.drop_index(
        "ix_family_members_user_id",
        table_name="family_members",
    )

    op.drop_index(
        "ix_family_members_family_id",
        table_name="family_members",
    )

    op.drop_index(
        "ix_family_members_id",
        table_name="family_members",
    )

    # Remove family membership table.
    op.drop_table("family_members")

    # Restore the old family_id column.
    op.add_column(
        "users",
        sa.Column(
            "family_id",
            sa.Integer(),
            nullable=True,
        ),
    )

    op.create_foreign_key(
        "fk_users_family_id_families",
        "users",
        "families",
        ["family_id"],
        ["id"],
    )