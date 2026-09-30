import React from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { FiFilter, FiX } from 'react-icons/fi';

const PensionesFilters = ({ filtros, setFiltros, onApply, onClear, cursos = [], anios = [] }) => {
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFiltros(prev => ({ ...prev, [name]: value }));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      onApply();
    }
  };

  return (
    <Card className="mb-6 bg-white shadow-sm border border-gray-100">
      <div className="flex flex-col md:flex-row gap-4">
        {/* Buscador de texto */}
        <div className="flex-1">
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Buscar</label>
          <input 
            type="text" 
            name="search"
            value={filtros.search}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Estudiante, cédula o código..."
            className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#27A9E1] focus:ring-1 focus:ring-[#27A9E1]"
          />
        </div>

        <div className="w-full md:w-40">
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Año Lectivo</label>
          <select 
            name="anio_lectivo"
            value={filtros.anio_lectivo}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#27A9E1]"
          >
            <option value="Todos">Todos</option>
            {anios.map(a => (
              <option key={a.id} value={a.id}>{a.nombre}</option>
            ))}
          </select>
        </div>

        <div className="w-full md:w-48">
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Curso</label>
          <select 
            name="curso"
            value={filtros.curso}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#27A9E1]"
          >
            <option value="Todos">Todos los cursos</option>
            {cursos.map(c => (
              <option key={c.id_curso} value={c.id_curso}>{c.nombre}</option>
            ))}
          </select>
        </div>

        <div className="w-full md:w-32">
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Mes</label>
          <select 
            name="mes"
            value={filtros.mes}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#27A9E1]"
          >
            <option value="Todos">Todos</option>
            <option value="Mayo">Mayo</option>
            <option value="Junio">Junio</option>
            <option value="Julio">Julio</option>
            <option value="Agosto">Agosto</option>
            <option value="Septiembre">Septiembre</option>
            <option value="Octubre">Octubre</option>
            <option value="Noviembre">Noviembre</option>
            <option value="Diciembre">Diciembre</option>
            <option value="Enero">Enero</option>
            <option value="Febrero">Febrero</option>
          </select>
        </div>

        <div className="w-full md:w-36">
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Estado</label>
          <select 
            name="estado"
            value={filtros.estado}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#27A9E1]"
          >
            <option value="Todos">Todos</option>
            <option value="Pendiente">Pendiente</option>
            <option value="Parcial">Parcial</option>
            <option value="Vencido">Vencido</option>
            <option value="Pagado">Pagado</option>
            <option value="Anulada">Anulada</option>
          </select>
        </div>

        <div className="flex items-end gap-2">
          <Button variant="primary" onClick={onApply} icon={FiFilter} className="py-2">
            Filtrar
          </Button>
          <Button variant="secondary" onClick={onClear} icon={FiX} className="py-2" title="Limpiar">
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default PensionesFilters;
