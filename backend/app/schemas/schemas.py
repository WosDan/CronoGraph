"""Pydantic schemas for CronoGraph academic datasets, graphs, evaluation, and optimization."""

from __future__ import annotations

from datetime import date, time
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field, field_validator, model_validator


class DatasetMetadata(BaseModel):
    """Metadata describing the origin and reproducibility of an academic dataset."""

    name: str
    description: str
    seed: Optional[int] = None
    is_synthetic: bool = True
    generated_at: str
    semester: str = "2026-2"
    exam_window_start: str
    exam_window_end: str


class Teacher(BaseModel):
    """Faculty member assigned to teach subjects/groups and supervise exams."""

    id: str
    name: str
    department: str
    email: str


class ClassScheduleSession(BaseModel):
    """Regular weekly class session of a group."""

    day_of_week: Literal["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
    start_time: str
    end_time: str
    room: Optional[str] = None


class Subject(BaseModel):
    """Academic course with credits and historical withdrawal rate."""

    id: str
    code: str
    name: str
    credits: int = Field(ge=2, le=5)
    historical_withdrawal_rate: float = Field(ge=0.0, le=0.35)
    department: str


class Group(BaseModel):
    """Specific course section/group taught by one teacher on a fixed regular schedule."""

    id: str
    code: str
    subject_id: str
    teacher_id: str
    regular_schedule: List[ClassScheduleSession] = Field(min_length=1)


class AuthorizedSlot(BaseModel):
    """Candidate date/time slot belonging to domain D_i of an exam."""

    slot_id: str
    date: str
    start_time: str
    end_time: str
    slot_type: Literal["regular_class", "authorized_saturday"]
    authorized: bool = True
    room: Optional[str] = None

    @field_validator("date")
    @classmethod
    def validate_iso_date(cls, value: str) -> str:
        date.fromisoformat(value)
        return value

    @model_validator(mode="after")
    def validate_times(self) -> "AuthorizedSlot":
        start = time.fromisoformat(self.start_time)
        end = time.fromisoformat(self.end_time)
        if end <= start:
            raise ValueError(f"Slot {self.slot_id}: end_time ({self.end_time}) must be after start_time ({self.start_time})")
        return self


class Exam(BaseModel):
    """Midterm evaluation to schedule within its authorized domain D_i."""

    id: str
    name: str
    subject_id: str
    group_id: str
    teacher_id: str
    evaluation_percentage: float = Field(gt=0.0, le=1.0)
    duration_minutes: int = Field(gt=0)
    initial_slot_id: str
    authorized_slots: List[AuthorizedSlot] = Field(min_length=1)


class Enrollment(BaseModel):
    """Student enrollment binding to a specific subject and group."""

    subject_id: str
    group_id: str


class Student(BaseModel):
    """Synthetic student enrolled in 4 to 6 subjects/groups."""

    id: str
    name: str
    program: str
    is_synthetic: bool = True
    enrollments: List[Enrollment] = Field(min_length=1)


class AcademicDataset(BaseModel):
    """Complete academic scheduling dataset for CronoGraph."""

    metadata: DatasetMetadata
    teachers: List[Teacher] = Field(min_length=1)
    subjects: List[Subject] = Field(min_length=1)
    groups: List[Group] = Field(min_length=1)
    exams: List[Exam] = Field(min_length=1)
    students: List[Student] = Field(min_length=1)


class ValidationIssue(BaseModel):
    """Single validation finding (error or warning) with entity context."""

    severity: Literal["error", "warning"]
    code: str
    message: str
    entity_id: Optional[str] = None


class DatasetSummaryStats(BaseModel):
    """High-level summary metrics derived directly from the active dataset."""

    num_students: int
    num_subjects: int
    num_teachers: int
    num_groups: int
    num_exams: int
    num_enrollments: int
    total_authorized_slots: int
    saturday_authorized_slots: int
    avg_subjects_per_student: float


class DatasetValidationResponse(BaseModel):
    """Result of full structural, semantic, and mathematical validation of a dataset."""

    valid: bool
    issues: List[ValidationIssue]
    summary: Optional[DatasetSummaryStats] = None


class BipartiteNode(BaseModel):
    id: str
    label: str
    node_type: Literal["student", "exam"]
    metadata: Dict[str, Any] = Field(default_factory=dict)


class BipartiteEdge(BaseModel):
    id: str
    source: str
    target: str
    subject_id: str
    group_id: str


class BipartiteGraphResponse(BaseModel):
    nodes: List[BipartiteNode]
    edges: List[BipartiteEdge]
    stats: Dict[str, Any]


class ConflictNode(BaseModel):
    id: str
    label: str
    subject_id: str
    subject_name: str
    group_id: str
    teacher_id: str
    teacher_name: str
    credits: int
    evaluation_percentage: float
    historical_withdrawal_rate: float
    academic_weight: float
    enrolled_students: int
    assigned_slot_id: str
    assigned_date: str
    assigned_start_time: str
    assigned_end_time: str
    slot_type: str
    weighted_degree: float


class ConflictEdge(BaseModel):
    id: str
    source: str
    target: str
    shared_students: int
    w_i: float
    w_j: float
    h_ij: float
    delta_days: int
    temporal_penalty: int
    k_ij: float
    has_active_penalty: bool


class ConflictGraphResponse(BaseModel):
    schedule_mode: str
    nodes: List[ConflictNode]
    edges: List[ConflictEdge]
    total_objective_f: float
    active_conflict_edges: int
    zero_penalty_edges: int
    total_conflict_edges: int


class ConstraintViolation(BaseModel):
    constraint_type: Literal[
        "authorized_domain",
        "duration_fit",
        "student_overlap",
        "teacher_overlap",
        "room_overlap",
    ]
    message: str
    exam_ids: List[str]


class FeasibilityReport(BaseModel):
    is_feasible: bool
    domain_ok: bool
    duration_ok: bool
    no_student_overlap: bool
    no_teacher_overlap: bool
    no_room_overlap: bool
    violations: List[ConstraintViolation] = Field(default_factory=list)


class ExamEvaluationDetail(BaseModel):
    exam_id: str
    exam_name: str
    subject_name: str
    teacher_name: str
    assigned_slot_id: str
    assigned_date: str
    assigned_start_time: str
    assigned_end_time: str
    slot_type: str
    academic_weight: float
    incident_penalty_k: float
    active_conflicts_count: int


class StudentConcentrationBucket(BaseModel):
    bucket_label: str
    student_count: int


class StudentImpactMetric(BaseModel):
    student_id: str
    student_name: str
    exam_count: int
    max_exams_in_4_days: int
    active_conflict_pairs: int
    personal_penalty: float


class DistanceBucketMetric(BaseModel):
    delta_label: str
    delta_days: int
    pair_count: int
    total_shared_students: int
    total_k_ij: float


class CalendarEvaluationRequest(BaseModel):
    assignment: Dict[str, str]  # exam_id -> slot_id


class CalendarEvaluationResponse(BaseModel):
    total_objective_f: float
    feasibility: FeasibilityReport
    active_conflict_pairs: int
    zero_penalty_pairs: int
    affected_students_count: int
    distance_distribution: List[DistanceBucketMetric]
    concentration_distribution: List[StudentConcentrationBucket]
    exam_details: List[ExamEvaluationDetail]
    edge_details: List[ConflictEdge]


class OptimizationRequest(BaseModel):
    algorithm: Literal["local_search", "ortools", "both"] = "local_search"
    restarts: int = Field(default=15, ge=1, le=200)
    seed: int = Field(default=42, ge=0, le=2_147_483_647)
    ortools_time_limit_seconds: float = Field(default=10.0, gt=0.1, le=120.0)


class ConvergencePoint(BaseModel):
    step: int
    restart: int
    iteration: int
    current_cost: float
    best_cost: float
    event: str


class ExamRescheduleExplanation(BaseModel):
    exam_id: str
    exam_name: str
    subject_code: str
    subject_name: str
    teacher_name: str
    original_slot_id: str
    original_date: str
    original_time: str
    proposed_slot_id: str
    proposed_date: str
    proposed_time: str
    proposed_slot_type: str
    changed: bool
    isolated_penalty_delta: float
    contextual_incident_before: float
    contextual_incident_after: float
    reason: str


class SolverRunSummary(BaseModel):
    algorithm: str
    status: str
    is_feasible: bool
    initial_cost: float
    final_cost: float
    reduction_absolute: float
    reduction_percentage: float
    iterations: int
    restarts_executed: int
    execution_time_ms: float
    modified_exams_count: int
    optimality_proven: bool
    assignment: Dict[str, str]
    convergence_trace: List[ConvergencePoint]


class OptimizationResult(BaseModel):
    run_id: str
    created_at: str
    dataset_name: str
    seed: int
    restarts: int
    algorithm_requested: str
    primary_solver: SolverRunSummary
    comparison_solver: Optional[SolverRunSummary] = None
    initial_evaluation: CalendarEvaluationResponse
    optimized_evaluation: CalendarEvaluationResponse
    reschedule_explanations: List[ExamRescheduleExplanation]
    incremental_verification_max_error: float
