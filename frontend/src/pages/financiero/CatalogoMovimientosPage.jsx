import React, { useState, useEffect, useCallback } from 'react';
import MainLayout from '../../components/layout/MainLayout';
import { useAuth } from '../../context/AuthContext';
import catalogoMovimientosService from '../../services/catalogoMovimientosService';
import Badge from '../../components/ui/Badge';
import Swal from 'sweetalert2';
import {
  FiPlus, FiSearch, FiFilter, FiEdit2, FiEye, FiToggleLeft, FiToggleRight,
  FiChevronLeft, FiChevronRight, FiX, FiArrowUp, FiArrowDown, FiHash,
  FiTag, FiCalendar, FiUsers, FiList, FiAlertCircle
} from 'react-icons/fi';

// ── Skeleton Loader ──────────────────────────────────────────
const SkeletonRow = () => (
  <tr className="animate-pulse">
    {[...Array(7)].map((_, i) => (
      <td key={i} className="px-5 py-4">
        <div className="h-4 bg-gray-200 rounded-lg w-full" />
      </td>
    ))}
  </tr>
);

// ── Estado vacío ─────────────────────────────────────────────
const EmptyState = ({ hasFilters }) => (
  <div className="flex flex-col items-center justify-center py-16 text-gray-400">
    <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
      <FiList size={36} className="text-gray-300" />
    </div>
    <p className="text-lg font-semibold text-gray-500">
      {hasFilters ? 'No se encontraron resultados' : 'No hay conceptos registrados'}
    </p>
    <p className="text-sm text-gray-400 mt-1">
      {hasFilters ? 'Intenta ajustar los filtros de búsqueda' : 'Crea el primer concepto financiero'}
    </p>
  </div>
);

const CatalogoMovimientosPage = () => {
  const { usuario } = useAuth();
  const isAdmin = usuario?.es_admin === true || usuario?.es_admin === 1;

  // ── Estado principal ─────────────────────────────────────
  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 15, totalPages: 0 });
  const [categorias, setCategorias] = useState([]);

  // ── Filtros ──────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [sortBy, setSortBy] = useState('orden');
  const [sortOrder, setSortOrder] = useState('ASC');
  const [showFilters, setShowFilters] = useState(false);

  // ── Modal ────────────────────────────────────────────────
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // create | edit | view
  const [formData, setFormData] = useState({
    codigo: '', nombre: '', tipo: 'INGRESO', categoria: '',
    requiere_mes: false, requiere_personal: false, orden: 0
  });
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  // ── Fetch data ───────────────────────────────────────────
  const fetchData = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const result = await catalogoMovimientosService.getAll({
        page, limit: pagination.limit, search, tipo: filtroTipo,
        categoria: filtroCategoria, activo: filtroEstado, sortBy, sortOrder,
      });
      if (result.success) {
        setMovimientos(result.data);
        setPagination(result.pagination);
        setCategorias(result.categorias || []);
      }
    } catch (error) {
      console.error('Error al cargar movimientos:', error);
      Swal.fire('Error', 'No se pudieron cargar los conceptos financieros.', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, filtroTipo, filtroCategoria, filtroEstado, sortBy, sortOrder, pagination.limit]);

  useEffect(() => {
    const timer = setTimeout(() => fetchData(1), 300);
    return () => clearTimeout(timer);
  }, [fetchData]);

  // ── Sorting ──────────────────────────────────────────────
  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(prev => prev === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortBy(column);
      setSortOrder('ASC');
    }
  };

  const SortIcon = ({ column }) => {
    if (sortBy !== column) return <FiArrowUp size={12} className="text-gray-300 ml-1" />;
    return sortOrder === 'ASC'
      ? <FiArrowUp size={12} className="text-[#27A9E1] ml-1" />
      : <FiArrowDown size={12} className="text-[#27A9E1] ml-1" />;
  };

  // ── Limpiar filtros ──────────────────────────────────────
  const clearFilters = () => {
    setSearch('');
    setFiltroTipo('');
    setFiltroCategoria('');
    setFiltroEstado('');
  };
  const hasFilters = search || filtroTipo || filtroCategoria || filtroEstado;

  // ── Modal handlers ───────────────────────────────────────
  const openCreate = () => {
    setModalMode('create');
    setFormData({ codigo: '', nombre: '', tipo: 'INGRESO', categoria: '', requiere_mes: false, requiere_personal: false, orden: 0 });
    setFormErrors({});
    setSelectedId(null);
    setShowModal(true);
  };

  const openEdit = (item) => {
    setModalMode('edit');
    setFormData({
      codigo: item.codigo, nombre: item.nombre, tipo: item.tipo,
      categoria: item.categoria, requiere_mes: !!item.requiere_mes,
      requiere_personal: !!item.requiere_personal, orden: item.orden || 0,
    });
    setFormErrors({});
    setSelectedId(item.id);
    setShowModal(true);
  };

  const openView = (item) => {
    setModalMode('view');
    setFormData({
      codigo: item.codigo, nombre: item.nombre, tipo: item.tipo,
      categoria: item.categoria, requiere_mes: !!item.requiere_mes,
      requiere_personal: !!item.requiere_personal, orden: item.orden || 0,
    });
    setFormErrors({});
    setSelectedId(item.id);
    setShowModal(true);
  };

  // ── Validación en tiempo real ────────────────────────────
  const validateField = (name, value) => {
    const errors = { ...formErrors };
    switch (name) {
      case 'codigo':
        if (!value.trim()) errors.codigo = 'El código es obligatorio.';
        else if (/\s/.test(value)) errors.codigo = 'No debe contener espacios.';
        else if (value !== value.toUpperCase()) errors.codigo = 'Debe estar en mayúsculas.';
        else delete errors.codigo;
        break;
      case 'nombre':
        if (!value.trim()) errors.nombre = 'El nombre es obligatorio.';
        else delete errors.nombre;
        break;
      case 'tipo':
        if (!value) errors.tipo = 'El tipo es obligatorio.';
        else delete errors.tipo;
        break;
      case 'categoria':
        if (!value.trim()) errors.categoria = 'La categoría es obligatoria.';
        else delete errors.categoria;
        break;
      case 'orden':
        if (value !== '' && isNaN(parseInt(value))) errors.orden = 'Debe ser un número.';
        else delete errors.orden;
        break;
      default:
        break;
    }
    setFormErrors(errors);
  };

  const handleFieldChange = (name, value) => {
    let processedValue = value;
    if (name === 'codigo') {
      processedValue = value.toUpperCase().replace(/\s/g, '');
    }
    setFormData(prev => ({ ...prev, [name]: processedValue }));
    validateField(name, processedValue);
  };

  // ── Submit form ──────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validar todos los campos
    const errors = {};
    if (!formData.codigo.trim()) errors.codigo = 'El código es obligatorio.';
    else if (/\s/.test(formData.codigo)) errors.codigo = 'No debe contener espacios.';
    else if (formData.codigo !== formData.codigo.toUpperCase()) errors.codigo = 'Debe estar en mayúsculas.';
    if (!formData.nombre.trim()) errors.nombre = 'El nombre es obligatorio.';
    if (!formData.tipo) errors.tipo = 'El tipo es obligatorio.';
    if (!formData.categoria.trim()) errors.categoria = 'La categoría es obligatoria.';
    if (formData.orden !== '' && isNaN(parseInt(formData.orden))) errors.orden = 'Debe ser un número.';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setSaving(true);
    try {
      let result;
      if (modalMode === 'create') {
        result = await catalogoMovimientosService.create(formData);
      } else {
        result = await catalogoMovimientosService.update(selectedId, formData);
      }

      if (result.success) {
        Swal.fire({
          icon: 'success',
          title: modalMode === 'create' ? 'Concepto creado' : 'Concepto actualizado',
          text: result.message,
          timer: 2000,
          showConfirmButton: false,
          toast: true,
          position: 'top-end',
        });
        setShowModal(false);
        fetchData(pagination.page);
      } else {
        Swal.fire('Error', result.message || 'Error al guardar.', 'error');
      }
    } catch (error) {
      const msg = error.response?.data?.message || 'Error de conexión.';
      Swal.fire('Error', msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── Toggle estado ────────────────────────────────────────
  const handleToggle = async (item) => {
    const action = item.activo ? 'desactivar' : 'activar';
    const result = await Swal.fire({
      title: `¿${item.activo ? 'Desactivar' : 'Activar'} concepto?`,
      html: `<p class="text-gray-600">Se ${action}á el concepto <strong>${item.codigo}</strong> — ${item.nombre}</p>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: item.activo ? '#EF4444' : '#27A9E1',
      cancelButtonColor: '#d1d5db',
      confirmButtonText: item.activo ? 'Sí, desactivar' : 'Sí, activar',
      cancelButtonText: 'Cancelar',
    });

    if (result.isConfirmed) {
      try {
        const res = await catalogoMovimientosService.toggleEstado(item.id);
        if (res.success) {
          Swal.fire({
            icon: 'success', title: res.message, timer: 2000,
            showConfirmButton: false, toast: true, position: 'top-end',
          });
          fetchData(pagination.page);
        }
      } catch (error) {
        Swal.fire('Error', 'No se pudo cambiar el estado.', 'error');
      }
    }
  };

  return (
    <MainLayout title="Catálogo de Movimientos" subtitle="Control Financiero / Movimientos">
      <div className="space-y-4 animate-fade-in">

        {/* ── Header con búsqueda y acciones ───────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="flex-1 w-full sm:w-auto">
              <div className="relative">
                <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  id="search-movimientos"
                  type="text"
                  placeholder="Buscar por código o nombre..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full sm:w-80 pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#27A9E1]/30 focus:border-[#27A9E1] transition-all"
                />
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                id="btn-toggle-filters"
                onClick={() => setShowFilters(!showFilters)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                  showFilters || hasFilters
                    ? 'bg-[#27A9E1]/10 border-[#27A9E1]/30 text-[#27A9E1]'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                <FiFilter size={16} />
                Filtros
                {hasFilters && (
                  <span className="w-2 h-2 bg-[#27A9E1] rounded-full" />
                )}
              </button>
              {isAdmin && (
                <button
                  id="btn-create-movimiento"
                  onClick={openCreate}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#27A9E1] text-white rounded-xl text-sm font-medium hover:bg-[#1E8BBF] hover:shadow-lg hover:shadow-[#27A9E1]/20 transition-all"
                >
                  <FiPlus size={16} />
                  Nuevo Concepto
                </button>
              )}
            </div>
          </div>

          {/* ── Panel de filtros ─────────────────────────── */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-3 gap-3 animate-fade-in">
              <select
                id="filter-tipo"
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value)}
                className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#27A9E1]/30 focus:border-[#27A9E1]"
              >
                <option value="">Todos los tipos</option>
                <option value="INGRESO">Ingreso</option>
                <option value="EGRESO">Egreso</option>
              </select>
              <select
                id="filter-categoria"
                value={filtroCategoria}
                onChange={(e) => setFiltroCategoria(e.target.value)}
                className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#27A9E1]/30 focus:border-[#27A9E1]"
              >
                <option value="">Todas las categorías</option>
                {categorias.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
              <select
                id="filter-estado"
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#27A9E1]/30 focus:border-[#27A9E1]"
              >
                <option value="">Todos los estados</option>
                <option value="true">Activo</option>
                <option value="false">Inactivo</option>
              </select>
              {hasFilters && (
                <button
                  id="btn-clear-filters"
                  onClick={clearFilters}
                  className="text-sm text-[#27A9E1] hover:underline flex items-center gap-1"
                >
                  <FiX size={14} /> Limpiar filtros
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Tabla ────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50/80 text-gray-500 font-medium text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5 cursor-pointer select-none hover:text-[#27A9E1] transition-colors" onClick={() => handleSort('codigo')}>
                    <span className="flex items-center">Código <SortIcon column="codigo" /></span>
                  </th>
                  <th className="px-5 py-3.5 cursor-pointer select-none hover:text-[#27A9E1] transition-colors" onClick={() => handleSort('nombre')}>
                    <span className="flex items-center">Nombre <SortIcon column="nombre" /></span>
                  </th>
                  <th className="px-5 py-3.5 cursor-pointer select-none hover:text-[#27A9E1] transition-colors" onClick={() => handleSort('tipo')}>
                    <span className="flex items-center">Tipo <SortIcon column="tipo" /></span>
                  </th>
                  <th className="px-5 py-3.5 cursor-pointer select-none hover:text-[#27A9E1] transition-colors hidden lg:table-cell" onClick={() => handleSort('categoria')}>
                    <span className="flex items-center">Categoría <SortIcon column="categoria" /></span>
                  </th>
                  <th className="px-5 py-3.5 text-center hidden md:table-cell">Config.</th>
                  <th className="px-5 py-3.5 cursor-pointer select-none hover:text-[#27A9E1] transition-colors" onClick={() => handleSort('activo')}>
                    <span className="flex items-center">Estado <SortIcon column="activo" /></span>
                  </th>
                  <th className="px-5 py-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  [...Array(8)].map((_, i) => <SkeletonRow key={i} />)
                ) : movimientos.length === 0 ? (
                  <tr>
                    <td colSpan="7">
                      <EmptyState hasFilters={!!hasFilters} />
                    </td>
                  </tr>
                ) : (
                  movimientos.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-5 py-3.5">
                        <span className="font-mono text-xs font-bold text-[#27A9E1] bg-[#27A9E1]/8 px-2 py-1 rounded-md">
                          {item.codigo}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-medium text-gray-800 max-w-xs truncate" title={item.nombre}>
                        {item.nombre}
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge variant={item.tipo === 'INGRESO' ? 'green' : 'red'}>
                          {item.tipo}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5 text-gray-500 hidden lg:table-cell">
                        <span className="text-xs">{item.categoria}</span>
                      </td>
                      <td className="px-5 py-3.5 text-center hidden md:table-cell">
                        <div className="flex items-center justify-center gap-1.5">
                          {item.requiere_mes ? (
                            <span title="Requiere mes" className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                              <FiCalendar size={12} />
                            </span>
                          ) : null}
                          {item.requiere_personal ? (
                            <span title="Requiere personal" className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
                              <FiUsers size={12} />
                            </span>
                          ) : null}
                          {!item.requiere_mes && !item.requiere_personal && (
                            <span className="text-gray-300 text-xs">—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge variant={item.activo ? 'green' : 'gray'}>
                          {item.activo ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            id={`btn-view-${item.id}`}
                            onClick={() => openView(item)}
                            className="p-2 text-gray-400 hover:text-[#27A9E1] hover:bg-[#27A9E1]/10 rounded-lg transition-colors"
                            title="Ver detalles"
                          >
                            <FiEye size={16} />
                          </button>
                          {isAdmin && (
                            <>
                              <button
                                id={`btn-edit-${item.id}`}
                                onClick={() => openEdit(item)}
                                className="p-2 text-gray-400 hover:text-[#F4C542] hover:bg-[#F4C542]/10 rounded-lg transition-colors"
                                title="Editar"
                              >
                                <FiEdit2 size={16} />
                              </button>
                              <button
                                id={`btn-toggle-${item.id}`}
                                onClick={() => handleToggle(item)}
                                className={`p-2 rounded-lg transition-colors ${
                                  item.activo
                                    ? 'text-gray-400 hover:text-red-500 hover:bg-red-50'
                                    : 'text-gray-400 hover:text-green-500 hover:bg-green-50'
                                }`}
                                title={item.activo ? 'Desactivar' : 'Activar'}
                              >
                                {item.activo ? <FiToggleRight size={16} /> : <FiToggleLeft size={16} />}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* ── Paginación ────────────────────────────────── */}
          {!loading && pagination.totalPages > 1 && (
            <div className="px-5 py-3.5 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-gray-50/50">
              <p className="text-xs text-gray-500">
                Mostrando {((pagination.page - 1) * pagination.limit) + 1} a {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total} registros
              </p>
              <div className="flex items-center gap-1">
                <button
                  id="btn-prev-page"
                  onClick={() => fetchData(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="p-2 rounded-lg text-gray-500 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <FiChevronLeft size={16} />
                </button>
                {[...Array(pagination.totalPages)].map((_, i) => {
                  const pageNum = i + 1;
                  if (
                    pagination.totalPages <= 7 ||
                    pageNum === 1 ||
                    pageNum === pagination.totalPages ||
                    Math.abs(pageNum - pagination.page) <= 1
                  ) {
                    return (
                      <button
                        key={pageNum}
                        onClick={() => fetchData(pageNum)}
                        className={`min-w-[36px] h-9 rounded-lg text-sm font-medium transition-colors ${
                          pageNum === pagination.page
                            ? 'bg-[#27A9E1] text-white shadow-sm'
                            : 'text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  }
                  if (
                    pageNum === pagination.page - 2 ||
                    pageNum === pagination.page + 2
                  ) {
                    return <span key={pageNum} className="px-1 text-gray-400">…</span>;
                  }
                  return null;
                })}
                <button
                  id="btn-next-page"
                  onClick={() => fetchData(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                  className="p-2 rounded-lg text-gray-500 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <FiChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* ── Info total ────────────────────────────────── */}
          {!loading && pagination.totalPages <= 1 && pagination.total > 0 && (
            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50">
              <p className="text-xs text-gray-500">{pagination.total} registro(s) encontrado(s)</p>
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════ */}
      {/* ── Modal Crear / Editar / Ver ───────────────────── */}
      {/* ══════════════════════════════════════════════════════ */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-scale-in max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-gray-50 to-white">
              <div>
                <h3 className="font-bold text-gray-800 text-lg">
                  {modalMode === 'create' ? 'Nuevo Concepto' : modalMode === 'edit' ? 'Editar Concepto' : 'Detalle del Concepto'}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {modalMode === 'create' ? 'Registra un nuevo concepto financiero' : modalMode === 'edit' ? 'Modifica los datos del concepto' : 'Información completa del concepto'}
                </p>
              </div>
              <button
                id="btn-close-modal"
                onClick={() => setShowModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <FiX size={20} />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Código */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  <FiHash size={14} className="inline mr-1 text-gray-400" />Código <span className="text-red-400">*</span>
                </label>
                <input
                  id="input-codigo"
                  type="text"
                  maxLength={20}
                  value={formData.codigo}
                  onChange={(e) => handleFieldChange('codigo', e.target.value)}
                  disabled={modalMode === 'view'}
                  placeholder="Ej: MPINI2"
                  className={`w-full px-4 py-2.5 border rounded-xl text-sm font-mono uppercase focus:outline-none focus:ring-2 transition-all ${
                    formErrors.codigo ? 'border-red-300 focus:ring-red-200' : 'border-gray-200 focus:ring-[#27A9E1]/30 focus:border-[#27A9E1]'
                  } ${modalMode === 'view' ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'}`}
                />
                {formErrors.codigo && (
                  <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                    <FiAlertCircle size={12} /> {formErrors.codigo}
                  </p>
                )}
              </div>

              {/* Nombre */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  <FiTag size={14} className="inline mr-1 text-gray-400" />Nombre <span className="text-red-400">*</span>
                </label>
                <input
                  id="input-nombre"
                  type="text"
                  maxLength={200}
                  value={formData.nombre}
                  onChange={(e) => handleFieldChange('nombre', e.target.value)}
                  disabled={modalMode === 'view'}
                  placeholder="Ej: Matrícula promoción Inicial 2"
                  className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${
                    formErrors.nombre ? 'border-red-300 focus:ring-red-200' : 'border-gray-200 focus:ring-[#27A9E1]/30 focus:border-[#27A9E1]'
                  } ${modalMode === 'view' ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'}`}
                />
                {formErrors.nombre && (
                  <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                    <FiAlertCircle size={12} /> {formErrors.nombre}
                  </p>
                )}
              </div>

              {/* Tipo y Categoría */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Tipo <span className="text-red-400">*</span>
                  </label>
                  <select
                    id="input-tipo"
                    value={formData.tipo}
                    onChange={(e) => handleFieldChange('tipo', e.target.value)}
                    disabled={modalMode === 'view'}
                    className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${
                      formErrors.tipo ? 'border-red-300 focus:ring-red-200' : 'border-gray-200 focus:ring-[#27A9E1]/30 focus:border-[#27A9E1]'
                    } ${modalMode === 'view' ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'}`}
                  >
                    <option value="INGRESO">INGRESO</option>
                    <option value="EGRESO">EGRESO</option>
                  </select>
                  {formErrors.tipo && (
                    <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                      <FiAlertCircle size={12} /> {formErrors.tipo}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Categoría <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="input-categoria"
                    type="text"
                    maxLength={100}
                    value={formData.categoria}
                    onChange={(e) => handleFieldChange('categoria', e.target.value)}
                    disabled={modalMode === 'view'}
                    placeholder="Ej: MATRÍCULAS"
                    list="categorias-list"
                    className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${
                      formErrors.categoria ? 'border-red-300 focus:ring-red-200' : 'border-gray-200 focus:ring-[#27A9E1]/30 focus:border-[#27A9E1]'
                    } ${modalMode === 'view' ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'}`}
                  />
                  <datalist id="categorias-list">
                    {categorias.map(c => <option key={c} value={c} />)}
                  </datalist>
                  {formErrors.categoria && (
                    <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                      <FiAlertCircle size={12} /> {formErrors.categoria}
                    </p>
                  )}
                </div>
              </div>

              {/* Configuraciones */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
                  <input
                    id="input-requiere-mes"
                    type="checkbox"
                    checked={formData.requiere_mes}
                    onChange={(e) => setFormData(prev => ({ ...prev, requiere_mes: e.target.checked }))}
                    disabled={modalMode === 'view'}
                    className="w-4 h-4 text-[#27A9E1] rounded border-gray-300 focus:ring-[#27A9E1]"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700">Requiere mes</span>
                    <p className="text-xs text-gray-400">Mes de aplicación</p>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
                  <input
                    id="input-requiere-personal"
                    type="checkbox"
                    checked={formData.requiere_personal}
                    onChange={(e) => setFormData(prev => ({ ...prev, requiere_personal: e.target.checked }))}
                    disabled={modalMode === 'view'}
                    className="w-4 h-4 text-[#27A9E1] rounded border-gray-300 focus:ring-[#27A9E1]"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700">Requiere personal</span>
                    <p className="text-xs text-gray-400">Seleccionar personal</p>
                  </div>
                </label>
              </div>

              {/* Orden */}
              <div className="w-1/2">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Orden de visualización
                </label>
                <input
                  id="input-orden"
                  type="number"
                  min={0}
                  value={formData.orden}
                  onChange={(e) => handleFieldChange('orden', e.target.value)}
                  disabled={modalMode === 'view'}
                  className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${
                    formErrors.orden ? 'border-red-300 focus:ring-red-200' : 'border-gray-200 focus:ring-[#27A9E1]/30 focus:border-[#27A9E1]'
                  } ${modalMode === 'view' ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'}`}
                />
                {formErrors.orden && (
                  <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                    <FiAlertCircle size={12} /> {formErrors.orden}
                  </p>
                )}
              </div>

              {/* Botones */}
              {modalMode !== 'view' ? (
                <div className="pt-4 flex gap-3">
                  <button
                    id="btn-cancel-modal"
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 text-sm font-medium transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    id="btn-submit-modal"
                    type="submit"
                    disabled={saving}
                    className="flex-1 px-4 py-2.5 bg-[#27A9E1] text-white rounded-xl text-sm font-medium hover:bg-[#1E8BBF] disabled:opacity-60 disabled:cursor-not-allowed transition-all hover:shadow-lg hover:shadow-[#27A9E1]/20"
                  >
                    {saving ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Guardando...
                      </span>
                    ) : (
                      modalMode === 'create' ? 'Crear Concepto' : 'Guardar Cambios'
                    )}
                  </button>
                </div>
              ) : (
                <div className="pt-4">
                  <button
                    id="btn-close-view-modal"
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="w-full px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
                  >
                    Cerrar
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </MainLayout>
  );
};

export default CatalogoMovimientosPage;
