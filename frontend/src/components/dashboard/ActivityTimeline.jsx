import React from 'react';
import Card from '../ui/Card';
import { FiDollarSign, FiUser, FiFileText, FiBarChart2 } from 'react-icons/fi';

const ActivityTimeline = ({ data }) => {
  const getIcon = (accion) => {
    switch (accion) {
      case 'pago': return { icon: <FiDollarSign size={14} />, bg: 'bg-green-100 text-green-600' };
      case 'usuario': return { icon: <FiUser size={14} />, bg: 'bg-blue-100 text-blue-600' };
      case 'matricula': return { icon: <FiFileText size={14} />, bg: 'bg-purple-100 text-purple-600' };
      case 'reporte': return { icon: <FiBarChart2 size={14} />, bg: 'bg-orange-100 text-orange-600' };
      default: return { icon: <FiUser size={14} />, bg: 'bg-gray-100 text-gray-600' };
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-gray-800">Actividad reciente</h3>
        <p className="text-sm text-gray-500">Últimas acciones en el sistema hoy.</p>
      </div>
      <div className="relative border-l border-gray-100 ml-3 mt-2 flex-1">
        {data.map((item, index) => {
          const style = getIcon(item.accion);
          return (
            <div key={item.id} className="mb-6 ml-6 relative group">
              <span className={`absolute flex items-center justify-center w-8 h-8 rounded-full -left-10 ring-4 ring-white ${style.bg} transition-transform group-hover:scale-110`}>
                {style.icon}
              </span>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-gray-400 mb-1">{item.hora}</span>
                <p className="text-sm font-medium text-gray-700">{item.descripcion}</p>
                <p className="text-xs text-gray-400 mt-1">Por {item.usuario}</p>
              </div>
            </div>
          );
        })}
        {data.length === 0 && (
          <p className="text-sm text-gray-500 ml-4">No hay actividad reciente registrada.</p>
        )}
      </div>
    </Card>
  );
};

export default ActivityTimeline;
