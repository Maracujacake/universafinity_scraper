// src/components/SigmaError
import React from "react";

const SigmaErrorScreen = () => {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white z-10">
      <img
        src="https://cdn-icons-png.flaticon.com/512/4712/4712027.png"
        alt="Erro"
        className="w-32 h-32 mb-4 opacity-80"
      />
      <p className="text-xl font-semibold text-gray-700">
        Algo deu errado ao carregar o grafo
      </p>
      <p className="text-gray-500 mt-2">
        Por favor, atualize a página e tente novamente.
      </p>
      <button
        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        onClick={() => window.location.reload()}
      >
        Atualizar Página
      </button>
    </div>
  );
};

export default SigmaErrorScreen;
