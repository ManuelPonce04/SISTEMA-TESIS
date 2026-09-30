import React from 'react';
import { FiPrinter, FiXCircle } from 'react-icons/fi';

const PaymentHistoryTable = ({ pagos }) => {
  if (!pagos || pagos.length === 0) {
    return (
      <div className="text-center py-6 text-gray-500 bg-gray-50 rounded-lg border border-gray-100">
        <p className="text-sm">No hay pagos registrados para esta pensión.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border border-gray-200 rounded-lg">
      <table className="w-full text-left text-sm border-collapse bg-white">
        <thead>
          <tr className="bg-gray-50 text-gray-500 uppercase tracking-wider text-[0.7rem] font-bold border-b border-gray-200">
            <th className="px-4 py-3">ID Pago</th>
            <th className="px-4 py-3">Fecha de Pago</th>
            <th className="px-4 py-3">Método</th>
            <th className="px-4 py-3">Recibo</th>
            <th className="px-4 py-3">Usuario</th>
            <th className="px-4 py-3 text-right">Valor Pagado</th>
            <th className="px-4 py-3 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {pagos.map((pago) => (
            <tr key={pago.id_pago} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3 text-xs font-mono text-gray-500">#{pago.id_pago}</td>
              <td className="px-4 py-3 text-gray-800">
                {new Date(pago.fecha_pago).toLocaleString('es-EC')}
              </td>
              <td className="px-4 py-3 text-gray-600">{pago.metodo_pago}</td>
              <td className="px-4 py-3 font-medium text-gray-700">{pago.numero_recibo || '-'}</td>
              <td className="px-4 py-3 text-gray-600">{pago.usuario_nombre || 'Sistema'}</td>
              <td className="px-4 py-3 text-right font-bold text-[#22C55E]">
                ${Number(pago.valor_pagado).toFixed(2)}
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex justify-end gap-2">
                  <button className="p-1 text-gray-400 hover:text-[#27A9E1] transition-colors" title="Imprimir Recibo">
                    <FiPrinter size={16} />
                  </button>
                  <button className="p-1 text-gray-400 hover:text-red-500 transition-colors" title="Anular Pago (Solo Admin)">
                    <FiXCircle size={16} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PaymentHistoryTable;
