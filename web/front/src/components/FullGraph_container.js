// src/components/FullGraph_container.js
import React, { useEffect, useRef, useState } from 'react';
import Graph from 'graphology';
import Sigma from 'sigma';
import circular from 'graphology-layout/circular';
import forceAtlas2 from 'graphology-layout-forceatlas2';
import NodeDetailsCard from './Node_Details';
import { createGraphBenchmark } from '../utils/graphBenchmark';
import { rescaleGraphPositions } from '../funcs/RescaleGraphPositions';

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

function buildGraph(data) {
  const graph = new Graph({ multi: false, allowSelfLoops: false });

  data.nodes.forEach((node) => {
    graph.addNode(node.id, {
      label: node.label || node.id,
      x: 0,
      y: 0,
      size: 2.5,
      color: getCommunityColor(node.comunidade),
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
      size: Math.max(0.25, Math.min(weight, 8) * 0.16),
      color: 'rgba(148, 163, 184, 0.16)',
      publicacoes: edge.publicacoes || [],
    });
  });

  graph.forEachNode((node) => {
    const degree = graph.degree(node);
    graph.setNodeAttribute(node, 'size', Math.max(2, Math.min(2 + Math.sqrt(degree), 9)));
  });

  return graph;
}

// Aplica um layout force-directed (ForceAtlas2) em cima de uma posição
// inicial circular. O FA2 usa a estrutura de arestas do grafo para atrair
// nós conectados e repelir os desconectados, revelando clusters/comunidades.
function applyForceLayout(graph, benchmark) {
  // Posição inicial: evita que todos os nós comecem empilhados em (0,0),
  // o que pode gerar comportamento instável no FA2.
  circular.assign(graph, { scale: Math.max(120, Math.sqrt(graph.order) * 10) });

  // Deixa o FA2 inferir configurações razoáveis com base no tamanho do grafo
  const sensibleSettings = forceAtlas2.inferSettings(graph);

  const settings = {
    ...sensibleSettings,
    gravity: 1,           // mantém o grafo coeso, evita "explosão"
    scalingRatio: 8,       // aumente para espalhar mais os clusters
    barnesHutOptimize: graph.order > 1000, // acelera grafos grandes
    slowDown: 1 + Math.log(Math.max(graph.order, 1)),
  };

  benchmark?.mark('forceatlas2-settings');

  // Grafos grandes (milhares de nós) podem travar a UI se rodados
  // de forma síncrona com muitas iterações. Ajuste iterations conforme
  // o tamanho do seu grafo / a resposta que você quer no primeiro load.
  const iterations = graph.order > 3000 ? 150 : graph.order > 800 ? 300 : 500;

  forceAtlas2.assign(graph, { iterations, settings });

  benchmark?.mark('forceatlas2-layout', { iterations, nodes: graph.order });
}

const FullGraphContainer = () => {
  const containerRef = useRef(null);
  const sigmaRef = useRef(null);
  const graphRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [clickedNode, setClickedNode] = useState(null);
  const [stats, setStats] = useState(null);
  const [benchmarkSummary, setBenchmarkSummary] = useState(null);
  const [minWeight, setMinWeight] = useState(2);
  const [maxNodes, setMaxNodes] = useState(1500);

  useEffect(() => {
    let cancelled = false;
    const benchmark = createGraphBenchmark('grafo3-grafo-completo');

    const cleanup = () => {
      sigmaRef.current?.kill();
      graphRef.current?.clear();
      sigmaRef.current = null;
      graphRef.current = null;
    };

    const waitForContainer = () => new Promise((resolve) => {
      const check = () => {
        const el = containerRef.current;
        if (el && el.offsetWidth > 0 && el.offsetHeight > 0) resolve();
        else requestAnimationFrame(check);
      };

      check();
    });

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams({
          min_weight: String(minWeight),
          max_nodes: String(maxNodes),
        });

        const response = await fetch(`${BASE_URL}/grafo?${params.toString()}`);
        benchmark.mark('fetch-api');

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        benchmark.mark('parse-json', {
          nodes: data.nodes?.length || 0,
          edges: data.edges?.length || 0,
        });

        if (cancelled) return;

        setStats(data.info);
        const graph = buildGraph(data);
        benchmark.mark('build-graphology', {
          nodes: graph.order,
          edges: graph.size,
        });

        applyForceLayout(graph, benchmark);
        rescaleGraphPositions(graph, 0.04);
        benchmark.mark('initial-layout');

        await waitForContainer();
        if (cancelled) return;

        const sigma = new Sigma(graph, containerRef.current, {
          allowInvalidContainer: true,
          renderLabels: false,
          renderEdgeLabels: false,
          enableEdgeHovering: false,
          hideEdgesOnMove: true,
          hideLabelsOnMove: true,
          labelRenderedSizeThreshold: 12,
          minCameraRatio: 0.05,
          maxCameraRatio: 12,
        });

        sigma.on('clickNode', ({ node }) => {
          if (graph.hasNode(node)) {
            setClickedNode({ id: node, ...graph.getNodeAttributes(node) });
          }
        });
        sigma.on('clickStage', () => setClickedNode(null));

        sigmaRef.current = sigma;
        graphRef.current = graph;
        setLoading(false);
        benchmark.mark('mount-sigma');

        const result = benchmark.finish({
          nodes: graph.order,
          edges: graph.size,
          layout: 'forceatlas2',
        });
        setBenchmarkSummary(result.summary);
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [maxNodes, minWeight]);

  return (
    <div className="relative h-full bg-gray-950 text-white overflow-hidden">
      <div ref={containerRef} className="absolute inset-0" />

      <div className="pointer-events-none absolute left-4 top-4 z-10 max-w-xl rounded-lg border border-gray-700 bg-gray-950/85 px-4 py-3 shadow-lg backdrop-blur">
        <h1 className="font-mono text-lg font-semibold text-blue-100">
          Grafo completo
        </h1>
        <div className="mt-2 grid grid-cols-2 gap-x-5 gap-y-1 font-mono text-xs text-gray-300 sm:grid-cols-4">
          <span>Nos: {stats?.num_nos ?? '-'}</span>
          <span>Arestas: {stats?.num_arestas ?? '-'}</span>
          <span>Comunidades: {stats?.num_comunidades ?? '-'}</span>
          <span>Grau medio: {stats?.grau_medio?.toFixed?.(2) ?? '-'}</span>
        </div>
        <div className="pointer-events-auto mt-3 flex flex-wrap gap-3 font-mono text-xs text-gray-300">
          <label className="flex items-center gap-2">
            Peso
            <select
              value={minWeight}
              onChange={(event) => setMinWeight(Number(event.target.value))}
              className="rounded border border-gray-700 bg-gray-900 px-2 py-1 text-blue-100"
            >
              <option value={1}>1+</option>
              <option value={2}>2+</option>
              <option value={3}>3+</option>
              <option value={5}>5+</option>
              <option value={10}>10+</option>
            </select>
          </label>

          <label className="flex items-center gap-2">
            Nos
            <select
              value={maxNodes}
              onChange={(event) => setMaxNodes(Number(event.target.value))}
              className="rounded border border-gray-700 bg-gray-900 px-2 py-1 text-blue-100"
            >
              <option value={500}>500</option>
              <option value={1000}>1000</option>
              <option value={1500}>1500</option>
              <option value={2500}>2500</option>
              <option value={0}>Todos</option>
            </select>
          </label>
        </div>
        {benchmarkSummary && (
          <p className="mt-2 font-mono text-xs text-gray-500">
            Benchmark: {benchmarkSummary.totalMs}ms no total. Detalhes no console.
          </p>
        )}
      </div>

      {loading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-gray-950">
          <div className="font-mono text-blue-200">Carregando grafo completo...</div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-gray-950">
          <div className="rounded-lg border border-red-700 bg-gray-900 p-6 font-mono text-red-300">
            Erro: {error}
          </div>
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

export default FullGraphContainer;
