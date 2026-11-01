"""Extend existing drafts and introduce immutable dataset versions."""

import sqlalchemy as sa
from alembic import op

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Defaults backfill existing rows; newly required planning fields stay nullable in drafts.
    with op.batch_alter_table("experiments") as batch:
        batch.add_column(sa.Column("expected_effect", sa.Float(), nullable=True))
        batch.add_column(sa.Column("power", sa.Float(), nullable=False, server_default="0.8"))
        batch.add_column(sa.Column("baseline_conversion", sa.Float(), nullable=True))
        batch.add_column(
            sa.Column("randomization_unit", sa.String(24), nullable=False, server_default="user")
        )
        batch.add_column(sa.Column("planned_start", sa.Date(), nullable=True))
        batch.add_column(sa.Column("planned_end", sa.Date(), nullable=True))
        batch.add_column(sa.Column("planned_sample_size", sa.BigInteger(), nullable=True))
        batch.add_column(sa.Column("started_at", sa.DateTime(timezone=True), nullable=True))
        batch.add_column(sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True))
        batch.add_column(sa.Column("locked_plan", sa.JSON(), nullable=True))
        batch.add_column(sa.Column("version", sa.Integer(), nullable=False, server_default="1"))
        batch.add_column(
            sa.Column("dataset_count", sa.Integer(), nullable=False, server_default="0")
        )
        batch.create_check_constraint("valid_power", "power > 0.5 AND power < 1")
        batch.create_check_constraint(
            "valid_effect", "expected_effect IS NULL OR expected_effect > 0"
        )
        batch.create_check_constraint(
            "valid_baseline",
            "baseline_conversion IS NULL OR (baseline_conversion > 0 AND baseline_conversion < 1)",
        )
        batch.create_check_constraint(
            "valid_unit", "randomization_unit IN ('user', 'account', 'device')"
        )
        batch.create_check_constraint(
            "valid_dates",
            "planned_end IS NULL OR planned_start IS NULL OR planned_end > planned_start",
        )
    op.create_table(
        "dataset_versions",
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("experiment_id", sa.String(36), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("filename", sa.String(160), nullable=False),
        sa.Column("storage_key", sa.String(40), nullable=False),
        sa.Column("sha256", sa.String(64), nullable=False),
        sa.Column("byte_size", sa.Integer(), nullable=False),
        sa.Column("row_count", sa.Integer(), nullable=False),
        sa.Column("control_count", sa.Integer(), nullable=False),
        sa.Column("treatment_count", sa.Integer(), nullable=False),
        sa.Column("primary_metric", sa.String(64), nullable=False),
        sa.Column("schema_version", sa.Integer(), nullable=False),
        sa.Column("config_snapshot", sa.JSON(), nullable=False),
        sa.Column("warnings", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            "version > 0 AND byte_size > 0 AND row_count > 0", name="positive_metadata"
        ),
        sa.CheckConstraint(
            "control_count >= 0 AND treatment_count >= 0 "
            "AND row_count = control_count + treatment_count",
            name="valid_counts",
        ),
        sa.ForeignKeyConstraint(["experiment_id"], ["experiments.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("experiment_id", "version", name="uq_dataset_experiment_version"),
        sa.UniqueConstraint("storage_key"),
    )
    op.create_index("ix_dataset_versions_experiment_id", "dataset_versions", ["experiment_id"])


def downgrade() -> None:
    op.drop_table("dataset_versions")
    with op.batch_alter_table("experiments") as batch:
        for name in ("valid_power", "valid_effect", "valid_baseline", "valid_unit", "valid_dates"):
            batch.drop_constraint(op.f(f"ck_experiments_{name}"), type_="check")
        for name in (
            "dataset_count",
            "version",
            "locked_plan",
            "completed_at",
            "started_at",
            "planned_sample_size",
            "planned_end",
            "planned_start",
            "randomization_unit",
            "baseline_conversion",
            "power",
            "expected_effect",
        ):
            batch.drop_column(name)
