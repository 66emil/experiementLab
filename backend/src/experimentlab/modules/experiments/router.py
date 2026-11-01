from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from experimentlab.db.session import get_session
from experimentlab.modules.experiments.repository import ExperimentRepository
from experimentlab.modules.experiments.schemas import (
    ExperimentCreate,
    ExperimentPage,
    ExperimentRead,
    ExperimentStatus,
    ExperimentSummary,
    ExperimentUpdate,
    TransitionRequest,
    VersionRequest,
)
from experimentlab.modules.experiments.service import ExperimentService

router = APIRouter(prefix="/experiments", tags=["experiments"])
Database = Annotated[Session, Depends(get_session)]


@router.get("", response_model=ExperimentPage, operation_id="list_experiments")
def list_experiments(
    session: Database,
    status: ExperimentStatus | None = None,
    q: str = Query(default="", max_length=160),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
):
    items, total = ExperimentRepository(session).list(status, q.strip(), limit, offset)
    return {"items": items, "total": total, "limit": limit, "offset": offset}


@router.get("/summary", response_model=ExperimentSummary, operation_id="experiment_summary")
def experiment_summary(session: Database):
    return ExperimentRepository(session).summary()


@router.post("", response_model=ExperimentRead, status_code=201, operation_id="create_experiment")
def create_experiment(payload: ExperimentCreate, session: Database):
    return ExperimentService(ExperimentRepository(session)).create(payload)


@router.get("/{experiment_id}", response_model=ExperimentRead, operation_id="get_experiment")
def get_experiment(experiment_id: UUID, session: Database):
    return ExperimentService(ExperimentRepository(session)).get(str(experiment_id))


@router.put("/{experiment_id}", response_model=ExperimentRead, operation_id="update_experiment")
def update_experiment(experiment_id: UUID, payload: ExperimentUpdate, session: Database):
    return ExperimentService(ExperimentRepository(session)).update(str(experiment_id), payload)


@router.post(
    "/{experiment_id}/sample-size",
    response_model=ExperimentRead,
    operation_id="calculate_experiment_sample_size",
)
def calculate_experiment_sample_size(
    experiment_id: UUID, payload: VersionRequest, session: Database
):
    return ExperimentService(ExperimentRepository(session)).calculate(
        str(experiment_id), payload.version
    )


@router.post(
    "/{experiment_id}/transition",
    response_model=ExperimentRead,
    operation_id="transition_experiment",
)
def transition_experiment(experiment_id: UUID, payload: TransitionRequest, session: Database):
    return ExperimentService(ExperimentRepository(session)).transition(
        str(experiment_id), payload.status, payload.version
    )
