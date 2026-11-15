"""Graph construction service: incidence matrix B, A = B^T B, bipartite graph, and conflict graph."""

from __future__ import annotations

from datetime import date, time
from typing import Dict, List, Set, Tuple

import networkx as nx
import numpy as np

from app.models.domain import CompiledAcademicModel
from app.schemas.schemas import AcademicDataset, AuthorizedSlot
from app.services.academic_weights import compute_all_academic_weights
from app.services.conflict_calculator import compute_fixed_edge_weight


def _time_to_minutes(time_str: str) -> int:
    parsed = time.fromisoformat(time_str)
    return parsed.hour * 60 + parsed.minute


def build_compiled_model(dataset: AcademicDataset) -> CompiledAcademicModel:
    """Build B, A = B^T B, NetworkX bipartite & conflict graphs, and precomputed weights."""
    student_ids = [s.id for s in dataset.students]
    exam_ids = [e.id for e in dataset.exams]
    student_index = {sid: idx for idx, sid in enumerate(student_ids)}
    exam_index = {eid: idx for idx, eid in enumerate(exam_ids)}

    exams_by_id = {e.id: e for e in dataset.exams}
    subjects_by_id = {s.id: s for s in dataset.subjects}
    teachers_by_id = {t.id: t for t in dataset.teachers}

    # Map (subject_id, group_id) -> list of exam_ids
    group_to_exams: Dict[Tuple[str, str], List[str]] = {}
    for exam in dataset.exams:
        group_to_exams.setdefault((exam.subject_id, exam.group_id), []).append(exam.id)

    # Incidence matrix B: |S| x |E| where B_si = 1 iff student s takes exam i
    b_matrix = np.zeros((len(student_ids), len(exam_ids)), dtype=np.int64)
    students_per_exam: Dict[str, Set[str]] = {eid: set() for eid in exam_ids}

    bipartite = nx.Graph()
    for st in dataset.students:
        bipartite.add_node(st.id, bipartite=0, node_type="student", label=st.name, program=st.program)
    for ex in dataset.exams:
        subj = subjects_by_id[ex.subject_id]
        bipartite.add_node(
            ex.id,
            bipartite=1,
            node_type="exam",
            label=ex.name,
            subject_id=ex.subject_id,
            subject_code=subj.code,
            group_id=ex.group_id,
        )

    for st in dataset.students:
        s_idx = student_index[st.id]
        for enr in st.enrollments:
            for eid in group_to_exams.get((enr.subject_id, enr.group_id), []):
                e_idx = exam_index[eid]
                b_matrix[s_idx, e_idx] = 1
                students_per_exam[eid].add(st.id)
                bipartite.add_edge(st.id, eid, subject_id=enr.subject_id, group_id=enr.group_id)

    # Co-enrollment matrix A = B^T B
    a_matrix = b_matrix.T @ b_matrix

    # Academic weights W_i
    weights_w = compute_all_academic_weights(dataset)

    # Conflict graph (vertices = exams, edge {i, j} whenever A_ij > 0 for i < j)
    conflict_graph = nx.Graph()
    for ex in dataset.exams:
        conflict_graph.add_node(
            ex.id,
            label=ex.name,
            subject_id=ex.subject_id,
            group_id=ex.group_id,
            teacher_id=ex.teacher_id,
            academic_weight=weights_w[ex.id],
            enrolled_students=int(a_matrix[exam_index[ex.id], exam_index[ex.id]]),
        )

    fixed_weights_h: Dict[Tuple[str, str], float] = {}
    neighbors: Dict[str, List[str]] = {eid: [] for eid in exam_ids}

    num_exams = len(exam_ids)
    for i in range(num_exams):
        for j in range(i + 1, num_exams):
            shared = int(a_matrix[i, j])
            if shared > 0:
                u = exam_ids[i]
                v = exam_ids[j]
                h_uv = compute_fixed_edge_weight(shared, weights_w[u], weights_w[v])
                fixed_weights_h[(u, v)] = h_uv
                neighbors[u].append(v)
                neighbors[v].append(u)
                conflict_graph.add_edge(
                    u,
                    v,
                    shared_students=shared,
                    w_i=weights_w[u],
                    w_j=weights_w[v],
                    h_ij=h_uv,
                )

    slots_by_exam: Dict[str, Dict[str, AuthorizedSlot]] = {}
    slot_dates: Dict[str, Dict[str, date]] = {}
    slot_minutes: Dict[str, Dict[str, Tuple[int, int]]] = {}

    for ex in dataset.exams:
        slots_by_exam[ex.id] = {}
        slot_dates[ex.id] = {}
        slot_minutes[ex.id] = {}
        for slot in ex.authorized_slots:
            if not slot.authorized:
                continue
            slots_by_exam[ex.id][slot.slot_id] = slot
            slot_dates[ex.id][slot.slot_id] = date.fromisoformat(slot.date)
            start_min = _time_to_minutes(slot.start_time)
            end_min = _time_to_minutes(slot.end_time)
            slot_minutes[ex.id][slot.slot_id] = (start_min, end_min)

    return CompiledAcademicModel(
        dataset=dataset,
        student_ids=student_ids,
        exam_ids=exam_ids,
        exam_index=exam_index,
        exams_by_id=exams_by_id,
        subjects_by_id=subjects_by_id,
        teachers_by_id=teachers_by_id,
        slots_by_exam=slots_by_exam,
        slot_dates=slot_dates,
        slot_minutes=slot_minutes,
        incidence_matrix_b=b_matrix,
        co_enrollment_matrix_a=a_matrix,
        academic_weights_w=weights_w,
        fixed_weights_h=fixed_weights_h,
        neighbors=neighbors,
        students_per_exam=students_per_exam,
        bipartite_graph=bipartite,
        conflict_graph=conflict_graph,
    )
