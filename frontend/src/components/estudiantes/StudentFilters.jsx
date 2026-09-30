import React from 'react';

const StudentFilters = ({ filters, setFilters, cursos }) => {
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value, page: 1 }));
  };

  return (
    <div className="flex gap-4 items-center mt-4">
      <div className="flex flex-col">
        <label className="text-xs font-semibold text-gray-600 mb-1">Curso</label>
        <select 
          name="curso" 
          className="form-input text-sm py-1.5"
          value={filters.curso}
          onChange={handleChange}
        >
          <option value="Todos">Todos</option>
          {cursos.map(c => (
            <option key={c.id_curso} value={c.nombre}>{c.nombre}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-col">
        <label className="text-xs font-semibold text-gray-600 mb-1">Paralelo</label>
        <select 
          name="paralelo" 
          className="form-input text-sm py-1.5"
          value={filters.paralelo}
          onChange={handleChange}
        >
          <option value="Todos">Todos</option>
          <option value="A">A</option>
          <option value="B">B</option>
          <option value="C">C</option>
          <option value="D">D</option>
        </select>
      </div>

      <div className="flex flex-col">
        <label className="text-xs font-semibold text-gray-600 mb-1">Estado</label>
        <select 
          name="estado" 
          className="form-input text-sm py-1.5"
          value={filters.estado}
          onChange={handleChange}
        >
          <option value="Todos">Todos</option>
          <option value="Activo">Activo</option>
          <option value="Inactivo">Inactivo</option>
        </select>
      </div>
    </div>
  );
};

export default StudentFilters;
