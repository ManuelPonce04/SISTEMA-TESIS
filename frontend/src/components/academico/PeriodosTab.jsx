import React, { useState, useEffect } from 'react';
import { FiPlus, FiEdit2, FiCheckCircle } from 'react-icons/fi';
import academicoService from '../../services/academicoService';
import Swal from 'sweetalert2';
import PeriodoModal from './modals/PeriodoModal';

const PeriodosTab = () => {
  const [periodos, setPeriodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPeriodo, setEditingPeriodo] = useState(null);

  const fetchPeriodos = async () => {
    try {
      setLoading(true);
      const res = await academicoService.getPeriodos();
      if (res.success) setPeriodos(res.data);
    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'No se pudieron cargar los periodos', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPeriodos();
  }, []);

  const handleEdit = (periodo) => {
    setEditingPeriodo(periodo);
    setIsModalOpen(true);
  };

  const handleActivar = async (id) => {
    const res = await Swal.fire({
      title: '¿Activar este periodo?',
      text: 'Solo puede haber un periodo activo. El anterior será desactivado automáticamente.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, activar',
      cancelButtonText: 'Cancelar'
    });

    if (res.isConfirmed) {
      try {
        await academicoService.activarPeriodo(id);
        Swal.fire('Éxito', 'Periodo activado', 'success');
        fetchPeriodos();
      } catch (error) {
        Swal.fire('Error', 'No se pudo activar el periodo', 'error');
      }
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-slate-800">Listado de Periodos Lectivos</h2>
        <button 
          onClick={() => { setEditingPeriodo(null); setIsModalOpen(true); }}
          className="flex items-center gap-2 bg-[#27A9E1] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#1a85b5] transition-colors"
        >
          <FiPlus /> Nuevo Periodo
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#27A9E1]"></div></div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 text-sm border-b border-slate-200">
                <th className="p-4 font-semibold">Código</th>
                <th className="p-4 font-semibold">Nombre</th>
                <th className="p-4 font-semibold">Fechas (Inicio - Fin)</th>
                <th className="p-4 font-semibold">Estado</th>
                <th className="p-4 font-semibold text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {periodos.map(p => (
                <tr key={p.id} className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${p.es_activo ? 'bg-[#27A9E1]/5 hover:bg-[#27A9E1]/10' : ''}`}>
                  <td className="p-4 font-medium text-slate-700">{p.codigo}</td>
                  <td className="p-4">
                    <span className="font-semibold text-slate-800">{p.nombre}</span>
                    {p.es_activo === 1 && <span className="ml-2 inline-flex items-center gap-1 text-[10px] uppercase font-bold bg-[#27A9E1] text-white px-2 py-0.5 rounded-full"><FiCheckCircle size={10}/> Activo</span>}
                  </td>
                  <td className="p-4 text-slate-600">
                    {new Date(p.fecha_inicio).toLocaleDateString()} - {new Date(p.fecha_fin).toLocaleDateString()}
                  </td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      p.estado === 'ACTIVO' ? 'bg-green-100 text-green-700' :
                      p.estado === 'PLANIFICADO' ? 'bg-amber-100 text-amber-700' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {p.estado}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex justify-center gap-2">
                      <button onClick={() => handleEdit(p)} className="p-2 text-slate-400 hover:text-[#27A9E1] transition-colors" title="Editar">
                        <FiEdit2 size={16} />
                      </button>
                      {p.es_activo !== 1 && (
                        <button onClick={() => handleActivar(p.id)} className="p-2 text-slate-400 hover:text-green-600 transition-colors" title="Marcar como Activo">
                          <FiCheckCircle size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {periodos.length === 0 && (
                <tr><td colSpan="5" className="p-8 text-center text-slate-500">No hay periodos registrados</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <PeriodoModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          periodo={editingPeriodo} 
          onSave={fetchPeriodos} 
        />
      )}
    </div>
  );
};

export default PeriodosTab;
