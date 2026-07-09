import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Database, Network, Search } from 'lucide-react';
import SearchBar from './Search_Bar';
import WeightFilter from './Weight_Filter';

const panelVariants = {
  hidden: { opacity: 0, y: -20 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

const OverlayPanel = ({
  isVisible,
  searchTerm,
  nodeList,
  minWeight,
  setMinWeight,
  summaryInfo,
  featuredNode,
  homeLoadError,
  onSearch,
}) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="container mx-auto px-4 py-8 absolute inset-0 z-10 pointer-events-none"
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={panelVariants}
          transition={{ duration: 0.4 }}
        >
          <div className="pointer-events-auto max-w-4xl rounded-lg border border-slate-700 bg-slate-950/88 p-5 text-slate-100 shadow-xl backdrop-blur-md md:p-6">
            <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
              <div className="max-w-2xl">
                <p className="text-sm font-semibold uppercase tracking-wide text-cyan-300">
                  Universafinity
                </p>
                <h1 className="mt-2 text-3xl font-bold text-white md:text-4xl">
                  Explore afinidades de pesquisa por coautoria
                </h1>
                <p className="mt-3 text-sm leading-6 text-slate-300 md:text-base">
                  O projeto usa publicacoes dos docentes do Departamento de Computacao como ponto de partida. Cada busca mostra o subgrafo de um autor e os coautores ligados a ele por trabalhos em comum.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs text-slate-300 md:w-80">
                <div className="rounded border border-slate-700 bg-slate-900/80 p-3">
                  <Network className="mx-auto mb-1 h-4 w-4 text-cyan-300" />
                  <strong className="block text-base text-white">{summaryInfo?.num_nos ?? '-'}</strong>
                  autores
                </div>
                <div className="rounded border border-slate-700 bg-slate-900/80 p-3">
                  <Database className="mx-auto mb-1 h-4 w-4 text-emerald-300" />
                  <strong className="block text-base text-white">{summaryInfo?.num_arestas ?? '-'}</strong>
                  ligacoes
                </div>
                <div className="rounded border border-slate-700 bg-slate-900/80 p-3">
                  <Search className="mx-auto mb-1 h-4 w-4 text-amber-300" />
                  <strong className="block text-base text-white">{nodeList.length || '-'}</strong>
                  no indice
                </div>
              </div>
            </div>

            <SearchBar onSearch={onSearch} nodeList={nodeList} />
            <WeightFilter minWeight={minWeight} setMinWeight={setMinWeight} />

            <div className="mt-4 flex flex-col gap-2 text-xs text-slate-400 md:flex-row md:items-center md:justify-between">
              <span>
                Exemplo inicial: {featuredNode?.label ?? 'carregando autor de referencia'}
              </span>
              {searchTerm && <span>Busca ativa: {searchTerm}</span>}
              {homeLoadError && <span className="text-red-300">Erro: {homeLoadError}</span>}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default OverlayPanel;
