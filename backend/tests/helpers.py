"""Shared helpers and small verifiable synthetic academic instances for pytest."""

from __future__ import annotations

from datetime import datetime, timezone

from app.schemas.schemas import (
    AcademicDataset,
    AuthorizedSlot,
    ClassScheduleSession,
    DatasetMetadata,
    Enrollment,
    Exam,
    Group,
    Student,
    Subject,
    Teacher,
)


def make_small_dataset(infeasible: bool = False) -> AcademicDataset:
    """Create a 3-exam, 4-student dataset small enough for exact exhaustive verification."""
    teachers = [
        Teacher(id="T1", name="Docente 1", department="Mat", email="t1@sim.edu"),
        Teacher(id="T2", name="Docente 2", department="Sis", email="t2@sim.edu"),
    ]
    subjects = [
        Subject(id="S1", code="M1", name="Mat 1", credits=4, historical_withdrawal_rate=0.20, department="Mat"),
        Subject(id="S2", code="M2", name="Mat 2", credits=3, historical_withdrawal_rate=0.10, department="Sis"),
        Subject(id="S3", code="M3", name="Mat 3", credits=2, historical_withdrawal_rate=0.0, department="Mat"),
    ]
    groups = [
        Group(
            id="G1",
            code="M1-A",
            subject_id="S1",
            teacher_id="T1",
            regular_schedule=[ClassScheduleSession(day_of_week="Monday", start_time="08:00", end_time="10:00", room="R1")],
        ),
        Group(
            id="G2",
            code="M2-A",
            subject_id="S2",
            teacher_id="T2",
            regular_schedule=[ClassScheduleSession(day_of_week="Monday", start_time="10:00", end_time="12:00", room="R2")],
        ),
        Group(
            id="G3",
            code="M3-A",
            subject_id="S3",
            teacher_id="T1",
            regular_schedule=[ClassScheduleSession(day_of_week="Tuesday", start_time="08:00", end_time="10:00", room="R3")],
        ),
    ]

    if infeasible:
        exams = [
            Exam(
                id="E1",
                name="Parcial 1",
                subject_id="S1",
                group_id="G1",
                teacher_id="T1",
                evaluation_percentage=0.30,
                duration_minutes=90,
                initial_slot_id="E1-S1",
                authorized_slots=[
                    AuthorizedSlot(slot_id="E1-S1", date="2026-11-16", start_time="08:00", end_time="10:00", slot_type="regular_class", authorized=True, room="R1"),
                ],
            ),
            Exam(
                id="E2",
                name="Parcial 2",
                subject_id="S2",
                group_id="G2",
                teacher_id="T2",
                evaluation_percentage=0.25,
                duration_minutes=90,
                initial_slot_id="E2-S1",
                authorized_slots=[
                    AuthorizedSlot(slot_id="E2-S1", date="2026-11-16", start_time="08:00", end_time="10:00", slot_type="regular_class", authorized=True, room="R2"),
                ],
            ),
        ]
    else:
        exams = [
            Exam(
                id="E1",
                name="Parcial 1",
                subject_id="S1",
                group_id="G1",
                teacher_id="T1",
                evaluation_percentage=0.30,
                duration_minutes=90,
                initial_slot_id="E1-S1",
                authorized_slots=[
                    AuthorizedSlot(slot_id="E1-S1", date="2026-11-16", start_time="08:00", end_time="10:00", slot_type="regular_class", authorized=True, room="R1"),
                    AuthorizedSlot(slot_id="E1-S2", date="2026-11-23", start_time="08:00", end_time="10:00", slot_type="regular_class", authorized=True, room="R1"),
                ],
            ),
            Exam(
                id="E2",
                name="Parcial 2",
                subject_id="S2",
                group_id="G2",
                teacher_id="T2",
                evaluation_percentage=0.25,
                duration_minutes=90,
                initial_slot_id="E2-S1",
                authorized_slots=[
                    AuthorizedSlot(slot_id="E2-S1", date="2026-11-16", start_time="10:00", end_time="12:00", slot_type="regular_class", authorized=True, room="R2"),
                    AuthorizedSlot(slot_id="E2-S2", date="2026-11-21", start_time="08:00", end_time="10:00", slot_type="authorized_saturday", authorized=True, room="AUD-1"),
                ],
            ),
            Exam(
                id="E3",
                name="Parcial 3",
                subject_id="S3",
                group_id="G3",
                teacher_id="T1",
                evaluation_percentage=0.20,
                duration_minutes=90,
                initial_slot_id="E3-S1",
                authorized_slots=[
                    AuthorizedSlot(slot_id="E3-S1", date="2026-11-17", start_time="08:00", end_time="10:00", slot_type="regular_class", authorized=True, room="R3"),
                    AuthorizedSlot(slot_id="E3-S2", date="2026-11-28", start_time="10:00", end_time="12:00", slot_type="authorized_saturday", authorized=True, room="AUD-2"),
                ],
            ),
        ]

    if infeasible:
        students = [
            Student(id="ST1", name="Est 1", program="Sis", is_synthetic=True, enrollments=[Enrollment(subject_id="S1", group_id="G1"), Enrollment(subject_id="S2", group_id="G2")]),
            Student(id="ST2", name="Est 2", program="Sis", is_synthetic=True, enrollments=[Enrollment(subject_id="S1", group_id="G1"), Enrollment(subject_id="S2", group_id="G2")]),
        ]
    else:
        students = [
            Student(id="ST1", name="Est 1", program="Sis", is_synthetic=True, enrollments=[Enrollment(subject_id="S1", group_id="G1"), Enrollment(subject_id="S2", group_id="G2"), Enrollment(subject_id="S3", group_id="G3")]),
            Student(id="ST2", name="Est 2", program="Sis", is_synthetic=True, enrollments=[Enrollment(subject_id="S1", group_id="G1"), Enrollment(subject_id="S2", group_id="G2"), Enrollment(subject_id="S3", group_id="G3")]),
            Student(id="ST3", name="Est 3", program="Mat", is_synthetic=True, enrollments=[Enrollment(subject_id="S1", group_id="G1"), Enrollment(subject_id="S2", group_id="G2")]),
            Student(id="ST4", name="Est 4", program="Mat", is_synthetic=True, enrollments=[Enrollment(subject_id="S2", group_id="G2"), Enrollment(subject_id="S3", group_id="G3")]),
        ]

    return AcademicDataset(
        metadata=DatasetMetadata(
            name="Instancia Pequeña Verificable",
            description="Caso de prueba exacto",
            seed=1,
            is_synthetic=True,
            generated_at=datetime.now(timezone.utc).isoformat(),
            exam_window_start="2026-11-16",
            exam_window_end="2026-11-30",
        ),
        teachers=teachers,
        subjects=subjects,
        groups=groups,
        exams=exams,
        students=students,
    )
