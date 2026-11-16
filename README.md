<div align="center">

# ◈ CronoGraph

### **Menos choques. Mejores horarios.**

Una aplicación interactiva para visualizar y optimizar la programación de parciales universitarios mediante grafos y optimización combinatoria.

<br>

[![Python](https://img.shields.io/badge/Python-3.12%2B-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![React](https://img.shields.io/badge/React-19-149ECA?style=for-the-badge&logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![FastAPI](https://img.shields.io/badge/API-FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)

<br>

[**Explorar el repositorio**](https://github.com/WosDan/CronoGraph)　·　[**Puesta en marcha**](#-puesta-en-marcha)　·　[**API**](#-api)

<br>

> **Proyecto académico · Matemáticas Discretas**  
> Universidad del Norte · Barranquilla, Colombia

</div>

---

## ✦ Navegación

<div align="center">

`01 · Funcionalidades`　 `02 · Aplicación`　 `03 · Modelo`　 `04 · Tecnología`  
`05 · Instalación`　 `06 · Dataset`　 `07 · API`　 `08 · Despliegue`

</div>

---

## ✦ El proyecto

CronoGraph transforma los registros de matrícula en grafos de conflicto para ayudar a construir calendarios de parciales con menos choques entre estudiantes. La aplicación compara una programación inicial con alternativas optimizadas, respetando las franjas autorizadas para cada examen.

### Lo que puedes hacer

- Explorar un dataset académico sintético y validarlo antes de usarlo.
- Inspeccionar el grafo bipartito estudiante–parcial y el grafo ponderado de conflictos.
- Comparar el calendario inicial con una propuesta optimizada.
- Ejecutar búsqueda local con reinicios aleatorios, Google OR-Tools CP-SAT o ambos.
- Evaluar factibilidad, penalización, cambios de horario y métricas de estudiantes.
- Consultar resultados en gráficas y calendario, y exportar información a JSON o CSV.

### Recorrido por la aplicación

| Sección | Ruta | Contenido |
|---|---|---|
| Inicio | `/` | Presentación del problema, flujo del modelo y resumen del dataset. |
| Modelo matemático | `/modelo-matematico` | Formulación, variables y criterios de evaluación. |
| Datos | `/datos` | Exploración, validación, carga y descarga del dataset JSON. |
| Grafos | `/grafos` | Grafo bipartito y grafo de conflictos, con vistas inicial y optimizada. |
| Optimización | `/optimizacion` | Ejecución y comparación de los algoritmos disponibles. |
| Resultados | `/resultados` | Indicadores, visualizaciones, calendario y explicaciones de cambios. |

## ⌘ Del registro al calendario

1. La relación de matrícula se representa mediante una matriz estudiante–parcial `B`.
2. El producto `A = BᵀB` obtiene los conflictos entre pares de parciales: `Aᵢⱼ` cuenta estudiantes compartidos.
3. Cada parcial `i` solo puede asignarse a una franja de su dominio autorizado `Dᵢ`.
4. Una función objetivo penaliza la cercanía entre parciales que comparten estudiantes.
5. La búsqueda local explora calendarios factibles; CP-SAT permite contrastar con un solucionador exacto sujeto al límite de tiempo configurado.

Las franjas regulares deben coincidir con sesiones de clase del grupo y las franjas sabatinas deben estar identificadas explícitamente como autorizadas.

## ⚙ Tecnología

| Componente | Herramientas principales |
|---|---|
| Interfaz | React 19, TypeScript, Vite, Tailwind CSS v4 |
| Visualización | Cytoscape.js, Recharts, FullCalendar, KaTeX |
| API | Python, FastAPI, Pydantic |
| Modelo y optimización | NumPy, NetworkX, Google OR-Tools CP-SAT |
| Persistencia de demostración | Dataset JSON; archivos JSON para ejecuciones guardadas |

## Estructura del proyecto

```text
CronoGraph/
├── backend/                 API FastAPI, modelo, servicios y pruebas
├── frontend/                Aplicación React + TypeScript
├── DB/                      Dataset académico y datos de ejecución
├── docs/                    Documentación del proyecto
├── scripts/                 Generación y validación del dataset
├── Dockerfile               Imagen de despliegue de la API
├── railway.json             Configuración de Railway
└── frontend/vercel.json     Configuración de Vercel
```

## Requisitos

- Python **3.12 o superior** y `pip`.
- Node.js **20 o superior** y npm.
- Git para clonar el repositorio.

## 🚀 Puesta en marcha

### 1 · Obtener el código

```bash
git clone https://github.com/WosDan/CronoGraph.git
cd CronoGraph
```

### 2 · Preparar e iniciar la API

Crea un entorno virtual desde la raíz:

```bash
python -m venv .venv
```

Actívalo en Windows PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
```

O en macOS/Linux:

```bash
source .venv/bin/activate
```

Instala e inicia el backend desde la raíz:

```bash
python -m pip install -r backend/requirements.txt
uvicorn app.main:app --app-dir backend --reload --host 127.0.0.1 --port 8000
```

La documentación interactiva estará en <http://127.0.0.1:8000/docs> y el estado del servicio en <http://127.0.0.1:8000/api/health>.

### 3 · Iniciar la interfaz

En una segunda terminal, desde la raíz:

```bash
cd frontend
npm ci
npm run dev
```

Abre la dirección que indique Vite, normalmente <http://localhost:5173>. En desarrollo, el cliente usa por defecto `http://127.0.0.1:8000/api`.

<details>
<summary><strong>Configuración opcional con variables de entorno</strong></summary>

<br>

Las variables tienen valores locales predeterminados. Copia `.env.example` a `.env` en la raíz y ajusta los valores si necesitas personalizarlos:

```dotenv
CRONOGRAPH_ENV=development
CRONOGRAPH_HOST=127.0.0.1
CRONOGRAPH_PORT=8000
CRONOGRAPH_CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
CRONOGRAPH_DB_DIR=./DB
VITE_API_BASE_URL=http://127.0.0.1:8000/api
```

`VITE_API_BASE_URL` se lee al compilar el frontend. Tras cambiarla, reinicia el servidor de desarrollo o vuelve a compilar la aplicación.

</details>

## ◈ Dataset de demostración

El archivo [`DB/simulacion_academica.json`](DB/simulacion_academica.json) contiene datos **sintéticos** reproducibles, generados con semilla `42`:

| Entidad | Cantidad | Detalle |
|---|---:|---|
| Estudiantes | 120 | Ficticios, identificados como sintéticos. |
| Matrículas | 595 | Entre 4 y 6 asignaturas por estudiante. |
| Asignaturas | 15 | Con créditos e índices históricos de retiro. |
| Docentes | 12 | Asociados a grupos y parciales. |
| Parciales | 20 | Con franjas de clase y sábados autorizados. |

Para regenerar y validar el dataset desde la raíz:

```bash
python scripts/generate_dataset.py
python scripts/validate_dataset.py
```

> **Nota:** regenerar el archivo sustituye el dataset de demostración actual. Los datos no representan estudiantes ni registros institucionales reales.

## ⌘ API

La documentación interactiva en `/docs` describe todos los esquemas y parámetros. Endpoints principales:

| Método | Endpoint | Uso |
|---|---|---|
| `GET` | `/api/health` | Estado de la API y disponibilidad del dataset. |
| `GET` | `/api/dataset` | Obtener el dataset activo. |
| `POST` | `/api/dataset/validate` | Validar un JSON sin activarlo. |
| `POST` | `/api/dataset/upload` | Validar y activar un dataset. |
| `POST` | `/api/dataset/reset` | Restaurar el dataset de demostración. |
| `GET` | `/api/graphs/bipartite` | Obtener el grafo estudiante–parcial. |
| `GET` | `/api/graphs/conflicts` | Obtener el grafo de conflictos. |
| `POST` | `/api/calendar/evaluate` | Evaluar un calendario propuesto. |
| `POST` | `/api/optimization/run` | Ejecutar la optimización. |
| `GET` | `/api/optimization/results` | Listar ejecuciones guardadas. |

## ✓ Verificación

Con el entorno virtual activo, ejecuta desde la raíz:

```bash
python -m pytest -p no:hydra backend/tests -v
```

Para probar y compilar la interfaz, desde `frontend/`:

<<<<<<< HEAD
=======
## 5.1 Publicar una demo (Netlify + Render)

La interfaz estática se publica en Netlify y la API FastAPI en Render. Netlify no ejecuta directamente este backend Python.

1. Sube este proyecto a un repositorio de GitHub.
2. En Render, crea un **Blueprint** desde ese repositorio; detectará `render.yaml`. Espera a que el servicio `cronograph-api` quede publicado. Comprueba `https://TU-API.onrender.com/api/health`.
3. Copia la URL pública de la API y agrégale `/api` (por ejemplo `https://TU-API.onrender.com/api`).
4. En la configuración de entorno del servicio de Netlify, define `VITE_API_BASE_URL` con esa URL y `CRONOGRAPH_CORS_ORIGINS` en Render con el dominio asignado por Netlify (por ejemplo `https://TU-SITIO.netlify.app`). Si ya tienes dominio propio, inclúyelo separado por comas junto al dominio Netlify.
5. En Netlify, importa el mismo repositorio. `netlify.toml` configura el directorio `frontend`, el build y el fallback para rutas de React. Vuelve a desplegar después de guardar las variables.
6. Comprueba el flujo en `https://TU-SITIO.netlify.app`: debe cargar datos, abrir Grafos y permitir una corrida en Optimización. También revisa `https://TU-API.onrender.com/api/health`.

**Nota para la presentación:** en el nivel gratuito, Render puede suspender el servicio cuando no se usa; al abrirlo de nuevo, el primer acceso puede tardar. Los resultados de optimización y los datasets cargados se guardan en el disco local del servicio, que no debe considerarse persistente entre reinicios o despliegues. Para una exposición, usa el dataset incluido y ejecuta la optimización antes de presentar.

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
>>>>>>> 28faf5c6ae8a3dc654ec47f531a3cde2cf5a2b68
```bash
npm test
npm run build
```

## ☁ Despliegue

El despliegue separa **la API en Railway** y **la interfaz en Vercel**, conectadas al mismo repositorio: [github.com/WosDan/CronoGraph](https://github.com/WosDan/CronoGraph).

### Railway · API

1. Crea un proyecto y conecta el repositorio.
2. Usa la raíz del repositorio como directorio del servicio. `railway.json` y `Dockerfile` configuran el build y el inicio de FastAPI.
3. Añade un volumen persistente montado en `/data`. El contenedor configura `CRONOGRAPH_DB_DIR=/data` y copia allí el dataset inicial si aún no existe.
4. Configura las variables:

   ```dotenv
   CRONOGRAPH_ENV=production
   CRONOGRAPH_CORS_ORIGINS=https://TU-FRONTEND.vercel.app
   CRONOGRAPH_DB_DIR=/data
   ```

5. Genera un dominio público para la API y comprueba `https://TU-API.up.railway.app/api/health`.

### Vercel · Interfaz

1. Importa el mismo repositorio.
2. Define `frontend` como **Root Directory** y configura `VITE_API_BASE_URL` con la URL de la API y el prefijo `/api`:

   ```dotenv
   VITE_API_BASE_URL=https://TU-API.up.railway.app/api
   ```

3. Despliega la interfaz y copia su dominio público.
4. Actualiza `CRONOGRAPH_CORS_ORIGINS` en Railway con el origen exacto del frontend (protocolo incluido, sin ruta ni barra final) y vuelve a desplegar la API si es necesario.

<details>
<summary><strong>Persistencia y datos en producción</strong></summary>

<br>

El JSON incluido proporciona el dataset inicial. La API guarda datasets activos y resultados en `CRONOGRAPH_DB_DIR`; para conservar esos cambios después de reinicios y nuevos despliegues, monta un volumen persistente de Railway en `/data`. Sin ese volumen, los datos escritos durante la ejecución pueden perderse. Los cambios en variables `VITE_*` requieren una nueva compilación del frontend.

</details>

## ◇ Alcance del modelo

- Las franjas disponibles se toman de las opciones autorizadas; el sistema no deduce disponibilidad por ausencia de clases.
- La penalización temporal usa un horizonte de cuatro días calendario, `P(Δ) = max(0, 4 − Δ)`. Es un parámetro metodológico del proyecto, no una regla universal.
- La búsqueda local es una metaheurística y no garantiza el óptimo global. CP-SAT sirve como contraste sujeto al límite de tiempo configurado.

---

<div align="center">

### ¿Listo para explorar CronoGraph?

[![Abrir repositorio](https://img.shields.io/badge/ABRIR_REPOSITORIO-CronoGraph-6C63FF?style=for-the-badge&logo=github&logoColor=white)](https://github.com/WosDan/CronoGraph)

**Universidad del Norte** · Barranquilla, Colombia  
*Matemáticas Discretas · Proyecto académico*

</div>
