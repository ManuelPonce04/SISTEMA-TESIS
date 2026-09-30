import React, { useState, useEffect, useCallback } from 'react';
import MainLayout from '../../components/layout/MainLayout';
import { useAuth } from '../../context/AuthContext';
import personalService from '../../services/personalService';
import PersonalFormModal from '../../components/financiero/personal/PersonalFormModal';
import PersonalDetailDrawer from '../../components/financiero/personal/PersonalDetailDrawer';
import CambiarSueldoModal from '../../components/financiero/personal/CambiarSueldoModal';
import Badge from '../../components/ui/Badge';
import Swal from 'sweetalert2';
import {
  FiPlus, FiSearch, FiFilter, FiEdit2, FiEye, FiDownload,
  FiChevronLeft, FiChevronRight, FiX, FiArrowUp, FiArrowDown,
  FiUsers, FiBriefcase, FiAward, FiBook, FiShield,
  FiRefreshCw, FiDollarSign, FiUserX
} from 'react-icons/fi';

// ── Skeleton Loaders ──
const SkeletonCard = () => (
  <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 animate-pulse">
    <div className="flex items-center justify-between mb-4">
      <div className="w-10 h-10 rounded-xl bg-gray-200"></div>
    </div>
    <div className="w-24 h-6 bg-gray-200 rounded-md mb-2"></div>
    <div className="w-32 h-4 bg-gray-200 rounded-md"></div>
  </div>
);

const SkeletonRow = () => (
  <tr className="animate-pulse">
    {[...Array(8)].map((_, i) => (
      <td key={i} className="px-4 py-4">
        <div className="h-4 bg-gray-200 rounded-lg w-full" />
      </td>
    ))}
  </tr>
);

// ── Tarjeta Resumen ──
const SummaryCard = ({ title, amount, icon: Icon, color }) => (
  <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 relative overflow-hidden group">
    <div className={`absolute top-0 right-0 w-24 h-24 bg-${color}-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110`}></div>
    <div className="flex items-center justify-between mb-2 relative z-10">
      <div className={`w-10 h-10 rounded-xl bg-${color}-100 text-${color}-600 flex items-center justify-center`}>
        <Icon size={20} />
      </div>
    </div>
    <div className="relative z-10">
      <h4 className="text-gray-500 text-sm font-medium mb-1">{title}</h4>
      <p className="text-2xl font-bold text-gray-800">{amount}</p>
    </div>
  </div>
);

const PersonalPage = () => {
  const { usuario } = useAuth();
  const isAdmin = usuario?.es_admin === true || usuario?.es_admin === 1;

  const [personal, setPersonal] = useState([]);
  const [resumen, setResumen] = useState({ total_activos: 0, total_planta: 0, total_servicios: 0, total_docentes: 0, total_admin: 0 });
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 15, totalPages: 0 });
  
  // Catálogos para filtros
  const [catalogos, setCatalogos] = useState({ contratos: [], funciones: [], cargos: [] });

  // Filtros y Búsqueda
  const [search, setSearch] = useState('');
  const [filtros, setFiltros] = useState({
    estado: 'ACTIVO', tipo_contrato_id: '', funcion_id: '', cargo_id: '', 
    con_sueldo: '', sin_cedula: ''
  });
  const [sortBy, setSortBy] = useState('apellidos');
  const [sortOrder, setSortOrder] = useState('ASC');
  const [showFilters, setShowFilters] = useState(false);

  // Modales
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState('create');
  const [selectedItem, setSelectedItem] = useState(null);
  
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailId, setDetailId] = useState(null);

  const [isSueldoOpen, setIsSueldoOpen] = useState(false);

  // ── Inicialización ──
  useEffect(() => {
    loadCatalogos();
  }, []);

  const loadCatalogos = async () => {
    try {
      const [resC, resF, resCargo] = await Promise.all([
        personalService.getTiposContrato(),
        personalService.getFunciones(),
        personalService.getCargos()
      ]);
      setCatalogos({
        contratos: resC.success ? resC.data : [],
        funciones: resF.success ? resF.data : [],
        cargos: resCargo.success ? resCargo.data : []
      });
    } catch (error) {
      console.error('Error al cargar catálogos:', error);
    }
  };

  const fetchPersonal = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: pagination.limit, search, sort_by: sortBy, sort_order: sortOrder, ...filtros };
      const res = await personalService.getAll(params);
      if (res.success) {
        setPersonal(res.data);
        setPagination(res.pagination);
        setResumen(res.resumen || { total_activos: 0, total_planta: 0, total_servicios: 0, total_docentes: 0, total_admin: 0 });
      }
    } catch (error) {
      Swal.fire('Error', 'No se pudo cargar el listado de personal.', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, sortBy, sortOrder, pagination.limit, filtros]);

  useEffect(() => {
    const timer = setTimeout(() => fetchPersonal(1), 400);
    return () => clearTimeout(timer);
  }, [fetchPersonal]);

  // ── Acciones UI ──
  const handleSort = (column) => {
    if (sortBy === column) setSortOrder(prev => prev === 'ASC' ? 'DESC' : 'ASC');
    else { setSortBy(column); setSortOrder('ASC'); }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFiltros(prev => ({ ...prev, [name]: value }));
  };

  const clearFilters = () => {
    setSearch('');
    setFiltros({ estado: 'ACTIVO', tipo_contrato_id: '', funcion_id: '', cargo_id: '', con_sueldo: '', sin_cedula: '' });
  };

  const hasActiveFilters = search || Object.entries(filtros).some(([k, v]) => v !== '' && k !== 'estado') || filtros.estado !== 'ACTIVO';

  const openCreate = () => {
    setFormMode('create');
    setSelectedItem(null);
    setIsFormOpen(true);
  };

  const openEdit = (item) => {
    setFormMode('edit');
    setSelectedItem(item);
    setIsFormOpen(true);
  };

  const openDetail = (id) => {
    setDetailId(id);
    setIsDetailOpen(true);
  };

  const openCambiarSueldo = (item) => {
    setSelectedItem(item);
    setIsSueldoOpen(true);
  };

  const handleDesactivar = async (item) => {
    const { value: formValues } = await Swal.fire({
      title: 'Desactivar Personal',
      html: `
        <div class="text-left mt-2 space-y-3">
          <p class="text-sm text-gray-600">Está a punto de desactivar a <strong>${item.nombre_completo}</strong>.</p>
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">Fecha de salida <span class="text-red-500">*</span></label>
            <input type="date" id="swal-fecha" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" value="${new Date().toISOString().split('T')[0]}">
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">Motivo <span class="text-red-500">*</span></label>
            <input type="text" id="swal-motivo" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Renuncia, terminación de contrato...">
          </div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Sí, Desactivar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#EF4444',
      preConfirm: () => {
        const fecha = document.getElementById('swal-fecha').value;
        const motivo = document.getElementById('swal-motivo').value;
        if (!fecha || !motivo) {
          Swal.showValidationMessage('Ambos campos son obligatorios');
          return false;
        }
        return { fecha_salida: fecha, motivo };
      }
    });

    if (formValues) {
      try {
        const res = await personalService.cambiarEstado(item.id, { estado: 'INACTIVO', ...formValues });
        if (res.success) {
          Swal.fire({ icon: 'success', title: 'Personal Desactivado', timer: 2000, showConfirmButton: false, toast: true, position: 'top-end' });
          fetchPersonal(pagination.page);
        }
      } catch (error) {
        Swal.fire('Error', error.response?.data?.message || 'Error al desactivar', 'error');
      }
    }
  };

  const ofuscarCedula = (cedula) => {
    if (!cedula) return '—';
    return cedula.substring(0, 2) + '******' + cedula.substring(8);
  };

  const SortIcon = ({ column }) => {
    if (sortBy !== column) return <FiArrowDown size={12} className="text-gray-300 ml-1 opacity-0 group-hover:opacity-100" />;
    return sortOrder === 'ASC'
      ? <FiArrowUp size={12} className="text-[#27A9E1] ml-1" />
      : <FiArrowDown size={12} className="text-[#27A9E1] ml-1" />;
  };

  return (
    <MainLayout title="Personal Institucional" subtitle="Gestión de Personal Institucional">
      
      {/* ── Resumen ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        {loading && personal.length === 0 ? (
          [...Array(5)].map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <SummaryCard title="Total Activos" amount={resumen.total_activos} icon={FiUsers} color="blue" />
            <SummaryCard title="De Planta" amount={resumen.total_planta} icon={FiShield} color="green" />
            <SummaryCard title="Serv. Prestados" amount={resumen.total_servicios} icon={FiBriefcase} color="amber" />
            <SummaryCard title="Docentes" amount={resumen.total_docentes} icon={FiBook} color="indigo" />
            <SummaryCard title="Administrativos" amount={resumen.total_admin} icon={FiAward} color="rose" />
          </>
        )}
      </div>

      <div className="space-y-4 animate-fade-in">
        {/* ── Barra de Acciones y Filtros ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            
            <div className="flex-1 w-full lg:max-w-md relative">
              <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Buscar por nombre, código o cédula..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#27A9E1]/30 focus:border-[#27A9E1]"
              />
            </div>

            <div className="flex gap-2 flex-wrap w-full lg:w-auto">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                  showFilters || hasActiveFilters ? 'bg-[#27A9E1]/10 border-[#27A9E1]/30 text-[#27A9E1]' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                <FiFilter size={16} /> Filtros {hasActiveFilters && <span className="w-2 h-2 bg-[#27A9E1] rounded-full" />}
              </button>
              
              <button
                onClick={() => fetchPersonal(1)}
                className="inline-flex items-center justify-center p-2.5 bg-white border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50"
                title="Actualizar"
              >
                <FiRefreshCw size={18} className={loading ? 'animate-spin text-[#27A9E1]' : ''} />
              </button>

              {isAdmin && (
                <button
                  onClick={openCreate}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#27A9E1] text-white rounded-xl text-sm font-medium hover:bg-[#1E8BBF] shadow-md shadow-[#27A9E1]/20"
                >
                  <FiPlus size={16} /> Nuevo
                </button>
              )}
            </div>
          </div>

          {/* Panel de Filtros */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 animate-fade-in">
              <select name="estado" value={filtros.estado} onChange={handleFilterChange} className="px-3 py-2 bg-gray-50 border rounded-xl text-sm">
                <option value="">Todos los estados</option>
                <option value="ACTIVO">Activos</option>
                <option value="INACTIVO">Inactivos</option>
              </select>

              <select name="tipo_contrato_id" value={filtros.tipo_contrato_id} onChange={handleFilterChange} className="px-3 py-2 bg-gray-50 border rounded-xl text-sm">
                <option value="">Todos los contratos</option>
                {catalogos.contratos.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>

              <select name="funcion_id" value={filtros.funcion_id} onChange={handleFilterChange} className="px-3 py-2 bg-gray-50 border rounded-xl text-sm">
                <option value="">Todas las funciones</option>
                {catalogos.funciones.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}
              </select>

              <select name="cargo_id" value={filtros.cargo_id} onChange={handleFilterChange} className="px-3 py-2 bg-gray-50 border rounded-xl text-sm">
                <option value="">Todos los cargos</option>
                {catalogos.cargos.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>

              <select name="con_sueldo" value={filtros.con_sueldo} onChange={handleFilterChange} className="px-3 py-2 bg-gray-50 border rounded-xl text-sm">
                <option value="">Cualquier sueldo</option>
                <option value="true">Con sueldo configurado ({'>'} 0)</option>
              </select>

              {hasActiveFilters && (
                <div className="col-span-full flex justify-end">
                  <button onClick={clearFilters} className="text-sm text-[#27A9E1] hover:underline flex items-center gap-1">
                    <FiX size={14} /> Limpiar filtros
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Tabla ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="bg-gray-50/80 text-gray-500 font-medium text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3.5 cursor-pointer hover:text-[#27A9E1] group" onClick={() => handleSort('codigo_interno')}>
                    <span className="flex items-center">Código <SortIcon column="codigo_interno" /></span>
                  </th>
                  <th className="px-4 py-3.5">Cédula</th>
                  <th className="px-4 py-3.5 cursor-pointer hover:text-[#27A9E1] group" onClick={() => handleSort('apellidos')}>
                    <span className="flex items-center">Apellidos y Nombres <SortIcon column="apellidos" /></span>
                  </th>
                  <th className="px-4 py-3.5">Contrato</th>
                  <th className="px-4 py-3.5">Cargo / Función</th>
                  <th className="px-4 py-3.5 cursor-pointer hover:text-[#27A9E1] group text-right" onClick={() => handleSort('sueldo')}>
                    <span className="flex items-center justify-end">Sueldo Actual <SortIcon column="sueldo" /></span>
                  </th>
                  <th className="px-4 py-3.5 text-center">Estado</th>
                  <th className="px-4 py-3.5 text-right sticky right-0 bg-gray-50/90 backdrop-blur z-10">Acciones</th>
                </tr>
              </thead>
              
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  [...Array(10)].map((_, i) => <SkeletonRow key={i} />)
                ) : personal.length === 0 ? (
                  <tr>
                    <td colSpan="8">
                      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                        <FiUsers size={36} className="text-gray-300 mb-4" />
                        <p className="text-lg font-semibold text-gray-500">No se encontró personal</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  personal.map((item) => {
                    const isActivo = item.estado === 'ACTIVO';
                    return (
                      <tr key={item.id} className={`hover:bg-gray-50/50 transition-colors group ${!isActivo ? 'bg-gray-50/30' : ''}`}>
                        
                        <td className="px-4 py-3 font-mono text-gray-500">
                          {item.codigo_interno}
                        </td>
                        
                        <td className="px-4 py-3">
                          {item.cedula ? (
                            <span className="text-gray-600 font-mono tracking-wider">{ofuscarCedula(item.cedula)}</span>
                          ) : (
                            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded">Pendiente</span>
                          )}
                        </td>
                        
                        <td className="px-4 py-3">
                          <span className={`block font-medium ${!isActivo ? 'text-gray-500' : 'text-gray-800'}`}>
                            {item.nombre_completo}
                          </span>
                          <span className="text-[10px] text-gray-400">{item.correo || 'Sin correo'}</span>
                        </td>
                        
                        <td className="px-4 py-3 text-gray-600">
                          <Badge variant={item.contrato_codigo === 'PL' ? 'green' : 'amber'}>
                            {item.contrato_nombre}
                          </Badge>
                        </td>
                        
                        <td className="px-4 py-3">
                          <span className="block text-gray-800">{item.cargo_nombre || '—'}</span>
                          <span className="block text-xs text-gray-500">{item.funcion_nombre || '—'}</span>
                        </td>
                        
                        <td className="px-4 py-3 text-right">
                          <span className={`font-mono font-medium ${parseFloat(item.sueldo_actual) > 0 ? 'text-green-600' : 'text-amber-500'}`}>
                            ${parseFloat(item.sueldo_actual).toFixed(2)}
                          </span>
                        </td>
                        
                        <td className="px-4 py-3 text-center">
                          <Badge variant={isActivo ? 'green' : 'gray'}>{item.estado}</Badge>
                        </td>
                        
                        <td className="px-4 py-3 text-right sticky right-0 bg-white group-hover:bg-gray-50/90 transition-colors z-10">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => openDetail(item.id)}
                              className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg"
                              title="Ver detalles"
                            >
                              <FiEye size={16} />
                            </button>
                            
                            {isAdmin && isActivo && (
                              <>
                                <button
                                  onClick={() => openCambiarSueldo(item)}
                                  className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg"
                                  title="Cambiar Sueldo"
                                >
                                  <FiDollarSign size={16} />
                                </button>
                                <button
                                  onClick={() => openEdit(item)}
                                  className="p-2 text-gray-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg"
                                  title="Editar"
                                >
                                  <FiEdit2 size={16} />
                                </button>
                                <button
                                  onClick={() => handleDesactivar(item)}
                                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                                  title="Desactivar"
                                >
                                  <FiUserX size={16} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>

                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {!loading && pagination.totalPages > 1 && (
            <div className="px-5 py-3.5 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
              <p className="text-xs text-gray-500">
                Mostrando {((pagination.page - 1) * pagination.limit) + 1} a {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total}
              </p>
              <div className="flex gap-1">
                <button
                  onClick={() => fetchPersonal(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="p-2 rounded-lg text-gray-500 hover:bg-gray-200 disabled:opacity-40"
                ><FiChevronLeft size={16} /></button>
                <button
                  onClick={() => fetchPersonal(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                  className="p-2 rounded-lg text-gray-500 hover:bg-gray-200 disabled:opacity-40"
                ><FiChevronRight size={16} /></button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modales */}
      <PersonalFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={() => fetchPersonal(pagination.page)}
        mode={formMode}
        data={selectedItem}
        catalogos={catalogos}
      />

      <CambiarSueldoModal
        isOpen={isSueldoOpen}
        onClose={() => setIsSueldoOpen(false)}
        onSuccess={() => fetchPersonal(pagination.page)}
        personal={selectedItem}
      />

      <PersonalDetailDrawer
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        personalId={detailId}
      />

    </MainLayout>
  );
};

export default PersonalPage;
