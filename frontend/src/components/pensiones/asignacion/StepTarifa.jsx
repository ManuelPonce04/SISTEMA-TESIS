import React from 'react';
import { FiCheckCircle, FiAlertTriangle, FiInfo } from 'react-icons/fi';

export default function StepTarifa({ formData }) {
  if (formData.tarifaError) {
    return (
      <div className="animate-fade-in max-w-2xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
          <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiAlertTriangle size={32} />
          </div>
          <h3 className="text-xl font-bold text-red-700 mb-2">Error de Tarifa</h3>
          <p className="text-red-600 mb-6">{formData.tarifaError}</p>
          <div className="bg-white p-4 rounded-xl border border-red-100 text-sm text-left text-gray-700">
            <p className="font-bold mb-2">Posibles soluciones:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Verifique en "Configuración de Pensiones" que exista una tarifa activa para este nivel/curso.</li>
              <li>Asegúrese de que las fechas de vigencia de la tarifa cubran el mes seleccionado ({formData.mesDesde}).</li>
              <li>Si hay múltiples tarifas, revise las reglas de prioridad.</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  if (!formData.tarifa) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#27A9E1]"></div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in max-w-2xl mx-auto">
      <div className="mb-6 text-center">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <FiCheckCircle size={32} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Tarifa Resuelta</h2>
        <p className="text-sm text-gray-500 mt-1">El sistema ha determinado la tarifa base aplicable.</p>
      </div>

      <div className="bg-white border-2 border-emerald-100 rounded-2xl p-6 shadow-sm mb-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
              Regla de Prioridad {formData.tarifa.prioridad}
            </span>
            <h3 className="text-lg font-bold text-gray-800 mt-3">Tarifa Base Mensual</h3>
          </div>
          <div className="text-right">
            <span className="text-3xl font-black text-[#27A9E1]">${parseFloat(formData.tarifa.valor_mensual).toFixed(2)}</span>
            <span className="text-gray-500 text-sm block">/ mes</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100 text-sm">
          <div>
            <span className="block text-gray-500 text-xs mb-1">Nivel:</span>
            <span className="font-medium text-gray-900">{formData.matriculaData?.nivel_nombre || 'General'}</span>
          </div>
          <div>
            <span className="block text-gray-500 text-xs mb-1">Curso:</span>
            <span className="font-medium text-gray-900">{formData.matriculaData?.curso_nombre || 'General'}</span>
          </div>
          <div>
            <span className="block text-gray-500 text-xs mb-1">Mes de Resolución:</span>
            <span className="font-medium text-gray-900">{formData.mesDesde}</span>
          </div>
          <div>
            <span className="block text-gray-500 text-xs mb-1">ID Tarifa Configurada:</span>
            <span className="font-mono text-gray-700">#{formData.tarifa.id}</span>
          </div>
        </div>
      </div>

      <div className="flex items-start gap-3 bg-blue-50 p-4 rounded-xl text-sm text-blue-800">
        <FiInfo size={20} className="flex-shrink-0 mt-0.5" />
        <p>Esta es la tarifa base para el estudiante. En el siguiente paso podrá aplicar becas y descuentos para calcular el valor final.</p>
      </div>
    </div>
  );
}
