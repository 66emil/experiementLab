from dataclasses import dataclass, field
from typing import Literal

Severity = Literal["blocking", "warning"]
MetricKind = Literal["binary", "continuous"]


@dataclass(frozen=True, slots=True)
class Issue:
    code: str
    severity: Severity
    message: str
    count: int | None = None


@dataclass(frozen=True, slots=True)
class Observation:
    user_id: str | None
    variant: str | None
    metric_value: float | None


@dataclass(frozen=True, slots=True)
class GroupEstimate:
    n: int
    value: float | None
    successes: int | None = None
    variance: float | None = None


@dataclass(frozen=True, slots=True)
class ConfidenceInterval:
    lower: float
    upper: float
    level: float
    method: str
    estimand: str = "treatment_minus_control"


@dataclass(frozen=True, slots=True)
class ComparisonResult:
    method: str
    status: Literal["available", "unavailable"]
    control: GroupEstimate
    treatment: GroupEstimate
    absolute_effect: float | None
    relative_effect: float | None
    p_value: float | None = None
    confidence_interval: ConfidenceInterval | None = None
    statistic: float | None = None
    degrees_of_freedom: float | None = None
    alpha: float = 0.05
    alternative: str = "two-sided"
    issues: list[Issue] = field(default_factory=list)
    assumptions: list[str] = field(default_factory=list)
