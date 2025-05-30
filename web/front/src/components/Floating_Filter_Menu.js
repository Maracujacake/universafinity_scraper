import React from 'react';
import './FloatingMenu.css'; // estilização comum aos menus flutuantes

const FloatingFilterMenu = () => {
  return (
    <div className="floating-menu left">
      <button className="menu-button">Filtros</button>
      {/* Aqui vão os botões ou opções específicas */}
    </div>
  );
};

export default FloatingFilterMenu;