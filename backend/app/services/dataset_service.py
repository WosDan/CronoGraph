"""Dataset loading, strict integrity validation, and JSON persistence services."""

from __future__ import annotations

import json
from datetime import date, datetime, time
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

from pydantic import ValidationError

from app.core.config import settings
from app.schemas.schemas import (
    AcademicDataset,
    DatasetSummaryStats,
    DatasetValidationResponse,
    ValidationIssue,
)

WEEKDAY_NAMES = {
    0: "Monday",
    1: "Tuesday",
    2: "Wednesday",
    3: "Thursday",
    4: "Friday",
    5: "Saturday",
    6: "Sunday",
}


def _to_minutes(time_str: str) -> int:
    parsed = time.fromisoformat(time_str)
    return parsed.hour * 60 + parsed.minute


def validate_academic_dataset(raw_payload: Any) -> Tuple[Optional[AcademicDataset], DatasetValidationResponse]:
    """Validate structure, referential integrity, academic ranges, and slot authorization."""
    issues: List[ValidationIssue] = []

    try:
        dataset = AcademicDataset.model_validate(raw_payload)
    except ValidationError as exc:
        for err in exc.errors():
            loc = ".".join(str(part) for part in err.get("loc", []))
            issues.append(
                ValidationIssue(
                    severity="error",
                    code="SCHEMA_VALIDATION_ERROR",
                    message=f"Campo '{loc}': {err.get('msg')}",
                )
            )
        return None, DatasetValidationResponse(valid=False, issues=issues, summary=None)

    teacher_ids = {t.id for t in dataset.teachers}
    if len(teacher_ids) != len(dataset.teachers):
        issues.append(ValidationIssue(severity="error", code="DUPLICATE_TEACHER_ID", message="Existen IDs de docentes duplicados."))

    subject_map = {}
    for subj in dataset.subjects:
        if subj.id in subject_map:
            issues.append(ValidationIssue(severity="error", code="DUPLICATE_SUBJECT_ID", message=f"Asignatura duplicada: {subj.id}", entity_id=subj.id))
        subject_map[subj.id] = subj

    group_map = {}
    for grp in dataset.groups:
        if grp.id in group_map:
            issues.append(ValidationIssue(severity="error", code="DUPLICATE_GROUP_ID", message=f"Grupo duplicado: {grp.id}", entity_id=grp.id))
        if grp.subject_id not in subject_map:
            issues.append(ValidationIssue(severity="error", code="UNKNOWN_SUBJECT", message=f"Grupo {grp.id} referencia asignatura inexistente {grp.subject_id}.", entity_id=grp.id))
        if grp.teacher_id not in teacher_ids:
            issues.append(ValidationIssue(severity="error", code="UNKNOWN_TEACHER", message=f"Grupo {grp.id} referencia docente inexistente {grp.teacher_id}.", entity_id=grp.id))
        group_map[grp.id] = grp

    exam_ids: Set[str] = set()
    total_authorized_slots = 0
    saturday_authorized_slots = 0

    for exam in dataset.exams:
        if exam.id in exam_ids:
            issues.append(ValidationIssue(severity="error", code="DUPLICATE_EXAM_ID", message=f"Parcial duplicado: {exam.id}", entity_id=exam.id))
        exam_ids.add(exam.id)

        if exam.subject_id not in subject_map:
            issues.append(ValidationIssue(severity="error", code="UNKNOWN_SUBJECT", message=f"Parcial {exam.id} referencia asignatura inexistente {exam.subject_id}.", entity_id=exam.id))
        if exam.group_id not in group_map:
            issues.append(ValidationIssue(severity="error", code="UNKNOWN_GROUP", message=f"Parcial {exam.id} referencia grupo inexistente {exam.group_id}.", entity_id=exam.id))
        else:
            grp = group_map[exam.group_id]
            if grp.subject_id != exam.subject_id:
                issues.append(ValidationIssue(severity="error", code="GROUP_SUBJECT_MISMATCH", message=f"Parcial {exam.id}: grupo {grp.id} pertenece a {grp.subject_id}, no a {exam.subject_id}.", entity_id=exam.id))
            if grp.teacher_id != exam.teacher_id:
                issues.append(ValidationIssue(severity="error", code="GROUP_TEACHER_MISMATCH", message=f"Parcial {exam.id}: docente {exam.teacher_id} no coincide con docente del grupo {grp.teacher_id}.", entity_id=exam.id))

        if exam.teacher_id not in teacher_ids:
            issues.append(ValidationIssue(severity="error", code="UNKNOWN_TEACHER", message=f"Parcial {exam.id} referencia docente inexistente {exam.teacher_id}.", entity_id=exam.id))

        slot_ids: Set[str] = set()
        authorized_slot_ids: Set[str] = set()
        grp_sessions = group_map[exam.group_id].regular_schedule if exam.group_id in group_map else []

        for slot in exam.authorized_slots:
            if slot.slot_id in slot_ids:
                issues.append(ValidationIssue(severity="error", code="DUPLICATE_SLOT_ID", message=f"Parcial {exam.id} tiene slot_id duplicado {slot.slot_id}.", entity_id=exam.id))
            slot_ids.add(slot.slot_id)

            if not slot.authorized:
                issues.append(ValidationIssue(severity="error", code="UNAUTHORIZED_SLOT_IN_DOMAIN", message=f"Slot {slot.slot_id} del parcial {exam.id} no tiene authorized=true.", entity_id=exam.id))
            else:
                authorized_slot_ids.add(slot.slot_id)
                total_authorized_slots += 1
                if slot.slot_type == "authorized_saturday":
                    saturday_authorized_slots += 1

            slot_start_min = _to_minutes(slot.start_time)
            slot_end_min = _to_minutes(slot.end_time)
            if (slot_end_min - slot_start_min) < exam.duration_minutes:
                issues.append(
                    ValidationIssue(
                        severity="error",
                        code="SLOT_SHORTER_THAN_DURATION",
                        message=f"Slot {slot.slot_id} ({slot.start_time}-{slot.end_time}) es más corto que la duración del parcial ({exam.duration_minutes} min).",
                        entity_id=exam.id,
                    )
                )

            slot_weekday = WEEKDAY_NAMES[date.fromisoformat(slot.date).weekday()]
            if slot.slot_type == "regular_class":
                matches_regular = any(
                    s.day_of_week == slot_weekday
                    and _to_minutes(s.start_time) <= slot_start_min
                    and slot_end_min <= _to_minutes(s.end_time)
                    for s in grp_sessions
                )
                if not matches_regular:
                    issues.append(
                        ValidationIssue(
                            severity="error",
                            code="REGULAR_SLOT_OUTSIDE_CLASS_SCHEDULE",
                            message=f"Slot {slot.slot_id} ({slot.date} {slot.start_time}-{slot.end_time}, {slot_weekday}) no coincide con ninguna sesión habitual de clase del grupo {exam.group_id}.",
                            entity_id=exam.id,
                        )
                    )
            elif slot.slot_type == "authorized_saturday" and slot_weekday != "Saturday":
                issues.append(
                    ValidationIssue(
                        severity="error",
                        code="SATURDAY_SLOT_WRONG_WEEKDAY",
                        message=f"Slot {slot.slot_id} marcado como authorized_saturday corresponde a {slot_weekday}, no a sábado.",
                        entity_id=exam.id,
                    )
                )

        if exam.initial_slot_id not in authorized_slot_ids:
            issues.append(
                ValidationIssue(
                    severity="error",
                    code="INITIAL_SLOT_NOT_AUTHORIZED",
                    message=f"La fecha inicial ({exam.initial_slot_id}) del parcial {exam.id} no está dentro de sus opciones autorizadas.",
                    entity_id=exam.id,
                )
            )

    student_ids: Set[str] = set()
    total_enrollments = 0
    for student in dataset.students:
        if student.id in student_ids:
            issues.append(ValidationIssue(severity="error", code="DUPLICATE_STUDENT_ID", message=f"Estudiante duplicado: {student.id}", entity_id=student.id))
        student_ids.add(student.id)

        if not (4 <= len(student.enrollments) <= 6):
            issues.append(
                ValidationIssue(
                    severity="warning",
                    code="ENROLLMENT_COUNT_OUT_OF_RECOMMENDED_RANGE",
                    message=f"Estudiante {student.id} tiene {len(student.enrollments)} asignaturas matriculadas (rango esperado 4-6).",
                    entity_id=student.id,
                )
            )

        seen_subjects: Set[str] = set()
        for enr in student.enrollments:
            total_enrollments += 1
            if enr.subject_id not in subject_map:
                issues.append(ValidationIssue(severity="error", code="UNKNOWN_SUBJECT", message=f"Estudiante {student.id} matriculado en asignatura inexistente {enr.subject_id}.", entity_id=student.id))
            if enr.group_id not in group_map:
                issues.append(ValidationIssue(severity="error", code="UNKNOWN_GROUP", message=f"Estudiante {student.id} matriculado en grupo inexistente {enr.group_id}.", entity_id=student.id))
            elif group_map[enr.group_id].subject_id != enr.subject_id:
                issues.append(ValidationIssue(severity="error", code="ENROLLMENT_GROUP_MISMATCH", message=f"Estudiante {student.id}: grupo {enr.group_id} no pertenece a {enr.subject_id}.", entity_id=student.id))

            if enr.subject_id in seen_subjects:
                issues.append(ValidationIssue(severity="error", code="DUPLICATE_SUBJECT_ENROLLMENT", message=f"Estudiante {student.id} tiene múltiples matrículas en la asignatura {enr.subject_id}.", entity_id=student.id))
            seen_subjects.add(enr.subject_id)

    has_errors = any(issue.severity == "error" for issue in issues)
    summary = DatasetSummaryStats(
        num_students=len(dataset.students),
        num_subjects=len(dataset.subjects),
        num_teachers=len(dataset.teachers),
        num_groups=len(dataset.groups),
        num_exams=len(dataset.exams),
        num_enrollments=total_enrollments,
        total_authorized_slots=total_authorized_slots,
        saturday_authorized_slots=saturday_authorized_slots,
        avg_subjects_per_student=round(total_enrollments / max(1, len(dataset.students)), 2),
    )

    return dataset, DatasetValidationResponse(valid=not has_errors, issues=issues, summary=summary)


def load_dataset_from_path(path: Path) -> AcademicDataset:
    """Load and validate an AcademicDataset JSON file from disk."""
    with path.open("r", encoding="utf-8") as fh:
        raw = json.load(fh)
    dataset, report = validate_academic_dataset(raw)
    if dataset is None or not report.valid:
        errors = "; ".join(i.message for i in report.issues if i.severity == "error")
        raise ValueError(f"Dataset inválido en {path}: {errors}")
    return dataset


def save_dataset_to_path(dataset: AcademicDataset, path: Path) -> None:
    """Persist an AcademicDataset cleanly as formatted JSON."""
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as fh:
        json.dump(dataset.model_dump(), fh, indent=2, ensure_ascii=False)


def get_active_dataset_path() -> Path:
    """Return custom active dataset path if one was uploaded, else default demo dataset."""
    custom_path = settings.generated_dir / "active_dataset.json"
    if custom_path.exists():
        return custom_path
    return settings.default_dataset_path


def load_active_dataset() -> AcademicDataset:
    """Load the currently active dataset."""
    return load_dataset_from_path(get_active_dataset_path())


def set_custom_active_dataset(dataset: AcademicDataset) -> Path:
    """Persist an uploaded valid dataset as the active dataset without touching DB/simulacion_academica.json."""
    custom_path = settings.generated_dir / "active_dataset.json"
    save_dataset_to_path(dataset, custom_path)
    return custom_path


def reset_to_default_dataset() -> AcademicDataset:
    """Remove custom uploaded dataset override and restore the reproducible seed-42 demo dataset."""
    custom_path = settings.generated_dir / "active_dataset.json"
    if custom_path.exists():
        custom_path.unlink()
    return load_dataset_from_path(settings.default_dataset_path)
