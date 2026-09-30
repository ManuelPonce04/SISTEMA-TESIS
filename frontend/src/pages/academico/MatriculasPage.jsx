import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../../components/layout/MainLayout';
import matriculaService from '../../services/matriculaService';
import academicoService from '../../services/academicoService';
import { FiPlus, FiSearch, FiFilter, FiEye, FiDownload } from 'react-icons/fi';
import DetalleMatriculaDrawer from '../../components/academico/modals/DetalleMatriculaDrawer';

const MatriculasPage = () => {
  const navigate = useNavigate();
  const [matriculas, setMatriculas] = useState([]);
  const [periodos, setPeriodos] = useState([]);
  const [periodoActivo, setPeriodoActivo] = useState('');
  const [search, setSearch] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('');
  const [loading, setLoading] = useState(true);
  
  const [selectedMatricula, setSelectedMatricula] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    loadPeriodos();
  }, []);

  useEffect(() => {
    if (periodoActivo) {
      loadMatriculas();
    }
  }, [periodoActivo, search, estadoFilter]);

  const loadPeriodos = async () => {
    try {
      const res = await academicoService.getPeriodos();
      if (res.success) {
        setPeriodos(res.data);
        const activo = res.data.find(p => p.es_activo === 1);
        if (activo) setPeriodoActivo(activo.id);
        else if (res.data.length > 0) setPeriodoActivo(res.data[0].id);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const loadMatriculas = async () => {
    setLoading(true);
    try {
      const res = await matriculaService.getMatriculas({
        periodo_lectivo_id: periodoActivo,
        search,
        estado: estadoFilter
      });
      if (res.success) {
        setMatriculas(res.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const openDrawer = (matricula) => {
    setSelectedMatricula(matricula);
    setIsDrawerOpen(true);
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedMatricula(null);
    loadMatriculas(); // reload in case of changes
  };

  // KPIs
  const totalMatriculas = matriculas.length;
  const activas = matriculas.filter(m => m.estado === 'ACTIVA').length;
  const pagadas = matriculas.filter(m => parseFloat(m.saldo) <= 0 && m.estado !== 'ANULADA').length;
  const pendientes = matriculas.filter(m => parseFloat(m.saldo) > 0 && m.estado !== 'ANULADA').length;
  const nuevos = matriculas.filter(m => m.es_estudiante_nuevo === 1 && m.estado !== 'ANULADA').length;

  return (
    <MainLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Matrículas</h1>
            <p className="text-sm text-slate-500">Gestión de inscripciones y cupos del periodo lectivo</p>
          </div>
          <div className="flex gap-2">
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors shadow-sm text-sm font-medium">
              <FiDownload /> Exportar
            </button>
            <button 
              onClick={() => navigate('/gestion-academica/matriculas/nueva')}
              className="flex items-center gap-2 px-4 py-2 bg-[#27A9E1] text-white rounded-xl hover:bg-[#1f8ec0] transition-colors shadow-sm text-sm font-medium"
            >
              <FiPlus /> Nueva Matrícula
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col">
            <span className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">Total Inscritos</span>
            <span className="text-2xl font-bold text-slate-800">{totalMatriculas}</span>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col">
            <span className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">Activas</span>
            <span className="text-2xl font-bold text-green-600">{activas}</span>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col">
            <span className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">Pagadas</span>
            <span className="text-2xl font-bold text-blue-600">{pagadas}</span>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col">
            <span className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">Pend. Pago</span>
            <span className="text-2xl font-bold text-amber-500">{pendientes}</span>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col">
            <span className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">Nuevos</span>
            <span className="text-2xl font-bold text-purple-600">{nuevos}</span>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar estudiante, cédula o N° matrícula..."
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-[#27A9E1] focus:ring-1 focus:ring-[#27A9E1] text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="w-full md:w-64">
            <select 
              className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-[#27A9E1] text-sm"
              value={periodoActivo}
              onChange={(e) => setPeriodoActivo(e.target.value)}
            >
              {periodos.map(p => (
                <option key={p.id} value={p.id}>{p.nombre} {p.es_activo === 1 ? '(Activo)' : ''}</option>
              ))}
            </select>
          </div>
          <div className="w-full md:w-48 relative">
            <FiFilter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <select 
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-[#27A9E1] text-sm"
              value={estadoFilter}
              onChange={(e) => setEstadoFilter(e.target.value)}
            >
              <option value="">Todos los Estados</option>
              <option value="BORRADOR">Borrador</option>
              <option value="ACTIVA">Activa</option>
              <option value="PENDIENTE">Pendiente</option>
              <option value="ANULADA">Anulada</option>
            </select>
          </div>
        </div>

        {/* Listado */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold tracking-wider">
                  <th className="p-4">Estudiante</th>
                  <th className="p-4">Matrícula</th>
                  <th className="p-4">Oferta Académica</th>
                  <th className="p-4">Económico</th>
                  <th className="p-4">Estado</th>
                  <th className="p-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-slate-400">
                      Cargando matrículas...
                    </td>
                  </tr>
                ) : matriculas.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-slate-400">
                      No se encontraron matrículas en este periodo.
                    </td>
                  </tr>
                ) : (
                  matriculas.map(m => (
                    <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4">
                        <div className="font-semibold text-slate-800">
                          {m.estudiante_apellidos_nombres || `${m.estudiante_apellidos || ''} ${m.estudiante_nombres || ''}`.trim() || 'Estudiante'}
                        </div>
                        <div className="text-xs text-slate-500">{m.estudiante_cedula || m.estudiante_codigo || 'S/N'} • {m.es_estudiante_nuevo === 1 ? 'NUEVO' : 'ANTIGUO'}</div>
                      </td>
                      <td className="p-4">
                        <div className="font-medium text-slate-700">{m.numero_matricula}</div>
                        <div className="text-xs text-slate-500">{new Date(m.fecha_matricula).toLocaleDateString()}</div>
                      </td>
                      <td className="p-4">
                        <div className="font-medium text-slate-800">{m.curso_nombre} "{m.paralelo_nombre}"</div>
                        <div className="text-xs text-slate-500">{m.jornada_nombre || 'Sin Jornada'}</div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-xs font-medium text-slate-700">Total: ${parseFloat(m.valor_final).toFixed(2)}</span>
                          <span className={`text-xs font-medium ${parseFloat(m.saldo) > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                            Saldo: ${parseFloat(m.saldo).toFixed(2)}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wider ${
                          m.estado === 'ACTIVA' ? 'bg-green-100 text-green-700' :
                          m.estado === 'PENDIENTE' ? 'bg-amber-100 text-amber-700' :
                          m.estado === 'BORRADOR' ? 'bg-slate-100 text-slate-600' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {m.estado}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <button 
                          onClick={() => openDrawer(m)}
                          className="p-1.5 text-slate-400 hover:text-[#27A9E1] hover:bg-[#27A9E1]/10 rounded-lg transition-colors"
                          title="Ver Detalle"
                        >
                          <FiEye size={18} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {isDrawerOpen && selectedMatricula && (
        <DetalleMatriculaDrawer 
          matriculaId={selectedMatricula.id}
          onClose={closeDrawer}
        />
      )}
    </MainLayout>
  );
};

export default MatriculasPage;
