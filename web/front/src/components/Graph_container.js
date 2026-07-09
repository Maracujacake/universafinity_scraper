import React, { useEffect, useMemo, useRef, useState } from 'react';
import Graph from 'graphology';
import Sigma from 'sigma';
import FA2Layout from 'graphology-layout-forceatlas2/worker';
import circular from 'graphology-layout/circular';
import NodeDetailsCard from './Node_Details';
import SigmaErrorScreen from '../pages/Sigma_Error';
import TimeSlider from './TimeSlider';

const BASE_URL = 'http://127.0.0.1:5000/api';

const COMMUNITY_PALETTE = [
  '#60A5FA', '#34D399', '#F472B6', '#FBBF24', '#A78BFA',
  '#38BDF8', '#4ADE80', '#FB923C', '#E879F9', '#2DD4BF',
  '#F87171', '#818CF8', '#FCD34D', '#86EFAC', '#67E8F9',
  '#C084FC', '#FCA5A5', '#6EE7B7', '#FDE68A', '#BAE6FD',
  '#DDD6FE', '#FBCFE8', '#A5F3FC', '#BBF7D0', '#FEF08A',
  '#E9D5FF', '#FECACA', '#99F6E4', '#FED7AA', '#BFDBFE',
  '#D9F99D', '#F5D0FE',
];

function getCommunityColor(community) {
  return COMMUNITY_PALETTE[(community ?? 0) % COMMUNITY_PALETTE.length];
}

function buildGraph(data, activeNodeId) {
  const graph = new Graph({ multi: false, allowSelfLoops: false });

  data.nodes.forEach((node) => {
    const isActive = node.id === activeNodeId;
    graph.addNode(node.id, {
      label: node.label || node.id,
      x: 0,
      y: 0,
      size: isActive ? 15 : 6,
      color: isActive ? '#F59E0B' : getCommunityColor(node.comunidade),
      comunidade: node.comunidade,
      dc_ufscar: node.dc_ufscar || false,
      classes: node.classes || [],
    });
  });

  data.edges.forEach((edge) => {
    if (!graph.hasNode(edge.source) || !graph.hasNode(edge.target)) return;
    if (graph.hasEdge(edge.source, edge.target)) return;

    const weight = edge.weight || 1;
    graph.addEdge(edge.source, edge.target, {
      weight,
      size: Math.max(1, Math.min(weight, 12) * 0.45),
      color: 'rgba(226, 232, 240, 0.38)',
      publicacoes: edge.publicacoes || [],
    });
  });

  graph.forEachNode((node) => {
    if (node === activeNodeId) return;
    const degree = graph.degree(node);
    graph.setNodeAttribute(node, 'size', Math.max(5, Math.min(7 + degree * 0.6, 12)));
  });

  return graph;
}

function getConnectionsFromEdges(edges, activeNodeId) {
  return edges
    .map((edge) => {
      const peer = edge.source === activeNodeId ? edge.target : edge.source;
      return {
        node: peer,
        weight: edge.weight || 1,
        publicacoes: edge.publicacoes || [],
      };
    })
    .sort((a, b) => b.weight - a.weight);
}

const GraphContainer = ({
  searchTerm,
  minWeight,
  setConnections,
  setGraphInfo,
  featuredNode,
  yearRange,
}) => {
  const sigmaRef = useRef(null);
  const graphRef = useRef(null);
  const fa2Ref = useRef(null);
  const containerRef = useRef(null);

  const activeNodeId = useMemo(
    () => searchTerm || featuredNode?.id || '',
    [searchTerm, featuredNode]
  );
  const activeNodeLabel = searchTerm ? searchTerm : featuredNode?.label;
  const showingIntroGraph = !searchTerm && Boolean(featuredNode?.id);

  const [loading, setLoading] = useState(false);
  const [layoutProgress, setLayoutProgress] = useState(0);
  const [layoutDone, setLayoutDone] = useState(false);
  const [error, setError] = useState(null);
  const [sigmaRenderError, setSigmaRenderError] = useState(false);
  const [clickedNode, setClickedNode] = useState(null);
  const [timeRange, setTimeRange] = useState(null);

  useEffect(() => {
    if (yearRange?.min && yearRange?.max && !timeRange) {
      setTimeRange([yearRange.min, yearRange.max]);
    }
  }, [timeRange, yearRange]);

  useEffect(() => {
    if (!activeNodeId) return undefined;

    let cancelled = false;
    let animFrame = null;

    const clearGraph = () => {
      if (fa2Ref.current) {
        fa2Ref.current.stop();
        fa2Ref.current.kill();
        fa2Ref.current = null;
      }
      if (sigmaRef.current) {
        sigmaRef.current.kill();
        sigmaRef.current = null;
      }
      if (graphRef.current) {
        graphRef.current.clear();
        graphRef.current = null;
      }
    };

    const waitForContainer = () => new Promise((resolve) => {
      const check = () => {
        const el = containerRef.current;
        if (el && el.offsetWidth > 0 && el.offsetHeight > 0) resolve();
        else requestAnimationFrame(check);
      };
      check();
    });

    const mountSubgraph = async () => {
      try {
        setLoading(true);
        setError(null);
        setSigmaRenderError(false);
        setClickedNode(null);
        setLayoutDone(false);
        setLayoutProgress(0);

        const params = new URLSearchParams({
          min_weight: String(minWeight || 1),
        });

        if (timeRange) {
          params.set('start_year', String(timeRange[0]));
          params.set('end_year', String(timeRange[1]));
        }

        const response = await fetch(
          `${BASE_URL}/subgrafo/${encodeURIComponent(activeNodeId)}?${params.toString()}`
        );

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        if (cancelled) return;

        setGraphInfo?.(data.info);
        setConnections?.(getConnectionsFromEdges(data.edges || [], activeNodeId));

        clearGraph();

        if (!data.nodes?.length) {
          setError('Autor nao encontrado na base.');
          setLoading(false);
          return;
        }

        const subGraph = buildGraph(data, activeNodeId);
        circular.assign(subGraph, { scale: Math.max(80, subGraph.order * 8) });

        await waitForContainer();
        if (cancelled) return;

        const sigma = new Sigma(subGraph, containerRef.current, {
          allowInvalidContainer: true,
          renderLabels: true,
          labelThreshold: showingIntroGraph ? 8 : 3,
          labelFont: 'Inter, Arial, sans-serif',
          labelSize: 12,
          labelWeight: '600',
          labelColor: { color: '#E5E7EB' },
          minCameraRatio: 0.03,
          maxCameraRatio: 10,
        });

        sigma.on('clickNode', ({ node }) => {
          if (subGraph.hasNode(node)) {
            setClickedNode({ id: node, ...subGraph.getNodeAttributes(node) });
          }
        });
        sigma.on('clickStage', () => setClickedNode(null));

        sigmaRef.current = sigma;
        graphRef.current = subGraph;
        setLoading(false);

        const fa2 = new FA2Layout(subGraph, {
          settings: {
            scalingRatio: showingIntroGraph ? 35 : 60,
            gravity: 1.8,
            slowDown: 8,
            linLogMode: true,
            outboundAttractionDistribution: true,
            edgeWeightInfluence: 0.4,
            barnesHutOptimize: subGraph.order > 250,
          },
        });

        fa2Ref.current = fa2;
        fa2.start();

        const layoutDurationMs = showingIntroGraph ? 3000 : 5500;
        const startTime = Date.now();

        const trackProgress = () => {
          if (cancelled) return;

          const elapsed = Date.now() - startTime;
          const progress = Math.min((elapsed / layoutDurationMs) * 100, 100);
          setLayoutProgress(Math.round(progress));

          if (elapsed < layoutDurationMs) {
            animFrame = requestAnimationFrame(trackProgress);
          } else {
            fa2.stop();
            setLayoutDone(true);
            setLayoutProgress(100);
          }
        };

        animFrame = requestAnimationFrame(trackProgress);
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
          setSigmaRenderError(true);
        }
      }
    };

    mountSubgraph();

    return () => {
      cancelled = true;
      if (animFrame) cancelAnimationFrame(animFrame);
      clearGraph();
    };
  }, [activeNodeId, minWeight, searchTerm, setConnections, setGraphInfo, showingIntroGraph, timeRange]);

  return (
    <div className="absolute inset-0 z-0 bg-slate-950">
      <div
        ref={containerRef}
        id="sigma-container"
        className="h-full w-full"
      />

      {showingIntroGraph && (
        <div className="pointer-events-none absolute bottom-8 left-6 z-10 max-w-sm rounded-lg border border-slate-700 bg-slate-950/82 p-4 text-slate-200 shadow-lg backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-wide text-cyan-300">
            Subgrafo de exemplo
          </p>
          <p className="mt-1 text-sm">
            {activeNodeLabel} aparece aqui para mostrar como a rede de coautoria e afinidade e explorada antes de uma busca.
          </p>
        </div>
      )}

      {loading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/86">
          <div className="rounded-lg border border-slate-700 bg-slate-900 px-5 py-3 text-sm font-semibold text-cyan-100 shadow-xl">
            Carregando subgrafo...
          </div>
        </div>
      )}

      {!loading && activeNodeId && !layoutDone && (
        <div className="pointer-events-none absolute top-4 left-1/2 z-20 flex -translate-x-1/2 flex-col items-center gap-1">
          <span className="text-xs font-semibold text-cyan-200">
            Organizando conexoes... {layoutProgress}%
          </span>
          <div className="h-1.5 w-48 overflow-hidden rounded-full bg-slate-700">
            <div
              className="h-full rounded-full bg-cyan-300 transition-all duration-300"
              style={{ width: `${layoutProgress}%` }}
            />
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/90">
          <div className="max-w-sm rounded-lg border border-red-700 bg-slate-900 p-6 text-center text-red-300 shadow-xl">
            <p className="mb-1 text-xs font-semibold uppercase tracking-widest">Erro</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      {sigmaRenderError && !error && <SigmaErrorScreen />}

      {!loading && activeNodeId && yearRange && timeRange && (
        <div className="absolute bottom-8 left-1/2 z-20 -translate-x-1/2">
          <TimeSlider
            minYear={yearRange.min}
            maxYear={yearRange.max}
            startYear={timeRange[0]}
            endYear={timeRange[1]}
            setStartYear={(val) => setTimeRange([val, timeRange[1]])}
            setEndYear={(val) => setTimeRange([timeRange[0], val])}
          />
        </div>
      )}

      {clickedNode && (
        <NodeDetailsCard
          node={clickedNode}
          onClose={() => setClickedNode(null)}
        />
      )}
    </div>
  );
};

export default GraphContainer;
