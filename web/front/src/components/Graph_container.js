import React, { useEffect, useState } from 'react';
import Graph from 'graphology';
import Sigma from 'sigma';
import forceAtlas2 from 'graphology-layout-forceatlas2';
import { rescaleGraphPositions } from '../funcs/RescaleGraphPositions';
import NodeDetailsCard from "./Node_Details";
import SigmaErrorScreen from '../pages/Sigma_Error';
import { gerarCoresComunidades } from '../funcs/CriaCores'; 
import FloatingInfoPanel from './Floating_Menu_InfoPannel';

const GraphContainer = ({ searchTerm, setNodeList, minWeight, setConnections, setGraphInfo   }) => {
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


    

    // CARREGA / CRIA   O GRAFO DE FUNDO
    const loadGraph = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('http://192.168.0.73:5000/api/grafo');
        const data = await response.json();

        const newGraph = new Graph();
        
        if (setGraphInfo) {
          setGraphInfo(data.info);  // Atualiza o estado no App.js
          console.log(data.info);
        }


        // cores para cada comunidade

        const coresComunidades = gerarCoresComunidades(22);

        function getColorForCommunity(community) {
          return coresComunidades[community % coresComunidades.length];
        }

       

        // Adiciona nós com posições e cores iniciais
        data.nodes.forEach( (node, i) => {
  
          const community = node.comunidade || 0; // backend deve enviar isso
          const color = getColorForCommunity(community);
          newGraph.addNode(node.id, {
            label: node.label || node.id,
            //x: 0,
            //y: 0,
            x: 2151 + i,
            y: 2 + i,
            size: 5,
            color: color,
            community: community,
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
          iterations: 700,
          settings: {
            gravity: 0.05,
            scalingRatio: 10,
            strongGravityMode: true,
            slowDown: 1.0,
            edgeWeightInfluence: 1.0,
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

        rescaleGraphPositions(newGraph, 200);

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


  // POP-UP DE INFORMACOES
  useEffect(() => {
    if (!sigmaInstance || !graph) return;
  
    const handleClickNode = ({ node }) => {
      if (graph.hasNode(node)) {
        const attrs = graph.getNodeAttributes(node);
        console.log(`Clique no nó ${node} com coordenadas x=${attrs.x}, y=${attrs.y}`);
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
        
        

        const { x, y } = graph.getNodeAttributes(searchTerm);
        console.log(`Focando em ${searchTerm} com coordenadas x=${x}, y=${y}`);

        const camera = sigmaInstance.getCamera();
        const currentRatio = camera.getState().ratio;
        const newRatio = Math.max(0.1, Math.min(1, currentRatio));

        console.log("Estado atual da câmera (antes da animação):", camera.getState());

        function animateToNode(camera, graph, nodeId, ratio = 1, duration = 600) {
          const node = graph.getNodeAttributes(nodeId);
          if (!node) return;
        
          camera.animate(
            {
              x: node.x * 0.1,
              y: node.y * 0.1,
              ratio: ratio,
            },
            {
              duration: duration,
              easing: "quadraticInOut",
            }
          );
        }

        animateToNode(camera, graph, searchTerm);

        
/*
        setTimeout(() => {
          camera.animate(
            {
              x,
              y,
              ratio: 1.5,
            },
            {
              duration: 600,
            }
          );

          // Espera passar o tempo da animação (600ms) para ver o novo estado
          setTimeout(() => {
            const finalCameraState = camera.getState();
            console.log("Estado da câmera após animação:", finalCameraState);
          }, 700); // um pouco maior que a duração da animação

        }, 100);
*/       
        const currentCameraState2 = camera.getState();
        console.log("Estado atual da câmera:", currentCameraState2);

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
