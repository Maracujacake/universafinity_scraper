// src/App.js
import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import Grafo2 from './pages/Grafo2';
import Grafo3 from './pages/Grafo3';

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
