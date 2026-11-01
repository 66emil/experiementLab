import hashlib

import pytest
from test_datasets import VALID, upload
from test_lifecycle import config, create, transition

from experimentlab.db.session import get_session
from experimentlab.modules.datasets.models import DatasetVersion


def csv_groups(control, treatment):
    lines = ["user_id,variant,metric_value"]
    lines += [f"c{i},control,{value}" for i, value in enumerate(control)]
    lines += [f"t{i},treatment,{value}" for i, value in enumerate(treatment)]
    return ("\n".join(lines) + "\n").encode()


def endpoint(item, dataset, suffix):
    return f"/api/v1/experiments/{item['id']}/datasets/{dataset['id']}/{suffix}"


def test_binary_analysis_outputs_effects_ci_and_no_winner(client):
    item = create(client)
    content = csv_groups([1] * 10 + [0] * 90, [1] * 20 + [0] * 80)
    dataset = upload(client, item, content).json()
    response = client.get(endpoint(item, dataset, "analysis"))
    assert response.status_code == 200, response.text
    report = response.json()
    result = report["comparison"]
    assert report["analysis_status"] == "available"
    assert report["dataset"]["sha256"] == hashlib.sha256(content).hexdigest()
    assert result["method"] == "two_proportion_z"
    assert result["control"]["n"] == result["treatment"]["n"] == 100
    assert result["control"]["value"] == 0.1
    assert result["treatment"]["value"] == 0.2
    assert result["absolute_effect"] == pytest.approx(0.1)
    assert result["relative_effect"] == pytest.approx(1)
    assert result["p_value"] == pytest.approx(0.047670380656161394)
    assert result["confidence_interval"]["lower"] == pytest.approx(0.00014902511855761913)
    assert result["confidence_interval"]["level"] == 0.95
    assert result["assumptions"]
    assert not {"winner", "significant", "recommendation"} & result.keys()
    assert report["context"]["source"] == "draft_at_upload"
    assert any(i["code"] == "unlocked_plan" for i in report["report"]["issues"])
    assert client.get(endpoint(item, dataset, "analysis")).json() == report


def test_welch_for_continuous_uses_no_binary_encoding(client):
    item = create(client, primary_metric="revenue_per_user", baseline_conversion=None)
    dataset = upload(client, item, csv_groups([1, 2, 3], [1.1, 2.9, 4.2])).json()
    response = client.get(endpoint(item, dataset, "analysis"))
    assert response.status_code == 200, response.text
    result = response.json()["comparison"]
    assert result["method"] == "welch_t"
    assert result["status"] == "available"
    assert result["p_value"] == pytest.approx(0.53619490753126686)
    assert result["relative_effect"] == pytest.approx(0.3666666666666667)
    assert any(i["code"] == "small_sample_normality" for i in result["issues"])


def test_srm_blocks_analysis_and_uses_dataset_planned_ratio(client):
    item = create(client, allocation=0.2)
    dataset = upload(
        client, item, csv_groups([i % 2 for i in range(80)], [i % 2 for i in range(20)])
    ).json()
    health = client.get(endpoint(item, dataset, "health")).json()
    assert health["report"]["srm"]["p_value"] == 1
    assert health["report"]["srm"]["expected_treatment"] == 20
    assert health["report"]["srm"]["alpha"] == 0.001
    # Later changes to a draft do not silently reinterpret an immutable dataset.
    current = client.get(f"/api/v1/experiments/{item['id']}").json()
    update = client.put(
        f"/api/v1/experiments/{item['id']}",
        json={
            **config(current),
            "version": current["version"],
            "allocation": 0.5,
            "alpha": 0.01,
        },
    )
    assert update.status_code == 200
    assert client.get(endpoint(item, dataset, "health")).json() == health
    assert client.get(endpoint(item, dataset, "analysis")).json()["comparison"] is not None
    mismatched = upload(
        client, update.json(), csv_groups([i % 2 for i in range(80)], [i % 2 for i in range(20)])
    ).json()
    blocked = client.get(endpoint(item, mismatched, "analysis")).json()
    assert blocked["analysis_status"] == "blocked"
    assert blocked["comparison"] is None
    assert any(
        i["code"] == "srm_detected" and i["severity"] == "blocking"
        for i in blocked["report"]["issues"]
    )


def test_locked_plan_and_retention_maturity_are_visible(client):
    item = create(client, primary_metric="retention_d7")
    running = transition(client, item, "running").json()
    completed = transition(client, running, "completed").json()
    dataset = upload(client, completed, csv_groups([1] * 10 + [0] * 10, [1] * 12 + [0] * 8)).json()
    response = client.get(endpoint(item, dataset, "health")).json()
    assert response["context"]["source"] == "locked_at_upload"
    assert any(i["code"] == "retention_maturity_unverified" for i in response["report"]["issues"])
    after = client.get(f"/api/v1/experiments/{item['id']}").json()
    assert after["locked_plan"] == completed["locked_plan"]
    assert after["version"] == dataset["config_snapshot"]["experiment_version"] + 1


def test_rechecks_missing_duplicate_and_overlap_in_legacy_snapshot(client, settings):
    item = create(client)
    dataset = upload(client, item).json()
    # Simulate a pre-validator imported snapshot; public upload remains strict.
    content = (
        b"user_id,variant,metric_value\nu1,control,1\nu1,treatment,0\nu2,control,\nu3,treatment,1\n"
    )
    path = settings.dataset_storage_path / f"{dataset['id']}.csv"
    path.chmod(0o600)
    path.write_bytes(content)
    path.chmod(0o400)
    provider = client.app.dependency_overrides[get_session]()
    session = next(provider)
    try:
        stored = session.get(DatasetVersion, dataset["id"])
        stored.sha256 = hashlib.sha256(content).hexdigest()
        stored.byte_size = len(content)
        stored.row_count = 4
        stored.control_count = stored.treatment_count = 2
        session.commit()
    finally:
        provider.close()
    response = client.get(endpoint(item, dataset, "health"))
    assert response.status_code == 200, response.text
    report = response.json()["report"]
    assert report["missing_counts"]["metric_value"] == 1
    assert report["duplicate_users"] == report["overlapping_users"] == 1
    assert report["srm"] is None
    assert report["status"] == "blocked"
    analysis = client.get(endpoint(item, dataset, "analysis")).json()
    assert analysis["comparison"] is None


def test_zero_control_variance_and_small_samples_have_explicit_nulls(client):
    item = create(client, primary_metric="revenue_per_user", baseline_conversion=None)
    dataset = upload(client, item, csv_groups([0, 0, 0], [1, 2, 3])).json()
    result = client.get(endpoint(item, dataset, "analysis")).json()["comparison"]
    assert result["relative_effect"] is None
    assert result["status"] == "available"
    current = client.get(f"/api/v1/experiments/{item['id']}").json()
    constant = upload(client, current, csv_groups([0, 0, 0], [1, 1, 1])).json()
    result = client.get(endpoint(item, constant, "analysis")).json()["comparison"]
    assert result["p_value"] is result["confidence_interval"] is None
    assert result["status"] == "unavailable"


def test_insufficient_binary_sample_preserves_descriptives(client):
    item = create(client)
    dataset = upload(client, item, csv_groups([0, 1], [0, 1])).json()
    report = client.get(endpoint(item, dataset, "analysis")).json()
    assert report["analysis_status"] == "unavailable"
    assert report["comparison"]["control"]["n"] == 2
    assert report["comparison"]["p_value"] is None
    assert report["report"]["srm"]["status"] == "unavailable"
    assert report["report"]["limitations"]


def test_analysis_isolated_between_versions_and_experiments(client, settings):
    item = create(client)
    first = upload(client, item, VALID).json()
    before = client.get(endpoint(item, first, "analysis")).json()
    current = client.get(f"/api/v1/experiments/{item['id']}").json()
    second = upload(client, current, csv_groups([1] * 10 + [0] * 10, [1] * 12 + [0] * 8)).json()
    assert client.get(endpoint(item, first, "analysis")).json() == before
    assert client.get(endpoint(item, second, "analysis")).json()["analysis_status"] == "available"
    other = create(client)
    assert client.get(endpoint(other, first, "analysis")).status_code == 404
    path = settings.dataset_storage_path / f"{first['id']}.csv"
    path.chmod(0o600)
    path.write_bytes(b"tampered")
    assert client.get(endpoint(item, first, "health")).status_code == 503
    assert client.get(endpoint(item, first, "analysis")).status_code == 503
