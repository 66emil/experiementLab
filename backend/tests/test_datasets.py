import hashlib

import pytest
from test_lifecycle import config, create, transition

VALID = b"user_id,variant,metric_value\nu1,control,0\nu2,treatment,1\n"


def upload(client, item, content=VALID, filename="users.csv"):
    return client.post(
        f"/api/v1/experiments/{item['id']}/datasets",
        params={
            "version": item["version"],
            "filename": filename,
        },
        content=content,
        headers={"Content-Type": "text/csv"},
    )


def test_version_metadata_original_download_and_immutability(client, settings):
    item = create(client)
    path = f"/api/v1/experiments/{item['id']}"
    response = upload(client, item)
    assert response.status_code == 201, response.text
    first = response.json()
    assert first["version"] == 1
    assert first["row_count"] == 2
    assert first["control_count"] == first["treatment_count"] == 1
    assert first["sha256"] == hashlib.sha256(VALID).hexdigest()
    assert first["byte_size"] == len(VALID)
    assert first["config_snapshot"]["expected_effect"] == item["expected_effect"]
    assert "storage_key" not in first
    current = client.get(path).json()
    second_content = VALID + b"u3,treatment,0\n"
    second = upload(client, current, second_content).json()
    assert second["version"] == 2
    assert first["id"] != second["id"]
    assert client.get(f"{path}/datasets/{first['id']}").json() == first
    assert client.get(f"{path}/datasets/{first['id']}/download").content == VALID
    assert client.get(f"{path}/datasets/{second['id']}/download").content == second_content
    listing = client.get(f"{path}/datasets?limit=1").json()
    assert listing["total"] == 2
    assert listing["items"][0]["id"] == second["id"]
    assert (
        client.put(f"{path}/datasets/{first['id']}", json={"filename": "x.csv"}).status_code == 405
    )
    assert client.delete(f"{path}/datasets/{first['id']}").status_code == 405
    assert len(list(settings.dataset_storage_path.iterdir())) == 2


def test_concrete_row_errors_and_atomic_rejection(client, settings):
    item = create(client)
    content = (
        b"user_id,variant,metric_value\nu1,control,0\nu1,treatment,1\n,wrong,NaN\nu3,control,0.2\n"
    )
    response = upload(client, item, content)
    assert response.status_code == 422
    issues = response.json()["error"]["details"]
    assert any(i["row"] == 3 and i["code"] == "duplicate_user" for i in issues)
    assert any(i["row"] == 4 and i["column"] == "user_id" for i in issues)
    assert any(i["row"] == 4 and i["code"] == "invalid_variant" for i in issues)
    assert any(i["row"] == 4 and i["code"] == "invalid_number" for i in issues)
    assert any(i["row"] == 5 and i["code"] == "binary_value" for i in issues)
    assert client.get(f"/api/v1/experiments/{item['id']}/datasets").json()["total"] == 0
    assert not settings.dataset_storage_path.exists()
    assert client.get(f"/api/v1/experiments/{item['id']}").json()["version"] == item["version"]


@pytest.mark.parametrize(
    "content",
    [
        b"",
        b"user_id,variant,metric_value\n",
        b"user_id,variant\nu1,control\n",
        b"user_id,variant,metric_value,extra\nu1,control,1,x\n",
        b"user_id,user_id,metric_value\nu1,control,1\n",
        b"user_id;variant;metric_value\nu1;control;1\n",
        b"user_id,variant,metric_value\nu1,Control,1\n",
        b"user_id,variant,metric_value\nu1,control,Infinity\n",
        b"user_id,variant,metric_value\nu1,control,1e99999999999999999999999999999\n",
        b"user_id,variant,metric_value\nu1,control,1e-9999\n",
        b"user_id,variant,metric_value\nu1,control,\n",
        b"user_id,variant,metric_value\nu1,control,1,extra\n",
        b'user_id,variant,metric_value\n"unclosed,control,1\n',
        b"user_id,variant,metric_value\n\xff,control,0\n",
    ],
)
def test_malformed_csv_is_rejected(client, content):
    assert upload(client, create(client), content).status_code == 422


def test_limits_count_actual_streamed_bytes_and_rows(client, settings):
    item = create(client)
    settings.max_csv_bytes = 40
    assert upload(client, item).status_code == 413
    settings.max_csv_bytes = 1024
    settings.max_csv_rows = 1
    response = upload(client, item)
    assert response.status_code == 422
    assert response.json()["error"]["details"][0]["code"] == "row_limit"
    assert not settings.dataset_storage_path.exists()


def test_error_report_is_bounded(client):
    content = b"user_id,variant,metric_value\n" + b",bad,NaN\n" * 150
    response = upload(client, create(client), content)
    assert response.status_code == 422
    assert len(response.json()["error"]["details"]) == 100
    assert "450" in response.json()["error"]["message"]


def test_bom_reordered_headers_and_partial_group_warning(client):
    content = "\ufeffvariant,metric_value,user_id\r\ncontrol,1, 001 \r\n".encode()
    response = upload(client, create(client), content)
    assert response.status_code == 201, response.text
    assert response.json()["warnings"]
    assert response.json()["row_count"] == 1


def test_user_schema_and_data_provenance(client):
    account = create(client, randomization_unit="account")
    assert upload(client, account).status_code == 422
    revenue = create(client, primary_metric="revenue_per_user", baseline_conversion=None)
    assert upload(client, revenue, VALID.replace(b",0\n", b",-1\n")).status_code == 422
    assert upload(client, revenue, VALID.replace(b",0\n", b",12.75\n")).status_code == 201
    current = client.get(f"/api/v1/experiments/{revenue['id']}").json()
    changed = client.put(
        f"/api/v1/experiments/{revenue['id']}",
        json={
            **config(current),
            "version": current["version"],
            "primary_metric": "conversion_rate",
        },
    )
    assert changed.status_code == 409
    assert changed.json()["error"]["code"] == "dataset_schema_locked"


def test_stale_upload_and_cross_experiment_access(client):
    item = create(client)
    first = upload(client, item).json()
    assert upload(client, item).status_code == 409
    other = create(client)
    assert (
        client.get(f"/api/v1/experiments/{other['id']}/datasets/{first['id']}").status_code == 404
    )
    assert (
        client.get(f"/api/v1/experiments/{other['id']}/datasets/{first['id']}/download").status_code
        == 404
    )


def test_dataset_corruption_detected(client, settings):
    item = create(client)
    dataset = upload(client, item).json()
    path = settings.dataset_storage_path / f"{dataset['id']}.csv"
    path.chmod(0o600)
    path.write_bytes(b"tampered")
    response = client.get(f"/api/v1/experiments/{item['id']}/datasets/{dataset['id']}/download")
    assert response.status_code == 503
    assert response.json()["error"]["code"] == "dataset_corrupted"


def test_upload_completed_experiment_preserves_locked_plan(client):
    item = create(client)
    running = transition(client, item, "running").json()
    completed = transition(client, running, "completed").json()
    assert upload(client, completed).status_code == 201
    after = client.get(f"/api/v1/experiments/{item['id']}").json()
    assert after["status"] == "completed"
    assert after["locked_plan"] == completed["locked_plan"]


def test_invalid_filename_media_type_and_example(client):
    item = create(client)
    assert upload(client, item, filename="../data.csv").status_code == 422
    response = client.post(
        f"/api/v1/experiments/{item['id']}/datasets?version=1&filename=users.csv", content=VALID
    )
    assert response.status_code == 415
    example = client.get("/api/v1/datasets/example")
    assert example.status_code == 200
    assert upload(client, item, example.content).status_code == 201


def test_database_failure_removes_new_file_and_rolls_back_metadata(client, settings, monkeypatch):
    from sqlalchemy.exc import SQLAlchemyError
    from sqlalchemy.orm import Session

    item = create(client)

    def fail_commit(_session):
        raise SQLAlchemyError("Simulated commit failure")

    monkeypatch.setattr(Session, "commit", fail_commit)
    assert upload(client, item).status_code == 503
    monkeypatch.undo()
    assert list(settings.dataset_storage_path.iterdir()) == []
    assert client.get(f"/api/v1/experiments/{item['id']}/datasets").json()["total"] == 0
