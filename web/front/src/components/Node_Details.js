// src/components/NodeDetailsCard.jsx
import React, { useEffect, useState } from "react";
import { ArrowLeft, ExternalLink, UserRound, X } from "lucide-react";

const BASE_URL = "http://127.0.0.1:5000/api";
const CLASSES_VISIVEIS = 8;
const RECOMENDACOES_VISIVEIS = 6;

function getInitials(label = "") {
  const parts = label.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function formatScore(value) {
  if (Number.isInteger(value)) return value;
  return Number(value || 0).toFixed(1);
}

const RecommendationButton = ({ recommendation, onClick }) => {
  const commonClasses = recommendation.classes_em_comum?.length || 0;

  return (
    <button
      type="button"
      onClick={() => onClick(recommendation)}
      className="group flex min-w-0 flex-col items-center rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-center transition hover:border-blue-300 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-400"
      title={`${recommendation.label} - score ${formatScore(recommendation.score)}`}
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-blue-600 shadow-sm ring-1 ring-slate-200 transition group-hover:ring-blue-300">
        <UserRound size={18} aria-hidden="true" />
      </span>
      <span className="mt-1 w-full truncate text-xs font-semibold text-slate-800">
        {recommendation.label}
      </span>
      <span className="mt-0.5 text-[10px] font-medium text-slate-500">
        {formatScore(recommendation.score)} pts
      </span>
      <span className="text-[10px] text-slate-400">
        {recommendation.peso_colaboracao} colab. / {commonClasses} classes
      </span>
    </button>
  );
};

const NodeDetailsCard = ({ node, onClose }) => {
  const [activeNode, setActiveNode] = useState(node);
  const [history, setHistory] = useState([]);
  const [expandido, setExpandido] = useState(false);
  const [recommendations, setRecommendations] = useState([]);
  const [recommendationStatus, setRecommendationStatus] = useState("idle");
  const [recommendationError, setRecommendationError] = useState(null);

  useEffect(() => {
    setActiveNode(node);
    setHistory([]);
    setExpandido(false);
  }, [node]);

  useEffect(() => {
    if (!activeNode?.id) return undefined;

    let cancelled = false;

    const loadRecommendations = async () => {
      try {
        setRecommendationStatus("loading");
        setRecommendationError(null);

        const params = new URLSearchParams({
          limit: String(RECOMENDACOES_VISIVEIS),
        });
        const response = await fetch(
          `${BASE_URL}/recomendacoes/${encodeURIComponent(activeNode.id)}?${params.toString()}`
        );

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        if (cancelled) return;

        setRecommendations(data.recomendacoes || []);
        setRecommendationStatus("loaded");
      } catch (err) {
        if (!cancelled) {
          setRecommendations([]);
          setRecommendationError(err.message);
          setRecommendationStatus("error");
        }
      }
    };

    loadRecommendations();

    return () => {
      cancelled = true;
    };
  }, [activeNode?.id]);

  if (!activeNode) return null;

  const handleViewRecommendations = () => {
    window.location.href = `/recomendacoes/${activeNode.id}`;
  };

  const handleOpenRecommendation = (recommendation) => {
    // Mantem uma pilha local para navegar entre cards sem alterar o grafo renderizado.
    setHistory((previous) => [...previous, activeNode]);
    setActiveNode(recommendation);
    setExpandido(false);
  };

  const handleBack = () => {
    setHistory((previous) => {
      const next = [...previous];
      const previousNode = next.pop();
      if (previousNode) {
        setActiveNode(previousNode);
        setExpandido(false);
      }
      return next;
    });
  };

  const classes = activeNode.classes ?? [];
  const classesExibidas = expandido ? classes : classes.slice(0, CLASSES_VISIVEIS);
  const temMais = classes.length > CLASSES_VISIVEIS;
  const hasRecommendations = recommendations.length > 0;

  return (
    <div className="absolute right-4 top-4 z-20 max-h-[calc(100vh-6rem)] w-[24rem] max-w-[calc(100vw-2rem)] overflow-y-auto rounded-xl border border-slate-200 bg-white p-4 text-slate-900 shadow-2xl">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-blue-700 ring-1 ring-blue-100">
            {getInitials(activeNode.label || activeNode.id)}
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold text-blue-700">
              {activeNode.label}
            </h2>
            <p className="truncate text-xs text-slate-500">ID interno: {activeNode.id}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
          aria-label="Fechar card"
          title="Fechar"
        >
          <X size={17} aria-hidden="true" />
        </button>
      </div>

      {history.length > 0 && (
        <button
          type="button"
          onClick={handleBack}
          className="mb-3 inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-blue-600 transition hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <ArrowLeft size={14} aria-hidden="true" />
          Voltar
        </button>
      )}

      {activeNode.email && (
        <p className="mt-1 text-sm text-slate-700">
          <strong>Email:</strong> {activeNode.email}
        </p>
      )}
      {activeNode.publicacoes && (
        <p className="mt-1 text-sm text-slate-700">
          <strong>Publicacoes:</strong> {activeNode.publicacoes}
        </p>
      )}

      <section className="mt-3">
        <p className="text-sm font-semibold text-slate-700">
          Classes <span className="font-normal text-slate-400">({classes.length})</span>
        </p>

        {classes.length > 0 ? (
          <>
            <div className="mt-1 flex flex-wrap gap-1">
              {classesExibidas.map((cls) => (
                <span
                  key={cls}
                  className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700"
                >
                  {cls}
                </span>
              ))}
            </div>

            {temMais && (
              <button
                type="button"
                onClick={() => setExpandido(!expandido)}
                className="mt-1 text-xs font-medium text-blue-600 hover:underline"
              >
                {expandido ? "Ver menos" : `Ver mais ${classes.length - CLASSES_VISIVEIS}`}
              </button>
            )}
          </>
        ) : (
          <p className="mt-1 text-xs text-slate-400">Sem classes registradas.</p>
        )}
      </section>

      <section className="mt-4 border-t border-slate-100 pt-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-slate-700">Recomendacoes</p>
          {recommendationStatus === "loaded" && hasRecommendations && (
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-600">
              top {recommendations.length}
            </span>
          )}
        </div>

        {recommendationStatus === "loading" && (
          <p className="mt-2 text-xs text-slate-400">Carregando recomendacoes...</p>
        )}

        {recommendationStatus === "error" && (
          <p className="mt-2 text-xs text-red-500">
            Nao foi possivel carregar recomendacoes ({recommendationError}).
          </p>
        )}

        {recommendationStatus === "loaded" && !hasRecommendations && (
          <p className="mt-2 text-xs text-slate-400">Sem recomendacoes suficientes.</p>
        )}

        {hasRecommendations && (
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {recommendations.map((recommendation) => (
              <RecommendationButton
                key={recommendation.id}
                recommendation={recommendation}
                onClick={handleOpenRecommendation}
              />
            ))}
          </div>
        )}
      </section>

      {activeNode.dc_ufscar && (
        <button
          type="button"
          onClick={handleViewRecommendations}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-400"
        >
          <ExternalLink size={15} aria-hidden="true" />
          Abrir visualizacao dedicada
        </button>
      )}
    </div>
  );
};

export default NodeDetailsCard;
