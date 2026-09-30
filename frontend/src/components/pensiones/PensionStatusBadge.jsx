import React from 'react';

const PensionStatusBadge = ({ status }) => {
  switch (status) {
    case 'Pagado':
      return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-green-100 text-green-700">Pagado</span>;
    case 'Pendiente':
      return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-yellow-100 text-yellow-700">Pendiente</span>;
    case 'Parcial':
      return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-blue-100 text-blue-700">Parcial</span>;
    case 'Vencido':
      return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-red-100 text-red-700">Vencido</span>;
    case 'Anulada':
      return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-gray-100 text-gray-500">Anulada</span>;
    default:
      return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-gray-100 text-gray-700">{status}</span>;
  }
};

export default PensionStatusBadge;
