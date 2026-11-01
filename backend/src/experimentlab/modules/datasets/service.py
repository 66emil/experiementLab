import hashlib
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from experimentlab.core.config import Settings
from experimentlab.core.errors import DomainError
from experimentlab.modules.datasets.models import DatasetVersion
from experimentlab.modules.datasets.storage import LocalDatasetStorage
from experimentlab.modules.datasets.validation import validate_csv, validate_filename
from experimentlab.modules.experiments.repository import ExperimentRepository
from experimentlab.modules.experiments.schemas import ExperimentCreate
from experimentlab.modules.experiments.service import ExperimentService


class DatasetService:
    def __init__(self, session: Session, settings: Settings):
        self.session = session
        self.settings = settings
        self.experiments = ExperimentService(ExperimentRepository(session))
        self.storage = LocalDatasetStorage(settings.dataset_storage_path)

    def upload(
        self, experiment_id: str, version: int, filename: str, content: bytes
    ) -> DatasetVersion:
        if len(content) > self.settings.max_csv_bytes:
            raise DomainError("file_too_large", "Файл превышает допустимый размер.", 413)
        experiment = self.experiments.get(experiment_id)
        self.experiments.check_version(experiment, version)
        if experiment.is_demo:
            raise DomainError(
                "demo_data_locked",
                "Создайте пользовательский эксперимент для загрузки своих данных.",
            )
        if experiment.randomization_unit != "user":
            raise DomainError(
                "incompatible_unit",
                "CSV с одной строкой на пользователя требует единицу рандомизации «Пользователь».",
                422,
            )
        filename = validate_filename(filename)
        summary = validate_csv(content, experiment.primary_metric, self.settings.max_csv_rows)
        dataset_id = str(uuid4())
        key = f"{dataset_id}.csv"
        dataset = DatasetVersion(
            id=dataset_id,
            experiment_id=experiment_id,
            version=experiment.dataset_count + 1,
            filename=filename,
            storage_key=key,
            sha256=hashlib.sha256(content).hexdigest(),
            byte_size=len(content),
            row_count=summary.row_count,
            control_count=summary.control_count,
            treatment_count=summary.treatment_count,
            primary_metric=experiment.primary_metric,
            warnings=summary.warnings,
            config_snapshot={
                **ExperimentCreate.model_validate(experiment, from_attributes=True).model_dump(
                    mode="json"
                ),
                "experiment_version": experiment.version,
                "experiment_status": experiment.status,
                "planned_sample_size": experiment.planned_sample_size,
                "locked_plan": experiment.locked_plan,
            },
        )
        try:
            self.storage.write(key, content)
        except OSError as error:
            raise DomainError(
                "storage_unavailable", "Не удалось сохранить CSV в хранилище.", 503
            ) from error
        try:
            experiment.dataset_count += 1
            self.session.add(dataset)
            self.session.commit()
        except Exception:
            self.session.rollback()
            self.storage.discard(key)
            raise
        self.session.refresh(dataset)
        return dataset

    def get(self, experiment_id: str, dataset_id: str) -> DatasetVersion:
        dataset = self.session.scalar(
            select(DatasetVersion).where(
                DatasetVersion.experiment_id == experiment_id,
                DatasetVersion.id == dataset_id,
            )
        )
        if dataset is None:
            raise DomainError("dataset_not_found", "Версия данных не найдена.", 404)
        return dataset
