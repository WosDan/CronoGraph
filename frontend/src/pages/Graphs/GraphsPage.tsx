import { useEffect, useMemo, useRef, useState } from 'react';
import cytoscape, { type Core } from 'cytoscape';
import { useSimulation } from '../../context/SimulationContext';
import type { ConflictEdge } from '../../types/academic';
import { Badge, Card, CardBody, CardHeader } from '../../components/ui/Primitives';

type GraphTab = 'conflict' | 'bipartite';

export function GraphsPage() {
  const {
    dataset,
    bipartiteGraph,
    initialConflictGraph,
    optimizedConflictGraph,
    activeRun,
    loading,
  } = useSimulation();

  const [activeTab, setActiveTab] = useState<GraphTab>('conflict');
  const [conflictMode, setConflictMode] = useState<'initial' | 'optimized'>('initial');
  const [selectedEdge, setSelectedEdge] = useState<ConflictEdge | null>(null);
  const [selectedNodeInfo, setSelectedNodeInfo] = useState<Record<string, unknown> | null>(null);

  // Bipartite filters (to avoid crowding 120 students)
  const [subjectFilter, setSubjectFilter] = useState<string>('ALL');
  const [groupFilter, setGroupFilter] = useState<string>('ALL');
  const [studentQuery, setStudentQuery] = useState<string>('');

  const conflictContainerRef = useRef<HTMLDivElement | null>(null);
  const bipartiteContainerRef = useRef<HTMLDivElement | null>(null);
  const cyConflictRef = useRef<Core | null>(null);
  const cyBipartiteRef = useRef<Core | null>(null);

  const activeConflictGraph =
    conflictMode === 'optimized' && optimizedConflictGraph
      ? optimizedConflictGraph
      : initialConflictGraph;

  // Render Weighted Conflict Graph in Cytoscape.js
  useEffect(() => {
    if (activeTab !== 'conflict' || !activeConflictGraph || !conflictContainerRef.current) {
      return;
    }

    const maxK = Math.max(
      1,
      ...activeConflictGraph.edges.map((e) => e.k_ij),
    );

    const elements = [
      ...activeConflictGraph.nodes.map((node) => ({
        data: {
          id: node.id,
          label: `${node.id}\n${node.label}`,
          weightedDegree: node.weighted_degree,
          academicWeight: node.academic_weight,
          assignedDate: node.assigned_date,
          assignedTime: `${node.assigned_start_time}-${node.assigned_end_time}`,
          teacherName: node.teacher_name,
          subjectName: node.subject_name,
          enrolledStudents: node.enrolled_students,
        },
      })),
      ...activeConflictGraph.edges.map((edge) => {
        const width = edge.has_active_penalty
          ? 2.2 + (edge.k_ij / maxK) * 6.5
          : 1.3;
        return {
          data: {
            id: edge.id,
            source: edge.source,
            target: edge.target,
            edgePayload: edge,
            hasActive: edge.has_active_penalty ? 'yes' : 'no',
            lineWidth: width,
            label: edge.has_active_penalty ? `K=${edge.k_ij.toFixed(1)}` : `H=${edge.h_ij.toFixed(0)} (Δ≥4)`,
          },
        };
      }),
    ];

    const cy = cytoscape({
      container: conflictContainerRef.current,
      elements,
      style: [
        {
          selector: 'node',
          style: {
            'background-color': '#312e81',
            label: 'data(label)',
            color: '#0f172a',
            'font-size': '10px',
            'font-weight': 600,
            'text-valign': 'bottom',
            'text-margin-y': 5,
            'text-wrap': 'wrap',
            width: 30,
            height: 30,
            'border-width': 2,
            'border-color': '#e0e7ff',
          },
        },
        {
          selector: 'edge[hasActive = "yes"]',
          style: {
            width: 'data(lineWidth)',
            'line-color': '#e11d48',
            opacity: 0.85,
            'curve-style': 'bezier',
          },
        },
        {
          selector: 'edge[hasActive = "no"]',
          style: {
            width: 1.2,
            'line-color': '#cbd5e1',
            'line-style': 'dashed',
            opacity: 0.55,
            'curve-style': 'bezier',
          },
        },
        {
          selector: 'node:selected',
          style: {
            'background-color': '#4f46e5',
            'border-color': '#f59e0b',
            'border-width': 3,
          },
        },
        {
          selector: 'edge:selected',
          style: {
            'line-color': '#f59e0b',
            opacity: 1,
          },
        },
      ],
      layout: {
        name: 'circle',
        padding: 36,
      },
    });

    cy.on('tap', 'edge', (evt) => {
      const payload = evt.target.data('edgePayload') as ConflictEdge;
      setSelectedEdge(payload);
      setSelectedNodeInfo(null);
    });

    cy.on('tap', 'node', (evt) => {
      setSelectedNodeInfo(evt.target.data());
      setSelectedEdge(null);
    });

    cyConflictRef.current = cy;
    return () => {
      cy.destroy();
      cyConflictRef.current = null;
    };
  }, [activeTab, activeConflictGraph]);

  // Filtered Bipartite Elements
  const filteredBipartite = useMemo(() => {
    if (!bipartiteGraph || !dataset) return { nodes: [], edges: [] };

    const q = studentQuery.trim().toLowerCase();
    const matchingEdges = bipartiteGraph.edges.filter((edge) => {
      if (subjectFilter !== 'ALL' && edge.subject_id !== subjectFilter) return false;
      if (groupFilter !== 'ALL' && edge.group_id !== groupFilter) return false;
      return true;
    });

    const connectedStudentIds = new Set(matchingEdges.map((e) => e.source));
    const connectedExamIds = new Set(matchingEdges.map((e) => e.target));

    const students = bipartiteGraph.nodes.filter((n) => {
      if (n.node_type !== 'student') return false;
      if (!connectedStudentIds.has(n.id)) return false;
      if (q && !n.id.toLowerCase().includes(q) && !n.label.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });

    // Limit to 35 displayed students when no specific filter/search is active to preserve readability
    const cappedStudents =
      subjectFilter === 'ALL' && groupFilter === 'ALL' && !q
        ? students.slice(0, 35)
        : students;
    const allowedStudentSet = new Set(cappedStudents.map((s) => s.id));

    const finalEdges = matchingEdges.filter((e) => allowedStudentSet.has(e.source));
    const finalExamSet = new Set(finalEdges.map((e) => e.target));
    const exams = bipartiteGraph.nodes.filter(
      (n) =>
        n.node_type === 'exam' &&
        (finalExamSet.has(n.id) || (subjectFilter === 'ALL' && connectedExamIds.has(n.id))),
    );

    return {
      nodes: [...cappedStudents, ...exams],
      edges: finalEdges,
      totalMatchedStudents: students.length,
    };
  }, [bipartiteGraph, dataset, subjectFilter, groupFilter, studentQuery]);

  // Render Bipartite Graph in Cytoscape.js
  useEffect(() => {
    if (activeTab !== 'bipartite' || !bipartiteContainerRef.current || filteredBipartite.nodes.length === 0) {
      return;
    }

    const students = filteredBipartite.nodes.filter((n) => n.node_type === 'student');
    const exams = filteredBipartite.nodes.filter((n) => n.node_type === 'exam');

    const elements = [
      ...students.map((st, idx) => ({
        data: {
          id: st.id,
          label: st.id,
          nodeType: 'student',
          fullLabel: st.label,
          meta: st.metadata,
        },
        position: { x: 100, y: 40 + idx * 28 },
      })),
      ...exams.map((ex, idx) => ({
        data: {
          id: ex.id,
          label: `${ex.id} · ${ex.label}`,
          nodeType: 'exam',
          fullLabel: ex.label,
          meta: ex.metadata,
        },
        position: { x: 560, y: 40 + idx * 46 },
      })),
      ...filteredBipartite.edges.map((edge) => ({
        data: {
          id: edge.id,
          source: edge.source,
          target: edge.target,
        },
      })),
    ];

    const cy = cytoscape({
      container: bipartiteContainerRef.current,
      elements,
      style: [
        {
          selector: 'node[nodeType = "student"]',
          style: {
            'background-color': '#0284c7',
            label: 'data(label)',
            'font-size': '9px',
            width: 18,
            height: 18,
            'text-halign': 'left',
            'text-margin-x': -6,
            color: '#0f172a',
          },
        },
        {
          selector: 'node[nodeType = "exam"]',
          style: {
            'background-color': '#4f46e5',
            shape: 'round-rectangle',
            label: 'data(label)',
            'font-size': '10px',
            'font-weight': 600,
            width: 26,
            height: 22,
            'text-halign': 'right',
            'text-margin-x': 8,
            color: '#1e1b4b',
          },
        },
        {
          selector: 'edge',
          style: {
            width: 1,
            'line-color': '#94a3b8',
            opacity: 0.45,
          },
        },
        {
          selector: '.highlighted',
          style: {
            'line-color': '#f59e0b',
            'background-color': '#f59e0b',
            width: 2.5,
            opacity: 1,
          },
        },
      ],
      layout: { name: 'preset', fit: true, padding: 30 },
    });

    cy.on('tap', 'node', (evt) => {
      cy.elements().removeClass('highlighted');
      const node = evt.target;
      node.addClass('highlighted');
      node.connectedEdges().addClass('highlighted');
      node.neighborhood().addClass('highlighted');
      setSelectedNodeInfo({
        id: node.id(),
        label: node.data('fullLabel'),
        nodeType: node.data('nodeType'),
        ...((node.data('meta') as Record<string, unknown>) ?? {}),
      });
      setSelectedEdge(null);
    });

    cyBipartiteRef.current = cy;
    return () => {
      cy.destroy();
      cyBipartiteRef.current = null;
    };
  }, [activeTab, filteredBipartite]);

  if (loading && !initialConflictGraph) {
    return <p className="text-sm text-slate-600">Construyendo grafos desde el backend...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Visualización Interactiva de Grafos</h1>
          <p className="text-sm text-slate-600">
            Inspección directa con Cytoscape.js de las aristas de conflicto calculadas por NetworkX y
            el grafo bipartito estudiante-parcial.
          </p>
        </div>

        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
          <button
            type="button"
            onClick={() => {
              setActiveTab('conflict');
              setSelectedEdge(null);
              setSelectedNodeInfo(null);
            }}
            className={`rounded-md px-3.5 py-1.5 text-xs font-semibold ${
              activeTab === 'conflict'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Grafo Ponderado de Conflictos
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('bipartite');
              setSelectedEdge(null);
              setSelectedNodeInfo(null);
            }}
            className={`rounded-md px-3.5 py-1.5 text-xs font-semibold ${
              activeTab === 'bipartite'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Grafo Bipartito (S ∪ E)
          </button>
        </div>
      </div>

      {activeTab === 'conflict' && activeConflictGraph && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <Card className="lg:col-span-8">
            <CardHeader
              title={`Grafo de Conflictos (${conflictMode === 'optimized' ? 'Calendario Optimizado' : 'Calendario Inicial'})`}
              subtitle={`F = ${activeConflictGraph.total_objective_f.toFixed(2)} · ${activeConflictGraph.active_conflict_edges} aristas activas (rojo) · ${activeConflictGraph.zero_penalty_edges} con K_ij = 0 (discontinuas, conservadas)`}
              action={
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setConflictMode('initial')}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium border ${
                      conflictMode === 'initial'
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-700 border-slate-300'
                    }`}
                  >
                    Original
                  </button>
                  <button
                    type="button"
                    disabled={!activeRun}
                    onClick={() => setConflictMode('optimized')}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium border disabled:opacity-40 ${
                      conflictMode === 'optimized'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white text-slate-700 border-slate-300'
                    }`}
                  >
                    Optimizado
                  </button>
                  <button
                    type="button"
                    onClick={() => cyConflictRef.current?.fit(undefined, 30)}
                    className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-50"
                  >
                    Centrar
                  </button>
                </div>
              }
            />
            <CardBody className="p-2">
              <div
                ref={conflictContainerRef}
                className="h-[520px] w-full rounded-lg border border-slate-100 bg-slate-50/40"
              />
              <div className="mt-2 flex flex-wrap gap-4 px-2 text-xs text-slate-600">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-1 w-5 bg-rose-600 inline-block rounded" /> Arista con penalización activa (Δ &lt; 4, K_ij &gt; 0)
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-0.5 w-5 border-t-2 border-dashed border-slate-400 inline-block" /> Relación sin penalización (Δ ≥ 4, K_ij = 0, H_ij &gt; 0)
                </span>
              </div>
            </CardBody>
          </Card>

          <Card className="lg:col-span-4">
            <CardHeader
              title="Inspector matemático"
              subtitle="Haz clic en una arista o nodo del grafo"
            />
            <CardBody>
              {selectedEdge ? (
                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-900">
                      Arista {selectedEdge.source} ↔ {selectedEdge.target}
                    </span>
                    <Badge variant={selectedEdge.has_active_penalty ? 'rose' : 'emerald'}>
                      {selectedEdge.has_active_penalty ? 'Conflicto activo' : 'K_ij = 0'}
                    </Badge>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-1.5">
                    <p>Estudiantes compartidos (A_ij): <strong>{selectedEdge.shared_students}</strong></p>
                    <p>Peso académico W_i: <strong>{selectedEdge.w_i.toFixed(4)}</strong></p>
                    <p>Peso académico W_j: <strong>{selectedEdge.w_j.toFixed(4)}</strong></p>
                    <p>Componente fijo H_ij: <strong>{selectedEdge.h_ij.toFixed(4)}</strong></p>
                    <p>Distancia temporal Δ_ij: <strong>{selectedEdge.delta_days} días</strong></p>
                    <p>Penalización P(Δ_ij): <strong>{selectedEdge.temporal_penalty}</strong></p>
                    <p className="pt-1 border-t border-slate-200 text-sm">
                      Conflicto ponderado K_ij:{' '}
                      <strong className={selectedEdge.k_ij > 0 ? 'text-rose-700' : 'text-emerald-700'}>
                        {selectedEdge.k_ij.toFixed(4)}
                      </strong>
                    </p>
                  </div>
                </div>
              ) : selectedNodeInfo ? (
                <div className="space-y-2 text-xs rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-sm font-bold text-slate-900">{String(selectedNodeInfo.id)}</p>
                  <p>{String(selectedNodeInfo.subjectName ?? '')}</p>
                  <p>Docente: <strong>{String(selectedNodeInfo.teacherName ?? '')}</strong></p>
                  <p>Inscritos: <strong>{String(selectedNodeInfo.enrolledStudents ?? '')}</strong></p>
                  <p>Peso W_i: <strong>{Number(selectedNodeInfo.academicWeight ?? 0).toFixed(4)}</strong></p>
                  <p>Fecha asignada: <strong>{String(selectedNodeInfo.assignedDate ?? '')} ({String(selectedNodeInfo.assignedTime ?? '')})</strong></p>
                  <p>Grado ponderado K: <strong>{Number(selectedNodeInfo.weightedDegree ?? 0).toFixed(4)}</strong></p>
                </div>
              ) : (
                <p className="text-xs text-slate-500">
                  Selecciona cualquier arista para desglosar A_ij, W_i, W_j, H_ij, Δ_ij, P(Δ_ij) y K_ij
                  calculados por el backend.
                </p>
              )}
            </CardBody>
          </Card>
        </div>
      )}

      {activeTab === 'bipartite' && dataset && (
        <div className="space-y-4">
          <Card>
            <CardBody className="flex flex-wrap items-center gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Asignatura</label>
                <select
                  value={subjectFilter}
                  onChange={(e) => {
                    setSubjectFilter(e.target.value);
                    setGroupFilter('ALL');
                  }}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-white"
                >
                  <option value="ALL">Todas (muestra 35 est.)</option>
                  {dataset.subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code} — {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Grupo</label>
                <select
                  value={groupFilter}
                  onChange={(e) => setGroupFilter(e.target.value)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-white"
                >
                  <option value="ALL">Todos los grupos</option>
                  {dataset.groups
                    .filter((g) => subjectFilter === 'ALL' || g.subject_id === subjectFilter)
                    .map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.code}
                      </option>
                    ))}
                </select>
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-medium text-slate-600 mb-1">Buscar estudiante</label>
                <input
                  type="text"
                  value={studentQuery}
                  onChange={(e) => setStudentQuery(e.target.value)}
                  placeholder="Ej. EST-015 o nombre..."
                  className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-white"
                />
              </div>
              <button
                type="button"
                onClick={() => cyBipartiteRef.current?.fit(undefined, 25)}
                className="self-end rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium hover:bg-slate-50"
              >
                Ajustar vista
              </button>
            </CardBody>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <Card className="lg:col-span-9">
              <CardHeader
                title="Grafo Bipartito Estudiantes ↔ Parciales"
                subtitle={`Mostrando ${filteredBipartite.nodes.filter((n) => n.node_type === 'student').length} estudiantes de ${filteredBipartite.totalMatchedStudents ?? 0} coincidentes y ${filteredBipartite.edges.length} matrículas`}
              />
              <CardBody className="p-2">
                <div
                  ref={bipartiteContainerRef}
                  className="h-[520px] w-full rounded-lg border border-slate-100 bg-slate-50/40"
                />
              </CardBody>
            </Card>
            <Card className="lg:col-span-3">
              <CardHeader title="Detalle del nodo" />
              <CardBody className="text-xs space-y-2">
                {selectedNodeInfo ? (
                  <div className="space-y-1.5">
                    <p className="text-sm font-bold text-slate-900">{String(selectedNodeInfo.id)}</p>
                    <p className="font-medium text-indigo-700">{String(selectedNodeInfo.label)}</p>
                    <p>Tipo: {selectedNodeInfo.nodeType === 'student' ? 'Estudiante' : 'Parcial'}</p>
                    {selectedNodeInfo.program ? (
                      <p>Programa: {String(selectedNodeInfo.program)}</p>
                    ) : null}
                    {selectedNodeInfo.enrolled_students !== undefined ? (
                      <p>Inscritos: {String(selectedNodeInfo.enrolled_students)}</p>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-slate-500">
                    Haz clic en un estudiante (azul) o parcial (índigo) para resaltar sus conexiones.
                  </p>
                )}
              </CardBody>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
