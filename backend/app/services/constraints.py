"""Hard constraint validation service for CronoGraph exam schedules."""

from __future__ import annotations

from typing import Dict, List, Tuple

from app.models.domain import CompiledAcademicModel
from app.schemas.schemas import ConstraintViolation, FeasibilityReport


def _intervals_overlap(start_a: int, end_a: int, start_b: int, end_b: int) -> bool:
    return start_a < end_b and start_b < end_a


def evaluate_feasibility(
    model: CompiledAcademicModel,
    assignment: Dict[str, str],
) -> FeasibilityReport:
    """Verify all mandatory institutional constraints on a schedule assignment."""
    violations: List[ConstraintViolation] = []
    domain_ok = True
    duration_ok = True
    no_student_overlap = True
    no_teacher_overlap = True
    no_room_overlap = True

    # 1 & 2. Check domain membership x_i in D_i and full exam duration fit
    assigned_windows: Dict[str, Tuple[str, int, int, str]] = {}
    for eid in model.exam_ids:
        slot_id = assignment.get(eid)
        exam = model.exams_by_id[eid]
        if slot_id is None or slot_id not in model.slots_by_exam[eid]:
            domain_ok = False
            violations.append(
                ConstraintViolation(
                    constraint_type="authorized_domain",
                    message=f"Parcial {eid} asignado a opción no autorizada o faltante ({slot_id}).",
                    exam_ids=[eid],
                )
            )
            continue

        slot = model.slots_by_exam[eid][slot_id]
        slot_start, slot_end = model.slot_minutes[eid][slot_id]
        exam_end = slot_start + exam.duration_minutes
        if exam_end > slot_end:
            duration_ok = False
            violations.append(
                ConstraintViolation(
                    constraint_type="duration_fit",
                    message=(
                        f"Parcial {eid} requiere {exam.duration_minutes} min, excediendo "
                        f"la franja {slot.start_time}-{slot.end_time}."
                    ),
                    exam_ids=[eid],
                )
            )
        assigned_windows[eid] = (slot.date, slot_start, exam_end, slot.room or "")

    # 3, 4 & 5. Check pairwise overlaps on same date
    exam_list = model.exam_ids
    for i in range(len(exam_list)):
        u = exam_list[i]
        if u not in assigned_windows:
            continue
        date_u, start_u, end_u, room_u = assigned_windows[u]
        ex_u = model.exams_by_id[u]
        idx_u = model.exam_index[u]

        for j in range(i + 1, len(exam_list)):
            v = exam_list[j]
            if v not in assigned_windows:
                continue
            date_v, start_v, end_v, room_v = assigned_windows[v]
            if date_u != date_v:
                continue
            if not _intervals_overlap(start_u, end_u, start_v, end_v):
                continue

            ex_v = model.exams_by_id[v]
            idx_v = model.exam_index[v]
            shared = int(model.co_enrollment_matrix_a[idx_u, idx_v])

            if shared > 0:
                no_student_overlap = False
                violations.append(
                    ConstraintViolation(
                        constraint_type="student_overlap",
                        message=(
                            f"Superposición de horario entre {u} y {v} el {date_u}: "
                            f"comparten {shared} estudiantes."
                        ),
                        exam_ids=[u, v],
                    )
                )

            if ex_u.teacher_id == ex_v.teacher_id:
                no_teacher_overlap = False
                violations.append(
                    ConstraintViolation(
                        constraint_type="teacher_overlap",
                        message=(
                            f"El docente {ex_u.teacher_id} tiene dos parciales simultáneos "
                            f"({u} y {v}) el {date_u}."
                        ),
                        exam_ids=[u, v],
                    )
                )

            if room_u and room_v and room_u == room_v:
                no_room_overlap = False
                violations.append(
                    ConstraintViolation(
                        constraint_type="room_overlap",
                        message=f"El aula {room_u} está ocupada simultáneamente por {u} y {v} el {date_u}.",
                        exam_ids=[u, v],
                    )
                )

    is_feasible = domain_ok and duration_ok and no_student_overlap and no_teacher_overlap and no_room_overlap
    return FeasibilityReport(
        is_feasible=is_feasible,
        domain_ok=domain_ok,
        duration_ok=duration_ok,
        no_student_overlap=no_student_overlap,
        no_teacher_overlap=no_teacher_overlap,
        no_room_overlap=no_room_overlap,
        violations=violations,
    )


def can_assign_exam_slot(
    model: CompiledAcademicModel,
    assignment: Dict[str, str],
    exam_id: str,
    candidate_slot_id: str,
) -> bool:
    """Fast feasibility check for changing a single exam_id to candidate_slot_id."""
    if candidate_slot_id not in model.slots_by_exam[exam_id]:
        return False

    exam = model.exams_by_id[exam_id]
    slot = model.slots_by_exam[exam_id][candidate_slot_id]
    slot_start, slot_end = model.slot_minutes[exam_id][candidate_slot_id]
    exam_end = slot_start + exam.duration_minutes
    if exam_end > slot_end:
        return False

    idx_u = model.exam_index[exam_id]
    cand_room = slot.room or ""

    for other_id, other_slot_id in assignment.items():
        if other_id == exam_id:
            continue
        other_slot = model.slots_by_exam[other_id][other_slot_id]
        if other_slot.date != slot.date:
            continue

        other_start, _ = model.slot_minutes[other_id][other_slot_id]
        other_end = other_start + model.exams_by_id[other_id].duration_minutes
        if not _intervals_overlap(slot_start, exam_end, other_start, other_end):
            continue

        idx_v = model.exam_index[other_id]
        if int(model.co_enrollment_matrix_a[idx_u, idx_v]) > 0:
            return False
        if model.exams_by_id[other_id].teacher_id == exam.teacher_id:
            return False
        if cand_room and other_slot.room and cand_room == other_slot.room:
            return False

    return True
