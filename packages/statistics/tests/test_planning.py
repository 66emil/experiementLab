import pytest

from experimentlab_statistics import plan_binary_experiment


def test_reference_example():
    # p1=.1, p2=.11, two-sided alpha=.05, power=.8, equal allocation.
    result = plan_binary_experiment(0.1, 0.1)
    assert result.per_group == 14751
    assert result.total == 29502
    assert result.absolute_effect == pytest.approx(0.01)


def test_more_power_and_smaller_effect_require_more_observations():
    base = plan_binary_experiment(0.1, 0.1)
    assert plan_binary_experiment(0.1, 0.05).per_group > base.per_group
    assert plan_binary_experiment(0.1, 0.1, power=0.9).per_group > base.per_group
    assert plan_binary_experiment(0.1, 0.1, alpha=0.01).per_group > base.per_group


def test_numerical_underflow_is_reported_as_invalid_input():
    with pytest.raises(ValueError):
        plan_binary_experiment(1e-300, 0.1)
    with pytest.raises(ValueError):
        plan_binary_experiment(0.1, 1e-20)


@pytest.mark.parametrize(
    "baseline,mde",
    [(0, 0.1), (1, 0.1), (0.1, 0), (0.9, 0.5), (float("nan"), 0.1), (0.1, float("inf"))],
)
def test_invalid_inputs(baseline, mde):
    with pytest.raises(ValueError):
        plan_binary_experiment(baseline, mde)
