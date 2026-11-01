from datetime import UTC, datetime
from uuid import uuid4

from sqlalchemy import (
    JSON,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from experimentlab.db.base import Base


class DatasetVersion(Base):
    __tablename__ = "dataset_versions"
    __table_args__ = (
        UniqueConstraint("experiment_id", "version", name="uq_dataset_experiment_version"),
        CheckConstraint(
            "version > 0 AND byte_size > 0 AND row_count > 0", name="positive_metadata"
        ),
        CheckConstraint(
            "control_count >= 0 AND treatment_count >= 0 "
            "AND row_count = control_count + treatment_count",
            name="valid_counts",
        ),
    )
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    experiment_id: Mapped[str] = mapped_column(ForeignKey("experiments.id"), index=True)
    version: Mapped[int] = mapped_column(Integer)
    filename: Mapped[str] = mapped_column(String(160))
    storage_key: Mapped[str] = mapped_column(String(40), unique=True)
    sha256: Mapped[str] = mapped_column(String(64))
    byte_size: Mapped[int] = mapped_column(Integer)
    row_count: Mapped[int] = mapped_column(Integer)
    control_count: Mapped[int] = mapped_column(Integer)
    treatment_count: Mapped[int] = mapped_column(Integer)
    primary_metric: Mapped[str] = mapped_column(String(64))
    schema_version: Mapped[int] = mapped_column(Integer, default=1)
    config_snapshot: Mapped[dict] = mapped_column(JSON)
    warnings: Mapped[list] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )
