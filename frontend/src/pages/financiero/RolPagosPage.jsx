import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import nominaService from '../../services/nominaService';
import movimientosFinancierosService from '../../services/movimientosFinancierosService';
import personalCatalogosService from '../../services/personalCatalogosService';
import { FiPlus, FiList, FiCheckCircle, FiClock, FiFileText, FiRefreshCw, FiDollarSign } from 'react-icons/fi';
import Badge from '../../components/ui/Badge';
import { useAuth } from '../../context/AuthContext';
import MainLayout from '../../components/layout/MainLayout';

const RolPagosPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [periodos, setPeriodos] = useState([]);
  const [contratos, setContratos] = useState([]);
  
  const [filtros, setFiltros] = useState({
    periodo_id: '',
    mes: '',
    estado: ''
  });
  
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalPages: 1 });

  // Modal Generar
  const [showGenerar, setShowGenerar] = useState(false);
  const [generarData, setGenerarData] = useState({
    periodo_lectivo_id: '',
    mes: new Date().toISOString().split('T')[0].substring(0,8) + '01',
    tipo_personal_id: '',
    observacion: ''
  });
  const [generando, setGenerando] = useState(false);

  useEffect(() => {
    loadDependencies();
  }, []);

  useEffect(() => {
    fetchData();
  }, [filtros, pagination.page]);

  const loadDependencies = async () => {
    try {
      const [resPeriodos, resContratos] = await Promise.all([
        movimientosFinancierosService.getPeriodos(),
        personalCatalogosService.getTiposContrato()
      ]);
      if (resPeriodos.success) {
        setPeriodos(resPeriodos.data);
        const activo = resPeriodos.data.find(p => p.activo);
        if (activo) {
          setFiltros(prev => ({ ...prev, periodo_id: activo.id }));
          setGenerarData(prev => ({ ...prev, periodo_lectivo_id: activo.id }));
        }
      }
      if (resContratos.success) {
        setContratos(resContratos.data.filter(c => c.genera_nomina));
      }
    } catch (error) {
      console.error(error);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await nominaService.listarNominas({ ...filtros, page: pagination.page, limit: pagination.limit });
      if (res.success) {
        setData(res.data);
        setPagination(res.pagination);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerar = async (e) => {
    e.preventDefault();
    if (!user?.es_admin) return Swal.fire('Error', 'No tienes permisos para generar nóminas.', 'error');
    
    setGenerando(true);
    try {
      const payload = {
        ...generarData,
        descripcion_grupo: generarData.tipo_personal_id 
          ? contratos.find(c => c.id.toString() === generarData.tipo_personal_id)?.nombre 
          : 'TODO EL PERSONAL'
      };
      
      const res = await nominaService.generarNomina(payload);
      Swal.fire('¡Éxito!', 'Nómina generada en borrador.', 'success');
      setShowGenerar(false);
      fetchData();
      navigate(`/financiero/rol-pagos/${res.data.id}`); // Navigate directly to details
    } catch (error) {
      Swal.fire('Error', error.response?.data?.message || 'Error al generar la nómina', 'error');
    } finally {
      setGenerando(false);
    }
  };

  const getEstadoBadge = (estado) => {
    switch(estado) {
      case 'BORRADOR': return <Badge variant="blue"><FiClock className="mr-1"/> Borrador</Badge>;
      case 'REVISADA': return <Badge variant="warning"><FiCheckCircle className="mr-1"/> Revisada</Badge>;
      case 'CERRADA': return <Badge variant="gray"><FiFileText className="mr-1"/> Cerrada</Badge>;
      case 'PAGADA': return <Badge variant="success"><FiDollarSign className="mr-1"/> Pagada</Badge>;
      case 'ANULADA': return <Badge variant="danger">Anulada</Badge>;
      default: return <Badge variant="gray">{estado}</Badge>;
    }
  };

  const months = Array.from({length: 12}, (_, i) => {
    const d = new Date(2026, i, 1);
    return {
      val: `2026-${String(i+1).padStart(2, '0')}-01`, 
      label: d.toLocaleDateString('es-EC', {month: 'long', year: 'numeric'}).toUpperCase()
    };
  });

  return (
    <MainLayout title="Rol de Pagos" subtitle="Inicio / Control Financiero / Rol de pagos">
      <div className="max-w-7xl mx-auto animate-fade-in space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex-1">
          <p className="text-sm text-gray-500">Historial y generación de roles mensuales institucionales.</p>
        </div>
        
        <div className="flex gap-2">
          {user?.es_admin && (
            <button onClick={() => setShowGenerar(true)} className="px-4 py-2 bg-[#27A9E1] text-white rounded-xl shadow-md hover:bg-blue-600 transition-colors flex items-center gap-2 font-medium">
              <FiPlus /> Generar Rol de Pagos
            </button>
          )}
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6 flex flex-wrap gap-4">
        <select 
          value={filtros.periodo_id} onChange={(e) => { setFiltros(prev => ({...prev, periodo_id: e.target.value})); setPagination(prev => ({...prev, page: 1})); }}
          className="px-4 py-2 border rounded-xl text-sm min-w-[200px]"
        >
          <option value="">Todos los Periodos</option>
          {periodos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
        
        <select 
          value={filtros.mes} onChange={(e) => { setFiltros(prev => ({...prev, mes: e.target.value})); setPagination(prev => ({...prev, page: 1})); }}
          className="px-4 py-2 border rounded-xl text-sm min-w-[200px]"
        >
          <option value="">Todos los Meses</option>
          {months.map(m => <option key={m.val} value={m.val}>{m.label}</option>)}
        </select>

        <select 
          value={filtros.estado} onChange={(e) => { setFiltros(prev => ({...prev, estado: e.target.value})); setPagination(prev => ({...prev, page: 1})); }}
          className="px-4 py-2 border rounded-xl text-sm min-w-[150px]"
        >
          <option value="">Cualquier Estado</option>
          <option value="BORRADOR">Borrador</option>
          <option value="REVISADA">Revisada</option>
          <option value="CERRADA">Cerrada</option>
          <option value="PAGADA">Pagada</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500">
              <th className="px-4 py-3 font-medium">Periodo / Mes</th>
              <th className="px-4 py-3 font-medium">Grupo</th>
              <th className="px-4 py-3 font-medium text-right">Cant.</th>
              <th className="px-4 py-3 font-medium text-right">Neto a Pagar</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan="6" className="p-8 text-center text-gray-400">Cargando nóminas...</td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan="6" className="p-8 text-center text-gray-400">No hay nóminas registradas.</td></tr>
            ) : data.map(item => (
              <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-4">
                  <div className="font-bold text-gray-800">{new Date(item.mes).toLocaleDateString('es-EC', {month:'long', year:'numeric'}).toUpperCase()}</div>
                  <div className="text-xs text-gray-500">{item.periodo_nombre}</div>
                </td>
                <td className="px-4 py-4">
                  <span className="font-medium">{item.descripcion_grupo || 'TODO EL PERSONAL'}</span>
                  <div className="text-[10px] text-gray-400 mt-1">Por: {item.generado_por_nombre}</div>
                </td>
                <td className="px-4 py-4 text-right font-mono text-gray-600">{item.cantidad_personal}</td>
                <td className="px-4 py-4 text-right">
                  <div className="font-bold font-mono text-lg text-blue-600">${parseFloat(item.total_neto).toFixed(2)}</div>
                  <div className="text-[10px] text-gray-400">Ing: ${parseFloat(item.total_ingresos).toFixed(2)} | Egr: ${parseFloat(item.total_egresos).toFixed(2)}</div>
                </td>
                <td className="px-4 py-4">
                  {getEstadoBadge(item.estado)}
                </td>
                <td className="px-4 py-4 text-center">
                  <button onClick={() => navigate(`/financiero/rol-pagos/${item.id}`)} className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium transition-colors">
                    Ver Detalles
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between text-sm">
          <span className="text-gray-500">Página {pagination.page} de {pagination.totalPages}</span>
          <div className="flex gap-2">
            <button onClick={() => setPagination(prev => ({...prev, page: prev.page - 1}))} disabled={pagination.page===1} className="px-3 py-1 bg-white border rounded hover:bg-gray-50 disabled:opacity-50">Anterior</button>
            <button onClick={() => setPagination(prev => ({...prev, page: prev.page + 1}))} disabled={pagination.page===pagination.totalPages || pagination.totalPages===0} className="px-3 py-1 bg-white border rounded hover:bg-gray-50 disabled:opacity-50">Siguiente</button>
          </div>
        </div>
      </div>

      {showGenerar && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="bg-[#27A9E1] px-6 py-4 flex justify-between items-center text-white">
              <h3 className="font-bold text-lg">Generar Rol de Pagos</h3>
              <button onClick={() => setShowGenerar(false)} className="text-white/70 hover:text-white"><FiList /></button>
            </div>
            
            <form onSubmit={handleGenerar} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Periodo Lectivo</label>
                <select required value={generarData.periodo_lectivo_id} onChange={e => setGenerarData({...generarData, periodo_lectivo_id: e.target.value})} className="w-full px-4 py-2 border rounded-xl focus:ring-[#27A9E1] outline-none">
                  <option value="">Seleccione...</option>
                  {periodos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mes a procesar</label>
                <select required value={generarData.mes} onChange={e => setGenerarData({...generarData, mes: e.target.value})} className="w-full px-4 py-2 border rounded-xl focus:ring-[#27A9E1] outline-none">
                  {months.map(m => <option key={m.val} value={m.val}>{m.label}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Grupo de Personal</label>
                <select value={generarData.tipo_personal_id} onChange={e => setGenerarData({...generarData, tipo_personal_id: e.target.value})} className="w-full px-4 py-2 border rounded-xl focus:ring-[#27A9E1] outline-none">
                  <option value="">TODO EL PERSONAL (Que genera nómina)</option>
                  {contratos.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observación (Opcional)</label>
                <input type="text" value={generarData.observacion} onChange={e => setGenerarData({...generarData, observacion: e.target.value})} placeholder="Ej. Nómina ordinaria..." className="w-full px-4 py-2 border rounded-xl focus:ring-[#27A9E1] outline-none" />
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t">
                <button type="button" onClick={() => setShowGenerar(false)} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl">Cancelar</button>
                <button type="submit" disabled={generando} className="px-4 py-2 text-sm text-white bg-[#27A9E1] hover:bg-blue-600 rounded-xl disabled:opacity-50 flex items-center gap-2">
                  {generando ? <FiRefreshCw className="animate-spin"/> : <FiCheckCircle />} Generar Borrador
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      </div>
    </MainLayout>
  );
};

export default RolPagosPage;
