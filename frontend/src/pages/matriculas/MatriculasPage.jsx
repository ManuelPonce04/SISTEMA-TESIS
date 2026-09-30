import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../../components/layout/MainLayout';
import MatriculaFilters from '../../components/matriculas/MatriculaFilters';
import MatriculaTable from '../../components/matriculas/MatriculaTable';
import Button from '../../components/ui/Button';
import { FiPlus, FiDownload } from 'react-icons/fi';
import { getMatriculas } from '../../services/matriculasService';
import Swal from 'sweetalert2';

const MatriculasPage = () => {
  const navigate = useNavigate();
  const [matriculas, setMatriculas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState({
    search: '',
    anio_lectivo: '2026-2027',
    curso: 'Todos',
    estado: 'Todos'
  });

  const fetchMatriculas = async () => {
    setLoading(true);
    try {
      const res = await getMatriculas(filtros);
      if (res.success) {
        setMatriculas(res.matriculas);
      }
    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'No se pudieron cargar las matrículas', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatriculas();
  }, []); // Carga inicial

  const handleApplyFilters = () => {
    fetchMatriculas();
  };

  const handleClearFilters = () => {
    setFiltros({ search: '', anio_lectivo: 'Todos', curso: 'Todos', estado: 'Todos' });
    // setTimeout(() => fetchMatriculas(), 0); // Opcional auto-refresh
  };

  return (
    <MainLayout title="Gestión de Matrículas" subtitle="Inicio / Matrículas">
      
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Gestión de Matrículas</h1>
          <p className="text-sm text-gray-500 mt-1">Administra la inscripción académica de los estudiantes por año lectivo, curso y paralelo.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" icon={FiDownload} className="text-sm py-2 bg-white">Exportar Excel</Button>
          <Button variant="secondary" icon={FiDownload} className="text-sm py-2 bg-white">Exportar PDF</Button>
          <Button 
            variant="primary" 
            icon={FiPlus} 
            className="text-sm py-2 px-5 bg-gradient-to-r from-[#F4C542] to-[#f5b611] text-gray-900 border-none shadow-[0_4px_14px_rgba(244,197,66,0.4)] hover:shadow-[0_6px_20px_rgba(244,197,66,0.6)]"
            onClick={() => navigate('/matriculas/nueva')}
          >
            Nueva Matrícula
          </Button>
        </div>
      </div>

      <MatriculaFilters 
        filtros={filtros} 
        setFiltros={setFiltros} 
        onApply={handleApplyFilters}
        onClear={handleClearFilters}
      />

      <MatriculaTable matriculas={matriculas} loading={loading} />

    </MainLayout>
  );
};

export default MatriculasPage;
