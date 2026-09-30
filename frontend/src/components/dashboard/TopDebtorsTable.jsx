import React from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { FiPhone, FiFileText } from 'react-icons/fi';

const TopDebtorsTable = ({ data }) => {
  return (
    <Card noPadding className="w-full overflow-hidden">
      <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-white">
        <div>
          <h3 className="text-lg font-bold text-gray-800">Ranking de estudiantes con mayor deuda</h3>
          <p className="text-sm text-gray-500 mt-0.5">Top estudiantes con mayor número de meses vencidos y deuda total.</p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-gray-50 text-gray-400 font-semibold uppercase tracking-wider text-xs">
            <tr>
              <th className="px-6 py-4">Posición</th>
              <th className="px-6 py-4">Estudiante</th>
              <th className="px-6 py-4">Curso</th>
              <th className="px-6 py-4">Representante</th>
              <th className="px-6 py-4">Teléfono</th>
              <th className="px-6 py-4 text-right">Total Deuda</th>
              <th className="px-6 py-4 text-center">Meses Pendientes</th>
              <th className="px-6 py-4 text-center">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {data.map((item) => (
              <tr key={item.posicion} className={`hover:bg-[#f8fafc] transition-colors group ${item.posicion <= 3 ? 'bg-red-50/20' : ''}`}>
                <td className="px-6 py-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${item.posicion === 1 ? 'bg-red-100 text-red-600' : item.posicion === 2 ? 'bg-orange-100 text-orange-600' : item.posicion === 3 ? 'bg-yellow-100 text-yellow-600' : 'bg-gray-100 text-gray-500'}`}>
                    {item.posicion}
                  </div>
                </td>
                <td className="px-6 py-4 font-bold text-gray-800">{item.estudiante}</td>
                <td className="px-6 py-4 text-gray-500">{item.curso}</td>
                <td className="px-6 py-4 font-medium text-gray-700">{item.representante}</td>
                <td className="px-6 py-4 text-gray-500 flex items-center gap-2">
                  <FiPhone size={14} className="text-gray-400" /> {item.telefono}
                </td>
                <td className={`px-6 py-4 text-right font-bold ${item.deuda > 100 ? 'text-red-500' : 'text-gray-800'}`}>
                  ${item.deuda.toFixed(2)}
                </td>
                <td className="px-6 py-4 text-center font-medium">
                  <span className={`px-2.5 py-1 rounded-full text-xs ${item.mesesPendientes >= 3 ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                    {item.mesesPendientes} meses
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex justify-center gap-2">
                    <button className="p-2 text-[#27A9E1] hover:bg-[#e0f7ff] rounded-lg transition-colors" title="Contactar representante">
                      <FiPhone size={16} />
                    </button>
                    <button className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors" title="Ver historial">
                      <FiFileText size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr><td colSpan="8" className="p-8 text-center text-gray-400">No hay deudores registrados</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

export default TopDebtorsTable;
