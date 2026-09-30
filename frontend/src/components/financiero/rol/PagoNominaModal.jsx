import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import nominaService from '../../../services/nominaService';
import movimientosFinancierosService from '../../../services/movimientosFinancierosService';
import { FiX, FiCheck, FiDollarSign } from 'react-icons/fi';

const PagoNominaModal = ({ isOpen, onClose, onSuccess, nominaId, detalle, mesNomina }) => {
  const [formData, setFormData] = useState({
    cuenta_financiera_id: '',
    fecha_pago: new Date().toISOString().split('T')[0],
    numero_comprobante: '',
    observacion: ''
  });

  const [cuentas, setCuentas] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadCuentas();
      setFormData(prev => ({
        ...prev,
        numero_comprobante: '',
        observacion: ''
      }));
    }
  }, [isOpen]);

  const loadCuentas = async () => {
    try {
      const res = await movimientosFinancierosService.getCuentasActivas();
      if (res.success) setCuentas(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await nominaService.pagarIndividual(nominaId, detalle.id, formData);
      Swal.fire({ icon: 'success', title: 'Pago Registrado', text: 'Se ha descontado de la cuenta.', timer: 2500, showConfirmButton: false });
      onSuccess();
      onClose();
    } catch (error) {
      Swal.fire('Error', error.response?.data?.message || 'Error al procesar el pago', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !detalle) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl flex flex-col overflow-hidden">
        
        <div className="bg-gradient-to-r from-green-500 to-green-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 text-white">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
              <FiDollarSign size={20} />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">Registrar Pago</h3>
              <p className="text-white/80 text-xs font-medium">{detalle.nombre_snapshot}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white bg-transparent hover:bg-white/10 p-2 rounded-xl transition-colors">
            <FiX size={20} />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-6 bg-green-50 border border-green-100 rounded-xl p-4 flex justify-between items-center">
            <div>
              <p className="text-xs text-green-700 mb-1">Total a transferir (Neto)</p>
              <p className="text-2xl font-bold font-mono text-green-700">${parseFloat(detalle.neto_recibir).toFixed(2)}</p>
            </div>
          </div>

          <form id="pagoForm" onSubmit={handleSubmit} className="space-y-4">
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cuenta de Origen <span className="text-red-500">*</span></label>
              <select required value={formData.cuenta_financiera_id} onChange={(e) => setFormData({ ...formData, cuenta_financiera_id: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-green-500 outline-none focus:border-green-500">
                <option value="">Seleccione cuenta...</option>
                {cuentas.map(c => <option key={c.id} value={c.id}>{c.nombre} (Saldo: ${c.saldo_actual})</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Pago <span className="text-red-500">*</span></label>
                <input required type="date" value={formData.fecha_pago} onChange={(e) => setFormData({ ...formData, fecha_pago: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-green-500 outline-none focus:border-green-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Comprobante</label>
                <input type="text" placeholder="# Transacción" value={formData.numero_comprobante} onChange={(e) => setFormData({ ...formData, numero_comprobante: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-green-500 outline-none focus:border-green-500" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Observación</label>
              <textarea placeholder="Ej. Pago realizado vía transferencia..." value={formData.observacion} onChange={(e) => setFormData({ ...formData, observacion: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-green-500 outline-none focus:border-green-500" rows="2" />
            </div>

          </form>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-200 bg-gray-100 rounded-xl transition-colors">
            Cancelar
          </button>
          <button type="submit" form="pagoForm" disabled={loading} className="px-5 py-2.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><FiCheck /> Confirmar Pago</>}
          </button>
        </div>

      </div>
    </div>
  );
};

export default PagoNominaModal;
