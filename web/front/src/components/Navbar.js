// src/Navbar.js
import React, { useState } from 'react';
import HamburgerMenu from './Hamburguer_Menu';
import { Menu, Search } from 'lucide-react';
import { Link } from 'react-router-dom';

const Navbar = ({ togglePanel, isPanelVisible }) => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="bg-slate-100 py-4 shadow-lg">
      <div className="container mx-auto flex justify-between items-center px-6">
        {/* Logo */}
        <Link to="/" className="text-2xl font-bold text-slate-900">Universafinity</Link>

        {/* Links de navegação (desktop) */}
        <div className="hidden md:flex items-center gap-6">
          <Link to="/" className="text-slate-700 hover:text-slate-950">Busca</Link>
          <Link to="/grafo2" className="text-slate-700 hover:text-slate-950">Docentes DC</Link>
          <Link to="/grafo3" className="text-slate-700 hover:text-slate-950">Grafo completo</Link>
        </div>

        {/* Grupo de controles: toggle painel + hambúrguer */}
        <div className="flex items-center gap-4">
          <button
            onClick={togglePanel}
            className="inline-flex items-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-200"
            title={isPanelVisible ? 'Fechar pesquisa' : 'Mostrar pesquisa'}
          >
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">{isPanelVisible ? 'Fechar' : 'Pesquisar'}</span>
          </button>

          {/* Ícone de menu (mobile) */}
          <button
            className="text-slate-800 focus:outline-none md:hidden"
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
