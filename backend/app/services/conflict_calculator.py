"""Temporal penalty, fixed edge weight H_ij, dynamic weight K_ij, and objective F."""

from __future__ import annotations

from datetime import date
from typing import Dict, Tuple

from app.models.domain import CompiledAcademicModel


def temporal_penalty(delta_days: int) -> int:
    """Compute P(Delta) = max(0, 4 - Delta) where Delta is calendar days apart."""
    return max(0, 4 - int(delta_days))


def compute_fixed_edge_weight(shared_students: int, w_i: float, w_j: float) -> float:
    """Compute fixed structural edge weight H_ij = A_ij * (W_i + W_j) / 2."""
    return float(shared_students) * (float(w_i) + float(w_j)) / 2.0


def compute_dynamic_edge_weight(h_ij: float, delta_days: int) -> float:
    """Compute dynamic conflict edge weight K_ij = H_ij * P(Delta_ij)."""
    return float(h_ij) * float(temporal_penalty(delta_days))


def calendar_days_between(date_a: date, date_b: date) -> int:
    """Return absolute calendar day distance |d_i - d_j|."""
    return abs((date_a - date_b).days)


def compute_objective_function(model: CompiledAcademicModel, assignment: Dict[str, str]) -> float:
    """Compute exact objective F = sum_{i < j} K_ij without duplicate pairs."""
    total_f = 0.0
    assigned_dates: Dict[str, date] = {
        eid: model.slot_dates[eid][slot_id]
        for eid, slot_id in assignment.items()
    }
    for (u, v), h_uv in model.fixed_weights_h.items():
        delta = calendar_days_between(assigned_dates[u], assigned_dates[v])
        total_f += compute_dynamic_edge_weight(h_uv, delta)
    return total_f
