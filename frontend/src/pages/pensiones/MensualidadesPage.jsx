import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../../components/layout/MainLayout';
import { getMensualidades, getMensualidadesKPI } from '../../services/mensualidadService';
import { getPeriodosLectivos, getNivelesEducativos, getCursos } from '../../services/academicoService';
import { FiPlus, FiDownload, FiRefreshCw, FiSearch, FiFilter, FiDollarSign, FiClock, FiFileText, FiLayers, FiAlertCircle } from 'react-icons/fi';
import Swal from 'sweetalert2';
import GeneracionMasivaModal from '../../components/pensiones/mensualidades/GeneracionMasivaModal';
import GeneracionIndividualModal from '../../components/pensiones/mensualidades/GeneracionIndividualModal';

const ESTADO_BADGE = {
  BORRADOR: 'bg-gray-100 text-gray-700',
  EMITIDA: 'bg-blue-100 text-blue-700',
  PENDIENTE: 'bg-amber-100 text-amber-700',
  PARCIAL: 'bg-orange-100 text-orange-700',
  PAGADA: 'bg-emerald-100 text-emerald-700',
  VENCIDA: 'bg-red-100 text-red-700',
  EXONERADA: 'bg-purple-100 text-purple-700',
  ANULADA: 'bg-gray-800 text-white'
};

export default function MensualidadesPage() {
  const navigate = useNavigate();
  const [periodos, setPeriodos] = useState([]);
  const [niveles, setNiveles] = useState([]);
  const [cursos, setCursos] = useState([]);
  const [mesesCobrables, setMesesCobrables] = useState([]);
  
  const [mensualidades, setMensualidades] = useState([]);
  const [kpi, setKpi] = useState({
    total_generado: 0,
    total_pendiente: 0,
    total_pagado: 0,
    total_exoneradas: 0,
    total_vencido: 0
  });

  const [filters, setFilters] = useState({
    periodo_lectivo_id: '',
    mes_cobrable_id: '',
    curso_id: '',
    estado: '',
    search: '',
    page: 1
  });
  
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // modals
  const [isMasivaOpen, setIsMasivaOpen] = useState(false);
  const [isIndividualOpen, setIsIndividualOpen] = useState(false);

  useEffect(() => {
    cargarDatosIniciales();
  }, []);

  const cargarDatosIniciales = async () => {
    try {
      const [resPeriodos, resNiveles] = await Promise.all([
        getPeriodosLectivos(),
        getNivelesEducativos()
      ]);
      if (resPeriodos.success) {
        setPeriodos(resPeriodos.data);
        const activo = resPeriodos.data.find(p => p.es_activo === 1 || p.es_activo === true);
        if (activo) {
          setFilters(prev => ({ ...prev, periodo_lectivo_id: activo.id }));
          cargarMeses(activo.id);
        }
      }
      if (resNiveles.success) setNiveles(resNiveles.data);
    } catch (error) {
      console.error(error);
    }
  };

  const cargarMeses = async (periodoId) => {
    try {
      const res = await api.get(`/pensiones/configuracion/periodo-meses/${periodoId}`);
      if (res.data.success) {
        setMesesCobrables(res.data.meses.filter(m => m.cobrable === 1));
      }
    } catch (error) {
      console.error('Error cargando meses', error);
    }
  };

  useEffect(() => {
    if (filters.periodo_lectivo_id) {
      cargarMeses(filters.periodo_lectivo_id);
    }
  }, [filters.periodo_lectivo_id]);

  useEffect(() => {
    if (!filters.periodo_lectivo_id) return;
    const delayDebounceFn = setTimeout(() => {
      fetchData();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
    // eslint-disable-next-line
  }, [filters]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resMens, resKpi] = await Promise.all([
        getMensualidades(filters),
        getMensualidadesKPI({ periodo_lectivo_id: filters.periodo_lectivo_id })
      ]);
      if (resMens.success) {
        setMensualidades(resMens.mensualidades);
        setTotal(resMens.total);
      }
      if (resKpi.success) setKpi(resKpi.kpis);
    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'No se pudieron cargar las mensualidades.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout title="Mensualidades" subtitle="Inicio / Control Financiero / Pensiones y cobranzas / Mensualidades">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mensualidades y Obligaciones</h1>
          <p className="text-sm text-gray-500 mt-1">Gestión de la deuda de pensiones mes a mes por estudiante.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={filters.periodo_lectivo_id}
            onChange={e => setFilters({ ...filters, periodo_lectivo_id: e.target.value, page: 1 })}
            className="w-full md:w-48 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#27A9E1] font-medium"
          >
            {periodos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
          <button onClick={() => setIsMasivaOpen(true)} className="flex flex-1 md:flex-none items-center justify-center gap-2 px-5 py-2.5 bg-gray-800 text-white rounded-xl text-sm font-medium hover:bg-gray-900 transition-colors shadow-sm whitespace-nowrap">
            <FiLayers size={16} /> Generación Masiva
          </button>
          <button onClick={() => setIsIndividualOpen(true)} className="flex flex-1 md:flex-none items-center justify-center gap-2 px-5 py-2.5 bg-[#27A9E1] text-white rounded-xl text-sm font-medium hover:bg-[#1E8BBF] transition-colors shadow-sm whitespace-nowrap">
            <FiPlus size={16} /> Generar Individual
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-center">
          <span className="text-xs text-gray-500 font-bold mb-1 uppercase tracking-wider">Total Generado</span>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center"><FiFileText size={14} /></div>
            <span className="text-xl font-black text-gray-900">${parseFloat(kpi.total_generado).toFixed(2)}</span>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-center">
          <span className="text-xs text-gray-500 font-bold mb-1 uppercase tracking-wider">Total Pendiente</span>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center"><FiClock size={14} /></div>
            <span className="text-xl font-black text-gray-900">${parseFloat(kpi.total_pendiente).toFixed(2)}</span>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-center">
          <span className="text-xs text-gray-500 font-bold mb-1 uppercase tracking-wider">Total Vencido</span>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-red-50 text-red-500 flex items-center justify-center"><FiAlertCircle size={14} /></div>
            <span className="text-xl font-black text-red-600">${parseFloat(kpi.total_vencido).toFixed(2)}</span>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-center">
          <span className="text-xs text-gray-500 font-bold mb-1 uppercase tracking-wider">Total Pagado</span>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center"><FiDollarSign size={14} /></div>
            <span className="text-xl font-black text-gray-900">${parseFloat(kpi.total_pagado).toFixed(2)}</span>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-center">
          <span className="text-xs text-gray-500 font-bold mb-1 uppercase tracking-wider">Exoneradas</span>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-500 flex items-center justify-center"><FiDollarSign size={14} /></div>
            <span className="text-xl font-black text-gray-900">{kpi.total_exoneradas}</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Filtros */}
        <div className="p-4 border-b border-gray-100 bg-gray-50 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar estudiante, cédula o código..."
                value={filters.search}
                onChange={e => setFilters({ ...filters, search: e.target.value, page: 1 })}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-[#27A9E1] focus:border-transparent outline-none"
              />
            </div>
            
            <select
              value={filters.mes_cobrable_id}
              onChange={e => setFilters({ ...filters, mes_cobrable_id: e.target.value, page: 1 })}
              className="border border-gray-200 rounded-xl px-4 py-2 text-sm focus:ring-[#27A9E1] outline-none"
            >
              <option value="">Todos los meses</option>
              {mesesCobrables.map(m => <option key={m.id} value={m.id}>{m.nombre_mostrar}</option>)}
            </select>

            <select
              value={filters.estado}
              onChange={e => setFilters({ ...filters, estado: e.target.value, page: 1 })}
              className="border border-gray-200 rounded-xl px-4 py-2 text-sm focus:ring-[#27A9E1] outline-none"
            >
              <option value="">Todos los estados</option>
              <option value="PENDIENTE">Pendiente</option>
              <option value="VENCIDA">Vencida</option>
              <option value="PARCIAL">Parcial</option>
              <option value="PAGADA">Pagada</option>
              <option value="EXONERADA">Exonerada</option>
              <option value="ANULADA">Anulada</option>
            </select>
          </div>
          
          <div className="flex items-center gap-2 w-full md:w-auto">
            <button onClick={fetchData} className="p-2 text-gray-500 hover:bg-gray-200 rounded-lg transition-colors" title="Actualizar">
              <FiRefreshCw className={loading ? 'animate-spin' : ''} />
            </button>
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
              <FiDownload /> Exportar
            </button>
          </div>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500">
                <th className="p-4 font-medium">Obligación / Estudiante</th>
                <th className="p-4 font-medium">Mes / Vence</th>
                <th className="p-4 font-medium">V. Original</th>
                <th className="p-4 font-medium">Ajustes</th>
                <th className="p-4 font-medium">Pagado</th>
                <th className="p-4 font-medium">Saldo</th>
                <th className="p-4 font-medium text-center">Estado</th>
                <th className="p-4 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-sm">
              {loading && mensualidades.length === 0 ? (
                <tr><td colSpan="8" className="p-8 text-center text-gray-500">Cargando mensualidades...</td></tr>
              ) : mensualidades.length === 0 ? (
                <tr><td colSpan="8" className="p-8 text-center text-gray-500">No se encontraron mensualidades.</td></tr>
              ) : (
                mensualidades.map(m => (
                  <tr key={m.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-gray-900">{m.est_nombres} {m.est_apellidos}</div>
                      <div className="text-xs text-gray-500 mt-0.5 font-mono">{m.codigo} • Mat: {m.numero_matricula}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-medium text-gray-800">{m.mes_nombre}</div>
                      <div className="text-[10px] text-gray-500 uppercase mt-0.5">Vence: {new Date(m.fecha_vencimiento).toLocaleDateString('es-EC')}</div>
                    </td>
                    <td className="p-4 text-gray-600 font-mono">${parseFloat(m.valor_original).toFixed(2)}</td>
                    <td className="p-4">
                       <span className={`font-mono text-xs font-bold ${parseFloat(m.valor_ajustes) > 0 ? 'text-blue-500' : parseFloat(m.valor_ajustes) < 0 ? 'text-emerald-500' : 'text-gray-400'}`}>
                         {parseFloat(m.valor_ajustes) > 0 ? '+' : ''}{parseFloat(m.valor_ajustes).toFixed(2)}
                       </span>
                    </td>
                    <td className="p-4 text-emerald-600 font-mono font-medium">${parseFloat(m.total_pagado || 0).toFixed(2)}</td>
                    <td className="p-4">
                      <span className="font-mono font-black text-[#27A9E1] text-base">${parseFloat(m.saldo).toFixed(2)}</span>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide ${ESTADO_BADGE[m.estado] || 'bg-gray-100 text-gray-600'}`}>
                        {m.estado}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button onClick={() => navigate(`/pensiones/mensualidades/${m.id}`)} className="text-[#27A9E1] hover:text-[#1E8BBF] font-medium text-xs bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors">
                        Ver Detalle
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Paginación */}
        {total > 0 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-500">
              Mostrando {(filters.page - 1) * 30 + 1} a {Math.min(filters.page * 30, total)} de {total} registros
            </span>
            <div className="flex gap-1">
              <button disabled={filters.page === 1} onClick={() => setFilters({ ...filters, page: filters.page - 1 })} className="px-2 py-1 rounded border border-gray-200 text-gray-600 disabled:opacity-50 text-sm hover:bg-gray-50">Anterior</button>
              <button disabled={filters.page * 30 >= total} onClick={() => setFilters({ ...filters, page: filters.page + 1 })} className="px-2 py-1 rounded border border-gray-200 text-gray-600 disabled:opacity-50 text-sm hover:bg-gray-50">Siguiente</button>
            </div>
          </div>
        )}
      </div>

      <GeneracionMasivaModal isOpen={isMasivaOpen} onClose={() => setIsMasivaOpen(false)} onSuccess={() => { setIsMasivaOpen(false); fetchData(); }} />
      <GeneracionIndividualModal isOpen={isIndividualOpen} onClose={() => setIsIndividualOpen(false)} onSuccess={() => { setIsIndividualOpen(false); fetchData(); }} />
    </MainLayout>
  );
}
