import { useMemo, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/react/daygrid';
import timeGridPlugin from '@fullcalendar/react/timegrid';
import classicThemePlugin from '@fullcalendar/react/themes/classic';
import esLocale from '@fullcalendar/react/locales/es';
import '@fullcalendar/react/skeleton.css';
import '@fullcalendar/react/themes/classic/theme.css';
import '@fullcalendar/react/themes/classic/palette.css';
import { Link } from 'react-router-dom';
import { CalendarDays, X } from 'lucide-react';
import { useSimulation } from '../../context/SimulationContext';
import type { ExamEvaluationDetail } from '../../types/academic';

type Mode = 'initial' | 'optimized' | 'both';

export function CalendarPage() {
  const { dataset, initialEvaluation, activeRun, loading } = useSimulation();
  const [mode, setMode] = useState<Mode>('initial');
  const [subject, setSubject] = useState('');
  const [teacher, setTeacher] = useState('');
  const [student, setStudent] = useState('');
  const [selected, setSelected] = useState<ExamEvaluationDetail | null>(null);
  const initial = activeRun?.initial_evaluation ?? initialEvaluation;
  const optimized = activeRun?.optimized_evaluation;
  const effectiveMode = optimized ? mode : 'initial';

  const events = useMemo(() => {
    if (!initial || !dataset) return [];
    const examMap = new Map(dataset.exams.map((exam) => [exam.id, exam]));
    const studentData = dataset.students.find((item) => item.id === student);
    const matches = (detail: ExamEvaluationDetail) => {
      const exam = examMap.get(detail.exam_id);
      return !!exam && (!subject || exam.subject_id === subject) && (!teacher || exam.teacher_id === teacher) &&
        (!student || !!studentData?.enrollments.some((enrollment) => enrollment.subject_id === exam.subject_id && enrollment.group_id === exam.group_id));
    };
    const oldById = new Map(initial.exam_details.map((item) => [item.exam_id, item]));
    const make = (detail: ExamEvaluationDetail, kind: 'initial' | 'optimized') => {
      const previous = oldById.get(detail.exam_id);
      const changed = kind === 'optimized' && previous?.assigned_slot_id !== detail.assigned_slot_id;
      const color = kind === 'initial' ? '#64748b' : changed ? '#d97706' : '#4f46e5';
      return { id: `${kind}-${detail.exam_id}`, title: `${effectiveMode === 'both' ? (kind === 'initial' ? 'Antes · ' : 'Propuesta · ') : ''}${detail.subject_name}`,
        start: `${detail.assigned_date}T${detail.assigned_start_time}`, end: `${detail.assigned_date}T${detail.assigned_end_time}`,
        backgroundColor: color, borderColor: color, extendedProps: { detail } };
    };
    const original = initial.exam_details.filter(matches);
    const proposed = optimized?.exam_details.filter(matches) ?? [];
    if (effectiveMode === 'initial') return original.map((item) => make(item, 'initial'));
    if (effectiveMode === 'optimized') return proposed.map((item) => make(item, 'optimized'));
    const changedIds = new Set(proposed.filter((item) => oldById.get(item.exam_id)?.assigned_slot_id !== item.assigned_slot_id).map((item) => item.exam_id));
    return [...original.filter((item) => changedIds.has(item.exam_id)).map((item) => make(item, 'initial')), ...proposed.map((item) => make(item, 'optimized'))];
  }, [dataset, initial, optimized, effectiveMode, subject, teacher, student]);

  const old = selected && initial?.exam_details.find((item) => item.exam_id === selected.exam_id);
  const proposed = selected && optimized?.exam_details.find((item) => item.exam_id === selected.exam_id);
  const enrolled = selected && dataset?.exams.find((item) => item.id === selected.exam_id);
  const studentCount = enrolled && dataset?.students.filter((item) => item.enrollments.some((e) => e.subject_id === enrolled.subject_id && e.group_id === enrolled.group_id)).length;

  return <div className="space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">Planificación académica</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Calendario de parciales</h1><p className="mt-2 text-sm text-slate-500">Consulta las fechas y explora los cambios de la propuesta.</p></div>
      <Link to="/optimizacion" className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700">Optimizar calendario</Link>
    </div>
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1">{([{ id: 'initial', label: 'Inicial' }, { id: 'optimized', label: 'Propuesto' }, { id: 'both', label: 'Comparar' }] as const).map((item) => <button key={item.id} type="button" disabled={item.id !== 'initial' && !optimized} onClick={() => { setMode(item.id); setSelected(null); }} className={`rounded-md px-4 py-2 text-sm font-medium disabled:opacity-40 ${effectiveMode === item.id ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>{item.label}</button>)}</div>
        <span className="text-xs text-slate-500">{optimized ? 'Gris: inicial · Índigo: propuesta · Ámbar: parcial movido' : 'Ejecuta una optimización para comparar horarios.'}</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-xs font-medium text-slate-600">Asignatura<select aria-label="Filtrar por asignatura" value={subject} onChange={(e) => setSubject(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"><option value="">Todas las asignaturas</option>{dataset?.subjects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="text-xs font-medium text-slate-600">Docente<select aria-label="Filtrar por docente" value={teacher} onChange={(e) => setTeacher(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"><option value="">Todos los docentes</option>{dataset?.teachers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="text-xs font-medium text-slate-600">Estudiante<select aria-label="Filtrar por estudiante" value={student} onChange={(e) => setStudent(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"><option value="">Todos los estudiantes</option>{dataset?.students.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.id}</option>)}</select></label>
      </div>
    </div>
    {!initial ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500"><CalendarDays className="mx-auto mb-3 h-8 w-8 text-indigo-400" />{loading ? 'Cargando calendario…' : 'No hay un calendario disponible. Revisa la conexión con la API.'}</div> :
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="min-w-[620px]"><FullCalendar key={dataset?.metadata.exam_window_start ?? 'calendar'} plugins={[classicThemePlugin, dayGridPlugin, timeGridPlugin]} locales={[esLocale]} initialView="timeGridWeek" initialDate={initial.exam_details[0]?.assigned_date ?? dataset?.metadata.exam_window_start} headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek' }} events={events} eventClick={(info) => setSelected(info.event.extendedProps.detail as ExamEvaluationDetail)} height="auto" /></div></div>
        <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><h2 className="font-bold text-slate-900">Detalle del parcial</h2>{selected && <button type="button" aria-label="Cerrar detalle" onClick={() => setSelected(null)}><X className="h-4 w-4 text-slate-400" /></button>}</div>{selected ? <div className="mt-5 space-y-4 text-sm"><div><p className="text-xs uppercase tracking-wide text-slate-400">Asignatura</p><p className="mt-1 font-semibold text-slate-900">{selected.subject_name}</p><p className="text-slate-500">{selected.exam_name}</p></div><div><p className="text-xs uppercase tracking-wide text-slate-400">Docente</p><p className="mt-1 text-slate-700">{selected.teacher_name}</p></div><div><p className="text-xs uppercase tracking-wide text-slate-400">Fecha y hora</p><p className="mt-1 text-slate-700">{selected.assigned_date} · {selected.assigned_start_time}–{selected.assigned_end_time}</p></div><div><p className="text-xs uppercase tracking-wide text-slate-400">Estudiantes inscritos</p><p className="mt-1 text-slate-700">{studentCount ?? '—'}</p></div>{old && proposed && old.assigned_slot_id !== proposed.assigned_slot_id && <div className="rounded-lg bg-amber-50 p-3 text-amber-900"><p className="font-semibold">Parcial reprogramado</p><p className="mt-1">Antes: {old.assigned_date} · {old.assigned_start_time}</p><p>Propuesta: {proposed.assigned_date} · {proposed.assigned_start_time}</p></div>}</div> : <p className="mt-4 text-sm leading-relaxed text-slate-500">Selecciona un parcial en el calendario para ver su información y los cambios propuestos.</p>}</aside>
      </div>}
  </div>;
}
