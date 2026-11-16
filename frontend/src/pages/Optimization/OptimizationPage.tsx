import { useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CheckCircle2, HelpCircle, Play, RotateCcw, ShieldAlert, Zap } from 'lucide-react';
import { useSimulation } from '../../context/SimulationContext';
import { Badge, Card, CardBody, CardHeader, MetricTile } from '../../components/ui/Primitives';

function HelpTooltip({ label, text }: { label: string; text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        aria-label={`Ayuda sobre ${label}`}
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="ml-1.5 inline-flex items-center text-slate-400 hover:text-indigo-600 focus:outline-none"
      >
        <HelpCircle className="h-3.5 w-3.5" />
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-30 w-64 rounded-lg bg-slate-900 px-3 py-2 text-[11px] font-normal text-slate-100 shadow-lg leading-relaxed"
        >
          {text}
        </span>
      )}
    </span>
  );
}

export function OptimizationPage() {
  const {
    initialEvaluation,
    activeRun,
    runHistory,
    optimizing,
    executeOptimization,
    selectRun,
    clearActiveRun,
  } = useSimulation();

  const [algorithm, setAlgorithm] = useState<'local_search' | 'ortools' | 'both'>('both');
  const [restarts, setRestarts] = useState<number>(15);
  const [seed, setSeed] = useState<number>(42);
  const [timeLimit, setTimeLimit] = useState<number>(10);
  const [localError, setLocalError] = useState<string | null>(null);

  function applyPreset(preset: 'quick' | 'academic' | 'audit') {
    if (preset === 'quick') {
      setAlgorithm('local_search');
      setRestarts(5);
      setSeed(42);
    } else if (preset === 'academic') {
      setAlgorithm('local_search');
      setRestarts(15);
      setSeed(42);
    } else {
      setAlgorithm('both');
      setRestarts(15);
      setSeed(42);
      setTimeLimit(10);
    }
  }

  async function handleRun(e: React.FormEvent) {
    e.preventDefault();
    setLocalError(null);
    try {
      await executeOptimization({
        algorithm,
        restarts,
        seed,
        ortools_time_limit_seconds: timeLimit,
      });
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Fallo en optimización.');
    }
  }

  const solver = activeRun?.primary_solver;
  const feasibility = activeRun?.optimized_evaluation.feasibility ?? initialEvaluation?.feasibility;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Simulador y Optimización</h1>
        <p className="text-sm text-slate-600">
          Nuestra solución explora calendarios factibles con ayuda de las centralidades. También puedes
          compararla con Google OR-Tools CP-SAT.
        </p>
      </div>

      {/* Controls Form with Presets & Didactic Tooltips */}
      <Card>
        <CardHeader
          title="Parámetros de ejecución"
          subtitle="Selecciona un perfil rápido o ajusta manualmente el algoritmo, reinicios y semilla"
        />
        <CardBody className="space-y-4">
          {/* Quick Presets */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 mr-1">
              <Zap className="h-3.5 w-3.5 text-amber-500" />
              Presets rápidos:
            </span>
            <button
              type="button"
              onClick={() => applyPreset('quick')}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-800 transition-colors"
            >
              Demostración Rápida: 5 reinicios
            </button>
            <button
              type="button"
              onClick={() => applyPreset('academic')}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-800 transition-colors"
            >
              Académico: 15 reinicios + Semilla 42
            </button>
            <button
              type="button"
              onClick={() => applyPreset('audit')}
              className="rounded-lg border border-indigo-200 bg-indigo-50/70 px-3 py-1.5 text-xs font-semibold text-indigo-800 hover:bg-indigo-100 transition-colors"
            >
              Optimización con verificación
            </button>
          </div>

          <form onSubmit={(e) => void handleRun(e)} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
            <div>
              <label className="flex items-center text-xs font-medium text-slate-700 mb-1">
                <span>Algoritmo</span>
                <HelpTooltip
                  label="Google OR-Tools CP-SAT"
                  text="CP-SAT busca una solución mediante programación por restricciones. Solo certifica el óptimo de su modelo con coeficientes redondeados si alcanza el estado OPTIMAL."
                />
              </label>
              <select
                value={algorithm}
                onChange={(e) => setAlgorithm(e.target.value as 'local_search' | 'ortools' | 'both')}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="both">Optimización con verificación</option>
                <option value="local_search">Nuestra solución · búsqueda con reinicios</option>
                <option value="ortools">Verificación con CP-SAT</option>
              </select>
            </div>

            <div>
              <label className="flex items-center text-xs font-medium text-slate-700 mb-1">
                <span>Reinicios (1–200)</span>
                <HelpTooltip
                  label="Reinicios"
                  text="Número de puntos de partida factibles distintos (priorizando nodos de alta centralidad). Explorar varios puntos de partida puede ayudar a encontrar mejores soluciones, sin garantizar el óptimo global."
                />
              </label>
              <input
                type="number"
                min={1}
                max={200}
                value={restarts}
                onChange={(e) => setRestarts(Math.max(1, Number(e.target.value)))}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="flex items-center text-xs font-medium text-slate-700 mb-1">
                <span>Semilla aleatoria</span>
                <HelpTooltip
                  label="Semilla"
                  text="Valor entero que fija el generador pseudoaleatorio del algoritmo. Con la misma semilla y datos obtendrás exactamente la misma trayectoria y calendario final (100% reproducible)."
                />
              </label>
              <input
                type="number"
                min={0}
                value={seed}
                onChange={(e) => setSeed(Math.max(0, Number(e.target.value)))}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="flex items-center text-xs font-medium text-slate-700 mb-1">
                <span>Tiempo máximo de CP-SAT (s)</span>
                <HelpTooltip
                  label="Límite OR-Tools"
                  text="Tiempo máximo de búsqueda de CP-SAT; construir el modelo puede tomar tiempo adicional."
                />
              </label>
              <input
                type="number"
                min={1}
                max={120}
                value={timeLimit}
                onChange={(e) => setTimeLimit(Math.max(1, Number(e.target.value)))}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={optimizing}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                <Play className="h-4 w-4" />
                {optimizing ? 'Optimizando...' : 'Optimizar'}
              </button>
              <button
                type="button"
                onClick={clearActiveRun}
                title="Restaurar vista al calendario inicial"
                className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-700 hover:bg-slate-50"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>
          </form>

          {localError && (
            <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
              {localError}
            </div>
          )}
        </CardBody>
      </Card>

      {solver && (
        <div className="rounded-lg border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-950">
          <strong>{solver.algorithm.startsWith('Búsqueda Local') ? 'Nuestra solución' : solver.algorithm}:</strong>{' '}
          {solver.optimality_proven
            ? 'CP-SAT demostró el óptimo del modelo con coeficientes redondeados.'
            : 'Se encontró una solución factible; no se ha demostrado que sea el óptimo global.'}
          {activeRun?.comparison_solver && ' Se muestra el mejor calendario factible encontrado por los dos métodos.'}
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <MetricTile
          label="Costo inicial F(x⁰)"
          value={initialEvaluation ? initialEvaluation.total_objective_f.toFixed(2) : '...'}
          accent="amber"
        />
        <MetricTile
          label="Mejor costo F(x*)"
          value={solver ? solver.final_cost.toFixed(2) : '—'}
          accent={solver ? 'emerald' : 'slate'}
        />
        <MetricTile
          label="Reducción %"
          value={solver ? `${solver.reduction_percentage}%` : '—'}
          hint={solver ? `-${solver.reduction_absolute.toFixed(2)} pts` : undefined}
          accent="indigo"
        />
        <MetricTile
          label="Iteraciones"
          value={solver ? solver.iterations : '—'}
          hint={solver ? `${solver.restarts_executed} reinicios` : undefined}
        />
        <MetricTile
          label="Tiempo (ms)"
          value={solver ? `${solver.execution_time_ms.toFixed(1)} ms` : '—'}
        />
        <MetricTile
          label="Parciales movidos"
          value={solver ? solver.modified_exams_count : '—'}
          hint={
            activeRun
              ? `Error ΔF_i vs F: ${activeRun.incremental_verification_max_error.toExponential(1)}`
              : undefined
          }
        />
      </div>

      {/* Feasibility & Trace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <Card className="lg:col-span-8">
          <CardHeader
            title="Evolución real del costo durante la optimización"
            subtitle={
              solver
                ? `${solver.algorithm.startsWith('Búsqueda Local') ? 'Nuestra solución' : solver.algorithm} · Estado: ${solver.status}`
                : 'Ejecuta el algoritmo para visualizar la traza real de iteraciones'
            }
          />
          <CardBody>
            {solver && solver.convergence_trace.length > 0 ? (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={solver.convergence_trace}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="step" tick={{ fontSize: 11 }} label={{ value: 'Paso', position: 'insideBottom', offset: -2, fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="current_cost"
                      name="Costo actual (reinicio)"
                      stroke="#94a3b8"
                      dot={false}
                      strokeWidth={1.5}
                    />
                    <Line
                      type="monotone"
                      dataKey="best_cost"
                      name="Mejor F global"
                      stroke="#4f46e5"
                      dot={false}
                      strokeWidth={2.5}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-72 flex items-center justify-center text-sm text-slate-500">
                Aún no hay una corrida activa. Selecciona un preset y presiona &quot;Optimizar&quot;.
              </div>
            )}
          </CardBody>
        </Card>

        <Card className="lg:col-span-4">
          <CardHeader
            title="Estado de restricciones duras"
            subtitle="Verificación obligatoria antes de aceptar cualquier solución"
          />
          <CardBody className="space-y-3 text-xs">
            {feasibility ? (
              <>
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  {feasibility.is_feasible ? (
                    <Badge variant="emerald">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Calendario 100% Factible
                    </Badge>
                  ) : (
                    <Badge variant="rose">
                      <ShieldAlert className="h-3.5 w-3.5" /> Solución Infactible
                    </Badge>
                  )}
                </div>
                <ul className="space-y-2 text-slate-700">
                  <li className="flex justify-between">
                    <span>Dominio autorizado (x_i ∈ D_i)</span>
                    <strong>{feasibility.domain_ok ? 'Cumple' : 'Falla'}</strong>
                  </li>
                  <li className="flex justify-between">
                    <span>Duración completa del parcial</span>
                    <strong>{feasibility.duration_ok ? 'Cumple' : 'Falla'}</strong>
                  </li>
                  <li className="flex justify-between">
                    <span>Sin solapamiento estudiantil</span>
                    <strong>{feasibility.no_student_overlap ? 'Cumple' : 'Falla'}</strong>
                  </li>
                  <li className="flex justify-between">
                    <span>Sin solapamiento docente</span>
                    <strong>{feasibility.no_teacher_overlap ? 'Cumple' : 'Falla'}</strong>
                  </li>
                  <li className="flex justify-between">
                    <span>Sin solapamiento de aula</span>
                    <strong>{feasibility.no_room_overlap ? 'Cumple' : 'Falla'}</strong>
                  </li>
                </ul>
              </>
            ) : null}

            {activeRun?.comparison_solver && (
              <div className="mt-4 rounded-lg border border-indigo-100 bg-indigo-50/60 p-3 space-y-1">
                <p className="font-semibold text-indigo-950">Otro método: {activeRun.comparison_solver.algorithm}</p>
                <p>Estado: <strong>{activeRun.comparison_solver.status}</strong></p>
                {activeRun.comparison_solver.is_feasible ? (
                  <p>Costo final: <strong>{activeRun.comparison_solver.final_cost.toFixed(2)}</strong></p>
                ) : (
                  <p>Este método no obtuvo una solución factible en esta ejecución. UNKNOWN no demuestra que el problema sea infactible.</p>
                )}
                <p>
                  Optimalidad demostrada:{' '}
                  <strong>{activeRun.comparison_solver.optimality_proven ? 'Sí, para el modelo con coeficientes redondeados' : 'No demostrada en el límite'}</strong>
                </p>
                <p>Tiempo: {activeRun.comparison_solver.execution_time_ms.toFixed(1)} ms</p>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Run History Comparison */}
      {runHistory.length > 0 && (
        <Card>
          <CardHeader title="Historial de ejecuciones reales" subtitle="Selecciona cualquier corrida previa para cargarla en Grafos y Resultados" />
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-2.5">Run ID</th>
                  <th className="px-4 py-2.5">Algoritmo</th>
                  <th className="px-4 py-2.5">Semilla / Reinicios</th>
                  <th className="px-4 py-2.5">F Inicial</th>
                  <th className="px-4 py-2.5">F Final</th>
                  <th className="px-4 py-2.5">Reducción</th>
                  <th className="px-4 py-2.5">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {runHistory.map((run) => (
                  <tr
                    key={run.run_id}
                    className={activeRun?.run_id === run.run_id ? 'bg-indigo-50/70' : 'hover:bg-slate-50'}
                  >
                    <td className="px-4 py-2.5 font-mono font-semibold">#{run.run_id}</td>
                    <td className="px-4 py-2.5">{run.primary_solver.algorithm}</td>
                    <td className="px-4 py-2.5">seed={run.seed} · R={run.restarts}</td>
                    <td className="px-4 py-2.5">{run.primary_solver.initial_cost.toFixed(2)}</td>
                    <td className="px-4 py-2.5 font-bold text-emerald-700">{run.primary_solver.final_cost.toFixed(2)}</td>
                    <td className="px-4 py-2.5">-{run.primary_solver.reduction_percentage}%</td>
                    <td className="px-4 py-2.5">
                      <button
                        type="button"
                        onClick={() => void selectRun(run)}
                        className="rounded border border-indigo-300 bg-white px-2.5 py-1 text-indigo-700 hover:bg-indigo-50"
                      >
                        {activeRun?.run_id === run.run_id ? 'Activa' : 'Cargar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
