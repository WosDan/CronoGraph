"""Academic weight computation service: W_i = C_i * p_i * (1 + r_i / 2)."""

from __future__ import annotations

from typing import Dict

from app.schemas.schemas import AcademicDataset


def compute_academic_weight(credits: int, evaluation_percentage: float, withdrawal_rate: float) -> float:
    """Compute exact academic weight W_i = C_i * p_i * (1 + r_i / 2)."""
    return float(credits) * float(evaluation_percentage) * (1.0 + float(withdrawal_rate) / 2.0)


def compute_all_academic_weights(dataset: AcademicDataset) -> Dict[str, float]:
    """Return mapping exam_id -> W_i for every exam in the dataset."""
    subjects_by_id = {subj.id: subj for subj in dataset.subjects}
    weights: Dict[str, float] = {}
    for exam in dataset.exams:
        subj = subjects_by_id[exam.subject_id]
        weights[exam.id] = compute_academic_weight(
            credits=subj.credits,
            evaluation_percentage=exam.evaluation_percentage,
            withdrawal_rate=subj.historical_withdrawal_rate,
        )
    return weights
