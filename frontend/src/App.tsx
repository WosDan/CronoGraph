import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import { SimulationProvider } from './context/SimulationContext';
import { DataPage } from './pages/Data/DataPage';
import { GraphsPage } from './pages/Graphs/GraphsPage';
import { HomePage } from './pages/Home/HomePage';
import { MathematicalModelPage } from './pages/MathematicalModel/MathematicalModelPage';
import { OptimizationPage } from './pages/Optimization/OptimizationPage';
import { ResultsPage } from './pages/Results/ResultsPage';

export function App() {
  return (
    <SimulationProvider>
      <BrowserRouter>
        <MainLayout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/modelo-matematico" element={<MathematicalModelPage />} />
            <Route path="/datos" element={<DataPage />} />
            <Route path="/grafos" element={<GraphsPage />} />
            <Route path="/optimizacion" element={<OptimizationPage />} />
            <Route path="/resultados" element={<ResultsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </MainLayout>
      </BrowserRouter>
    </SimulationProvider>
  );
}

export default App;
