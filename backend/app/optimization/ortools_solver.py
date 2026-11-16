"""Exact mathematical formulation using Google OR-Tools CP-SAT for small/medium verification and comparison."""

from __future__ import annotations

import time
from typing import Dict, List, Tuple

from ortools.sat.python import cp_model

from app.models.domain import CompiledAcademicModel
from app.schemas.schemas import ConvergencePoint, SolverRunSummary
from app.services.calendar_evaluator import get_initial_assignment
from app.services.conflict_calculator import (
    calendar_days_between,
    compute_objective_function,
    temporal_penalty,
)
from app.services.constraints import evaluate_feasibility

# Scale float H_ij by 10,000 for exact integer CP-SAT objective representation
OBJECTIVE_SCALE = 10_000


def _slots_overlap_forbidden(
    model: CompiledAcademicModel,
    eid_u: str,
    slot_u: str,
    eid_v: str,
    slot_v: str,
) -> bool:
    """Return True if assigning u->slot_u and v->slot_v violates student, teacher, or room overlap."""
    su = model.slots_by_exam[eid_u][slot_u]
    sv = model.slots_by_exam[eid_v][slot_v]
    if su.date != sv.date:
        return False

    start_u, _ = model.slot_minutes[eid_u][slot_u]
    end_u = start_u + model.exams_by_id[eid_u].duration_minutes
    start_v, _ = model.slot_minutes[eid_v][slot_v]
    end_v = start_v + model.exams_by_id[eid_v].duration_minutes

    if not (start_u < end_v and start_v < end_u):
        return False

    idx_u = model.exam_index[eid_u]
    idx_v = model.exam_index[eid_v]
    shares_student = int(model.co_enrollment_matrix_a[idx_u, idx_v]) > 0
    same_teacher = model.exams_by_id[eid_u].teacher_id == model.exams_by_id[eid_v].teacher_id
    same_room = bool(su.room and sv.room and su.room == sv.room)
    return shares_student or same_teacher or same_room


def solve_with_ortools(
    model: CompiledAcademicModel,
    time_limit_seconds: float = 10.0,
) -> SolverRunSummary:
    """
    Exact CP-SAT formulation:
      - Binary variables y_{i, s} in {0, 1} for each authorized slot s in D_i fitting full duration.
      - sum_{s} y_{i, s} = 1 for all i.
      - Forbidden simultaneous overlaps: y_{i, s} + y_{j, t} <= 1.
      - Pairwise date-pair or active-pair linearization for exact sum_{i<j} H_ij * P(|d_i - d_j|).
    """
    t0 = time.perf_counter()
    initial_assignment = get_initial_assignment(model)
    initial_cost = compute_objective_function(model, initial_assignment)
    initial_feasible = evaluate_feasibility(model, initial_assignment).is_feasible

    cp = cp_model.CpModel()

    # Valid slots fitting exam duration
    valid_slots: Dict[str, List[str]] = {}
    for eid in model.exam_ids:
        dur = model.exams_by_id[eid].duration_minutes
        opts = []
        for slot_id in model.slots_by_exam[eid]:
            start_m, end_m = model.slot_minutes[eid][slot_id]
            if start_m + dur <= end_m:
                opts.append(slot_id)
        valid_slots[eid] = opts

    # If any exam has zero valid slots, immediately report INFEASIBLE
    if any(len(opts) == 0 for opts in valid_slots.values()):
        elapsed_ms = (time.perf_counter() - t0) * 1000.0
        return SolverRunSummary(
            algorithm="Google OR-Tools (CP-SAT)",
            status="INFEASIBLE",
            is_feasible=False,
            initial_cost=round(initial_cost, 4),
            final_cost=round(initial_cost, 4),
            reduction_absolute=0.0,
            reduction_percentage=0.0,
            iterations=0,
            restarts_executed=1,
            execution_time_ms=round(elapsed_ms, 2),
            modified_exams_count=0,
            optimality_proven=False,
            assignment=initial_assignment,
            convergence_trace=[],
        )

    y: Dict[Tuple[str, str], cp_model.IntVar] = {}
    for eid in model.exam_ids:
        vars_i = []
        for slot_id in valid_slots[eid]:
            var = cp.new_bool_var(f"y_{eid}_{slot_id}")
            y[(eid, slot_id)] = var
            vars_i.append(var)
        cp.add_exactly_one(vars_i)

    # Hard overlap constraints across all exam pairs
    n_exams = len(model.exam_ids)
    for i in range(n_exams):
        u = model.exam_ids[i]
        for j in range(i + 1, n_exams):
            v = model.exam_ids[j]
            for su in valid_slots[u]:
                for sv in valid_slots[v]:
                    if _slots_overlap_forbidden(model, u, su, v, sv):
                        cp.add(y[(u, su)] + y[(v, sv)] <= 1)

    # Linearize pairwise temporal penalty using date-indicator variables d_{i, date}
    dates_by_exam: Dict[str, Dict[str, List[str]]] = {}
    date_bools: Dict[Tuple[str, str], cp_model.IntVar] = {}
    for eid in model.exam_ids:
        dates_by_exam[eid] = {}
        for slot_id in valid_slots[eid]:
            d_iso = model.slots_by_exam[eid][slot_id].date
            dates_by_exam[eid].setdefault(d_iso, []).append(slot_id)
        for d_iso, slot_list in dates_by_exam[eid].items():
            d_var = cp.new_bool_var(f"d_{eid}_{d_iso}")
            cp.add(d_var == sum(y[(eid, s)] for s in slot_list))
            date_bools[(eid, d_iso)] = d_var

    # Objective: sum_{i<j} sum_{du, dv where P(|du-dv|)>0} round(H_ij * P(|du-dv|) * SCALE) * z_{u,du,v,dv}
    objective_terms = []
    for (u, v), h_uv in model.fixed_weights_h.items():
        for du_iso, su_list in dates_by_exam[u].items():
            du = model.slot_dates[u][su_list[0]]
            for dv_iso, sv_list in dates_by_exam[v].items():
                dv = model.slot_dates[v][sv_list[0]]
                p_val = temporal_penalty(calendar_days_between(du, dv))
                if p_val <= 0:
                    continue
                coeff = int(round(h_uv * p_val * OBJECTIVE_SCALE))
                if coeff <= 0:
                    continue
                z_uv = cp.new_bool_var(f"z_{u}_{du_iso}_{v}_{dv_iso}")
                bu = date_bools[(u, du_iso)]
                bv = date_bools[(v, dv_iso)]
                cp.add(z_uv >= bu + bv - 1)
                cp.add(z_uv <= bu)
                cp.add(z_uv <= bv)
                objective_terms.append(coeff * z_uv)

    cp.minimize(sum(objective_terms))

    # Provide feasible initial hint if available
    if initial_feasible:
        for eid, slot_id in initial_assignment.items():
            if (eid, slot_id) in y:
                cp.add_hint(y[(eid, slot_id)], 1)

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = time_limit_seconds
    solver.parameters.num_search_workers = 4

    status = solver.solve(cp)
    elapsed_ms = (time.perf_counter() - t0) * 1000.0

    if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        status_label = "INFEASIBLE" if status == cp_model.INFEASIBLE else "UNKNOWN"
        return SolverRunSummary(
            algorithm="Google OR-Tools (CP-SAT)",
            status=status_label,
            is_feasible=False,
            initial_cost=round(initial_cost, 4),
            final_cost=round(initial_cost, 4),
            reduction_absolute=0.0,
            reduction_percentage=0.0,
            iterations=int(solver.num_branches),
            restarts_executed=1,
            execution_time_ms=round(elapsed_ms, 2),
            modified_exams_count=0,
            optimality_proven=False,
            assignment=initial_assignment,
            convergence_trace=[],
        )

    solved_assignment: Dict[str, str] = {}
    for eid in model.exam_ids:
        for slot_id in valid_slots[eid]:
            if solver.value(y[(eid, slot_id)]) == 1:
                solved_assignment[eid] = slot_id
                break

    final_cost = compute_objective_function(model, solved_assignment)
    optimality_proven = status == cp_model.OPTIMAL

    # Respect strict safeguard if initial was feasible
    if initial_feasible and final_cost > initial_cost:
        solved_assignment = dict(initial_assignment)
        final_cost = initial_cost
        # The returned calendar is no longer the one certified by CP-SAT.
        optimality_proven = False

    modified_count = sum(1 for eid in model.exam_ids if solved_assignment[eid] != initial_assignment[eid])
    red_abs = initial_cost - final_cost
    red_pct = (red_abs / initial_cost * 100.0) if initial_cost > 1e-9 else 0.0

    trace = [
        ConvergencePoint(
            step=0,
            restart=0,
            iteration=0,
            current_cost=round(initial_cost, 4),
            best_cost=round(initial_cost, 4),
            event="Estado inicial antes de CP-SAT",
        ),
        ConvergencePoint(
            step=1,
            restart=0,
            iteration=int(solver.num_branches),
            current_cost=round(final_cost, 4),
            best_cost=round(final_cost, 4),
            event="Solución óptima global probada (CP-SAT)" if optimality_proven else "Mejor solución factible dentro del límite de tiempo (CP-SAT)",
        ),
    ]

    return SolverRunSummary(
        algorithm="Google OR-Tools (CP-SAT)",
        status="OPTIMAL" if optimality_proven else "FEASIBLE",
        is_feasible=True,
        initial_cost=round(initial_cost, 4),
        final_cost=round(final_cost, 4),
        reduction_absolute=round(red_abs, 4),
        reduction_percentage=round(red_pct, 2),
        iterations=int(solver.num_branches),
        restarts_executed=1,
        execution_time_ms=round(elapsed_ms, 2),
        modified_exams_count=modified_count,
        optimality_proven=optimality_proven,
        assignment=solved_assignment,
        convergence_trace=trace,
    )
