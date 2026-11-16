"""Optimization tests: incremental vs full cost, determinism, exhaustive brute-force vs OR-Tools/LS, infeasibility."""

from __future__ import annotations

import itertools

import pytest

from app.optimization.ortools_solver import solve_with_ortools
from app.optimization.random_restarts import solve_with_random_restarts
from app.services.conflict_calculator import compute_objective_function
from app.services.constraints import evaluate_feasibility
from app.services.dataset_service import load_dataset_from_path
from app.core.config import settings
from app.services.graph_builder import build_compiled_model
from helpers import make_small_dataset


def test_exhaustive_optimum_matches_ortools_and_local_search():
    dataset = make_small_dataset()
    model = build_compiled_model(dataset)

    # Brute-force enumeration over all 2*2*2 = 8 combinations
    best_bf_cost = float("inf")
    for s1, s2, s3 in itertools.product(["E1-S1", "E1-S2"], ["E2-S1", "E2-S2"], ["E3-S1", "E3-S2"]):
        cand = {"E1": s1, "E2": s2, "E3": s3}
        if evaluate_feasibility(model, cand).is_feasible:
            cost = compute_objective_function(model, cand)
            if cost < best_bf_cost:
                best_bf_cost = cost

    ortools_res = solve_with_ortools(model, time_limit_seconds=5.0)
    ls_res = solve_with_random_restarts(model, restarts=10, seed=42)

    assert ortools_res.is_feasible is True
    assert ortools_res.optimality_proven is True
    assert ortools_res.final_cost == pytest.approx(best_bf_cost, abs=1e-6)

    assert ls_res.summary.is_feasible is True
    assert ls_res.summary.final_cost == pytest.approx(best_bf_cost, abs=1e-6)
    assert ls_res.max_incremental_error < 1e-9


def test_ortools_accepts_local_search_calendar_as_hint():
    model = build_compiled_model(make_small_dataset())
    local = solve_with_random_restarts(model, restarts=2, seed=42).summary
    result = solve_with_ortools(model, time_limit_seconds=5.0, starting_assignment=local.assignment)
    assert result.is_feasible
    assert result.optimality_proven
    assert result.final_cost <= local.final_cost


def test_infeasible_problem_handled_cleanly():
    dataset = make_small_dataset(infeasible=True)
    model = build_compiled_model(dataset)

    ortools_res = solve_with_ortools(model, time_limit_seconds=5.0)
    ls_res = solve_with_random_restarts(model, restarts=5, seed=42)

    assert ortools_res.is_feasible is False
    assert ortools_res.status == "INFEASIBLE"
    assert ls_res.summary.is_feasible is False
    assert ls_res.summary.status == "INFEASIBLE"


def test_full_dataset_reproducibility_incremental_accuracy_and_improvement():
    dataset = load_dataset_from_path(settings.default_dataset_path)
    model = build_compiled_model(dataset)

    run_a = solve_with_random_restarts(model, restarts=10, seed=42)
    run_b = solve_with_random_restarts(model, restarts=10, seed=42)

    assert run_a.summary.is_feasible is True
    assert run_a.summary.final_cost <= run_a.summary.initial_cost
    assert run_a.summary.final_cost < run_a.summary.initial_cost  # real optimization occurs
    assert run_a.max_incremental_error < 1e-9

    # Deterministic reproducibility with identical seed
    assert run_a.summary.final_cost == run_b.summary.final_cost
    assert run_a.summary.assignment == run_b.summary.assignment
    assert evaluate_feasibility(model, run_a.summary.assignment).is_feasible is True

    # OR-Tools exact/feasible comparison on full dataset
    cp_res = solve_with_ortools(model, time_limit_seconds=10.0)
    assert cp_res.is_feasible is True
    assert cp_res.final_cost <= cp_res.initial_cost
    assert evaluate_feasibility(model, cp_res.assignment).is_feasible is True
