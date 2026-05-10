import React, { useEffect, useState, useRef } from 'react';
import Graph from 'graphology';
import Sigma from 'sigma';
import FA2Layout from 'graphology-layout-forceatlas2/worker';
import circular from 'graphology-layout/circular';
import NodeDetailsCard from './Node_Details';

const COMMUNITY_PALETTE = [
  '#60A5FA', '#34D399', '#F472B6', '#FBBF24', '#A78BFA',
  '#38BDF8', '#4ADE80', '#FB923C', '#E879F9', '#2DD4BF',
];
function getCommunityColor(community) {
  return COMMUNITY_PALETTE[community % COMMUNITY_PALETTE.length];
}

const GrafoDCContainer = ({ graphUrl }) => {
  const sigmaRef = useRef(null);
  const graphRef = useRef(null);
  const fa2Ref = useRef(null);
  const containerRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [clickedNode, setClickedNode] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const loadAndRenderGraph = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(graphUrl || 'http://127.0.0.1:5000/api/grafo_dc');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        if (cancelled) return;

        const subGraph = new Graph({ multi: false });

        data.nodes.forEach((node) => {
          subGraph.addNode(node.id, {
            label: node.label || node.id,
            x: Math.random(),
            y: Math.random(),
            size: 15, // Tamanho fixo maior, já que são poucos nós
            color: getCommunityColor(node.comunidade || 0),
            dc_ufscar: node.dc_ufscar || false,
          });
        });

        data.edges.forEach((edge) => {
          if (subGraph.hasNode(edge.source) && subGraph.hasNode(edge.target)) {
            if (!subGraph.hasEdge(edge.source, edge.target)) {
              subGraph.addEdge(edge.source, edge.target, {
                weight: edge.weight || 1,
                size: Math.max(2, (edge.weight || 1) * 0.5),
                color: 'rgba(255,255,255,0.3)',
              });
            }
          }
        });

        if (subGraph.order === 0) {
           setLoading(false);
           return;
        }

        // Aguarda container renderizar no DOM
        await new Promise((resolve) => {
          const check = () => {
            const el = containerRef.current;
            if (el && el.offsetWidth > 0 && el.offsetHeight > 0) resolve();
            else setTimeout(check, 50);
          };
          check();
        });

        if (cancelled) return;

        circular.assign(subGraph, { scale: 100 });

        const sigma = new Sigma(subGraph, containerRef.current, {
          allowInvalidContainer: true,
          renderLabels: true,
          labelFont: 'JetBrains Mono, monospace',
          labelSize: 14,
          labelWeight: '500',
          labelColor: { color: '#e2e8f0' },
          minCameraRatio: 0.05,
          maxCameraRatio: 5,
        });

        sigmaRef.current = sigma;
        graphRef.current = subGraph;

        const fa2 = new FA2Layout(subGraph, {
          settings: {
            scalingRatio: 80,
            gravity: 1,
            strongGravityMode: false,
            slowDown: 10,
            linLogMode: true,
            outboundAttractionDistribution: true,
            edgeWeightInfluence: 0.5,
          },
        });

        fa2Ref.current = fa2;
        fa2.start();

        // Parar o layout após alguns segundos
        setTimeout(() => {
          if (fa2Ref.current) {
             fa2Ref.current.stop();
          }
        }, 4000);

        setLoading(false);

      } catch (err) {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      }
    };

    loadAndRenderGraph();

    return () => {
      cancelled = true;
      if (fa2Ref.current) {
        fa2Ref.current.stop();
        fa2Ref.current.kill();
      }
      if (sigmaRef.current) sigmaRef.current.kill();
    };
  }, [graphUrl]);

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
  }, [loading]);

  return (
    <div className="absolute inset-0 z-0 bg-gray-950">
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-950 z-20 gap-4">
          <div className="flex flex-col items-center gap-3">
            <svg className="animate-spin h-10 w-10 text-blue-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            <span className="text-blue-200 text-lg font-mono tracking-wide">Carregando Grafo do DC...</span>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-950 bg-opacity-90 z-20">
          <div className="text-red-400 font-mono p-6 bg-gray-900 border border-red-700 rounded-lg shadow-xl max-w-sm text-center">
             <p className="text-sm mb-1 text-red-300 uppercase tracking-widest">Erro</p>
             <p className="text-base">{error}</p>
          </div>
        </div>
      )}

      <div
        ref={containerRef}
        id="sigma-dc-container"
        className={`w-full h-full transition-opacity duration-500 ${!loading ? 'opacity-100' : 'opacity-0'}`}
      />

      {clickedNode && (
        <NodeDetailsCard
          node={clickedNode}
          onClose={() => setClickedNode(null)}
        />
      )}
    </div>
  );
};

export default GrafoDCContainer;
