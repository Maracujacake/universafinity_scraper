import React, { useEffect, useState } from 'react';
import Graph from 'graphology';
import Sigma from 'sigma';
import forceAtlas2 from 'graphology-layout-forceatlas2';

const GraphContainer = ({ searchTerm, setNodeList, minWeight }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sigmaInstance, setSigmaInstance] = useState(null);
  const [graph, setGraph] = useState(null);
  const [highlightedNode, setHighlightedNode] = useState(null);

  useEffect(() => {
    const container = document.getElementById('sigma-container');
    if (!container || container.offsetWidth === 0) return;

    const loadGraph = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('http://192.168.0.73:5000/api/grafo');
        const data = await response.json();

        const newGraph = new Graph();

        // Adiciona nós com posições e cores iniciais
        data.nodes.forEach(node => {
          newGraph.addNode(node.id, {
            label: node.label || node.id,
            x: Math.random() * 100,
            y: Math.random() * 100,
            size: 5,
            color: '#60A5FA' // Azul-claro para combinar com fundo escuro/azul
          });
        });

        // Pega nomes dos nós para preencher a SearchBar
        const nomes = data.nodes.map(n => n.label || n.id);
        setNodeList(nomes);

        // Adiciona arestas com base no peso mínimo
        data.edges.forEach(edge => {
          try {
            newGraph.addEdge(edge.source, edge.target, {
              size: edge.weight,
              color: edge.weight >= minWeight ? '#FFFFFF' : 'transparent'
            });
          } catch (e) {
            console.warn(`Erro ao adicionar aresta ${edge.source}-${edge.target}`, e);
          }
        });

        if (newGraph.order === 0) throw new Error('O grafo está vazio');

        // Aplica o layout ForceAtlas2
        forceAtlas2.assign(newGraph, {
          iterations: 150,
          settings: {
            gravity: 1.0,
            scalingRatio: 2.0,
            strongGravityMode: true,
            slowDown: 1.5,
            edgeWeightInfluence: 0.5,
            linLogMode: true,
            barnesHutOptimize: true,
            barnesHutTheta: 0.5
          }
        });

        // Ajusta tamanho dos nós com base no grau
        newGraph.forEachNode((node) => {
          const degree = newGraph.degree(node);
          newGraph.setNodeAttribute(node, 'size', Math.min(5 + degree, 20));
        });

        // Limpa instância anterior se houver
        if (sigmaInstance) sigmaInstance.kill();
        container.innerHTML = '';

        // Cria nova instância do Sigma
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

  // Atualiza visual com base no peso mínimo e nó destacado
  useEffect(() => {
    if (!graph) return;

    if(searchTerm) return;
    graph.forEachEdge((edgeKey, attributes) => {
      const weight = attributes.size;
      graph.setEdgeAttribute(edgeKey, 'color', weight >= minWeight ? '#FFFFFF' : 'transparent');
    });

    if (highlightedNode && graph.hasNode(highlightedNode)) {
      graph.forEachEdge(highlightedNode, (edgeKey, attributes) => {
        const weight = attributes.size;
        if (weight >= minWeight) {
          graph.setEdgeAttribute(edgeKey, 'color', '#24FC3E'); // Verde neon
        }
      });
    }
  }, [minWeight, graph, highlightedNode]);

  // Quando um nó é buscado
  useEffect(() => {
    let animationFrameId;
    let startTime;

    if (searchTerm && graph && sigmaInstance) {
      const nodeExists = graph.hasNode(searchTerm);

      if (nodeExists) {
        setHighlightedNode(searchTerm);

        // Obtém vizinhos
        const neighbors = new Set(graph.neighbors(searchTerm));
        neighbors.add(searchTerm); // Inclui o próprio nó pesquisado

        // Atualiza cor dos nós
        graph.forEachNode((node) => {
          if (neighbors.has(node)) {
            // Nó relevante: destaque
            graph.setNodeAttribute(node, 'color', node === searchTerm ? '#EF4444' : '#FACC15'); // Vermelho ou Amarelo
          } else {
            // Nó irrelevante: desfoque
            graph.setNodeAttribute(node, 'color', 'rgba(100, 100, 100, 0.1)'); // cinza claro desatualizado
          }
        });

        // Atualiza cor das arestas
        graph.forEachEdge((edgeKey, attributes, source, target) => {
          const weight = attributes.size;

          if (neighbors.has(source) && neighbors.has(target) && weight >= minWeight) {
            // Aresta conectada ao nó buscado
            graph.setEdgeAttribute(edgeKey, 'color', '#24FC3E'); // verde neon
          } else {
            // Aresta irrelevante
            graph.setEdgeAttribute(edgeKey, 'color', 'rgba(100, 100, 100, 0.1)');
          }
        });

        // Animação pulsante
        const baseSize = Math.min(5 + graph.degree(searchTerm), 20);
        const amplitude = 0.4;
        const speed = 2;

        const animate = (time) => {
          if (!startTime) startTime = time;
          const elapsed = (time - startTime) / 1000;
          const scaleFactor = 0.9 + ((Math.sin(elapsed * speed) + 1) / 2) * amplitude;
          const newSize = baseSize * scaleFactor;

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
    <div className="absolute inset-0 z-0">
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
        className="w-full h-full"
      />
    </div>
  );
};

export default GraphContainer;
