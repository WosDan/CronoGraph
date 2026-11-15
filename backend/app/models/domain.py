"""Internal domain representation of the compiled academic graph model."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from typing import Dict, List, Set, Tuple

import networkx as nx
import numpy as np

from app.schemas.schemas import AcademicDataset, AuthorizedSlot, Exam, Subject, Teacher


@dataclass
class CompiledAcademicModel:
    """Immutable compiled mathematical structures derived from an AcademicDataset."""

    dataset: AcademicDataset
    student_ids: List[str]
    exam_ids: List[str]
    exam_index: Dict[str, int]
    exams_by_id: Dict[str, Exam]
    subjects_by_id: Dict[str, Subject]
    teachers_by_id: Dict[str, Teacher]
    slots_by_exam: Dict[str, Dict[str, AuthorizedSlot]]
    slot_dates: Dict[str, Dict[str, date]]
    slot_minutes: Dict[str, Dict[str, Tuple[int, int]]]
    incidence_matrix_b: np.ndarray
    co_enrollment_matrix_a: np.ndarray
    academic_weights_w: Dict[str, float]
    fixed_weights_h: Dict[Tuple[str, str], float]
    neighbors: Dict[str, List[str]]
    students_per_exam: Dict[str, Set[str]]
    bipartite_graph: nx.Graph
    conflict_graph: nx.Graph
