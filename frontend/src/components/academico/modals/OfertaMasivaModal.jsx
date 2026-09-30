import React, { useState, useEffect } from 'react';
import { FiX } from 'react-icons/fi';
import academicoService from '../../../services/academicoService';
import Swal from 'sweetalert2';

const OfertaMasivaModal = ({ isOpen, onClose, periodoId, onSave }) => {
  const [cursos, setCursos] = useState([]);
  const [paralelos, setParalelos] = useState([]);
  const [jornadas, setJornadas] = useState([]);
  const [loadingInit, setLoadingInit] = useState(true);
  
  const [selectedCursos, setSelectedCursos] = useState([]);
  const [selectedParalelos, setSelectedParalelos] = useState([]);
  const [selectedJornada, setSelectedJornada] = useState('');
  const [cupoMaximo, setCupoMaximo] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingInit(true);
        const [resC, resP, resJ] = await Promise.all([
          academicoService.getCursos(),
          academicoService.getParalelos(),
          academicoService.getJornadas()
        ]);
        if (resC.success) setCursos(resC.data);
        if (resP.success) setParalelos(resP.data);
        if (resJ.success) setJornadas(resJ.data);
        
        if (resJ.data && resJ.data.length > 0) {
           setSelectedJornada(resJ.data[0].id);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoadingInit(false);
      }
    };
    if (isOpen) fetchData();
  }, [isOpen]);

  const toggleCurso = (id) => {
    if (selectedCursos.includes(id)) setSelectedCursos(selectedCursos.filter(c => c !== id));
    else setSelectedCursos([...selectedCursos, id]);
  };

  const toggleParalelo = (id) => {
    if (selectedParalelos.includes(id)) setSelectedParalelos(selectedParalelos.filter(p => p !== id));
    else setSelectedParalelos([...selectedParalelos, id]);
  };

  const selectAllCursos = () => setSelectedCursos(cursos.map(c => c.id));
  const selectAllParalelos = () => setSelectedParalelos(paralelos.map(p => p.id));
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedCursos.length === 0 || selectedParalelos.length === 0) {
      Swal.fire('Error', 'Debe seleccionar al menos un curso y un paralelo', 'warning');
      return;
    }
    
    setIsSaving(true);
    try {
      const payload = {
        periodo_lectivo_id: periodoId,
        cursos: selectedCursos,
        paralelos: selectedParalelos,
        jornada_id: selectedJornada || null,
        cupo_maximo: cupoMaximo || null
      };
      
      const res = await academicoService.creacionMasivaOfertas(payload);
      if (res.success) {
        Swal.fire('Éxito', res.message, 'success');
        onSave();
        onClose();
      } else {
        Swal.fire('Error', res.message, 'error');
      }
    } catch (error) {
      Swal.fire('Error', 'Hubo un problema al crear la oferta', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden animate-slide-up flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Creación Masiva de Oferta Académica</h3>
            <p className="text-xs text-slate-500 mt-1">Se crearán las combinaciones de los cursos y paralelos seleccionados.</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg transition-colors">
            <FiX size={20} />
          </button>
        </div>
        
        {loadingInit ? (
          <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#27A9E1]"></div></div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                {/* Cursos */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="block text-sm font-bold text-slate-700">1. Seleccionar Cursos</label>
                    <button type="button" onClick={selectAllCursos} className="text-xs text-[#27A9E1] font-medium hover:underline">Seleccionar Todos</button>
                  </div>
                  <div className="border border-slate-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto custom-scrollbar">
                    {cursos.map(c => (
                      <label key={c.id} className="flex items-center gap-3 p-3 border-b border-slate-100 hover:bg-slate-50 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={selectedCursos.includes(c.id)}
                          onChange={() => toggleCurso(c.id)}
                          className="w-4 h-4 text-[#27A9E1] border-slate-300 rounded focus:ring-[#27A9E1]"
                        />
                        <span className="text-sm font-medium text-slate-700">{c.nombre} <span className="text-slate-400 font-normal">({c.nivel_nombre})</span></span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Paralelos y Opciones */}
                <div>
                  <div className="mb-8">
                    <div className="flex justify-between items-center mb-3">
                      <label className="block text-sm font-bold text-slate-700">2. Seleccionar Paralelos</label>
                      <button type="button" onClick={selectAllParalelos} className="text-xs text-[#27A9E1] font-medium hover:underline">Seleccionar Todos</button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {paralelos.map(p => (
                        <label key={p.id} className={`flex items-center justify-center gap-2 p-3 border rounded-xl cursor-pointer transition-colors ${
                          selectedParalelos.includes(p.id) ? 'border-[#27A9E1] bg-[#27A9E1]/10 text-[#27A9E1]' : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                        }`}>
                          <input 
                            type="checkbox" 
                            checked={selectedParalelos.includes(p.id)}
                            onChange={() => toggleParalelo(p.id)}
                            className="hidden"
                          />
                          <span className="text-base font-bold">{p.nombre}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="mb-5">
                    <label className="block text-sm font-bold text-slate-700 mb-2">3. Jornada</label>
                    <select 
                      value={selectedJornada} 
                      onChange={e => setSelectedJornada(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#27A9E1] outline-none"
                    >
                      {jornadas.map(j => (
                        <option key={j.id} value={j.id}>{j.nombre}</option>
                      ))}
                      <option value="">(Sin Jornada)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">4. Cupo Máximo por Aula (Opcional)</label>
                    <input 
                      type="number" 
                      min="1"
                      placeholder="Ej. 35"
                      value={cupoMaximo} 
                      onChange={e => setCupoMaximo(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#27A9E1] outline-none"
                    />
                  </div>
                </div>
              </div>
              
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                <span className="text-amber-500 font-bold text-xl mt-0.5">!</span>
                <p className="text-sm text-amber-800">Se generarán <b>{selectedCursos.length * selectedParalelos.length}</b> registros de oferta académica. Los cursos que ya cuenten con los paralelos seleccionados en este periodo serán omitidos para evitar duplicados.</p>
              </div>

            </div>
            
            <div className="flex justify-end gap-3 p-5 border-t border-slate-100 bg-slate-50">
              <button type="button" onClick={onClose} className="px-5 py-2 text-slate-600 hover:bg-slate-200 rounded-xl font-medium transition-colors">Cancelar</button>
              <button 
                type="submit" 
                disabled={isSaving || selectedCursos.length === 0 || selectedParalelos.length === 0} 
                className="px-6 py-2 bg-[#27A9E1] text-white rounded-xl font-bold hover:bg-[#1a85b5] transition-colors shadow-md disabled:opacity-50"
              >
                {isSaving ? 'Generando...' : 'Generar Oferta'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default OfertaMasivaModal;
