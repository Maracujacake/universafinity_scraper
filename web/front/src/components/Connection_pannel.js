// src/components/ConnectionsPanel.js
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ConnectionsPanel = ({ isVisible, connections, onClose }) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 bg-white/80 backdrop-blur-md p-8 overflow-y-auto z-40"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
        >
          <div className="max-w-2xl mx-auto bg-white shadow-xl rounded-xl p-6 relative">
            <h2 className="text-2xl font-bold text-[#1E3A8A] mb-4">Conexões Encontradas</h2>
            <ul className="space-y-2">
              {connections.map(( {node}, index) => (
                <li key={index} className="border-b py-2 text-[#1E3A8A]">{node}</li>
              ))}
            </ul>
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-600 hover:text-black"
            >
              ✕
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ConnectionsPanel;
