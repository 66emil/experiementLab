import json
from dataclasses import asdict
from pathlib import Path

import pytest

from experimentlab_statistics import compare_proportions, compare_welch

REFERENCES = json.loads((Path(__file__).parent / "fixtures/reference_cases.json").read_text())


@pytest.mark.parametrize("case", REFERENCES["proportions"])
def test_two_proportions_independent_statsmodels_reference(case):
    xc, nc = case["control"]
    xt, nt = case["treatment"]
    result = compare_proportions(
        [1] * xc + [0] * (nc - xc), [1] * xt + [0] * (nt - xt), case["alpha"]
    )
    assert result.status == "available"
    assert result.statistic == pytest.approx(case["statistic"], abs=1e-12)
    assert result.p_value == pytest.approx(case["p_value"], abs=1e-12)
    assert result.confidence_interval.lower == pytest.approx(case["ci"][0], abs=1e-12)
    assert result.confidence_interval.upper == pytest.approx(case["ci"][1], abs=1e-12)
    assert result.absolute_effect == pytest.approx(xt / nt - xc / nc)
    assert result.relative_effect == pytest.approx((xt / nt - xc / nc) / (xc / nc))


def test_welch_independent_r_ttest_reference():
    case = REFERENCES["welch_r"]
    result = compare_welch(case["control"], case["treatment"])
    assert result.status == "available"
    assert result.control.n == result.treatment.n == 3
    assert result.control.value == 2
    assert result.treatment.value == pytest.approx(2.733333333333333)
    assert result.statistic == pytest.approx(case["statistic"], abs=1e-13)
    assert result.p_value == pytest.approx(case["p_value"], abs=1e-13)


def test_welch_confidence_interval_independent_r_reference():
    case = REFERENCES["welch_ci_r"]
    result = compare_welch(case["control"], case["treatment"], case["alpha"])
    # Published reference is rounded to 7-9 decimal digits.
    assert result.statistic == pytest.approx(case["statistic"], abs=1e-7)
    assert result.p_value == pytest.approx(case["p_value"], abs=1e-7)
    assert result.degrees_of_freedom == pytest.approx(case["degrees_of_freedom"], abs=1e-6)
    assert result.confidence_interval.level == 0.9
    assert result.confidence_interval.lower == pytest.approx(case["ci"][0], abs=1e-8)
    assert result.confidence_interval.upper == pytest.approx(case["ci"][1], abs=1e-8)


@pytest.mark.parametrize(
    "method,control,treatment",
    [
        (compare_welch, [1, 2, 4], [2, 4, 7, 8]),
        (compare_proportions, [1] * 10 + [0] * 30, [1] * 20 + [0] * 20),
    ],
)
def test_swapping_groups_reverses_effect_and_interval_but_not_p(method, control, treatment):
    a = method(control, treatment)
    b = method(treatment, control)
    assert a.absolute_effect == pytest.approx(-b.absolute_effect)
    assert a.statistic == pytest.approx(-b.statistic)
    assert a.p_value == pytest.approx(b.p_value)
    assert a.confidence_interval.lower == pytest.approx(-b.confidence_interval.upper)
    assert a.confidence_interval.upper == pytest.approx(-b.confidence_interval.lower)


@pytest.mark.parametrize("method", [compare_welch, compare_proportions])
@pytest.mark.parametrize("control,treatment", [([], []), ([0], [0, 1]), ([0, 1], [])])
def test_insufficient_sample_preserves_descriptive_results(method, control, treatment):
    result = method(control, treatment)
    assert result.status == "unavailable"
    assert result.p_value is None
    assert result.confidence_interval is None
    assert result.control.n == len(control)
    assert result.treatment.n == len(treatment)
    assert any(issue.code == "insufficient_sample" for issue in result.issues)


@pytest.mark.parametrize("method", [compare_welch, compare_proportions])
@pytest.mark.parametrize("treatment", [[0] * 10, [1] * 10])
def test_two_constant_groups_do_not_report_false_certainty(method, treatment):
    result = method([0] * 10, treatment)
    assert result.status == "unavailable"
    assert result.p_value is result.confidence_interval is None
    assert result.relative_effect is None
    assert any(issue.code == "zero_variance" for issue in result.issues)
    json.dumps(asdict(result), allow_nan=False)


def test_welch_one_constant_zero_control_is_defined_but_relative_effect_is_not():
    result = compare_welch([0, 0, 0], [1, 2, 3])
    assert result.status == "available"
    assert result.control.value == 0
    assert result.absolute_effect == 2
    assert result.relative_effect is None
    assert result.p_value is not None
    assert result.degrees_of_freedom == pytest.approx(2)
    assert {i.code for i in result.issues} >= {"zero_control_metric", "one_constant_group"}


def test_sparse_binary_events_do_not_use_normal_approximation():
    result = compare_proportions([1] + [0] * 99, [1] * 20 + [0] * 80)
    assert result.status == "unavailable"
    assert result.absolute_effect == pytest.approx(0.19)
    assert result.p_value is result.confidence_interval is None
    assert any(issue.code == "insufficient_binary_events" for issue in result.issues)


@pytest.mark.parametrize("method", [compare_welch, compare_proportions])
@pytest.mark.parametrize("bad", [float("nan"), float("inf"), None])
def test_missing_or_nonfinite_input_is_not_silently_omitted(method, bad):
    with pytest.raises(ValueError):
        method([0, 1, bad], [0, 1, 0])


@pytest.mark.parametrize("alpha", [0, 1, 0.5, float("nan"), 1e-300])
def test_invalid_or_unrepresentable_alpha(alpha):
    with pytest.raises(ValueError):
        compare_welch([1, 2, 3], [2, 3, 4], alpha)


def test_binary_type_and_numerical_scale_handling():
    with pytest.raises(ValueError):
        compare_proportions([0, 0.5, 1], [0, 1, 0])
    a = compare_welch([1, 2, 3], [2, 3, 5])
    b = compare_welch([1e120, 2e120, 3e120], [2e120, 3e120, 5e120])
    assert b.p_value == pytest.approx(a.p_value)
    assert b.absolute_effect / 1e120 == pytest.approx(a.absolute_effect)
    assert b.confidence_interval.lower / 1e120 == pytest.approx(a.confidence_interval.lower)
    overflow = compare_welch([-1e308] * 3, [1e308] * 3)
    assert overflow.status == "unavailable"
    json.dumps(asdict(overflow), allow_nan=False)


def test_no_automatic_decision_fields():
    result = asdict(compare_welch([1, 2, 3], [100, 101, 102]))
    assert not {"winner", "significant", "recommendation", "reject_null"} & result.keys()


@pytest.mark.parametrize(
    "method,control,treatment",
    [
        (compare_proportions, [1] * 1000 + [0] * 9000, [1] * 9000 + [0] * 1000),
        (compare_welch, [1.0, 2.0, 3.0] * 100, [101.0, 102.0, 103.0] * 100),
    ],
)
def test_tail_underflow_is_labelled_instead_of_claiming_exact_zero(method, control, treatment):
    result = method(control, treatment)
    assert result.status == "available"
    assert result.p_value == 0
    assert any(issue.code == "p_value_underflow" for issue in result.issues)
    json.dumps(asdict(result), allow_nan=False)


def test_welch_handles_unrepresentable_raw_variance_without_nonfinite_json():
    result = compare_welch([1e200, 2e200, 3e200], [2e200, 3e200, 4e200])
    assert result.status == "available"
    assert result.control.variance is None
    assert any(issue.code == "variance_overflow" for issue in result.issues)
    json.dumps(asdict(result), allow_nan=False)
