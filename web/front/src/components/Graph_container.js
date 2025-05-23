import React, { useEffect, useState } from 'react';
import Graph from 'graphology';
import Sigma from 'sigma';
import forceAtlas2 from 'graphology-layout-forceatlas2';
import { rescaleGraphPositions } from '../funcs/RescaleGraphPositions';
import NodeDetailsCard from "./Node_Details";
import SigmaErrorScreen from '../pages/Sigma_Error';


const GraphContainer = ({ searchTerm, setNodeList, minWeight, setConnections  }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sigmaInstance, setSigmaInstance] = useState(null);
  const [graph, setGraph] = useState(null);
  const [highlightedNode, setHighlightedNode] = useState(null);
  const [clickedNode, setClickedNode] = useState(null); // container informaçao no clicado
  const [sigmaRenderError, setSigmaRenderError] = useState(false); // pagina de erro sigma



  useEffect(() => {
    const container = document.getElementById('sigma-container');
    if (!container) return;

    let tries = 0;
    const maxTries = 20;
    const interval = 100; // ms
  
    const tryLoad = () => {
      console.log('Tamanho container:', container.offsetWidth, container.offsetHeight);
      if (container.offsetWidth === 0 || container.offsetHeight === 0) {
        console.log("tavitatmeaoidfmod");
        tries++;
        if (tries >= maxTries) {
          setSigmaRenderError(true); // Não conseguiu carregar o grafo
          setLoading(false);
          return;
        }
        setTimeout(tryLoad, interval);
        return;
      }
      loadGraph();
    };
    

    // CARREGA O GRAFO DE FUNDO
    const loadGraph = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('http://192.168.0.73:5000/api/grafo');
        const data = await response.json();

        const newGraph = new Graph();

        // Adiciona nós com posições e cores iniciais
        data.nodes.forEach( (node, i) => {
          newGraph.addNode(node.id, {
            label: node.label || node.id,
            //x: Math.random() * 100,
            //y: Math.random() * 100,
            x: Math.cos(i) * 100,
            y: Math.sin(i) * 100,
            size: 5,
            color: '#60A5FA'
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
            scalingRatio: 10,
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

        rescaleGraphPositions(newGraph, 100);

        // Limpa instância anterior se houver
        if (sigmaInstance) sigmaInstance.kill();
        container.innerHTML = '';

        try {
          const sigma = new Sigma(newGraph, container);
          setSigmaInstance(sigma);
          setGraph(newGraph);
          setLoading(false);
        } catch (renderError) {
          console.error("Erro ao renderizar Sigma:", renderError);
          setSigmaRenderError(true);
          setLoading(false);
        }
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    tryLoad(); 
  }, []);


  useEffect(() => {
    if (!sigmaInstance || !graph) return;
  
    const handleClickNode = ({ node }) => {
      if (graph.hasNode(node)) {
        const attrs = graph.getNodeAttributes(node);
        setClickedNode({ id: node, ...attrs });
      }
    };
  
    sigmaInstance.on("clickNode", handleClickNode);
  
    // Cleanup para evitar múltiplos listeners
    return () => {
      sigmaInstance.removeListener("clickNode", handleClickNode);
    };
  }, [sigmaInstance, graph]);



  // ATUALIZAÇÃO DO NÓ ( PESO MINIMO )
  useEffect(() => {
    if (!graph) return;
  
    // Se estiver buscando um nó específico
    if (searchTerm && graph.hasNode(searchTerm)) {
      const neighbors = new Set(graph.neighbors(searchTerm));
      neighbors.add(searchTerm); // Inclui o próprio nó
  
      // Atualiza somente arestas entre os nós relevantes (nó buscado + vizinhos)
      graph.forEachEdge((edgeKey, attributes, source, target) => {
        const weight = attributes.size;
  
        if (neighbors.has(source) && neighbors.has(target) && weight >= minWeight) {
          graph.setEdgeAttribute(edgeKey, 'color', '#24FC3E'); // Aresta relevante
        } else {
          graph.setEdgeAttribute(edgeKey, 'color', 'rgba(0,0,0,0)'); // Oculta
        }
      });
    } else {
      // Nenhum termo de busca: aplica regra global baseada apenas no peso
      graph.forEachEdge((edgeKey, attributes) => {
        const weight = attributes.size;
        graph.setEdgeAttribute(edgeKey, 'color', weight >= minWeight ? '#FFFFFF' : 'rgba(0,0,0,0)');
      });
  
      // Destaca arestas do nó selecionado (hover, por exemplo)
      if (highlightedNode && graph.hasNode(highlightedNode)) {
        graph.forEachEdge(highlightedNode, (edgeKey, attributes) => {
          const weight = attributes.size;
          if (weight >= minWeight) {
            graph.setEdgeAttribute(edgeKey, 'color', '#24FC3E'); // Verde neon
          }
        });
      }
    }
  }, [minWeight, graph, highlightedNode, searchTerm]);



  // QUANDO UM NÓ É BUSCADO
  useEffect(() => {
  let animationFrameId;
  let startTime;

    if (searchTerm && graph && sigmaInstance) {
      const nodeExists = graph.hasNode(searchTerm);

      if (nodeExists) {
        const connectionsList = []; // vai mostrar no botão flutuante a lista agui
        setHighlightedNode(searchTerm);
        
        

        // Foco e zoom no nó buscado
        const { x, y } = graph.getNodeAttributes(searchTerm);
        console.log(`Focando em ${searchTerm} com coordenadas x=${x}, y=${y}`);

        const camera = sigmaInstance.getCamera();
        const currentRatio = camera.getState().ratio;
        const newRatio = Math.max(0.1, Math.min(1, currentRatio));

        setTimeout(() => {
          camera.animate(
            {
              x,
              y,
              ratio: newRatio,
            },
            {
              duration: 600,
            }
          );
        }, 100);

        // Obtém vizinhos
        const neighbors = new Set(graph.neighbors(searchTerm));
        neighbors.add(searchTerm);

        // popula a lista de vizinhos
        graph.forEachEdge((edgeKey, attributes, source, target) => {
          const weight = attributes.size;
        
          if (
            (source === searchTerm || target === searchTerm) &&
            neighbors.has(source) &&
            neighbors.has(target) &&
            weight >= minWeight
          ) {
            const connectedNode = source === searchTerm ? target : source;
            connectionsList.push({ node: connectedNode, weight });
          }
        });
        
        setConnections(connectionsList);

        // Colore nós
        graph.forEachNode((node) => {
          if (neighbors.has(node)) {
            graph.setNodeAttribute(node, 'color', node === searchTerm ? '#EF4444' : '#FACC15');
          } else {
            graph.setNodeAttribute(node, 'color', 'rgba(100, 100, 100, 0.1)');
          }
        });

        // Colore arestas
        graph.forEachEdge((edgeKey, attributes, source, target) => {
          const weight = attributes.size;
          if (neighbors.has(source) && neighbors.has(target) && weight >= minWeight) {
            graph.setEdgeAttribute(edgeKey, 'color', '#24FC3E');
          } else {
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

      {sigmaRenderError && <SigmaErrorScreen />}

      <div
        id="sigma-container"
        className="w-full h-full"
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

export default GraphContainer;
