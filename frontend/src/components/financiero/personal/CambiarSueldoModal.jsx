import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import personalService from '../../../services/personalService';
import { FiX, FiDollarSign } from 'react-icons/fi';

const CambiarSueldoModal = ({ isOpen, onClose, onSuccess, personal }) => {
  const [formData, setFormData] = useState({
    nuevo_sueldo: '',
    fecha_vigencia: '',
    motivo: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && personal) {
      setFormData({
        nuevo_sueldo: personal.sueldo_actual || '0.00',
        fecha_vigencia: new Date().toISOString().split('T')[0],
        motivo: ''
      });
    }
  }, [isOpen, personal]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (parseFloat(formData.nuevo_sueldo) === parseFloat(personal.sueldo_actual)) {
      Swal.fire('Atención', 'El nuevo sueldo es igual al actual.', 'warning');
      return;
    }

    setLoading(true);
    try {
      await personalService.cambiarSueldo(personal.id, formData);
      Swal.fire({ icon: 'success', title: 'Sueldo actualizado', timer: 2000, showConfirmButton: false, toast: true, position: 'top-end' });
      onSuccess();
      onClose();
    } catch (error) {
      Swal.fire('Error', error.response?.data?.message || 'Error al cambiar el sueldo', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !personal) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl flex flex-col overflow-hidden">
        
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3 text-white">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
              <FiDollarSign size={24} />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">Cambiar Sueldo</h3>
              <p className="text-white/80 text-xs font-medium">{personal.nombre_completo}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white bg-transparent hover:bg-white/10 p-2 rounded-xl transition-colors">
            <FiX size={20} />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-6 flex justify-between items-center bg-gray-50 p-4 rounded-xl border border-gray-100">
            <span className="text-sm font-medium text-gray-500">Sueldo Actual</span>
            <span className="text-xl font-bold text-gray-800 font-mono">${parseFloat(personal.sueldo_actual).toFixed(2)}</span>
          </div>

          <form id="sueldoForm" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nuevo Sueldo <span className="text-red-500">*</span></label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">$</span>
                <input
                  required
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.nuevo_sueldo}
                  onChange={(e) => setFormData({ ...formData, nuevo_sueldo: e.target.value })}
                  className="w-full pl-8 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-lg font-mono font-medium focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-shadow"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Vigencia <span className="text-red-500">*</span></label>
              <input
                required
                type="date"
                value={formData.fecha_vigencia}
                onChange={(e) => setFormData({ ...formData, fecha_vigencia: e.target.value })}
                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
              />
              <p className="text-xs text-gray-500 mt-1">Esta fecha cierra el historial del sueldo anterior.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Motivo <span className="text-red-500">*</span></label>
              <input
                required
                type="text"
                placeholder="Ej. Aumento anual, cambio de contrato..."
                value={formData.motivo}
                onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}
                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
              />
            </div>
          </form>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-200 bg-gray-100 rounded-xl transition-colors">
            Cancelar
          </button>
          <button
            type="submit"
            form="sueldoForm"
            disabled={loading}
            className="px-5 py-2.5 text-sm font-medium text-white bg-green-500 hover:bg-green-600 rounded-xl transition-colors disabled:opacity-70 flex items-center gap-2 shadow-md shadow-green-500/20"
          >
            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Confirmar Cambio'}
          </button>
        </div>

      </div>
    </div>
  );
};

export default CambiarSueldoModal;
