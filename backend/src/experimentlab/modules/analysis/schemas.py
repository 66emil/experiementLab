from typing import Literal

from pydantic import BaseModel

from experimentlab.modules.datasets.schemas import DatasetRead
from experimentlab_statistics.health import HealthReport
from experimentlab_statistics.models import ComparisonResult


class EvaluationContext(BaseModel):
    primary_metric: str
    metric_kind: Literal["binary", "continuous"]
    allocation: float
    alpha: float
    randomization_unit: str
    planned_sample_size: int | None
    source: Literal["locked_at_upload", "draft_at_upload"]
    experiment_version_at_upload: int | None


class DatasetHealthResponse(BaseModel):
    dataset: DatasetRead
    engine_version: str
    context: EvaluationContext
    report: HealthReport


class DatasetAnalysisResponse(DatasetHealthResponse):
    analysis_status: Literal["available", "blocked", "unavailable"]
    comparison: ComparisonResult | None
