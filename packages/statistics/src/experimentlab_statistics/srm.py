from dataclasses import dataclass
from math import isfinite

from scipy.stats import chi2


@dataclass(frozen=True, slots=True)
class SrmResult:
    method: str
    status: str
    control_count: int
    treatment_count: int
    treatment_probability: float
    expected_control: float
    expected_treatment: float
    alpha: float
    statistic: float | None
    p_value: float | None
    mismatch: bool | None
    reason: str | None
    assumptions: list[str]


def sample_ratio_mismatch(
    control_count: int,
    treatment_count: int,
    treatment_probability: float,
    alpha: float = 0.001,
) -> SrmResult:
    """Pearson goodness-of-fit, df=1, no continuity correction, fixed two-arm allocation."""
    if any(type(count) is not int or count < 0 for count in (control_count, treatment_count)):
        raise ValueError("Размеры групп должны быть неотрицательными целыми числами.")
    if (
        not isfinite(treatment_probability)
        or not 0 < treatment_probability < 1
        or not isfinite(alpha)
        or not 0 < alpha < 0.5
    ):
        raise ValueError("Нужны 0 < доля treatment < 1 и 0 < SRM alpha < 0.5.")
    total = control_count + treatment_count
    expected_t = total * treatment_probability
    expected_c = total * (1 - treatment_probability)
    assumptions = [
        "Две взаимоисключающие группы независимых единиц рандомизации.",
        "Постоянное заранее заданное распределение; полная выборка включённых пользователей.",
        "Ожидаемый размер каждой группы не меньше 5; χ²-аппроксимация, df=1.",
        "Одна проверка фиксированного снимка; повторный мониторинг требует отдельной политики.",
    ]
    statistic = p_value = mismatch = reason = None
    if min(expected_c, expected_t) < 5:
        reason = "Для χ²-аппроксимации ожидаемый размер каждой группы должен быть не меньше 5."
    else:
        statistic = (control_count - expected_c) ** 2 / expected_c + (
            treatment_count - expected_t
        ) ** 2 / expected_t
        p_value = float(chi2.sf(statistic, df=1))
        mismatch = p_value < alpha
    return SrmResult(
        "pearson_chi_square_df1",
        "unavailable" if reason else "available",
        control_count,
        treatment_count,
        treatment_probability,
        expected_c,
        expected_t,
        alpha,
        statistic,
        p_value,
        mismatch,
        reason,
        assumptions,
    )
