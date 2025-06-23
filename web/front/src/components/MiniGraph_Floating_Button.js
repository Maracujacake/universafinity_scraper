import { motion } from 'framer-motion';
import { Network } from 'lucide-react'; // ícone para o botão do mini grafo

const MiniGraphToggleButton = ({ onClick, active = false }) => {
  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={`
        fixed left-6 p-4 rounded-full shadow-lg z-50 glow-effect
        bottom-24
        ${active ? 'bg-green-700 hover:bg-green-800' : 'bg-[#1E3A8A] hover:bg-blue-800'}
        text-white
      `}
      aria-label="Toggle mini graph"
    >
      <Network size={24} />
    </motion.button>
  );
};

export default MiniGraphToggleButton;
