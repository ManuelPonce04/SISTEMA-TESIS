import React, { useState, useEffect } from 'react';
import { FiPlus, FiDownload, FiPrinter, FiSearch, FiRefreshCw } from 'react-icons/fi';
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEstudiantes } from '../hooks/useEstudiantes';
import { Estudiante, StudentFiltersType } from '../types/estudiante';
import EstudianteFilters from '../components/estudiantes/EstudianteFilters';
import EstudianteTable from '../components/estudiantes/EstudianteTable';
import EstudianteFormModal from '../components/estudiantes/EstudianteFormModal';
import MainLayout from '../components/layout/MainLayout';
import Card from '../components/ui/Card';

const FILTROS_ESTUDIANTES_DEFAULT: StudentFiltersType = {
  estado: 'Todos',
  page: 1,
  limit: 10,
  sortBy: 'Fecha',
  order: 'DESC'
};

export const EstudiantesPage: React.FC = () => {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  
  const {
    estudiantes,
    historico,
    cursos,
    loading,
    totalRecords,
    fetchEstudiantes,
    fetchCursos,
    fetchHistorico,
    createEstudiante,
    updateEstudiante,
    deleteEstudiante
  } = useEstudiantes();

  // Estados locales
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<StudentFiltersType>(FILTROS_ESTUDIANTES_DEFAULT);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Estudiante | null>(null);

  // Cargar cursos e histórico al montar
  useEffect(() => {
    fetchCursos();
    fetchHistorico();
  }, [fetchCursos, fetchHistorico]);

  // Cargar estudiantes cuando cambian los filtros
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchEstudiantes({ ...filters, query: searchQuery });
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [filters, searchQuery, fetchEstudiantes]);

  // Manejadores
  const handleOpenAddModal = () => {
    setEditingStudent(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (student: Estudiante) => {
    setEditingStudent(student);
    setIsModalOpen(true);
  };

  const handleViewDetails = (student: Estudiante) => {
    navigate(`/estudiantes/detalle/${student.id_estudiante}`);
  };

  const handleDeleteStudent = (id: number) => {
    Swal.fire({
      title: '¿Marcar como Inactivo?',
      text: 'El estudiante no será eliminado físicamente del sistema.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#EF4444',
      cancelButtonColor: '#94A3B8',
      confirmButtonText: 'Sí, dar de baja',
      cancelButtonText: 'Cancelar'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await deleteEstudiante(id);
          Swal.fire('Actualizado', 'El estudiante ha sido marcado como INACTIVO.', 'success');
          fetchEstudiantes({ ...filters, query: searchQuery });
        } catch (e: any) {
          if (e.response?.status === 403) {
            Swal.fire('Permiso denegado', 'Solo usuarios con rol Administrador pueden realizar esta acción.', 'error');
          } else {
            Swal.fire('Error', 'No se pudo desactivar el registro.', 'error');
          }
        }
      }
    });
  };

  // Exportar a CSV
  const handleExportCSV = () => {
    if (estudiantes.length === 0) return;
    const headers = ['Código', 'Cédula', 'Estudiante', 'Fecha Nacimiento', 'Contacto Rep.', 'Teléfono Rep.', 'Estado'];
    const rows = estudiantes.map(est => [
      est.codigo,
      est.cedula || 'N/A',
      est.apellidos_nombres,
      est.fecha_nacimiento ? new Date(est.fecha_nacimiento).toLocaleDateString() : 'N/A',
      est.representante_nombre || 'N/A',
      est.representante_telefono || 'N/A',
      est.estado
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Listado_Estudiantes_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const totalPages = Math.ceil(totalRecords / filters.limit);

  return (
    <MainLayout title="Directorio de Estudiantes" subtitle="Dashboard / Estudiantes">
      <div className="flex flex-col gap-6 animate-fade-in w-full">
        {/* Cabecera de Página */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 leading-tight">Registro de Estudiantes</h2>
            <p className="text-sm text-gray-500 mt-1">
              Administración de la información personal de estudiantes y sus representantes.
            </p>
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleExportCSV}
              disabled={estudiantes.length === 0}
              className="flex items-center justify-center gap-1.5 px-4 py-2 border border-gray-200 text-gray-600 bg-white text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-40"
              title="Exportar registros filtrados a Excel/CSV"
            >
              <FiDownload size={15} />
              Exportar
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center justify-center gap-1.5 px-4 py-2 border border-gray-200 text-gray-600 bg-white text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors"
              title="Imprimir Listado"
            >
              <FiPrinter size={15} />
              Imprimir
            </button>
            <button
              onClick={handleOpenAddModal}
              className="flex items-center justify-center gap-1.5 px-5 py-2 bg-[#00AEEF] hover:bg-[#0080b8] text-white text-sm font-semibold rounded-xl shadow-md hover:shadow-lg transition-all ml-auto sm:ml-0"
              title="Registrar nuevo estudiante"
            >
              <FiPlus size={16} />
              Registrar
            </button>
          </div>
        </div>

        {/* Barra de Filtros Avanzada */}
        <Card className="flex flex-col gap-4">
          {/* Barra de Búsqueda */}
          <div className="flex flex-col md:flex-row gap-4 items-stretch">
            <div className="relative flex-1">
              <FiSearch className="absolute left-3.5 top-3 text-gray-400" size={18} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por código, cédula, nombres del estudiante o del representante..."
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#27A9E1] focus:bg-white transition-all outline-none"
              />
            </div>
            
            <button
              onClick={() => fetchEstudiantes({ ...filters, query: searchQuery })}
              disabled={loading}
              className="px-4 py-2.5 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-xl transition-colors text-sm font-semibold flex items-center justify-center gap-1.5"
            >
              <FiRefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              Recargar
            </button>
          </div>

          <div className="h-px bg-gray-100" />

          {/* Filtros Dropdown */}
          <EstudianteFilters
            filters={filters}
            setFilters={setFilters}
            cursos={cursos}
          />
        </Card>

        {/* Listado de Estudiantes */}
        <Card noPadding className="flex flex-col overflow-hidden min-h-[350px]">
          {loading ? (
            <div className="p-10 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="animate-pulse flex items-center gap-4 border-b border-gray-50 pb-4">
                  <div className="w-16 h-7 bg-gray-100 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-100 rounded-full w-2/3" />
                    <div className="h-3 bg-gray-100 rounded-full w-1/3" />
                  </div>
                  <div className="w-24 h-5 bg-gray-100 rounded-full" />
                  <div className="w-16 h-8 bg-gray-100 rounded-lg" />
                </div>
              ))}
            </div>
          ) : estudiantes.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-16 text-center">
              <div className="w-20 h-20 bg-sky-50 rounded-2xl flex items-center justify-center mb-4 border border-sky-100">
                <span className="text-3xl">📂</span>
              </div>
              <h3 className="text-lg font-bold text-gray-800">No se encontraron estudiantes</h3>
              <p className="text-gray-400 text-sm max-w-md mt-1 mb-4">
                No existen registros que coincidan con la búsqueda o filtros aplicados actualmente.
              </p>
              <button
                onClick={handleOpenAddModal}
                className="px-4 py-2 bg-[#00AEEF] hover:bg-[#0080b8] text-white text-xs font-bold rounded-xl transition-all shadow-sm hover:shadow"
              >
                Registrar Estudiante
              </button>
            </div>
          ) : (
            <EstudianteTable
              data={estudiantes}
              onEdit={handleOpenEditModal}
              onDelete={handleDeleteStudent}
              onView={handleViewDetails}
              currentUser={usuario}
            />
          )}

          {/* Paginación */}
          {!loading && totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="text-xs text-gray-500">
                Mostrando registros {(filters.page - 1) * filters.limit + 1} a {Math.min(filters.page * filters.limit, totalRecords)} de {totalRecords}
              </div>
              <div className="flex gap-2 items-center">
                <select
                  value={filters.limit}
                  onChange={(e) => setFilters(prev => ({ ...prev, limit: Number(e.target.value), page: 1 }))}
                  className="bg-white border text-gray-700 text-xs rounded-lg p-1.5 outline-none cursor-pointer"
                >
                  <option value={10}>10 por página</option>
                  <option value={25}>25 por página</option>
                  <option value={50}>50 por página</option>
                </select>

                <div className="flex gap-1">
                  <button
                    disabled={filters.page === 1}
                    onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
                    className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 disabled:opacity-40 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-[#00AEEF]"
                  >
                    Anterior
                  </button>
                  <span className="px-3 py-1.5 text-xs font-bold text-gray-700 select-none">
                    {filters.page} / {totalPages}
                  </span>
                  <button
                    disabled={filters.page >= totalPages}
                    onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
                    className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 disabled:opacity-40 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-[#00AEEF]"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Modal de Creación / Edición */}
      <EstudianteFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmitSuccess={() => fetchEstudiantes({ ...filters, query: searchQuery })}
        studentToEdit={editingStudent}
        createEstudiante={createEstudiante}
        updateEstudiante={updateEstudiante}
      />
    </MainLayout>
  );
};

export default EstudiantesPage;
