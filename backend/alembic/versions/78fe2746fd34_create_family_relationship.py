"""create family relationship

Revision ID: 78fe2746fd34
Revises:
Create Date: 2026-10-05 18:30:45.735098

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "78fe2746fd34"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""

    # Add family_id as nullable first so existing users
    # can remain valid during the migration.
    op.add_column(
        "users",
        sa.Column(
            "family_id",
            sa.Integer(),
            nullable=True,
        ),
    )

    # Create the foreign-key relationship.
    op.create_foreign_key(
        "fk_users_family_id_families",
        "users",
        "families",
        ["family_id"],
        ["id"],
    )


def downgrade() -> None:
    """Downgrade schema."""

    op.drop_constraint(
        "fk_users_family_id_families",
        "users",
        type_="foreignkey",
    )

    op.drop_column(
        "users",
        "family_id",
    )