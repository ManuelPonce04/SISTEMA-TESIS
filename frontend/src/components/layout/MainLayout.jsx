import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiMenu, FiX, FiBell, FiChevronDown, FiUser, FiLogOut, FiSettings } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import Sidebar from './Sidebar';
import Swal from 'sweetalert2';

const MainLayout = ({ children, title = "Panel Principal", subtitle = "Inicio / Dashboard", rightPanel }) => {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();

  // En móvil/tablet (< 1024px) empieza cerrado; en pantallas grandes (>= 1024px) empieza abierto
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024;
    }
    return false;
  });
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Manejo de responsive al cambiar tamaño de ventana
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = () => window.innerWidth < 1024;

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

      {/* Overlay oscuro con blur solo en móvil/tablet cuando sidebar está abierto */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-[2px] z-40 md:hidden transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
          aria-label="Cerrar menú lateral"
        />
      )}

      {/* Sidebar Drawer */}
      <Sidebar
        open={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        onNavigate={() => { if (isMobile()) setSidebarOpen(false); }}
      />

      {/* Área principal — en desktop se desplaza según el sidebar, en móvil ocupa 100% */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ml-0 ${sidebarOpen ? 'md:ml-64' : 'md:ml-20'}`}>

        {/* Navbar Superior */}
        <header className="bg-white h-[64px] md:h-[80px] border-b border-gray-100 shadow-sm px-3 sm:px-4 md:px-6 flex items-center justify-between sticky top-0 z-30 border-t-4 border-t-[#27A9E1]">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Botón hamburguesa — siempre visible */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label={sidebarOpen ? "Cerrar menú" : "Abrir menú"}
              className="p-2 text-gray-600 hover:bg-gray-100 hover:text-[#27A9E1] rounded-lg transition-colors flex-shrink-0 touch-manipulation"
            >
              {sidebarOpen ? <FiX size={22} /> : <FiMenu size={22} />}
            </button>

            <div>
              <span className="text-[10px] md:text-xs font-medium text-gray-400 leading-none block">{subtitle}</span>
              <h1 className="text-base md:text-xl font-bold text-gray-800 leading-tight truncate max-w-[160px] sm:max-w-xs md:max-w-none">{title}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            {/* Notificaciones */}
            <button className="relative p-2 text-gray-500 hover:bg-[#e0f7ff] hover:text-[#27A9E1] rounded-full transition-colors">
              <FiBell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>

            {/* Perfil */}
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 p-1.5 hover:bg-gray-50 rounded-xl transition-colors border border-transparent hover:border-gray-100 focus:outline-none"
              >
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-[#27A9E1] text-white flex items-center justify-center font-bold text-sm shadow-sm flex-shrink-0">
                  {usuario?.nombre_completo ? usuario.nombre_completo.substring(0, 2).toUpperCase() : 'US'}
                </div>
                <span className="hidden md:block text-sm font-semibold text-gray-800 max-w-[120px] truncate">
                  {usuario?.nombre_completo || 'Usuario'}
                </span>
                <FiChevronDown className={`text-gray-400 transition-transform flex-shrink-0 ${dropdownOpen ? 'rotate-180' : ''}`} size={16} />
              </button>

              {/* Menú Desplegable */}
              {dropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)}></div>
                  <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50">
                    {/* Nombre en móvil */}
                    <div className="px-5 py-2 border-b border-gray-100 mb-1 md:hidden">
                      <p className="text-sm font-semibold text-gray-800 truncate">{usuario?.nombre_completo || 'Usuario'}</p>
                      <p className="text-xs text-gray-400 truncate">{usuario?.correo || ''}</p>
                    </div>
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
                      <FiSettings size={16} /> Configuración
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

        {/* Cuerpo */}
        <main className="flex-1 p-3 sm:p-4 md:p-6 lg:p-8 overflow-x-hidden">
          <div className="flex flex-col lg:flex-row gap-4 md:gap-6 max-w-[1600px] mx-auto">
            <div className="flex-1 min-w-0 flex flex-col gap-4 md:gap-6">
              {children}
            </div>

            {rightPanel && (
              <aside className="w-full lg:w-[320px] flex-shrink-0 flex flex-col gap-4 md:gap-6">
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
