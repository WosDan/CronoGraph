import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSimulation } from '../../context/SimulationContext';
import type { ExamEvaluationDetail } from '../../types/academic';

const daysBetween = (a: string, b: string) => Math.abs(Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 86400000;

function pairCounts(exams: ExamEvaluationDetail[]) {
  let close = 0, sameDay = 0, consecutive = 0;
  for (let i = 0; i < exams.length; i++) for (let j = i + 1; j < exams.length; j++) {
    const days = daysBetween(exams[i].assigned_date, exams[j].assigned_date);
    if (days <= 3) close++;
    if (days === 0) sameDay++;
    if (days === 1) consecutive++;
  }
  return { close, sameDay, consecutive };
}

export function StudentImpactPage() {
  const { dataset, activeRun } = useSimulation();
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const rows = useMemo(() => {
    if (!dataset || !activeRun) return [];
    const before = new Map(activeRun.initial_evaluation.exam_details.map((exam) => [exam.exam_id, exam]));
    const after = new Map(activeRun.optimized_evaluation.exam_details.map((exam) => [exam.exam_id, exam]));
    return dataset.students.map((student) => {
      const ids = dataset.exams.filter((exam) => student.enrollments.some((enrollment) => enrollment.subject_id === exam.subject_id && enrollment.group_id === exam.group_id)).map((exam) => exam.id);
      const timeline = (lookup: Map<string, ExamEvaluationDetail>) => ids.map((id) => lookup.get(id)).filter((exam): exam is ExamEvaluationDetail => !!exam).sort((a, b) => `${a.assigned_date}T${a.assigned_start_time}`.localeCompare(`${b.assigned_date}T${b.assigned_start_time}`));
      const initial = timeline(before), proposed = timeline(after);
      return { student, initial, proposed, before: pairCounts(initial), after: pairCounts(proposed) };
    });
  }, [dataset, activeRun]);
  const filtered = rows.filter(({ student }) => `${student.id} ${student.name}`.toLowerCase().includes(query.trim().toLowerCase()));
  const selected = filtered.find((row) => row.student.id === selectedId) ?? filtered[0];
  const improved = rows.filter((row) => row.after.close < row.before.close).length;
  const worsened = rows.filter((row) => row.after.close > row.before.close).length;
  const unchanged = rows.length - improved - worsened;
  const withoutCloseBefore = rows.filter((row) => row.before.close === 0).length;
  const withoutCloseAfter = rows.filter((row) => row.after.close === 0).length;
  const newlyFreed = rows.filter((row) => row.before.close > 0 && row.after.close === 0).length;
  const newlyAffected = rows.filter((row) => row.before.close === 0 && row.after.close > 0).length;

  return <div className="space-y-6">
    <div><p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">Comparación de calendarios</p><h1 className="mt-2 text-3xl font-bold text-slate-900">Perspectiva de estudiantes</h1><p className="mt-2 max-w-3xl text-sm text-slate-600">Observa cómo cambia la cercanía entre parciales para cada estudiante del conjunto de datos.</p></div>
    {!activeRun || !dataset ? <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center"><p className="text-slate-600">Ejecuta una optimización para comparar ambos calendarios.</p><Link to="/optimizacion" className="mt-4 inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">Ir a optimización</Link></div> : <>
      <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4 text-sm text-indigo-950">Un par cercano son dos parciales del mismo estudiante separados por 0 a 3 días calendario. Mejorar aquí significa reducir la cantidad de esos pares; este indicador no mide estrés, rendimiento ni bienestar real.</div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[{label:'Menos pares cercanos', value:improved, color:'text-emerald-700'}, {label:'Igual cantidad',value:unchanged,color:'text-slate-700'}, {label:'Más pares cercanos',value:worsened,color:'text-amber-700'}, {label:'Sin pares cercanos',value:`${withoutCloseBefore} → ${withoutCloseAfter}`,color:'text-indigo-700'}].map((item) => <div key={item.label} className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs font-medium text-slate-500">{item.label}</p><p className={`mt-2 text-2xl font-bold ${item.color}`}>{item.value}</p></div>)}</div>
      <p className="text-sm text-slate-600">{newlyFreed} estudiantes pasaron a no tener pares cercanos; {newlyAffected} pasaron a tener al menos uno. El cambio total puede afectar de forma distinta a cada persona.</p>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4"><div><h2 className="text-lg font-bold text-slate-900">Explorar un estudiante</h2><p className="text-sm text-slate-500">Busca por nombre o identificador y compara sus parciales.</p></div>
        <div className="grid gap-3 sm:grid-cols-2"><input aria-label="Buscar estudiante" value={query} onChange={(e) => { setQuery(e.target.value); setSelectedId(''); }} placeholder="Buscar nombre o identificador" className="rounded-lg border border-slate-300 px-3 py-2 text-sm"/><select aria-label="Seleccionar estudiante" value={selected?.student.id ?? ''} onChange={(e) => setSelectedId(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">{filtered.length === 0 && <option value="">Sin resultados</option>}{filtered.map((row) => <option key={row.student.id} value={row.student.id}>{row.student.id} · {row.student.name}</option>)}</select></div>
        {selected ? <><div className="grid gap-3 sm:grid-cols-3">{([{label:'Pares a 0–3 días',key:'close'},{label:'Pares el mismo día',key:'sameDay'},{label:'Pares en días consecutivos',key:'consecutive'}] as const).map((metric) => <div key={metric.key} className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">{metric.label}</p><p className="mt-1 text-lg font-semibold">{selected.before[metric.key]} → {selected.after[metric.key]}</p></div>)}</div><div className="grid gap-4 lg:grid-cols-2">{([{label:'Calendario inicial',items:selected.initial},{label:'Calendario propuesto',items:selected.proposed}]).map((section) => <div key={section.label} className="rounded-xl border border-slate-200 p-4"><h3 className="mb-3 font-semibold text-slate-800">{section.label}</h3>{section.items.length ? <ul className="divide-y divide-slate-100">{section.items.map((item) => <li key={item.exam_id} className="py-2 text-sm"><p className="font-medium text-slate-800">{item.subject_name}</p><p className="text-xs text-slate-500">{item.assigned_date} · {item.assigned_start_time}–{item.assigned_end_time}</p></li>)}</ul> : <p className="text-sm text-slate-500">No hay parciales registrados.</p>}</div>)}</div></> : <p className="text-sm text-slate-500">No se encontraron estudiantes con esa búsqueda.</p>}
      </section>
    </>}
  </div>;
}
