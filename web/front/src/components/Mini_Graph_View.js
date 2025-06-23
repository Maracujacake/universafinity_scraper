import React, { useEffect, useState } from 'react';
import Graph from 'graphology';
import Sigma from 'sigma';
import forceAtlas2 from 'graphology-layout-forceatlas2';

const MiniGraphView = ({ graph, centerNode, minWeight = 0, visible }) => {
  const [miniSigmaInstance, setMiniSigmaInstance] = useState(null);
  const [subgraph, setSubgraph] = useState(null);

  // Gera o subgrafo dos vizinhos + nó central
  const generateSubgraph = (fullGraph, center) => {
    const sub = new Graph();

    if (!fullGraph.hasNode(center)) return sub;

    const neighbors = new Set(fullGraph.neighbors(center));
    neighbors.add(center);

    neighbors.forEach(node => {
      const attrs = fullGraph.getNodeAttributes(node);
      sub.addNode(node, { ...attrs });
    });

    fullGraph.forEachEdge((edgeKey, attributes, source, target) => {
      if (
        neighbors.has(source) && 
        neighbors.has(target) && 
        attributes.size >= minWeight
      ) {
        sub.addEdge(source, target, { ...attributes });
      }
    });

    return sub;
  };

  useEffect(() => {
    if (!visible || !graph || !centerNode || !graph.hasNode(centerNode)) {
      // Limpar se estiver invisível ou sem dados
      if (miniSigmaInstance) {
        miniSigmaInstance.kill();
        setMiniSigmaInstance(null);
      }
      setSubgraph(null);
      return;
    }

    const sub = generateSubgraph(graph, centerNode);
    setSubgraph(sub);

    const container = document.getElementById('mini-sigma-container');
    if (!container) return;

    // Limpa instância anterior
    if (miniSigmaInstance) {
      miniSigmaInstance.kill();
      setMiniSigmaInstance(null);
      container.innerHTML = '';
    }

    // Opcional: aplicar layout rápido
    forceAtlas2.assign(sub, { iterations: 100, settings: { gravity: 0.05 } });

    // Cria Sigma para mini grafo
    const sigmaMini = new Sigma(sub, container);
    setMiniSigmaInstance(sigmaMini);

    return () => {
      if (sigmaMini) sigmaMini.kill();
      setMiniSigmaInstance(null);
    };
  }, [visible, graph, centerNode, minWeight]);

  if (!visible) return null;

  return (
    <div
      id="mini-sigma-container"
      className="fixed bottom-24 left-24 w-64 h-64 border border-gray-300 rounded shadow-lg bg-white z-50"
    />
  );
};

export default MiniGraphView;
