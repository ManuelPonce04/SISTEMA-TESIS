import React from 'react';
import { FiFilter, FiX } from 'react-icons/fi';
import { MESES_LECTIVOS, CURSOS_DISPONIBLES, TIPOS_PENSION, FILTROS_DEFAULT } from '../../data/dashboardMock';

/**
 * DashboardFilters
 * ────────────────────────────────────────────────────────────
 * Barra de filtros globales del dashboard.
 * Todos los componentes de datos reaccionan a estos filtros.
 * Incluye: año lectivo, curso, paralelo, mes, estado pensión, tipo beca.
 */

const SelectField = ({ label, name, value, onChange, options, id }) => (
  <div className="flex flex-col gap-1 min-w-0 w-full sm:w-auto sm:min-w-[120px] flex-1">
    <label htmlFor={id} className="text-[11px] sm:text-xs font-semibold text-gray-400 uppercase tracking-wider truncate">
      {label}
    </label>
    <select
      id={id}
      name={name}
      value={value}
      onChange={onChange}
      className="bg-white border border-gray-200 text-gray-700 text-xs sm:text-sm rounded-lg focus:ring-2 focus:ring-[#27A9E1] focus:border-[#27A9E1] block w-full px-2.5 sm:px-3 py-2 outline-none transition-all cursor-pointer"
    >
      {options.map(opt => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
  </div>
);

const DashboardFilters = ({ filtros, setFiltros }) => {
  const handleChange = (e) => {
    setFiltros(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // Contar filtros activos (diferentes al default)
  const activeCount = Object.entries(filtros).filter(
    ([k, v]) => k !== 'periodo' && FILTROS_DEFAULT[k] !== undefined && v !== FILTROS_DEFAULT[k]
  ).length;

  const handleReset = () => setFiltros(FILTROS_DEFAULT);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-6">
      <div className="flex flex-col md:flex-row items-stretch">
        {/* Ícono lateral para desktop */}
        <div className="hidden md:flex bg-[#0f172a] items-center justify-center px-5 flex-shrink-0 border-r-4 border-[#27A9E1]">
          <div className="flex flex-col items-center gap-1.5">
            <FiFilter size={20} className="text-[#F4C542]" aria-hidden="true" />
            {activeCount > 0 && (
              <span className="bg-[#27A9E1] text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {activeCount}
              </span>
            )}
          </div>
        </div>

        {/* Cabecera de filtros visible en móvil */}
        <div className="md:hidden flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <FiFilter size={16} className="text-[#27A9E1]" />
            <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">Filtros</span>
            {activeCount > 0 && (
              <span className="bg-[#27A9E1] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {activeCount} activo{activeCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
          {activeCount > 0 && (
            <button
              onClick={handleReset}
              className="text-[11px] font-semibold text-red-500 hover:text-red-700 flex items-center gap-1"
            >
              <FiX size={12} /> Limpiar
            </button>
          )}
        </div>

        {/* Contenedor de filtros con cuadrícula 2 col en móvil */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:flex lg:flex-wrap items-end gap-3 p-3 sm:p-4 flex-1">
          <SelectField
            id="filtro-anio"
            label="Año Lectivo"
            name="anio"
            value={filtros.anio}
            onChange={handleChange}
            options={['2026-2027', '2025-2026', '2024-2025']}
          />
          <SelectField
            id="filtro-curso"
            label="Curso"
            name="curso"
            value={filtros.curso}
            onChange={handleChange}
            options={CURSOS_DISPONIBLES}
          />
          <SelectField
            id="filtro-paralelo"
            label="Paralelo"
            name="paralelo"
            value={filtros.paralelo}
            onChange={handleChange}
            options={['Todos', 'A', 'B', 'C', 'D']}
          />
          <SelectField
            id="filtro-mes"
            label="Mes"
            name="mes"
            value={filtros.mes}
            onChange={handleChange}
            options={MESES_LECTIVOS}
          />
          <SelectField
            id="filtro-estado"
            label="Estado Pensión"
            name="estado"
            value={filtros.estado}
            onChange={handleChange}
            options={['Todos', 'Al día', 'En mora', 'Abono parcial']}
          />
          <SelectField
            id="filtro-tipobeca"
            label="Tipo de Pensión"
            name="tipoBeca"
            value={filtros.tipoBeca}
            onChange={handleChange}
            options={['Todos', ...TIPOS_PENSION]}
          />

          {/* Botón limpiar filtros */}
          {activeCount > 0 && (
            <button
              onClick={handleReset}
              aria-label="Limpiar todos los filtros"
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors border border-red-100 self-end focus:outline-none focus:ring-2 focus:ring-red-200"
            >
              <FiX size={14} aria-hidden="true" />
              Limpiar filtros
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardFilters;
