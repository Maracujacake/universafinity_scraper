import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SearchBar from './Search_Bar';
import WeightFilter from './Weight_Filter';

const panelVariants = {
  hidden: { opacity: 0, y: -20 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

const OverlayPanel = ({ isVisible, searchTerm, setSearchTerm, nodeList, minWeight, setMinWeight }) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="container mx-auto text-center py-12 px-4 absolute inset-0 z-10 pointer-events-none"
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={panelVariants}
          transition={{ duration: 0.4 }}
        >
          <div className="bg-[#D1D5DB]/70 backdrop-blur-md rounded-2xl p-6 max-w-3xl mx-auto pointer-events-auto">
            <h1 className="text-5xl font-extrabold mb-4 text-[#1E3A8A]">Universafinity</h1>
            <p className="text-lg max-w-2xl mx-auto mb-8 text-[#1E3A8A]">
              Um ambiente interativo para visualizar conexões acadêmicas e explorar redes de coautoria.
            </p>
            <SearchBar onSearch={setSearchTerm} nodeList={nodeList} />
            <WeightFilter minWeight={minWeight} setMinWeight={setMinWeight} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default OverlayPanel;
