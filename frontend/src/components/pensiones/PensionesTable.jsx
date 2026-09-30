import React from 'react';
import Card from '../ui/Card';
import PensionStatusBadge from './PensionStatusBadge';
import { FiEye, FiDollarSign } from 'react-icons/fi';

const PensionesTable = ({ pensiones, loading, onViewDetail, onRegistrarPago }) => {
  if (loading) {
    return (
      <Card>
        <div className="flex flex-col gap-4 animate-pulse">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-12 bg-gray-100 rounded-lg"></div>
          ))}
        </div>
      </Card>
    );
  }

  if (!pensiones || pensiones.length === 0) {
    return (
      <Card>
        <div className="text-center py-10 text-gray-500">
          <p>No se encontraron pensiones con los filtros aplicados.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card noPadding className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-500 uppercase tracking-wider text-[0.7rem] font-bold border-b border-gray-100">
              <th className="px-4 py-3">Código Matrícula</th>
              <th className="px-4 py-3">Estudiante</th>
              <th className="px-4 py-3">Curso / Mes</th>
              <th className="px-4 py-3 text-right">Valor</th>
              <th className="px-4 py-3 text-right">Saldo</th>
              <th className="px-4 py-3">Vencimiento</th>
              <th className="px-4 py-3 text-center">Estado</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {pensiones.map((p) => {
              const saldo = parseFloat(p.valor) - parseFloat(p.valor_pagado);
              
              // Estilo de días vencidos
              let vtoColor = 'text-gray-600';
              if (p.estado !== 'Pagado' && p.estado !== 'Anulada') {
                if (p.dias_vencidos > 0) vtoColor = 'text-red-600 font-bold';
                else if (p.dias_vencidos === 0) vtoColor = 'text-orange-500 font-bold';
                else if (p.dias_vencidos >= -7) vtoColor = 'text-yellow-600 font-semibold';
              }

              return (
                <tr key={p.id_pension} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-4 py-3 font-medium text-gray-900">{p.codigo_matricula}</td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-800">{p.estudiante_nombres} {p.estudiante_apellidos}</div>
                    <div className="text-xs text-gray-400">CI: {p.estudiante_cedula}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-gray-800">{p.curso_nombre} - {p.paralelo}</div>
                    <div className="text-xs font-semibold text-[#27A9E1]">{p.mes} {p.anio}</div>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-700">
                    ${Number(p.valor).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-gray-900">
                    ${saldo.toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    <div className={`font-medium ${vtoColor}`}>
                      {new Date(p.fecha_vencimiento).toLocaleDateString('es-EC')}
                    </div>
                    {p.estado !== 'Pagado' && p.estado !== 'Anulada' && (
                      <div className="text-xs text-gray-400">
                        {p.dias_vencidos > 0 ? `Vencida hace ${p.dias_vencidos} días` : 
                         p.dias_vencidos === 0 ? 'Vence hoy' : `Faltan ${Math.abs(p.dias_vencidos)} días`}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <PensionStatusBadge status={p.estado} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => onViewDetail(p)}
                        className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Ver detalle"
                      >
                        <FiEye size={18} />
                      </button>
                      {p.estado !== 'Pagado' && p.estado !== 'Anulada' && (
                        <button 
                          onClick={() => onRegistrarPago(p)}
                          className="p-1.5 text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                          title="Registrar Pago"
                        >
                          <FiDollarSign size={18} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

export default PensionesTable;
