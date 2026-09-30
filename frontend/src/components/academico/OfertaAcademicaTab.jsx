import React, { useState, useEffect } from 'react';
import { FiPlus, FiCopy, FiLayers, FiGrid } from 'react-icons/fi';
import academicoService from '../../services/academicoService';
import Swal from 'sweetalert2';
import OfertaMasivaModal from './modals/OfertaMasivaModal';

const OfertaAcademicaTab = () => {
  const [ofertas, setOfertas] = useState([]);
  const [periodos, setPeriodos] = useState([]);
  const [periodoActivoId, setPeriodoActivoId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMasivaModalOpen, setIsMasivaModalOpen] = useState(false);

  const fetchDatosInit = async () => {
    try {
      setLoading(true);
      const [resPeriodos, resActivo] = await Promise.all([
        academicoService.getPeriodos(),
        academicoService.getPeriodoActivo()
      ]);
      
      if (resPeriodos.success) setPeriodos(resPeriodos.data);
      
      let pActivo = resActivo.success && resActivo.data ? resActivo.data.id : null;
      if (!pActivo && resPeriodos.data.length > 0) pActivo = resPeriodos.data[0].id;
      
      setPeriodoActivoId(pActivo);
      
      if (pActivo) {
        await fetchOfertas(pActivo);
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  const fetchOfertas = async (pid) => {
    try {
      setLoading(true);
      const res = await academicoService.getOfertas(pid);
      if (res.success) setOfertas(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDatosInit();
  }, []);

  const handlePeriodoChange = (e) => {
    const pid = e.target.value;
    setPeriodoActivoId(pid);
    fetchOfertas(pid);
  };

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Oferta Académica</h2>
          <p className="text-sm text-slate-500 mt-1">Cursos habilitados para el periodo seleccionado.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <select 
            value={periodoActivoId || ''} 
            onChange={handlePeriodoChange}
            className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 outline-none focus:border-[#27A9E1] transition-colors"
          >
            {periodos.map(p => (
              <option key={p.id} value={p.id}>{p.nombre} {p.es_activo ? '(Activo)' : ''}</option>
            ))}
            {periodos.length === 0 && <option value="">Sin periodos</option>}
          </select>
          
          <button 
            onClick={() => setIsMasivaModalOpen(true)}
            disabled={!periodoActivoId}
            className="flex items-center justify-center gap-2 bg-[#27A9E1] text-white px-4 py-2 rounded-xl font-medium hover:bg-[#1a85b5] transition-colors shadow-sm disabled:opacity-50"
          >
            <FiLayers /> Creación Masiva
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#27A9E1]"></div></div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 text-sm border-b border-slate-200">
                <th className="p-4 font-semibold">Curso</th>
                <th className="p-4 font-semibold text-center">Paralelo</th>
                <th className="p-4 font-semibold">Jornada</th>
                <th className="p-4 font-semibold text-center">Cupo Max.</th>
                <th className="p-4 font-semibold">Tutor / Aula</th>
                <th className="p-4 font-semibold">Estado</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {ofertas.map(o => (
                <tr key={o.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="p-4 font-medium text-slate-800">{o.curso_nombre}</td>
                  <td className="p-4 text-center">
                    <span className="bg-[#27A9E1]/10 text-[#27A9E1] font-bold px-3 py-1 rounded-lg text-lg">{o.paralelo_nombre}</span>
                  </td>
                  <td className="p-4 text-slate-600">{o.jornada_nombre || '-'}</td>
                  <td className="p-4 text-center font-medium text-slate-700">{o.cupo_maximo || 'N/D'}</td>
                  <td className="p-4">
                    <div className="text-slate-700">{o.tutor_nombre || <span className="text-slate-400 italic">Sin tutor asignado</span>}</div>
                    <div className="text-xs text-slate-500 mt-0.5">Aula: {o.aula || 'No asignada'}</div>
                  </td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                      o.estado === 'ACTIVA' ? 'bg-green-100 text-green-700' :
                      o.estado === 'PLANIFICADA' ? 'bg-amber-100 text-amber-700' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {o.estado}
                    </span>
                  </td>
                </tr>
              ))}
              {ofertas.length === 0 && (
                <tr>
                  <td colSpan="6" className="p-12 text-center">
                    <div className="inline-flex flex-col items-center justify-center text-slate-500">
                      <FiGrid size={48} className="mb-4 text-slate-300" />
                      <p className="text-lg font-medium">No hay oferta académica para este periodo</p>
                      <p className="text-sm mt-1 mb-4">Utiliza la creación masiva para configurar los cursos y paralelos rápidamente.</p>
                      <button 
                        onClick={() => setIsMasivaModalOpen(true)}
                        className="bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg font-medium hover:bg-slate-50 transition-colors"
                      >
                        Iniciar Creación Masiva
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {isMasivaModalOpen && (
        <OfertaMasivaModal 
          isOpen={isMasivaModalOpen} 
          onClose={() => setIsMasivaModalOpen(false)} 
          periodoId={periodoActivoId}
          onSave={() => fetchOfertas(periodoActivoId)} 
        />
      )}
    </div>
  );
};

// Se requiere importar FiGrid arriba (import { FiPlus, FiCopy, FiLayers, FiGrid } from 'react-icons/fi';)
export default OfertaAcademicaTab;
