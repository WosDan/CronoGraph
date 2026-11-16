# Diccionario de Datos (`DB/simulacion_academica.json`)

## Estructura raíz (`AcademicDataset`)

| Campo | Tipo | Descripción |
| :--- | :--- | :--- |
| `metadata` | `DatasetMetadata` | Nombre, descripción, semilla (`42`), bandera `is_synthetic`, semestre y ventana de fechas. |
| `teachers` | `Teacher[]` | Catálogo de docentes (`id`, `name`, `department`, `email`). |
| `subjects` | `Subject[]` | Asignaturas (`id`, `code`, `name`, `credits` entero ≥1, `historical_withdrawal_rate` en `[0,1]`; los rangos `[2,5]` y `[0,0.35]` describen el generador de demostración). |
| `groups` | `Group[]` | Secciones específicas (`id`, `code`, `subject_id`, `teacher_id`, `regular_schedule`). |
| `exams` | `Exam[]` | Parciales a programar (`id`, `name`, `subject_id`, `group_id`, `teacher_id`, `evaluation_percentage`, `duration_minutes`, `initial_slot_id`, `authorized_slots`). |
| `students` | `Student[]` | Estudiantes (`id`, `name`, `program`, `is_synthetic`, `enrollments`). |

---

## Entidades clave

### `AuthorizedSlot` (elementos de $D_i$)
- `slot_id`: identificador único de la franja dentro del parcial.
- `date`: fecha ISO (`YYYY-MM-DD`).
- `start_time` / `end_time`: horario `HH:MM` en formato 24h.
- `slot_type`: `"regular_class"` (sesión habitual del grupo) o `"authorized_saturday"` (espacio de sábado explícitamente autorizado).
- `authorized`: booleano con valor predeterminado `true` en el esquema; debe ser `true` para ser elegible en $D_i$.
- `room`: aula asignada (opcional).

### `Enrollment`
- `subject_id`: identificador de la asignatura.
- `group_id`: grupo específico matriculado por el estudiante (garantiza que los conflictos entre grupos paralelos A y B no se mezclen indebidamente).

Para datos reales, ajusta las referencias entre entidades, marca `metadata.is_synthetic` y `students[].is_synthetic` como `false`, y usa fechas y franjas autorizadas reales. La carga requiere JSON con esta estructura; descarga el dataset activo desde la aplicación como ejemplo. Las tasas y porcentajes se expresan como fracciones: 0.25 equivale al 25 %.

## Interpretación, autorización y transparencia de los datos

- `credits` representa carga formal del período (48 horas por crédito), no horas exclusivas de preparación del parcial. `evaluation_percentage` es una fracción en `(0,1]`, no un porcentaje de 0 a 100.
- `historical_withdrawal_rate` es un indicador contextual. En datos reales se deberá documentar período, población y procedimiento de cálculo; su relación con causas de retiro no se deduce del campo. En la demo también es sintético.
- Cada parcial selecciona una única franja autorizada, con duración suficiente y a no más de 14 días calendario antes o después de la inicial, incluidos los extremos.
- `regular_class` debe corresponder al horario habitual del grupo; `authorized_saturday` requiere autorización explícita. La autorización académica debe considerar contenidos y preparación, que el simulador no comprueba automáticamente.
- `room` es opcional en el esquema. Una ausencia de aula impide verificar su ocupación; no significa que haya disponibilidad física confirmada.
- La validación comprueba estructura, relaciones y reglas registradas. No acredita que los registros sean verdaderos, completos o aprobados institucionalmente.

## Lectura de resultados y evidencia

La sección Estudiantes cuenta personas con menos, igual o más pares de parciales a 0–3 días. En cada horario el color refleja la menor separación frente a otro parcial: rojo 0–1 días, ámbar 2–3, verde ≥4 y gris sin otro parcial. No representa un diagnóstico de estrés ni una medición de rendimiento.

Para revisar una recomendación deben conservarse el dataset, sus franjas y autorizaciones, los parámetros, las asignaciones antes/después y el reporte de factibilidad. La [evidencia del informe](evidencia_simulador/ejecucion_2026-11-16.json) documenta la instancia sintética. Esta trazabilidad puede apoyar decisiones educativas transparentes; su utilidad real requiere pilotos y evaluación con la comunidad académica.
