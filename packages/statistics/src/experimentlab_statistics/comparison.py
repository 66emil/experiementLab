from dataclasses import replace
from math import erfc, fsum, hypot, isfinite, sqrt
from statistics import NormalDist, variance

from scipy.stats import t as student_t

from experimentlab_statistics.models import (
    ComparisonResult,
    ConfidenceInterval,
    GroupEstimate,
    Issue,
)

COMMON_ASSUMPTIONS = [
    "Две независимые группы, одна строка на единицу рандомизации; "
    "наблюдения внутри групп независимы.",
    "Двусторонняя проверка H0: метрики равны; эффект = treatment − control.",
    "Фиксированный горизонт и одна гипотеза; без поправки на множественные сравнения "
    "и подглядывание.",
    "Относительный эффект = (treatment − control) / control; "
    "интервал относится к абсолютному эффекту.",
]


def _validate(control: list[float], treatment: list[float], alpha: float) -> None:
    if not isfinite(alpha) or not 0 < alpha < 0.5 or 1 - alpha == 1:
        raise ValueError("Нужно 0 < alpha < 0.5.")
    if not all(value is not None and isfinite(value) for value in (*control, *treatment)):
        raise ValueError("Пропуски и неконечные значения нельзя молча исключать из анализа.")


def _relative(effect: float | None, control: float | None, issues: list[Issue]) -> float | None:
    if control == 0:
        issues.append(
            Issue(
                "zero_control_metric",
                "warning",
                "Контрольная метрика равна нулю: относительный эффект не определён.",
            )
        )
        return None
    if control is None or effect is None:
        return None
    result = effect / control
    if not isfinite(result):
        issues.append(
            Issue(
                "relative_effect_overflow",
                "warning",
                "Относительный эффект выходит за численный диапазон.",
            )
        )
        return None
    return result


def _wilson(successes: int, n: int, z: float) -> tuple[float, float]:
    proportion = successes / n
    denominator = 1 + z * z / n
    center = (proportion + z * z / (2 * n)) / denominator
    margin = z * sqrt(proportion * (1 - proportion) / n + z * z / (4 * n * n)) / denominator
    return max(0.0, center - margin), min(1.0, center + margin)


def compare_proportions(
    control: list[float], treatment: list[float], alpha: float = 0.05
) -> ComparisonResult:
    """Pooled two-proportion z-test and Newcombe-Wilson CI without continuity correction."""
    _validate(control, treatment, alpha)
    if any(value not in (0, 1) for value in (*control, *treatment)):
        raise ValueError("Для бинарной метрики допустимы только 0 и 1.")
    nc, nt = len(control), len(treatment)
    xc, xt = int(sum(control)), int(sum(treatment))
    pc, pt = (xc / nc if nc else None), (xt / nt if nt else None)
    delta = pt - pc if pc is not None and pt is not None else None
    issues: list[Issue] = []
    relative = _relative(delta, pc, issues)
    result = ComparisonResult(
        method="two_proportion_z",
        status="unavailable",
        control=GroupEstimate(nc, pc, xc),
        treatment=GroupEstimate(nt, pt, xt),
        absolute_effect=delta,
        relative_effect=relative,
        alpha=alpha,
        issues=issues,
        assumptions=[
            *COMMON_ASSUMPTIONS,
            "Bernoulli-наблюдения; минимум 5 успехов и 5 неуспехов в каждой группе.",
            "p-value: объединённая дисперсия при H0; ДИ: Newcombe–Wilson, "
            "без поправки на непрерывность.",
            "ДИ и тест используют разные аппроксимации и не обязаны точно совпадать на пороге α.",
        ],
    )
    if min(nc, nt) < 2:
        return replace(
            result,
            issues=[
                *issues,
                Issue(
                    "insufficient_sample",
                    "blocking",
                    "Нужно минимум два наблюдения в каждой группе.",
                ),
            ],
        )
    if (xc in (0, nc)) and (xt in (0, nt)):
        return replace(
            result,
            issues=[
                *issues,
                Issue(
                    "zero_variance",
                    "blocking",
                    "Обе бинарные группы постоянны. p-value и ДИ не рассчитываются.",
                ),
            ],
        )
    if min(xc, nc - xc, xt, nt - xt) < 5:
        return replace(
            result,
            issues=[
                *issues,
                Issue(
                    "insufficient_binary_events",
                    "blocking",
                    "Нужно минимум 5 успехов и 5 неуспехов в каждой группе; "
                    "p-value и ДИ недоступны.",
                ),
            ],
        )
    pooled = (xc + xt) / (nc + nt)
    standard_error = sqrt(pooled * (1 - pooled) * (1 / nc + 1 / nt))
    statistic = delta / standard_error
    p_value = erfc(abs(statistic) / sqrt(2))
    if p_value == 0:
        issues.append(
            Issue(
                "p_value_underflow",
                "warning",
                "p-value округлился до нуля в машинной арифметике; это не точная вероятность 0.",
            )
        )
    z = -NormalDist().inv_cdf(alpha / 2)
    lc, uc = _wilson(xc, nc, z)
    lt, ut = _wilson(xt, nt, z)
    lower = delta - hypot(pt - lt, uc - pc)
    upper = delta + hypot(ut - pt, pc - lc)
    interval = ConfidenceInterval(max(-1.0, lower), min(1.0, upper), 1 - alpha, "newcombe_wilson")
    return replace(
        result,
        status="available",
        statistic=statistic,
        p_value=p_value,
        confidence_interval=interval,
    )


def compare_welch(
    control: list[float], treatment: list[float], alpha: float = 0.05
) -> ComparisonResult:
    """Independent two-sided Welch t-test with Welch-Satterthwaite degrees of freedom."""
    _validate(control, treatment, alpha)
    nc, nt = len(control), len(treatment)
    scale = max((abs(value) for value in (*control, *treatment)), default=1.0) or 1.0
    c, t = [value / scale for value in control], [value / scale for value in treatment]
    mc, mt = (
        (fsum(value / nc for value in c) if nc else None),
        (fsum(value / nt for value in t) if nt else None),
    )
    vc, vt = (variance(c) if nc > 1 else None), (variance(t) if nt > 1 else None)
    delta_scaled = mt - mc if mc is not None and mt is not None else None
    delta = delta_scaled * scale if delta_scaled is not None else None
    issues: list[Issue] = []
    if delta is not None and not isfinite(delta):
        delta = None
        issues.append(
            Issue(
                "numeric_overflow",
                "blocking",
                "Абсолютный эффект выходит за конечный численный диапазон.",
            )
        )

    def estimate(n: int, mean: float | None, var: float | None) -> GroupEstimate:
        raw_variance = var * scale * scale if var is not None else None
        return GroupEstimate(
            n,
            mean * scale if mean is not None else None,
            variance=raw_variance if raw_variance is None or isfinite(raw_variance) else None,
        )

    gc, gt = estimate(nc, mc, vc), estimate(nt, mt, vt)
    if (nc > 1 and gc.variance is None) or (nt > 1 and gt.variance is None):
        issues.append(
            Issue(
                "variance_overflow",
                "warning",
                "Дисперсия не представима в исходных единицах; используется масштабирование.",
            )
        )
    relative = _relative(delta, gc.value, issues)
    result = ComparisonResult(
        method="welch_t",
        status="unavailable",
        control=gc,
        treatment=gt,
        absolute_effect=delta,
        relative_effect=relative,
        alpha=alpha,
        issues=issues,
        assumptions=[
            *COMMON_ASSUMPTIONS,
            "Непрерывная метрика с конечной дисперсией; равенство дисперсий не требуется.",
            "Для малой выборки нужна приближённая нормальность; "
            "на больших выборках — применимость ЦПТ.",
            "Асимметрия, тяжёлые хвосты и кластеризация требуют отдельной проверки; "
            "автоматического теста нормальности нет.",
        ],
    )
    if min(nc, nt) < 2:
        return replace(
            result,
            issues=[
                *issues,
                Issue(
                    "insufficient_sample",
                    "blocking",
                    "Welch требует минимум два наблюдения в каждой группе.",
                ),
            ],
        )
    if delta is None:
        return result
    a, b = vc / nc, vt / nt
    total = a + b
    if total == 0:
        return replace(
            result,
            issues=[
                *issues,
                Issue(
                    "zero_variance",
                    "blocking",
                    "Обе дисперсии нулевые: Welch не определён, p-value и ДИ отсутствуют.",
                ),
            ],
        )
    if vc == 0 or vt == 0:
        issues.append(
            Issue(
                "one_constant_group",
                "warning",
                "Одна группа имеет нулевую дисперсию; расчёт использует дисперсию другой группы.",
            )
        )
    if min(nc, nt) < 30:
        issues.append(
            Issue(
                "small_sample_normality",
                "warning",
                "Малая выборка: нормальность распределения средних требует проверки.",
            )
        )
    degrees = 1 / ((a / total) ** 2 / (nc - 1) + (b / total) ** 2 / (nt - 1))
    se = sqrt(total)
    statistic = delta_scaled / se
    p_value = float(2 * student_t.sf(abs(statistic), degrees))
    if p_value == 0:
        issues.append(
            Issue(
                "p_value_underflow",
                "warning",
                "p-value округлился до нуля в машинной арифметике; это не точная вероятность 0.",
            )
        )
    critical = float(student_t.isf(alpha / 2, degrees))
    lower, upper = (delta_scaled - critical * se) * scale, (delta_scaled + critical * se) * scale
    if not all(isfinite(value) for value in (statistic, p_value, critical, lower, upper)):
        return replace(
            result,
            issues=[
                *issues,
                Issue(
                    "numeric_instability",
                    "blocking",
                    "Параметры не допускают устойчивого конечного расчёта p-value и ДИ.",
                ),
            ],
        )
    return replace(
        result,
        status="available",
        statistic=statistic,
        p_value=p_value,
        degrees_of_freedom=degrees,
        confidence_interval=ConfidenceInterval(lower, upper, 1 - alpha, "welch_satterthwaite_t"),
    )
