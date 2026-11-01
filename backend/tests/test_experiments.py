PAYLOAD = {
    "name": "Новая регистрация",
    "hypothesis": "Короткая форма регистрации увеличит конверсию новых пользователей.",
    "primary_metric": "conversion_rate",
}


def test_create_read_list_and_summary(client):
    response = client.post("/api/v1/experiments", json=PAYLOAD)
    assert response.status_code == 201
    experiment = response.json()
    assert experiment["status"] == "draft"
    assert experiment["is_demo"] is False
    assert experiment["created_at"].endswith("Z")
    assert client.get(f"/api/v1/experiments/{experiment['id']}").json() == experiment
    page = client.get("/api/v1/experiments?status=draft&q=регистрац").json()
    assert page["total"] == 1
    assert page["items"][0]["id"] == experiment["id"]
    assert client.get("/api/v1/experiments/summary").json() == {
        "total": 1,
        "draft": 1,
        "running": 0,
        "completed": 0,
    }


def test_invalid_group_configuration_cannot_be_persisted(client):
    response = client.post(
        "/api/v1/experiments",
        json={
            **PAYLOAD,
            "control_name": "Group",
            "treatment_name": " group ",
        },
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"
    assert client.get("/api/v1/experiments").json()["total"] == 0


def test_rejects_unknown_metrics_and_client_controlled_status(client):
    for extra in ({"primary_metric": "unknown"}, {"status": "running"}, {"is_demo": True}):
        assert client.post("/api/v1/experiments", json={**PAYLOAD, **extra}).status_code == 422


def test_search_wildcards_are_literals_and_pagination_is_validated(client):
    client.post("/api/v1/experiments", json=PAYLOAD)
    assert client.get("/api/v1/experiments?q=%25").json()["total"] == 0
    assert client.get("/api/v1/experiments?offset=1").json()["items"] == []
    assert client.get("/api/v1/experiments?limit=101").status_code == 422
    assert client.get("/api/v1/experiments?offset=-1").status_code == 422


def test_missing_and_malformed_experiments_have_explicit_errors(client):
    response = client.get("/api/v1/experiments/00000000-0000-4000-8000-000000000099")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "not_found"
    assert client.get("/api/v1/experiments/not-a-uuid").status_code == 422


def test_sample_size_boundary(client):
    response = client.post(
        "/api/v1/analysis/sample-size",
        json={
            "baseline": 0.1,
            "relative_mde": 0.1,
        },
    )
    assert response.status_code == 200
    result = response.json()
    assert 14700 < result["per_group"] < 14800
    assert result["total"] == 2 * result["per_group"]
    assert result["assumptions"]
    invalid = client.post(
        "/api/v1/analysis/sample-size",
        json={
            "baseline": 0.9,
            "relative_mde": 0.5,
        },
    )
    assert invalid.status_code == 422
    assert invalid.json()["error"]["code"] == "invalid_parameters"
