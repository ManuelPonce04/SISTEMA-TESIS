import React from 'react';
import { FiDollarSign, FiCheckCircle, FiClock, FiAlertCircle } from 'react-icons/fi';

const PensionSummaryCards = ({ resumen }) => {
  if (!resumen) return null;

  const cards = [
    {
      title: 'Total Esperado',
      value: `$${Number(resumen.total_esperado || 0).toFixed(2)}`,
      icon: FiDollarSign,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      border: 'border-blue-100',
      subtitle: `${resumen.total_generadas || 0} pensiones generadas`
    },
    {
      title: 'Total Recaudado',
      value: `$${Number(resumen.total_recaudado || 0).toFixed(2)}`,
      icon: FiCheckCircle,
      color: 'text-green-600',
      bg: 'bg-green-50',
      border: 'border-green-100',
      subtitle: `${resumen.pagadas || 0} pagadas totalmente`
    },
    {
      title: 'Total Pendiente',
      value: `$${Number(resumen.total_pendiente || 0).toFixed(2)}`,
      icon: FiClock,
      color: 'text-yellow-600',
      bg: 'bg-yellow-50',
      border: 'border-yellow-100',
      subtitle: `${resumen.pendientes || 0} pendientes / ${resumen.parciales || 0} parciales`
    },
    {
      title: 'Cartera Vencida',
      value: `${resumen.vencidas || 0}`,
      icon: FiAlertCircle,
      color: 'text-red-600',
      bg: 'bg-red-50',
      border: 'border-red-100',
      subtitle: 'pensiones vencidas'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((card, index) => (
        <div key={index} className={`rounded-xl p-4 border ${card.border} bg-white shadow-sm flex items-start gap-4 transition-transform hover:-translate-y-1`}>
          <div className={`p-3 rounded-xl ${card.bg} ${card.color}`}>
            <card.icon size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{card.title}</p>
            <h3 className="text-2xl font-bold text-gray-800 mt-1">{card.value}</h3>
            <p className="text-xs text-gray-400 mt-1">{card.subtitle}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default PensionSummaryCards;
