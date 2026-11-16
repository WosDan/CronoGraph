"""Reproducible synthetic dataset generator (seed=42) for CronoGraph."""

from __future__ import annotations

import random
from datetime import date, datetime, time, timedelta, timezone
from typing import Dict, List, Tuple

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

SEED = 42
WINDOW_START = date(2026, 11, 16)  # Monday
WINDOW_END = date(2026, 12, 5)     # Saturday (3 full weeks)

WEEKDAY_TO_INDEX = {
    "Monday": 0,
    "Tuesday": 1,
    "Wednesday": 2,
    "Thursday": 3,
    "Friday": 4,
    "Saturday": 5,
}

FIRST_NAMES = [
    "Mateo", "Sofía", "Sebastián", "Valentina", "Santiago", "Camila", "Nicolás", "Lucía",
    "Daniel", "Mariana", "Alejandro", "Isabella", "Tomás", "Gabriela", "Samuel", "Paula",
    "Emiliano", "Laura", "Andrés", "Sara", "Martín", "Juliana", "Juan", "Carolina",
    "Felipe", "Natalia", "Diego", "Elena", "Lucas", "Andrea",
]

LAST_NAMES = [
    "Gómez", "Rodríguez", "Martínez", "López", "García", "Pérez", "Sánchez", "Ramírez",
    "Torres", "Flores", "Rivera", "Morales", "Rojas", "Ortiz", "Vargas", "Castro",
    "Mendoza", "Herrera", "Ruiz", "Díaz", "Romero", "Álvarez", "Navarro", "Jiménez",
]

PROGRAMS = [
    "Ingeniería de Sistemas",
    "Ingeniería Industrial",
    "Matemáticas Aplicadas",
    "Ciencia de Datos",
    "Ingeniería Electrónica",
]

SUBJECT_CATALOG = [
    ("MAT-101", "Cálculo Diferencial", 4, 0.24, "Matemáticas"),
    ("MAT-102", "Álgebra Lineal", 4, 0.21, "Matemáticas"),
    ("DIS-201", "Matemáticas Discretas", 4, 0.18, "Ciencias de la Computación"),
    ("PRG-103", "Programación Orientada a Objetos", 3, 0.14, "Ingeniería de Sistemas"),
    ("EST-202", "Probabilidad y Estadística", 3, 0.22, "Estadística"),
    ("FIS-104", "Física Mecánica", 4, 0.28, "Física"),
    ("EDD-205", "Estructuras de Datos y Grafos", 4, 0.19, "Ciencias de la Computación"),
    ("CAL-203", "Cálculo Integral", 4, 0.26, "Matemáticas"),
    ("BDD-301", "Bases de Datos Relacionales", 3, 0.11, "Ingeniería de Sistemas"),
    ("OPT-304", "Investigación de Operaciones", 3, 0.15, "Ingeniería Industrial"),
    ("ARQ-206", "Arquitectura de Computadores", 3, 0.12, "Ingeniería Electrónica"),
    ("LOG-105", "Lógica Matemática", 2, 0.09, "Ciencias de la Computación"),
    ("ANA-305", "Análisis Numérico", 3, 0.17, "Matemáticas"),
    ("ECO-204", "Economía para Ingeniería", 2, 0.06, "Ingeniería Industrial"),
    ("RED-302", "Redes y Sistemas Distribuidos", 5, 0.31, "Ingeniería de Sistemas"),
]

TEACHER_CATALOG = [
    ("DOC-01", "Prof. Ficticio Dr. Carlos Méndez", "Matemáticas"),
    ("DOC-02", "Prof. Ficticia Dra. Beatriz Salazar", "Ciencias de la Computación"),
    ("DOC-03", "Prof. Ficticio MSc. Ricardo Patiño", "Ingeniería de Sistemas"),
    ("DOC-04", "Prof. Ficticia Dra. Helena Cárdenas", "Estadística"),
    ("DOC-05", "Prof. Ficticio Dr. Javier Montoya", "Física"),
    ("DOC-06", "Prof. Ficticia MSc. Claudia Benítez", "Matemáticas"),
    ("DOC-07", "Prof. Ficticio Dr. Fernando Lozano", "Ingeniería Industrial"),
    ("DOC-08", "Prof. Ficticia Dra. Patricia Quintero", "Ciencias de la Computación"),
    ("DOC-09", "Prof. Ficticio MSc. Sergio Velasco", "Ingeniería Electrónica"),
    ("DOC-10", "Prof. Ficticia Dra. Mónica Fajardo", "Matemáticas"),
    ("DOC-11", "Prof. Ficticio Dr. Álvaro Peñaloza", "Ingeniería de Sistemas"),
    ("DOC-12", "Prof. Ficticia MSc. Diana Rincón", "Ingeniería Industrial"),
]

# Diverse weekly class patterns (2 sessions per week, 120 min each) so exams fit comfortably (90 or 120 min)
CLASS_PATTERNS: List[Tuple[Tuple[str, str, str], Tuple[str, str, str]]] = [
    (("Monday", "07:00", "09:00"), ("Wednesday", "07:00", "09:00")),
    (("Monday", "09:00", "11:00"), ("Wednesday", "09:00", "11:00")),
    (("Monday", "11:00", "13:00"), ("Wednesday", "11:00", "13:00")),
    (("Monday", "14:00", "16:00"), ("Wednesday", "14:00", "16:00")),
    (("Monday", "16:00", "18:00"), ("Wednesday", "16:00", "18:00")),
    (("Tuesday", "07:00", "09:00"), ("Thursday", "07:00", "09:00")),
    (("Tuesday", "09:00", "11:00"), ("Thursday", "09:00", "11:00")),
    (("Tuesday", "11:00", "13:00"), ("Thursday", "11:00", "13:00")),
    (("Tuesday", "14:00", "16:00"), ("Thursday", "14:00", "16:00")),
    (("Tuesday", "16:00", "18:00"), ("Thursday", "16:00", "18:00")),
    (("Wednesday", "18:00", "20:00"), ("Friday", "18:00", "20:00")),
    (("Tuesday", "18:00", "20:00"), ("Friday", "07:00", "09:00")),
    (("Monday", "18:00", "20:00"), ("Friday", "09:00", "11:00")),
    (("Thursday", "18:00", "20:00"), ("Friday", "11:00", "13:00")),
    (("Friday", "14:00", "16:00"), ("Monday", "11:00", "13:00")),
    (("Friday", "16:00", "18:00"), ("Wednesday", "14:00", "16:00")),
]

SATURDAY_DATES = [date(2026, 11, 21), date(2026, 11, 28), date(2026, 12, 5)]
SATURDAY_BANDS = [("08:00", "10:00"), ("10:30", "12:30")]


def _dates_for_weekday(start: date, end: date, weekday_name: str) -> List[date]:
    target_idx = WEEKDAY_TO_INDEX[weekday_name]
    results = []
    cur = start
    while cur <= end:
        if cur.weekday() == target_idx:
            results.append(cur)
        cur += timedelta(days=1)
    return results


def _time_overlap(a_start: str, a_end: str, b_start: str, b_end: str) -> bool:
    sa = time.fromisoformat(a_start)
    ea = time.fromisoformat(a_end)
    sb = time.fromisoformat(b_start)
    eb = time.fromisoformat(b_end)
    return sa < eb and sb < ea


def generate_dataset(seed: int = SEED) -> AcademicDataset:
    rng = random.Random(seed)

    teachers: List[Teacher] = [
        Teacher(
            id=tid,
            name=name,
            department=dept,
            email=f"{tid.lower()}@cronograph.edu.sim",
        )
        for tid, name, dept in TEACHER_CATALOG
    ]

    subjects: List[Subject] = [
        Subject(
            id=f"SUB-{idx + 1:02d}",
            code=code,
            name=name,
            credits=credits,
            historical_withdrawal_rate=withdrawal,
            department=dept,
        )
        for idx, (code, name, credits, withdrawal, dept) in enumerate(SUBJECT_CATALOG)
    ]

    # 20 groups across the 15 subjects: first 5 subjects have 2 groups (A, B), remaining 10 have 1 group
    groups: List[Group] = []
    group_specs: List[Tuple[str, str, Subject, str, Tuple[Tuple[str, str, str], Tuple[str, str, str]]]] = []

    teacher_pattern_used: Dict[str, List[Tuple[str, str, str]]] = {t.id: [] for t in teachers}

    group_counter = 1
    for s_idx, subj in enumerate(subjects):
        num_groups = 2 if s_idx < 5 else 1
        for g_num in range(num_groups):
            gid = f"GRP-{group_counter:02d}"
            gcode = f"{subj.code}-{'A' if g_num == 0 else 'B'}"

            # Select teacher and non-conflicting regular class pattern for that teacher
            assigned_teacher = teachers[(group_counter - 1) % len(teachers)]
            chosen_pattern = None
            for offset in range(len(CLASS_PATTERNS)):
                cand = CLASS_PATTERNS[(group_counter + offset) % len(CLASS_PATTERNS)]
                conflict = False
                for sess in cand:
                    for existing in teacher_pattern_used[assigned_teacher.id]:
                        if sess[0] == existing[0] and _time_overlap(sess[1], sess[2], existing[1], existing[2]):
                            conflict = True
                            break
                    if conflict:
                        break
                if not conflict:
                    chosen_pattern = cand
                    break

            assert chosen_pattern is not None
            teacher_pattern_used[assigned_teacher.id].extend(chosen_pattern)

            sessions = [
                ClassScheduleSession(
                    day_of_week=sess[0],
                    start_time=sess[1],
                    end_time=sess[2],
                    room=f"AULA-{(group_counter % 10) + 101}",
                )
                for sess in chosen_pattern
            ]
            groups.append(
                Group(
                    id=gid,
                    code=gcode,
                    subject_id=subj.id,
                    teacher_id=assigned_teacher.id,
                    regular_schedule=sessions,
                )
            )
            group_specs.append((gid, gcode, subj, assigned_teacher.id, chosen_pattern))
            group_counter += 1

    # Generate 120 synthetic students with 4 to 6 distinct subjects each (1 specific group per subject)
    groups_by_subject: Dict[str, List[Group]] = {}
    for g in groups:
        groups_by_subject.setdefault(g.subject_id, []).append(g)

    students: List[Student] = []
    # Give core subjects slightly higher enrollment density so conflict graph is rich and realistic
    subject_weights = [2.2 if idx < 5 else (1.5 if idx < 10 else 1.0) for idx in range(len(subjects))]

    for i in range(1, 121):
        sid = f"EST-{i:03d}"
        full_name = f"{rng.choice(FIRST_NAMES)} {rng.choice(LAST_NAMES)} {rng.choice(LAST_NAMES)} (Sim)"
        program = rng.choice(PROGRAMS)
        target_count = rng.choice([4, 5, 5, 6])

        chosen_subjects: List[Subject] = []
        pool = list(subjects)
        weights = list(subject_weights)
        while len(chosen_subjects) < target_count:
            picked = rng.choices(pool, weights=weights, k=1)[0]
            p_idx = pool.index(picked)
            chosen_subjects.append(picked)
            pool.pop(p_idx)
            weights.pop(p_idx)

        enrollments: List[Enrollment] = []
        for subj in chosen_subjects:
            grp = rng.choice(groups_by_subject[subj.id])
            enrollments.append(Enrollment(subject_id=subj.id, group_id=grp.id))

        students.append(
            Student(
                id=sid,
                name=full_name,
                program=program,
                is_synthetic=True,
                enrollments=enrollments,
            )
        )

    # Build shared-enrollment lookup between groups so initial assignment is 100% feasible (no simultaneous overlaps)
    students_per_group: Dict[str, set[str]] = {g.id: set() for g in groups}
    for st in students:
        for enr in st.enrollments:
            students_per_group[enr.group_id].add(st.id)

    # Generate 20 exams (one per group) with domain D_i = regular class sessions + explicitly authorized Saturdays
    exams_draft: List[dict] = []
    for idx, (gid, gcode, subj, tid, _pattern) in enumerate(group_specs):
        eid = f"PAR-{idx + 1:02d}"
        grp = next(g for g in groups if g.id == gid)
        duration = 120 if subj.credits >= 4 else 90
        pct = round(rng.choice([0.20, 0.25, 0.30, 0.35]), 2)

        authorized_slots: List[AuthorizedSlot] = []
        slot_idx = 1

        for sess in grp.regular_schedule:
            matching_dates = _dates_for_weekday(WINDOW_START, WINDOW_END, sess.day_of_week)
            for dt in matching_dates:
                # Compute end time equal to session end_time (120 min window, exam fits inside)
                authorized_slots.append(
                    AuthorizedSlot(
                        slot_id=f"{eid}-S{slot_idx:02d}",
                        date=dt.isoformat(),
                        start_time=sess.start_time,
                        end_time=sess.end_time,
                        slot_type="regular_class",
                        authorized=True,
                        room=sess.room,
                    )
                )
                slot_idx += 1

        # Add 1 or 2 explicitly authorized Saturday slots for ~60% of exams
        if idx % 5 != 4:
            sat_date = SATURDAY_DATES[idx % len(SATURDAY_DATES)]
            band = SATURDAY_BANDS[idx % len(SATURDAY_BANDS)]
            authorized_slots.append(
                AuthorizedSlot(
                    slot_id=f"{eid}-S{slot_idx:02d}",
                    date=sat_date.isoformat(),
                    start_time=band[0],
                    end_time=band[1],
                    slot_type="authorized_saturday",
                    authorized=True,
                    room=f"AUD-SAB-{(idx % 4) + 1}",
                )
            )
            slot_idx += 1
            if idx % 2 == 0:
                sat_date_2 = SATURDAY_DATES[(idx + 1) % len(SATURDAY_DATES)]
                band_2 = SATURDAY_BANDS[(idx + 1) % len(SATURDAY_BANDS)]
                authorized_slots.append(
                    AuthorizedSlot(
                        slot_id=f"{eid}-S{slot_idx:02d}",
                        date=sat_date_2.isoformat(),
                        start_time=band_2[0],
                        end_time=band_2[1],
                        slot_type="authorized_saturday",
                        authorized=True,
                        room=f"AUD-SAB-{(idx % 4) + 1}",
                    )
                )

        # Sort slots chronologically so Week 1 comes first
        authorized_slots.sort(key=lambda s: (s.date, s.start_time))

        exams_draft.append(
            {
                "id": eid,
                "name": f"Parcial 2 — {subj.name} ({gcode})",
                "subject_id": subj.id,
                "group_id": gid,
                "teacher_id": tid,
                "evaluation_percentage": pct,
                "duration_minutes": duration,
                "authorized_slots": authorized_slots,
            }
        )

    # Pick feasible initial slots concentrated in Week 1 (first chronological slots) to create realistic initial congestion
    chosen_initial: Dict[str, AuthorizedSlot] = {}
    for draft in exams_draft:
        eid = draft["id"]
        gid = draft["group_id"]
        tid = draft["teacher_id"]
        dur = draft["duration_minutes"]

        selected: AuthorizedSlot | None = None
        for cand in draft["authorized_slots"]:
            cand_start_m = int(cand.start_time[:2]) * 60 + int(cand.start_time[3:])
            cand_end_m = cand_start_m + dur

            conflict = False
            for other_eid, other_slot in chosen_initial.items():
                if other_slot.date != cand.date:
                    continue
                other_draft = next(d for d in exams_draft if d["id"] == other_eid)
                other_dur = other_draft["duration_minutes"]
                other_start_m = int(other_slot.start_time[:2]) * 60 + int(other_slot.start_time[3:])
                other_end_m = other_start_m + other_dur

                if cand_start_m < other_end_m and other_start_m < cand_end_m:
                    shares_student = bool(students_per_group[gid] & students_per_group[other_draft["group_id"]])
                    same_teacher = tid == other_draft["teacher_id"]
                    if shares_student or same_teacher:
                        conflict = True
                        break
            if not conflict:
                selected = cand
                break

        if selected is None:
            raise RuntimeError(f"No se pudo hallar slot inicial factible para {eid}")
        chosen_initial[eid] = selected

    exams: List[Exam] = [
        Exam(
            id=d["id"],
            name=d["name"],
            subject_id=d["subject_id"],
            group_id=d["group_id"],
            teacher_id=d["teacher_id"],
            evaluation_percentage=d["evaluation_percentage"],
            duration_minutes=d["duration_minutes"],
            initial_slot_id=chosen_initial[d["id"]].slot_id,
            authorized_slots=d["authorized_slots"],
        )
        for d in exams_draft
    ]

    dataset = AcademicDataset(
        metadata=DatasetMetadata(
            name=f"Simulación Académica CronoGraph ({seed})",
            description=(
                "Conjunto de datos sintético y reproducible con 120 estudiantes ficticios, "
                "15 asignaturas, 12 docentes y 20 parciales programados en un periodo de 3 semanas "
                "con sesiones habituales de clase y espacios de sábado explícitamente autorizados."
            ),
            seed=seed,
            is_synthetic=True,
            generated_at=datetime.now(timezone.utc).isoformat(),
            semester="2026-2",
            exam_window_start=WINDOW_START.isoformat(),
            exam_window_end=WINDOW_END.isoformat(),
        ),
        teachers=teachers,
        subjects=subjects,
        groups=groups,
        exams=exams,
        students=students,
    )
    return dataset


