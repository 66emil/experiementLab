from datetime import UTC, datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, field_validator


class DatasetRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    experiment_id: str
    version: int
    filename: str
    sha256: str
    byte_size: int
    row_count: int
    control_count: int
    treatment_count: int
    primary_metric: str
    schema_version: int
    config_snapshot: dict[str, Any]
    warnings: list[str]
    created_at: datetime

    @field_validator("created_at")
    @classmethod
    def ensure_utc(cls, value: datetime) -> datetime:
        return value.replace(tzinfo=UTC) if value.tzinfo is None else value.astimezone(UTC)


class DatasetPage(BaseModel):
    items: list[DatasetRead]
    total: int
    limit: int
    offset: int


class UploadLimits(BaseModel):
    max_bytes: int
    max_rows: int
    max_reported_errors: int
