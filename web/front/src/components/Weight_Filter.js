// src/components/WeightFilter.js
import React from 'react';

// Serve como um filtro para o peso minimo da conexao entre o autor pesquisado e seus vizinhos.
const WeightFilter = ({ minWeight, setMinWeight }) => (
  <div className="mt-4 text-slate-200">
    <label htmlFor="weightRange" className="mb-2 flex items-center justify-between text-sm font-semibold">
      <span>Peso minimo da ligacao</span>
      <span className="rounded bg-slate-800 px-2 py-0.5 text-cyan-200">{minWeight}</span>
    </label>
    <input
      id="weightRange"
      type="range"
      min="1"
      max="10"
      value={minWeight}
      onChange={(e) => setMinWeight(Number(e.target.value))}
      className="w-full max-w-md accent-cyan-300"
    />
  </div>
);

export default WeightFilter;
