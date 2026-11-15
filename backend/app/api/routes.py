"""FastAPI REST API routes for CronoGraph."""

from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query

from app.core.config import settings
from app.optimization.ortools_solver import solve_with_ortools
from app.optimization.random_restarts import solve_with_random_restarts
from app.schemas.schemas import (
    AcademicDataset,
    BipartiteGraphResponse,
    CalendarEvaluationRequest,
    CalendarEvaluationResponse,
    ConflictGraphResponse,
    DatasetValidationResponse,
    OptimizationRequest,
    OptimizationResult,
)
from app.services.calendar_evaluator import (
    build_bipartite_graph_response,
    build_conflict_graph_response,
    build_reschedule_explanations,
    evaluate_calendar,
    get_initial_assignment,
)
from app.services.dataset_service import (
    load_active_dataset,
    reset_to_default_dataset,
    set_custom_active_dataset,
    validate_academic_dataset,
)
from app.services.graph_builder import build_compiled_model

router = APIRouter(prefix="/api", tags=["CronoGraph"])


def _load_compiled():
    dataset = load_active_dataset()
    return dataset, build_compiled_model(dataset)


def _save_run_result(result: OptimizationResult) -> None:
    out_path = settings.results_dir / f"run_{result.run_id}.json"
    with out_path.open("w", encoding="utf-8") as fh:
        json.dump(result.model_dump(), fh, indent=2, ensure_ascii=False)


def _load_run_result(run_id: str) -> OptimizationResult:
    path = settings.results_dir / f"run_{run_id}.json"
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"Ejecución '{run_id}' no encontrada.")
    with path.open("r", encoding="utf-8") as fh:
        return OptimizationResult.model_validate(json.load(fh))


@router.get("/health")
def health_check() -> Dict[str, Any]:
    """Verify API status and availability of the active dataset."""
    try:
        dataset = load_active_dataset()
        return {
            "status": "ok",
            "service": settings.app_name,
            "version": settings.app_version,
            "dataset_loaded": True,
            "dataset_name": dataset.metadata.name,
            "num_students": len(dataset.students),
            "num_exams": len(dataset.exams),
        }
    except Exception as exc:
        return {
            "status": "degraded",
            "service": settings.app_name,
            "dataset_loaded": False,
            "error": str(exc),
        }


@router.get("/dataset", response_model=AcademicDataset)
def get_dataset() -> AcademicDataset:
    """Return the active academic JSON dataset."""
    try:
        return load_active_dataset()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"No se pudo cargar el dataset activo: {exc}") from exc


@router.post("/dataset/validate", response_model=DatasetValidationResponse)
def validate_dataset_endpoint(payload: Dict[str, Any]) -> DatasetValidationResponse:
    """Validate an arbitrary JSON payload against CronoGraph academic and mathematical rules."""
    _, report = validate_academic_dataset(payload)
    return report


@router.post("/dataset/upload", response_model=DatasetValidationResponse)
def upload_dataset(payload: Dict[str, Any]) -> DatasetValidationResponse:
    """Validate and activate a custom JSON dataset without overwriting the original demo JSON."""
    dataset, report = validate_academic_dataset(payload)
    if not report.valid or dataset is None:
        raise HTTPException(
            status_code=422,
            detail={
                "message": "El dataset cargado presenta errores de validación.",
                "issues": [i.model_dump() for i in report.issues],
            },
        )
    set_custom_active_dataset(dataset)
    return report


@router.post("/dataset/reset", response_model=AcademicDataset)
def reset_dataset() -> AcademicDataset:
    """Restore the reproducible seed-42 demonstration dataset."""
    return reset_to_default_dataset()


@router.get("/graphs/bipartite", response_model=BipartiteGraphResponse)
def get_bipartite_graph() -> BipartiteGraphResponse:
    """Build and return the Student-Exam bipartite graph from the active dataset."""
    _, model = _load_compiled()
    return build_bipartite_graph_response(model)


@router.get("/graphs/conflicts", response_model=ConflictGraphResponse)
def get_conflict_graph(
    mode: str = Query(default="initial", pattern="^(initial|optimized)$"),
    run_id: Optional[str] = Query(default=None),
) -> ConflictGraphResponse:
    """
    Build and return the weighted conflict graph (edges never disappear when K_ij == 0).
    Supports viewing either the initial schedule or an optimized run schedule.
    """
    _, model = _load_compiled()
    if mode == "optimized":
        if not run_id:
            raise HTTPException(status_code=400, detail="Se requiere 'run_id' cuando mode='optimized'.")
        run_result = _load_run_result(run_id)
        assignment = run_result.primary_solver.assignment
    else:
        assignment = get_initial_assignment(model)
    return build_conflict_graph_response(model, assignment, schedule_mode=mode)


@router.post("/calendar/evaluate", response_model=CalendarEvaluationResponse)
def evaluate_calendar_endpoint(req: CalendarEvaluationRequest) -> CalendarEvaluationResponse:
    """Evaluate objective function F, feasibility, and student metrics for any provided assignment."""
    _, model = _load_compiled()
    return evaluate_calendar(model, req.assignment)


@router.post("/optimization/run", response_model=OptimizationResult)
def run_optimization(req: OptimizationRequest) -> OptimizationResult:
    """Execute real combinatorial optimization (Random-Restart Local Search, OR-Tools CP-SAT, or both)."""
    dataset, model = _load_compiled()
    initial_assignment = get_initial_assignment(model)
    initial_eval = evaluate_calendar(model, initial_assignment)

    comparison_solver = None
    max_inc_err = 0.0

    if req.algorithm == "local_search":
        ls_outcome = solve_with_random_restarts(model, restarts=req.restarts, seed=req.seed)
        primary_solver = ls_outcome.summary
        max_inc_err = ls_outcome.max_incremental_error
    elif req.algorithm == "ortools":
        primary_solver = solve_with_ortools(model, time_limit_seconds=req.ortools_time_limit_seconds)
    else:  # "both"
        ls_outcome = solve_with_random_restarts(model, restarts=req.restarts, seed=req.seed)
        primary_solver = ls_outcome.summary
        max_inc_err = ls_outcome.max_incremental_error
        comparison_solver = solve_with_ortools(model, time_limit_seconds=req.ortools_time_limit_seconds)

    if not primary_solver.is_feasible:
        raise HTTPException(
            status_code=422,
            detail={
                "message": "No se encontró una solución factible que cumpla todas las restricciones obligatorias.",
                "status": primary_solver.status,
                "algorithm": primary_solver.algorithm,
            },
        )

    optimized_eval = evaluate_calendar(model, primary_solver.assignment)
    if not optimized_eval.feasibility.is_feasible:
        raise HTTPException(
            status_code=500,
            detail="Error interno: el solucionador produjo una asignación infactible.",
        )

    explanations = build_reschedule_explanations(model, initial_assignment, primary_solver.assignment)
    run_id = uuid.uuid4().hex[:10]

    result = OptimizationResult(
        run_id=run_id,
        created_at=datetime.now(timezone.utc).isoformat(),
        dataset_name=dataset.metadata.name,
        seed=req.seed,
        restarts=req.restarts,
        algorithm_requested=req.algorithm,
        primary_solver=primary_solver,
        comparison_solver=comparison_solver,
        initial_evaluation=initial_eval,
        optimized_evaluation=optimized_eval,
        reschedule_explanations=explanations,
        incremental_verification_max_error=round(max_inc_err, 12),
    )
    _save_run_result(result)
    return result


@router.get("/optimization/results", response_model=List[OptimizationResult])
def list_optimization_results() -> List[OptimizationResult]:
    """List saved optimization runs sorted by most recent first."""
    results: List[OptimizationResult] = []
    for path in sorted(settings.results_dir.glob("run_*.json"), key=lambda p: p.stat().st_mtime, reverse=True):
        try:
            with path.open("r", encoding="utf-8") as fh:
                results.append(OptimizationResult.model_validate(json.load(fh)))
        except Exception:
            continue
    return results


@router.get("/optimization/results/{run_id}", response_model=OptimizationResult)
def get_optimization_result(run_id: str) -> OptimizationResult:
    """Retrieve a specific persisted optimization result by ID."""
    return _load_run_result(run_id)
