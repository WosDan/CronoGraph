import { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  RotateCcw,
  Search,
  Upload,
} from 'lucide-react';
import { useSimulation } from '../../context/SimulationContext';
import { cronoApi } from '../../services/cronoApi';
import type { DatasetValidationResponse } from '../../types/academic';
import { downloadJsonFile, formatSlotTypeLabel } from '../../utils/export';
import { Badge, Card, CardBody, CardHeader } from '../../components/ui/Primitives';

type DataTab = 'exams' | 'students' | 'subjects' | 'teachers';

export function DataPage() {
  const { dataset, loading, refreshDatasetAndGraphs, resetDemoDataset } = useSimulation();
  const [activeTab, setActiveTab] = useState<DataTab>('exams');
  const [search, setSearch] = useState('');
  const [selectedExamId, setSelectedExamId] = useState<string>('PAR-01');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('EST-001');
  const [validationFeedback, setValidationFeedback] = useState<DatasetValidationResponse | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const q = search.trim().toLowerCase();

  const subjectsById = useMemo(
    () => new Map(dataset?.subjects.map((s) => [s.id, s]) ?? []),
    [dataset],
  );
  const teachersById = useMemo(
    () => new Map(dataset?.teachers.map((t) => [t.id, t]) ?? []),
    [dataset],
  );
  const groupsById = useMemo(
    () => new Map(dataset?.groups.map((g) => [g.id, g]) ?? []),
    [dataset],
  );

  const filteredExams = useMemo(() => {
    if (!dataset) return [];
    return dataset.exams.filter((ex) => {
      const subj = subjectsById.get(ex.subject_id);
      const teacher = teachersById.get(ex.teacher_id);
      return (
        ex.id.toLowerCase().includes(q) ||
        ex.name.toLowerCase().includes(q) ||
        (subj?.code.toLowerCase().includes(q) ?? false) ||
        (teacher?.name.toLowerCase().includes(q) ?? false)
      );
    });
  }, [dataset, q, subjectsById, teachersById]);

  const filteredStudents = useMemo(() => {
    if (!dataset) return [];
    return dataset.students.filter(
      (st) =>
        st.id.toLowerCase().includes(q) ||
        st.name.toLowerCase().includes(q) ||
        st.program.toLowerCase().includes(q),
    );
  }, [dataset, q]);

  const selectedExam = useMemo(
    () => dataset?.exams.find((e) => e.id === selectedExamId) ?? dataset?.exams[0] ?? null,
    [dataset, selectedExamId],
  );

  const selectedStudent = useMemo(
    () => dataset?.students.find((s) => s.id === selectedStudentId) ?? dataset?.students[0] ?? null,
    [dataset, selectedStudentId],
  );

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setValidationFeedback(null);
    setBusyAction(true);

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const validation = await cronoApi.validateDataset(parsed);
      setValidationFeedback(validation);

      if (validation.valid) {
        await cronoApi.uploadDataset(parsed);
        await refreshDatasetAndGraphs();
      }
    } catch (err) {
      setUploadError(
        err instanceof Error ? `No se pudo leer o validar el JSON: ${err.message}` : 'Archivo JSON inválido.',
      );
    } finally {
      setBusyAction(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleResetDemo() {
    setBusyAction(true);
    setValidationFeedback(null);
    setUploadError(null);
    await resetDemoDataset();
    setBusyAction(false);
  }

  if (loading && !dataset) {
    return <p className="text-sm text-slate-600">Cargando base de datos académica...</p>;
  }

  if (!dataset) {
    return <p className="text-sm text-rose-700">No hay dataset cargado.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Datos Académicos</h1>
          <p className="text-sm text-slate-600">
            Inspección, validación estructural, carga de JSON personalizado y exportación del conjunto
            sintético reproducible.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={(e) => void handleFileUpload(e)}
            className="hidden"
          />
          <button
            type="button"
            disabled={busyAction}
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            <Upload className="h-3.5 w-3.5" />
            Cargar JSON personalizado
          </button>
          <button
            type="button"
            disabled={busyAction}
            onClick={() => downloadJsonFile(dataset, 'cronograph_dataset.json')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <Download className="h-3.5 w-3.5" />
            Descargar JSON
          </button>
          <button
            type="button"
            disabled={busyAction}
            onClick={() => void handleResetDemo()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Restaurar demo (Semilla 42)
          </button>
        </div>
      </div>

      {/* Validation Feedback */}
      {uploadError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          {uploadError}
        </div>
      )}

      {validationFeedback && (
        <Card>
          <CardBody className="space-y-2">
            <div className="flex items-center gap-2">
              {validationFeedback.valid ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  <span className="text-sm font-semibold text-emerald-800">
                    Dataset validado y activado correctamente
                  </span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-5 w-5 text-rose-600" />
                  <span className="text-sm font-semibold text-rose-800">
                    El archivo cargado contiene errores de consistencia y no fue activado
                  </span>
                </>
              )}
            </div>
            {validationFeedback.issues.length > 0 && (
              <ul className="max-h-40 overflow-y-auto space-y-1 text-xs text-slate-700 pl-6 list-disc">
                {validationFeedback.issues.map((issue, idx) => (
                  <li key={`${issue.code}-${idx}`}>
                    <strong>[{issue.severity.toUpperCase()} · {issue.code}]</strong>{' '}
                    {issue.entity_id ? `(${issue.entity_id}) ` : ''}
                    {issue.message}
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      )}

      {/* Tabs & Search */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
          {[
            { id: 'exams', label: `Parciales (${dataset.exams.length})` },
            { id: 'students', label: `Estudiantes (${dataset.students.length})` },
            { id: 'subjects', label: `Asignaturas (${dataset.subjects.length})` },
            { id: 'teachers', label: `Docentes (${dataset.teachers.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as DataTab)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filtrar por código, nombre o ID..."
            className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Tab Contents */}
      {activeTab === 'exams' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <Card className="lg:col-span-7 overflow-hidden">
            <CardHeader title="Parciales y horarios iniciales" subtitle="Haz clic en un parcial para ver su dominio autorizado D_i" />
            <div className="overflow-x-auto max-h-[480px]">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 sticky top-0">
                  <tr>
                    <th className="px-4 py-2.5">ID</th>
                    <th className="px-4 py-2.5">Parcial</th>
                    <th className="px-4 py-2.5">Docente</th>
                    <th className="px-4 py-2.5">Peso / Dur.</th>
                    <th className="px-4 py-2.5">Opciones D_i</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredExams.map((ex) => {
                    const teacher = teachersById.get(ex.teacher_id);
                    const isSel = selectedExam?.id === ex.id;
                    return (
                      <tr
                        key={ex.id}
                        onClick={() => setSelectedExamId(ex.id)}
                        className={`cursor-pointer transition-colors ${
                          isSel ? 'bg-indigo-50' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="px-4 py-2.5 font-mono font-semibold text-indigo-700">{ex.id}</td>
                        <td className="px-4 py-2.5 font-medium text-slate-900">{ex.name}</td>
                        <td className="px-4 py-2.5 text-slate-600">{teacher?.name}</td>
                        <td className="px-4 py-2.5">
                          {(ex.evaluation_percentage * 100).toFixed(0)}% · {ex.duration_minutes}m
                        </td>
                        <td className="px-4 py-2.5">
                          <Badge variant="indigo">{ex.authorized_slots.length} franjas</Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="lg:col-span-5">
            <CardHeader
              title={selectedExam ? `Dominio autorizado D_i · ${selectedExam.id}` : 'Detalle'}
              subtitle={selectedExam?.name}
            />
            {selectedExam && (
              <CardBody className="space-y-4">
                <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs space-y-1">
                  <p className="font-semibold text-slate-800">Sesiones habituales de clase del grupo:</p>
                  {groupsById.get(selectedExam.group_id)?.regular_schedule.map((sess, i) => (
                    <p key={i} className="text-slate-600">
                      • {sess.day_of_week}: {sess.start_time}–{sess.end_time} ({sess.room ?? 'Sin aula'})
                    </p>
                  ))}
                </div>

                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {selectedExam.authorized_slots.map((slot) => {
                    const isInit = slot.slot_id === selectedExam.initial_slot_id;
                    return (
                      <div
                        key={slot.slot_id}
                        className={`rounded-lg border p-2.5 text-xs flex items-center justify-between gap-2 ${
                          isInit
                            ? 'border-indigo-300 bg-indigo-50/70'
                            : 'border-slate-200 bg-white'
                        }`}
                      >
                        <div>
                          <p className="font-semibold text-slate-900">
                            {slot.date} · {slot.start_time}–{slot.end_time}
                          </p>
                          <p className="text-slate-500">
                            {formatSlotTypeLabel(slot.slot_type)} · {slot.room ?? 'Aula estándar'}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge variant={slot.slot_type === 'authorized_saturday' ? 'amber' : 'neutral'}>
                            {slot.slot_type === 'authorized_saturday' ? 'Sábado' : 'Clase'}
                          </Badge>
                          {isInit && <Badge variant="indigo">Inicial</Badge>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardBody>
            )}
          </Card>
        </div>
      )}

      {activeTab === 'students' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <Card className="lg:col-span-7 overflow-hidden">
            <CardHeader title="Estudiantes sintéticos (120)" subtitle="Haz clic en un estudiante para inspeccionar sus matrículas por grupo" />
            <div className="overflow-x-auto max-h-[480px]">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 sticky top-0">
                  <tr>
                    <th className="px-4 py-2.5">ID</th>
                    <th className="px-4 py-2.5">Nombre ficticio</th>
                    <th className="px-4 py-2.5">Programa</th>
                    <th className="px-4 py-2.5">Asignaturas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.map((st) => (
                    <tr
                      key={st.id}
                      onClick={() => setSelectedStudentId(st.id)}
                      className={`cursor-pointer ${
                        selectedStudent?.id === st.id ? 'bg-indigo-50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="px-4 py-2.5 font-mono font-semibold text-indigo-700">{st.id}</td>
                      <td className="px-4 py-2.5 font-medium text-slate-900">{st.name}</td>
                      <td className="px-4 py-2.5 text-slate-600">{st.program}</td>
                      <td className="px-4 py-2.5">
                        <Badge variant="neutral">{st.enrollments.length} materias</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="lg:col-span-5">
            <CardHeader
              title={selectedStudent ? `Matrículas · ${selectedStudent.id}` : 'Matrículas'}
              subtitle={selectedStudent?.name}
            />
            {selectedStudent && (
              <CardBody className="space-y-2.5">
                {selectedStudent.enrollments.map((enr) => {
                  const subj = subjectsById.get(enr.subject_id);
                  const grp = groupsById.get(enr.group_id);
                  const teacher = grp ? teachersById.get(grp.teacher_id) : undefined;
                  return (
                    <div key={`${enr.subject_id}-${enr.group_id}`} className="rounded-lg border border-slate-200 p-3 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900">
                          {subj?.code} — {subj?.name}
                        </span>
                        <Badge variant="indigo">{grp?.code}</Badge>
                      </div>
                      <p className="text-slate-500">
                        Créditos: {subj?.credits} · Retiro histórico: {((subj?.historical_withdrawal_rate ?? 0) * 100).toFixed(0)}% ·{' '}
                        {teacher?.name}
                      </p>
                    </div>
                  );
                })}
              </CardBody>
            )}
          </Card>
        </div>
      )}

      {activeTab === 'subjects' && (
        <Card className="overflow-hidden">
          <CardHeader title="Catálogo de asignaturas" subtitle="Créditos académicos y tasas históricas de retiro" />
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-2.5">ID</th>
                  <th className="px-4 py-2.5">Código</th>
                  <th className="px-4 py-2.5">Nombre</th>
                  <th className="px-4 py-2.5">Departamento</th>
                  <th className="px-4 py-2.5">Créditos (C_i)</th>
                  <th className="px-4 py-2.5">Retiro histórico (r_i)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dataset.subjects
                  .filter(
                    (s) =>
                      s.code.toLowerCase().includes(q) ||
                      s.name.toLowerCase().includes(q) ||
                      s.id.toLowerCase().includes(q),
                  )
                  .map((subj) => (
                    <tr key={subj.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-mono text-indigo-700">{subj.id}</td>
                      <td className="px-4 py-2.5 font-semibold">{subj.code}</td>
                      <td className="px-4 py-2.5">{subj.name}</td>
                      <td className="px-4 py-2.5 text-slate-600">{subj.department}</td>
                      <td className="px-4 py-2.5 font-semibold">{subj.credits}</td>
                      <td className="px-4 py-2.5">{(subj.historical_withdrawal_rate * 100).toFixed(1)}%</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {activeTab === 'teachers' && (
        <Card className="overflow-hidden">
          <CardHeader title="Docentes asignados" subtitle="No se asume disponibilidad adicional fuera de sus sesiones y sábados autorizados" />
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-2.5">ID</th>
                  <th className="px-4 py-2.5">Docente</th>
                  <th className="px-4 py-2.5">Departamento</th>
                  <th className="px-4 py-2.5">Grupos asignados</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dataset.teachers
                  .filter(
                    (t) =>
                      t.name.toLowerCase().includes(q) ||
                      t.department.toLowerCase().includes(q) ||
                      t.id.toLowerCase().includes(q),
                  )
                  .map((teacher) => {
                    const tGroups = dataset.groups.filter((g) => g.teacher_id === teacher.id);
                    return (
                      <tr key={teacher.id} className="hover:bg-slate-50">
                        <td className="px-4 py-2.5 font-mono text-indigo-700">{teacher.id}</td>
                        <td className="px-4 py-2.5 font-medium">{teacher.name}</td>
                        <td className="px-4 py-2.5 text-slate-600">{teacher.department}</td>
                        <td className="px-4 py-2.5">
                          <div className="flex flex-wrap gap-1">
                            {tGroups.map((g) => (
                              <Badge key={g.id} variant="neutral">
                                {g.code}
                              </Badge>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
