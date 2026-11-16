"""Unit tests for hard institutional constraints: domain, duration, student/teacher/room overlaps."""

from __future__ import annotations

from app.services.constraints import evaluate_feasibility, can_assign_exam_slot
from app.services.graph_builder import build_compiled_model
from helpers import make_small_dataset


def test_reschedule_window_includes_14_days_and_rejects_15():
    dataset = make_small_dataset()
    exam = dataset.exams[0]
    original = exam.authorized_slots[0]
    for slot_id, date in [('before14', '2026-11-02'), ('after14', '2026-11-30'), ('before15', '2026-11-01'), ('after15', '2026-12-01')]:
        exam.authorized_slots.append(original.model_copy(update={'slot_id': slot_id, 'date': date}))
    model = build_compiled_model(dataset)
    for slot_id in ('before14', 'after14'):
        assert can_assign_exam_slot(model, {}, exam.id, slot_id)
    for slot_id in ('before15', 'after15'):
        assert not can_assign_exam_slot(model, {}, exam.id, slot_id)
        report = evaluate_feasibility(model, {'E1': slot_id, 'E2': 'E2-S1', 'E3': 'E3-S1'})
        assert not report.domain_ok
        assert any(v.constraint_type == 'reschedule_window' for v in report.violations)


def test_feasible_schedule_passes_all_constraints():
    dataset = make_small_dataset()
    model = build_compiled_model(dataset)
    report = evaluate_feasibility(model, {"E1": "E1-S1", "E2": "E2-S1", "E3": "E3-S1"})
    assert report.is_feasible is True
    assert report.domain_ok is True
    assert report.duration_ok is True
    assert report.no_student_overlap is True
    assert report.no_teacher_overlap is True
    assert report.no_room_overlap is True
    assert report.violations == []


def test_rejects_unauthorized_slot():
    dataset = make_small_dataset()
    dataset.exams[0].authorized_slots[0].authorized = False
    model = build_compiled_model(dataset)
    report = evaluate_feasibility(model, {"E1": "E1-S1", "E2": "E2-S1", "E3": "E3-S1"})
    assert report.is_feasible is False
    assert report.domain_ok is False


def test_rejects_slot_shorter_than_exam_duration():
    dataset = make_small_dataset()
    # Set exam E1 duration to 150 min inside a 120 min slot (08:00-10:00)
    dataset.exams[0].duration_minutes = 150
    model = build_compiled_model(dataset)
    report = evaluate_feasibility(model, {"E1": "E1-S1", "E2": "E2-S1", "E3": "E3-S1"})
    assert report.is_feasible is False
    assert report.duration_ok is False


def test_rejects_student_and_teacher_overlap():
    dataset = make_small_dataset(infeasible=True)
    model = build_compiled_model(dataset)
    report = evaluate_feasibility(model, {"E1": "E1-S1", "E2": "E2-S1"})
    assert report.is_feasible is False
    assert report.no_student_overlap is False

    # Same teacher overlap on E1 and E3 if placed at exact same date & time
    dataset2 = make_small_dataset()
    dataset2.exams[2].authorized_slots[0].date = "2026-11-16"
    dataset2.exams[2].authorized_slots[0].start_time = "08:00"
    dataset2.exams[2].authorized_slots[0].end_time = "10:00"
    model2 = build_compiled_model(dataset2)
    report2 = evaluate_feasibility(model2, {"E1": "E1-S1", "E2": "E2-S1", "E3": "E3-S1"})
    assert report2.is_feasible is False
    assert report2.no_teacher_overlap is False
