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
import { Download, FileSpreadsheet, Search, Sparkles, UserCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSimulation } from '../../context/SimulationContext';
import { downloadJsonFile, downloadOptimizationCsv, formatSlotTypeLabel } from '../../utils/export';
import { Badge, Card, CardBody, CardHeader, MetricTile } from '../../components/ui/Primitives';

function daysBetweenIso(isoA: string, isoB: string): number {
  const a = new Date(`${isoA}T00:00:00Z`).getTime();
  const b = new Date(`${isoB}T00:00:00Z`).getTime();
  return Math.round(Math.abs(a - b) / (1000 * 60 * 60 * 24));
}

export function ResultsPage() {
  const { activeRun, runHistory, dataset } = useSimulation();
  const [calendarViewMode, setCalendarViewMode] = useState<'optimized' | 'initial' | 'both'>('optimized');
  const [studentSearch, setStudentSearch] = useState<string>('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('EST-001');

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

  const executiveImpact = useMemo(() => {
    if (!activeRun) return null;
    const initSameDay =
      activeRun.initial_evaluation.distance_distribution.find((d) => d.delta_days === 0)?.pair_count ?? 0;
    const optSameDay =
      activeRun.optimized_evaluation.distance_distribution.find((d) => d.delta_days === 0)?.pair_count ?? 0;
    const initConsec =
      activeRun.initial_evaluation.distance_distribution.find((d) => d.delta_days === 1)?.pair_count ?? 0;
    const optConsec =
      activeRun.optimized_evaluation.distance_distribution.find((d) => d.delta_days === 1)?.pair_count ?? 0;

    const sameDayEliminated = Math.max(0, initSameDay - optSameDay);
    const consecEliminated = Math.max(0, initConsec - optConsec);

    const affectedBefore = activeRun.initial_evaluation.affected_students_count;
    const affectedAfter = activeRun.optimized_evaluation.affected_students_count;
    const studentsFreed = Math.max(0, affectedBefore - affectedAfter);
    const pctFreed =
      affectedBefore > 0 ? Math.round((studentsFreed / affectedBefore) * 1000) / 10 : 0;

    return {
      initSameDay,
      optSameDay,
      sameDayEliminated,
      consecEliminated,
      affectedBefore,
      affectedAfter,
      studentsFreed,
      pctFreed,
    };
  }, [activeRun]);

  const matchingStudents = useMemo(() => {
    if (!dataset) return [];
    const q = studentSearch.trim().toLowerCase();
    return dataset.students.filter(
      (st) => !q || st.id.toLowerCase().includes(q) || st.name.toLowerCase().includes(q),
    );
  }, [dataset, studentSearch]);

  const selectedStudentSchedule = useMemo(() => {
    if (!dataset || !activeRun) return null;
    const student =
      dataset.students.find((s) => s.id === selectedStudentId) ??
      matchingStudents[0] ??
      dataset.students[0];
    if (!student) return null;

    const initByExam = new Map(activeRun.initial_evaluation.exam_details.map((e) => [e.exam_id, e]));
    const optByExam = new Map(activeRun.optimized_evaluation.exam_details.map((e) => [e.exam_id, e]));

    const studentExams = dataset.exams.filter((ex) =>
      student.enrollments.some(
        (enr) => enr.subject_id === ex.subject_id && enr.group_id === ex.group_id,
      ),
    );

    const buildTimeline = (lookup: typeof initByExam) => {
      const items = studentExams
        .map((ex) => lookup.get(ex.id))
        .filter((d): d is NonNullable<typeof d> => Boolean(d))
        .sort((a, b) =>
          a.assigned_date === b.assigned_date
            ? a.assigned_start_time.localeCompare(b.assigned_start_time)
            : a.assigned_date.localeCompare(b.assigned_date),
        );

      return items.map((item, idx) => {
        const minGap = items.reduce((min, other, oIdx) => {
          if (idx === oIdx) return min;
          const gap = daysBetweenIso(item.assigned_date, other.assigned_date);
          return Math.min(min, gap);
        }, 99);
        return { ...item, minGap };
      });
    };

    const beforeTimeline = buildTimeline(initByExam);
    const afterTimeline = buildTimeline(optByExam);
    const criticalBefore = beforeTimeline.filter((t) => t.minGap <= 1).length;
    const criticalAfter = afterTimeline.filter((t) => t.minGap <= 1).length;

    return {
      student,
      beforeTimeline,
      afterTimeline,
      criticalBefore,
      criticalAfter,
    };
  }, [dataset, activeRun, selectedStudentId, matchingStudents]);

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

      {/* Resumen Ejecutivo — Impacto Estudiantil */}
      {executiveImpact && (
        <section
          aria-label="Resumen ejecutivo de impacto estudiantil"
          className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-white to-indigo-50 p-5 shadow-sm"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-700">
                <Sparkles className="h-4 w-4" />
                Impacto Estudiantil en Lenguaje Claro
              </div>
              <p className="text-sm sm:text-base text-slate-800 leading-relaxed">
                La reprogramación redujo la penalización académica en{' '}
                <strong className="text-indigo-700">{activeRun.primary_solver.reduction_percentage}%</strong>,
                eliminando{' '}
                <strong className="text-emerald-700">{executiveImpact.sameDayEliminated}</strong> pares
                de parciales el mismo día (de {executiveImpact.initSameDay} a {executiveImpact.optSameDay}) y{' '}
                <strong className="text-emerald-700">{executiveImpact.consecEliminated}</strong> pares en
                días consecutivos.{' '}
                <strong className="text-slate-900">
                  {executiveImpact.studentsFreed} estudiantes ({executiveImpact.pctFreed}% de los
                  afectados inicialmente)
                </strong>{' '}
                quedaron completamente libres de conflictos temporales (Δ &lt; 4 días).
              </p>
            </div>
            <div className="flex shrink-0 gap-3">
              <div className="rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-center">
                <p className="text-[11px] font-medium text-slate-500">Mismo día eliminados</p>
                <p className="text-xl font-bold text-emerald-700">-{executiveImpact.sameDayEliminated}</p>
              </div>
              <div className="rounded-xl border border-indigo-200 bg-white px-4 py-2.5 text-center">
                <p className="text-[11px] font-medium text-slate-500">Alumnos liberados</p>
                <p className="text-xl font-bold text-indigo-700">{executiveImpact.pctFreed}%</p>
              </div>
            </div>
          </div>
        </section>
      )}

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

      {/* Perspectiva del Estudiante */}
      {selectedStudentSchedule && (
        <Card>
          <CardHeader
            title="Explorador: Perspectiva del Estudiante"
            subtitle="Consulta el cronograma individual antes y después de optimizar, con alertas de días críticos"
            action={<UserCheck className="h-5 w-5 text-indigo-600" />}
          />
          <CardBody className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative w-full sm:w-64">
                <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  placeholder="Buscar estudiante (ej. EST-001)..."
                  className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-1.5 text-xs"
                />
              </div>
              <select
                aria-label="Seleccionar estudiante"
                value={selectedStudentSchedule.student.id}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium min-w-[260px]"
              >
                {matchingStudents.slice(0, 120).map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.id} — {st.name} ({st.enrollments.length} mat.)
                  </option>
                ))}
              </select>
              <div className="ml-auto flex flex-wrap gap-2 text-xs">
                <Badge variant="rose">
                  Días críticos antes: {selectedStudentSchedule.criticalBefore}
                </Badge>
                <Badge variant={selectedStudentSchedule.criticalAfter === 0 ? 'emerald' : 'amber'}>
                  Días críticos después: {selectedStudentSchedule.criticalAfter}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Antes */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-2.5">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Antes — Calendario Original ({selectedStudentSchedule.student.id})
                </p>
                {selectedStudentSchedule.beforeTimeline.map((item) => (
                  <div
                    key={`b-${item.exam_id}`}
                    className="rounded-lg border border-slate-200 bg-white p-3 flex items-center justify-between gap-2 text-xs"
                  >
                    <div>
                      <p className="font-semibold text-slate-900">
                        {item.exam_id} · {item.subject_name}
                      </p>
                      <p className="text-slate-500">
                        {item.assigned_date} · {item.assigned_start_time}–{item.assigned_end_time}
                      </p>
                    </div>
                    <Badge
                      variant={
                        item.minGap === 0
                          ? 'rose'
                          : item.minGap === 1
                            ? 'amber'
                            : item.minGap <= 3
                              ? 'neutral'
                              : 'emerald'
                      }
                    >
                      {item.minGap === 0
                        ? 'Mismo día (Δ=0)'
                        : item.minGap === 1
                          ? 'Consecutivo (Δ=1)'
                          : item.minGap <= 3
                            ? `Δ=${item.minGap}d`
                            : 'Despejado (Δ≥4d)'}
                    </Badge>
                  </div>
                ))}
              </div>

              {/* Después */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-2.5">
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                  Después — Calendario Optimizado ({selectedStudentSchedule.student.id})
                </p>
                {selectedStudentSchedule.afterTimeline.map((item) => (
                  <div
                    key={`a-${item.exam_id}`}
                    className="rounded-lg border border-emerald-100 bg-white p-3 flex items-center justify-between gap-2 text-xs"
                  >
                    <div>
                      <p className="font-semibold text-slate-900">
                        {item.exam_id} · {item.subject_name}
                      </p>
                      <p className="text-slate-500">
                        {item.assigned_date} · {item.assigned_start_time}–{item.assigned_end_time}
                      </p>
                    </div>
                    <Badge
                      variant={
                        item.minGap === 0
                          ? 'rose'
                          : item.minGap === 1
                            ? 'amber'
                            : item.minGap <= 3
                              ? 'neutral'
                              : 'emerald'
                      }
                    >
                      {item.minGap === 0
                        ? 'Mismo día (Δ=0)'
                        : item.minGap === 1
                          ? 'Consecutivo (Δ=1)'
                          : item.minGap <= 3
                            ? `Δ=${item.minGap}d`
                            : 'Despejado (Δ≥4d)'}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
