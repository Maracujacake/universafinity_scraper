// src/pages/HomePage.jsx
import React, { useState } from 'react';
import GraphContainer from '../components/Graph_container';
import OverlayPanel from '../components/Overlay_panel';
import FloatingButton from '../components/Floating_button';
import ConnectionsPanel from '../components/Connection_pannel';

const HomePage = ({
  isPanelVisible,
  searchTerm,
  setSearchTerm,
  nodeList,
  setNodeList,
  minWeight,
  setMinWeight
}) => {
  const [connections, setConnections] = useState([]);
  const [showConnections, setShowConnections] = useState(false);
  const [foundNode, setFoundNode] = useState(null);

  const handleSearch = (term) => {
    setSearchTerm(term);
    setShowConnections(false); // Fecha o painel ao iniciar nova busca
    setFoundNode(term); // Considera que o termo buscado existe (será validado depois no GraphContainer)
  };

  return (
    <div className="relative bg-[#1E3A8A] text-white min-h-screen z-10">
      <div className="absolute inset-0 -z-10">
        <GraphContainer
          searchTerm={searchTerm}
          setNodeList={setNodeList}
          minWeight={minWeight}
          setConnections={setConnections}
        />
      </div>

      <OverlayPanel
        isVisible={isPanelVisible}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        nodeList={nodeList}
        minWeight={minWeight}
        setMinWeight={setMinWeight}
      />

      {/* Botão flutuante só aparece se um nó tiver sido encontrado */}
      {searchTerm.trim() && (
        <FloatingButton onClick={() => setShowConnections(!showConnections)} />
      )}

      <ConnectionsPanel
        isVisible={showConnections}
        connections={connections}
        onClose={() => setShowConnections(false)}
        searchedNode={foundNode}
      />
    </div>
  );
};

export default HomePage;
