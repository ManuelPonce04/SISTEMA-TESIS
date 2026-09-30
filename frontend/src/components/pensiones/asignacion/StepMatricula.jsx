import React, { useState, useEffect } from 'react';
import { getMatriculasDisponibles } from '../../../services/asignacionPensionService';
import { getPeriodosLectivos } from '../../../services/academicoService';
import { FiSearch, FiUser } from 'react-icons/fi';

export default function StepMatricula({ formData, updateFormData }) {
  const [periodos, setPeriodos] = useState([]);
  const [periodoId, setPeriodoId] = useState('');
  const [search, setSearch] = useState('');
  const [matriculas, setMatriculas] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getPeriodosLectivos().then(res => {
      if (res.success) {
        setPeriodos(res.data);
        const activo = res.data.find(p => p.es_activo === 1 || p.es_activo === true);
        if (activo) setPeriodoId(activo.id);
        else if (res.data.length > 0) setPeriodoId(res.data[0].id);
      }
    });
  }, []);

  useEffect(() => {
    if (!periodoId) return;
    const delayDebounceFn = setTimeout(() => {
      searchMatriculas();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
    // eslint-disable-next-line
  }, [search, periodoId]);

  const searchMatriculas = async () => {
    setLoading(true);
    try {
      const res = await getMatriculasDisponibles({ periodo_lectivo_id: periodoId, search, limit: 10 });
      if (res.success) setMatriculas(res.matriculas);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">Seleccionar Matrícula</h2>
        <p className="text-sm text-gray-500">Busque y seleccione el estudiante al que desea asignarle la pensión.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Periodo Lectivo</label>
          <select
            value={periodoId}
            onChange={e => setPeriodoId(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-[#27A9E1] focus:border-transparent outline-none"
          >
            {periodos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </div>
        <div className="md:col-span-2 relative">
          <label className="block text-sm font-medium text-gray-700 mb-1">Buscar estudiante</label>
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Nombres, apellidos, cédula o Nro. matrícula..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#27A9E1] outline-none"
            />
          </div>
        </div>
      </div>

      <div className="border border-gray-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Buscando...</div>
        ) : matriculas.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No se encontraron matrículas activas.</div>
        ) : (
          <ul className="divide-y divide-gray-100 max-h-[300px] overflow-y-auto">
            {matriculas.map(m => (
              <li 
                key={m.id}
                onClick={() => updateFormData('matriculaId', m.id)}
                className={`p-4 cursor-pointer transition-colors flex items-center gap-4 ${
                  formData.matriculaId === m.id ? 'bg-blue-50 border-l-4 border-[#27A9E1]' : 'hover:bg-gray-50 border-l-4 border-transparent'
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  formData.matriculaId === m.id ? 'bg-[#27A9E1] text-white' : 'bg-gray-100 text-gray-500'
                }`}>
                  <FiUser size={18} />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-gray-900 text-sm">{m.nombres} {m.apellidos}</h4>
                  <div className="text-xs text-gray-500 flex gap-3 mt-1">
                    <span><strong className="text-gray-700">Matrícula:</strong> {m.numero_matricula}</span>
                    <span><strong className="text-gray-700">Curso:</strong> {m.curso_nombre} "{m.paralelo_nombre}"</span>
                  </div>
                </div>
                {m.tiene_asignacion > 0 && (
                  <span className="px-2 py-1 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full">
                    Ya tiene asignación
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {formData.matriculaData && formData.matriculaId && (
        <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
          <h4 className="font-bold text-sm text-gray-800 mb-2">Resumen de la Matrícula Seleccionada</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-500 block text-xs">Estudiante</span>
              <span className="font-medium">{formData.matriculaData.nombres} {formData.matriculaData.apellidos}</span>
            </div>
            <div>
              <span className="text-gray-500 block text-xs">Nivel / Curso</span>
              <span className="font-medium">{formData.matriculaData.nivel_nombre} - {formData.matriculaData.curso_nombre}</span>
            </div>
            <div>
              <span className="text-gray-500 block text-xs">Representante</span>
              <span className="font-medium">{formData.matriculaData.rep_nombres} {formData.matriculaData.rep_apellidos}</span>
            </div>
            <div>
              <span className="text-gray-500 block text-xs">Resp. Económico</span>
              <span className="font-medium">{formData.matriculaData.resp_nombres} {formData.matriculaData.resp_apellidos}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
