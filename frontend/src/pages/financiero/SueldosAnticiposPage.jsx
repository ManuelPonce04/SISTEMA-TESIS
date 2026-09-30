import React, { useState, useEffect } from 'react';
import sueldosAnticiposService from '../../services/sueldosAnticiposService';
import movimientosFinancierosService from '../../services/movimientosFinancierosService';
import personalCatalogosService from '../../services/personalCatalogosService';
import { FiSearch, FiDollarSign, FiClock, FiUsers, FiAlertCircle, FiTrendingDown, FiList, FiSettings, FiDownload } from 'react-icons/fi';
import Badge from '../../components/ui/Badge';
import SueldoDetailDrawer from '../../components/financiero/sueldos/SueldoDetailDrawer';
import AnticipoFormModal from '../../components/financiero/sueldos/AnticipoFormModal';
import AjustesSueldoModal from '../../components/financiero/sueldos/AjustesSueldoModal';
import { useLocation } from 'react-router-dom';
import MainLayout from '../../components/layout/MainLayout';

const SueldosAnticiposPage = () => {
  const location = useLocation();

  const [data, setData] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [periodos, setPeriodos] = useState([]);
  const [catalogos, setCatalogos] = useState({ contratos: [], funciones: [], cargos: [] });

  const [filtros, setFiltros] = useState({
    periodo_id: '',
    mes: new Date().toISOString().split('T')[0].substring(0,8) + '01',
    search: '',
    tipo_contrato_id: '',
    funcion_id: '',
    cargo_id: '',
    estado_personal: 'ACTIVO',
    con_anticipos: '',
    saldo_excedido: ''
  });

  const [pagination, setPagination] = useState({ page: 1, limit: 20, totalPages: 1 });
  
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedTrabajador, setSelectedTrabajador] = useState(null);

  const [anticipoModalOpen, setAnticipoModalOpen] = useState(false);
  const [ajustesModalOpen, setAjustesModalOpen] = useState(false);
  const [selectedSueldo, setSelectedSueldo] = useState(null); // Para pasar a los modales

  useEffect(() => {
    loadDependencies();
  }, []);

  useEffect(() => {
    // Leer query params de la URL si venimos de Rol de Pagos
    const params = new URLSearchParams(location.search);
    const pid = params.get('personal_id');
    const perId = params.get('periodo_id');
    const m = params.get('mes');

    if (perId && m) {
      setFiltros(prev => ({ ...prev, periodo_id: perId, mes: m }));
    }
    // Opcionalmente, si pid existe podríamos buscar a ese trabajador y abrir su modal.
  }, [location.search]);

  useEffect(() => {
    if (filtros.periodo_id && filtros.mes) {
      const delay = setTimeout(() => {
        fetchData();
      }, 500);
      return () => clearTimeout(delay);
    }
  }, [filtros, pagination.page]);

  const loadDependencies = async () => {
    try {
      const [resPeriodos, resContratos, resFunciones, resCargos] = await Promise.all([
        movimientosFinancierosService.getPeriodos(),
        personalCatalogosService.getTiposContrato(),
        personalCatalogosService.getFunciones(),
        personalCatalogosService.getCargos()
      ]);
      
      let pId = '';
      if (resPeriodos.success) {
        setPeriodos(resPeriodos.data);
        const activo = resPeriodos.data.find(p => p.activo);
        pId = activo ? activo.id : (resPeriodos.data[0]?.id || '');
      }

      setCatalogos({
        contratos: resContratos.success ? resContratos.data : [],
        funciones: resFunciones.success ? resFunciones.data : [],
        cargos: resCargos.success ? resCargos.data : []
      });

      setFiltros(prev => ({ ...prev, periodo_id: pId }));
    } catch (error) {
      console.error('Error cargando dependencias', error);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await sueldosAnticiposService.getResumenMensual({
        ...filtros,
        page: pagination.page,
        limit: pagination.limit
      });
      if (res.success) {
        setData(res.data);
        setResumen(res.resumen);
        setPagination(res.pagination);
      }
    } catch (error) {
      console.error('Error fetching data', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFiltros(prev => ({ ...prev, [name]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const openDrawer = (trabajador) => {
    setSelectedTrabajador(trabajador);
    setDrawerOpen(true);
  };

  const openAnticipoModal = (trabajador) => {
    setSelectedTrabajador(trabajador);
    setSelectedSueldo(trabajador);
    setAnticipoModalOpen(true);
  };

  const openAjustesModal = (trabajador) => {
    setSelectedTrabajador(trabajador);
    setSelectedSueldo(trabajador);
    setAjustesModalOpen(true);
  };

  // Helper arrays for months
  const months = Array.from({length: 12}, (_, i) => {
    const d = new Date(2026, i, 1);
    return {
      val: `2026-${String(i+1).padStart(2, '0')}-01`, 
      label: d.toLocaleDateString('es-EC', {month: 'long'}).toUpperCase()
    };
  });

  return (
    <MainLayout title="Sueldos y anticipos" subtitle="Inicio / Control Financiero / Sueldos y anticipos">
      <div className="max-w-7xl mx-auto animate-fade-in space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex-1">
          <h2 className="text-xl font-bold text-gray-800">Sueldos y Anticipos</h2>
          <p className="text-sm text-gray-500">Gestión de anticipos y ajustes provisionales del mes.</p>
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={() => openAnticipoModal(null)} 
            className="px-5 py-2.5 bg-green-500 text-white rounded-xl text-sm font-bold hover:bg-green-600 transition-colors flex items-center gap-2 shadow-md shadow-green-500/30"
          >
            <FiDollarSign size={18} /> Otorgar Anticipo
          </button>
        </div>
      </div>
      
      <div className="flex flex-wrap items-center gap-3 bg-white p-2 rounded-xl shadow-sm border border-gray-100">
          <select 
            name="periodo_id" value={filtros.periodo_id} onChange={handleFilterChange}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium focus:ring-[#27A9E1] outline-none"
          >
            <option value="">Seleccione Periodo...</option>
            {periodos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
          
          <select 
            name="mes" value={filtros.mes} onChange={handleFilterChange}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium focus:ring-[#27A9E1] outline-none"
          >
            {months.map(m => <option key={m.val} value={m.val}>{m.label}</option>)}
          </select>

      </div>

      {/* Tarjetas Resumen */}
      {resumen && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <p className="text-[10px] uppercase font-bold text-gray-400">Total Sueldos</p>
            <p className="text-xl font-mono font-bold text-gray-800">${parseFloat(resumen.total_sueldos).toFixed(2)}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-red-100">
            <p className="text-[10px] uppercase font-bold text-red-400">Total Anticipos</p>
            <p className="text-xl font-mono font-bold text-red-600">${parseFloat(resumen.total_anticipos).toFixed(2)}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-blue-100">
            <p className="text-[10px] uppercase font-bold text-blue-400">Neto Estimado</p>
            <p className="text-xl font-mono font-bold text-blue-600">${parseFloat(resumen.neto_estimado).toFixed(2)}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <p className="text-[10px] uppercase font-bold text-gray-400">Con Anticipos</p>
            <p className="text-xl font-bold text-gray-800 flex items-center gap-2"><FiUsers/> {resumen.trabajadores_con_anticipos}</p>
          </div>
          <div className="bg-amber-50 p-4 rounded-2xl shadow-sm border border-amber-100">
            <p className="text-[10px] uppercase font-bold text-amber-600">Sin Sueldo</p>
            <p className="text-xl font-bold text-amber-700 flex items-center gap-2"><FiAlertCircle/> {resumen.trabajadores_sin_sueldo}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-purple-100">
            <p className="text-[10px] uppercase font-bold text-purple-500">Exc. Autorizados</p>
            <p className="text-xl font-bold text-purple-700 flex items-center gap-2"><FiTrendingDown/> {resumen.anticipos_excedidos}</p>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-4">
          <div className="relative col-span-1 md:col-span-2">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" name="search" value={filtros.search} onChange={handleFilterChange}
              placeholder="Buscar por cédula o nombre..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-[#27A9E1] outline-none focus:bg-white"
            />
          </div>

          <select name="estado_personal" value={filtros.estado_personal} onChange={handleFilterChange} className="px-3 py-2 bg-gray-50 border rounded-xl text-sm">
            <option value="">Cualquier estado</option>
            <option value="ACTIVO">Activos</option>
            <option value="INACTIVO">Inactivos</option>
          </select>

          <select name="con_anticipos" value={filtros.con_anticipos} onChange={handleFilterChange} className="px-3 py-2 bg-gray-50 border rounded-xl text-sm">
            <option value="">Filtro Anticipos</option>
            <option value="true">Con anticipos registrados</option>
            <option value="false">Sin anticipos</option>
          </select>

          <select name="saldo_excedido" value={filtros.saldo_excedido} onChange={handleFilterChange} className="px-3 py-2 bg-gray-50 border rounded-xl text-sm">
            <option value="">Filtro Excedentes</option>
            <option value="true">Con autorización extraordinaria</option>
          </select>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500">
                <th className="px-4 py-3 font-medium">Trabajador</th>
                <th className="px-4 py-3 font-medium">Sueldo Base</th>
                <th className="px-4 py-3 font-medium text-green-600">H.Extras</th>
                <th className="px-4 py-3 font-medium text-red-500">Anticipos</th>
                <th className="px-4 py-3 font-medium text-blue-600">Neto Est.</th>
                <th className="px-4 py-3 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-sm">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-4 py-12 text-center text-gray-400">
                    <div className="w-8 h-8 border-4 border-[#27A9E1]/30 border-t-[#27A9E1] rounded-full animate-spin mx-auto mb-3"></div>
                    Cargando nómina...
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-12 text-center text-gray-500">No se encontraron registros.</td>
                </tr>
              ) : (
                data.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800">{item.nombre_completo}</div>
                      <div className="text-xs text-gray-500 font-mono mt-0.5">{item.codigo_interno} • {item.cargo_nombre}</div>
                    </td>
                    <td className="px-4 py-3">
                      {item.sueldo_base <= 0 ? (
                         <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">Sin configurar</span>
                      ) : (
                        <span className="font-mono text-gray-700">${parseFloat(item.sueldo_base).toFixed(2)}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-green-600">${parseFloat(item.ajustes.horas_extras).toFixed(2)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-red-600 font-bold">${parseFloat(item.total_anticipos).toFixed(2)}</span>
                        {item.tiene_excedente && <Badge variant="purple" className="text-[9px] px-1 py-0">EXC</Badge>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-mono font-bold ${item.neto_estimado < 0 ? 'text-red-500' : 'text-blue-600'}`}>
                        ${parseFloat(item.neto_estimado).toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openAnticipoModal(item)} disabled={item.sueldo_base <= 0} title="Registrar Anticipo" className="p-1.5 text-[#27A9E1] hover:bg-blue-50 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed">
                          <FiDollarSign size={16} />
                        </button>
                        <button onClick={() => openAjustesModal(item)} title="Ajustes (H.Extras, etc)" className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg">
                          <FiSettings size={16} />
                        </button>
                        <button onClick={() => openDrawer(item)} title="Ver Detalle" className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg">
                          <FiList size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between text-sm">
          <span className="text-gray-500">Página {pagination.page} de {pagination.totalPages}</span>
          <div className="flex gap-2">
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
              disabled={pagination.page === 1}
              className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 text-gray-600"
            >
              Anterior
            </button>
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              disabled={pagination.page === pagination.totalPages || pagination.totalPages === 0}
              className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 text-gray-600"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>

      {/* Modales */}
      <SueldoDetailDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        personalId={selectedTrabajador?.id}
        periodoId={filtros.periodo_id}
        mesAplicacion={filtros.mes}
        onDarAnticipo={(trabajador) => openAnticipoModal(trabajador)}
      />

      <AnticipoFormModal
        isOpen={anticipoModalOpen}
        onClose={() => setAnticipoModalOpen(false)}
        onSuccess={fetchData}
        personalId={selectedTrabajador?.id}
        nombrePersonal={selectedTrabajador ? `${selectedTrabajador.nombre_completo} - ${selectedTrabajador.cedula}` : null}
        periodoId={filtros.periodo_id}
        mesAplicacion={filtros.mes}
        saldoDisponible={selectedSueldo?.neto_estimado || 0}
      />

      <AjustesSueldoModal
        isOpen={ajustesModalOpen}
        onClose={() => setAjustesModalOpen(false)}
        onSuccess={fetchData}
        personalId={selectedTrabajador?.id}
        periodoId={filtros.periodo_id}
        mesAplicacion={filtros.mes}
        ajustesActuales={selectedSueldo?.ajustes}
        sueldoBase={selectedSueldo?.sueldo_base}
      />

      </div>
    </MainLayout>
  );
};

export default SueldosAnticiposPage;
