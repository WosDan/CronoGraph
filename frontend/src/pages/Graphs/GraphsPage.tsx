import { useEffect, useMemo, useRef, useState } from 'react';
import cytoscape, { type Core } from 'cytoscape';
import { Flame, Network, SlidersHorizontal } from 'lucide-react';
import { useSimulation } from '../../context/SimulationContext';
import type { ConflictEdge } from '../../types/academic';
import { Badge, Card, CardBody, CardHeader } from '../../components/ui/Primitives';

type GraphTab = 'conflict' | 'bipartite';
type CentralityMetric = 'betweenness' | 'degree';

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
  const [sizeBy, setSizeBy] = useState<CentralityMetric>('betweenness');
  const [kThreshold, setKThreshold] = useState<number>(0);
  const [showEdgeLabels, setShowEdgeLabels] = useState<boolean>(true);
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

  const maxKInGraph = useMemo(() => {
    if (!activeConflictGraph || activeConflictGraph.edges.length === 0) return 50;
    return Math.ceil(Math.max(1, ...activeConflictGraph.edges.map((e) => e.k_ij)));
  }, [activeConflictGraph]);

  const filteredConflictEdges = useMemo(() => {
    if (!activeConflictGraph) return [];
    return activeConflictGraph.edges.filter((edge) => edge.k_ij >= kThreshold);
  }, [activeConflictGraph, kThreshold]);

  const bottleneckExams = useMemo(() => {
    if (!activeConflictGraph) return [];
    return [...activeConflictGraph.nodes]
      .sort(
        (a, b) =>
          b.betweenness_centrality - a.betweenness_centrality ||
          b.degree_centrality - a.degree_centrality,
      )
      .slice(0, 5);
  }, [activeConflictGraph]);

  // Render Weighted Conflict Graph in Cytoscape.js
  useEffect(() => {
    if (activeTab !== 'conflict' || !activeConflictGraph || !conflictContainerRef.current) {
      return;
    }

    const maxK = Math.max(1, ...activeConflictGraph.edges.map((e) => e.k_ij));
    const maxBetweenness = Math.max(
      0.0001,
      ...activeConflictGraph.nodes.map((n) => n.betweenness_centrality),
    );
    const maxDegreeCent = Math.max(
      0.0001,
      ...activeConflictGraph.nodes.map((n) => n.degree_centrality),
    );

    const bottleneckSet = new Set(bottleneckExams.slice(0, 3).map((b) => b.id));

    const elements = [
      ...activeConflictGraph.nodes.map((node) => {
        const ratio =
          sizeBy === 'betweenness'
            ? node.betweenness_centrality / maxBetweenness
            : node.degree_centrality / maxDegreeCent;
        const diameter = Math.round(28 + ratio * 30);
        return {
          data: {
            id: node.id,
            label: `${node.id}\n${node.label}`,
            diameter,
            isBottleneck: bottleneckSet.has(node.id) ? 'yes' : 'no',
            weightedDegree: node.weighted_degree,
            degreeCentrality: node.degree_centrality,
            betweennessCentrality: node.betweenness_centrality,
            closenessCentrality: node.closeness_centrality,
            academicWeight: node.academic_weight,
            assignedDate: node.assigned_date,
            assignedTime: `${node.assigned_start_time}-${node.assigned_end_time}`,
            teacherName: node.teacher_name,
            subjectName: node.subject_name,
            enrolledStudents: node.enrolled_students,
          },
        };
      }),
      ...filteredConflictEdges.map((edge) => {
        const severity = !edge.has_active_penalty
          ? 'none'
          : edge.delta_days <= 1
            ? 'critical'
            : 'moderate';
        const width = !edge.has_active_penalty
          ? 1.4
          : edge.delta_days <= 1
            ? 3.2 + (edge.k_ij / maxK) * 5.8
            : 2.0 + (edge.k_ij / maxK) * 4.0;
        const edgeLabel = showEdgeLabels
          ? edge.has_active_penalty
            ? `K=${edge.k_ij.toFixed(1)} (Δ=${edge.delta_days}d)`
            : `K=0 (Δ=${edge.delta_days}d)`
          : '';
        return {
          data: {
            id: edge.id,
            source: edge.source,
            target: edge.target,
            edgePayload: edge,
            severity,
            lineWidth: width,
            label: edgeLabel,
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
            'text-margin-y': 6,
            'text-wrap': 'wrap',
            width: 'data(diameter)',
            height: 'data(diameter)',
            'border-width': 2,
            'border-color': '#e0e7ff',
          },
        },
        {
          selector: 'node[isBottleneck = "yes"]',
          style: {
            'background-color': '#4338ca',
            'border-width': 3.5,
            'border-color': '#f59e0b',
          },
        },
        {
          selector: 'edge',
          style: {
            label: 'data(label)',
            'font-size': '10px',
            'font-weight': 700,
            color: '#0f172a',
            'text-background-color': '#ffffff',
            'text-background-opacity': 0.92,
            'text-background-padding': '3px',
            'text-background-shape': 'roundrectangle',
            'text-border-width': 1,
            'text-border-color': '#cbd5e1',
            'text-border-opacity': 0.85,
            'curve-style': 'bezier',
          },
        },
        {
          selector: 'edge[severity = "critical"]',
          style: {
            width: 'data(lineWidth)',
            'line-color': '#ef4444',
            opacity: 0.92,
            color: '#991b1b',
            'text-border-color': '#fca5a5',
          },
        },
        {
          selector: 'edge[severity = "moderate"]',
          style: {
            width: 'data(lineWidth)',
            'line-color': '#f59e0b',
            opacity: 0.85,
            color: '#92400e',
            'text-border-color': '#fcd34d',
          },
        },
        {
          selector: 'edge[severity = "none"]',
          style: {
            width: 1.4,
            'line-color': '#94a3b8',
            'line-style': 'dashed',
            opacity: 0.55,
            color: '#475569',
          },
        },
        {
          selector: 'node:selected',
          style: {
            'background-color': '#4f46e5',
            'border-color': '#f59e0b',
            'border-width': 4,
          },
        },
        {
          selector: 'edge:selected',
          style: {
            'line-color': '#1d4ed8',
            opacity: 1,
            'z-index': 99,
          },
        },
      ],
      layout: {
        name: 'circle',
        padding: 44,
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
  }, [activeTab, activeConflictGraph, filteredConflictEdges, sizeBy, showEdgeLabels, bottleneckExams]);

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

  function focusNodeInGraph(nodeId: string) {
    const cy = cyConflictRef.current;
    if (!cy) return;
    const target = cy.getElementById(nodeId);
    if (target.length > 0) {
      cy.elements().unselect();
      target.select();
      cy.animate({ center: { eles: target }, duration: 300 });
      setSelectedNodeInfo(target.data());
      setSelectedEdge(null);
    }
  }

  if (loading && !initialConflictGraph) {
    return <p className="text-sm text-slate-600">Construyendo grafos desde el backend...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Visualización Interactiva de Grafos y Centralidades</h1>
          <p className="text-sm text-slate-600">
            Análisis estructural NetworkX (Grado Ponderado, Intermediación y Cercanía) integrado con
            semáforo térmico de conflictos en Cytoscape.js.
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
        <div className="space-y-5">
          {/* Interactive Controls Bar */}
          <Card>
            <CardBody className="flex flex-wrap items-center justify-between gap-4 py-3.5">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700">
                  <Network className="h-4 w-4 text-indigo-600" />
                  <span>Tamaño de nodo por:</span>
                </div>
                <select
                  aria-label="Métrica de tamaño de nodo"
                  value={sizeBy}
                  onChange={(e) => setSizeBy(e.target.value as CentralityMetric)}
                  className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium"
                >
                  <option value="betweenness">Centralidad de Intermediación (Betweenness)</option>
                  <option value="degree">Centralidad de Grado Ponderado (H_ij)</option>
                </select>
              </div>

              <div className="flex flex-1 min-w-[240px] max-w-md items-center gap-3">
                <SlidersHorizontal className="h-4 w-4 text-indigo-600 shrink-0" />
                <label className="text-xs font-medium text-slate-700 whitespace-nowrap">
                  Ver aristas con K ≥ <strong>{kThreshold}</strong>:
                </label>
                <input
                  type="range"
                  aria-label="Filtro umbral K"
                  min={0}
                  max={maxKInGraph}
                  step={1}
                  value={kThreshold}
                  onChange={(e) => setKThreshold(Number(e.target.value))}
                  className="w-full accent-indigo-600"
                />
                <span className="text-xs font-mono text-slate-500 whitespace-nowrap">
                  ({filteredConflictEdges.length}/{activeConflictGraph.total_conflict_edges})
                </span>
              </div>

              <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showEdgeLabels}
                  onChange={(e) => setShowEdgeLabels(e.target.checked)}
                  className="rounded accent-indigo-600"
                />
                Mostrar etiquetas K y Δ
              </label>
            </CardBody>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <Card className="lg:col-span-8">
              <CardHeader
                title={`Grafo de Conflictos (${conflictMode === 'optimized' ? 'Calendario Optimizado' : 'Calendario Inicial'})`}
                subtitle={`F = ${activeConflictGraph.total_objective_f.toFixed(2)} · Mostrando ${filteredConflictEdges.length} de ${activeConflictGraph.total_conflict_edges} aristas`}
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
                  className="h-[540px] w-full rounded-lg border border-slate-100 bg-slate-50/40"
                />
                {/* Semáforo térmico legend */}
                <div className="mt-2.5 flex flex-wrap gap-4 px-2 text-xs text-slate-600">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-1.5 w-6 bg-[#ef4444] inline-block rounded" /> Crítico (Δ=0 o Δ=1 día)
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-1 w-6 bg-[#f59e0b] inline-block rounded" /> Moderado (Δ=2 o Δ=3 días)
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-0.5 w-6 border-t-2 border-dashed border-[#94a3b8] inline-block" /> Sin penalización (Δ ≥ 4, K=0, H_ij &gt; 0)
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-full bg-[#4338ca] border-2 border-[#f59e0b] inline-block" /> Cuello de botella (Top 3)
                  </span>
                </div>
              </CardBody>
            </Card>

            {/* Right Sidebar: Bottleneck Panel + Edge/Node Inspector */}
            <div className="lg:col-span-4 space-y-5">
              <Card>
                <CardHeader
                  title="Materias Cuello de Botella (Top 5)"
                  subtitle="Mayor centralidad de intermediación: parciales que conectan caminos del grafo de conflictos"
                  action={<Flame className="h-4 w-4 text-amber-500" />}
                />
                <CardBody className="space-y-2 pt-3">
                  {bottleneckExams.map((node, idx) => (
                    <button
                      key={node.id}
                      type="button"
                      onClick={() => focusNodeInGraph(node.id)}
                      className="w-full text-left rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-indigo-50/60 hover:border-indigo-300 p-2.5 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-900">
                          #{idx + 1} · {node.id} ({node.label})
                        </span>
                        <Badge variant={idx < 3 ? 'amber' : 'neutral'}>
                          Betw: {node.betweenness_centrality.toFixed(3)}
                        </Badge>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[11px] text-slate-600">
                        <span>Grado norm.: {node.degree_centrality.toFixed(3)}</span>
                        <span>Cercanía: {node.closeness_centrality.toFixed(3)}</span>
                      </div>
                    </button>
                  ))}
                  <p className="text-[11px] text-slate-500 pt-1">
                    Estos exámenes conectan distintos grupos estudiantiles; el algoritmo de búsqueda
                    constructiva los asigna primero para evitar efectos dominó.
                  </p>
                </CardBody>
              </Card>

              <Card>
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
                        <Badge
                          variant={
                            !selectedEdge.has_active_penalty
                              ? 'emerald'
                              : selectedEdge.delta_days <= 1
                                ? 'rose'
                                : 'amber'
                          }
                        >
                          {!selectedEdge.has_active_penalty
                            ? 'K_ij = 0'
                            : selectedEdge.delta_days <= 1
                              ? 'Crítico'
                              : 'Moderado'}
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
                      <p>Fecha: <strong>{String(selectedNodeInfo.assignedDate ?? '')} ({String(selectedNodeInfo.assignedTime ?? '')})</strong></p>
                      <div className="pt-2 border-t border-slate-200 space-y-1">
                        <p>Grado ponderado K: <strong>{Number(selectedNodeInfo.weightedDegree ?? 0).toFixed(4)}</strong></p>
                        <p>Centralidad de Grado: <strong>{Number(selectedNodeInfo.degreeCentrality ?? 0).toFixed(4)}</strong></p>
                        <p>Centralidad Intermediación: <strong>{Number(selectedNodeInfo.betweennessCentrality ?? 0).toFixed(4)}</strong></p>
                        <p>Centralidad Cercanía: <strong>{Number(selectedNodeInfo.closenessCentrality ?? 0).toFixed(4)}</strong></p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">
                      Selecciona cualquier arista para desglosar A_ij, W_i, W_j, H_ij, Δ_ij y K_ij, o
                      haz clic en una materia cuello de botella para inspeccionar sus centralidades.
                    </p>
                  )}
                </CardBody>
              </Card>
            </div>
          </div>
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
