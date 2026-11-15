import { apiClient } from './apiClient';
import type {
  AcademicDataset,
  BipartiteGraphResponse,
  CalendarEvaluationResponse,
  ConflictGraphResponse,
  DatasetValidationResponse,
  OptimizationRequest,
  OptimizationResult,
} from '../types/academic';

export const cronoApi = {
  async getHealth(): Promise<{ status: string; dataset_loaded: boolean; num_students?: number; num_exams?: number }> {
    const { data } = await apiClient.get('/health');
    return data;
  },

  async getDataset(): Promise<AcademicDataset> {
    const { data } = await apiClient.get<AcademicDataset>('/dataset');
    return data;
  },

  async validateDataset(payload: unknown): Promise<DatasetValidationResponse> {
    const { data } = await apiClient.post<DatasetValidationResponse>('/dataset/validate', payload);
    return data;
  },

  async uploadDataset(payload: unknown): Promise<DatasetValidationResponse> {
    const { data } = await apiClient.post<DatasetValidationResponse>('/dataset/upload', payload);
    return data;
  },

  async resetDataset(): Promise<AcademicDataset> {
    const { data } = await apiClient.post<AcademicDataset>('/dataset/reset');
    return data;
  },

  async getBipartiteGraph(): Promise<BipartiteGraphResponse> {
    const { data } = await apiClient.get<BipartiteGraphResponse>('/graphs/bipartite');
    return data;
  },

  async getConflictGraph(mode: 'initial' | 'optimized', runId?: string): Promise<ConflictGraphResponse> {
    const { data } = await apiClient.get<ConflictGraphResponse>('/graphs/conflicts', {
      params: mode === 'optimized' && runId ? { mode, run_id: runId } : { mode: 'initial' },
    });
    return data;
  },

  async evaluateCalendar(assignment: Record<string, string>): Promise<CalendarEvaluationResponse> {
    const { data } = await apiClient.post<CalendarEvaluationResponse>('/calendar/evaluate', { assignment });
    return data;
  },

  async runOptimization(req: OptimizationRequest): Promise<OptimizationResult> {
    const { data } = await apiClient.post<OptimizationResult>('/optimization/run', req);
    return data;
  },

  async listOptimizationResults(): Promise<OptimizationResult[]> {
    const { data } = await apiClient.get<OptimizationResult[]>('/optimization/results');
    return data;
  },

  async getOptimizationResult(runId: string): Promise<OptimizationResult> {
    const { data } = await apiClient.get<OptimizationResult>(`/optimization/results/${runId}`);
    return data;
  },
};
