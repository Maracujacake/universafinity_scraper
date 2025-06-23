import { motion } from 'framer-motion';
import { Users } from 'lucide-react';

const FloatingButton = ({ onClick }) => {
  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="fixed bottom-6 left-6 bg-[#1E3A8A] text-white p-4 rounded-full shadow-lg hover:bg-blue-800 z-50 glow-effect"
    >
      <Users size={24} />
    </motion.button>
  );
};

export default FloatingButton;
