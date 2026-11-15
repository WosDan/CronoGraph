"""Mathematical unit tests for weights, incidence matrix B, A = B^T B, penalties, and objective F."""

from __future__ import annotations

import networkx as nx
import numpy as np
import pytest

from app.services.academic_weights import compute_academic_weight
from app.services.calendar_evaluator import build_conflict_graph_response, get_initial_assignment
from app.services.conflict_calculator import (
    compute_dynamic_edge_weight,
    compute_fixed_edge_weight,
    compute_objective_function,
    temporal_penalty,
)
from app.services.graph_builder import build_compiled_model
from helpers import make_small_dataset


def test_academic_weight_formula_exact():
    # W_i = C_i * p_i * (1 + r_i / 2)
    w1 = compute_academic_weight(credits=4, evaluation_percentage=0.30, withdrawal_rate=0.20)
    assert w1 == pytest.approx(4 * 0.30 * (1 + 0.20 / 2), abs=1e-12)
    assert w1 == pytest.approx(1.32, abs=1e-12)

    w2 = compute_academic_weight(credits=3, evaluation_percentage=0.25, withdrawal_rate=0.10)
    assert w2 == pytest.approx(3 * 0.25 * 1.05, abs=1e-12)


def test_temporal_penalty_exact():
    assert temporal_penalty(0) == 4
    assert temporal_penalty(1) == 3
    assert temporal_penalty(2) == 2
    assert temporal_penalty(3) == 1
    assert temporal_penalty(4) == 0
    assert temporal_penalty(10) == 0


def test_incidence_and_co_enrollment_matrices():
    dataset = make_small_dataset()
    model = build_compiled_model(dataset)

    expected_b = np.array(
        [
            [1, 1, 1],  # ST1
            [1, 1, 1],  # ST2
            [1, 1, 0],  # ST3
            [0, 1, 1],  # ST4
        ],
        dtype=np.int64,
    )
    np.testing.assert_array_equal(model.incidence_matrix_b, expected_b)

    expected_a = expected_b.T @ expected_b
    np.testing.assert_array_equal(model.co_enrollment_matrix_a, expected_a)
    # Shared students: (E1, E2)=3, (E1, E3)=2, (E2, E3)=3
    assert int(model.co_enrollment_matrix_a[0, 1]) == 3
    assert int(model.co_enrollment_matrix_a[0, 2]) == 2
    assert int(model.co_enrollment_matrix_a[1, 2]) == 3


def test_fixed_dynamic_weights_and_objective_no_duplicate_pairs():
    dataset = make_small_dataset()
    model = build_compiled_model(dataset)
    init_assign = get_initial_assignment(model)

    w1 = 4 * 0.30 * (1 + 0.20 / 2)  # 1.32
    w2 = 3 * 0.25 * (1 + 0.10 / 2)  # 0.7875
    w3 = 2 * 0.20 * (1 + 0.00 / 2)  # 0.40

    h12 = compute_fixed_edge_weight(3, w1, w2)
    h13 = compute_fixed_edge_weight(2, w1, w3)
    h23 = compute_fixed_edge_weight(3, w2, w3)

    # Initial dates: E1=Nov 16, E2=Nov 16 (delta=0, P=4), E3=Nov 17 (delta_13=1, P=3; delta_23=1, P=3)
    expected_f = (
        compute_dynamic_edge_weight(h12, 0)
        + compute_dynamic_edge_weight(h13, 1)
        + compute_dynamic_edge_weight(h23, 1)
    )
    computed_f = compute_objective_function(model, init_assign)
    assert computed_f == pytest.approx(expected_f, abs=1e-9)

    # Verify zero-penalty edges remain present in conflict graph when separated by >=4 days
    spread_assign = {"E1": "E1-S1", "E2": "E2-S2", "E3": "E3-S2"}  # Nov 16, Nov 21 (delta=5), Nov 28 (delta=7, 12)
    graph = build_conflict_graph_response(model, spread_assign, schedule_mode="optimized")
    assert graph.total_conflict_edges == 3
    assert graph.zero_penalty_edges == 3
    assert graph.total_objective_f == 0.0


def test_conflict_graph_centrality_metrics():
    dataset = make_small_dataset()
    model = build_compiled_model(dataset)
    init_assign = get_initial_assignment(model)
    graph_resp = build_conflict_graph_response(model, init_assign, schedule_mode="initial")

    expected_bw = nx.betweenness_centrality(model.conflict_graph, weight="h_ij", normalized=True)
    expected_cl = nx.closeness_centrality(model.conflict_graph)

    deg_vals = [node.degree_centrality for node in graph_resp.nodes]
    assert max(deg_vals) == pytest.approx(1.0, abs=1e-4)

    for node in graph_resp.nodes:
        assert 0.0 <= node.degree_centrality <= 1.0
        assert 0.0 <= node.betweenness_centrality <= 1.0
        assert 0.0 <= node.closeness_centrality <= 1.0
        assert node.betweenness_centrality == pytest.approx(expected_bw[node.id], abs=1e-4)
        assert node.closeness_centrality == pytest.approx(expected_cl[node.id], abs=1e-4)
