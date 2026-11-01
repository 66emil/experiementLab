from datetime import UTC, date, datetime
from uuid import uuid4

from sqlalchemy import (
    JSON,
    BigInteger,
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    Float,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column

from experimentlab.db.base import Base


class Experiment(Base):
    __tablename__ = "experiments"
    __table_args__ = (
        CheckConstraint("status IN ('draft', 'running', 'completed')", name="valid_status"),
        CheckConstraint("allocation > 0 AND allocation < 1", name="valid_allocation"),
        CheckConstraint("alpha > 0 AND alpha < 0.5", name="valid_alpha"),
        CheckConstraint("power > 0.5 AND power < 1", name="valid_power"),
        CheckConstraint("expected_effect IS NULL OR expected_effect > 0", name="valid_effect"),
        CheckConstraint(
            "baseline_conversion IS NULL OR (baseline_conversion > 0 AND baseline_conversion < 1)",
            name="valid_baseline",
        ),
        CheckConstraint("randomization_unit IN ('user', 'account', 'device')", name="valid_unit"),
        CheckConstraint(
            "planned_end IS NULL OR planned_start IS NULL OR planned_end > planned_start",
            name="valid_dates",
        ),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    name: Mapped[str] = mapped_column(String(160))
    hypothesis: Mapped[str] = mapped_column(Text)
    primary_metric: Mapped[str] = mapped_column(String(64))
    status: Mapped[str] = mapped_column(String(24), default="draft", index=True)
    control_name: Mapped[str] = mapped_column(String(80), default="Контроль")
    treatment_name: Mapped[str] = mapped_column(String(80), default="Вариант B")
    allocation: Mapped[float] = mapped_column(Float, default=0.5)
    alpha: Mapped[float] = mapped_column(Float, default=0.05)
    expected_effect: Mapped[float | None] = mapped_column(Float)
    power: Mapped[float] = mapped_column(Float, default=0.8)
    baseline_conversion: Mapped[float | None] = mapped_column(Float)
    randomization_unit: Mapped[str] = mapped_column(String(24), default="user")
    planned_start: Mapped[date | None] = mapped_column(Date)
    planned_end: Mapped[date | None] = mapped_column(Date)
    planned_sample_size: Mapped[int | None] = mapped_column(BigInteger)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    locked_plan: Mapped[dict | None] = mapped_column(JSON)
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    dataset_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), index=True
    )
    __mapper_args__ = {"version_id_col": version}
