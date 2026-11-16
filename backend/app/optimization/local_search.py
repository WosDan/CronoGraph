"""Local search with exact incremental objective evaluation Delta F_i(t)."""

from __future__ import annotations

import random
from dataclasses import dataclass
from typing import Dict, List, Tuple

from app.models.domain import CompiledAcademicModel
from app.schemas.schemas import ConvergencePoint
from app.services.conflict_calculator import (
    calendar_days_between,
    compute_objective_function,
    temporal_penalty,
)
from app.services.constraints import can_assign_exam_slot, evaluate_feasibility


@dataclass
class LocalSearchOutcome:
    assignment: Dict[str, str]
    final_cost: float
    iterations: int
    trace: List[ConvergencePoint]
    max_incremental_error: float


def compute_incremental_delta(
    model: CompiledAcademicModel,
    assignment: Dict[str, str],
    exam_id: str,
    candidate_slot_id: str,
) -> float:
    """
    Compute exact incremental delta:
        Delta F_i(t) = sum_{j in N(i)} H_ij * [ P(|d(t) - d_j|) - P(|d_i - d_j|) ]
    """
    current_slot_id = assignment[exam_id]
    if candidate_slot_id == current_slot_id:
        return 0.0

    current_date = model.slot_dates[exam_id][current_slot_id]
    candidate_date = model.slot_dates[exam_id][candidate_slot_id]

    delta_f = 0.0
    for nbr_id in model.neighbors[exam_id]:
        pair = (exam_id, nbr_id) if (exam_id, nbr_id) in model.fixed_weights_h else (nbr_id, exam_id)
        h_ij = model.fixed_weights_h[pair]
        nbr_date = model.slot_dates[nbr_id][assignment[nbr_id]]
        p_new = temporal_penalty(calendar_days_between(candidate_date, nbr_date))
        p_old = temporal_penalty(calendar_days_between(current_date, nbr_date))
        delta_f += h_ij * (p_new - p_old)

    return delta_f


def run_local_search(
    model: CompiledAcademicModel,
    start_assignment: Dict[str, str],
    rng: random.Random,
    restart_idx: int = 0,
    global_best_so_far: float = float("inf"),
    step_offset: int = 0,
    verify_incremental: bool = True,
) -> LocalSearchOutcome:
    """
    Execute best-improvement local search from a feasible starting assignment
    until a local optimum is reached.
    """
    current = dict(start_assignment)
    if not evaluate_feasibility(model, current).is_feasible:
        raise ValueError("La búsqueda local requiere una solución inicial factible.")

    current_cost = compute_objective_function(model, current)
    best_seen = min(global_best_so_far, current_cost)
    iterations = 0
    max_err = 0.0
    trace: List[ConvergencePoint] = [
        ConvergencePoint(
            step=step_offset,
            restart=restart_idx,
            iteration=0,
            current_cost=round(current_cost, 4),
            best_cost=round(best_seen, 4),
            event=f"Inicio reinicio #{restart_idx}",
        )
    ]

    exam_ids = list(model.exam_ids)

    while True:
        best_move: Tuple[str, str, float] | None = None
        rng.shuffle(exam_ids)

        for eid in exam_ids:
            cur_slot = current[eid]
            candidate_slots = list(model.slots_by_exam[eid].keys())
            rng.shuffle(candidate_slots)

            for cand_slot in candidate_slots:
                if cand_slot == cur_slot:
                    continue
                if not can_assign_exam_slot(model, current, eid, cand_slot):
                    continue

                delta_f = compute_incremental_delta(model, current, eid, cand_slot)
                if delta_f < -1e-9:
                    # Preserve best improvement; centralities only break numerical ties.
                    priority = (model.degree_centrality[eid], model.betweenness_centrality[eid])
                    best_priority = ((model.degree_centrality[best_move[0]], model.betweenness_centrality[best_move[0]])
                                     if best_move else (-1.0, -1.0))
                    if (best_move is None or delta_f < best_move[2] - 1e-12 or
                            (abs(delta_f - best_move[2]) <= 1e-12 and priority > best_priority)):
                        best_move = (eid, cand_slot, delta_f)

        if best_move is None:
            break

        move_eid, move_slot, move_delta = best_move
        prev_cost = current_cost
        current[move_eid] = move_slot
        current_cost = prev_cost + move_delta

        if verify_incremental:
            exact_cost = compute_objective_function(model, current)
            err = abs(exact_cost - current_cost)
            if err > max_err:
                max_err = err
            current_cost = exact_cost

        iterations += 1
        if current_cost < best_seen:
            best_seen = current_cost

        trace.append(
            ConvergencePoint(
                step=step_offset + iterations,
                restart=restart_idx,
                iteration=iterations,
                current_cost=round(current_cost, 4),
                best_cost=round(best_seen, 4),
                event=f"Reinicio #{restart_idx}: {move_eid} → {move_slot} (ΔF={move_delta:.2f})",
            )
        )

    return LocalSearchOutcome(
        assignment=current,
        final_cost=current_cost,
        iterations=iterations,
        trace=trace,
        max_incremental_error=max_err,
    )
