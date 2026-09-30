import React from 'react';
import { FiX, FiCheckCircle, FiAlertTriangle } from 'react-icons/fi';

const PaymentConfirmationModal = ({ isOpen, onClose, onConfirm, student, pagoData, saldoTotal, isProcessing }) => {
  if (!isOpen) return null;

  const { montoAbonado, metodoPago } = pagoData;
  const nuevoSaldo = Math.max(0, saldoTotal - montoAbonado);
  const isOverpaid = montoAbonado > saldoTotal;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50">
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            Confirmar Pago
          </h3>
          <button 
            onClick={onClose}
            disabled={isProcessing}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <FiX className="text-xl" />
          </button>
        </div>

        <div className="p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-50 text-[#27A9E1] rounded-full flex items-center justify-center mx-auto mb-3">
              <FiCheckCircle className="text-3xl" />
            </div>
            <h4 className="font-bold text-gray-800">{student?.apellidos} {student?.nombres}</h4>
            <p className="text-sm text-gray-500">{student?.codigo}</p>
          </div>

          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 mb-6 space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Total Seleccionado:</span>
              <span className="font-medium text-gray-700">${saldoTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Monto Recibido:</span>
              <span className="font-bold text-green-600">${montoAbonado.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Método:</span>
              <span className="font-medium text-gray-700">{metodoPago}</span>
            </div>
            <div className="pt-2 border-t border-gray-200 flex justify-between">
              <span className="text-gray-500 font-bold">Saldo Restante:</span>
              <span className="font-bold text-gray-900">${nuevoSaldo.toFixed(2)}</span>
            </div>
          </div>

          {isOverpaid && (
            <div className="mb-6 p-3 bg-amber-50 rounded-lg flex items-start gap-3 border border-amber-200">
              <FiAlertTriangle className="text-amber-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-700">
                <strong>Advertencia:</strong> El monto ingresado (${montoAbonado.toFixed(2)}) supera el saldo pendiente (${saldoTotal.toFixed(2)}). Se recomienda revisar antes de continuar.
              </p>
            </div>
          )}

          <p className="text-xs text-center text-gray-500 mb-6">
            Una vez registrado el pago, se actualizarán los saldos y estados de las pensiones y se generará un recibo.
          </p>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="flex-1 py-3 px-4 bg-white border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              disabled={isProcessing}
              className="flex-1 py-3 px-4 bg-[#27A9E1] rounded-xl text-white font-bold hover:bg-[#208ab8] transition-colors disabled:opacity-70 flex justify-center items-center"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Procesando...
                </>
              ) : (
                'Confirmar Pago'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentConfirmationModal;
