"""Comprehensive calendar evaluation, graph payload assembly, and mathematical explainability."""

from __future__ import annotations

from collections import defaultdict
from typing import Dict, List

from app.models.domain import CompiledAcademicModel
from app.schemas.schemas import (
    BipartiteEdge,
    BipartiteGraphResponse,
    BipartiteNode,
    CalendarEvaluationResponse,
    ConflictEdge,
    ConflictGraphResponse,
    ConflictNode,
    DistanceBucketMetric,
    ExamEvaluationDetail,
    ExamRescheduleExplanation,
    StudentConcentrationBucket,
)
from app.services.conflict_calculator import (
    calendar_days_between,
    compute_dynamic_edge_weight,
    compute_objective_function,
    temporal_penalty,
)
from app.services.constraints import evaluate_feasibility


def get_initial_assignment(model: CompiledAcademicModel) -> Dict[str, str]:
    """Return exam_id -> initial_slot_id dictionary."""
    return {exam.id: exam.initial_slot_id for exam in model.dataset.exams}


def build_bipartite_graph_response(model: CompiledAcademicModel) -> BipartiteGraphResponse:
    """Serialize bipartite graph nodes and edges from the NetworkX graph."""
    nodes: List[BipartiteNode] = []
    for st in model.dataset.students:
        nodes.append(
            BipartiteNode(
                id=st.id,
                label=st.name,
                node_type="student",
                metadata={
                    "program": st.program,
                    "enrollment_count": len(st.enrollments),
                    "group_ids": [e.group_id for e in st.enrollments],
                    "subject_ids": [e.subject_id for e in st.enrollments],
                },
            )
        )

    for ex in model.dataset.exams:
        subj = model.subjects_by_id[ex.subject_id]
        teacher = model.teachers_by_id[ex.teacher_id]
        nodes.append(
            BipartiteNode(
                id=ex.id,
                label=f"{subj.code} ({ex.group_id})",
                node_type="exam",
                metadata={
                    "exam_name": ex.name,
                    "subject_id": ex.subject_id,
                    "subject_name": subj.name,
                    "group_id": ex.group_id,
                    "teacher_name": teacher.name,
                    "enrolled_students": len(model.students_per_exam[ex.id]),
                    "academic_weight": round(model.academic_weights_w[ex.id], 4),
                },
            )
        )

    edges: List[BipartiteEdge] = []
    for u, v, data in model.bipartite_graph.edges(data=True):
        student_id, exam_id = (u, v) if u in model.students_per_exam.get(v, set()) else (v, u)
        edges.append(
            BipartiteEdge(
                id=f"{student_id}--{exam_id}",
                source=student_id,
                target=exam_id,
                subject_id=data["subject_id"],
                group_id=data["group_id"],
            )
        )

    return BipartiteGraphResponse(
        nodes=nodes,
        edges=edges,
        stats={
            "student_nodes": len(model.dataset.students),
            "exam_nodes": len(model.dataset.exams),
            "enrollment_edges": len(edges),
        },
    )


def build_conflict_graph_response(
    model: CompiledAcademicModel,
    assignment: Dict[str, str],
    schedule_mode: str = "initial",
) -> ConflictGraphResponse:
    """Serialize weighted conflict graph keeping all A_ij > 0 edges even when K_ij == 0."""
    edges: List[ConflictEdge] = []
    weighted_degree: Dict[str, float] = {eid: 0.0 for eid in model.exam_ids}
    total_f = 0.0
    active_edges = 0
    zero_edges = 0

    for (u, v), h_uv in model.fixed_weights_h.items():
        slot_u = assignment[u]
        slot_v = assignment[v]
        delta = calendar_days_between(model.slot_dates[u][slot_u], model.slot_dates[v][slot_v])
        p_val = temporal_penalty(delta)
        k_uv = compute_dynamic_edge_weight(h_uv, delta)

        weighted_degree[u] += k_uv
        weighted_degree[v] += k_uv
        total_f += k_uv

        has_active = p_val > 0
        if has_active:
            active_edges += 1
        else:
            zero_edges += 1

        idx_u = model.exam_index[u]
        idx_v = model.exam_index[v]
        edges.append(
            ConflictEdge(
                id=f"{u}--{v}",
                source=u,
                target=v,
                shared_students=int(model.co_enrollment_matrix_a[idx_u, idx_v]),
                w_i=round(model.academic_weights_w[u], 4),
                w_j=round(model.academic_weights_w[v], 4),
                h_ij=round(h_uv, 4),
                delta_days=delta,
                temporal_penalty=p_val,
                k_ij=round(k_uv, 4),
                has_active_penalty=has_active,
            )
        )

    nodes: List[ConflictNode] = []
    for ex in model.dataset.exams:
        subj = model.subjects_by_id[ex.subject_id]
        teacher = model.teachers_by_id[ex.teacher_id]
        slot = model.slots_by_exam[ex.id][assignment[ex.id]]
        nodes.append(
            ConflictNode(
                id=ex.id,
                label=f"{subj.code} ({ex.group_id})",
                subject_id=ex.subject_id,
                subject_name=subj.name,
                group_id=ex.group_id,
                teacher_id=ex.teacher_id,
                teacher_name=teacher.name,
                credits=subj.credits,
                evaluation_percentage=ex.evaluation_percentage,
                historical_withdrawal_rate=subj.historical_withdrawal_rate,
                academic_weight=round(model.academic_weights_w[ex.id], 4),
                enrolled_students=len(model.students_per_exam[ex.id]),
                assigned_slot_id=slot.slot_id,
                assigned_date=slot.date,
                assigned_start_time=slot.start_time,
                assigned_end_time=slot.end_time,
                slot_type=slot.slot_type,
                weighted_degree=round(weighted_degree[ex.id], 4),
                degree_centrality=round(model.degree_centrality[ex.id], 4),
                betweenness_centrality=round(model.betweenness_centrality[ex.id], 4),
                closeness_centrality=round(model.closeness_centrality[ex.id], 4),
            )
        )

    return ConflictGraphResponse(
        schedule_mode=schedule_mode,
        nodes=nodes,
        edges=edges,
        total_objective_f=round(total_f, 4),
        active_conflict_edges=active_edges,
        zero_penalty_edges=zero_edges,
        total_conflict_edges=len(edges),
    )


def evaluate_calendar(
    model: CompiledAcademicModel,
    assignment: Dict[str, str],
) -> CalendarEvaluationResponse:
    """Compute complete metrics, distributions, and feasibility for any schedule."""
    feasibility = evaluate_feasibility(model, assignment)
    graph_resp = build_conflict_graph_response(model, assignment, schedule_mode="evaluated")

    # Distance distribution buckets: 0, 1, 2, 3, >=4
    distance_map: Dict[int, Dict[str, float]] = {
        d: {"pair_count": 0, "shared_students": 0, "k_sum": 0.0}
        for d in range(5)
    }
    for edge in graph_resp.edges:
        bucket = edge.delta_days if edge.delta_days < 4 else 4
        distance_map[bucket]["pair_count"] += 1
        distance_map[bucket]["shared_students"] += edge.shared_students
        distance_map[bucket]["k_sum"] += edge.k_ij

    labels = {
        0: "Mismo día (Δ=0, P=4)",
        1: "1 día (Δ=1, P=3)",
        2: "2 días (Δ=2, P=2)",
        3: "3 días (Δ=3, P=1)",
        4: "4+ días (Δ≥4, P=0)",
    }
    distance_distribution = [
        DistanceBucketMetric(
            delta_label=labels[d],
            delta_days=d,
            pair_count=int(distance_map[d]["pair_count"]),
            total_shared_students=int(distance_map[d]["shared_students"]),
            total_k_ij=round(distance_map[d]["k_sum"], 4),
        )
        for d in range(5)
    ]

    # Per-student concentration & affected student calculation
    exam_dates = {
        eid: model.slot_dates[eid][assignment[eid]]
        for eid in model.exam_ids
    }
    exam_by_student: Dict[str, List[str]] = defaultdict(list)
    for eid, student_set in model.students_per_exam.items():
        for sid in student_set:
            exam_by_student[sid].append(eid)

    affected_students = 0
    concentration_counts: Dict[str, int] = {
        "0 conflictos": 0,
        "1 par en conflicto": 0,
        "2-3 pares en conflicto": 0,
        "4+ pares en conflicto": 0,
    }

    for st in model.dataset.students:
        st_exams = exam_by_student.get(st.id, [])
        active_pairs = 0
        for i in range(len(st_exams)):
            for j in range(i + 1, len(st_exams)):
                delta = calendar_days_between(exam_dates[st_exams[i]], exam_dates[st_exams[j]])
                if temporal_penalty(delta) > 0:
                    active_pairs += 1
        if active_pairs > 0:
            affected_students += 1
        if active_pairs == 0:
            concentration_counts["0 conflictos"] += 1
        elif active_pairs == 1:
            concentration_counts["1 par en conflicto"] += 1
        elif active_pairs <= 3:
            concentration_counts["2-3 pares en conflicto"] += 1
        else:
            concentration_counts["4+ pares en conflicto"] += 1

    concentration_distribution = [
        StudentConcentrationBucket(bucket_label=label, student_count=count)
        for label, count in concentration_counts.items()
    ]

    incident_active_counts: Dict[str, int] = {eid: 0 for eid in model.exam_ids}
    for edge in graph_resp.edges:
        if edge.has_active_penalty:
            incident_active_counts[edge.source] += 1
            incident_active_counts[edge.target] += 1

    exam_details: List[ExamEvaluationDetail] = []
    for node in graph_resp.nodes:
        exam_details.append(
            ExamEvaluationDetail(
                exam_id=node.id,
                exam_name=model.exams_by_id[node.id].name,
                subject_name=node.subject_name,
                teacher_name=node.teacher_name,
                assigned_slot_id=node.assigned_slot_id,
                assigned_date=node.assigned_date,
                assigned_start_time=node.assigned_start_time,
                assigned_end_time=node.assigned_end_time,
                slot_type=node.slot_type,
                academic_weight=node.academic_weight,
                incident_penalty_k=node.weighted_degree,
                active_conflicts_count=incident_active_counts[node.id],
            )
        )

    total_f = compute_objective_function(model, assignment)
    return CalendarEvaluationResponse(
        total_objective_f=round(total_f, 4),
        feasibility=feasibility,
        active_conflict_pairs=graph_resp.active_conflict_edges,
        zero_penalty_pairs=graph_resp.zero_penalty_edges,
        affected_students_count=affected_students,
        distance_distribution=distance_distribution,
        concentration_distribution=concentration_distribution,
        exam_details=exam_details,
        edge_details=graph_resp.edges,
    )


def build_reschedule_explanations(
    model: CompiledAcademicModel,
    initial_assignment: Dict[str, str],
    optimized_assignment: Dict[str, str],
) -> List[ExamRescheduleExplanation]:
    """Generate mathematically grounded explanations for every exam between initial and optimized schedules."""
    initial_eval = evaluate_calendar(model, initial_assignment)
    optimized_eval = evaluate_calendar(model, optimized_assignment)

    init_incident = {d.exam_id: d.incident_penalty_k for d in initial_eval.exam_details}
    opt_incident = {d.exam_id: d.incident_penalty_k for d in optimized_eval.exam_details}

    explanations: List[ExamRescheduleExplanation] = []
    for ex in model.dataset.exams:
        subj = model.subjects_by_id[ex.subject_id]
        teacher = model.teachers_by_id[ex.teacher_id]
        orig_slot = model.slots_by_exam[ex.id][initial_assignment[ex.id]]
        prop_slot = model.slots_by_exam[ex.id][optimized_assignment[ex.id]]
        changed = orig_slot.slot_id != prop_slot.slot_id

        # Isolated delta: moving only exam ex.id from orig_slot to prop_slot on top of optimized neighbors
        isolated_delta = 0.0
        for nbr in model.neighbors[ex.id]:
            pair = (ex.id, nbr) if (ex.id, nbr) in model.fixed_weights_h else (nbr, ex.id)
            h_ij = model.fixed_weights_h[pair]
            nbr_opt_date = model.slot_dates[nbr][optimized_assignment[nbr]]
            p_new = temporal_penalty(calendar_days_between(model.slot_dates[ex.id][prop_slot.slot_id], nbr_opt_date))
            p_old = temporal_penalty(calendar_days_between(model.slot_dates[ex.id][orig_slot.slot_id], nbr_opt_date))
            isolated_delta += h_ij * (p_new - p_old)

        before_k = init_incident[ex.id]
        after_k = opt_incident[ex.id]
        diff_k = after_k - before_k

        if changed:
            slot_desc = "sesión habitual de clase" if prop_slot.slot_type == "regular_class" else "espacio de sábado autorizado"
            reason = (
                f"Se reprograma del {orig_slot.date} ({orig_slot.start_time}) al {prop_slot.date} ({prop_slot.start_time}, "
                f"{slot_desc}). Su penalización incidente pasa de {before_k:.2f} a {after_k:.2f} "
                f"(Δ contextual = {diff_k:+.2f}; contribución marginal respecto a vecinos optimizados ΔF_i = {isolated_delta:+.2f}), "
                f"reduciendo la congestión con {len(model.neighbors[ex.id])} parciales vinculados."
            )
        else:
            reason = (
                f"Se mantiene en su franja original ({orig_slot.date} {orig_slot.start_time}); "
                f"su penalización incidente en el calendario final es {after_k:.2f} (antes {before_k:.2f})."
            )

        explanations.append(
            ExamRescheduleExplanation(
                exam_id=ex.id,
                exam_name=ex.name,
                subject_code=subj.code,
                subject_name=subj.name,
                teacher_name=teacher.name,
                original_slot_id=orig_slot.slot_id,
                original_date=orig_slot.date,
                original_time=f"{orig_slot.start_time}-{orig_slot.end_time}",
                proposed_slot_id=prop_slot.slot_id,
                proposed_date=prop_slot.date,
                proposed_time=f"{prop_slot.start_time}-{prop_slot.end_time}",
                proposed_slot_type=prop_slot.slot_type,
                changed=changed,
                isolated_penalty_delta=round(isolated_delta, 4),
                contextual_incident_before=round(before_k, 4),
                contextual_incident_after=round(after_k, 4),
                reason=reason,
            )
        )

    return explanations
