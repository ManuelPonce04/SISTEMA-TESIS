import React, { useState } from 'react';
import { FiX, FiDollarSign } from 'react-icons/fi';
import Button from '../ui/Button';

const PaymentModal = ({ pension, onClose, onSubmit, loading }) => {
  const [formData, setFormData] = useState({
    valor_pagado: (parseFloat(pension.valor) - parseFloat(pension.valor_pagado)).toFixed(2),
    metodo_pago: 'Efectivo',
    numero_recibo: '',
    observacion: ''
  });

  const saldo = parseFloat(pension.valor) - parseFloat(pension.valor_pagado);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(pension.id_pension, formData);
  };

  if (!pension) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-[#F4C542]">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <FiDollarSign /> Registrar Pago
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-800 hover:text-white transition-colors"
          >
            <FiX size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-semibold text-gray-500">Pensión</span>
              <span className="text-sm font-bold text-gray-800">{pension.mes} {pension.anio}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-gray-500">Estudiante</span>
              <span className="text-sm font-medium text-gray-700">{pension.estudiante_nombres} {pension.estudiante_apellidos}</span>
            </div>
            <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-200">
              <span className="text-sm font-bold text-gray-700">Saldo Pendiente</span>
              <span className="text-lg font-bold text-red-600">${saldo.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Monto a Pagar <span className="text-red-500">*</span></label>
              <div className="relative">
                <span className="absolute left-4 top-2 text-gray-500 font-bold">$</span>
                <input 
                  type="number"
                  name="valor_pagado"
                  step="0.01"
                  max={saldo}
                  value={formData.valor_pagado}
                  onChange={handleChange}
                  className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#F4C542] focus:ring-1 focus:ring-[#F4C542] font-semibold text-lg"
                  required
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Puede registrar un pago parcial o total.</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Método de Pago <span className="text-red-500">*</span></label>
              <select 
                name="metodo_pago"
                value={formData.metodo_pago}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#F4C542]"
                required
              >
                <option value="Efectivo">Efectivo</option>
                <option value="Transferencia">Transferencia Bancaria</option>
                <option value="Tarjeta">Tarjeta de Crédito / Débito</option>
                <option value="Cheque">Cheque</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">N° de Recibo / Comprobante</label>
              <input 
                type="text"
                name="numero_recibo"
                value={formData.numero_recibo}
                onChange={handleChange}
                placeholder="Ej. TR-49281"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#F4C542]"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Observaciones</label>
              <textarea 
                name="observacion"
                value={formData.observacion}
                onChange={handleChange}
                rows="2"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#F4C542]"
              ></textarea>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button 
              type="submit" 
              disabled={loading || formData.valor_pagado <= 0 || formData.valor_pagado > saldo}
              className="bg-[#F4C542] hover:bg-[#e3b532] text-gray-900 border-none font-bold"
            >
              {loading ? 'Procesando...' : 'Confirmar Pago'}
            </Button>
          </div>
        </form>

      </div>
    </div>
  );
};

export default PaymentModal;
