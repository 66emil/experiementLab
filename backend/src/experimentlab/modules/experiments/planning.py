from typing import Protocol

from experimentlab.modules.metrics.catalog import METRICS
from experimentlab_statistics import plan_binary_experiment


class PlanningConfig(Protocol):
    primary_metric: str
    allocation: float
    randomization_unit: str
    baseline_conversion: float | None
    expected_effect: float | None
    alpha: float
    power: float


def planning_issues(config: PlanningConfig) -> list[str]:
    issues = []
    metric = next(metric for metric in METRICS if metric.key == config.primary_metric)
    if metric.kind != "binary":
        issues.append("Калькулятор поддерживает только бинарные метрики.")
    if config.allocation != 0.5:
        issues.append("Для расчёта требуется распределение групп 50/50.")
    if config.randomization_unit != "user":
        issues.append("Текущий план и CSV поддерживают рандомизацию по пользователю.")
    if config.baseline_conversion is None:
        issues.append("Укажите базовую конверсию.")
    if config.expected_effect is None:
        issues.append("Укажите ожидаемый относительный эффект.")
    if not issues:
        try:
            calculate_sample_size(config)
        except ValueError as error:
            issues.append(str(error))
    return issues


def calculate_sample_size(config: PlanningConfig) -> int:
    if config.baseline_conversion is None or config.expected_effect is None:
        raise ValueError("Для расчёта нужны базовая конверсия и ожидаемый эффект.")
    result = plan_binary_experiment(
        config.baseline_conversion, config.expected_effect, config.alpha, config.power
    ).per_group
    if result > 2**53 - 1:
        raise ValueError("Расчётная выборка слишком велика. Увеличьте ожидаемый эффект.")
    return result
