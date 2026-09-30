import React from 'react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import { FiBell } from 'react-icons/fi';

const UpcomingPaymentsTable = ({ data }) => {
  const getBadgeVariant = (estado) => {
    switch (estado) {
      case 'Por vencer': return 'yellow';
      case 'Vence hoy': return 'orange';
      case 'Vencida': return 'red';
      default: return 'gray';
    }
  };

  return (
    <Card noPadding className="flex flex-col h-full">
      <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-white">
        <h3 className="text-lg font-bold text-gray-800">Pensiones próximas a vencer</h3>
        <button className="text-sm font-medium text-[#27A9E1] hover:text-[#1E8BBF]">Ver reporte</button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-gray-50 text-gray-400 font-semibold uppercase tracking-wider text-xs">
            <tr>
              <th className="px-5 py-4">Estudiante</th>
              <th className="px-5 py-4">Curso</th>
              <th className="px-5 py-4">Mes</th>
              <th className="px-5 py-4">Vencimiento</th>
              <th className="px-5 py-4">Valor</th>
              <th className="px-5 py-4 text-center">Días</th>
              <th className="px-5 py-4">Estado</th>
              <th className="px-5 py-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {data.map((item) => (
              <tr key={item.id} className="hover:bg-[#f8fafc] transition-colors group">
                <td className="px-5 py-3 font-semibold text-gray-800">{item.estudiante}</td>
                <td className="px-5 py-3 text-gray-500">{item.curso}</td>
                <td className="px-5 py-3 text-gray-600 font-medium">{item.mes}</td>
                <td className="px-5 py-3 text-gray-500 font-medium">{item.vence}</td>
                <td className="px-5 py-3 font-bold text-gray-800">${item.valor.toFixed(2)}</td>
                <td className="px-5 py-3 text-center font-medium">
                  {item.diasRestantes < 0 ? (
                    <span className="text-red-500">{item.diasRestantes}</span>
                  ) : item.diasRestantes === 0 ? (
                    <span className="text-orange-500">Hoy</span>
                  ) : (
                    <span className="text-gray-500">{item.diasRestantes}</span>
                  )}
                </td>
                <td className="px-5 py-3">
                  <Badge variant={getBadgeVariant(item.estado)}>{item.estado}</Badge>
                </td>
                <td className="px-5 py-3 text-right">
                  <button className="p-1.5 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100" title="Notificar">
                    <FiBell size={18} />
                  </button>
                </td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr><td colSpan="8" className="p-8 text-center text-gray-400">No hay pensiones próximas a vencer</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

export default UpcomingPaymentsTable;
