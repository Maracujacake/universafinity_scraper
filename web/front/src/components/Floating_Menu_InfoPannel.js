import React from "react";
import chroma from "chroma-js";
import { CircleDollarSign, Share2, Users, BarChart3 } from "lucide-react"; // ícones para ilustrar

function geraCoresInfo(n = 4) {
  return chroma
    .scale(["#FF6B6B", "#6BCB77", "#4D96FF", "#783dff"])
    .mode("lch")
    .colors(n);
}

const FloatingInfoPanel = ({ info, customColors }) => {
  if (!info) return null;

  const data = [
    { name: "Nós", value: info.num_nos, icon: <Users className="w-5 h-5" /> },
    { name: "Arestas", value: info.num_arestas, icon: <Share2 className="w-5 h-5" /> },
    { name: "Comunidades", value: info.num_comunidades, icon: <CircleDollarSign className="w-5 h-5" /> },
    { name: "Grau Médio", value: info.grau_medio?.toFixed(2), icon: <BarChart3 className="w-5 h-5" /> },
    ];

  const colors = customColors || geraCoresInfo(data.length);

  return (
    <div className="fixed left-24 top-1/4 bg-white p-4 rounded-xl shadow-lg w-72 z-20 space-y-4">
      <h2 className="text-xl font-semibold mb-2">Estatísticas do Grafo</h2>
      {data.map((item, index) => (
        <div key={item.name} className="flex items-center justify-between p-2 rounded-md" style={{ backgroundColor: colors[index], color: 'white' }}>
          <div className="flex items-center gap-2">
            {item.icon}
            <span className="font-medium">{item.name}</span>
          </div>
          <span className="text-lg font-bold">{item.value}</span>
        </div>
      ))}
    </div>
  );
};

export default FloatingInfoPanel;
