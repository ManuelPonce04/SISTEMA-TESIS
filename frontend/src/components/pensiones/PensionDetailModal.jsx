import React, { useEffect, useState } from 'react';
import { FiX, FiUser, FiInfo, FiCalendar, FiDollarSign } from 'react-icons/fi';
import { getPensionById, getPagosByPension } from '../../services/pensionesService';
import PensionStatusBadge from './PensionStatusBadge';
import FinancialProgressBar from './FinancialProgressBar';
import PaymentHistoryTable from './PaymentHistoryTable';
import { OverdueAlert, PartialPaymentAlert } from './Alerts';

const PensionDetailModal = ({ idPension, onClose }) => {
  const [pension, setPension] = useState(null);
  const [pagos, setPagos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDatos = async () => {
      try {
        const [resPension, resPagos] = await Promise.all([
          getPensionById(idPension),
          getPagosByPension(idPension)
        ]);
        if (resPension.success) setPension(resPension.pension);
        if (resPagos.success) setPagos(resPagos.pagos);
      } catch (error) {
        console.error("Error al cargar detalles de la pensión", error);
      } finally {
        setLoading(false);
      }
    };
    if (idPension) {
      fetchDatos();
    }
  }, [idPension]);

  if (!idPension) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Detalle de Pensión</h2>
            <p className="text-sm text-gray-500">Información completa y estado financiero</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          >
            <FiX size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#27A9E1]"></div>
            </div>
          ) : pension ? (
            <div className="flex flex-col gap-6">
              
              {/* Alertas */}
              {pension.estado === 'Vencido' && <OverdueAlert />}
              {pension.estado === 'Parcial' && <PartialPaymentAlert />}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Columna Izquierda */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                  
                  {/* Info Estudiante */}
                  <div className="border border-gray-200 rounded-xl p-5 bg-white">
                    <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                      <FiUser className="text-[#27A9E1]" /> Información del Estudiante
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="block text-xs font-semibold text-gray-500 uppercase">Nombres y Apellidos</span>
                        <span className="block text-gray-800 font-medium">{pension.estudiante_nombres} {pension.estudiante_apellidos}</span>
                      </div>
                      <div>
                        <span className="block text-xs font-semibold text-gray-500 uppercase">Cédula</span>
                        <span className="block text-gray-800">{pension.estudiante_cedula}</span>
                      </div>
                      <div>
                        <span className="block text-xs font-semibold text-gray-500 uppercase">Código</span>
                        <span className="block text-gray-800">{pension.codigo_estudiante}</span>
                      </div>
                      <div>
                        <span className="block text-xs font-semibold text-gray-500 uppercase">Representante</span>
                        <span className="block text-gray-800">{pension.rep_nombres} {pension.rep_apellidos}</span>
                      </div>
                    </div>
                  </div>

                  {/* Info Académica */}
                  <div className="border border-gray-200 rounded-xl p-5 bg-white">
                    <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                      <FiCalendar className="text-[#27A9E1]" /> Información Académica
                    </h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <span className="block text-xs font-semibold text-gray-500 uppercase">Año Lectivo</span>
                        <span className="block text-gray-800">{pension.anio_lectivo}</span>
                      </div>
                      <div>
                        <span className="block text-xs font-semibold text-gray-500 uppercase">Curso</span>
                        <span className="block text-gray-800">{pension.curso_nombre} - {pension.paralelo}</span>
                      </div>
                      <div>
                        <span className="block text-xs font-semibold text-gray-500 uppercase">Jornada</span>
                        <span className="block text-gray-800">{pension.jornada}</span>
                      </div>
                    </div>
                  </div>

                  {/* Historial de Pagos */}
                  <div>
                    <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                      <FiInfo className="text-[#27A9E1]" /> Historial de Pagos
                    </h3>
                    <PaymentHistoryTable pagos={pagos} />
                  </div>

                </div>

                {/* Columna Derecha */}
                <div className="flex flex-col gap-6">
                  
                  {/* Resumen Financiero */}
                  <div className="border border-gray-200 rounded-xl p-5 bg-white shadow-sm border-t-4 border-t-[#27A9E1]">
                    <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                      <FiDollarSign className="text-[#27A9E1]" /> Resumen Financiero
                    </h3>
                    
                    <div className="flex flex-col gap-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500 font-semibold">Período</span>
                        <span className="font-bold text-gray-800">{pension.mes} {pension.anio}</span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500 font-semibold">Valor Original</span>
                        <span className="font-medium text-gray-800">${Number(pension.valor).toFixed(2)}</span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500 font-semibold">Total Pagado</span>
                        <span className="font-medium text-green-600">${Number(pension.valor_pagado).toFixed(2)}</span>
                      </div>
                      
                      <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                        <span className="text-sm text-gray-700 font-bold">Saldo Pendiente</span>
                        <span className="font-bold text-red-600 text-lg">
                          ${(parseFloat(pension.valor) - parseFloat(pension.valor_pagado)).toFixed(2)}
                        </span>
                      </div>

                      <div className="pt-2">
                        <FinancialProgressBar valor={pension.valor} pagado={pension.valor_pagado} />
                      </div>

                      <div className="flex justify-between items-center mt-2">
                        <span className="text-sm text-gray-500 font-semibold">Estado Actual</span>
                        <PensionStatusBadge status={pension.estado} />
                      </div>
                    </div>
                  </div>

                </div>

              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500 py-10">No se pudo cargar la información de la pensión.</div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-colors"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};

export default PensionDetailModal;
