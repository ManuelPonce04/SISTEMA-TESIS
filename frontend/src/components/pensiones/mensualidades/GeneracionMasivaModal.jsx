import React, { useState, useEffect } from 'react';
import { FiX, FiLayers, FiAlertCircle } from 'react-icons/fi';
// In a real implementation this would call the bulk generation API endpoint
// import { generarMasivo } from '../../../services/mensualidadService';
import { getPeriodosLectivos, getNivelesEducativos, getCursos } from '../../../services/academicoService';
import api from '../../../services/api';
import Swal from 'sweetalert2';

export default function GeneracionMasivaModal({ isOpen, onClose, onSuccess }) {
  const [periodos, setPeriodos] = useState([]);
  const [niveles, setNiveles] = useState([]);
  const [cursos, setCursos] = useState([]);
  const [mesesCobrables, setMesesCobrables] = useState([]);
  
  const [filters, setFilters] = useState({
    periodo_lectivo_id: '',
    mes_cobrable_id: '',
    nivel_id: '',
    curso_id: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      cargarCatalogos();
    }
  }, [isOpen]);

  const cargarCatalogos = async () => {
    try {
      const [resP, resN] = await Promise.all([getPeriodosLectivos(), getNivelesEducativos()]);
      if (resP.success) {
        setPeriodos(resP.data);
        const activo = resP.data.find(p => p.es_activo === 1 || p.es_activo === true);
        if (activo) setFilters(f => ({ ...f, periodo_lectivo_id: activo.id }));
      }
      if (resN.success) setNiveles(resN.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (filters.periodo_lectivo_id) cargarMeses(filters.periodo_lectivo_id);
  }, [filters.periodo_lectivo_id]);

  useEffect(() => {
    if (filters.nivel_id) {
      getCursos(filters.nivel_id).then(res => {
        if (res.success) setCursos(res.data);
      });
    } else {
      setCursos([]);
      setFilters(f => ({ ...f, curso_id: '' }));
    }
  }, [filters.nivel_id]);

  const cargarMeses = async (periodoId) => {
    try {
      const res = await api.get(`/pensiones/configuracion/periodo-meses/${periodoId}`);
      if (res.data.success) setMesesCobrables(res.data.meses.filter(m => m.cobrable === 1));
    } catch (e) {}
  };

  const handlePreview = async (e) => {
    e.preventDefault();
    if (!filters.periodo_lectivo_id || !filters.mes_cobrable_id) {
      return Swal.fire('Atención', 'Debe seleccionar un periodo y un mes.', 'warning');
    }
    
    // Aquí se llamaría a /api/pensiones/mensualidades/generar-masivo en modo preview
    // Para simplificar la demo, simulamos la llamada
    setProcessing(true);
    setTimeout(() => {
      setProcessing(false);
      Swal.fire({
        title: 'Funcionalidad en Desarrollo',
        text: 'La previsualización y generación masiva de lotes se encuentra en la siguiente fase de desarrollo del módulo de cobranzas.',
        icon: 'info'
      });
    }, 1500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-800 text-white">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <FiLayers /> Generación Masiva de Mensualidades
          </h2>
          <button onClick={onClose} className="p-2 text-gray-300 hover:text-white rounded-full transition-colors"><FiX size={20} /></button>
        </div>

        <div className="p-6 overflow-y-auto">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3 mb-6">
             <FiAlertCircle className="text-blue-500 mt-1 flex-shrink-0" size={20} />
             <div className="text-sm text-blue-800">
               <p className="font-bold">¿Cómo funciona la generación masiva?</p>
               <p className="mt-1">Seleccione un mes y los filtros deseados. El sistema consultará todas las matrículas activas, verificará sus asignaciones de pensión vigentes y detectará a quiénes les falta generar la obligación.</p>
               <p className="mt-1"><b>No se generarán duplicados.</b> Se mostrará una vista previa antes de confirmar.</p>
             </div>
          </div>

          <form onSubmit={handlePreview} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Periodo Lectivo *</label>
              <select value={filters.periodo_lectivo_id} onChange={e => setFilters({ ...filters, periodo_lectivo_id: e.target.value })} className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm outline-none focus:ring-gray-800" required>
                <option value="">Seleccione...</option>
                {periodos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mes a Generar *</label>
              <select value={filters.mes_cobrable_id} onChange={e => setFilters({ ...filters, mes_cobrable_id: e.target.value })} className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm outline-none focus:ring-gray-800" required>
                <option value="">Seleccione el mes...</option>
                {mesesCobrables.map(m => <option key={m.id} value={m.id}>{m.nombre_mostrar}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nivel Educativo (Opcional)</label>
              <select value={filters.nivel_id} onChange={e => setFilters({ ...filters, nivel_id: e.target.value })} className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm outline-none focus:ring-gray-800">
                <option value="">Todos los niveles</option>
                {niveles.map(n => <option key={n.id} value={n.id}>{n.nombre}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Curso (Opcional)</label>
              <select value={filters.curso_id} onChange={e => setFilters({ ...filters, curso_id: e.target.value })} className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm outline-none focus:ring-gray-800" disabled={!filters.nivel_id}>
                <option value="">Todos los cursos</option>
                {cursos.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
          </form>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2 text-gray-600 font-medium hover:bg-gray-200 rounded-xl text-sm transition-colors">Cancelar</button>
          <button onClick={handlePreview} disabled={processing} className="px-5 py-2 bg-gray-800 hover:bg-gray-900 text-white font-medium rounded-xl text-sm transition-colors flex items-center gap-2 disabled:opacity-50">
            {processing ? 'Consultando...' : 'Generar Vista Previa'}
          </button>
        </div>
      </div>
    </div>
  );
}
