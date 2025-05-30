import React, { useState } from "react";
import { BarChart3, Clock, Users, UserX, Info, X } from "lucide-react";
import FloatingInfoPanel from "./Floating_Menu_InfoPannel";

const FloatingActionMenu = ({ info }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showInfoPanel, setShowInfoPanel] = useState(false);

  const toggleMenu = () => setIsOpen(!isOpen);

  return (
    <>
      {showInfoPanel && <FloatingInfoPanel info={info} />}

      <div className="fixed top-32 left-6 z-50 flex flex-col items-end space-y-3">
        {isOpen && (
          <>
            <button
              onClick={() => setShowInfoPanel(!showInfoPanel)}
              className="bg-blue-500 hover:bg-blue-600 text-white p-4 rounded-full shadow-md transition-all"
              title="Estatísticas atuais"
            >
              <BarChart3 className="w-5 h-5" />
            </button>

            <button
              onClick={() => console.log("Mostrar estatísticas temporais")}
              className="bg-purple-500 hover:bg-purple-600 text-white p-4 rounded-full shadow-md transition-all"
              title="Estatísticas ao longo do tempo"
            >
              <Clock className="w-5 h-5" />
            </button>

            <button
              onClick={() => console.log("Filtrar docentes do DC")}
              className="bg-green-500 hover:bg-green-600 text-white p-4 rounded-full shadow-md transition-all"
              title="Mostrar docentes do DC"
            >
              <Users className="w-5 h-5" />
            </button>

            <button
              onClick={() => console.log("Filtrar docentes fora do DC")}
              className="bg-red-500 hover:bg-red-600 text-white p-4 rounded-full shadow-md transition-all"
              title="Mostrar docentes fora do DC"
            >
              <UserX className="w-5 h-5" />
            </button>
          </>
        )}

        <button
          onClick={toggleMenu}
          className="bg-white hover:bg-blue-200 text-black p-5 rounded-full shadow-lg transition-all"
        >
          {isOpen ? <X className="w-6 h-6" /> : <Info className="w-6 h-6" />}
        </button>
      </div>
    </>
  );
};

export default FloatingActionMenu;
