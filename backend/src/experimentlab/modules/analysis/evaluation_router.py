from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from experimentlab.core.config import Settings, get_settings
from experimentlab.db.session import get_session
from experimentlab.modules.analysis.schemas import DatasetAnalysisResponse, DatasetHealthResponse
from experimentlab.modules.analysis.service import EvaluationService

router = APIRouter(prefix="/experiments/{experiment_id}/datasets/{dataset_id}", tags=["evaluation"])
Database = Annotated[Session, Depends(get_session)]
Config = Annotated[Settings, Depends(get_settings)]


@router.get("/health", response_model=DatasetHealthResponse, operation_id="dataset_health")
def dataset_health(experiment_id: UUID, dataset_id: UUID, session: Database, settings: Config):
    health, _ = EvaluationService(session, settings).health(str(experiment_id), str(dataset_id))
    return health


@router.get("/analysis", response_model=DatasetAnalysisResponse, operation_id="dataset_analysis")
def dataset_analysis(experiment_id: UUID, dataset_id: UUID, session: Database, settings: Config):
    return EvaluationService(session, settings).analyze(str(experiment_id), str(dataset_id))
