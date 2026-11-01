from datetime import UTC, date, datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, computed_field, field_validator, model_validator

from experimentlab.modules.experiments.planning import planning_issues
from experimentlab.modules.metrics.catalog import MetricKey

ExperimentStatus = Literal["draft", "running", "completed"]
RandomizationUnit = Literal["user", "account", "device"]


class ExperimentCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid", allow_inf_nan=False)
    name: str = Field(min_length=3, max_length=160)
    hypothesis: str = Field(min_length=10, max_length=5000)
    primary_metric: MetricKey
    control_name: str = Field(default="Контроль", min_length=1, max_length=80)
    treatment_name: str = Field(default="Вариант B", min_length=1, max_length=80)
    allocation: float = Field(default=0.5, gt=0, lt=1)
    alpha: float = Field(default=0.05, gt=0, lt=0.5)
    expected_effect: float | None = Field(default=None, gt=0, le=10)
    power: float = Field(default=0.8, gt=0.5, lt=1)
    baseline_conversion: float | None = Field(default=None, gt=0, lt=1)
    randomization_unit: RandomizationUnit = "user"
    planned_start: date | None = None
    planned_end: date | None = None

    @model_validator(mode="after")
    def valid_configuration(self) -> "ExperimentCreate":
        if self.control_name.casefold() == self.treatment_name.casefold():
            raise ValueError("Названия контрольной и тестовой групп должны отличаться.")
        if self.planned_start and self.planned_end and self.planned_end <= self.planned_start:
            raise ValueError("Планируемое окончание должно быть позже начала.")
        if self.primary_metric == "revenue_per_user" and self.baseline_conversion is not None:
            raise ValueError("Базовая конверсия неприменима к метрике выручки.")
        if (
            self.baseline_conversion is not None
            and self.expected_effect is not None
            and self.baseline_conversion * (1 + self.expected_effect) >= 1
        ):
            raise ValueError("Ожидаемая конверсия должна быть меньше 100%.")
        return self


class ExperimentUpdate(ExperimentCreate):
    version: int = Field(ge=1)


class TransitionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    status: ExperimentStatus
    version: int = Field(ge=1)


class VersionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    version: int = Field(ge=1)


class ExperimentRead(ExperimentCreate):
    model_config = ConfigDict(from_attributes=True)
    id: str
    status: ExperimentStatus
    is_demo: bool
    created_at: datetime
    started_at: datetime | None
    completed_at: datetime | None
    planned_sample_size: int | None
    locked_plan: dict[str, Any] | None
    version: int
    dataset_count: int

    @field_validator("created_at", "started_at", "completed_at")
    @classmethod
    def ensure_utc(cls, value: datetime | None) -> datetime | None:
        if value is None:
            return None
        return value.replace(tzinfo=UTC) if value.tzinfo is None else value.astimezone(UTC)

    @computed_field
    @property
    def planning_issues(self) -> list[str]:
        return planning_issues(self)

    @computed_field
    @property
    def start_issues(self) -> list[str]:
        issues = self.planning_issues.copy()
        if self.planned_start is None or self.planned_end is None:
            issues.append("Укажите планируемые даты начала и окончания.")
        return issues

    @computed_field
    @property
    def available_actions(self) -> list[str]:
        if self.status == "draft":
            actions = ["edit"]
            if not self.planning_issues:
                actions.append("calculate_sample_size")
            if not self.start_issues and self.planned_sample_size is not None:
                actions.append("start")
            return actions
        return ["complete"] if self.status == "running" else []


class ExperimentPage(BaseModel):
    items: list[ExperimentRead]
    total: int
    limit: int
    offset: int


class ExperimentSummary(BaseModel):
    total: int = 0
    draft: int = 0
    running: int = 0
    completed: int = 0
