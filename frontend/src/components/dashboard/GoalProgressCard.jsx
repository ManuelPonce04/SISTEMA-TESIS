import React from 'react';
import Card from '../ui/Card';
import { FiTarget } from 'react-icons/fi';

const GoalProgressCard = ({ data }) => {
  if (!data) return null;
  
  const { metaMes, recaudadoActual, pendienteMeta, porcentajeCumplimiento } = data;

  return (
    <Card className="flex flex-col h-full bg-gradient-to-br from-[#27A9E1] to-[#1E8BBF] text-white overflow-hidden relative">
      <div className="absolute top-0 right-0 p-4 opacity-20">
        <FiTarget size={80} />
      </div>
      
      <div className="relative z-10">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <FiTarget /> Meta Mensual (Julio)
        </h3>
        
        <div className="mt-6 mb-2 flex justify-between items-end">
          <div>
            <p className="text-sm text-blue-100 mb-1">Recaudado</p>
            <p className="text-3xl font-extrabold tracking-tight">${recaudadoActual.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-blue-100 mb-1">Meta</p>
            <p className="text-lg font-bold">${metaMes.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-blue-900/40 rounded-full h-3 mb-2 mt-4 overflow-hidden border border-blue-400/30">
          <div 
            className="bg-[#F4C542] h-3 rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(244,197,66,0.8)] relative"
            style={{ width: `${porcentajeCumplimiento}%` }}
          >
            <div className="absolute inset-0 bg-white/20 w-full h-full animate-[shimmer_2s_infinite]"></div>
          </div>
        </div>
        
        <div className="flex justify-between items-center text-sm">
          <span className="font-bold text-[#F4C542]">{porcentajeCumplimiento}% alcanzado</span>
          <span className="text-blue-100">Falta: ${pendienteMeta.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
        </div>
      </div>
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </Card>
  );
};

export default GoalProgressCard;
