# Arquitectura del Sistema — CronoGraph

## 1. Principio rector: Cero duplicación matemática

Todas las operaciones matriciales, construcción de grafos, verificación de restricciones duras y algoritmos de optimización se ejecutan exclusivamente en el **backend Python**. El frontend actúa como capa interactiva de visualización, exploración y control de experimentos.

```text
React + TypeScript (Vite) ──HTTP/JSON──▶ FastAPI REST API ──▶ NetworkX / NumPy / OR-Tools
       │                                                               │
  Cytoscape.js / Recharts / FullCalendar                     DB/simulacion_academica.json
                                                             DB/generated/active_dataset.json
                                                             DB/results/run_<id>.json
```

---

## 2. Capas del Backend (`backend/app/`)

- `schemas/schemas.py`: Contratos Pydantic v2 compartidos con la especificación OpenAPI.
- `services/dataset_service.py`: Validación estructural, referencial y horaria, además de aislamiento entre `DB/simulacion_academica.json` y cargas personalizadas (`DB/generated/`).
- `services/academic_weights.py`, `graph_builder.py`, `conflict_calculator.py`: Motor matemático puro.
- `services/constraints.py`: Validador independiente de factibilidad (`domain_ok`, `duration_ok`, `no_student_overlap`, `no_teacher_overlap`, `no_room_overlap`).
- `services/calendar_evaluator.py`: Evaluación completa y generación de razones cuantitativas de reprogramación.
- `optimization/`: `local_search.py`, `random_restarts.py`, `ortools_solver.py`.
- `api/routes.py`: Endpoints REST sin estado global mutable entre corridas.

---

## 3. Capas del Frontend (`frontend/src/`)

- `types/academic.ts` & `services/cronoApi.ts`: Cliente Axios tipado espejo de Pydantic.
- `context/SimulationContext.tsx`: Estado reactivo sincronizado con el backend.
- `components/`: Layout responsivo (`MainLayout`), primitivas visuales y KaTeX (`MathBlock`).
- `pages/`: Las 6 páginas solicitadas (`Home`, `MathematicalModel`, `Data`, `Graphs`, `Optimization`, `Results`).
