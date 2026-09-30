import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../../components/layout/MainLayout';
import { getAsignaciones, getAsignacionesKPI } from '../../services/asignacionPensionService';
import { getPeriodosLectivos } from '../../services/academicoService';
import { FiPlus, FiDownload, FiRefreshCw, FiSearch, FiFilter, FiUserCheck, FiDollarSign, FiClock, FiFileText, FiLayers, FiUsers } from 'react-icons/fi';
import Swal from 'sweetalert2';
import api from '../../services/api';
import AsignacionMasivaModal from '../../components/pensiones/asignacion/AsignacionMasivaModal';

const ESTADO_BADGE = {
  BORRADOR: 'bg-gray-100 text-gray-700',
  PENDIENTE_APROBACION: 'bg-amber-100 text-amber-700',
  APROBADA: 'bg-blue-100 text-blue-700',
  ACTIVA: 'bg-emerald-100 text-emerald-700',
  SUSPENDIDA: 'bg-orange-100 text-orange-700',
  FINALIZADA: 'bg-purple-100 text-purple-700',
  RECHAZADA: 'bg-red-100 text-red-700',
  ANULADA: 'bg-red-50 text-red-600',
};

export default function AsignacionPensionesPage() {
  const navigate = useNavigate();
  const [asignaciones, setAsignaciones] = useState([]);
  const [kpi, setKpi] = useState(null);
  const [periodos, setPeriodos] = useState([]);
  
  const [filters, setFilters] = useState({
    periodo_lectivo_id: '',
    search: '',
    estado: '',
    page: 1,
  });
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isMasivaModalOpen, setIsMasivaModalOpen] = useState(false);

  // 1. Cargar periodos
  useEffect(() => {
    getPeriodosLectivos().then(res => {
      if (res.success) {
        setPeriodos(res.data);
        const activo = res.data.find(p => p.es_activo === 1 || p.es_activo === true);
        if (activo) {
          setFilters(prev => ({ ...prev, periodo_lectivo_id: activo.id }));
        } else if (res.data.length > 0) {
          setFilters(prev => ({ ...prev, periodo_lectivo_id: res.data[0].id }));
        }
      }
    });
  }, []);

  // 2. Cargar datos cuando cambian los filtros
  useEffect(() => {
    if (!filters.periodo_lectivo_id) return;
    fetchData();
    // eslint-disable-next-line
  }, [filters]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resAsig, resKpi] = await Promise.all([
        getAsignaciones(filters),
        getAsignacionesKPI({ periodo_lectivo_id: filters.periodo_lectivo_id }),
      ]);
      if (resAsig.success) {
        setAsignaciones(resAsig.asignaciones);
        setTotal(resAsig.total);
      }
      if (resKpi.success) setKpi(resKpi.kpi);
    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'No se pudieron cargar las asignaciones.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams({
        periodo_lectivo_id: filters.periodo_lectivo_id,
        estado: filters.estado,
        formato: 'csv',
      }).toString();
      
      const response = await api.get(`/pensiones/asignaciones/exportar?${params}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'asignaciones_pension.csv');
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (error) {
      Swal.fire('Error', 'No se pudo exportar el archivo.', 'error');
    }
  };

  return (
    <MainLayout title="Asignación de Pensiones" subtitle="Inicio / Control Financiero / Pensiones y cobranzas / Asignación de pensiones">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Asignación de Pensiones</h1>
          <p className="text-sm text-gray-500 mt-1">Configura valores mensuales y beneficios por estudiante.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={filters.periodo_lectivo_id}
            onChange={e => setFilters({ ...filters, periodo_lectivo_id: e.target.value, page: 1 })}
            className="w-full md:w-48 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#27A9E1] font-medium"
          >
            {periodos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
          <button onClick={() => setIsMasivaModalOpen(true)} className="flex flex-1 md:flex-none items-center justify-center gap-2 px-5 py-2.5 bg-gray-800 text-white rounded-xl text-sm font-medium hover:bg-gray-900 transition-colors shadow-sm whitespace-nowrap">
            <FiUsers size={16} /> Asignación masiva
          </button>
          <button onClick={() => navigate('/pensiones/asignaciones/nueva')} className="flex flex-1 md:flex-none items-center justify-center gap-2 px-5 py-2.5 bg-[#27A9E1] text-white rounded-xl text-sm font-medium hover:bg-[#1E8BBF] transition-colors shadow-sm whitespace-nowrap">
            <FiPlus size={16} /> Nueva asignación
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Sin asignación', value: kpi?.sin_asignacion || 0, icon: FiUserCheck, color: 'text-gray-500', bg: 'bg-gray-100' },
          { label: 'Activas', value: kpi?.activas || 0, icon: FiDollarSign, color: 'text-emerald-500', bg: 'bg-emerald-100' },
          { label: 'Pendientes', value: kpi?.pendientes_aprobacion || 0, icon: FiClock, color: 'text-amber-500', bg: 'bg-amber-100' },
          { label: 'Total registros', value: kpi?.total || 0, icon: FiLayers, color: 'text-[#27A9E1]', bg: 'bg-blue-100' },
        ].map((card, i) => (
          <div key={i} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl ${card.bg} flex items-center justify-center flex-shrink-0`}>
              <card.icon size={20} className={card.color} />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">{card.label}</p>
              <h3 className="text-2xl font-bold text-gray-900">{card.value}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm mb-4 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Buscar por estudiante, cédula, matrícula..."
            value={filters.search}
            onChange={e => setFilters({ ...filters, search: e.target.value, page: 1 })}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#27A9E1]"
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative w-full md:w-48">
            <FiFilter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <select
              value={filters.estado}
              onChange={e => setFilters({ ...filters, estado: e.target.value, page: 1 })}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#27A9E1] appearance-none"
            >
              <option value="">Todos los estados</option>
              {Object.keys(ESTADO_BADGE).map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          <button onClick={fetchData} className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 flex items-center gap-2">
            <FiRefreshCw size={15} />
          </button>
          <button onClick={handleExport} className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 flex items-center gap-2 whitespace-nowrap">
            <FiDownload size={15} /> <span className="hidden sm:inline">Exportar</span>
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100 uppercase text-[11px] tracking-wider">
              <tr>
                <th className="px-4 py-3">Matrícula</th>
                <th className="px-4 py-3">Estudiante</th>
                <th className="px-4 py-3">Curso / Paralelo</th>
                <th className="px-4 py-3">Beneficios</th>
                <th className="px-4 py-3">Valor final</th>
                <th className="px-4 py-3">Vigencia</th>
                <th className="px-4 py-3 text-center">Estado</th>
                <th className="px-4 py-3 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                [1,2,3,4,5].map(i => (
                  <tr key={i}><td colSpan="8" className="px-4 py-4"><div className="h-6 bg-gray-100 rounded-lg animate-pulse w-full"></div></td></tr>
                ))
              ) : asignaciones.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-4 py-12 text-center">
                    <div className="text-4xl mb-3">📭</div>
                    <p className="text-gray-500 font-medium">No se encontraron asignaciones.</p>
                  </td>
                </tr>
              ) : (
                asignaciones.map(ap => (
                  <tr key={ap.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{ap.numero_matricula}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900">{ap.est_nombres} {ap.est_apellidos}</div>
                      <div className="text-[11px] text-gray-400">{ap.est_codigo} • {ap.est_cedula}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-gray-800">{ap.curso_nombre}</div>
                      <div className="text-xs text-gray-400">Paralelo {ap.paralelo_nombre}</div>
                    </td>
                    <td className="px-4 py-3">
                      {ap.beneficios_resumen?.length > 0 ? (
                        <div className="flex flex-wrap gap-1 max-w-[150px]">
                          {ap.beneficios_resumen.map((b, i) => (
                            <span key={i} className="px-2 py-0.5 bg-[#27A9E1]/10 text-[#27A9E1] text-[10px] font-bold rounded-full truncate max-w-[100px]" title={b.nombre}>
                              {b.nombre}
                            </span>
                          ))}
                        </div>
                      ) : <span className="text-xs text-gray-400 italic">Sin beneficios</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-gray-900 text-base">${parseFloat(ap.valor_mensual_final).toFixed(2)}</div>
                      {parseFloat(ap.tarifa_base_snapshot) !== parseFloat(ap.valor_mensual_final) && (
                        <div className="text-[10px] text-gray-400 line-through">Base: ${parseFloat(ap.tarifa_base_snapshot).toFixed(2)}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      <div>{ap.mes_desde?.slice(0, 7)}</div>
                      <div className="text-gray-400">hasta {ap.mes_hasta?.slice(0, 7)}</div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold tracking-wide ${ESTADO_BADGE[ap.estado] || 'bg-gray-100'}`}>
                        {ap.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button 
                        onClick={() => navigate(`/pensiones/asignaciones/${ap.id}`)}
                        className="px-3 py-1.5 text-xs font-medium text-[#27A9E1] hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100"
                      >
                        Ver detalle
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
              Mostrando {(filters.page - 1) * 30 + 1} a {Math.min(filters.page * 30, total)} de {total} asignaciones
            </span>
            <div className="flex gap-1">
              <button
                disabled={filters.page === 1}
                onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
                className="px-2 py-1 rounded border border-gray-200 text-gray-600 disabled:opacity-50 text-sm hover:bg-gray-50"
              >
                Anterior
              </button>
              <button
                disabled={filters.page * 30 >= total}
                onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
                className="px-2 py-1 rounded border border-gray-200 text-gray-600 disabled:opacity-50 text-sm hover:bg-gray-50"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      <AsignacionMasivaModal 
        isOpen={isMasivaModalOpen} 
        onClose={() => setIsMasivaModalOpen(false)} 
        onSuccess={() => { setIsMasivaModalOpen(false); fetchData(); }} 
      />
    </MainLayout>
  );
}
