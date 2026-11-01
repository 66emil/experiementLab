import pytest

from experimentlab_statistics import Observation, inspect_observations, sample_ratio_mismatch


def observations(nc, nt):
    return [Observation(f"c{i}", "control", i % 2) for i in range(nc)] + [
        Observation(f"t{i}", "treatment", i % 2) for i in range(nt)
    ]


def test_srm_reference_chi_square_df1():
    # df=1: P(chi²>=4)=2*P(Z>=2); P(chi²>=25)=2*P(Z>=5).
    normal = sample_ratio_mismatch(60, 40, 0.5)
    assert normal.statistic == 4
    assert normal.p_value == pytest.approx(0.04550026389635842, abs=1e-14)
    assert normal.mismatch is False  # SRM uses .001, independent from metric alpha.
    unequal = sample_ratio_mismatch(60, 40, 0.2)
    assert unequal.expected_control == 80
    assert unequal.expected_treatment == 20
    assert unequal.statistic == 25
    assert unequal.p_value == pytest.approx(5.733031437583866e-7, rel=1e-12)
    assert unequal.mismatch is True


def test_srm_uses_planned_ratio_and_checks_expected_counts():
    assert sample_ratio_mismatch(80, 20, 0.2).p_value == 1
    assert sample_ratio_mismatch(80, 20, 0.5).mismatch is True
    for nc, nt, probability in [(1, 1, 0.5), (100, 0, 0.01), (0, 0, 0.5)]:
        result = sample_ratio_mismatch(nc, nt, probability)
        assert result.status == "unavailable"
        assert result.p_value is result.mismatch is None
    assert sample_ratio_mismatch(5, 5, 0.5).status == "available"


@pytest.mark.parametrize(
    "nc,nt,p", [(-1, 10, 0.5), (1.5, 10, 0.5), (True, 10, 0.5), (10, 10, 0), (10, 10, 1)]
)
def test_invalid_srm_inputs(nc, nt, p):
    with pytest.raises(ValueError):
        sample_ratio_mismatch(nc, nt, p)


def test_clean_structure_does_not_claim_overall_good_quality():
    report = inspect_observations(observations(50, 50), "binary", 0.5)
    assert report.status == "checks_passed"
    assert report.srm.p_value == 1
    assert report.duplicate_users == report.overlapping_users == 0
    assert report.limitations
    assert any("не подтверждает" in item for item in report.limitations)


def test_missing_duplicates_and_overlap_are_separate_blockers():
    rows = [
        Observation("same", "control", 1),
        Observation("same", "treatment", 0),
        Observation(None, "control", None),
        Observation("u2", None, 1),
        Observation("u3", "bad", float("nan")),
    ]
    report = inspect_observations(rows, "binary", 0.5)
    assert report.status == "blocked"
    assert report.missing_counts == {"user_id": 1, "variant": 1, "metric_value": 1}
    assert report.duplicate_users == report.duplicate_rows == report.overlapping_users == 1
    assert report.invalid_variants == report.invalid_metric_values == 1
    assert report.srm is None
    codes = {i.code for i in report.issues if i.severity == "blocking"}
    assert codes >= {
        "missing_user_id",
        "missing_variant",
        "missing_metric_value",
        "duplicate_users",
        "group_overlap",
    }


def test_missing_outcomes_are_included_in_srm_assignment_counts():
    rows = observations(50, 50)
    rows[:20] = [Observation(f"c{i}", "control", None) for i in range(20)]
    report = inspect_observations(rows, "binary", 0.5)
    assert report.status == "blocked"
    assert report.srm.control_count == report.srm.treatment_count == 50
    assert report.srm.p_value == 1
    assert report.missing_counts["metric_value"] == 20


def test_srm_detection_blocks_inference_and_small_srm_is_warning():
    report = inspect_observations(observations(90, 10), "binary", 0.5)
    assert report.status == "blocked"
    assert any(i.code == "srm_detected" and i.severity == "blocking" for i in report.issues)
    tiny = inspect_observations(observations(2, 2), "binary", 0.5)
    assert tiny.status == "warnings"
    assert any(i.code == "srm_insufficient_sample" for i in tiny.issues)


def test_continuous_values_are_checked_without_requiring_binary_encoding():
    valid = [Observation("c", "control", 1.5), Observation("t", "treatment", 2.75)]
    assert inspect_observations(valid, "continuous", 0.5).invalid_metric_values == 0
    assert inspect_observations(valid, "binary", 0.5).invalid_metric_values == 2
    negative = [Observation("c", "control", -1), Observation("t", "treatment", 2)]
    assert (
        inspect_observations(negative, "continuous", 0.5, non_negative=True).invalid_metric_values
        == 1
    )
