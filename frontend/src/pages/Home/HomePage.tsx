import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, GitBranch, Layers, ShieldCheck } from 'lucide-react';
import { useSimulation } from '../../context/SimulationContext';
import { Badge, Card, CardBody, CardHeader, MetricTile } from '../../components/ui/Primitives';

const PIPELINE_STEPS = [
  {
    id: 'datos',
    title: '1. Datos Académicos',
    route: '/datos',
    summary:
      'Estudiantes, asignaturas, créditos, porcentajes de evaluación, tasas de retiro, docentes y franjas autorizadas.',
    detail:
      'Solo se aceptan fechas dentro de las sesiones habituales de clase de cada grupo y los espacios de sábado explícitamente autorizados.',
  },
  {
    id: 'bipartito',
    title: '2. Grafo Bipartito',
    route: '/grafos',
    summary:
      'Representa las matrículas entre el conjunto de estudiantes S y el conjunto de parciales E mediante la matriz B.',
    detail:
      'B_si = 1 si el estudiante s presenta el parcial i. A partir de esta estructura se calcula A = B^T B con los estudiantes compartidos.',
  },
  {
    id: 'conflictos',
    title: '3. Grafo de Conflictos',
    route: '/grafos',
    summary:
      'Proyección ponderada sobre E donde cada arista conecta parciales con estudiantes compartidos (A_ij > 0).',
    detail:
      'Combina el componente estructural fijo H_ij con la penalización temporal dinámica P(Δ_ij) = max(0, 4 - Δ_ij).',
  },
  {
    id: 'restricciones',
    title: '4. Restricciones Duras',
    route: '/optimizacion',
    summary:
      'Verifica dominio autorizado x_i ∈ D_i, duración completa y cero solapamientos horarios simultáneos.',
    detail:
      'Ningún estudiante ni docente puede tener dos parciales superpuestos en el mismo intervalo horario de la misma fecha.',
  },
  {
    id: 'optimizacion',
    title: '5. Optimización',
    route: '/optimizacion',
    summary:
      'Búsqueda local incremental con reinicios aleatorios y comparación exacta mediante Google OR-Tools CP-SAT.',
    detail:
      'Calcula variaciones ΔF_i(t) en tiempo real sobre los vecinos del parcial y conserva la mejor solución factible.',
  },
  {
    id: 'resultados',
    title: '6. Resultados y Explicabilidad',
    route: '/resultados',
    summary:
      'Compara el calendario inicial frente al optimizado con métricas, gráficas, FullCalendar y razones matemáticas.',
    detail:
      'Exporta el análisis completo en JSON y CSV con el cambio contextual de penalización por cada parcial reprogramado.',
  },
];

export function HomePage() {
  const { dataset, initialConflictGraph, initialEvaluation, activeRun, loading } = useSimulation();
  const [selectedStepId, setSelectedStepId] = useState<string>('datos');

  const selectedStep =
    PIPELINE_STEPS.find((s) => s.id === selectedStepId) ?? PIPELINE_STEPS[0];

  const totalAuthorizedSlots = dataset
    ? dataset.exams.reduce((acc, ex) => acc + ex.authorized_slots.length, 0)
    : 0;

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <section className="rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 sm:p-8 text-white shadow-md">
        <div className="max-w-3xl space-y-4">
          <Badge variant="indigo">Matemáticas Discretas · Optimización Combinatoria</Badge>
          <h1 className="text-2xl sm:text-4xl font-bold tracking-tight">
            CronoGraph: Programación Óptima de Parciales con Teoría de Grafos
          </h1>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            Aplicación académica para modelar la congestión de evaluaciones universitarias mediante{' '}
            <strong className="text-white">grafos bipartitos</strong> y{' '}
            <strong className="text-white">grafos ponderados de conflictos</strong>, minimizando la
            carga académica simultánea sin violar horarios docentes ni franjas institucionales.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              to="/optimizacion"
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-400 transition-colors"
            >
              Ejecutar optimizador
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/modelo-matematico"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-900/60 px-4 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-800 transition-colors"
            >
              Explorar modelo matemático
            </Link>
          </div>
        </div>
      </section>

      {/* Live Metrics from Active Dataset */}
      <section aria-label="Indicadores del dataset activo">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <MetricTile
            label="Estudiantes"
            value={loading ? '...' : dataset?.students.length ?? 0}
            hint="Matrículas sintéticas"
          />
          <MetricTile
            label="Asignaturas"
            value={loading ? '...' : dataset?.subjects.length ?? 0}
            hint="Créditos 2 a 5"
          />
          <MetricTile
            label="Parciales (|E|)"
            value={loading ? '...' : dataset?.exams.length ?? 0}
            hint={`${totalAuthorizedSlots} franjas D_i`}
            accent="indigo"
          />
          <MetricTile
            label="Aristas de conflicto"
            value={loading ? '...' : initialConflictGraph?.total_conflict_edges ?? 0}
            hint="Pares con A_ij > 0"
          />
          <MetricTile
            label="Penalización inicial F"
            value={loading ? '...' : (initialEvaluation?.total_objective_f.toFixed(1) ?? '0.0')}
            hint={`${initialEvaluation?.active_conflict_pairs ?? 0} pares con Δ < 4`}
            accent="amber"
          />
          <MetricTile
            label="Mejor F optimizado"
            value={
              activeRun
                ? activeRun.primary_solver.final_cost.toFixed(1)
                : 'Sin ejecutar'
            }
            hint={
              activeRun
                ? `-${activeRun.primary_solver.reduction_percentage}% de reducción`
                : 'Ejecuta en Optimización'
            }
            accent={activeRun ? 'emerald' : 'slate'}
          />
        </div>
      </section>

      {/* Interactive Process Diagram */}
      <Card>
        <CardHeader
          title="Flujo interactivo del sistema"
          subtitle="Selecciona cada etapa para inspeccionar su función matemática y acceder directamente a su módulo"
        />
        <CardBody className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            {PIPELINE_STEPS.map((step) => {
              const active = step.id === selectedStep.id;
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => setSelectedStepId(step.id)}
                  className={`text-left rounded-xl border p-3.5 transition-all ${
                    active
                      ? 'border-indigo-600 bg-indigo-50/80 ring-2 ring-indigo-200'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <p className={`text-xs font-bold ${active ? 'text-indigo-700' : 'text-slate-700'}`}>
                    {step.title}
                  </p>
                  <p className="mt-1.5 text-xs text-slate-600 line-clamp-3">{step.summary}</p>
                </button>
              );
            })}
          </div>

          <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-indigo-950">{selectedStep.title}</p>
              <p className="text-sm text-slate-700">{selectedStep.detail}</p>
            </div>
            <Link
              to={selectedStep.route}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
            >
              Ir al módulo
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </CardBody>
      </Card>

      {/* Academic Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card>
          <CardBody className="space-y-2.5">
            <div className="flex items-center gap-2 text-indigo-700 font-semibold text-sm">
              <Layers className="h-4 w-4" />
              <span>El problema de concentración</span>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              Cuando múltiples asignaturas programan sus evaluaciones parciales en días consecutivos o
              el mismo día, los estudiantes con matrículas compartidas sufren sobrecarga cognitiva y
              riesgo académico, especialmente en cursos de altos créditos, peso porcentual o retiro
              histórico.
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-2.5">
            <div className="flex items-center gap-2 text-indigo-700 font-semibold text-sm">
              <GitBranch className="h-4 w-4" />
              <span>Por qué teoría de grafos</span>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              El producto matricial <code className="font-mono text-xs bg-slate-100 px-1 py-0.5 rounded">A = BᵀB</code>{' '}
              transforma el grafo bipartito estudiante-parcial en un grafo ponderado de conflictos.
              Esto permite aislar el peso estructural fijo <code className="font-mono text-xs bg-slate-100 px-1 py-0.5 rounded">H_ij</code>{' '}
              de la distancia temporal dinámica y aplicar evaluación incremental O(|N(i)|).
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-2.5">
            <div className="flex items-center gap-2 text-emerald-700 font-semibold text-sm">
              <ShieldCheck className="h-4 w-4" />
              <span>Restricciones institucionales estrictas</span>
            </div>
            <ul className="space-y-1.5 text-sm text-slate-600">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>Solo sesiones habituales de clase del docente o sábados autorizados.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>Verificación de duración completa del examen dentro del bloque horario.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>Cero superposiciones simultáneas para estudiantes o docentes.</span>
              </li>
            </ul>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
