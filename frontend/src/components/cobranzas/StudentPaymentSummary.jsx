import React from 'react';
import { FiUser, FiPhone, FiMail, FiMapPin } from 'react-icons/fi';

const StudentPaymentSummary = ({ student, resumen }) => {
  if (!student) return null;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col md:flex-row gap-6">
      
      {/* Columna Izquierda: Info Estudiante */}
      <div className="flex-1 border-b md:border-b-0 md:border-r border-gray-100 pb-4 md:pb-0 md:pr-6">
        <div className="flex items-start gap-4">
          <div className="h-16 w-16 bg-blue-100 text-[#27A9E1] rounded-full flex items-center justify-center flex-shrink-0 text-xl font-bold">
            {student.nombres.charAt(0)}{student.apellidos.charAt(0)}
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">
              {student.apellidos} {student.nombres}
            </h2>
            <div className="flex flex-wrap items-center gap-2 mt-2 text-sm">
              <span className="bg-gray-100 text-gray-600 px-2.5 py-0.5 rounded-full font-medium">
                {student.codigo}
              </span>
              <span className="bg-blue-50 text-[#27A9E1] px-2.5 py-0.5 rounded-full font-medium">
                {student.curso_nombre || 'Sin curso'} {student.paralelo ? `"${student.paralelo}"` : ''}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full font-medium ${student.estado === 'Activa' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {student.estado === 'Activa' ? 'Matriculado' : 'No Matriculado'}
              </span>
            </div>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-y-2 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <FiUser className="text-gray-400" />
                <span>Rep: <span className="font-medium text-gray-800">{student.rep_nombres} {student.rep_apellidos}</span></span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-400 font-bold ml-1">CI:</span>
                <span className="font-medium text-gray-800">{student.cedula}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Columna Derecha: Resumen Rápido (Mini KPI) */}
      <div className="w-full md:w-64 flex flex-col justify-center gap-3">
        <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-100">
          <span className="text-sm text-gray-500 font-medium">Cumplimiento</span>
          <div className="flex items-center gap-2">
            <div className="w-20 bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${resumen?.cumplimiento === 100 ? 'bg-green-500' : resumen?.cumplimiento > 50 ? 'bg-blue-500' : 'bg-red-500'}`} 
                style={{ width: `${resumen?.cumplimiento || 0}%` }}
              ></div>
            </div>
            <span className="font-bold text-gray-700">{resumen?.cumplimiento || 0}%</span>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
           <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 text-center">
             <div className="text-xs text-gray-500 font-medium mb-1">Pagado</div>
             <div className="font-bold text-green-600">${Number(resumen?.pagado || 0).toFixed(2)}</div>
           </div>
           <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 text-center">
             <div className="text-xs text-gray-500 font-medium mb-1">Pendiente</div>
             <div className="font-bold text-red-500">${Number(resumen?.pendiente || 0).toFixed(2)}</div>
           </div>
        </div>
      </div>

    </div>
  );
};

export default StudentPaymentSummary;
