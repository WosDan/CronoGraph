import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  BarChart3,
  CalendarDays,
  Cpu,
  Database,
  GitFork,
  Home,
  Menu,
  RefreshCw,
  Sigma,
  Users,
  X,
} from 'lucide-react';
import { useSimulation } from '../../context/SimulationContext';
import { Badge } from '../ui/Primitives';

const NAV_ITEMS = [
  { to: '/', label: 'Inicio', icon: Home, end: true },
  { to: '/calendario', label: 'Calendario', icon: CalendarDays },
  { to: '/optimizacion', label: 'Optimización', icon: Cpu },
  { to: '/resultados', label: 'Resultados', icon: BarChart3 },
  { to: '/estudiantes', label: 'Estudiantes', icon: Users },
  { to: '/grafos', label: 'Grafos', icon: GitFork },
  { to: '/datos', label: 'Datos', icon: Database },
  { to: '/modelo-matematico', label: 'Modelo matemático', icon: Sigma },
];

export function MainLayout({ children }: { children: React.ReactNode }) {
  const { dataset, activeRun, initialEvaluation, loading, error, refreshDatasetAndGraphs } =
    useSimulation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navContent = (
    <nav aria-label="Navegación principal" className="space-y-1">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span>{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col lg:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-72 lg:flex-col lg:fixed lg:inset-y-0 bg-slate-950 text-slate-100 border-r border-slate-800">
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-800">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold">
            CG
          </div>
          <div>
            <p className="text-base font-bold tracking-tight text-white">CronoGraph</p>
            <p className="text-xs text-slate-400">Matemáticas Discretas</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-5">{navContent}</div>

        <div className="border-t border-slate-800 p-4 text-xs text-slate-400 space-y-2">
          <div className="flex items-center justify-between">
            <span>Estado API</span>
            {error ? (
              <span className="text-rose-400 font-medium">Desconectado</span>
            ) : loading ? (
              <span className="text-amber-300 font-medium">Cargando...</span>
            ) : (
              <span className="text-emerald-400 font-medium">En línea</span>
            )}
          </div>
          {dataset && (
            <div className="rounded-lg bg-slate-900 p-3 space-y-1">
              <p className="font-medium text-slate-200 truncate" title={dataset.metadata.name}>
                {dataset.metadata.name}
              </p>
              <p>
                {dataset.students.length} estudiantes · {dataset.exams.length} parciales
              </p>
              {initialEvaluation && (
                <p>
                  F inicial:{' '}
                  <span className="text-slate-200 font-semibold">
                    {initialEvaluation.total_objective_f.toFixed(2)}
                  </span>
                </p>
              )}
              {activeRun && (
                <p>
                  F optimizado:{' '}
                  <span className="text-emerald-400 font-semibold">
                    {activeRun.primary_solver.final_cost.toFixed(2)} (-
                    {activeRun.primary_solver.reduction_percentage}%)
                  </span>
                </p>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Top Bar */}
      <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between bg-slate-950 px-4 py-3 text-white shadow">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-indigo-600 text-xs font-bold">
            CG
          </div>
          <span className="font-bold tracking-tight">CronoGraph</span>
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Abrir menú de navegación"
          className="rounded-md p-2 text-slate-300 hover:bg-slate-800 hover:text-white"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>

      {mobileOpen && (
        <div className="lg:hidden bg-slate-950 px-4 pb-4 pt-2 border-b border-slate-800">
          {navContent}
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 lg:pl-72 flex flex-col min-w-0">
        <div className="border-b border-slate-200 bg-white px-4 sm:px-8 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="indigo">Grafos Ponderados &amp; Optimización Combinatoria</Badge>
            {dataset?.metadata.is_synthetic && (
              <Badge variant="neutral">Datos sintéticos reproducibles</Badge>
            )}
            {activeRun && (
              <Badge variant="emerald">
                Corrida activa #{activeRun.run_id} · Reducción {activeRun.primary_solver.reduction_percentage}%
              </Badge>
            )}
          </div>
          <button
            type="button"
            onClick={() => void refreshDatasetAndGraphs()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Sincronizar backend
          </button>
        </div>

        <main className="flex-1 px-4 sm:px-8 py-6 max-w-7xl w-full mx-auto">
          {error && (
            <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              <strong>Atención:</strong> {error}. Verifica que el servidor FastAPI esté activo en{' '}
              <code>http://127.0.0.1:8000</code>.
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
