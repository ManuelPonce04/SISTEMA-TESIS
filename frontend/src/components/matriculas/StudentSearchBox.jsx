import React, { useState } from 'react';
import Card from '../ui/Card';
import { FiSearch, FiUser, FiCheckCircle } from 'react-icons/fi';
import api from '../../services/authService';

const StudentSearchBox = ({ onSelectStudent, selectedStudent }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (e) => {
    const term = e.target.value;
    setSearchTerm(term);
    
    if (term.length > 2) {
      setIsSearching(true);
      try {
        const response = await api.get(`/estudiantes?search=${term}`);
        if (response.data.success) {
          setResults(response.data.data || []);
        }
      } catch (error) {
        console.error('Error buscando estudiantes', error);
      } finally {
        setIsSearching(false);
      }
    } else {
      setResults([]);
    }
  };

  if (selectedStudent) {
    return (
      <Card className="border-l-4 border-l-[#22C55E] bg-green-50/30">
        <div className="flex items-start gap-4">
          <div className="bg-[#22C55E] text-white p-3 rounded-full">
            <FiCheckCircle size={24} />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-gray-800 text-lg">
              {selectedStudent.nombres} {selectedStudent.apellidos}
            </h3>
            <div className="text-sm text-gray-500 mt-1 grid grid-cols-2 gap-2">
              <p><strong>Cédula:</strong> {selectedStudent.cedula}</p>
              <p><strong>Código:</strong> {selectedStudent.codigo}</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={() => onSelectStudent(null)}
            className="text-sm text-red-500 hover:text-red-700 underline"
          >
            Cambiar Estudiante
          </button>
        </div>
      </Card>
    );
  }

  return (
    <Card title="1. Seleccionar Estudiante">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
          <FiSearch />
        </div>
        <input 
          type="text" 
          placeholder="Buscar por cédula, nombres o apellidos..." 
          className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-[#27A9E1] focus:ring-1 focus:ring-[#27A9E1]"
          value={searchTerm}
          onChange={handleSearch}
        />
        {isSearching && <span className="absolute right-3 top-3 text-xs text-gray-400">Buscando...</span>}
      </div>

      {results.length > 0 && (
        <div className="mt-2 border border-gray-100 rounded-lg max-h-60 overflow-y-auto shadow-sm">
          {results.map(est => (
            <div 
              key={est.id_estudiante} 
              className="p-3 hover:bg-blue-50 border-b border-gray-50 cursor-pointer flex items-center gap-3 transition-colors"
              onClick={() => {
                onSelectStudent(est);
                setSearchTerm('');
                setResults([]);
              }}
            >
              <div className="bg-gray-100 p-2 rounded-full text-gray-500">
                <FiUser />
              </div>
              <div>
                <p className="font-semibold text-gray-800 text-sm">{est.nombres} {est.apellidos}</p>
                <p className="text-xs text-gray-500">CI: {est.cedula}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

export default StudentSearchBox;
