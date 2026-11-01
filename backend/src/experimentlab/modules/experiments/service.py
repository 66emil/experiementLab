from datetime import UTC, datetime

from experimentlab.core.errors import DomainError
from experimentlab.modules.experiments.models import Experiment
from experimentlab.modules.experiments.planning import calculate_sample_size, planning_issues
from experimentlab.modules.experiments.repository import ExperimentRepository
from experimentlab.modules.experiments.schemas import (
    ExperimentCreate,
    ExperimentRead,
    ExperimentUpdate,
)


class ExperimentNotFound(Exception):
    pass


class ExperimentService:
    def __init__(self, repository: ExperimentRepository):
        self.repository = repository

    def create(self, payload: ExperimentCreate) -> Experiment:
        sample_size = None if planning_issues(payload) else calculate_sample_size(payload)
        return self.repository.add(
            Experiment(
                **payload.model_dump(),
                status="draft",
                is_demo=False,
                planned_sample_size=sample_size,
            )
        )

    def get(self, experiment_id: str) -> Experiment:
        experiment = self.repository.get(experiment_id)
        if experiment is None:
            raise ExperimentNotFound(experiment_id)
        return experiment

    def check_version(self, experiment: Experiment, version: int) -> None:
        if experiment.version != version:
            raise DomainError(
                "stale_version", "Эксперимент изменён. Обновите страницу и повторите действие."
            )

    def update(self, experiment_id: str, payload: ExperimentUpdate) -> Experiment:
        experiment = self.get(experiment_id)
        self.check_version(experiment, payload.version)
        if experiment.status != "draft":
            raise DomainError("plan_locked", "После запуска параметры эксперимента зафиксированы.")
        if experiment.dataset_count and (
            experiment.primary_metric != payload.primary_metric
            or experiment.randomization_unit != payload.randomization_unit
        ):
            raise DomainError(
                "dataset_schema_locked",
                "Метрика и единица рандомизации уже связаны с версиями данных.",
            )
        for key, value in payload.model_dump(exclude={"version"}).items():
            setattr(experiment, key, value)
        experiment.planned_sample_size = (
            None if planning_issues(payload) else calculate_sample_size(payload)
        )
        experiment.version += 1
        return self.repository.save(experiment)

    def calculate(self, experiment_id: str, version: int) -> Experiment:
        experiment = self.get(experiment_id)
        self.check_version(experiment, version)
        if experiment.status != "draft":
            raise DomainError("plan_locked", "Пересчёт зафиксированного плана недоступен.")
        issues = planning_issues(experiment)
        if issues:
            raise DomainError("incompatible_plan", " ".join(issues), 422)
        experiment.planned_sample_size = calculate_sample_size(experiment)
        experiment.version += 1
        return self.repository.save(experiment)

    def transition(self, experiment_id: str, status: str, version: int) -> Experiment:
        experiment = self.get(experiment_id)
        self.check_version(experiment, version)
        transitions = {"draft": "running", "running": "completed"}
        if transitions.get(experiment.status) != status:
            raise DomainError(
                "invalid_transition", "Допустимы только переходы draft → running → completed."
            )
        if status == "running":
            issues = ExperimentRead.model_validate(experiment).start_issues
            if issues:
                raise DomainError("incomplete_plan", " ".join(issues), 422)
            experiment.planned_sample_size = calculate_sample_size(experiment)
            experiment.locked_plan = {
                **ExperimentCreate.model_validate(experiment, from_attributes=True).model_dump(
                    mode="json"
                ),
                "planned_sample_size": experiment.planned_sample_size,
                "sample_size_method": "two_proportion_normal_approximation",
                "plan_version": experiment.version,
            }
            experiment.started_at = datetime.now(UTC)
        else:
            experiment.completed_at = datetime.now(UTC)
        experiment.status = status
        return self.repository.save(experiment)
