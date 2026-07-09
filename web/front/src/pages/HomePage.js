// src/pages/HomePage.jsx
import React, { useEffect, useState } from 'react';
import GraphContainer from '../components/Graph_container';
import OverlayPanel from '../components/Overlay_panel';
import FloatingButton from '../components/Floating_button';
import ConnectionsPanel from '../components/Connection_pannel';

const BASE_URL = 'http://127.0.0.1:5000/api';

const HomePage = ({
  isPanelVisible,
  searchTerm,
  setSearchTerm,
  nodeList,
  setNodeList,
  minWeight,
  setGraphInfo,
  setMinWeight,
}) => {
  const [connections, setConnections] = useState([]);
  const [showConnections, setShowConnections] = useState(false);
  const [foundNode, setFoundNode] = useState(null);
  const [summaryInfo, setSummaryInfo] = useState(null);
  const [featuredNode, setFeaturedNode] = useState(null);
  const [yearRange, setYearRange] = useState(null);
  const [homeLoadError, setHomeLoadError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const loadHomeData = async () => {
      try {
        const [summaryResponse, authorsResponse] = await Promise.all([
          fetch(`${BASE_URL}/resumo`),
          fetch(`${BASE_URL}/autores?limit=10000`),
        ]);

        if (!summaryResponse.ok) throw new Error(`Resumo HTTP ${summaryResponse.status}`);
        if (!authorsResponse.ok) throw new Error(`Autores HTTP ${authorsResponse.status}`);

        const summaryData = await summaryResponse.json();
        const authorsData = await authorsResponse.json();

        if (cancelled) return;

        setSummaryInfo(summaryData.info);
        setGraphInfo(summaryData.info);
        setFeaturedNode(summaryData.exemplo);
        setYearRange(summaryData.intervalo_anos);
        setNodeList(authorsData.autores || []);
      } catch (err) {
        if (!cancelled) setHomeLoadError(err.message);
      }
    };

    loadHomeData();

    return () => {
      cancelled = true;
    };
  }, [setGraphInfo, setNodeList]);

  const handleSearch = (term) => {
    setSearchTerm(term);
    setShowConnections(false); // Fecha o painel ao iniciar nova busca
    setFoundNode(term); // Considera que o termo buscado existe (será validado depois no GraphContainer)
  };

  return (
    <div className="relative h-[calc(100vh-4rem)] min-h-[calc(100vh-4rem)] overflow-hidden bg-slate-950 text-white z-10">
      <div className="absolute inset-0 -z-10">
        <GraphContainer
          searchTerm={searchTerm}
          minWeight={minWeight}
          setConnections={setConnections}
          setGraphInfo={setGraphInfo}
          featuredNode={featuredNode}
          yearRange={yearRange}
        />
      </div>

      <OverlayPanel
        isVisible={isPanelVisible}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        nodeList={nodeList}
        minWeight={minWeight}
        setMinWeight={setMinWeight}
        summaryInfo={summaryInfo}
        featuredNode={featuredNode}
        homeLoadError={homeLoadError}
        onSearch={handleSearch}
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
