import React from 'react';
import { FiInfo, FiAlertCircle, FiCheckCircle, FiBell } from 'react-icons/fi';

const AlertCard = ({ type, message }) => {
  const styles = {
    rojo: {
      bg: 'bg-red-50',
      border: 'border-l-4 border-red-500',
      icon: <FiAlertCircle className="text-red-500 flex-shrink-0" size={20} />,
      text: 'text-red-800'
    },
    amarillo: {
      bg: 'bg-yellow-50',
      border: 'border-l-4 border-yellow-500',
      icon: <FiAlertCircle className="text-yellow-600 flex-shrink-0" size={20} />,
      text: 'text-yellow-800'
    },
    verde: {
      bg: 'bg-green-50',
      border: 'border-l-4 border-green-500',
      icon: <FiCheckCircle className="text-green-500 flex-shrink-0" size={20} />,
      text: 'text-green-800'
    },
    azul: {
      bg: 'bg-blue-50',
      border: 'border-l-4 border-blue-500',
      icon: <FiInfo className="text-blue-500 flex-shrink-0" size={20} />,
      text: 'text-blue-800'
    }
  };

  const style = styles[type] || styles.azul;

  return (
    <div className={`flex items-center gap-3 p-3 rounded-r-xl rounded-l-sm shadow-sm ${style.bg} ${style.border}`}>
      {style.icon}
      <p className={`text-sm font-medium ${style.text}`}>{message}</p>
    </div>
  );
};

export default AlertCard;
