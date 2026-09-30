import React from 'react';
import PensionStatusBadge from '../pensiones/PensionStatusBadge';
import FinancialProgressBar from '../pensiones/FinancialProgressBar';
import { FiAlertCircle } from 'react-icons/fi';

const PensionSelectionTable = ({ pensiones, selectedIds, onSelectionChange }) => {
  const toggleSelection = (id_pension) => {
    if (selectedIds.includes(id_pension)) {
      onSelectionChange(selectedIds.filter(id => id !== id_pension));
    } else {
      onSelectionChange([...selectedIds, id_pension]);
    }
  };

  const selectAll = (e) => {
    if (e.target.checked) {
      onSelectionChange(pensiones.filter(p => !['Pagado', 'Anulada'].includes(p.estado)).map(p => p.id_pension));
    } else {
      onSelectionChange([]);
    }
  };

  const pagables = pensiones.filter(p => !['Pagado', 'Anulada'].includes(p.estado));
  const allSelected = pagables.length > 0 && selectedIds.length === pagables.length;

  if (!pensiones || pensiones.length === 0) {
    return (
      <div className="text-center py-6 text-gray-500 bg-gray-50 rounded-lg border border-gray-100">
        <p className="text-sm">No hay pensiones registradas.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border border-gray-200 rounded-lg">
      <table className="w-full text-left text-sm border-collapse bg-white">
        <thead>
          <tr className="bg-gray-50 text-gray-500 uppercase tracking-wider text-[0.7rem] font-bold border-b border-gray-200">
            <th className="px-4 py-3 w-10 text-center">
              <input 
                type="checkbox" 
                checked={allSelected} 
                onChange={selectAll}
                className="w-4 h-4 text-[#27A9E1] border-gray-300 rounded focus:ring-[#27A9E1]"
                disabled={pagables.length === 0}
              />
            </th>
            <th className="px-4 py-3">Período</th>
            <th className="px-4 py-3 text-right">Generado</th>
            <th className="px-4 py-3 text-right">Saldo</th>
            <th className="px-4 py-3">Vencimiento</th>
            <th className="px-4 py-3 text-center">Estado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {pensiones.map((p) => {
            const isPagado = p.estado === 'Pagado' || p.estado === 'Anulada';
            const isSelected = selectedIds.includes(p.id_pension);
            const saldo = parseFloat(p.valor) - parseFloat(p.valor_pagado);
            const vencida = p.estado === 'Vencido' || new Date(p.fecha_vencimiento) < new Date();

            return (
              <tr 
                key={p.id_pension} 
                className={`transition-colors ${isPagado ? 'bg-gray-50 opacity-60' : 'hover:bg-blue-50/50 cursor-pointer'} ${isSelected ? 'bg-blue-50' : ''}`}
                onClick={() => !isPagado && toggleSelection(p.id_pension)}
              >
                <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                  <input 
                    type="checkbox" 
                    checked={isSelected}
                    onChange={() => !isPagado && toggleSelection(p.id_pension)}
                    disabled={isPagado}
                    className="w-4 h-4 text-[#27A9E1] border-gray-300 rounded focus:ring-[#27A9E1] cursor-pointer disabled:cursor-not-allowed"
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="font-bold text-gray-800">{p.mes}</div>
                  <div className="text-xs text-gray-500">{p.anio}</div>
                </td>
                <td className="px-4 py-3 text-right text-gray-600">
                  ${Number(p.valor).toFixed(2)}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="font-bold text-gray-900">${saldo.toFixed(2)}</div>
                  {p.estado === 'Parcial' && (
                    <div className="w-24 ml-auto mt-1">
                      <FinancialProgressBar valor={p.valor} pagado={p.valor_pagado} />
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className={vencida && !isPagado ? 'text-red-600 font-bold' : 'text-gray-600'}>
                      {new Date(p.fecha_vencimiento).toLocaleDateString('es-EC')}
                    </span>
                    {vencida && !isPagado && <FiAlertCircle className="text-red-500" title="Pensión Vencida" />}
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  <PensionStatusBadge status={p.estado} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default PensionSelectionTable;
