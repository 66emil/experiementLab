from dataclasses import replace

from sqlalchemy.orm import Session

from experimentlab.core.config import Settings
from experimentlab.core.errors import DomainError
from experimentlab.modules.analysis.schemas import (
    DatasetAnalysisResponse,
    DatasetHealthResponse,
    EvaluationContext,
)
from experimentlab.modules.datasets.reading import read_observations
from experimentlab.modules.datasets.schemas import DatasetRead
from experimentlab.modules.datasets.service import DatasetService
from experimentlab.modules.experiments.schemas import ExperimentCreate
from experimentlab.modules.metrics.catalog import METRICS
from experimentlab_statistics import (
    __version__,
    compare_proportions,
    compare_welch,
    inspect_observations,
)
from experimentlab_statistics.models import Issue, Observation


class EvaluationService:
    def __init__(self, session: Session, settings: Settings):
        self.datasets = DatasetService(session, settings)
        self.settings = settings

    def health(
        self, experiment_id: str, dataset_id: str
    ) -> tuple[DatasetHealthResponse, list[Observation]]:
        dataset = self.datasets.get(experiment_id, dataset_id)
        if dataset.byte_size > self.settings.max_csv_bytes:
            raise DomainError(
                "dataset_size_limit", "Размер версии превышает текущий лимит обработки.", 422
            )
        content = self.datasets.storage.read(dataset.storage_key, dataset.sha256)
        observations = read_observations(content, self.settings.max_csv_rows)
        snapshot = dataset.config_snapshot
        locked = snapshot.get("locked_plan")
        plan_data = locked if isinstance(locked, dict) else snapshot
        try:
            plan = ExperimentCreate.model_validate(
                {key: plan_data[key] for key in ExperimentCreate.model_fields if key in plan_data}
            )
        except ValueError as error:
            raise DomainError(
                "invalid_dataset_plan", "Снимок плана версии данных некорректен.", 422
            ) from error
        metric = next(metric for metric in METRICS if metric.key == plan.primary_metric)
        context = EvaluationContext(
            primary_metric=plan.primary_metric,
            metric_kind=metric.kind,
            allocation=plan.allocation,
            alpha=plan.alpha,
            randomization_unit=plan.randomization_unit,
            planned_sample_size=plan_data.get("planned_sample_size"),
            source="locked_at_upload" if isinstance(locked, dict) else "draft_at_upload",
            experiment_version_at_upload=snapshot.get("experiment_version"),
        )
        report = inspect_observations(
            observations,
            metric.kind,
            plan.allocation,
            non_negative=plan.primary_metric == "revenue_per_user",
        )
        issues = list(report.issues)
        if dataset.primary_metric != plan.primary_metric:
            issues.append(
                Issue(
                    "metric_metadata_mismatch",
                    "blocking",
                    "Метрика версии не совпадает со снимком её плана.",
                )
            )
        if (
            report.row_count != dataset.row_count
            or report.control_rows != dataset.control_count
            or report.treatment_rows != dataset.treatment_count
            or len(content) != dataset.byte_size
        ):
            issues.append(
                Issue(
                    "dataset_metadata_mismatch",
                    "blocking",
                    "Содержимое файла не совпадает со счётчиками метаданных версии.",
                )
            )
        if plan.randomization_unit != "user":
            issues.append(
                Issue(
                    "unsupported_randomization_unit",
                    "blocking",
                    "Одна строка на пользователя не поддерживает кластерную рандомизацию.",
                )
            )
        if not isinstance(locked, dict):
            issues.append(
                Issue(
                    "unlocked_plan",
                    "warning",
                    "На момент загрузки план не был зафиксирован. Расчёт исследовательский.",
                )
            )
        if snapshot.get("experiment_status") == "running":
            issues.append(
                Issue(
                    "interim_snapshot",
                    "warning",
                    "Снимок загружен во время running. "
                    "Промежуточный p-value нельзя использовать для выбора момента остановки.",
                )
            )
        if plan.primary_metric == "retention_d7":
            issues.append(
                Issue(
                    "retention_maturity_unverified",
                    "warning",
                    "В CSV нет времён включения: зрелость D7 проверить невозможно.",
                )
            )
        if (
            context.planned_sample_size
            and min(report.control_users, report.treatment_users) < context.planned_sample_size
        ):
            issues.append(
                Issue(
                    "planned_sample_not_reached",
                    "warning",
                    "Планируемый размер выборки ещё не достигнут в одной или обеих группах.",
                )
            )
        status = (
            "blocked"
            if any(i.severity == "blocking" for i in issues)
            else "warnings"
            if issues
            else "checks_passed"
        )
        report = replace(report, status=status, issues=issues)
        return DatasetHealthResponse(
            dataset=DatasetRead.model_validate(dataset),
            engine_version=__version__,
            context=context,
            report=report,
        ), observations

    def analyze(self, experiment_id: str, dataset_id: str) -> DatasetAnalysisResponse:
        health, observations = self.health(experiment_id, dataset_id)
        comparison = None
        status = "blocked"
        if health.report.status != "blocked":
            control = [row.metric_value for row in observations if row.variant == "control"]
            treatment = [row.metric_value for row in observations if row.variant == "treatment"]
            method = (
                compare_proportions if health.context.metric_kind == "binary" else compare_welch
            )
            comparison = method(control, treatment, health.context.alpha)
            status = comparison.status
        return DatasetAnalysisResponse(
            dataset=health.dataset,
            engine_version=health.engine_version,
            context=health.context,
            report=health.report,
            analysis_status=status,
            comparison=comparison,
        )
