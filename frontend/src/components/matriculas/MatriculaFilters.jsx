import React from 'react';
import Card from '../ui/Card';
import { FiFilter, FiRefreshCw } from 'react-icons/fi';

const MatriculaFilters = ({ filtros, setFiltros, onApply, onClear }) => {
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFiltros(prev => ({ ...prev, [name]: value }));
  };

  return (
    <Card className="mb-6 flex flex-col md:flex-row items-start md:items-center gap-4" noPadding>
      <div className="bg-[#1e293b] text-[#F4C542] p-5 flex items-center justify-center self-stretch hidden md:flex border-r-4 border-[#27A9E1]">
        <FiFilter size={24} />
      </div>
      
      <div className="flex flex-wrap items-center gap-4 p-4 md:p-2 flex-1">
        <div className="flex flex-col gap-1 w-full md:w-auto">
          <label className="text-[0.7rem] font-bold text-gray-400 uppercase tracking-wider">Buscar Estudiante</label>
          <input 
            type="text" 
            name="search"
            placeholder="Cédula, Nombres..." 
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm w-full md:w-64 focus:outline-none focus:border-[#27A9E1]"
            value={filtros.search}
            onChange={handleChange}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[0.7rem] font-bold text-gray-400 uppercase tracking-wider">Año Lectivo</label>
          <select 
            name="anio_lectivo"
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#27A9E1]"
            value={filtros.anio_lectivo}
            onChange={handleChange}
          >
            <option value="Todos">Todos</option>
            <option value="2025-2026">2025-2026</option>
            <option value="2026-2027">2026-2027</option>
            <option value="2027-2028">2027-2028</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[0.7rem] font-bold text-gray-400 uppercase tracking-wider">Estado</label>
          <select 
            name="estado"
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#27A9E1]"
            value={filtros.estado}
            onChange={handleChange}
          >
            <option value="Todos">Todos</option>
            <option value="Activa">Activa</option>
            <option value="Anulada">Anulada</option>
            <option value="Finalizada">Finalizada</option>
          </select>
        </div>
        
        <div className="flex items-end gap-2 ml-auto mt-4 md:mt-0">
          <button 
            onClick={onClear}
            className="px-4 py-1.5 text-sm text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Limpiar
          </button>
          <button 
            onClick={onApply}
            className="px-4 py-1.5 text-sm text-white bg-[#27A9E1] hover:bg-[#1E8BBF] rounded-lg transition-colors flex items-center gap-2"
          >
            <FiRefreshCw size={14} /> Aplicar
          </button>
        </div>
      </div>
    </Card>
  );
};

export default MatriculaFilters;
