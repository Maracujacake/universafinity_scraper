import React from "react";
import { useParams } from "react-router-dom";
import HomePage from "../pages/HomePage";
import recommendationMap from "../data/Recommendation_map";

const RecomendacoesWrapper = ({
  isPanelVisible,
  searchTerm,
  setSearchTerm,
  nodeList,
  setNodeList,
  minWeight,
  setMinWeight,
  graphInfo,
  setGraphInfo
}) => {
  const { docenteId } = useParams();
  const graphUrl = recommendationMap[docenteId];

  console.log("🌀 RecomendacoesWrapper montou/re-renderizou", docenteId, graphUrl);

  return (
    <HomePage
      isPanelVisible={isPanelVisible}
      searchTerm={searchTerm}
      setSearchTerm={setSearchTerm}
      nodeList={nodeList}
      setNodeList={setNodeList}
      minWeight={minWeight}
      setMinWeight={setMinWeight}
      graphInfo={graphInfo}
      setGraphInfo={setGraphInfo}
      graphUrl={graphUrl}
    />
  );
};

export default RecomendacoesWrapper;