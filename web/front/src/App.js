// src/App.js
import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import GraphContainer from './components/Graph_container';
import SearchBar from './components/Search_Bar';
import Grafo2 from './pages/Grafo2';
import Grafo3 from './pages/Grafo3';
import WeightFilter from './components/Weight_Filter';
import OverlayPanel from './components/Overlay_panel';

const HomePage = ({ isPanelVisible, searchTerm, setSearchTerm, nodeList, setNodeList, minWeight, setMinWeight }) => {
  return (
    <div className="relative bg-[#1E3A8A] text-white min-h-screen z-10">
      <div className="absolute inset-0 -z-10">
        <GraphContainer searchTerm={searchTerm} setNodeList={setNodeList} minWeight={minWeight} />
      </div>

      <OverlayPanel
        isVisible={isPanelVisible}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        nodeList={nodeList}
        minWeight={minWeight}
        setMinWeight={setMinWeight}
      />
    </div>
  );
};

const App = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [nodeList, setNodeList] = useState([]);
  const [minWeight, setMinWeight] = useState(1);
  const [isPanelVisible, setIsPanelVisible] = useState(true);

  const togglePanel = () => setIsPanelVisible(prev => !prev);

  return (
    <Router>
      <Navbar togglePanel={togglePanel} isPanelVisible={isPanelVisible} />
      <Routes>
        <Route path="/" element={
          <HomePage
            isPanelVisible={isPanelVisible}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            nodeList={nodeList}
            setNodeList={setNodeList}
            minWeight={minWeight}
            setMinWeight={setMinWeight}
          />
        } />
        <Route path="/grafo2" element={<Grafo2 />} />
        <Route path="/grafo3" element={<Grafo3 />} />
      </Routes>
    </Router>
  );
};

export default App;