// src/components/FloatingButton.js
import React from 'react';
import { Users } from 'lucide-react';

const FloatingButton = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 bg-[#1E3A8A] text-white p-4 rounded-full shadow-lg hover:bg-blue-800 transition-all z-50"
    >
      <Users size={24} />
    </button>
  );
};

export default FloatingButton;
