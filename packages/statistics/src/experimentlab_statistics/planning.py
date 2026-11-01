"""Fixed-horizon, two-sided normal approximation for two independent proportions."""

from dataclasses import dataclass
from math import ceil, isfinite, sqrt
from statistics import NormalDist


@dataclass(frozen=True, slots=True)
class SampleSize:
    per_group: int
    total: int
    absolute_effect: float


def plan_binary_experiment(
    baseline: float, relative_mde: float, alpha: float = 0.05, power: float = 0.8
) -> SampleSize:
    """Plan an upward effect with equal allocation; MDE is relative, not percentage points.

    Assumes independent Bernoulli observations, one primary metric, no interim peeking,
    and no multiple-comparison adjustment. This is an asymptotic planning estimate.
    """
    if not all(isfinite(value) for value in (baseline, relative_mde, alpha, power)):
        raise ValueError("Все параметры должны быть конечными числами.")
    if not 0 < baseline < 1 or relative_mde <= 0:
        raise ValueError("Базовая конверсия должна быть от 0 до 1, MDE — больше 0.")
    target = baseline * (1 + relative_mde)
    if target >= 1:
        raise ValueError("Ожидаемая конверсия должна быть меньше 100%.")
    if not 0 < alpha < 0.5 or not 0.5 < power < 1:
        raise ValueError("Требуется 0 < alpha < 0.5 и 0.5 < power < 1.")
    normal = NormalDist()
    pooled = (baseline + target) / 2
    effect = target - baseline
    if effect <= 0 or effect**2 == 0:
        raise ValueError("Эффект слишком мал для устойчивого численного расчёта.")
    numerator = normal.inv_cdf(1 - alpha / 2) * sqrt(2 * pooled * (1 - pooled)) + normal.inv_cdf(
        power
    ) * sqrt(baseline * (1 - baseline) + target * (1 - target))
    estimate = numerator**2 / effect**2
    if not isfinite(estimate):
        raise ValueError("Параметры выходят за пределы устойчивого численного расчёта.")
    per_group = ceil(estimate)
    return SampleSize(per_group=per_group, total=2 * per_group, absolute_effect=effect)
