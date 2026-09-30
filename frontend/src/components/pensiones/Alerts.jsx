import React from 'react';
import { FiAlertTriangle, FiInfo } from 'react-icons/fi';

export const OverdueAlert = () => (
  <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
    <FiAlertTriangle className="text-red-500 mt-0.5 flex-shrink-0" size={20} />
    <div>
      <h4 className="text-red-800 font-bold text-sm">Pensión Vencida</h4>
      <p className="text-red-600 text-sm mt-1">
        Esta pensión se encuentra vencida y tiene saldo pendiente.
      </p>
    </div>
  </div>
);

export const PartialPaymentAlert = () => (
  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
    <FiInfo className="text-blue-500 mt-0.5 flex-shrink-0" size={20} />
    <div>
      <h4 className="text-blue-800 font-bold text-sm">Pago Parcial Registrado</h4>
      <p className="text-blue-600 text-sm mt-1">
        Esta pensión tiene pagos parciales registrados. Revise el saldo pendiente antes de cobrar.
      </p>
    </div>
  </div>
);
