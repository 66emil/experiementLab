"""Create the experiments aggregate."""

import sqlalchemy as sa
from alembic import op

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "experiments",
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("name", sa.String(160), nullable=False),
        sa.Column("hypothesis", sa.Text(), nullable=False),
        sa.Column("primary_metric", sa.String(64), nullable=False),
        sa.Column("status", sa.String(24), nullable=False),
        sa.Column("control_name", sa.String(80), nullable=False),
        sa.Column("treatment_name", sa.String(80), nullable=False),
        sa.Column("allocation", sa.Float(), nullable=False),
        sa.Column("alpha", sa.Float(), nullable=False),
        sa.Column("is_demo", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("status IN ('draft', 'running', 'completed')", name="valid_status"),
        sa.CheckConstraint("allocation > 0 AND allocation < 1", name="valid_allocation"),
        sa.CheckConstraint("alpha > 0 AND alpha < 0.5", name="valid_alpha"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_experiments_status", "experiments", ["status"])
    op.create_index("ix_experiments_created_at", "experiments", ["created_at"])


def downgrade() -> None:
    op.drop_table("experiments")
