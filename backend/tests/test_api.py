"""Integration tests for CronoGraph FastAPI endpoints."""

from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_and_dataset_endpoints():
    health = client.get("/api/health")
    assert health.status_code == 200
    body = health.json()
    assert body["status"] == "ok"
    assert body["num_students"] == 120
    assert body["num_exams"] == 20

    ds = client.get("/api/dataset")
    assert ds.status_code == 200
    ds_json = ds.json()
    assert len(ds_json["students"]) == 120
    assert len(ds_json["subjects"]) == 15
    assert len(ds_json["exams"]) == 20


def test_graphs_and_optimization_pipeline():
    bip = client.get("/api/graphs/bipartite")
    assert bip.status_code == 200
    assert bip.json()["stats"]["student_nodes"] == 120
    assert bip.json()["stats"]["exam_nodes"] == 20

    conf_init = client.get("/api/graphs/conflicts?mode=initial")
    assert conf_init.status_code == 200
    init_data = conf_init.json()
    assert init_data["total_conflict_edges"] > 0

    opt_resp = client.post(
        "/api/optimization/run",
        json={"algorithm": "both", "restarts": 8, "seed": 42, "ortools_time_limit_seconds": 5.0},
    )
    assert opt_resp.status_code == 200
    opt_json = opt_resp.json()
    assert opt_json["primary_solver"]["is_feasible"] is True
    assert opt_json["comparison_solver"]["is_feasible"] is True
    assert opt_json["optimized_evaluation"]["total_objective_f"] <= opt_json["initial_evaluation"]["total_objective_f"]
    assert opt_json["incremental_verification_max_error"] < 1e-8

    run_id = opt_json["run_id"]
    fetched = client.get(f"/api/optimization/results/{run_id}")
    assert fetched.status_code == 200
    assert fetched.json()["run_id"] == run_id

    conf_opt = client.get(f"/api/graphs/conflicts?mode=optimized&run_id={run_id}")
    assert conf_opt.status_code == 200
    assert conf_opt.json()["total_conflict_edges"] == init_data["total_conflict_edges"]


def test_dataset_validation_rejects_bad_payload():
    resp = client.post("/api/dataset/validate", json={"bad": "payload"})
    assert resp.status_code == 200
    assert resp.json()["valid"] is False
    assert len(resp.json()["issues"]) > 0
