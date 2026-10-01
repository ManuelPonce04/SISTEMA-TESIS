import React, { useState, useEffect } from 'react';
import { FiRefreshCw, FiCalendar, FiClock, FiChevronDown } from 'react-icons/fi';

/**
 * DashboardHeader
 * ────────────────────────────────────────────────────────────
 * - Saludo dinámico según hora del día + nombre y rol del usuario
 * - Fecha actual formateada en español
 * - Indicador "Actualizado hace N min" con timestamp real
 * - Selector de período comparativo: Este mes / Mes anterior / Año lectivo
 */
const PERIODOS = [
  { value: 'mes_actual',    label: 'Este mes' },
  { value: 'mes_anterior',  label: 'Mes anterior' },
  { value: 'anio_lectivo',  label: 'Año lectivo' },
];

const getSaludo = () => {
  const h = new Date().getHours();
  if (h >= 5  && h < 12) return 'Buenos días';
  if (h >= 12 && h < 18) return 'Buenas tardes';
  return 'Buenas noches';
};

const formatDate = () =>
  new Date().toLocaleDateString('es-EC', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

const getRolLabel = (usuario) => {
  if (!usuario) return '';
  if (usuario.es_admin) return 'Administrador';
  if (usuario.rol === 'cobrador') return 'Cobrador';
  if (usuario.rol === 'rector') return 'Rector';
  return 'Usuario';
};

const DashboardHeader = ({ usuario, onRefresh, loading, periodo, onPeriodoChange }) => {
  const [lastSync, setLastSync] = useState(new Date());
  const [minutos, setMinutos] = useState(0);
  const [periodoOpen, setPeriodoOpen] = useState(false);

  // Actualizar contador de minutos desde última sincronización
  useEffect(() => {
    const interval = setInterval(() => {
      const diffMs = new Date() - lastSync;
      setMinutos(Math.floor(diffMs / 60000));
    }, 30000);
    return () => clearInterval(interval);
  }, [lastSync]);

  const handleRefresh = () => {
    onRefresh();
    setLastSync(new Date());
    setMinutos(0);
  };

  const periodoActual = PERIODOS.find(p => p.value === periodo) || PERIODOS[0];

  const getSyncLabel = () => {
    if (minutos === 0) return 'Actualizado hace un momento';
    if (minutos === 1) return 'Actualizado hace 1 min';
    return `Actualizado hace ${minutos} min`;
  };

  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-1">

      {/* Saludo + Rol */}
      <div>
        <p className="text-xs sm:text-sm font-medium text-[#27A9E1] mb-0.5">
          {getSaludo()}, <span className="font-semibold">{usuario?.nombre_completo || 'Usuario'}</span>
        </p>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 leading-tight">
          Panel de Cobranzas
        </h2>
        <p className="text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1 flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full bg-[#10B981]" aria-hidden="true"></span>
          {getRolLabel(usuario)} · {getSyncLabel()}
        </p>
      </div>

      {/* Controles: Fecha, Período, Refresh */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">

        {/* Fecha actual */}
        <div
          className="flex items-center gap-1.5 sm:gap-2 bg-white px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl border border-gray-100 shadow-sm text-xs sm:text-sm text-gray-600 font-medium capitalize"
          aria-label="Fecha actual"
        >
          <FiCalendar size={14} className="text-[#27A9E1]" aria-hidden="true" />
          <span className="truncate">{formatDate()}</span>
        </div>

        {/* Selector de período comparativo */}
        <div className="relative">
          <button
            onClick={() => setPeriodoOpen(o => !o)}
            aria-haspopup="listbox"
            aria-expanded={periodoOpen}
            aria-label="Selector de período"
            className="flex items-center gap-1.5 sm:gap-2 bg-white px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl border border-gray-100 shadow-sm text-xs sm:text-sm text-gray-700 font-medium hover:border-[#27A9E1] hover:text-[#27A9E1] transition-colors focus:outline-none focus:ring-2 focus:ring-[#27A9E1]"
          >
            <FiClock size={14} className="text-[#27A9E1]" aria-hidden="true" />
            {periodoActual.label}
            <FiChevronDown size={14} className={`text-gray-400 transition-transform duration-200 ${periodoOpen ? 'rotate-180' : ''}`} />
          </button>

          {periodoOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setPeriodoOpen(false)} aria-hidden="true" />
              <ul
                role="listbox"
                aria-label="Opciones de período"
                className="absolute right-0 mt-2 w-44 bg-white rounded-xl shadow-lg border border-gray-100 py-1.5 z-20 animate-fade-in"
              >
                {PERIODOS.map(p => (
                  <li key={p.value} role="option" aria-selected={periodo === p.value}>
                    <button
                      onClick={() => { onPeriodoChange(p.value); setPeriodoOpen(false); }}
                      className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                        periodo === p.value
                          ? 'bg-[#e0f7ff] text-[#27A9E1] font-semibold'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {p.label}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        {/* Botón actualizar */}
        <button
          onClick={handleRefresh}
          disabled={loading}
          aria-label="Actualizar datos del dashboard"
          title="Actualizar datos"
          className="flex items-center gap-2 px-4 py-2 bg-[#27A9E1] text-white text-sm font-medium rounded-xl shadow-sm hover:bg-[#1E8BBF] hover:shadow-[0_4px_12px_rgba(39,169,225,0.3)] transition-all disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-[#27A9E1] focus:ring-offset-2"
        >
          <FiRefreshCw size={15} className={loading ? 'animate-spin' : ''} aria-hidden="true" />
          <span className="hidden sm:inline">Actualizar</span>
        </button>
      </div>
    </div>
  );
};

export default DashboardHeader;
