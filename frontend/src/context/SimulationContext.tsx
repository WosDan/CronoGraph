import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { cronoApi } from '../services/cronoApi';
import type {
  AcademicDataset,
  BipartiteGraphResponse,
  CalendarEvaluationResponse,
  ConflictGraphResponse,
  OptimizationRequest,
  OptimizationResult,
} from '../types/academic';

interface SimulationContextValue {
  dataset: AcademicDataset | null;
  bipartiteGraph: BipartiteGraphResponse | null;
  initialConflictGraph: ConflictGraphResponse | null;
  optimizedConflictGraph: ConflictGraphResponse | null;
  initialEvaluation: CalendarEvaluationResponse | null;
  activeRun: OptimizationResult | null;
  runHistory: OptimizationResult[];
  loading: boolean;
  optimizing: boolean;
  error: string | null;
  refreshDatasetAndGraphs: () => Promise<void>;
  executeOptimization: (req: OptimizationRequest) => Promise<OptimizationResult>;
  selectRun: (run: OptimizationResult) => Promise<void>;
  resetDemoDataset: () => Promise<void>;
  clearActiveRun: () => void;
}

const SimulationContext = createContext<SimulationContextValue | undefined>(undefined);

export function SimulationProvider({ children }: { children: ReactNode }) {
  const [dataset, setDataset] = useState<AcademicDataset | null>(null);
  const [bipartiteGraph, setBipartiteGraph] = useState<BipartiteGraphResponse | null>(null);
  const [initialConflictGraph, setInitialConflictGraph] = useState<ConflictGraphResponse | null>(null);
  const [optimizedConflictGraph, setOptimizedConflictGraph] = useState<ConflictGraphResponse | null>(null);
  const [initialEvaluation, setInitialEvaluation] = useState<CalendarEvaluationResponse | null>(null);
  const [activeRun, setActiveRun] = useState<OptimizationResult | null>(null);
  const [runHistory, setRunHistory] = useState<OptimizationResult[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [optimizing, setOptimizing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const refreshDatasetAndGraphs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ds, bip, confInit, history] = await Promise.all([
        cronoApi.getDataset(),
        cronoApi.getBipartiteGraph(),
        cronoApi.getConflictGraph('initial'),
        cronoApi.listOptimizationResults(),
      ]);

      const initialAssign: Record<string, string> = {};
      for (const exam of ds.exams) {
        initialAssign[exam.id] = exam.initial_slot_id;
      }
      const initEval = await cronoApi.evaluateCalendar(initialAssign);

      setDataset(ds);
      setBipartiteGraph(bip);
      setInitialConflictGraph(confInit);
      setInitialEvaluation(initEval);
      setRunHistory(history);

      if (history.length > 0) {
        const latest = history[0];
        setActiveRun(latest);
        try {
          const optGraph = await cronoApi.getConflictGraph('optimized', latest.run_id);
          setOptimizedConflictGraph(optGraph);
        } catch {
          setOptimizedConflictGraph(null);
        }
      } else {
        setActiveRun(null);
        setOptimizedConflictGraph(null);
      }
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'No se pudo conectar con la API de CronoGraph.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshDatasetAndGraphs();
  }, [refreshDatasetAndGraphs]);

  const executeOptimization = useCallback(async (req: OptimizationRequest): Promise<OptimizationResult> => {
    setOptimizing(true);
    setError(null);
    try {
      const result = await cronoApi.runOptimization(req);
      const optGraph = await cronoApi.getConflictGraph('optimized', result.run_id);
      setActiveRun(result);
      setOptimizedConflictGraph(optGraph);
      setRunHistory((prev) => [result, ...prev.filter((r) => r.run_id !== result.run_id)]);
      return result;
    } catch (err: unknown) {
      const detailMsg =
        typeof err === 'object' &&
        err !== null &&
        'response' in err &&
        typeof (err as { response?: { data?: { detail?: { message?: string } | string } } }).response?.data?.detail === 'object'
          ? (err as { response: { data: { detail: { message?: string } } } }).response.data.detail.message
          : err instanceof Error
            ? err.message
            : 'Error ejecutando la optimización.';
      const msg = detailMsg || 'Error ejecutando la optimización.';
      setError(msg);
      throw new Error(msg);
    } finally {
      setOptimizing(false);
    }
  }, []);

  const selectRun = useCallback(async (run: OptimizationResult) => {
    setActiveRun(run);
    try {
      const optGraph = await cronoApi.getConflictGraph('optimized', run.run_id);
      setOptimizedConflictGraph(optGraph);
    } catch {
      setOptimizedConflictGraph(null);
    }
  }, []);

  const resetDemoDataset = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await cronoApi.resetDataset();
      setActiveRun(null);
      setOptimizedConflictGraph(null);
      await refreshDatasetAndGraphs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al restaurar el dataset de demostración.');
      setLoading(false);
    }
  }, [refreshDatasetAndGraphs]);

  const clearActiveRun = useCallback(() => {
    setActiveRun(null);
    setOptimizedConflictGraph(null);
  }, []);

  return (
    <SimulationContext.Provider
      value={{
        dataset,
        bipartiteGraph,
        initialConflictGraph,
        optimizedConflictGraph,
        initialEvaluation,
        activeRun,
        runHistory,
        loading,
        optimizing,
        error,
        refreshDatasetAndGraphs,
        executeOptimization,
        selectRun,
        resetDemoDataset,
        clearActiveRun,
      }}
    >
      {children}
    </SimulationContext.Provider>
  );
}

export function useSimulation(): SimulationContextValue {
  const ctx = useContext(SimulationContext);
  if (!ctx) {
    throw new Error('useSimulation debe utilizarse dentro de SimulationProvider.');
  }
  return ctx;
}
