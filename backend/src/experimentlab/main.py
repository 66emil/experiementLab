import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm.exc import StaleDataError
from starlette.exceptions import HTTPException

from experimentlab.core.config import get_settings
from experimentlab.core.errors import DomainError, ErrorResponse
from experimentlab.db.session import get_engine
from experimentlab.modules.analysis.evaluation_router import router as evaluation_router
from experimentlab.modules.analysis.router import router as analysis_router
from experimentlab.modules.datasets.router import router as datasets_router
from experimentlab.modules.experiments.router import router as experiments_router
from experimentlab.modules.experiments.service import ExperimentNotFound
from experimentlab.modules.metrics.catalog import METRICS, Metric

logger = logging.getLogger(__name__)


def create_app() -> FastAPI:
    app = FastAPI(
        title="ExperimentLab API",
        version="0.1.0",
        docs_url="/docs",
        responses={
            409: {"model": ErrorResponse, "description": "State or version conflict"},
            413: {"model": ErrorResponse, "description": "CSV exceeds size limit"},
            415: {"model": ErrorResponse, "description": "Unsupported content type"},
            404: {"model": ErrorResponse, "description": "Resource not found"},
            422: {"model": ErrorResponse, "description": "Invalid input"},
            503: {"model": ErrorResponse, "description": "Storage unavailable"},
        },
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=get_settings().cors_origins,
        allow_methods=["GET", "POST", "PUT"],
        allow_headers=["Content-Type"],
    )

    @app.exception_handler(DomainError)
    async def application_error(_request: Request, error: DomainError):
        detail = {"code": error.code, "message": error.message}
        if error.details is not None:
            detail["details"] = error.details
        return JSONResponse(status_code=error.status_code, content={"error": detail})

    @app.exception_handler(StaleDataError)
    async def stale_update(_request: Request, _error: StaleDataError):
        return JSONResponse(
            status_code=409,
            content={
                "error": {
                    "code": "stale_version",
                    "message": "Эксперимент изменён. Обновите страницу и повторите действие.",
                }
            },
        )

    @app.exception_handler(ExperimentNotFound)
    async def not_found(_request: Request, _error: ExperimentNotFound):
        return JSONResponse(
            status_code=404,
            content={"error": {"code": "not_found", "message": "Эксперимент не найден."}},
        )

    @app.exception_handler(RequestValidationError)
    async def validation_error(_request: Request, error: RequestValidationError):
        details = [
            {"loc": list(item["loc"]), "msg": item["msg"], "type": item["type"]}
            for item in error.errors()
        ]
        return JSONResponse(
            status_code=422,
            content={
                "error": {
                    "code": "validation_error",
                    "message": "Проверьте введённые данные.",
                    "details": details,
                }
            },
        )

    @app.exception_handler(ValueError)
    async def domain_error(_request: Request, error: ValueError):
        return JSONResponse(
            status_code=422,
            content={"error": {"code": "invalid_parameters", "message": str(error)}},
        )

    @app.exception_handler(HTTPException)
    async def http_error(_request: Request, error: HTTPException):
        return JSONResponse(
            status_code=error.status_code,
            content={"error": {"code": "http_error", "message": str(error.detail)}},
            headers=error.headers,
        )

    @app.exception_handler(SQLAlchemyError)
    async def storage_error(_request: Request, _error: SQLAlchemyError):
        logger.exception("Database operation failed")
        return JSONResponse(
            status_code=503,
            content={
                "error": {
                    "code": "storage_unavailable",
                    "message": "Хранилище временно недоступно.",
                }
            },
        )

    @app.get("/health", tags=["system"], operation_id="health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.get("/ready", tags=["system"], operation_id="readiness")
    def readiness() -> dict[str, str]:
        with get_engine().connect() as connection:
            connection.execute(text("SELECT id, version FROM experiments LIMIT 1"))
            connection.execute(text("SELECT id FROM dataset_versions LIMIT 1"))
        return {"status": "ready"}

    @app.get("/api/v1/metrics", tags=["metrics"], operation_id="list_metrics")
    def list_metrics() -> list[Metric]:
        return list(METRICS)

    app.include_router(experiments_router, prefix="/api/v1")
    app.include_router(analysis_router, prefix="/api/v1")
    app.include_router(evaluation_router, prefix="/api/v1")
    app.include_router(datasets_router, prefix="/api/v1")
    return app


app = create_app()
