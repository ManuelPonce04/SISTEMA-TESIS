import React, { useState, useEffect } from 'react';
import { FiX } from 'react-icons/fi';
import academicoService from '../../../services/academicoService';
import Swal from 'sweetalert2';

const PeriodoModal = ({ isOpen, onClose, periodo, onSave }) => {
  const [formData, setFormData] = useState({
    codigo: '',
    nombre: '',
    fecha_inicio: '',
    fecha_fin: '',
    fecha_inicio_matriculas: '',
    fecha_fin_matriculas: '',
    observacion: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (periodo) {
      setFormData({
        codigo: periodo.codigo || '',
        nombre: periodo.nombre || '',
        fecha_inicio: periodo.fecha_inicio ? periodo.fecha_inicio.split('T')[0] : '',
        fecha_fin: periodo.fecha_fin ? periodo.fecha_fin.split('T')[0] : '',
        fecha_inicio_matriculas: periodo.fecha_inicio_matriculas ? periodo.fecha_inicio_matriculas.split('T')[0] : '',
        fecha_fin_matriculas: periodo.fecha_fin_matriculas ? periodo.fecha_fin_matriculas.split('T')[0] : '',
        observacion: periodo.observacion || ''
      });
    }
  }, [periodo]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (periodo) {
        await academicoService.updatePeriodo(periodo.id, formData);
        Swal.fire('Éxito', 'Periodo actualizado', 'success');
      } else {
        await academicoService.createPeriodo(formData);
        Swal.fire('Éxito', 'Periodo creado', 'success');
      }
      onSave();
      onClose();
    } catch (error) {
      Swal.fire('Error', 'Hubo un problema al guardar el periodo', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-slide-up">
        <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50">
          <h3 className="text-lg font-bold text-slate-800">{periodo ? 'Editar Periodo' : 'Nuevo Periodo'}</h3>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg transition-colors">
            <FiX size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-2 gap-5 mb-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Código</label>
              <input type="text" name="codigo" value={formData.codigo} onChange={handleChange} required className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#27A9E1] focus:border-[#27A9E1] outline-none" placeholder="Ej. PER-2026-2027" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
              <input type="text" name="nombre" value={formData.nombre} onChange={handleChange} required className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#27A9E1] focus:border-[#27A9E1] outline-none" placeholder="Ej. 2026-2027" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Fecha Inicio Clases</label>
              <input type="date" name="fecha_inicio" value={formData.fecha_inicio} onChange={handleChange} required className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#27A9E1] outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Fecha Fin Clases</label>
              <input type="date" name="fecha_fin" value={formData.fecha_fin} onChange={handleChange} required className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#27A9E1] outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Inicio Matrículas (Opcional)</label>
              <input type="date" name="fecha_inicio_matriculas" value={formData.fecha_inicio_matriculas} onChange={handleChange} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#27A9E1] outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Fin Matrículas (Opcional)</label>
              <input type="date" name="fecha_fin_matriculas" value={formData.fecha_fin_matriculas} onChange={handleChange} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#27A9E1] outline-none" />
            </div>
          </div>
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-1">Observaciones</label>
            <textarea name="observacion" value={formData.observacion} onChange={handleChange} rows="2" className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#27A9E1] outline-none resize-none"></textarea>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-5 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition-colors">Cancelar</button>
            <button type="submit" disabled={loading} className="px-5 py-2 bg-[#27A9E1] text-white rounded-xl font-medium hover:bg-[#1a85b5] transition-colors disabled:opacity-50">
              {loading ? 'Guardando...' : 'Guardar Periodo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PeriodoModal;
