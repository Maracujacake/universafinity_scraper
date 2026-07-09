// src/components/GrafoDC_container.js
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import NodeDetailsCard from './Node_Details';
import { createGraphBenchmark } from '../utils/graphBenchmark';

const COMMUNITY_PALETTE = [
  '#60A5FA', '#34D399', '#F472B6', '#FBBF24', '#A78BFA',
  '#38BDF8', '#4ADE80', '#FB923C', '#E879F9', '#2DD4BF',
];

const BASE_URL = 'http://127.0.0.1:5000/api';

const DOCENTES_DC_IDS = [
  'alan demetrius baria valejo',
  'fredy valente',
  'andre ricardo backes',
  'andre takeshi endo',
  'auri marcelo rizzo vincenzi',
  'delano medeiros beder',
  'cesar henrique comin',
  'daniel lucredio',
  'edilson reis rodrigues kato',
  'ednaldo brigante pizzolato',
  'fabiano cutigi ferrari',
  'helio crestana guardia',
  'marcela xavier ribeiro',
];

function getCommunityColor(community) {
  return COMMUNITY_PALETTE[(community ?? 0) % COMMUNITY_PALETTE.length];
}

function getShortLabel(label = '') {
  const parts = label.split(' ').filter(Boolean);
  if (parts.length <= 2) return label;
  return `${parts[0]} ${parts[parts.length - 1]}`;
}

function getPeerWeight(peerId, docenteId, edges) {
  const edge = edges.find((item) => (
    (item.source === docenteId && item.target === peerId) ||
    (item.target === docenteId && item.source === peerId)
  ));

  return edge?.weight || 1;
}

function computeReadableLayout(docenteId, subgraph) {
  const width = 420;
  const height = 260;
  const central = subgraph.nodes.find((node) => node.id === docenteId);
  const peers = subgraph.nodes
    .filter((node) => node.id !== docenteId)
    .sort((a, b) => (
      getPeerWeight(b.id, docenteId, subgraph.edges) -
      getPeerWeight(a.id, docenteId, subgraph.edges)
    ));

  const columns = peers.length <= 8 ? 1 : peers.length <= 18 ? 2 : 3;
  const rows = Math.max(1, Math.ceil(peers.length / columns));
  const xStart = columns === 1 ? 250 : 170;
  const xGap = columns === 1 ? 0 : 190 / (columns - 1);
  const yGap = rows === 1 ? 0 : 200 / (rows - 1);
  const yStart = rows === 1 ? height / 2 : 30;
  const positions = new Map();

  if (central) positions.set(docenteId, { x: 58, y: height / 2 });

  peers.forEach((node, index) => {
    const column = Math.floor(index / rows);
    const row = index % rows;
    positions.set(node.id, {
      x: xStart + column * xGap,
      y: yStart + row * yGap,
    });
  });

  return { width, height, positions };
}

const MiniGrafoSvg = ({ docenteId, subgraph, onNodeClick, onBenchmark }) => {
  const layout = useMemo(
    () => computeReadableLayout(docenteId, subgraph),
    [docenteId, subgraph]
  );
  const docente = subgraph.nodes.find((node) => node.id === docenteId);
  const peersCount = Math.max(0, subgraph.nodes.length - 1);

  useEffect(() => {
    const benchmark = createGraphBenchmark('grafo2-mini-svg', {
      docenteId,
      nodes: subgraph.nodes.length,
      edges: subgraph.edges.length,
    });

    benchmark.mark('compute-readable-layout');
    const result = benchmark.finish();
    onBenchmark?.(result.summary);
  }, [docenteId, onBenchmark, subgraph.edges.length, subgraph.nodes.length]);

  const handleNodeClick = (node) => {
    onNodeClick({
      id: node.id,
      label: node.label,
      comunidade: node.comunidade,
      dc_ufscar: node.dc_ufscar,
      classes: node.classes || [],
    });
  };

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden flex flex-col min-h-[20rem]">
      <div className="px-3 py-2 border-b border-gray-700 bg-gray-800">
        <p className="text-xs font-mono font-semibold text-yellow-300 truncate">
          {docente?.label ?? docenteId}
        </p>
        <p className="text-xs text-gray-400">
          {peersCount} no(s), {subgraph.edges.length} aresta(s)
        </p>
      </div>

      <svg
        className="h-64 w-full bg-gray-900"
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        role="img"
        aria-label={`Subgrafo de ${docente?.label ?? docenteId}`}
      >
        <rect width={layout.width} height={layout.height} fill="#111827" />

        {subgraph.edges.map((edge, index) => {
          const source = layout.positions.get(edge.source);
          const target = layout.positions.get(edge.target);
          if (!source || !target) return null;

          const isCentralEdge = edge.source === docenteId || edge.target === docenteId;
          const strokeWidth = Math.max(1, Math.min(edge.weight || 1, 10) * 0.35);

          return (
            <line
              key={`${edge.source}-${edge.target}-${index}`}
              x1={source.x}
              y1={source.y}
              x2={target.x}
              y2={target.y}
              stroke={isCentralEdge ? 'rgba(226, 232, 240, 0.5)' : 'rgba(56, 189, 248, 0.28)'}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />
          );
        })}

        {subgraph.nodes.map((node) => {
          const position = layout.positions.get(node.id);
          if (!position) return null;

          const isCentral = node.id === docenteId;
          const weight = isCentral ? 1 : getPeerWeight(node.id, docenteId, subgraph.edges);
          const radius = isCentral ? 10 : Math.max(4, Math.min(5 + Math.sqrt(weight), 9));

          return (
            <g
              key={node.id}
              className="cursor-pointer"
              onClick={() => handleNodeClick(node)}
            >
              <circle
                cx={position.x}
                cy={position.y}
                r={radius}
                fill={isCentral ? '#FBBF24' : getCommunityColor(node.comunidade)}
                stroke={isCentral ? '#FFFFFF' : 'rgba(255,255,255,0.55)'}
                strokeWidth={isCentral ? 2.5 : 1}
              />
              <title>{node.label || node.id}</title>
              {isCentral ? (
                <text
                  x={position.x + 15}
                  y={position.y + 4}
                  fill="#FDE68A"
                  fontSize="10"
                  fontFamily="monospace"
                  fontWeight="700"
                >
                  Docente
                </text>
              ) : (
                <text
                  x={position.x + 10}
                  y={position.y + 3}
                  fill="#CBD5E1"
                  fontSize="8"
                  fontFamily="monospace"
                >
                  {getShortLabel(node.label || node.id)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
};

const GrafoDCSubgrafos = () => {
  const [subgraphs, setSubgraphs] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [clickedNode, setClickedNode] = useState(null);
  const [benchmarkRows, setBenchmarkRows] = useState([]);

  useEffect(() => {
    const benchmark = createGraphBenchmark('grafo2-subgrafos');
    let cancelled = false;

    const fetchData = async () => {
      try {
        const entries = await Promise.all(
          DOCENTES_DC_IDS.map(async (docenteId) => {
            const response = await fetch(`${BASE_URL}/subgrafo/${encodeURIComponent(docenteId)}`);
            if (!response.ok) throw new Error(`${docenteId}: HTTP ${response.status}`);
            const data = await response.json();
            return [docenteId, data];
          })
        );
        benchmark.mark('parse-json', {
          docentes: entries.length,
        });

        if (!cancelled) {
          const nextSubgraphs = Object.fromEntries(
            entries.filter(([, data]) => data.nodes?.length > 0)
          );
          setSubgraphs(nextSubgraphs);
          benchmark.finish({
            docentes: Object.keys(nextSubgraphs).length,
          });
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, []);

  const docentesPresentes = DOCENTES_DC_IDS.filter((id) => subgraphs[id]);

  const handleMiniBenchmark = useCallback((summary) => {
    setBenchmarkRows((previous) => {
      const next = previous.filter((row) => row.docenteId !== summary.docenteId);
      return [...next, summary].sort((a, b) => b.totalMs - a.totalMs);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-950 text-blue-200 font-mono text-lg">
        Carregando subgrafos...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-950 text-red-400 font-mono">
        Erro: {error}
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-gray-950 p-6">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-white font-mono text-2xl font-bold">
            Subgrafos - Docentes do DC
          </h1>
          <p className="text-sm text-gray-400 font-mono">
            Renderizacao leve em SVG para evitar excesso de contextos WebGL.
          </p>
        </div>

        {benchmarkRows.length > 0 && (
          <div className="bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 font-mono text-xs text-gray-300">
            <p className="text-gray-500 uppercase tracking-wide">Benchmark</p>
            <p>
              Mais lento: {benchmarkRows[0].docenteId} - {benchmarkRows[0].totalMs}ms
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {docentesPresentes.map((id) => (
          <MiniGrafoSvg
            key={id}
            docenteId={id}
            subgraph={subgraphs[id]}
            onNodeClick={setClickedNode}
            onBenchmark={handleMiniBenchmark}
          />
        ))}
      </div>

      {clickedNode && (
        <NodeDetailsCard
          node={clickedNode}
          onClose={() => setClickedNode(null)}
        />
      )}
    </div>
  );
};

export default GrafoDCSubgrafos;
