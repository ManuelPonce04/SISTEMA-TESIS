import React, { useState } from 'react';
import { FiX, FiCheck, FiDollarSign } from 'react-icons/fi';
import { registrarAjuste } from '../../../services/mensualidadService';
import Swal from 'sweetalert2';

export default function AjusteMensualidadModal({ isOpen, onClose, obligacionId, onSuccess }) {
  const [formData, setFormData] = useState({
    tipo: 'DESCUENTO',
    valor: '',
    signo: 'RESTA',
    motivo: ''
  });
  
  const [loading, setLoading] = useState(false);

  const handleTipoChange = (e) => {
    const tipo = e.target.value;
    const signo = ['RECARGO', 'AUMENTO'].includes(tipo) ? 'SUMA' : 'RESTA';
    setFormData({ ...formData, tipo, signo });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.valor || formData.valor <= 0) return Swal.fire('Error', 'El valor debe ser mayor a 0', 'error');
    if (!formData.motivo) return Swal.fire('Error', 'El motivo es obligatorio', 'error');

    setLoading(true);
    try {
      const res = await registrarAjuste(obligacionId, formData);
      if (res.success) {
        Swal.fire({ title: 'Ajuste Aplicado', text: 'El ajuste se registró correctamente.', icon: 'success', timer: 2000, showConfirmButton: false });
        if (onSuccess) onSuccess();
      }
    } catch (error) {
      Swal.fire('Error', error.response?.data?.message || 'Error al aplicar ajuste', 'error');
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <FiDollarSign className="text-amber-500" /> Aplicar Ajuste
          </h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-200 rounded-full transition-colors"><FiX size={20} /></button>
        </div>

        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Ajuste</label>
              <select 
                value={formData.tipo}
                onChange={handleTipoChange}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-[#27A9E1]"
                required
              >
                <option value="DESCUENTO">Descuento Administrativo</option>
                <option value="RECARGO">Recargo / Mora</option>
                <option value="AUMENTO">Aumento de Tarifa</option>
                <option value="NOTA_DE_CREDITO">Nota de Crédito</option>
                <option value="OTRO">Otro</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Efecto en la Obligación</label>
              <div className="flex gap-4">
                <label className={`flex-1 flex items-center justify-center gap-2 p-3 border rounded-xl cursor-not-allowed ${formData.signo === 'SUMA' ? 'bg-blue-50 border-blue-200 text-blue-700 font-bold' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>
                  + Suma
                </label>
                <label className={`flex-1 flex items-center justify-center gap-2 p-3 border rounded-xl cursor-not-allowed ${formData.signo === 'RESTA' ? 'bg-emerald-50 border-emerald-200 text-emerald-700 font-bold' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>
                  - Resta
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valor ($)</label>
              <input 
                type="number" 
                step="0.01" 
                min="0.01"
                placeholder="0.00"
                value={formData.valor}
                onChange={e => setFormData({ ...formData, valor: e.target.value })}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-[#27A9E1] font-mono text-lg"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Motivo / Justificación</label>
              <textarea 
                rows="3"
                value={formData.motivo}
                onChange={e => setFormData({ ...formData, motivo: e.target.value })}
                placeholder="Explique el motivo del ajuste..."
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-[#27A9E1]"
                required
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button type="button" onClick={onClose} className="px-5 py-2.5 text-gray-600 font-medium hover:bg-gray-100 rounded-xl text-sm transition-colors">
                Cancelar
              </button>
              <button type="submit" disabled={loading} className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-xl text-sm transition-colors flex items-center gap-2 disabled:opacity-50">
                <FiCheck /> Confirmar Ajuste
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
