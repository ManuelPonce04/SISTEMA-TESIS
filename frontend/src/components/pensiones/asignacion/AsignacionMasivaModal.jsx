import React, { useState, useEffect } from 'react';
import { FiX, FiCheckCircle, FiAlertTriangle, FiUsers, FiFilter, FiInfo } from 'react-icons/fi';
import { getPeriodosLectivos, getNivelesEducativos, getCursos } from '../../../services/academicoService';
import { asignacionMasiva } from '../../../services/asignacionPensionService';
import Swal from 'sweetalert2';

const MESES = [
  { value: '05', label: 'Mayo' },
  { value: '06', label: 'Junio' },
  { value: '07', label: 'Julio' },
  { value: '08', label: 'Agosto' },
  { value: '09', label: 'Septiembre' },
  { value: '10', label: 'Octubre' },
  { value: '11', label: 'Noviembre' },
  { value: '12', label: 'Diciembre' },
  { value: '01', label: 'Enero' },
  { value: '02', label: 'Febrero' },
];

export default function AsignacionMasivaModal({ isOpen, onClose, onSuccess }) {
  const [periodos, setPeriodos] = useState([]);
  const [niveles, setNiveles] = useState([]);
  const [cursos, setCursos] = useState([]);
  
  const [formData, setFormData] = useState({
    periodo_id: '',
    nivel_id: '',
    curso_id: '',
    mes_desde: '',
    mes_hasta: '',
    motivo: 'Asignación masiva',
    crear_como_activa: false,
  });

  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setResultado(null);
      setFormData(prev => ({ ...prev, nivel_id: '', curso_id: '' }));
      cargarDatosIniciales();
    }
  }, [isOpen]);

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
          setFormData(prev => ({ ...prev, periodo_id: activo.id }));
          generarMeses(activo.nombre);
        }
      }
      if (resNiveles.success) setNiveles(resNiveles.data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (formData.nivel_id) {
      getCursos(formData.nivel_id).then(res => {
        if (res.success) setCursos(res.data);
      });
    } else {
      setCursos([]);
    }
  }, [formData.nivel_id]);

  useEffect(() => {
    if (formData.periodo_id) {
      const p = periodos.find(x => x.id === parseInt(formData.periodo_id));
      if (p) generarMeses(p.nombre);
    }
  }, [formData.periodo_id]);

  const [opcionesMeses, setOpcionesMeses] = useState([]);
  const generarMeses = (periodoNombre) => {
    const anioInicio = parseInt(periodoNombre.split('-')[0]) || new Date().getFullYear();
    const anioFin = parseInt(periodoNombre.split('-')[1]) || anioInicio + 1;
    
    const opciones = MESES.map((m, index) => {
      const anio = index >= 8 ? anioFin : anioInicio;
      return { value: `${anio}-${m.value}-01`, label: `${m.label} ${anio}` };
    });
    setOpcionesMeses(opciones);
    if (opciones.length > 0) {
      setFormData(prev => ({ ...prev, mes_desde: opciones[0].value, mes_hasta: opciones[opciones.length - 1].value }));
    }
  };

  const handleEjecutar = async () => {
    if (!formData.periodo_id || !formData.mes_desde || !formData.mes_hasta) {
      return Swal.fire('Atención', 'Complete los campos obligatorios', 'warning');
    }

    const { isConfirmed } = await Swal.fire({
      title: '¿Ejecutar Asignación Masiva?',
      text: `Se aplicará la tarifa configurada a todas las matrículas activas del ${formData.curso_id ? 'curso seleccionado' : formData.nivel_id ? 'nivel seleccionado' : 'periodo lectivo'}.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, ejecutar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#27A9E1',
    });

    if (!isConfirmed) return;

    setLoading(true);
    try {
      const res = await asignacionMasiva(formData);
      if (res.success) {
        setResultado(res.resultado);
        if (onSuccess) onSuccess();
      }
    } catch (error) {
      Swal.fire('Error', error.response?.data?.message || 'Error en asignación masiva', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <FiUsers className="text-[#27A9E1]" /> Asignación Masiva de Pensiones
          </h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-full transition-colors">
            <FiX size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          
          {!resultado ? (
            <div className="space-y-6">
              <div className="bg-blue-50 p-4 rounded-xl text-sm text-blue-800 flex items-start gap-3">
                <FiInfo size={20} className="flex-shrink-0 mt-0.5" />
                <p>
                  Esta herramienta asigna <strong>automáticamente</strong> la tarifa configurada a todos los estudiantes 
                  que no tengan una asignación activa. Las asignaciones masivas no incluyen beneficios/descuentos.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-bold text-gray-800 border-b pb-2 mb-4 flex items-center gap-2">
                    <FiFilter /> Filtros de Estudiantes
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Periodo Lectivo *</label>
                      <select value={formData.periodo_id} onChange={e => setFormData({ ...formData, periodo_id: e.target.value })} className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-[#27A9E1] outline-none">
                        <option value="">Seleccione...</option>
                        {periodos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nivel Educativo (Opcional)</label>
                      <select value={formData.nivel_id} onChange={e => setFormData({ ...formData, nivel_id: e.target.value, curso_id: '' })} className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-[#27A9E1] outline-none">
                        <option value="">Todos los niveles...</option>
                        {niveles.map(n => <option key={n.id} value={n.id}>{n.nombre}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Curso (Opcional)</label>
                      <select value={formData.curso_id} onChange={e => setFormData({ ...formData, curso_id: e.target.value })} disabled={!formData.nivel_id} className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-[#27A9E1] outline-none disabled:bg-gray-100 disabled:cursor-not-allowed">
                        <option value="">Todos los cursos...</option>
                        {cursos.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-gray-800 border-b pb-2 mb-4 flex items-center gap-2">
                    <FiCheckCircle /> Configuración de la Asignación
                  </h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Desde *</label>
                        <select value={formData.mes_desde} onChange={e => setFormData({ ...formData, mes_desde: e.target.value })} className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-[#27A9E1] outline-none">
                          {opcionesMeses.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Hasta *</label>
                        <select value={formData.mes_hasta} onChange={e => setFormData({ ...formData, mes_hasta: e.target.value })} className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-[#27A9E1] outline-none">
                          {opcionesMeses.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Motivo (Opcional)</label>
                      <input type="text" value={formData.motivo} onChange={e => setFormData({ ...formData, motivo: e.target.value })} className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-[#27A9E1] outline-none" />
                    </div>

                    <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl mt-4">
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input type="checkbox" checked={formData.crear_como_activa} onChange={e => setFormData({ ...formData, crear_como_activa: e.target.checked })} className="mt-1 w-4 h-4 text-[#27A9E1] border-gray-300 rounded focus:ring-[#27A9E1]" />
                        <div>
                          <span className="block text-sm font-bold text-gray-800">Aprobar y activar inmediatamente</span>
                          <span className="block text-xs text-gray-500 mt-1">
                            Si marca esta casilla, las asignaciones se crearán en estado <span className="font-bold text-emerald-600">ACTIVA</span>. De lo contrario, se crearán como <span className="font-bold text-gray-600">BORRADOR</span>.
                          </span>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // Pantalla de Resultados
            <div className="space-y-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FiCheckCircle size={32} />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Proceso Finalizado</h2>
                <p className="text-gray-500">Se han creado <strong>{resultado.creadas}</strong> nuevas asignaciones de pensión.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="bg-amber-50 border-b border-amber-100 px-4 py-3 flex items-center justify-between">
                    <h3 className="font-bold text-amber-800 text-sm flex items-center gap-2"><FiAlertTriangle /> Omitidas ({resultado.omitidas.length})</h3>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {resultado.omitidas.length === 0 ? (
                      <p className="text-sm text-gray-500 p-4 italic text-center">No hubo estudiantes omitidos.</p>
                    ) : (
                      <ul className="divide-y divide-gray-100">
                        {resultado.omitidas.map((o, i) => (
                          <li key={i} className="p-3 text-sm">
                            <div className="font-medium text-gray-800">{o.estudiante}</div>
                            <div className="text-xs flex justify-between mt-1 text-gray-500">
                              <span>Mat: {o.numero_matricula}</span>
                              <span className="text-amber-600 font-bold bg-amber-100/50 px-2 rounded-full">{o.razon}</span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="bg-red-50 border-b border-red-100 px-4 py-3 flex items-center justify-between">
                    <h3 className="font-bold text-red-800 text-sm flex items-center gap-2"><FiX /> Errores ({resultado.errores.length})</h3>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {resultado.errores.length === 0 ? (
                      <p className="text-sm text-gray-500 p-4 italic text-center">No ocurrieron errores durante el proceso.</p>
                    ) : (
                      <ul className="divide-y divide-gray-100">
                        {resultado.errores.map((e, i) => (
                          <li key={i} className="p-3 text-sm">
                            <div className="font-medium text-gray-800">{e.estudiante}</div>
                            <div className="text-xs text-red-500 mt-1">{e.error}</div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
          {resultado ? (
            <button onClick={onClose} className="px-6 py-2.5 bg-gray-800 text-white rounded-xl font-medium hover:bg-gray-900 transition-colors">
              Cerrar y ver resultados
            </button>
          ) : (
            <>
              <button onClick={onClose} disabled={loading} className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-100 transition-colors disabled:opacity-50">
                Cancelar
              </button>
              <button onClick={handleEjecutar} disabled={loading} className="px-6 py-2.5 bg-[#27A9E1] text-white rounded-xl font-bold hover:bg-[#1E8BBF] shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50">
                {loading ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : <FiCheckCircle />}
                Ejecutar Asignación
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
