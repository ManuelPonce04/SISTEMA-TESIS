import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiMenu, FiX, FiBell, FiChevronDown, FiUser, FiLogOut, FiSearch } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import Sidebar from './Sidebar';
import Swal from 'sweetalert2';

const MainLayout = ({ children, title = "Panel Principal", subtitle = "Inicio / Dashboard", rightPanel }) => {
  const { usuario, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    const result = await Swal.fire({
      title: '¿Cerrar sesión?',
      text: 'Se cerrará tu sesión actual.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#00AEEF',
      cancelButtonColor: '#d1d5db',
      confirmButtonText: 'Sí, salir',
      cancelButtonText: 'Cancelar',
    });
    if (result.isConfirmed) { logout(); navigate('/login'); }
  };

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      {/* Sidebar - Fijo en escritorio, drawer en móvil */}
      <Sidebar open={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />

      {/* Área principal */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${sidebarOpen ? 'md:ml-64' : 'md:ml-20'}`}>
        
        {/* Navbar Superior */}
        <header className="bg-white h-[80px] border-b border-gray-100 shadow-sm px-6 flex items-center justify-between sticky top-0 z-40 border-t-4 border-t-[#27A9E1]">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 text-gray-500 hover:bg-gray-100 hover:text-[#27A9E1] rounded-lg transition-colors md:hidden"
            >
              {sidebarOpen ? <FiX size={22} /> : <FiMenu size={22} />}
            </button>
            <div className="hidden md:block">
              <span className="text-xs font-medium text-gray-400">{subtitle}</span>
              <h1 className="text-xl font-bold text-gray-800 leading-tight">{title}</h1>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {/* Buscador */}
            <div className="hidden lg:flex items-center relative">
              <FiSearch className="absolute left-3 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="Buscar estudiante, representante o pago..."
                className="w-[300px] pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[#27A9E1] focus:bg-white transition-all"
              />
            </div>

            {/* Notificaciones */}
            <button className="relative p-2 text-gray-500 hover:bg-[#e0f7ff] hover:text-[#27A9E1] rounded-full transition-colors">
              <FiBell size={22} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>

            {/* Perfil */}
            <div className="relative">
              <button 
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-3 p-1.5 hover:bg-gray-50 rounded-xl transition-colors border border-transparent hover:border-gray-100 focus:outline-none"
              >
                <div className="w-10 h-10 rounded-full bg-[#27A9E1] text-white flex items-center justify-center font-bold shadow-sm">
                  {usuario?.nombre_completo ? usuario.nombre_completo.substring(0, 2).toUpperCase() : 'US'}
                </div>
                <div className="hidden md:flex flex-col items-start">
                  <span className="text-sm font-semibold text-gray-800">{usuario?.nombre_completo || 'Usuario'}</span>
                </div>
                <FiChevronDown className={`text-gray-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Menú Desplegable */}
              {dropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)}></div>
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50 animate-fade-in">
                    <button 
                      onClick={() => { setDropdownOpen(false); navigate('/perfil'); }}
                      className="w-full text-left px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-[#27A9E1] flex items-center gap-3 transition-colors"
                    >
                      <FiUser size={16} /> Mi Perfil
                    </button>
                    <button 
                      onClick={() => { setDropdownOpen(false); navigate('/configuracion'); }}
                      className="w-full text-left px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-[#27A9E1] flex items-center gap-3 transition-colors"
                    >
                      <FiMenu size={16} /> Configuración
                    </button>
                    <div className="h-px bg-gray-100 my-1 mx-4"></div>
                    <button 
                      onClick={() => { setDropdownOpen(false); handleLogout(); }}
                      className="w-full text-left px-5 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors"
                    >
                      <FiLogOut size={16} /> Cerrar Sesión
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Cuerpo del Layout */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-x-hidden">
          <div className="flex flex-col lg:flex-row gap-6 max-w-[1600px] mx-auto">
            <div className="flex-1 min-w-0 flex flex-col gap-6">
              {/* Título móvil (solo visible en pantallas pequeñas) */}
              <div className="md:hidden mb-2">
                <span className="text-xs font-medium text-gray-400">{subtitle}</span>
                <h1 className="text-xl font-bold text-gray-800">{title}</h1>
              </div>
              
              {children}
            </div>

            {rightPanel && (
              <aside className="w-full lg:w-[320px] flex-shrink-0 flex flex-col gap-6">
                {rightPanel}
              </aside>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
