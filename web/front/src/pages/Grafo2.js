import React from 'react';
import GrafoDCContainer from '../components/GrafoDC_container';

const Grafo2 = () => {
  return (
    <div className="relative bg-[#1E3A8A] text-white min-h-screen z-10 overflow-hidden">
      <div className="absolute top-20 left-6 z-20 pointer-events-none">
         <h2 className="text-2xl font-bold bg-gray-900 bg-opacity-80 px-4 py-2 rounded-md shadow-lg border border-gray-700 font-mono tracking-wide">
           Rede de Colaboração - Docentes DC
         </h2>
      </div>
      <GrafoDCContainer />
    </div>
  );
};

export default Grafo2;
