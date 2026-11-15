import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { MainLayout } from '../components/layout/MainLayout';
import { MathBlock } from '../components/ui/Primitives';
import { MathematicalModelPage } from '../pages/MathematicalModel/MathematicalModelPage';
import { formatSlotTypeLabel } from '../utils/export';

vi.mock('../context/SimulationContext', () => ({
  useSimulation: () => ({
    dataset: null,
    bipartiteGraph: null,
    initialConflictGraph: null,
    optimizedConflictGraph: null,
    initialEvaluation: null,
    activeRun: null,
    runHistory: [],
    loading: false,
    optimizing: false,
    error: null,
    refreshDatasetAndGraphs: vi.fn(),
    executeOptimization: vi.fn(),
    selectRun: vi.fn(),
    resetDemoDataset: vi.fn(),
    clearActiveRun: vi.fn(),
  }),
}));

beforeAll(() => {
  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  globalThis.ResizeObserver = ResizeObserverMock;
});

describe('CronoGraph Frontend Suite', () => {
  it('renders navigation items in the exact required 6-section order', () => {
    render(
      <MemoryRouter>
        <MainLayout>
          <div>Contenido de prueba</div>
        </MainLayout>
      </MemoryRouter>,
    );

    const nav = screen.getByRole('navigation', { name: /navegación principal/i });
    const links = Array.from(nav.querySelectorAll('a')).map((a) => a.textContent?.trim());

    expect(links).toEqual([
      '1. Inicio',
      '2. Modelo matemático',
      '3. Datos',
      '4. Grafos',
      '5. Optimización',
      '6. Resultados',
    ]);
  });

  it('renders KaTeX equations inside MathBlock without errors', () => {
    const { container } = render(<MathBlock tex="W_i = C_i \cdot p_i \cdot (1 + r_i/2)" />);
    expect(container.querySelector('.katex')).not.toBeNull();
  });

  it('renders MathematicalModelPage with interactive formula laboratory and penalty table', () => {
    render(<MathematicalModelPage />);
    expect(screen.getByText('Modelo Matemático')).toBeInTheDocument();
    expect(screen.getByText('Laboratorio interactivo del modelo')).toBeInTheDocument();
    expect(screen.getByText('Δ = 0 días')).toBeInTheDocument();
    expect(screen.getByText('Δ ≥ 4 días')).toBeInTheDocument();
  });

  it('formats slot types accurately in Spanish', () => {
    expect(formatSlotTypeLabel('regular_class')).toBe('Sesión habitual de clase');
    expect(formatSlotTypeLabel('authorized_saturday')).toBe('Sábado autorizado');
  });
});
