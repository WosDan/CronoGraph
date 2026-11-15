"""Multi-start Random Restarts Local Search solver with initial feasibility fallback and strict monotonicity."""

from __future__ import annotations

import random
import time
from dataclasses import dataclass
from typing import Dict, List, Optional

from app.models.domain import CompiledAcademicModel
from app.optimization.local_search import run_local_search
from app.schemas.schemas import ConvergencePoint, SolverRunSummary
from app.services.calendar_evaluator import get_initial_assignment
from app.services.conflict_calculator import compute_objective_function
from app.services.constraints import can_assign_exam_slot, evaluate_feasibility


@dataclass
class MultiStartOutcome:
    summary: SolverRunSummary
    max_incremental_error: float


def construct_feasible_assignment(
    model: CompiledAcademicModel,
    rng: random.Random,
    max_attempts: int = 80,
) -> Optional[Dict[str, str]]:
    """
    Construct a feasible initial schedule using randomized greedy backtracking
    ordered by most-constrained exam first (MRV + highest conflict degree).
    """
    ordered_exams = sorted(
        model.exam_ids,
        key=lambda eid: (len(model.slots_by_exam[eid]), -len(model.neighbors[eid])),
    )

    for _ in range(max_attempts):
        assignment: Dict[str, str] = {}
        success = True
        # Perturb exam ordering slightly after first deterministic MRV attempt
        exams_try = list(ordered_exams)
        if _ > 0:
            rng.shuffle(exams_try)
            exams_try.sort(key=lambda eid: len(model.slots_by_exam[eid]))

        for eid in exams_try:
            candidates = list(model.slots_by_exam[eid].keys())
            rng.shuffle(candidates)
            placed = False
            for slot_id in candidates:
                if can_assign_exam_slot(model, assignment, eid, slot_id):
                    assignment[eid] = slot_id
                    placed = True
                    break
            if not placed:
                success = False
                break

        if success and evaluate_feasibility(model, assignment).is_feasible:
            return assignment

    return None


def solve_with_random_restarts(
    model: CompiledAcademicModel,
    restarts: int = 15,
    seed: int = 42,
) -> MultiStartOutcome:
    """
    Run Local Search with controlled Random Restarts.
    Guarantees that if the initial schedule x^(0) is feasible, the returned solution
    never has higher objective cost than F(x^(0)).
    """
    t0 = time.perf_counter()
    rng = random.Random(seed)

    initial_assignment = get_initial_assignment(model)
    initial_feasible = evaluate_feasibility(model, initial_assignment).is_feasible
    initial_cost = compute_objective_function(model, initial_assignment)

    best_assignment: Optional[Dict[str, str]] = dict(initial_assignment) if initial_feasible else None
    best_cost: float = initial_cost if initial_feasible else float("inf")

    total_iterations = 0
    all_trace: List[ConvergencePoint] = []
    max_inc_error = 0.0
    restarts_executed = 0

    for r in range(restarts):
        if r == 0 and initial_feasible:
            start_assign = dict(initial_assignment)
        else:
            start_assign = construct_feasible_assignment(model, rng)
            if start_assign is None:
                continue

        restarts_executed += 1
        outcome = run_local_search(
            model=model,
            start_assignment=start_assign,
            rng=rng,
            restart_idx=r,
            global_best_so_far=best_cost,
            step_offset=len(all_trace),
            verify_incremental=True,
        )
        total_iterations += outcome.iterations
        max_inc_error = max(max_inc_error, outcome.max_incremental_error)
        all_trace.extend(outcome.trace)

        if outcome.final_cost < best_cost:
            best_cost = outcome.final_cost
            best_assignment = dict(outcome.assignment)

    elapsed_ms = (time.perf_counter() - t0) * 1000.0

    if best_assignment is None:
        return MultiStartOutcome(
            summary=SolverRunSummary(
                algorithm="Búsqueda Local con Reinicios Aleatorios",
                status="INFEASIBLE",
                is_feasible=False,
                initial_cost=round(initial_cost, 4),
                final_cost=round(initial_cost, 4),
                reduction_absolute=0.0,
                reduction_percentage=0.0,
                iterations=total_iterations,
                restarts_executed=restarts_executed,
                execution_time_ms=round(elapsed_ms, 2),
                modified_exams_count=0,
                optimality_proven=False,
                assignment=initial_assignment,
                convergence_trace=all_trace,
            ),
            max_incremental_error=max_inc_error,
        )

    # Explicit safeguard: never return worse than feasible initial schedule
    if initial_feasible and best_cost > initial_cost:
        best_assignment = dict(initial_assignment)
        best_cost = initial_cost

    modified_count = sum(1 for eid in model.exam_ids if best_assignment[eid] != initial_assignment[eid])
    red_abs = initial_cost - best_cost
    red_pct = (red_abs / initial_cost * 100.0) if initial_cost > 1e-9 else 0.0

    return MultiStartOutcome(
        summary=SolverRunSummary(
            algorithm="Búsqueda Local con Reinicios Aleatorios",
            status="FEASIBLE",
            is_feasible=True,
            initial_cost=round(initial_cost, 4),
            final_cost=round(best_cost, 4),
            reduction_absolute=round(red_abs, 4),
            reduction_percentage=round(red_pct, 2),
            iterations=total_iterations,
            restarts_executed=restarts_executed,
            execution_time_ms=round(elapsed_ms, 2),
            modified_exams_count=modified_count,
            optimality_proven=False,
            assignment=best_assignment,
            convergence_trace=all_trace,
        ),
        max_incremental_error=max_inc_error,
    )
