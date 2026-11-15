# CronoGraph

**CronoGraph** es una aplicación web académica diseñada para la asignatura de **Matemáticas Discretas**, orientada a modelar, analizar y optimizar la programación de exámenes parciales universitarios mediante **teoría de grafos ponderados**, **restricciones de disponibilidad institucional** y **algoritmos de optimización combinatoria**.

---

## 1. Objetivo académico

Demostrar de forma rigurosa, empírica e interactiva cómo un problema real de congestión de evaluaciones parciales se transforma desde una relación de matrícula (grafo bipartito $G_B = (S \cup E, M)$) hacia un grafo ponderado de conflictos sobre los parciales ($A = B^\top B$), permitiendo minimizar una función de penalización temporal sin violar franjas docentes ni sesiones autorizadas.

---

## 2. Tecnologías utilizadas

### Backend
- **Python 3.12+**
- **FastAPI** + **Pydantic v2** (API REST tipada y validación estructural)
- **NetworkX** + **NumPy** (matrices $B$, $A = B^\top B$, grafos bipartito y de conflictos)
- **Google OR-Tools (CP-SAT)** (modelo exacto complementario)
- **pytest** (pruebas matemáticas, restricciones, optimización y API)

### Frontend
- **React 19** + **TypeScript** + **Vite**
- **Tailwind CSS v4**
- **React Router**
- **Cytoscape.js** (grafos interactivos bipartito y de conflictos)
- **Recharts** (gráficas estadísticas reales)
- **FullCalendar** (calendario comparativo)
- **KaTeX** (renderizado de ecuaciones)
- **Vitest** + **React Testing Library** (pruebas de interfaz y utilidades)

---

## 3. Arquitectura y secciones de la aplicación

La interfaz web sigue estrictamente seis secciones interconectadas con el backend:
1. **Inicio (`/`)**: Presentación del problema, flujo interactivo del modelo y métricas en vivo del dataset.
2. **Modelo matemático (`/modelo-matematico`)**: Explicación formal en KaTeX, laboratorio interactivo de variables y fundamentación científica.
3. **Datos (`/datos`)**: Exploración de los 120 estudiantes, 15 asignaturas, 12 docentes y 20 parciales; carga, validación y descarga JSON.
4. **Grafos (`/grafos`)**: Visualización interactiva con Cytoscape.js del grafo de conflictos (original vs. optimizado, conservando aristas con $K_{ij}=0$) y del grafo bipartito filtrado.
5. **Optimización (`/optimizacion`)**: Ejecución real de Búsqueda Local Incremental con Reinicios Aleatorios y comparación con Google OR-Tools CP-SAT.
6. **Resultados (`/resultados`)**: Panel analítico con 9 indicadores, 5 gráficas Recharts, FullCalendar comparativo, explicabilidad por parcial y exportación JSON/CSV.

---

## 4. Requisitos e instalación local

### Requisitos previos
- Python 3.12 o superior
- Node.js 20+ y npm

### Instalación del Backend
```bash
cd backend
pip install -r requirements.txt
```

### Instalación del Frontend
```bash
cd frontend
npm install
```

---

## 5. Ejecución local

### 1. Generar o validar la base de datos sintética (opcional, ya incluida)
```bash
python scripts/generate_dataset.py
python scripts/validate_dataset.py
```

### 2. Iniciar el servidor Backend (FastAPI)
Desde `backend/`:
```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
Documentación interactiva OpenAPI disponible en `http://127.0.0.1:8000/docs`.

### 3. Iniciar el Frontend (Vite)
Desde `frontend/`:
```bash
npm run dev
```
Abrir `http://localhost:5173`.

---

## 6. Base de datos sintética reproducible

El archivo `DB/simulacion_academica.json` se genera de forma determinista con **semilla `42`**:
- **120 estudiantes ficticios** (`EST-001` a `EST-120`, `is_synthetic: true`), cursando entre 4 y 6 asignaturas cada uno (595 matrículas totales).
- **15 asignaturas** con créditos entre 2 y 5 e índices históricos de retiro entre `0.06` y `0.31`.
- **12 docentes** y **20 grupos / parciales** con duraciones de 90 o 120 minutos y porcentajes de evaluación entre 20% y 35%.
- Cada parcial posee un dominio autorizado $D_i$ compuesto exclusivamente por sus sesiones habituales de clase dentro de la ventana de exámenes (`2026-11-16` a `2026-12-05`) y espacios de sábado explícitamente autorizados (`authorized_saturday`).

---

## 7. Pruebas automatizadas

### Pruebas matemáticas y de API (Backend)
Desde `backend/`:
```bash
python -m pytest -p no:hydra -v
```
Verifica exactitud de $W_i$, $B$, $A = B^\top B$, $P(\Delta)$, $H_{ij}$, $K_{ij}$, función objetivo $F$, restricciones duras, equivalencia exacta entre $\Delta F_i(t)$ incremental y evaluación completa, enumeración exhaustiva en instancia pequeña vs. Búsqueda Local y OR-Tools, manejo de infactibilidad y endpoints REST.

### Pruebas de interfaz y compilación (Frontend)
Desde `frontend/`:
```bash
npm test
npm run build
```

---

## 8. Limitaciones del modelo

- La disponibilidad docente no se infiere por ausencia de clases: únicamente se permiten reprogramaciones dentro de las franjas explícitamente listadas en $D_i$.
- El modelo asume un horizonte de penalización lineal de 4 días calendario ($P(\Delta) = \max(0, 4 - \Delta)$) y una ponderación académica específica de CronoGraph; dichos coeficientes son parámetros metodológicos de diseño y no constantes empíricas universales.
- En instancias grandes, la búsqueda local con reinicios aleatorios es una metaheurística y no garantiza optimalidad global sin la verificación de un solver exacto como CP-SAT.
