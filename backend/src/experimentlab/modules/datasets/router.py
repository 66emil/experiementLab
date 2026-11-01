from typing import Annotated
from urllib.parse import quote
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request, Response
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from starlette.concurrency import run_in_threadpool

from experimentlab.core.config import Settings, get_settings
from experimentlab.core.errors import DomainError
from experimentlab.db.session import get_session
from experimentlab.modules.datasets.models import DatasetVersion
from experimentlab.modules.datasets.schemas import DatasetPage, DatasetRead, UploadLimits
from experimentlab.modules.datasets.service import DatasetService
from experimentlab.modules.datasets.validation import MAX_REPORTED_ERRORS

router = APIRouter(tags=["datasets"])
Database = Annotated[Session, Depends(get_session)]
Config = Annotated[Settings, Depends(get_settings)]
EXAMPLE_CSV = (
    "user_id,variant,metric_value\nu001,control,0\nu002,treatment,1\n"
    "u003,control,1\nu004,treatment,0\nu005,control,0\nu006,treatment,1\n"
)


@router.get("/datasets/limits", response_model=UploadLimits, operation_id="dataset_upload_limits")
def upload_limits(settings: Config):
    return {
        "max_bytes": settings.max_csv_bytes,
        "max_rows": settings.max_csv_rows,
        "max_reported_errors": MAX_REPORTED_ERRORS,
    }


@router.get("/datasets/example", operation_id="download_example_csv", response_class=Response)
def example_csv():
    return Response(
        EXAMPLE_CSV,
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="user_metrics.csv"'},
    )


@router.get(
    "/experiments/{experiment_id}/datasets",
    response_model=DatasetPage,
    operation_id="list_dataset_versions",
)
def list_datasets(
    experiment_id: UUID,
    session: Database,
    settings: Config,
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
):
    service = DatasetService(session, settings)
    service.experiments.get(str(experiment_id))
    statement = select(DatasetVersion).where(DatasetVersion.experiment_id == str(experiment_id))
    total = session.scalar(select(func.count()).select_from(statement.subquery())) or 0
    items = session.scalars(
        statement.order_by(DatasetVersion.version.desc()).limit(limit).offset(offset)
    ).all()
    return {"items": items, "total": total, "limit": limit, "offset": offset}


@router.post(
    "/experiments/{experiment_id}/datasets",
    response_model=DatasetRead,
    status_code=201,
    operation_id="upload_dataset",
    openapi_extra={
        "requestBody": {
            "required": True,
            "content": {"text/csv": {"schema": {"type": "string", "format": "binary"}}},
        }
    },
)
async def upload_dataset(
    experiment_id: UUID,
    request: Request,
    session: Database,
    settings: Config,
    version: int = Query(ge=1),
    filename: str = Query(min_length=1, max_length=160),
):
    if request.headers.get("content-type", "").split(";")[0].strip().lower() != "text/csv":
        raise DomainError("unsupported_media_type", "Отправьте CSV с Content-Type: text/csv.", 415)
    content = bytearray()
    async for chunk in request.stream():
        if len(content) + len(chunk) > settings.max_csv_bytes:
            raise DomainError(
                "file_too_large", f"Файл превышает лимит {settings.max_csv_bytes} байт.", 413
            )
        content.extend(chunk)
    dataset = await run_in_threadpool(
        DatasetService(session, settings).upload,
        str(experiment_id),
        version,
        filename,
        bytes(content),
    )
    return DatasetRead.model_validate(dataset)


@router.get(
    "/experiments/{experiment_id}/datasets/{dataset_id}",
    response_model=DatasetRead,
    operation_id="get_dataset_version",
)
def get_dataset(experiment_id: UUID, dataset_id: UUID, session: Database, settings: Config):
    return DatasetService(session, settings).get(str(experiment_id), str(dataset_id))


@router.get(
    "/experiments/{experiment_id}/datasets/{dataset_id}/download",
    response_class=Response,
    operation_id="download_dataset",
)
def download_dataset(experiment_id: UUID, dataset_id: UUID, session: Database, settings: Config):
    service = DatasetService(session, settings)
    dataset = service.get(str(experiment_id), str(dataset_id))
    content = service.storage.read(dataset.storage_key, dataset.sha256)
    return Response(
        content,
        media_type="text/csv",
        headers={
            "Content-Disposition": "attachment; filename*=UTF-8''"
            + quote(dataset.filename, safe=""),
            "X-Content-Type-Options": "nosniff",
        },
    )
