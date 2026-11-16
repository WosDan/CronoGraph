# Arquitectura del Sistema — CronoGraph

## 1. Motor matemático y responsabilidades

El **backend Python** construye matrices y grafos, calcula el objetivo, valida las restricciones y ejecuta la optimización. El frontend visualiza y controla experimentos; también calcula comparaciones temporales individuales para la vista Estudiantes. La factibilidad autoritativa y el objetivo de optimización se evalúan en el backend.

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
- `api/routes.py`: Endpoints REST que leen el dataset activo y guardan resultados. La selección del dataset activo persiste en archivos; las corridas no constituyen sesiones de usuario aisladas.

---

## 3. Capas del Frontend (`frontend/src/`)

- `types/academic.ts` & `services/cronoApi.ts`: Cliente Axios tipado espejo de Pydantic.
- `context/SimulationContext.tsx`: Estado reactivo sincronizado con el backend.
- `components/`: Layout responsivo (`MainLayout`), primitivas visuales y KaTeX (`MathBlock`).
- `pages/`: Ocho vistas principales: `Home`, `Calendar`, `Students`, `MathematicalModel`, `Data`, `Graphs`, `Optimization` y `Results`.

## 4. Trazabilidad de decisiones

Los resultados reúnen parámetros, calendario inicial y propuesto, costos, validación y explicaciones de cambios. La interfaz permite inspeccionar la franja de cada parcial y comparar horarios individuales. Las explicaciones cuantitativas hacen revisable el criterio de programación; no son explicaciones causales de estrés, retiros o rendimiento.

CP-SAT se ejecuta como biblioteca local del backend de Railway, sin API de Google; Vercel aloja la interfaz. En modo combinado se proporciona la solución propia como pista y se selecciona el calendario factible de menor costo original. `OPTIMAL` certifica únicamente el objetivo redondeado a escala 10⁴.

La [corrida del informe](evidencia_simulador/ejecucion_2026-11-16.json) conserva huella del dataset, versiones y asignaciones. El [script de verificación complementario](../scripts/reproducir_informe.py) no sustituye el flujo de la aplicación ni su validación institucional.

## 5. Uso educativo y límites de la arquitectura actual

La transparencia busca facilitar discusión entre estudiantes, docentes y coordinadores sobre las opciones y sus consecuencias temporales. Un piloto real deberá validar datos, proteger su confidencialidad y autorizar fechas académicamente viables. El sistema no comprueba automáticamente el avance de contenidos ni puede detectar conflictos de aulas no identificadas. El indicador individual mide proximidad, no bienestar.

La persistencia en JSON y el dataset activo compartido corresponden al alcance del simulador. El despliegue no demuestra por sí solo que exista aislamiento multiusuario o que sea un sistema institucional listo para operación. Véase el [README](../README.md) para configuración y entrega académica.
