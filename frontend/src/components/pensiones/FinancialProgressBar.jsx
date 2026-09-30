import React from 'react';

const FinancialProgressBar = ({ valor, pagado }) => {
  const v = parseFloat(valor) || 0;
  const p = parseFloat(pagado) || 0;
  const percentage = v > 0 ? Math.min(100, Math.round((p / v) * 100)) : 0;
  
  let colorClass = 'bg-[#F4C542]'; // yellow default (partial)
  if (percentage === 100) colorClass = 'bg-[#22C55E]'; // green (paid)
  else if (percentage === 0) colorClass = 'bg-gray-300'; // gray (none)

  return (
    <div className="w-full">
      <div className="flex justify-between text-xs font-semibold mb-1">
        <span className="text-gray-500">Progreso</span>
        <span className="text-gray-700">{percentage}%</span>
      </div>
      <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div 
          className={`h-full ${colorClass} transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
};

export default FinancialProgressBar;
