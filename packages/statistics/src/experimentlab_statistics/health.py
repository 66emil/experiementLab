from collections import Counter
from dataclasses import dataclass
from math import isfinite

from experimentlab_statistics.models import Issue, MetricKind, Observation
from experimentlab_statistics.srm import SrmResult, sample_ratio_mismatch


@dataclass(frozen=True, slots=True)
class HealthReport:
    status: str
    row_count: int
    unique_users: int
    missing_counts: dict[str, int]
    duplicate_users: int
    duplicate_rows: int
    overlapping_users: int
    invalid_variants: int
    invalid_metric_values: int
    control_rows: int
    treatment_rows: int
    control_users: int
    treatment_users: int
    srm: SrmResult | None
    issues: list[Issue]
    limitations: list[str]


def inspect_observations(
    observations: list[Observation],
    metric_kind: MetricKind,
    treatment_probability: float,
    *,
    non_negative: bool = False,
) -> HealthReport:
    if metric_kind not in ("binary", "continuous"):
        raise ValueError("Неизвестный тип метрики.")
    # Validate the planned probability even when assignment defects prevent SRM.
    sample_ratio_mismatch(0, 0, treatment_probability)
    missing = {"user_id": 0, "variant": 0, "metric_value": 0}
    ids: Counter[str] = Counter()
    groups: dict[str, set[str]] = {"control": set(), "treatment": set()}
    counts = {"control": 0, "treatment": 0}
    invalid_variants = invalid_values = 0
    for row in observations:
        user_id = row.user_id.strip() if row.user_id else ""
        variant = row.variant.strip() if row.variant else ""
        if not user_id:
            missing["user_id"] += 1
        else:
            ids[user_id] += 1
        if not variant:
            missing["variant"] += 1
        elif variant not in groups:
            invalid_variants += 1
        if variant in groups:
            counts[variant] += 1
            if user_id:
                groups[variant].add(user_id)
        value = row.metric_value
        if value is None:
            missing["metric_value"] += 1
        elif (
            not isfinite(value)
            or (metric_kind == "binary" and value not in (0, 1))
            or (non_negative and value < 0)
        ):
            invalid_values += 1
    duplicates = sum(count > 1 for count in ids.values())
    duplicate_rows = sum(count - 1 for count in ids.values())
    overlap = len(groups["control"] & groups["treatment"])
    issues = []
    for key, count in missing.items():
        if count:
            issues.append(Issue(f"missing_{key}", "blocking", f"Пропуски в {key}: {count}.", count))
    if duplicates:
        issues.append(
            Issue(
                "duplicate_users",
                "blocking",
                "Пользователь встречается более одного раза; независимость наблюдений нарушена.",
                duplicates,
            )
        )
    if overlap:
        issues.append(
            Issue(
                "group_overlap",
                "blocking",
                "Есть пользователи одновременно в control и treatment.",
                overlap,
            )
        )
    if invalid_variants:
        issues.append(
            Issue(
                "invalid_variants",
                "blocking",
                "Есть группы, отличные от control/treatment.",
                invalid_variants,
            )
        )
    if invalid_values:
        issues.append(
            Issue(
                "invalid_metric_values",
                "blocking",
                "Есть недопустимые значения метрики. Строки не удаляются автоматически.",
                invalid_values,
            )
        )
    nc, nt = len(groups["control"]), len(groups["treatment"])
    if not nc or not nt:
        issues.append(
            Issue("empty_group", "blocking", "Для сравнения нужны пользователи в обеих группах.")
        )
    elif min(nc, nt) < 2:
        issues.append(
            Issue(
                "small_groups",
                "warning",
                "В одной из групп меньше двух пользователей; статистический тест недоступен.",
            )
        )
    assignment_invalid = (
        missing["user_id"] or missing["variant"] or invalid_variants or duplicates or overlap
    )
    srm = None
    if assignment_invalid:
        issues.append(
            Issue(
                "srm_not_checked",
                "warning",
                "SRM не рассчитан: идентификаторы или назначение групп содержат ошибки.",
            )
        )
    else:
        # Count ALL assigned users, including those with missing/invalid outcomes.
        srm = sample_ratio_mismatch(nc, nt, treatment_probability)
        if srm.mismatch:
            issues.append(
                Issue(
                    "srm_detected",
                    "blocking",
                    "Обнаружен SRM. Сравнение метрик заблокировано до выяснения причин.",
                )
            )
        elif srm.status == "unavailable":
            issues.append(
                Issue("srm_insufficient_sample", "warning", srm.reason or "SRM недоступен.")
            )
    status = (
        "blocked"
        if any(i.severity == "blocking" for i in issues)
        else "warnings"
        if issues
        else "checks_passed"
    )
    return HealthReport(
        status,
        len(observations),
        len(ids),
        missing,
        duplicates,
        duplicate_rows,
        overlap,
        invalid_variants,
        invalid_values,
        counts["control"],
        counts["treatment"],
        nc,
        nt,
        srm,
        issues,
        [
            "Отсутствие SRM не подтверждает хорошее качество данных или корректную рандомизацию.",
            "CSV не проверяет потерянных до выгрузки пользователей, "
            "полноту событий и окно наблюдения.",
            "Независимость, назначение групп и зрелость retention требуют внешней проверки.",
        ],
    )
