// src/components/NodeDetailsCard.jsx
import React, { useState } from "react";

const CLASSES_VISIVEIS = 8;

const NodeDetailsCard = ({ node, onClose }) => {
  const [expandido, setExpandido] = useState(false);

  if (!node) return null;

  const handleViewRecommendations = () => {
    window.location.href = `/recomendacoes/${node.id}`;
  };

  const classes = node.classes ?? [];
  const classesExibidas = expandido ? classes : classes.slice(0, CLASSES_VISIVEIS);
  const temMais = classes.length > CLASSES_VISIVEIS;

  return (
    <div className="absolute top-4 right-4 bg-white shadow-xl rounded-xl p-4 z-20 w-72 border border-gray-200">
      <h2 className="text-xl font-bold mb-2 text-blue-600">{node.label}</h2>
      <p className="text-sm text-gray-700">ID interno: {node.id}</p>

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

      {classes.length > 0 && (
        <div className="mt-2">
          <p className="text-sm font-medium text-gray-700">
            Classes <span className="text-gray-400 font-normal">({classes.length})</span>
          </p>
          <div className="flex flex-wrap gap-1 mt-1">
            {classesExibidas.map((cls, idx) => (
              <span key={idx} className="text-xs bg-gray-200 text-gray-800 rounded px-2 py-0.5">
                {cls}
              </span>
            ))}
          </div>

          {temMais && (
            <button
              onClick={() => setExpandido(!expandido)}
              className="mt-1 text-xs text-blue-500 hover:underline"
            >
              {expandido ? "Ver menos ▲" : `Ver mais ${classes.length - CLASSES_VISIVEIS} ▼`}
            </button>
          )}
        </div>
      )}

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