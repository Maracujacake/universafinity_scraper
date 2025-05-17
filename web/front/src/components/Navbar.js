// src/Navbar.js
import React, { useState } from 'react';
import HamburgerMenu from './Hamburguer_Menu';
import { Menu } from 'lucide-react';
import { Link } from 'react-router-dom';

const Navbar = ({ togglePanel, isPanelVisible }) => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="bg-[#D1D5DB] py-4 shadow-lg">
      <div className="container mx-auto flex justify-between items-center px-6">
        {/* Logo */}
        <span className="text-2xl font-bold text-[#1E3A8A]">Universafinity</span>

        {/* Links de navegação (desktop) */}
        <div className="hidden md:flex items-center gap-6">
          <Link to="/" className="text-[#1E3A8A] hover:underline">Grafo 1</Link>
          <Link to="/grafo2" className="text-[#1E3A8A] hover:underline">Grafo 2</Link>
          <Link to="/grafo3" className="text-[#1E3A8A] hover:underline">Grafo 3</Link>
        </div>

        {/* Grupo de controles: toggle painel + hambúrguer */}
        <div className="flex items-center gap-4">
          <button
            onClick={togglePanel}
            className="bg-white text-[#1E3A8A] px-4 py-2 rounded-xl hover:bg-gray-200 transition"
          >
            {isPanelVisible ? 'Fechar Pesquisa' : 'Mostrar Pesquisa'}
          </button>

          {/* Ícone de menu (mobile) */}
          <button
            className="text-[#1E3A8A] focus:outline-none md:hidden"
            onClick={() => setMenuOpen(prev => !prev)}
          >
            <Menu size={28} />
          </button>
        </div>
      </div>

      {/* Menu hamburguer (mobile) */}
      {menuOpen && <HamburgerMenu onClose={() => setMenuOpen(false)} />}
    </nav>
  );
};

export default Navbar;
