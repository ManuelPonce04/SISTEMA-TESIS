import React, { useState, useEffect } from 'react';
import { FiDollarSign, FiCreditCard, FiFileText } from 'react-icons/fi';

const PaymentPanel = ({ pensionesSeleccionadas, saldoTotal, onConfirmPayment }) => {
  const [montoAbonado, setMontoAbonado] = useState('');
  const [metodoPago, setMetodoPago] = useState('');
  const [numeroComprobante, setNumeroComprobante] = useState('');
  const [observacion, setObservacion] = useState('');

  // Efecto para auto-rellenar el monto si seleccionan pensiones y el campo está vacío o era igual al saldo anterior
  useEffect(() => {
    if (saldoTotal > 0 && (!montoAbonado || parseFloat(montoAbonado) === 0)) {
      setMontoAbonado(saldoTotal.toFixed(2));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saldoTotal]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!montoAbonado || parseFloat(montoAbonado) <= 0) return;
    if (!metodoPago) return;

    onConfirmPayment({
      montoAbonado: parseFloat(montoAbonado),
      metodoPago,
      numeroComprobante,
      observacion
    });
  };

  const isOverpaid = parseFloat(montoAbonado) > saldoTotal;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col h-full">
      <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
        <FiDollarSign className="text-[#27A9E1]" />
        Registrar Pago
      </h3>

      <div className="bg-gray-50 p-4 rounded-xl mb-6 border border-gray-100">
        <div className="flex justify-between items-center mb-2">
          <span className="text-gray-500 text-sm">Pensiones Seleccionadas</span>
          <span className="font-bold text-gray-700 bg-white px-2 py-1 rounded border border-gray-200 text-xs">
            {pensionesSeleccionadas.length}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600 font-medium">Saldo Total a Pagar</span>
          <span className="text-xl font-bold text-red-500">${saldoTotal.toFixed(2)}</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Monto a Recibir ($) <span className="text-red-500">*</span></label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-500 sm:text-sm">$</span>
            </div>
            <input
              type="number"
              min="0.01"
              step="0.01"
              required
              disabled={pensionesSeleccionadas.length === 0}
              className={`block w-full pl-7 pr-3 py-3 border ${isOverpaid ? 'border-amber-400 ring-1 ring-amber-400' : 'border-gray-300'} rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-[#27A9E1] focus:border-[#27A9E1] text-lg font-bold text-gray-900 transition-colors disabled:bg-gray-100 disabled:text-gray-400`}
              placeholder="0.00"
              value={montoAbonado}
              onChange={(e) => setMontoAbonado(e.target.value)}
            />
          </div>
          {isOverpaid && (
            <p className="mt-1 text-xs text-amber-600 font-medium">
              El monto ingresado supera el saldo pendiente.
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Método de Pago <span className="text-red-500">*</span></label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiCreditCard className="text-gray-400" />
            </div>
            <select
              required
              disabled={pensionesSeleccionadas.length === 0}
              className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-[#27A9E1] focus:border-[#27A9E1] text-gray-700 disabled:bg-gray-100"
              value={metodoPago}
              onChange={(e) => setMetodoPago(e.target.value)}
            >
              <option value="">Seleccione un método...</option>
              <option value="Efectivo">Efectivo</option>
              <option value="Transferencia">Transferencia Bancaria</option>
              <option value="Depósito">Depósito en Cuenta</option>
              <option value="Tarjeta">Tarjeta de Crédito / Débito</option>
              <option value="Cheque">Cheque</option>
              <option value="Otro">Otro</option>
            </select>
          </div>
        </div>

        {['Transferencia', 'Depósito', 'Cheque'].includes(metodoPago) && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">N° Comprobante / Doc.</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiFileText className="text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-[#27A9E1] focus:border-[#27A9E1] text-sm text-gray-700"
                placeholder="Ej. REF-123456"
                value={numeroComprobante}
                onChange={(e) => setNumeroComprobante(e.target.value)}
              />
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
          <textarea
            rows="2"
            disabled={pensionesSeleccionadas.length === 0}
            className="block w-full p-3 border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-[#27A9E1] focus:border-[#27A9E1] text-sm text-gray-700 resize-none disabled:bg-gray-100"
            placeholder="Nota adicional (opcional)..."
            value={observacion}
            onChange={(e) => setObservacion(e.target.value)}
          ></textarea>
        </div>

        <div className="mt-auto pt-6">
          <button
            type="submit"
            disabled={pensionesSeleccionadas.length === 0 || !montoAbonado || parseFloat(montoAbonado) <= 0 || !metodoPago}
            className="w-full flex justify-center py-4 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-[#F4C542] hover:bg-[#e0b439] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#F4C542] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Procesar Pago
          </button>
        </div>
      </form>
    </div>
  );
};

export default PaymentPanel;
