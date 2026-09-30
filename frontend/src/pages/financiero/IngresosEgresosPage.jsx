import React, { useState, useEffect, useCallback } from 'react';
import MainLayout from '../../components/layout/MainLayout';
import { useAuth } from '../../context/AuthContext';
import movimientosFinancierosService from '../../services/movimientosFinancierosService';
import MovimientoFormModal from '../../components/financiero/MovimientoFormModal';
import MovimientoDetailDrawer from '../../components/financiero/MovimientoDetailDrawer';
import Badge from '../../components/ui/Badge';
import Swal from 'sweetalert2';
import {
  FiPlus, FiSearch, FiFilter, FiEdit2, FiEye, FiDownload,
  FiChevronLeft, FiChevronRight, FiX, FiArrowUp, FiArrowDown,
  FiTrendingUp, FiTrendingDown, FiActivity, FiDollarSign,
  FiTrash2, FiRefreshCw, FiFileText
} from 'react-icons/fi';

// ── Skeleton Loaders ──────────────────────────────────────────
const SkeletonCard = () => (
  <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 animate-pulse">
    <div className="flex items-center justify-between mb-4">
      <div className="w-10 h-10 rounded-xl bg-gray-200"></div>
      <div className="w-16 h-4 bg-gray-200 rounded-full"></div>
    </div>
    <div className="w-24 h-6 bg-gray-200 rounded-md mb-2"></div>
    <div className="w-32 h-4 bg-gray-200 rounded-md"></div>
  </div>
);

const SkeletonRow = () => (
  <tr className="animate-pulse">
    {[...Array(9)].map((_, i) => (
      <td key={i} className="px-4 py-4">
        <div className="h-4 bg-gray-200 rounded-lg w-full" />
      </td>
    ))}
  </tr>
);

// ── Componente Tarjeta Resumen ────────────────────────────────
const SummaryCard = ({ title, amount, icon: Icon, color, isNegative }) => (
  <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 relative overflow-hidden group">
    <div className={`absolute top-0 right-0 w-24 h-24 bg-${color}-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110`}></div>
    <div className="flex items-center justify-between mb-2 relative z-10">
      <div className={`w-10 h-10 rounded-xl bg-${color}-100 text-${color}-600 flex items-center justify-center`}>
        <Icon size={20} />
      </div>
    </div>
    <div className="relative z-10">
      <h4 className="text-gray-500 text-sm font-medium mb-1">{title}</h4>
      <p className={`text-2xl font-bold font-mono ${isNegative ? 'text-red-500' : 'text-gray-800'}`}>
        {new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(amount)}
      </p>
    </div>
  </div>
);

const IngresosEgresosPage = () => {
  const { usuario } = useAuth();
  const isAdmin = usuario?.es_admin === true || usuario?.es_admin === 1;

  // ── Estados Principales ──────────────────────────────────
  const [movimientos, setMovimientos] = useState([]);
  const [totales, setTotales] = useState({ total_ingresos: 0, total_egresos: 0, diferencia: 0, saldo_general: 0 });
  const [loading, setLoading] = useState(true);
  const [loadingResumen, setLoadingResumen] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 15, totalPages: 0 });
  const [datosFormulario, setDatosFormulario] = useState({ periodos: [], conceptos: [], cuentas: [], usuarios: [] });

  // ── Filtros ──────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [filtros, setFiltros] = useState({
    periodo_id: '', fecha_desde: '', fecha_hasta: '', tipo: '', categoria: '',
    concepto_id: '', cuenta_id: '', mes_aplicacion: '', estado: '',
    usuario_id: '', personal_id: '', numero_comprobante: ''
  });
  const [sortBy, setSortBy] = useState('fecha');
  const [sortOrder, setSortOrder] = useState('DESC');
  const [showFilters, setShowFilters] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // ── Modales ──────────────────────────────────────────────
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState('create');
  const [selectedItem, setSelectedItem] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailId, setDetailId] = useState(null);

  // ── Carga Inicial ────────────────────────────────────────
  useEffect(() => {
    loadDatosFormulario();
  }, []);

  const loadDatosFormulario = async () => {
    try {
      const res = await movimientosFinancierosService.getDatosFormulario();
      if (res.success) {
        setDatosFormulario(res.data);
        // Setear periodo por defecto al filtro si existe activo
        const pActivo = res.data.periodos.find(p => p.activo);
        if (pActivo) {
          setFiltros(prev => ({ ...prev, periodo_id: pActivo.id }));
        }
      }
    } catch (error) {
      console.error('Error cargando catálogos:', error);
    }
  };

  // ── Carga de Datos ───────────────────────────────────────
  const fetchMovimientos = useCallback(async (page = 1) => {
    setLoading(true);
    setLoadingResumen(true);
    try {
      const params = { page, limit: pagination.limit, search, sort_by: sortBy, sort_order: sortOrder, ...filtros };
      const res = await movimientosFinancierosService.getAll(params);
      
      if (res.success) {
        setMovimientos(res.data);
        setPagination(res.pagination);
        setTotales(res.totales);
      }
    } catch (error) {
      Swal.fire('Error', 'No se pudieron cargar los movimientos.', 'error');
    } finally {
      setLoading(false);
      setLoadingResumen(false);
    }
  }, [search, sortBy, sortOrder, pagination.limit, filtros]);

  useEffect(() => {
    // Si ya cargaron los catálogos y hay periodo default, carga
    if (datosFormulario.periodos.length > 0) {
      const timer = setTimeout(() => fetchMovimientos(1), 400);
      return () => clearTimeout(timer);
    }
  }, [fetchMovimientos, datosFormulario]);

  // ── Handlers de Acción ───────────────────────────────────
  const handleSort = (column) => {
    if (sortBy === column) setSortOrder(prev => prev === 'ASC' ? 'DESC' : 'ASC');
    else { setSortBy(column); setSortOrder('DESC'); }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFiltros(prev => ({ ...prev, [name]: value }));
  };

  const clearFilters = () => {
    setSearch('');
    const pActivo = datosFormulario.periodos.find(p => p.activo);
    setFiltros({
      periodo_id: pActivo ? pActivo.id : '', fecha_desde: '', fecha_hasta: '', tipo: '', categoria: '',
      concepto_id: '', cuenta_id: '', mes_aplicacion: '', estado: '',
      usuario_id: '', personal_id: '', numero_comprobante: ''
    });
  };

  const hasActiveFilters = search || Object.entries(filtros).some(([k, v]) => {
    if (k === 'periodo_id') return false; // ignorar default
    return v !== '';
  });

  // ── Acciones CRUD ────────────────────────────────────────
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

  const handleAnular = async (item) => {
    const { value: motivo } = await Swal.fire({
      title: 'Anular Movimiento',
      html: `
        <p class="text-sm text-gray-600 mb-3">Está a punto de anular el movimiento <strong>${item.concepto}</strong> por <strong>$${item.valor}</strong>.</p>
        <p class="text-xs text-red-500 mb-2 font-bold">Esta acción no se puede deshacer y quedará registrada.</p>
      `,
      input: 'text',
      inputPlaceholder: 'Ingrese el motivo de anulación',
      inputValidator: (value) => {
        if (!value || !value.trim()) return 'El motivo es obligatorio';
      },
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#EF4444',
      cancelButtonColor: '#d1d5db',
      confirmButtonText: 'Sí, anular',
      cancelButtonText: 'Cancelar'
    });

    if (motivo) {
      try {
        const res = await movimientosFinancierosService.anular(item.id, motivo);
        if (res.success) {
          Swal.fire({ icon: 'success', title: 'Movimiento Anulado', timer: 2000, showConfirmButton: false, toast: true, position: 'top-end' });
          fetchMovimientos(pagination.page);
        }
      } catch (error) {
        Swal.fire('Error', error.response?.data?.message || 'Error al anular', 'error');
      }
    }
  };

  // ── Exportación ──────────────────────────────────────────
  const handleExport = async (format) => {
    setIsExporting(true);
    try {
      const params = { search, ...filtros };
      let blob;
      if (format === 'excel') {
        blob = await movimientosFinancierosService.exportarExcel(params);
      } else {
        blob = await movimientosFinancierosService.exportarPDF(params);
      }

      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `IngresosEgresos_${new Date().getTime()}.${format === 'excel' ? 'xlsx' : 'pdf'}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      Swal.fire('Error', `Error al exportar a ${format.toUpperCase()}`, 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // ── Render Helpers ───────────────────────────────────────
  const SortIcon = ({ column }) => {
    if (sortBy !== column) return <FiArrowDown size={12} className="text-gray-300 ml-1 opacity-0 group-hover:opacity-100" />;
    return sortOrder === 'ASC'
      ? <FiArrowUp size={12} className="text-[#27A9E1] ml-1" />
      : <FiArrowDown size={12} className="text-[#27A9E1] ml-1" />;
  };

  const getCategorias = () => {
    const cats = new Set(datosFormulario.conceptos.map(c => c.categoria));
    return Array.from(cats);
  };

  return (
    <MainLayout title="Ingresos y Egresos" subtitle="Control Financiero / Registro">
      
      {/* ── SECCIÓN 1: Tarjetas Resumen ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {loadingResumen ? (
          [...Array(4)].map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <SummaryCard title="Total Ingresos Filtrados" amount={totales.total_ingresos} icon={FiTrendingUp} color="green" />
            <SummaryCard title="Total Egresos Filtrados" amount={totales.total_egresos} icon={FiTrendingDown} color="red" />
            <SummaryCard title="Diferencia Filtrada" amount={totales.diferencia} icon={FiActivity} color={totales.diferencia < 0 ? 'amber' : 'blue'} isNegative={totales.diferencia < 0} />
            <SummaryCard title="Saldo General Actual" amount={totales.saldo_general} icon={FiDollarSign} color="slate" />
          </>
        )}
      </div>

      <div className="space-y-4 animate-fade-in">
        {/* ── SECCIÓN 2: Barra de Acciones y Filtros Principales ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            
            {/* Buscador Principal */}
            <div className="flex-1 w-full lg:max-w-md relative">
              <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Buscar descripción o comprobante..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#27A9E1]/30 focus:border-[#27A9E1] transition-all"
              />
            </div>

            {/* Botones de Acción */}
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
                onClick={() => fetchMovimientos(1)}
                className="inline-flex items-center justify-center p-2.5 bg-white border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-colors"
                title="Actualizar"
              >
                <FiRefreshCw size={18} className={loading ? 'animate-spin text-[#27A9E1]' : ''} />
              </button>

              <div className="relative group">
                <button
                  disabled={isExporting || movimientos.length === 0}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-800 text-white rounded-xl text-sm font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors"
                >
                  <FiDownload size={16} /> Exportar
                </button>
                <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-xl shadow-lg border border-gray-100 py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20">
                  <button onClick={() => handleExport('excel')} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                    <FiFileText size={14} className="text-green-600"/> Excel
                  </button>
                  <button onClick={() => handleExport('pdf')} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                    <FiFileText size={14} className="text-red-500"/> PDF
                  </button>
                </div>
              </div>

              <button
                onClick={openCreate}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#27A9E1] text-white rounded-xl text-sm font-medium hover:bg-[#1E8BBF] transition-all shadow-md shadow-[#27A9E1]/20"
              >
                <FiPlus size={16} /> Nuevo
              </button>
            </div>
          </div>

          {/* ── Panel Expandible de Filtros ── */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 animate-fade-in">
              <select name="periodo_id" value={filtros.periodo_id} onChange={handleFilterChange} className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-[#27A9E1]/30">
                <option value="">Todos los periodos</option>
                {datosFormulario.periodos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
              
              <input type="date" name="fecha_desde" value={filtros.fecha_desde} onChange={handleFilterChange} className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-[#27A9E1]/30" placeholder="Desde" title="Fecha Desde" />
              <input type="date" name="fecha_hasta" value={filtros.fecha_hasta} onChange={handleFilterChange} className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-[#27A9E1]/30" placeholder="Hasta" title="Fecha Hasta" />
              
              <select name="tipo" value={filtros.tipo} onChange={handleFilterChange} className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-[#27A9E1]/30">
                <option value="">Todos los tipos</option>
                <option value="INGRESO">Ingresos</option>
                <option value="EGRESO">Egresos</option>
              </select>

              <select name="cuenta_id" value={filtros.cuenta_id} onChange={handleFilterChange} className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-[#27A9E1]/30">
                <option value="">Todas las cuentas</option>
                {datosFormulario.cuentas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>

              <select name="concepto_id" value={filtros.concepto_id} onChange={handleFilterChange} className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-[#27A9E1]/30">
                <option value="">Todos los conceptos</option>
                {datosFormulario.conceptos.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>

              <select name="estado" value={filtros.estado} onChange={handleFilterChange} className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-[#27A9E1]/30">
                <option value="">Solo Activos</option>
                <option value="ANULADO">Anulados</option>
              </select>
              
              <select name="usuario_id" value={filtros.usuario_id} onChange={handleFilterChange} className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-[#27A9E1]/30">
                <option value="">Todos los usuarios</option>
                {datosFormulario.usuarios.map(u => <option key={u.id_usuario} value={u.id_usuario}>{u.nombre_completo}</option>)}
              </select>

              {hasActiveFilters && (
                <div className="md:col-span-3 lg:col-span-4 flex justify-end">
                  <button onClick={clearFilters} className="text-sm text-[#27A9E1] hover:underline flex items-center gap-1">
                    <FiX size={14} /> Limpiar filtros
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── SECCIÓN 3: Tabla ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative">
          
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="bg-gray-50/80 text-gray-500 font-medium text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3.5 cursor-pointer hover:text-[#27A9E1] group" onClick={() => handleSort('fecha')}>
                    <span className="flex items-center">Fecha <SortIcon column="fecha" /></span>
                  </th>
                  <th className="px-4 py-3.5 cursor-pointer hover:text-[#27A9E1] group" onClick={() => handleSort('concepto')}>
                    <span className="flex items-center">Concepto <SortIcon column="concepto" /></span>
                  </th>
                  <th className="px-4 py-3.5">Descripción</th>
                  <th className="px-4 py-3.5 cursor-pointer hover:text-[#27A9E1] group" onClick={() => handleSort('cuenta')}>
                    <span className="flex items-center">Cuenta <SortIcon column="cuenta" /></span>
                  </th>
                  <th className="px-4 py-3.5 text-right font-bold text-green-600">Ingreso</th>
                  <th className="px-4 py-3.5 text-right font-bold text-red-500">Egreso</th>
                  <th className="px-4 py-3.5 text-right font-bold text-gray-700">Saldo Acum.</th>
                  <th className="px-4 py-3.5 text-center">Estado</th>
                  <th className="px-4 py-3.5 text-right sticky right-0 bg-gray-50/90 backdrop-blur">Acciones</th>
                </tr>
              </thead>
              
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  [...Array(10)].map((_, i) => <SkeletonRow key={i} />)
                ) : movimientos.length === 0 ? (
                  <tr>
                    <td colSpan="9">
                      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                        <FiFileText size={36} className="text-gray-300 mb-4" />
                        <p className="text-lg font-semibold text-gray-500">No hay movimientos registrados</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  movimientos.map((item) => {
                    const isAnulado = item.estado === 'ANULADO';
                    const ingreso = item.tipo === 'INGRESO' ? item.valor : null;
                    const egreso = item.tipo === 'EGRESO' ? item.valor : null;
                    
                    return (
                      <tr key={item.id} className={`hover:bg-gray-50/50 transition-colors group ${isAnulado ? 'bg-red-50/20 opacity-80' : ''}`}>
                        
                        <td className="px-4 py-3 text-gray-600">
                          {new Date(item.fecha).toLocaleDateString('es-EC', { timeZone: 'America/Guayaquil' })}
                          {item.mes_aplicacion && (
                            <span className="block text-[10px] text-gray-400 mt-0.5">
                              {new Date(item.mes_aplicacion).toLocaleDateString('es-EC', {month:'short', year:'numeric', timeZone:'America/Guayaquil'})}
                            </span>
                          )}
                        </td>
                        
                        <td className="px-4 py-3">
                          <span className={`block font-medium ${isAnulado ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                            {item.concepto.length > 25 ? item.concepto.substring(0, 25) + '...' : item.concepto}
                          </span>
                          <span className="text-xs font-mono text-gray-400">{item.codigo}</span>
                        </td>
                        
                        <td className={`px-4 py-3 text-sm max-w-[200px] truncate ${isAnulado ? 'line-through text-gray-400' : 'text-gray-600'}`} title={item.descripcion}>
                          {item.descripcion}
                        </td>
                        
                        <td className="px-4 py-3 text-gray-600">
                          {item.cuenta}
                        </td>
                        
                        <td className={`px-4 py-3 text-right font-mono font-medium ${isAnulado ? 'text-gray-300' : 'text-green-600'}`}>
                          {ingreso ? `+ $${parseFloat(ingreso).toFixed(2)}` : ''}
                        </td>
                        
                        <td className={`px-4 py-3 text-right font-mono font-medium ${isAnulado ? 'text-gray-300' : 'text-red-500'}`}>
                          {egreso ? `- $${parseFloat(egreso).toFixed(2)}` : ''}
                        </td>
                        
                        <td className={`px-4 py-3 text-right font-mono font-bold ${isAnulado ? 'text-gray-400' : 'text-gray-800'}`}>
                          ${parseFloat(item.saldo_acumulado).toFixed(2)}
                        </td>
                        
                        <td className="px-4 py-3 text-center">
                          <Badge variant={isAnulado ? 'red' : 'green'}>{item.estado}</Badge>
                        </td>
                        
                        <td className="px-4 py-3 text-right sticky right-0 bg-white group-hover:bg-gray-50/90 transition-colors">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => openDetail(item.id)}
                              className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Ver detalles"
                            >
                              <FiEye size={16} />
                            </button>
                            
                            {isAdmin && !isAnulado && (
                              <>
                                <button
                                  onClick={() => openEdit(item)}
                                  className="p-2 text-gray-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-colors"
                                  title="Editar"
                                >
                                  <FiEdit2 size={16} />
                                </button>
                                <button
                                  onClick={() => handleAnular(item)}
                                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Anular"
                                >
                                  <FiTrash2 size={16} />
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

          {/* ── Paginación ── */}
          {!loading && pagination.totalPages > 1 && (
            <div className="px-5 py-3.5 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
              <p className="text-xs text-gray-500 hidden sm:block">
                Mostrando {((pagination.page - 1) * pagination.limit) + 1} a {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => fetchMovimientos(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="p-2 rounded-lg text-gray-500 hover:bg-gray-200 disabled:opacity-40"
                >
                  <FiChevronLeft size={16} />
                </button>
                <span className="text-sm font-medium px-2">
                  Página {pagination.page} de {pagination.totalPages}
                </span>
                <button
                  onClick={() => fetchMovimientos(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                  className="p-2 rounded-lg text-gray-500 hover:bg-gray-200 disabled:opacity-40"
                >
                  <FiChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Modales ── */}
      <MovimientoFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={() => fetchMovimientos(pagination.page)}
        mode={formMode}
        data={selectedItem}
        datosFormulario={datosFormulario}
      />

      <MovimientoDetailDrawer
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        movimientoId={detailId}
      />

    </MainLayout>
  );
};

export default IngresosEgresosPage;
