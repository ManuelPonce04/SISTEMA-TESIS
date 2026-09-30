import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import sueldosAnticiposService from '../../../services/sueldosAnticiposService';
import { FiX, FiSettings, FiCheck } from 'react-icons/fi';
import { useAuth } from '../../../context/AuthContext';

const AjustesSueldoModal = ({ isOpen, onClose, onSuccess, personalId, periodoId, mesAplicacion, ajustesActuales, nombrePersonal }) => {
  const { user } = useAuth();
  
  const [formData, setFormData] = useState({
    horas_extras: '0.00',
    otros_ingresos: '0.00',
    otras_deducciones: '0.00',
    observacion: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && ajustesActuales) {
      setFormData({
        horas_extras: ajustesActuales.horas_extras || '0.00',
        otros_ingresos: ajustesActuales.otros_ingresos || '0.00',
        otras_deducciones: ajustesActuales.otras_deducciones || '0.00',
        observacion: ajustesActuales.observacion || ''
      });
    }
  }, [isOpen, ajustesActuales]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!user?.es_admin) {
      Swal.fire('Prohibido', 'Solo los administradores pueden modificar los ajustes mensuales.', 'error');
      return;
    }

    if (ajustesActuales?.estado === 'BLOQUEADO') {
      Swal.fire('Bloqueado', 'El mes ya ha sido cerrado, no se pueden modificar los ajustes.', 'error');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...formData,
        periodo_lectivo_id: periodoId,
        mes: mesAplicacion
      };

      await sueldosAnticiposService.actualizarAjustesMensuales(personalId, payload);
      Swal.fire({ icon: 'success', title: 'Ajustes guardados', timer: 2000, showConfirmButton: false, toast: true, position: 'top-end' });
      onSuccess();
      onClose();
    } catch (error) {
      Swal.fire('Error', error.response?.data?.message || 'Error al guardar ajustes', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl flex flex-col overflow-hidden">
        
        <div className="bg-gray-800 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 text-white">
            <FiSettings size={20} className="text-gray-400" />
            <div>
              <h3 className="font-bold text-lg leading-tight">Ajustes del Mes</h3>
              <p className="text-gray-400 text-xs font-medium">{nombrePersonal}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <FiX size={20} />
          </button>
        </div>

        <form id="ajustesForm" onSubmit={handleSubmit} className="p-6 space-y-4">
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Horas Extras ($)</label>
            <input
              type="number" step="0.01" min="0"
              value={formData.horas_extras}
              onChange={(e) => setFormData({ ...formData, horas_extras: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-gray-800 outline-none focus:border-gray-800 font-mono"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Otros Ingresos Provisionales ($)</label>
            <input
              type="number" step="0.01" min="0"
              value={formData.otros_ingresos}
              onChange={(e) => setFormData({ ...formData, otros_ingresos: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-gray-800 outline-none focus:border-gray-800 font-mono"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Otras Deducciones Provisionales ($)</label>
            <input
              type="number" step="0.01" min="0"
              value={formData.otras_deducciones}
              onChange={(e) => setFormData({ ...formData, otras_deducciones: e.target.value })}
              className="w-full px-4 py-2 border border-red-300 bg-red-50 text-red-900 rounded-lg focus:ring-red-500 outline-none focus:border-red-500 font-mono"
            />
            <p className="text-[10px] text-gray-500 mt-1">No incluya los anticipos aquí.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Observación Mensual</label>
            <textarea
              value={formData.observacion}
              onChange={(e) => setFormData({ ...formData, observacion: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-gray-800 outline-none focus:border-gray-800"
              rows="2"
            />
          </div>

        </form>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 bg-gray-100 rounded-xl transition-colors">
            Cancelar
          </button>
          <button
            type="submit"
            form="ajustesForm"
            disabled={loading || !user?.es_admin || ajustesActuales?.estado === 'BLOQUEADO'}
            className="px-4 py-2 text-sm font-medium text-white bg-gray-800 hover:bg-gray-900 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><FiCheck /> Guardar</>}
          </button>
        </div>

      </div>
    </div>
  );
};

export default AjustesSueldoModal;
