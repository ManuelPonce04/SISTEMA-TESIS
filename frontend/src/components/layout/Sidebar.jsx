import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  FiHome, FiUsers, FiFileText, FiDollarSign,
  FiBarChart2, FiPieChart, FiSettings, FiLogOut,
  FiChevronDown, FiList, FiCreditCard, FiBookOpen,
  FiX
} from 'react-icons/fi';
import Swal from 'sweetalert2';
import { useAuth } from '../../context/AuthContext';
import logo from '../../assets/logo.png';

const menuItems = [
  { icon: FiHome,       label: 'Dashboard',    path: '/dashboard' },
  { icon: FiUsers,      label: 'Estudiantes',  path: '/estudiantes' },
  { icon: FiUsers,      label: 'Representantes',path: '/representantes' },

  { icon: FiUsers,      label: 'Personal',     path: '/personal' },

  // ── Control Financiero (submenú) ──
  {
    icon: FiDollarSign,
    label: 'Control Financiero',
    submenu: [
      { icon: FiList,       label: 'Catálogo de Movimientos', path: '/financiero/movimientos' },
      { icon: FiCreditCard, label: 'Cuentas Financieras',     path: '/financiero/cuentas' },
      { icon: FiBookOpen,   label: 'Ingresos y Egresos',      path: '/financiero/ingresos-egresos' },
      { icon: FiDollarSign, label: 'Sueldos y Anticipos',     path: '/financiero/sueldos-anticipos' },
      { icon: FiFileText,   label: 'Rol de Pagos',            path: '/financiero/rol-pagos' },
      { icon: FiBarChart2,  label: 'Consolidado',             path: '/financiero/consolidado' },
      { icon: FiCreditCard, label: 'Cobro de Pensiones',     path: '/control-financiero/pensiones/cobrar' },
      { icon: FiFileText,   label: 'Facturación',            path: '/control-financiero/facturacion' },
      { icon: FiFileText,   label: 'Estado de Cuenta',       path: '/control-financiero/pensiones/estado-cuenta' },
      { icon: FiList,       label: 'Morosos',                path: '/control-financiero/pensiones/morosos' },
    ],
  },
  // ── Gestión Académica ──
  {
    icon: FiBookOpen,
    label: 'Gestión Académica',
    submenu: [
      { icon: FiList, label: 'Estructura académica', path: '/gestion-academica/estructura' },
      { icon: FiFileText, label: 'Matrículas', path: '/gestion-academica/matriculas' },
    ],
  },
  { icon: FiBarChart2,  label: 'Reportes',     path: '/reportes' },
  { icon: FiPieChart,   label: 'KPI',          path: '/kpi' },
  { icon: FiUsers,      label: 'Usuarios',     path: '/usuarios', adminOnly: true },
  { icon: FiSettings,   label: 'Configuración',path: '/configuracion' },
];

const Sidebar = ({ open, onToggle, onNavigate = () => {} }) => {
  const { usuario, logout } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();

  // Estado para submenús expandidos
  const [expandedMenus, setExpandedMenus] = useState(() => {
    // Auto-expandir si la ruta actual pertenece a un submenú
    const expanded = {};
    menuItems.forEach(item => {
      if (item.submenu) {
        const isActive = item.submenu.some(sub => location.pathname.startsWith(sub.path));
        if (isActive) expanded[item.label] = true;
      }
    });
    return expanded;
  });

  const allowed = menuItems.filter(item => !item.adminOnly || usuario?.es_admin);

  const toggleSubmenu = (label) => {
    setExpandedMenus(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const handleLogout = async () => {
    const result = await Swal.fire({
      title: '¿Cerrar sesión?',
      text: 'Se cerrará tu sesión actual.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#27A9E1',
      cancelButtonColor: '#d1d5db',
      confirmButtonText: 'Sí, salir',
      cancelButtonText: 'Cancelar',
    });
    if (result.isConfirmed) { logout(); navigate('/login'); }
  };

  return (
    <aside
      className={`fixed top-0 bottom-0 left-0 h-full bg-[#0f172a] shadow-2xl z-50 transition-all duration-300 ease-in-out flex flex-col
        ${open 
          ? 'translate-x-0 w-72 md:w-64 max-w-[85vw] md:max-w-none' 
          : '-translate-x-full md:translate-x-0 w-72 md:w-20'
        }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-5 border-b border-slate-800 h-[70px] md:h-[80px]">
        <div className="flex items-center gap-3 overflow-hidden">
          <img src={logo} alt="Logo" className="w-10 h-10 object-contain flex-shrink-0 drop-shadow-md bg-white rounded-full p-1" />
          {open && (
            <div className="overflow-hidden">
              <span className="block text-[0.95rem] font-bold text-white whitespace-nowrap leading-tight">SIGCOP-KPI</span>
              <span className="block text-[0.7rem] font-medium text-[#F4C542] whitespace-nowrap tracking-wide">UE Juan León Mera</span>
            </div>
          )}
        </div>
        {/* Botón X visible solo en móvil cuando el sidebar está abierto */}
        {open && (
          <button
            onClick={onToggle}
            className="md:hidden text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors flex-shrink-0"
            aria-label="Cerrar menú lateral"
          >
            <FiX size={20} />
          </button>
        )}
      </div>

      {/* Navegación */}
      <nav className="flex-1 px-3 py-6 flex flex-col gap-1.5 overflow-y-auto custom-scrollbar">
        {allowed.map((item) => {
          const Icon = item.icon;

          // ── Item con submenú ──
          if (item.submenu) {
            const isExpanded = expandedMenus[item.label];
            const isSubActive = item.submenu.some(sub => location.pathname.startsWith(sub.path));

            return (
              <div key={item.label}>
                <button
                  onClick={() => { if (open) { toggleSubmenu(item.label); } else { navigate(item.submenu[0].path); onNavigate(); } }}
                  title={!open ? item.label : ''}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-sm font-medium relative overflow-hidden group ${
                    isSubActive && !isExpanded
                      ? 'bg-[#27A9E1]/15 text-[#27A9E1]'
                      : isSubActive
                      ? 'text-[#27A9E1]'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  {isSubActive && (
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#F4C542] rounded-r-md"></div>
                  )}
                  <Icon size={20} className={`flex-shrink-0 ${isSubActive ? 'text-[#27A9E1]' : 'text-slate-400 group-hover:text-[#F4C542]'}`} />
                  {open && (
                    <>
                      <span className="whitespace-nowrap flex-1 text-left">{item.label}</span>
                      <FiChevronDown
                        size={14}
                        className={`flex-shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''} ${isSubActive ? 'text-[#27A9E1]' : 'text-slate-500'}`}
                      />
                    </>
                  )}
                </button>

                {/* Submenú items */}
                {open && isExpanded && (
                  <div className="mt-1 ml-4 pl-4 border-l-2 border-slate-700 space-y-0.5 animate-fade-in">
                    {item.submenu.map((sub) => {
                      const SubIcon = sub.icon;
                      const subActive = location.pathname.startsWith(sub.path);
                      return (
                        <button
                          key={sub.label}
                          onClick={() => { navigate(sub.path); onNavigate(); }}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-200 text-[0.8rem] font-medium ${
                            subActive
                              ? 'bg-[#27A9E1] text-white shadow-[0_2px_8px_rgba(39,169,225,0.35)]'
                              : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                          }`}
                        >
                          <SubIcon size={15} className="flex-shrink-0" />
                          <span className="whitespace-nowrap">{sub.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          // ── Item simple (sin submenú) ──
          const active = location.pathname.startsWith(item.path);
          return (
            <button
              key={item.label}
              onClick={() => { navigate(item.path); onNavigate(); }}
              title={!open ? item.label : ''}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-sm font-medium relative overflow-hidden group ${
                active 
                  ? 'bg-[#27A9E1] text-white shadow-[0_4px_12px_rgba(39,169,225,0.4)]' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {active && (
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#F4C542] rounded-r-md"></div>
              )}
              <Icon size={20} className={`flex-shrink-0 ${active ? 'text-white' : 'text-slate-400 group-hover:text-[#F4C542]'}`} />
              {open && <span className="whitespace-nowrap">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-800">
        <button 
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-sm font-medium ${
            open ? 'bg-slate-800 text-slate-300 hover:bg-red-500 hover:text-white' : 'text-slate-400 hover:bg-red-500 hover:text-white'
          }`} 
          onClick={handleLogout} 
          title={!open ? 'Cerrar sesión' : ''}
        >
          <FiLogOut size={20} className="flex-shrink-0" />
          {open && <span className="whitespace-nowrap">Cerrar sesión</span>}
        </button>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #475569; }
      `}</style>
    </aside>
  );
};

export default Sidebar;
