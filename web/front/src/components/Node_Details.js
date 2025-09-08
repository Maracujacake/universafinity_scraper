// src/components/NodeDetailsCard.jsx
import React from "react";

const NodeDetailsCard = ({ node, onClose }) => {
  if (!node) return null;

  const handleViewRecommendations = () => {
    // redireciona para rota de recomendações / ainda averiguar a ideia do repositório
    window.location.href = `/recomendacoes/${node.id}`;
  };

  return (
    <div className="absolute top-4 right-4 bg-white shadow-xl rounded-xl p-4 z-20 w-72 border border-gray-200">
      <h2 className="text-xl font-bold mb-2 text-blue-600">{node.label}</h2>
      <p className="text-sm text-gray-700">ID interno: {node.id}</p>
      

      {/* Campos adicionais futuramente */}
      {node.email && (
        <p className="text-sm text-gray-700 mt-1">
          📧 <strong>Email:</strong> {node.email}
        </p>
      )}
      {node.publicacoes && (
        <p className="text-sm text-gray-700 mt-1">
          📚 <strong>Publicações:</strong> {node.publicacoes}
        </p>
      )}

       {/* Se for docente do DC-UFSCar, mostra o botão */}
       {node.dc_ufscar && (
        <button
          onClick={handleViewRecommendations}
          className="mt-4 px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600 w-full"
        >
          Visualizar recomendações
        </button>
      )}


      <button
        onClick={onClose}
        className="mt-4 px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Fechar
      </button>
    </div>
  );
};

export default NodeDetailsCard;
