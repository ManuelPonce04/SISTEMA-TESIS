import React, { useState, useEffect } from 'react';
import { FiX, FiCheckCircle, FiAlertTriangle, FiUser, FiSearch, FiDollarSign } from 'react-icons/fi';
import { getMesesDisponibles, generarMensualidadIndividual } from '../../../services/mensualidadService';
import { getMatriculasDisponibles } from '../../../services/asignacionPensionService';
import { getPeriodosLectivos } from '../../../services/academicoService';
import Swal from 'sweetalert2';

export default function GeneracionIndividualModal({ isOpen, onClose, onSuccess }) {
  const [periodos, setPeriodos] = useState([]);
  const [periodoId, setPeriodoId] = useState('');
  const [search, setSearch] = useState('');
  const [matriculas, setMatriculas] = useState([]);
  const [selectedMatricula, setSelectedMatricula] = useState(null);
  
  const [meses, setMeses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      resetState();
      cargarPeriodos();
    }
  }, [isOpen]);

  const resetState = () => {
    setSearch('');
    setMatriculas([]);
    setSelectedMatricula(null);
    setMeses([]);
  };

  const cargarPeriodos = async () => {
    const res = await getPeriodosLectivos();
    if (res.success) {
      setPeriodos(res.data);
      const activo = res.data.find(p => p.es_activo === 1 || p.es_activo === true);
      if (activo) setPeriodoId(activo.id);
    }
  };

  useEffect(() => {
    if (!periodoId || selectedMatricula) return;
    const delay = setTimeout(() => {
      buscarMatriculas();
    }, 500);
    return () => clearTimeout(delay);
    // eslint-disable-next-line
  }, [search, periodoId]);

  const buscarMatriculas = async () => {
    setLoading(true);
    try {
      const res = await getMatriculasDisponibles({ periodo_lectivo_id: periodoId, search, limit: 10 });
      if (res.success) setMatriculas(res.matriculas);
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  };

  const seleccionarMatricula = async (m) => {
    setSelectedMatricula(m);
    setLoading(true);
    try {
      const res = await getMesesDisponibles(m.id);
      if (res.success) {
        setMeses(res.meses);
        if (!res.asignacion_id) {
          Swal.fire('Atención', 'Este estudiante no tiene una asignación de pensión activa. Debe asignarle una antes de generar mensualidades.', 'warning');
        }
      }
    } catch (error) {
      Swal.fire('Error', 'No se pudieron cargar los meses', 'error');
    }
    setLoading(false);
  };

  const handleGenerar = async (mes) => {
    if (!mes.puedeGenerarse) return;
    
    setProcessing(true);
    try {
      const res = await generarMensualidadIndividual({
        matricula_id: selectedMatricula.id,
        mes_cobrable_id: mes.id
      });
      if (res.success) {
        Swal.fire({
          title: '¡Generada!',
          text: `Mensualidad generada con código ${res.codigo}`,
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });
        // Recargar meses
        seleccionarMatricula(selectedMatricula);
        if (onSuccess) onSuccess();
      }
    } catch (error) {
      Swal.fire('Error', error.response?.data?.message || 'Error al generar', 'error');
    }
    setProcessing(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl flex flex-col overflow-hidden max-h-[90vh]">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <FiDollarSign className="text-[#27A9E1]" /> Generación Individual
          </h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-200 rounded-full transition-colors"><FiX size={20} /></button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 bg-gray-50/30">
          {!selectedMatricula ? (
            <div className="space-y-4">
              <div className="flex gap-4">
                <select value={periodoId} onChange={e => setPeriodoId(e.target.value)} className="w-1/3 border border-gray-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-[#27A9E1]">
                  {periodos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
                <div className="relative flex-1">
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="text" placeholder="Buscar estudiante (nombres, cédula)..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm outline-none focus:ring-[#27A9E1]" />
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                {loading ? (
                  <div className="p-8 text-center text-gray-500">Buscando...</div>
                ) : matriculas.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">No hay resultados.</div>
                ) : (
                  <ul className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
                    {matriculas.map(m => (
                      <li key={m.id} onClick={() => seleccionarMatricula(m)} className="p-4 hover:bg-blue-50 cursor-pointer flex gap-4 items-center transition-colors">
                        <div className="w-10 h-10 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center"><FiUser /></div>
                        <div>
                          <p className="font-bold text-gray-800 text-sm">{m.nombres} {m.apellidos}</p>
                          <p className="text-xs text-gray-500 mt-1">Matrícula: {m.numero_matricula} • {m.curso_nombre}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-[#27A9E1] flex items-center justify-center font-bold text-lg">
                    {selectedMatricula.nombres[0]}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800">{selectedMatricula.nombres} {selectedMatricula.apellidos}</h3>
                    <p className="text-xs text-gray-500">Mat: {selectedMatricula.numero_matricula} • {selectedMatricula.curso_nombre}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedMatricula(null)} className="text-xs text-[#27A9E1] font-bold hover:underline">Cambiar estudiante</button>
              </div>

              <div>
                <h4 className="font-bold text-gray-700 mb-3 border-b pb-2">Meses Cobrables</h4>
                {loading ? (
                  <div className="text-center p-6"><div className="animate-spin h-8 w-8 border-b-2 border-[#27A9E1] mx-auto rounded-full"></div></div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {meses.map(m => (
                      <div key={m.id} className={`p-4 rounded-xl border ${m.puedeGenerarse ? 'bg-white border-emerald-200 shadow-sm' : 'bg-gray-50 border-gray-200 opacity-70'} flex justify-between items-center`}>
                        <div>
                          <p className="font-bold text-gray-800 text-sm">{m.nombre}</p>
                          {m.puedeGenerarse ? (
                            <p className="text-[10px] text-gray-500 uppercase mt-1">Emisión: {new Date(m.fecha_emision || m.mes).toLocaleDateString('es-EC')}</p>
                          ) : (
                            <p className="text-[10px] text-red-500 font-bold uppercase mt-1 flex items-center gap-1"><FiAlertTriangle/> {m.razonNoGenerable}</p>
                          )}
                        </div>
                        {m.puedeGenerarse && (
                          <button 
                            onClick={() => handleGenerar(m)}
                            disabled={processing}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-sm disabled:opacity-50"
                          >
                            Generar
                          </button>
                        )}
                        {!m.puedeGenerarse && m.razonNoGenerable?.includes('generada') && (
                          <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold"><FiCheckCircle className="inline" /> Lista</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
