import React, { useEffect, useState } from 'react';
import Graph from 'graphology';
import Sigma from 'sigma';
import forceAtlas2 from 'graphology-layout-forceatlas2';

const GraphContainer = ({ searchTerm }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sigmaInstance, setSigmaInstance] = useState(null);
  const [graph, setGraph] = useState(null);
  const [highlightedNode, setHighlightedNode] = useState(null);

  useEffect(() => {
    const container = document.getElementById('sigma-container');
    if (!container) return;

    const loadGraph = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('http://192.168.0.73:5000/api/grafo');
        const data = await response.json();

        const newGraph = new Graph();

        // Adiciona os nós com posições aleatórias temporárias
        data.nodes.forEach(node => {
          newGraph.addNode(node.id, {
            label: node.label || node.id,
            x: Math.random() * 100,
            y: Math.random() * 100,
            size: 5,
            color: '#ec5148'
          });
        });

        // Adiciona as arestas
        data.edges.forEach(edge => {
          try {
            newGraph.addEdge(edge.source, edge.target, {
              size: edge.weight || 1,
              color: '#ccc'
            });
          } catch (e) {
            console.warn(`Erro ao adicionar aresta ${edge.source}-${edge.target}`, e);
          }
        });

        if (newGraph.order === 0) {
          throw new Error('O grafo está vazio');
        }

        // Aplica o layout ForceAtlas2
        forceAtlas2.assign(newGraph, {
          iterations: 100,
          settings: {
            gravity: 0.1
          }
        });

        // Ajusta o tamanho com base no grau
        newGraph.forEachNode((node) => {
          const degree = newGraph.degree(node);
          newGraph.setNodeAttribute(node, 'size', Math.min(5 + degree, 20));
        });

        if (sigmaInstance) {
          sigmaInstance.kill(); // Mata o Sigma anterior se existir
        }
        container.innerHTML = '';

        // Instancia o Sigma com o grafo final
        const sigma = new Sigma(newGraph, container);
        setSigmaInstance(sigma);
        setGraph(newGraph);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    loadGraph();
  }, []);

  useEffect(() => {
    let animationFrameId;
    let startTime;
  
    if (searchTerm && graph && sigmaInstance) {
      const nodeExists = graph.hasNode(searchTerm);
  
      if (nodeExists) {
        // Resetar cor e tamanho do nó anterior (se houver)
        if (highlightedNode && graph.hasNode(highlightedNode)) {
          graph.forEachNode((node) => {
            graph.setNodeAttribute(node, 'color', '#ec5148');
            graph.setNodeAttribute(node, 'size', Math.min(5 + graph.degree(node), 20));
          });
        }
  
        // Resetar cores de todas as arestas para o padrão 🧹
        graph.forEachEdge((edge) => {
          graph.setEdgeAttribute(edge, 'color', '#ccc');
        });
  
        // Destacar o novo nó
        graph.setNodeAttribute(searchTerm, 'color', '#4c6cfd');
        setHighlightedNode(searchTerm);
  
        // Realçar arestas conectadas ao nó buscado
        graph.forEachEdge(searchTerm, (edgeKey, attributes, source, target) => {
          graph.setEdgeAttribute(edgeKey, 'color', '#24fc3e');
        });

        // Realçar nós conectados ao nó buscado
        graph.forEachNeighbor(searchTerm, (neighbor) => {
          graph.setNodeAttribute(neighbor, 'color', '#facc15'); // amarelo vibrante
        });
  
        // Animação pulse (senoidal)
        const baseSize = Math.min(5 + graph.degree(searchTerm), 20);
        const amplitude = 4;
        const speed = 2;
  
        const animate = (time) => {
          if (!startTime) startTime = time;
          const elapsed = (time - startTime) / 1000;
          const newSize = baseSize + amplitude * Math.sin(elapsed * speed);
          graph.setNodeAttribute(searchTerm, 'size', newSize);
          animationFrameId = requestAnimationFrame(animate);
        };
  
        animationFrameId = requestAnimationFrame(animate);
      } else {
        alert('Nó não encontrado no grafo!');
      }
    }
  
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [searchTerm, graph, sigmaInstance]);

  return (
    <div className="relative w-full max-w-3xl h-[600px] mx-auto">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-80 z-10">
          <div className="text-lg font-semibold">Carregando grafo...</div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-80 z-10">
          <div className="text-lg font-semibold text-red-600 p-4 bg-white rounded shadow">
            Erro ao carregar o grafo: {error}
          </div>
        </div>
      )}

      <div
        id="sigma-container"
        className="w-full h-full border border-gray-300 rounded-lg shadow-md bg-white"
      />
    </div>
  );
};

export default GraphContainer;
