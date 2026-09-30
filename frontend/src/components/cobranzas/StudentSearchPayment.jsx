import React, { useState, useEffect, useRef } from 'react';
import { FiSearch, FiUser, FiX } from 'react-icons/fi';
import { buscarEstudiantesCobranzas } from '../../services/cobranzasService';

const StudentSearchPayment = ({ onSelectStudent }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchTerm.length >= 2) {
        handleSearch(searchTerm);
      } else {
        setResults([]);
        setShowDropdown(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const handleSearch = async (term) => {
    setLoading(true);
    try {
      const data = await buscarEstudiantesCobranzas(term);
      if (data.success) {
        setResults(data.estudiantes);
        setShowDropdown(true);
      }
    } catch (error) {
      console.error('Error en búsqueda:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (student) => {
    onSelectStudent(student);
    setSearchTerm('');
    setShowDropdown(false);
  };

  const clearSearch = () => {
    setSearchTerm('');
    setResults([]);
    setShowDropdown(false);
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <FiSearch className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          className="block w-full pl-10 pr-10 py-4 border border-gray-300 rounded-xl leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-[#27A9E1] focus:border-[#27A9E1] sm:text-sm shadow-sm transition-shadow"
          placeholder="Buscar por código, cédula, nombre del estudiante o representante..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onClick={() => { if(results.length > 0) setShowDropdown(true) }}
        />
        {searchTerm && (
          <button 
            onClick={clearSearch}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
          >
            <FiX className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Dropdown de resultados */}
      {showDropdown && (
        <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-96 rounded-xl py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm border border-gray-100">
          {loading ? (
            <div className="flex justify-center items-center p-4 text-gray-500">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#27A9E1]"></div>
              <span className="ml-3">Buscando...</span>
            </div>
          ) : results.length > 0 ? (
            <ul className="divide-y divide-gray-100">
              {results.map((student) => (
                <li
                  key={student.id_estudiante}
                  className="cursor-pointer select-none relative py-3 pl-3 pr-9 hover:bg-blue-50 transition-colors"
                  onClick={() => handleSelect(student)}
                >
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-[#27A9E1]">
                      <FiUser className="h-5 w-5" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-bold text-gray-900">
                        {student.apellidos} {student.nombres}
                        <span className="ml-2 text-xs font-normal text-gray-500 px-2 py-0.5 bg-gray-100 rounded-full">
                          {student.codigo}
                        </span>
                      </p>
                      <div className="flex text-xs text-gray-500 mt-1 gap-3">
                        <span>CI: {student.cedula}</span>
                        <span>•</span>
                        <span>{student.curso_nombre || 'Sin curso'} {student.paralelo ? `"${student.paralelo}"` : ''}</span>
                        <span>•</span>
                        <span>Rep: {student.rep_nombres} {student.rep_apellidos}</span>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-4 text-center text-gray-500">
              No se encontraron estudiantes con ese criterio.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StudentSearchPayment;
