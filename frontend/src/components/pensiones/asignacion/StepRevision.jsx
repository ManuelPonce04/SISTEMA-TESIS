import React from 'react';
import { FiCheckCircle, FiFileText } from 'react-icons/fi';

export default function StepRevision({ formData }) {
  if (!formData.matriculaData || !formData.tarifa || !formData.calculoFinal) return null;

  return (
    <div className="animate-fade-in max-w-4xl mx-auto">
      <div className="mb-8 text-center">
        <h2 className="text-xl font-bold text-gray-900">Revisión Final</h2>
        <p className="text-sm text-gray-500 mt-1">Revise el resumen de la asignación antes de guardar. Se creará en estado BORRADOR.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Columna Izquierda: Datos y Vigencia */}
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
            <h3 className="text-sm font-bold text-gray-800 border-b pb-2 mb-3">Datos del Estudiante</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Nombres:</span>
                <span className="font-medium text-gray-900">{formData.matriculaData.nombres} {formData.matriculaData.apellidos}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Matrícula:</span>
                <span className="font-mono text-gray-900">{formData.matriculaData.numero_matricula}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Curso:</span>
                <span className="font-medium text-gray-900">{formData.matriculaData.curso_nombre} "{formData.matriculaData.paralelo_nombre}"</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Representante:</span>
                <span className="font-medium text-gray-900">{formData.matriculaData.rep_nombres} {formData.matriculaData.rep_apellidos}</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
            <h3 className="text-sm font-bold text-gray-800 border-b pb-2 mb-3">Vigencia y Observaciones</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Desde:</span>
                <span className="font-medium text-gray-900">{formData.mesDesde}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Hasta:</span>
                <span className="font-medium text-gray-900">{formData.mesHasta}</span>
              </div>
              {formData.observacion && (
                <div className="mt-3 bg-gray-50 p-3 rounded-lg text-gray-700 italic border border-gray-100">
                  "{formData.observacion}"
                </div>
              )}
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
            <h3 className="text-sm font-bold text-gray-800 border-b pb-2 mb-3 flex justify-between items-center">
              Documentos Adjuntos
              <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">{formData.documentos.length}</span>
            </h3>
            {formData.documentos.length === 0 ? (
              <p className="text-sm text-gray-500 italic">No se adjuntaron documentos.</p>
            ) : (
              <ul className="space-y-2">
                {formData.documentos.map((d, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-gray-700">
                    <FiFileText className="text-gray-400" /> <span className="truncate">{d.name}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Columna Derecha: Finanzas */}
        <div className="space-y-6">
          <div className="bg-[#27A9E1]/5 p-6 rounded-2xl border border-[#27A9E1]/20">
            <h3 className="text-sm font-bold text-[#27A9E1] border-b border-[#27A9E1]/20 pb-2 mb-4 uppercase tracking-wider">
              Resumen Financiero Mensual
            </h3>
            
            <div className="space-y-3 text-sm mb-4">
              <div className="flex justify-between items-center text-gray-600">
                <span>Tarifa Base</span>
                <span className="font-mono text-lg">${parseFloat(formData.tarifa.valor_mensual).toFixed(2)}</span>
              </div>
              
              {formData.beneficios.length > 0 ? (
                formData.beneficios.map((b, i) => (
                  <div key={i} className="flex justify-between items-center text-emerald-600 pl-4 border-l-2 border-emerald-200">
                    <div>
                      <span className="block">{b.nombre}</span>
                      <span className="text-[10px] uppercase text-emerald-500/70 font-bold">{b.tipo_calculo_snapshot}</span>
                    </div>
                    <span className="font-mono">
                      {b.tipo_calculo_snapshot === 'PORCENTAJE' ? `${b.porcentaje_aplicado}%` : `$${parseFloat(b.valor_aplicado || b.valor_final_especial).toFixed(2)}`}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-gray-400 italic text-xs py-2">Sin beneficios aplicados.</div>
              )}
            </div>

            <div className="border-t border-[#27A9E1]/30 pt-4 mt-2">
              <div className="flex justify-between items-center">
                <div>
                  <span className="block font-bold text-gray-900 text-lg">Pensión Final</span>
                  <span className="text-xs text-gray-500">Valor a cobrar cada mes</span>
                </div>
                <span className="font-mono font-black text-3xl text-[#27A9E1]">
                  ${parseFloat(formData.calculoFinal.valor_final).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 flex items-start gap-3">
            <FiCheckCircle className="text-emerald-500 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <p className="text-sm text-emerald-800 font-bold">Todo listo para guardar</p>
              <p className="text-xs text-emerald-600 mt-1">Al finalizar, la asignación se guardará como BORRADOR. Luego podrá enviarla a aprobación.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
