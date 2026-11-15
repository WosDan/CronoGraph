import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { BookOpen, Sliders } from 'lucide-react';
import { Card, CardBody, CardHeader, MathBlock, Badge } from '../../components/ui/Primitives';

const PENALTY_TABLE = [
  { delta: 'Δ = 0 días', deltaNum: 0, penalty: 4, interpretation: 'Mismo día: máxima congestión académica' },
  { delta: 'Δ = 1 día', deltaNum: 1, penalty: 3, interpretation: 'Días consecutivos: estudio sin pausa' },
  { delta: 'Δ = 2 días', deltaNum: 2, penalty: 2, interpretation: 'Un día intermedio de preparación' },
  { delta: 'Δ = 3 días', deltaNum: 3, penalty: 1, interpretation: 'Separación moderada, penalización leve' },
  { delta: 'Δ ≥ 4 días', deltaNum: 4, penalty: 0, interpretation: 'Ventana óptima: penalización dinámica nula (la arista se conserva)' },
];

export function MathematicalModelPage() {
  const [creditsI, setCreditsI] = useState(4);
  const [pctI, setPctI] = useState(0.30);
  const [retI, setRetI] = useState(0.20);

  const [creditsJ, setCreditsJ] = useState(3);
  const [pctJ, setPctJ] = useState(0.25);
  const [retJ, setRetJ] = useState(0.15);

  const [sharedStudents, setSharedStudents] = useState(18);
  const [deltaDays, setDeltaDays] = useState(1);

  const lab = useMemo(() => {
    const wI = creditsI * pctI * (1 + retI / 2);
    const wJ = creditsJ * pctJ * (1 + retJ / 2);
    const hIJ = sharedStudents * ((wI + wJ) / 2);
    const pDelta = Math.max(0, 4 - deltaDays);
    const kIJ = hIJ * pDelta;
    return { wI, wJ, hIJ, pDelta, kIJ };
  }, [creditsI, pctI, retI, creditsJ, pctJ, retJ, sharedStudents, deltaDays]);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900">Modelo Matemático</h1>
        <p className="text-sm text-slate-600">
          Formulación formal del grafo bipartito, proyección ponderada de conflictos, función objetivo y
          restricciones de dominio autorizado.
        </p>
      </div>

      {/* 6.1 Grafo bipartito */}
      <Card>
        <CardHeader
          title="6.1. Grafo bipartito estudiante-parcial y matriz de co-matrícula"
          subtitle="Transformación algebraica de matrículas en pares de parciales con estudiantes en común"
        />
        <CardBody className="space-y-3 text-sm text-slate-700">
          <p>
            Sea <MathBlock display={false} tex="G_B = (S \cup E, M)" /> un grafo bipartito no dirigido
            donde <MathBlock display={false} tex="S" /> es el conjunto de estudiantes y{' '}
            <MathBlock display={false} tex="E" /> el conjunto de evaluaciones parciales. Su matriz de
            incidencia binaria <MathBlock display={false} tex="B \in \{0,1\}^{|S| \times |E|}" /> se
            define como:
          </p>
          <MathBlock tex="B_{si} = \begin{cases} 1 & \text{si el estudiante } s \in S \text{ presenta el parcial } i \in E, \\ 0 & \text{en caso contrario.} \end{cases}" />
          <p>
            El producto matricial <MathBlock display={false} tex="A = B^\top B \in \mathbb{Z}_{\ge 0}^{|E| \times |E|}" />{' '}
            produce la matriz simétrica de estudiantes compartidos:
          </p>
          <MathBlock tex="A_{ij} = \sum_{s \in S} B_{si} \, B_{sj}" />
          <p>
            Las entradas de la diagonal <MathBlock display={false} tex="A_{ii}" /> indican el total de
            estudiantes inscritos en el parcial <MathBlock display={false} tex="i" />, mientras que las
            entradas fuera de la diagonal (<MathBlock display={false} tex="i \neq j" />) cuentan el
            número exacto de estudiantes que deben presentar simultáneamente los parciales{' '}
            <MathBlock display={false} tex="i" /> y <MathBlock display={false} tex="j" />.
          </p>
        </CardBody>
      </Card>

      {/* 6.2 Peso académico */}
      <Card>
        <CardHeader
          title="6.2. Peso académico de cada parcial"
          subtitle="Ponderación de impacto académico según créditos, porcentaje evaluado y tasa histórica de retiro"
        />
        <CardBody className="space-y-3 text-sm text-slate-700">
          <MathBlock tex="W_i = C_i \cdot p_i \cdot \left(1 + \frac{r_i}{2}\right)" />
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <MathBlock display={false} tex="C_i \in \{2,3,4,5\}" />: número de créditos académicos de
              la asignatura del parcial <MathBlock display={false} tex="i" />.
            </li>
            <li>
              <MathBlock display={false} tex="p_i \in (0, 1]" />: porcentaje de la nota definitiva que
              representa la evaluación parcial.
            </li>
            <li>
              <MathBlock display={false} tex="r_i \in [0, 0.35]" />: índice histórico de retiro de la
              asignatura, utilizado como factor moderado de vulnerabilidad académica.
            </li>
          </ul>
        </CardBody>
      </Card>

      {/* 6.3 Penalización temporal */}
      <Card>
        <CardHeader
          title="6.3. Penalización temporal por cercanía en días calendario"
          subtitle="Decaimiento lineal de la congestión entre 0 y 4 días de separación"
        />
        <CardBody className="space-y-4 text-sm text-slate-700">
          <MathBlock tex="P(\Delta_{ij}) = \max(0,\, 4 - \Delta_{ij}), \qquad \Delta_{ij} = |d(x_i) - d(x_j)|" />
          <p>
            Donde <MathBlock display={false} tex="\Delta_{ij}" /> se mide en días calendario entre las
            fechas asignadas a los parciales <MathBlock display={false} tex="i" /> y{' '}
            <MathBlock display={false} tex="j" />.
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th className="px-3 py-2">Distancia Δ</th>
                    <th className="px-3 py-2">P(Δ)</th>
                    <th className="px-3 py-2">Interpretación</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {PENALTY_TABLE.map((row) => (
                    <tr key={row.delta} className="bg-white">
                      <td className="px-3 py-2 font-medium">{row.delta}</td>
                      <td className="px-3 py-2 font-bold text-indigo-700">{row.penalty}</td>
                      <td className="px-3 py-2 text-slate-600">{row.interpretation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={PENALTY_TABLE}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="delta" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 4]} ticks={[0, 1, 2, 3, 4]} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="penalty" name="Penalización P(Δ)" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* 6.4 y 6.5 Peso de aristas y Función Objetivo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader
            title="6.4. Peso estructural fijo H_ij y dinámico K_ij"
            subtitle="Separación entre topología invariante y costo dependiente de la fecha"
          />
          <CardBody className="space-y-3 text-sm text-slate-700">
            <MathBlock tex="H_{ij} = A_{ij} \cdot \frac{W_i + W_j}{2}" />
            <MathBlock tex="K_{ij} = H_{ij} \cdot P(\Delta_{ij}) = A_{ij} \cdot P(\Delta_{ij}) \cdot \frac{W_i + W_j}{2}" />
            <p>
              <strong>Invariancia topológica:</strong> Toda arista con{' '}
              <MathBlock display={false} tex="A_{ij} > 0" /> pertenece permanentemente al grafo de
              conflictos. Cuando <MathBlock display={false} tex="\Delta_{ij} \ge 4" />, la penalización
              dinámica es <MathBlock display={false} tex="K_{ij} = 0" />, pero la relación estructural{' '}
              <MathBlock display={false} tex="H_{ij} > 0" /> no se elimina.
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="6.5. Función objetivo y 6.6. Restricciones"
            subtitle="Minimización sobre pares únicos i < j dentro de dominios autorizados"
          />
          <CardBody className="space-y-3 text-sm text-slate-700">
            <MathBlock tex="\min \; F(x) = \sum_{1 \le i < j \le |E|} K_{ij}(x_i, x_j)" />
            <MathBlock tex="\text{sujeto a: } \; x_i \in D_i \quad \forall i \in E" />
            <p>
              La suma sobre <MathBlock display={false} tex="i < j" /> garantiza que cada par de
              evaluaciones compartidas se contabilice exactamente una vez. El dominio{' '}
              <MathBlock display={false} tex="D_i" /> contiene únicamente las sesiones habituales de
              clase del docente y los espacios de sábado explícitamente autorizados, verificando
              duración completa y no superposición horaria de estudiantes, docentes o aulas.
            </p>
          </CardBody>
        </Card>
      </div>

      {/* Laboratorio Interactivo */}
      <Card>
        <CardHeader
          title="Laboratorio interactivo del modelo"
          subtitle="Modifica los parámetros de dos parciales i y j y observa en vivo W_i, W_j, H_ij, P(Δ) y K_ij"
          action={
            <Badge variant="indigo">
              <Sliders className="h-3 w-3" /> Cálculo exacto en vivo
            </Badge>
          }
        />
        <CardBody className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Parcial i */}
            <div className="space-y-3 rounded-xl border border-slate-200 p-4 bg-slate-50/50">
              <p className="text-sm font-semibold text-slate-900">Parcial i</p>
              <label className="block text-xs text-slate-600">
                Créditos C_i: <strong>{creditsI}</strong>
                <input
                  type="range"
                  min={2}
                  max={5}
                  step={1}
                  value={creditsI}
                  onChange={(e) => setCreditsI(Number(e.target.value))}
                  className="mt-1 w-full accent-indigo-600"
                />
              </label>
              <label className="block text-xs text-slate-600">
                Porcentaje p_i: <strong>{(pctI * 100).toFixed(0)}%</strong>
                <input
                  type="range"
                  min={0.1}
                  max={0.5}
                  step={0.05}
                  value={pctI}
                  onChange={(e) => setPctI(Number(e.target.value))}
                  className="mt-1 w-full accent-indigo-600"
                />
              </label>
              <label className="block text-xs text-slate-600">
                Tasa retiro r_i: <strong>{retI.toFixed(2)}</strong>
                <input
                  type="range"
                  min={0}
                  max={0.35}
                  step={0.01}
                  value={retI}
                  onChange={(e) => setRetI(Number(e.target.value))}
                  className="mt-1 w-full accent-indigo-600"
                />
              </label>
              <div className="pt-2 border-t border-slate-200 text-xs">
                W_i = <strong className="text-indigo-700 text-sm">{lab.wI.toFixed(4)}</strong>
              </div>
            </div>

            {/* Parcial j */}
            <div className="space-y-3 rounded-xl border border-slate-200 p-4 bg-slate-50/50">
              <p className="text-sm font-semibold text-slate-900">Parcial j</p>
              <label className="block text-xs text-slate-600">
                Créditos C_j: <strong>{creditsJ}</strong>
                <input
                  type="range"
                  min={2}
                  max={5}
                  step={1}
                  value={creditsJ}
                  onChange={(e) => setCreditsJ(Number(e.target.value))}
                  className="mt-1 w-full accent-indigo-600"
                />
              </label>
              <label className="block text-xs text-slate-600">
                Porcentaje p_j: <strong>{(pctJ * 100).toFixed(0)}%</strong>
                <input
                  type="range"
                  min={0.1}
                  max={0.5}
                  step={0.05}
                  value={pctJ}
                  onChange={(e) => setPctJ(Number(e.target.value))}
                  className="mt-1 w-full accent-indigo-600"
                />
              </label>
              <label className="block text-xs text-slate-600">
                Tasa retiro r_j: <strong>{retJ.toFixed(2)}</strong>
                <input
                  type="range"
                  min={0}
                  max={0.35}
                  step={0.01}
                  value={retJ}
                  onChange={(e) => setRetJ(Number(e.target.value))}
                  className="mt-1 w-full accent-indigo-600"
                />
              </label>
              <div className="pt-2 border-t border-slate-200 text-xs">
                W_j = <strong className="text-indigo-700 text-sm">{lab.wJ.toFixed(4)}</strong>
              </div>
            </div>

            {/* Interacción */}
            <div className="space-y-3 rounded-xl border border-indigo-200 p-4 bg-indigo-50/50">
              <p className="text-sm font-semibold text-indigo-950">Interacción de arista (i, j)</p>
              <label className="block text-xs text-slate-700">
                Estudiantes compartidos A_ij: <strong>{sharedStudents}</strong>
                <input
                  type="range"
                  min={1}
                  max={60}
                  step={1}
                  value={sharedStudents}
                  onChange={(e) => setSharedStudents(Number(e.target.value))}
                  className="mt-1 w-full accent-indigo-600"
                />
              </label>
              <label className="block text-xs text-slate-700">
                Distancia temporal Δ_ij (días): <strong>{deltaDays}</strong>
                <input
                  type="range"
                  min={0}
                  max={7}
                  step={1}
                  value={deltaDays}
                  onChange={(e) => setDeltaDays(Number(e.target.value))}
                  className="mt-1 w-full accent-indigo-600"
                />
              </label>
              <div className="pt-2 border-t border-indigo-200 space-y-1 text-xs">
                <p>
                  Componente fijo H_ij = <strong>{lab.hIJ.toFixed(4)}</strong>
                </p>
                <p>
                  Penalización P(Δ) = <strong>{lab.pDelta}</strong>
                </p>
                <p className="text-sm">
                  Conflicto ponderado K_ij ={' '}
                  <strong className={lab.kIJ > 0 ? 'text-rose-700' : 'text-emerald-700'}>
                    {lab.kIJ.toFixed(4)}
                  </strong>
                </p>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Fundamentación bibliográfica */}
      <Card>
        <CardHeader
          title="Fundamentación científica y delimitación metodológica"
          subtitle="Distinción explícita entre literatura científica verificable y decisiones de modelado propias de CronoGraph"
          action={<BookOpen className="h-5 w-5 text-slate-400" />}
        />
        <CardBody className="space-y-4 text-sm text-slate-700">
          <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-3.5 text-xs text-amber-900">
            <strong>Nota metodológica:</strong> La expresión de peso académico{' '}
            <code>W_i = C_i · p_i · (1 + r_i/2)</code> y el horizonte lineal de 4 días{' '}
            <code>P(Δ) = max(0, 4 − Δ)</code> son decisiones de diseño propias del proyecto académico
            CronoGraph para representar la prioridad curricular; no constituyen constantes universales
            derivadas empíricamente en la literatura.
          </div>
          <ul className="space-y-2 text-xs sm:text-sm list-disc pl-5">
            <li>
              <strong>Carter, M. W., Laporte, G., &amp; Lee, S. Y. (1996).</strong> Examination
              timetabling: Algorithmic strategies and applications. <em>Journal of the Operational Research Society</em>, 47(3), 373–383.
            </li>
            <li>
              <strong>Qu, R., Burke, E. K., McCollum, B., Merlot, L. T., &amp; Lee, S. Y. (2009).</strong> A
              survey of search methodologies and automated system development for examination
              timetabling. <em>Journal of Scheduling</em>, 12(1), 55–89.
            </li>
            <li>
              <strong>McCollum, B., et al. (2010).</strong> Setting the research agenda in automated
              timetabling: The second international timetabling competition. <em>INFORMS Journal on Computing</em>, 22(1), 120–130.
            </li>
            <li>
              <strong>Diestel, R. (2017).</strong> <em>Graph Theory</em> (5th ed.). Springer. (Fundamentos
              de grafos bipartitos y proyecciones ponderadas).
            </li>
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}
