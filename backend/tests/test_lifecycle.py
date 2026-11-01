import pytest
from test_experiments import PAYLOAD

PLAN = {
    **PAYLOAD,
    "expected_effect": 0.1,
    "baseline_conversion": 0.1,
    "power": 0.8,
    "randomization_unit": "user",
    "planned_start": "2026-11-01",
    "planned_end": "2026-11-15",
}


def create(client, **updates):
    response = client.post("/api/v1/experiments", json={**PLAN, **updates})
    assert response.status_code == 201, response.text
    return response.json()


def config(item):
    return {
        key: item[key] for key in [*PLAN, "control_name", "treatment_name", "allocation", "alpha"]
    }


def transition(client, item, status):
    return client.post(
        f"/api/v1/experiments/{item['id']}/transition",
        json={
            "version": item["version"],
            "status": status,
        },
    )


def test_edit_recomputes_sample_and_lifecycle_locks_all_configuration(client):
    item = create(client)
    assert item["planned_sample_size"] == 14751
    assert "start" in item["available_actions"]
    path = f"/api/v1/experiments/{item['id']}"
    response = client.put(
        path, json={**config(item), "version": item["version"], "expected_effect": 0.2}
    )
    assert response.status_code == 200, response.text
    item = response.json()
    assert item["version"] == 2
    assert item["planned_sample_size"] < 14751
    response = transition(client, item, "running")
    assert response.status_code == 200, response.text
    running = response.json()
    assert running["started_at"].endswith("Z")
    assert running["locked_plan"]["expected_effect"] == 0.2
    assert running["locked_plan"]["planned_sample_size"] == item["planned_sample_size"]
    assert running["available_actions"] == ["complete"]
    assert (
        client.put(
            path, json={**config(running), "version": running["version"], "alpha": 0.01}
        ).status_code
        == 409
    )
    assert (
        client.post(f"{path}/sample-size", json={"version": running["version"]}).status_code == 409
    )
    assert transition(client, running, "draft").status_code == 409
    completed = transition(client, running, "completed").json()
    assert completed["status"] == "completed"
    assert completed["completed_at"].endswith("Z")
    assert completed["locked_plan"] == running["locked_plan"]
    assert transition(client, completed, "running").status_code == 409
    assert transition(client, completed, "completed").status_code == 409
    assert client.get(path).json()["alpha"] == running["alpha"]


def test_cannot_skip_repeat_or_start_incomplete_plan(client):
    item = client.post("/api/v1/experiments", json=PAYLOAD).json()
    assert transition(client, item, "completed").status_code == 409
    assert transition(client, item, "draft").status_code == 409
    response = transition(client, item, "running")
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "incomplete_plan"
    assert client.get(f"/api/v1/experiments/{item['id']}").json()["status"] == "draft"


@pytest.mark.parametrize(
    "updates",
    [
        {"allocation": 0.3},
        {"primary_metric": "revenue_per_user", "baseline_conversion": None},
        {"randomization_unit": "account"},
        {"randomization_unit": "device"},
    ],
)
def test_incompatible_plans_are_drafts_but_cannot_calculate_or_start(client, updates):
    item = create(client, **updates)
    assert item["planned_sample_size"] is None
    assert item["planning_issues"]
    assert transition(client, item, "running").status_code == 422
    response = client.post(
        f"/api/v1/experiments/{item['id']}/sample-size", json={"version": item["version"]}
    )
    assert response.status_code == 422


def test_stale_edit_or_transition_does_not_overwrite_another_save(client):
    item = create(client)
    path = f"/api/v1/experiments/{item['id']}"
    updated = client.put(
        path, json={**config(item), "version": item["version"], "name": "Обновлённый план"}
    ).json()
    stale = client.put(path, json={**config(item), "version": item["version"]})
    assert stale.status_code == 409
    assert stale.json()["error"]["code"] == "stale_version"
    assert transition(client, item, "running").status_code == 409
    assert client.get(path).json()["name"] == updated["name"]


@pytest.mark.parametrize(
    "updates",
    [
        {"planned_end": "2026-10-01"},
        {"planned_end": "2026-11-01"},
        {"expected_effect": 0},
        {"power": 1},
        {"randomization_unit": "session"},
        {"baseline_conversion": 0.95, "expected_effect": 0.1},
    ],
)
def test_invalid_configuration_rejected(client, updates):
    assert client.post("/api/v1/experiments", json={**PLAN, **updates}).status_code == 422


def test_calculation_is_saved_in_experiment_and_increments_version(client):
    item = create(client)
    response = client.post(
        f"/api/v1/experiments/{item['id']}/sample-size", json={"version": item["version"]}
    )
    assert response.status_code == 200
    updated = response.json()
    assert updated["planned_sample_size"] == 14751
    assert updated["version"] > item["version"]


def test_database_version_counter_prevents_concurrent_plan_changes(tmp_path):
    from sqlalchemy.orm import Session
    from sqlalchemy.orm.exc import StaleDataError

    from experimentlab.db.base import Base
    from experimentlab.db.session import build_engine
    from experimentlab.modules.experiments.models import Experiment
    from experimentlab.modules.experiments.schemas import ExperimentCreate

    engine = build_engine(f"sqlite:///{tmp_path / 'concurrency.db'}")
    Base.metadata.create_all(engine)
    try:
        with Session(engine) as first, Session(engine) as second:
            item = Experiment(
                **ExperimentCreate.model_validate(PLAN).model_dump(), status="draft", is_demo=False
            )
            first.add(item)
            first.commit()
            stale = second.get(Experiment, item.id)
            assert stale.status == "draft"
            item.status = "running"
            first.commit()
            stale.alpha = 0.01
            with pytest.raises(StaleDataError):
                second.commit()
    finally:
        engine.dispose()
