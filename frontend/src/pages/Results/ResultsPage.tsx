import { useMemo, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/react/daygrid';
import timeGridPlugin from '@fullcalendar/react/timegrid';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Download, FileSpreadsheet } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSimulation } from '../../context/SimulationContext';
import { downloadJsonFile, downloadOptimizationCsv, formatSlotTypeLabel } from '../../utils/export';
import { Badge, Card, CardBody, CardHeader, MetricTile } from '../../components/ui/Primitives';

export function ResultsPage() {
  const { activeRun, runHistory, dataset } = useSimulation();
  const [calendarViewMode, setCalendarViewMode] = useState<'optimized' | 'initial' | 'both'>('optimized');

  const solverCompareData = useMemo(() => {
    if (!activeRun) return [];
    const items = [
      {
        name: 'Calendario Inicial',
        costoF: activeRun.initial_evaluation.total_objective_f,
        paresActivos: activeRun.initial_evaluation.active_conflict_pairs,
      },
      {
        name: activeRun.primary_solver.algorithm,
        costoF: activeRun.primary_solver.final_cost,
        paresActivos: activeRun.optimized_evaluation.active_conflict_pairs,
      },
    ];
    if (activeRun.comparison_solver) {
      items.push({
        name: activeRun.comparison_solver.algorithm,
        costoF: activeRun.comparison_solver.final_cost,
        paresActivos: activeRun.optimized_evaluation.active_conflict_pairs,
      });
    }
    return items;
  }, [activeRun]);

  const examPenaltyBeforeAfter = useMemo(() => {
    if (!activeRun) return [];
    const optMap = new Map(
      activeRun.optimized_evaluation.exam_details.map((d) => [d.exam_id, d]),
    );
    return activeRun.initial_evaluation.exam_details.map((initEx) => ({
      exam: initEx.exam_id,
      inicial: initEx.incident_penalty_k,
      optimizado: optMap.get(initEx.exam_id)?.incident_penalty_k ?? 0,
    }));
  }, [activeRun]);

  const distanceCompareData = useMemo(() => {
    if (!activeRun) return [];
    const optMap = new Map(
      activeRun.optimized_evaluation.distance_distribution.map((d) => [d.delta_days, d]),
    );
    return activeRun.initial_evaluation.distance_distribution.map((initD) => ({
      distancia: initD.delta_days < 4 ? `Δ=${initD.delta_days}d` : 'Δ≥4d',
      paresInicial: initD.pair_count,
      paresOptimizado: optMap.get(initD.delta_days)?.pair_count ?? 0,
    }));
  }, [activeRun]);

  const studentConcentrationCompare = useMemo(() => {
    if (!activeRun) return [];
    const optMap = new Map(
      activeRun.optimized_evaluation.concentration_distribution.map((c) => [c.bucket_label, c]),
    );
    return activeRun.initial_evaluation.concentration_distribution.map((c) => ({
      categoria: c.bucket_label,
      estudiantesInicial: c.student_count,
      estudiantesOptimizado: optMap.get(c.bucket_label)?.student_count ?? 0,
    }));
  }, [activeRun]);

  const calendarEvents = useMemo(() => {
    if (!activeRun) return [];
    const initEvents = activeRun.initial_evaluation.exam_details.map((d) => ({
      id: `init-${d.exam_id}`,
      title: `${calendarViewMode === 'both' ? '[ORIG] ' : ''}${d.exam_id} · ${d.subject_name}`,
      start: `${d.assigned_date}T${d.assigned_start_time}:00`,
      end: `${d.assigned_date}T${d.assigned_end_time}:00`,
      backgroundColor: '#64748b',
      borderColor: '#475569',
    }));
    const optEvents = activeRun.optimized_evaluation.exam_details.map((d) => ({
      id: `opt-${d.exam_id}`,
      title: `${calendarViewMode === 'both' ? '[OPT] ' : ''}${d.exam_id} · ${d.subject_name}`,
      start: `${d.assigned_date}T${d.assigned_start_time}:00`,
      end: `${d.assigned_date}T${d.assigned_end_time}:00`,
      backgroundColor: d.slot_type === 'authorized_saturday' ? '#d97706' : '#4f46e5',
      borderColor: d.slot_type === 'authorized_saturday' ? '#b45309' : '#3730a3',
    }));

    if (calendarViewMode === 'initial') return initEvents;
    if (calendarViewMode === 'optimized') return optEvents;
    return [...initEvents, ...optEvents];
  }, [activeRun, calendarViewMode]);

  if (!activeRun) {
    return (
      <Card>
        <CardBody className="py-12 text-center space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Aún no hay resultados optimizados</h2>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            Ejecuta el optimizador en la sección 5 (Optimización) para generar métricas comparativas,
            gráficas estadísticas, calendario FullCalendar y explicabilidad de reprogramaciones.
          </p>
          <Link
            to="/optimizacion"
            className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Ir a Optimización
          </Link>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Resultados y Analítica</h1>
          <p className="text-sm text-slate-600">
            Corrida <code>#{activeRun.run_id}</code> · {activeRun.primary_solver.algorithm} ·{' '}
            {activeRun.primary_solver.status}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => downloadJsonFile(activeRun, `cronograph_run_${activeRun.run_id}.json`)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <Download className="h-3.5 w-3.5" />
            Exportar JSON
          </button>
          <button
            type="button"
            onClick={() => downloadOptimizationCsv(activeRun)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            Exportar CSV
          </button>
        </div>
      </div>

      {/* 9 Analytical Indicators with explicit units */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <MetricTile
          label="Penalización inicial"
          value={activeRun.initial_evaluation.total_objective_f.toFixed(2)}
          hint="Suma F(x⁰) sobre pares i<j"
          accent="amber"
        />
        <MetricTile
          label="Penalización optimizada"
          value={activeRun.optimized_evaluation.total_objective_f.toFixed(2)}
          hint="Suma F(x*) sobre pares i<j"
          accent="emerald"
        />
        <MetricTile
          label="Reducción"
          value={`${activeRun.primary_solver.reduction_percentage}%`}
          hint={`-${activeRun.primary_solver.reduction_absolute.toFixed(2)} unidades F`}
          accent="indigo"
        />
        <MetricTile
          label="Pares en conflicto (Δ<4)"
          value={`${activeRun.optimized_evaluation.active_conflict_pairs} / ${activeRun.initial_evaluation.active_conflict_pairs}`}
          hint="Optimizado vs Inicial (pares)"
        />
        <MetricTile
          label="Estudiantes afectados"
          value={`${activeRun.optimized_evaluation.affected_students_count} / ${activeRun.initial_evaluation.affected_students_count}`}
          hint="Con ≥1 par a Δ < 4 días"
        />
        <MetricTile
          label="Parciales reprogramados"
          value={activeRun.primary_solver.modified_exams_count}
          hint={`De ${dataset?.exams.length ?? 20} parciales totales`}
        />
        <MetricTile
          label="Tiempo de ejecución"
          value={`${activeRun.primary_solver.execution_time_ms.toFixed(1)} ms`}
          hint="Cómputo real en backend"
        />
        <MetricTile
          label="Restricciones duras"
          value={activeRun.optimized_evaluation.feasibility.is_feasible ? '100% Cumplidas' : 'Violadas'}
          accent={activeRun.optimized_evaluation.feasibility.is_feasible ? 'emerald' : 'rose'}
        />
        <MetricTile
          label="Estado del solver"
          value={activeRun.primary_solver.status}
          hint={
            activeRun.comparison_solver?.optimality_proven
              ? 'OR-Tools probó óptimo global'
              : 'Heurística multi-arranque'
          }
        />
      </div>

      {/* 5 Recharts Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader
            title="1. Convergencia de la función objetivo F"
            subtitle="Evolución real paso a paso de los reinicios aleatorios"
          />
          <CardBody className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={activeRun.primary_solver.convergence_trace}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="step" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="best_cost" name="Mejor F" stroke="#4f46e5" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="current_cost" name="F actual" stroke="#94a3b8" strokeWidth={1.2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="2. Penalización incidente por parcial (Antes vs Después)"
            subtitle="Suma de K_ij incidente en cada parcial (unidades de F)"
          />
          <CardBody className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={examPenaltyBeforeAfter}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="exam" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="inicial" name="Original" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="optimizado" name="Optimizado" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="3. Pares de parciales según distancia temporal Δ"
            subtitle="Conteo de aristas (i < j) por separación en días calendario"
          />
          <CardBody className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={distanceCompareData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="distancia" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="paresInicial" name="Pares (Original)" fill="#ef4444" radius={[4, 4, 0, 0]} />
                <Bar dataKey="paresOptimizado" name="Pares (Optimizado)" fill="#4f46e5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="4. Distribución de concentración por estudiante"
            subtitle="Número de estudiantes según cantidad de pares de parciales a Δ < 4 días"
          />
          <CardBody className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={studentConcentrationCompare}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="categoria" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="estudiantesInicial" name="Estudiantes (Original)" fill="#64748b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="estudiantesOptimizado" name="Estudiantes (Optimizado)" fill="#059669" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>
      </div>

      {/* 5. Comparación de algoritmos y corridas */}
      <Card>
        <CardHeader
          title="5. Comparación de algoritmos y ejecuciones"
          subtitle={`Comparativo directo de función objetivo F (${runHistory.length} corridas registradas)`}
        />
        <CardBody className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={solverCompareData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="costoF" name="Función objetivo total F" fill="#4f46e5" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardBody>
      </Card>

      {/* FullCalendar Comparativo */}
      <Card>
        <CardHeader
          title="Calendario Académico Comparativo (FullCalendar)"
          subtitle="Índigo: sesión habitual de clase optimizada · Ámbar: sábado autorizado · Gris: calendario inicial"
          action={
            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
              {[
                { id: 'optimized', label: 'Optimizado' },
                { id: 'initial', label: 'Original' },
                { id: 'both', label: 'Superpuesto' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setCalendarViewMode(m.id as 'optimized' | 'initial' | 'both')}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                    calendarViewMode === m.id
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          }
        />
        <CardBody>
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin]}
            initialView="dayGridMonth"
            initialDate={dataset?.metadata.exam_window_start ?? '2026-11-16'}
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek',
            }}
            events={calendarEvents}
            height="auto"
            locale="es"
          />
        </CardBody>
      </Card>

      {/* Tabla de Explicabilidad */}
      <Card className="overflow-hidden">
        <CardHeader
          title="Explicabilidad matemática de reprogramaciones"
          subtitle="Impacto contextual y justificación cuantitativa por cada parcial"
        />
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-2.5">Parcial</th>
                <th className="px-4 py-2.5">Asignatura / Docente</th>
                <th className="px-4 py-2.5">Original</th>
                <th className="px-4 py-2.5">Propuesta</th>
                <th className="px-4 py-2.5">Δ Penalización</th>
                <th className="px-4 py-2.5">Motivo matemático</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activeRun.reschedule_explanations.map((item) => (
                <tr key={item.exam_id} className={item.changed ? 'bg-indigo-50/30' : 'bg-white'}>
                  <td className="px-4 py-3 font-mono font-semibold text-indigo-700">
                    {item.exam_id}
                    {item.changed && (
                      <div className="mt-1">
                        <Badge variant="indigo">Movido</Badge>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-900">{item.subject_code} — {item.subject_name}</p>
                    <p className="text-slate-500">{item.teacher_name}</p>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <p className="font-medium">{item.original_date}</p>
                    <p className="text-slate-500">{item.original_time}</p>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <p className="font-semibold text-slate-900">{item.proposed_date}</p>
                    <p className="text-slate-500">{item.proposed_time} ({formatSlotTypeLabel(item.proposed_slot_type)})</p>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap font-mono">
                    <span
                      className={
                        item.contextual_incident_after < item.contextual_incident_before
                          ? 'text-emerald-700 font-bold'
                          : 'text-slate-700'
                      }
                    >
                      {item.contextual_incident_before.toFixed(1)} → {item.contextual_incident_after.toFixed(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-700 max-w-md">{item.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
