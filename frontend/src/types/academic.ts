export interface DatasetMetadata {
  name: string;
  description: string;
  seed: number | null;
  is_synthetic: boolean;
  generated_at: string;
  semester: string;
  exam_window_start: string;
  exam_window_end: string;
}

export interface Teacher {
  id: string;
  name: string;
  department: string;
  email: string;
}

export interface ClassScheduleSession {
  day_of_week: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';
  start_time: string;
  end_time: string;
  room: string | null;
}

export interface Subject {
  id: string;
  code: string;
  name: string;
  credits: number;
  historical_withdrawal_rate: number;
  department: string;
}

export interface Group {
  id: string;
  code: string;
  subject_id: string;
  teacher_id: string;
  regular_schedule: ClassScheduleSession[];
}

export interface AuthorizedSlot {
  slot_id: string;
  date: string;
  start_time: string;
  end_time: string;
  slot_type: 'regular_class' | 'authorized_saturday';
  authorized: boolean;
  room: string | null;
}

export interface Exam {
  id: string;
  name: string;
  subject_id: string;
  group_id: string;
  teacher_id: string;
  evaluation_percentage: number;
  duration_minutes: number;
  initial_slot_id: string;
  authorized_slots: AuthorizedSlot[];
}

export interface Enrollment {
  subject_id: string;
  group_id: string;
}

export interface Student {
  id: string;
  name: string;
  program: string;
  is_synthetic: boolean;
  enrollments: Enrollment[];
}

export interface AcademicDataset {
  metadata: DatasetMetadata;
  teachers: Teacher[];
  subjects: Subject[];
  groups: Group[];
  exams: Exam[];
  students: Student[];
}

export interface ValidationIssue {
  severity: 'error' | 'warning';
  code: string;
  message: string;
  entity_id: string | null;
}

export interface DatasetSummaryStats {
  num_students: number;
  num_subjects: number;
  num_teachers: number;
  num_groups: number;
  num_exams: number;
  num_enrollments: number;
  total_authorized_slots: number;
  saturday_authorized_slots: number;
  avg_subjects_per_student: number;
}

export interface DatasetValidationResponse {
  valid: boolean;
  issues: ValidationIssue[];
  summary: DatasetSummaryStats | null;
}

export interface BipartiteNode {
  id: string;
  label: string;
  node_type: 'student' | 'exam';
  metadata: Record<string, unknown>;
}

export interface BipartiteEdge {
  id: string;
  source: string;
  target: string;
  subject_id: string;
  group_id: string;
}

export interface BipartiteGraphResponse {
  nodes: BipartiteNode[];
  edges: BipartiteEdge[];
  stats: {
    student_nodes: number;
    exam_nodes: number;
    enrollment_edges: number;
  };
}

export interface ConflictNode {
  id: string;
  label: string;
  subject_id: string;
  subject_name: string;
  group_id: string;
  teacher_id: string;
  teacher_name: string;
  credits: number;
  evaluation_percentage: number;
  historical_withdrawal_rate: number;
  academic_weight: number;
  enrolled_students: number;
  assigned_slot_id: string;
  assigned_date: string;
  assigned_start_time: string;
  assigned_end_time: string;
  slot_type: string;
  weighted_degree: number;
}

export interface ConflictEdge {
  id: string;
  source: string;
  target: string;
  shared_students: number;
  w_i: number;
  w_j: number;
  h_ij: number;
  delta_days: number;
  temporal_penalty: number;
  k_ij: number;
  has_active_penalty: boolean;
}

export interface ConflictGraphResponse {
  schedule_mode: string;
  nodes: ConflictNode[];
  edges: ConflictEdge[];
  total_objective_f: number;
  active_conflict_edges: number;
  zero_penalty_edges: number;
  total_conflict_edges: number;
}

export interface ConstraintViolation {
  constraint_type: string;
  message: string;
  exam_ids: string[];
}

export interface FeasibilityReport {
  is_feasible: boolean;
  domain_ok: boolean;
  duration_ok: boolean;
  no_student_overlap: boolean;
  no_teacher_overlap: boolean;
  no_room_overlap: boolean;
  violations: ConstraintViolation[];
}

export interface ExamEvaluationDetail {
  exam_id: string;
  exam_name: string;
  subject_name: string;
  teacher_name: string;
  assigned_slot_id: string;
  assigned_date: string;
  assigned_start_time: string;
  assigned_end_time: string;
  slot_type: string;
  academic_weight: number;
  incident_penalty_k: number;
  active_conflicts_count: number;
}

export interface DistanceBucketMetric {
  delta_label: string;
  delta_days: number;
  pair_count: number;
  total_shared_students: number;
  total_k_ij: number;
}

export interface StudentConcentrationBucket {
  bucket_label: string;
  student_count: number;
}

export interface CalendarEvaluationResponse {
  total_objective_f: number;
  feasibility: FeasibilityReport;
  active_conflict_pairs: number;
  zero_penalty_pairs: number;
  affected_students_count: number;
  distance_distribution: DistanceBucketMetric[];
  concentration_distribution: StudentConcentrationBucket[];
  exam_details: ExamEvaluationDetail[];
  edge_details: ConflictEdge[];
}

export interface ConvergencePoint {
  step: number;
  restart: number;
  iteration: number;
  current_cost: number;
  best_cost: number;
  event: string;
}

export interface ExamRescheduleExplanation {
  exam_id: string;
  exam_name: string;
  subject_code: string;
  subject_name: string;
  teacher_name: string;
  original_slot_id: string;
  original_date: string;
  original_time: string;
  proposed_slot_id: string;
  proposed_date: string;
  proposed_time: string;
  proposed_slot_type: string;
  changed: boolean;
  isolated_penalty_delta: number;
  contextual_incident_before: number;
  contextual_incident_after: number;
  reason: string;
}

export interface SolverRunSummary {
  algorithm: string;
  status: string;
  is_feasible: boolean;
  initial_cost: number;
  final_cost: number;
  reduction_absolute: number;
  reduction_percentage: number;
  iterations: number;
  restarts_executed: number;
  execution_time_ms: number;
  modified_exams_count: number;
  optimality_proven: boolean;
  assignment: Record<string, string>;
  convergence_trace: ConvergencePoint[];
}

export interface OptimizationResult {
  run_id: string;
  created_at: string;
  dataset_name: string;
  seed: number;
  restarts: number;
  algorithm_requested: string;
  primary_solver: SolverRunSummary;
  comparison_solver: SolverRunSummary | null;
  initial_evaluation: CalendarEvaluationResponse;
  optimized_evaluation: CalendarEvaluationResponse;
  reschedule_explanations: ExamRescheduleExplanation[];
  incremental_verification_max_error: number;
}

export interface OptimizationRequest {
  algorithm: 'local_search' | 'ortools' | 'both';
  restarts: number;
  seed: number;
  ortools_time_limit_seconds: number;
}
