# Diccionario de Datos (`DB/simulacion_academica.json`)

## Estructura raíz (`AcademicDataset`)

| Campo | Tipo | Descripción |
| :--- | :--- | :--- |
| `metadata` | `DatasetMetadata` | Nombre, descripción, semilla (`42`), bandera `is_synthetic`, semestre y ventana de fechas. |
| `teachers` | `Teacher[]` | Catálogo de docentes (`id`, `name`, `department`, `email`). |
| `subjects` | `Subject[]` | Asignaturas (`id`, `code`, `name`, `credits` en `[2,5]`, `historical_withdrawal_rate` en `[0, 0.35]`). |
| `groups` | `Group[]` | Secciones específicas (`id`, `code`, `subject_id`, `teacher_id`, `regular_schedule`). |
| `exams` | `Exam[]` | Parciales a programar (`id`, `name`, `subject_id`, `group_id`, `teacher_id`, `evaluation_percentage`, `duration_minutes`, `initial_slot_id`, `authorized_slots`). |
| `students` | `Student[]` | Estudiantes sintéticos (`id`, `name`, `program`, `is_synthetic`, `enrollments`). |

---

## Entidades clave

### `AuthorizedSlot` (elementos de $D_i$)
- `slot_id`: identificador único de la franja dentro del parcial.
- `date`: fecha ISO (`YYYY-MM-DD`).
- `start_time` / `end_time`: horario `HH:MM` en formato 24h.
- `slot_type`: `"regular_class"` (sesión habitual del grupo) o `"authorized_saturday"` (espacio de sábado explícitamente autorizado).
- `authorized`: booleano obligatorio (`true` para ser elegible en $D_i$).
- `room`: aula asignada (opcional).

### `Enrollment`
- `subject_id`: identificador de la asignatura.
- `group_id`: grupo específico matriculado por el estudiante (garantiza que los conflictos entre grupos paralelos A y B no se mezclen indebidamente).
