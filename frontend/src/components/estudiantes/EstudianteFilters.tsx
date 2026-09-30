import React from 'react';
import { StudentFiltersType } from '../../types/estudiante';

interface EstudianteFiltersProps {
  filters: StudentFiltersType;
  setFilters: React.Dispatch<React.SetStateAction<StudentFiltersType>>;
  cursos?: any[];
}

export const EstudianteFilters: React.FC<EstudianteFiltersProps> = ({ filters, setFilters }) => {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value, page: 1 }));
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
      {/* Filtro Estado */}
      <div className="flex flex-col">
        <label htmlFor="filter-estado" className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
          Estado
        </label>
        <select
          id="filter-estado"
          name="estado"
          value={filters.estado}
          onChange={handleChange}
          className="bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-2 focus:ring-[#27A9E1] focus:border-[#27A9E1] block w-full px-3 py-2 outline-none transition-colors cursor-pointer"
        >
          <option value="Todos">Todos</option>
          <option value="ACTIVO">Activo</option>
          <option value="INACTIVO">Inactivo</option>
          <option value="RETIRADO">Retirado</option>
        </select>
      </div>
      
      {/* Ordenar Por */}
      <div className="flex flex-col">
        <label htmlFor="filter-sortBy" className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
          Ordenar Por
        </label>
        <select
          id="filter-sortBy"
          name="sortBy"
          value={filters.sortBy}
          onChange={handleChange}
          className="bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-2 focus:ring-[#27A9E1] focus:border-[#27A9E1] block w-full px-3 py-2 outline-none transition-colors cursor-pointer"
        >
          <option value="Fecha">Fecha de Registro</option>
          <option value="Nombre">Nombre (A-Z)</option>
          <option value="Código">Código</option>
        </select>
      </div>

      {/* Orden */}
      <div className="flex flex-col">
        <label htmlFor="filter-order" className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
          Dirección
        </label>
        <select
          id="filter-order"
          name="order"
          value={filters.order}
          onChange={handleChange}
          className="bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-2 focus:ring-[#27A9E1] focus:border-[#27A9E1] block w-full px-3 py-2 outline-none transition-colors cursor-pointer"
        >
          <option value="DESC">Descendente</option>
          <option value="ASC">Ascendente</option>
        </select>
      </div>
    </div>
  );
};

export default EstudianteFilters;
