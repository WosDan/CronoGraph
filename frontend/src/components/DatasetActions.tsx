import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSimulation } from '../context/SimulationContext';
import { cronoApi } from '../services/cronoApi';
import { downloadJsonFile } from '../utils/export';

export function DatasetActions() {
  const { dataset, refreshDatasetAndGraphs, resetDemoDataset, optimizing } = useSimulation();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [failed, setFailed] = useState(false);
  async function run(action: () => Promise<void>) {
    setBusy(true); setFeedback(''); setFailed(false);
    try { await action(); setFeedback('Datos actualizados. Ya puedes consultar el nuevo calendario.'); }
    catch (error) { setFailed(true); setFeedback(error instanceof Error ? error.message : 'No se pudieron actualizar los datos.'); }
    finally { setBusy(false); if (input.current) input.current.value = ''; }
  }
  const buttonClass = 'rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40';
  return <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3" aria-label="Datos del calendario">
    <div><h2 className="font-semibold text-slate-900">Datos del calendario</h2><p className="mt-1 text-xs text-slate-500">{dataset?.metadata.name ?? 'Carga un conjunto de datos para empezar.'} · Cambiar los datos desactiva la propuesta anterior.</p></div>
    <input ref={input} type="file" accept=".json,application/json" className="hidden" aria-label="Archivo JSON del calendario" onChange={(event) => {
      const file = event.target.files?.[0]; if (!file) return;
      void run(async () => {
        let parsed: unknown;
        try { parsed = JSON.parse(await file.text()); } catch { throw new Error('El archivo no contiene un JSON válido.'); }
        const validation = await cronoApi.validateDataset(parsed);
        if (!validation.valid) throw new Error(validation.issues.map((issue) => issue.message).join(' · '));
        await cronoApi.uploadDataset(parsed); await refreshDatasetAndGraphs();
      });
    }} />
    <div className="flex flex-wrap gap-2">
      <button type="button" className={buttonClass} disabled={busy || optimizing} onClick={() => input.current?.click()}>Cargar JSON</button>
      <button type="button" className={buttonClass} disabled={busy || optimizing} onClick={() => void run(async () => { await cronoApi.randomDataset(); await refreshDatasetAndGraphs(); })}>Generar datos ficticios</button>
      <button type="button" className={buttonClass} disabled={busy || optimizing} onClick={() => void run(async () => { await resetDemoDataset(); })}>Restaurar demo</button>
      <button type="button" className={buttonClass} disabled={!dataset || busy} onClick={() => dataset && downloadJsonFile(dataset, 'cronograph-dataset.json')}>Descargar JSON de ejemplo</button>
      <Link to="/datos" className="px-3 py-2 text-sm font-medium text-indigo-600">Ver formato y datos</Link>
    </div>
    {busy && <p role="status" className="text-sm text-indigo-600">Actualizando datos…</p>}
    {feedback && <p role={failed ? 'alert' : 'status'} className={`text-sm ${failed ? 'text-rose-700' : 'text-emerald-700'}`}>{feedback}</p>}
  </section>;
}
