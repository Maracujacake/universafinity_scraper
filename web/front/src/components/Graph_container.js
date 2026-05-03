import React, { useEffect, useState, useRef } from 'react';
import Graph from 'graphology';
import Sigma from 'sigma';
import FA2Layout from 'graphology-layout-forceatlas2/worker';
import circular from 'graphology-layout/circular';
import NodeDetailsCard from './Node_Details';
import SigmaErrorScreen from '../pages/Sigma_Error';

// ─────────────────────────────────────────────
// Paleta de cores para comunidades (até 32)
// ─────────────────────────────────────────────
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
  return COMMUNITY_PALETTE[community % COMMUNITY_PALETTE.length];
}

// ─────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────
const GraphContainer = ({
  searchTerm,
  setNodeList,
  minWeight,
  setConnections,
  setGraphInfo,
  graphUrl,
}) => {
  // ── refs ──────────────────────────────────
  const sigmaRef         = useRef(null);   // instância Sigma
  const graphRef         = useRef(null);   // instância Graph
  const fa2Ref           = useRef(null);   // worker FA2
  const containerRef     = useRef(null);   // div#sigma-container
  const fullGraphDataRef = useRef(null);   // guarda os dados baixados (como "base de dados" local)

  // ── estado de UI ──────────────────────────
  const [loading, setLoading]                 = useState(true);
  const [layoutProgress, setLayoutProgress]   = useState(0);   // 0–100
  const [layoutDone, setLayoutDone]           = useState(false);
  const [error, setError]                     = useState(null);
  const [sigmaRenderError, setSigmaRenderError] = useState(false);
  const [clickedNode, setClickedNode]         = useState(null);

  // ─────────────────────────────────────────
  // 1. CARREGA OS DADOS (roda uma vez na montagem)
  // ─────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const loadGraph = async () => {
      try {
        setLoading(true);
        setError(null);

        // 1. Busca dados da API
        const response = await fetch(graphUrl || 'http://127.0.0.1:5000/api/grafo');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        if (cancelled) return;

        if (setGraphInfo) setGraphInfo(data.info);

        // 2. Popula SearchBar
        setNodeList(data.nodes.map((n) => n.label || n.id));

        // 3. Estrutura os nós em um mapa (O(1) lookup)
        const nodeMap = {};
        data.nodes.forEach((node) => {
          nodeMap[node.id] = {
            ...node,
            color: getCommunityColor(node.comunidade || 0)
          };
        });

        // 4. Salva o grafo completo na memória local
        fullGraphDataRef.current = {
          nodes: nodeMap,
          edges: data.edges,
        };

        setLoading(false);

      } catch (err) {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      }
    };

    loadGraph();

    return () => {
      cancelled = true;
      if (fa2Ref.current) {
        fa2Ref.current.stop();
        fa2Ref.current.kill();
      }
      if (sigmaRef.current) sigmaRef.current.kill();
    };
  }, [graphUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─────────────────────────────────────────
  // 2. BUSCA → Cria e renderiza o sub-grafo
  // ─────────────────────────────────────────
  useEffect(() => {
    // Só prossegue se os dados já foram carregados
    if (!fullGraphDataRef.current) return;

    // Função local de limpeza do grafo atual
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

    // Se não houver termo buscado, limpa a tela e aborta
    if (!searchTerm) {
      clearGraph();
      setConnections?.([]);
      setLayoutDone(false);
      return;
    }

    const { nodes: nodeMap, edges: allEdges } = fullGraphDataRef.current;
    
    // Se o nó pesquisado não existe na base local
    if (!nodeMap[searchTerm]) {
      return;
    }

    // 1. Encontra as arestas onde o nó alvo participa, filtrando pelo minWeight
    const connectedEdges = [];
    const nodesToAdd = new Set([searchTerm]);
    const connectionsList = [];

    allEdges.forEach(edge => {
      const weight = edge.weight ?? 1;
      if (weight >= (minWeight || 1)) {
        if (edge.source === searchTerm || edge.target === searchTerm) {
          connectedEdges.push(edge);
          const peer = edge.source === searchTerm ? edge.target : edge.source;
          nodesToAdd.add(peer);
          connectionsList.push({ node: peer, weight });
        }
      }
    });

    // Atualiza a sidebar de conexões
    setConnections?.(connectionsList);

    // 2. Cria instância de um novo sub-grafo
    const subGraph = new Graph({ multi: false });

    // Adiciona apenas os nós da vizinhança
    nodesToAdd.forEach(nodeId => {
      const nData = nodeMap[nodeId];
      if (nData) {
        subGraph.addNode(nodeId, {
          label: nData.label || nodeId,
          x: Math.random(),
          y: Math.random(),
          size: 5,
          color: nData.color,
          dc_ufscar: nData.dc_ufscar || false,
        });
      }
    });

    // Adiciona as arestas capturadas
    connectedEdges.forEach(edge => {
      const weight = edge.weight ?? 1;
      // Garante que ambos os nós existem (prevenção de inconsistências)
      if (subGraph.hasNode(edge.source) && subGraph.hasNode(edge.target)) {
        if (!subGraph.hasEdge(edge.source, edge.target)) {
          subGraph.addEdge(edge.source, edge.target, {
            weight: weight,
            size: Math.max(1, weight * 0.5),
            color: 'rgba(255,255,255,0.15)',
          });
        }
      }
    });

    if (subGraph.order === 0) return;

    // 3. Ajusta o tamanho e cor para enfatizar o alvo da busca
    subGraph.forEachNode((node) => {
      if (node === searchTerm) {
        // Nó central: maior e com cor forte (ex: vermelho) para destaque
        subGraph.setNodeAttribute(node, 'size', 15);
        subGraph.setNodeAttribute(node, 'color', '#EF4444');
      } else {
        const degree = subGraph.degree(node);
        subGraph.setNodeAttribute(node, 'size', Math.max(4, Math.min(6 + degree * 0.5, 12)));
      }
    });

    // 4. Montagem assíncrona do SigmaJS
    const mountSigma = async () => {
      try {
        // Aguarda a div container ser instanciada no DOM
        await new Promise((resolve) => {
          const check = () => {
            const el = containerRef.current;
            if (el && el.offsetWidth > 0 && el.offsetHeight > 0) resolve();
            else setTimeout(check, 50);
          };
          check();
        });

        clearGraph();

        // Layout inicial espalha os nós circularmente
        circular.assign(subGraph, { scale: 100 });

        const sigma = new Sigma(subGraph, containerRef.current, {
          allowInvalidContainer: true,
          renderLabels:          true,
          labelThreshold:        3, // Limite baixo pois teremos poucos nós na tela
          labelFont:             'JetBrains Mono, monospace',
          labelSize:             12,
          labelWeight:           '500',
          labelColor:            { color: '#e2e8f0' },
          minCameraRatio:        0.02,
          maxCameraRatio:        10,
        });

        sigmaRef.current = sigma;
        graphRef.current = subGraph;
        setSigmaRenderError(false);

        // 5. Inicia o algoritmo FA2 para espalhar os nós conectatos organizadamente
        setLayoutDone(false);
        setLayoutProgress(0);

        const fa2 = new FA2Layout(subGraph, {
          settings: {
            scalingRatio: 80,
            gravity: 1,
            strongGravityMode: false,
            slowDown: 10,
            linLogMode: true,
            outboundAttractionDistribution: true,
            edgeWeightInfluence: 0.5,
            barnesHutOptimize: false, // Menos pesado, false está ok
          },
        });

        fa2Ref.current = fa2;
        fa2.start();

        // Animação de progresso (reduzida para 4s: converte o sub-grafo rapidamente)
        const LAYOUT_DURATION_MS = 4000;
        const startTime = Date.now();
        let animFrame;

        const trackProgress = () => {
          const elapsed  = Date.now() - startTime;
          const progress = Math.min((elapsed / LAYOUT_DURATION_MS) * 100, 100);
          setLayoutProgress(Math.round(progress));

          if (elapsed < LAYOUT_DURATION_MS) {
            animFrame = requestAnimationFrame(trackProgress);
          } else {
            fa2.stop();
            setLayoutDone(true);
            setLayoutProgress(100);
          }
        };
        animFrame = requestAnimationFrame(trackProgress);

        return () => {
          cancelAnimationFrame(animFrame);
        };

      } catch (err) {
        console.error('Erro ao renderizar Sigma:', err);
        setSigmaRenderError(true);
      }
    };

    mountSigma();

  }, [searchTerm, minWeight]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─────────────────────────────────────────
  // 3. INTERAÇÃO (Clique em nós do sub-grafo)
  // ─────────────────────────────────────────
  useEffect(() => {
    const sigma = sigmaRef.current;
    const graph = graphRef.current;
    if (!sigma || !graph) return;

    const handleClickNode = ({ node }) => {
      if (graph.hasNode(node)) {
        setClickedNode({ id: node, ...graph.getNodeAttributes(node) });
      }
    };

    const handleClickStage = () => setClickedNode(null);

    sigma.on('clickNode', handleClickNode);
    sigma.on('clickStage', handleClickStage);

    return () => {
      sigma.removeListener('clickNode', handleClickNode);
      sigma.removeListener('clickStage', handleClickStage);
    };
  }, [searchTerm, minWeight, layoutDone]);

  // ─────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────
  return (
    <div className="absolute inset-0 z-0 bg-gray-950">

      {/* ── Tela de carregamento Inicial ── */}
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-950 z-20 gap-4">
          <div className="flex flex-col items-center gap-3">
            <svg
              className="animate-spin h-10 w-10 text-blue-400"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            <span className="text-blue-200 text-lg font-mono tracking-wide">
              Carregando dados globais...
            </span>
          </div>
        </div>
      )}

      {/* ── Tela Limpa (Placeholder quando não há busca) ── */}
      {!loading && !searchTerm && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-950 z-10 gap-4">
           <svg className="w-16 h-16 text-gray-700 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <circle cx="11" cy="11" r="8" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35" />
           </svg>
           <span className="text-gray-400 text-lg font-mono tracking-wide">
             Busque por um autor para visualizar a sua rede
           </span>
        </div>
      )}

      {/* ── Barra de progresso do layout FA2 do sub-grafo ── */}
      {!loading && searchTerm && !layoutDone && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1 pointer-events-none">
          <span className="text-xs font-mono text-blue-300 opacity-80">
            Organizando conexões… {layoutProgress}%
          </span>
          <div className="w-48 h-1.5 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-400 rounded-full transition-all duration-300"
              style={{ width: `${layoutProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* ── Erro de download da API ── */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-950 bg-opacity-90 z-20">
          <div className="text-red-400 font-mono p-6 bg-gray-900 border border-red-700 rounded-lg shadow-xl max-w-sm text-center">
            <p className="text-sm mb-1 text-red-300 uppercase tracking-widest">Erro</p>
            <p className="text-base">{error}</p>
          </div>
        </div>
      )}

      {/* ── Erro de renderização Sigma ── */}
      {sigmaRenderError && <SigmaErrorScreen />}

      {/* ── Container principal Sigma (Visível só se houver searchTerm) ── */}
      <div
        ref={containerRef}
        id="sigma-container"
        className={`w-full h-full transition-opacity duration-500 ${searchTerm ? 'opacity-100' : 'opacity-0'}`}
      />

      {/* ── Pop-up de detalhes do nó ── */}
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