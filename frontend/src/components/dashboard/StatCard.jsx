import React from 'react';
import Card from '../ui/Card';
import { FiTrendingUp, FiTrendingDown, FiMinus } from 'react-icons/fi';

const StatCard = ({ title, value, detail, icon: Icon, colorClass, trend }) => {
  return (
    <Card className="flex flex-col gap-3 group hover:border-[#27A9E1]/30 transition-all duration-300">
      <div className="flex justify-between items-start">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl transition-transform group-hover:scale-110 ${colorClass.bg} ${colorClass.text}`}>
          {Icon && <Icon />}
        </div>
        
        {trend && (
          <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${trend > 0 ? 'bg-green-100 text-green-700' : trend < 0 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>
            {trend > 0 ? <FiTrendingUp /> : trend < 0 ? <FiTrendingDown /> : <FiMinus />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      
      <div>
        <h4 className="text-3xl font-extrabold text-gray-800 tracking-tight mt-2">{value}</h4>
        <p className="text-sm font-semibold text-gray-500 mt-1">{title}</p>
      </div>
      
      {detail && (
        <div className="mt-auto pt-4 border-t border-gray-50">
          <p className="text-xs text-gray-400 font-medium">{detail}</p>
        </div>
      )}
    </Card>
  );
};

export default StatCard;
