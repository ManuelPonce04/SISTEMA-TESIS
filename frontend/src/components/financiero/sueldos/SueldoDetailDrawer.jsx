import React, { useState, useEffect } from 'react';
import sueldosAnticiposService from '../../../services/sueldosAnticiposService';
import Badge from '../../ui/Badge';
import { FiX, FiInfo, FiDollarSign, FiClock, FiFileText } from 'react-icons/fi';
// Exports use native browser APIs (no external dependencies required)

const SueldoDetailDrawer = ({ isOpen, onClose, personalId, periodoId, mesAplicacion, onDarAnticipo }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && personalId && periodoId && mesAplicacion) {
      loadData();
    } else {
      setData(null);
    }
  }, [isOpen, personalId, periodoId, mesAplicacion]);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await sueldosAnticiposService.getDetalleTrabajador(personalId, periodoId, mesAplicacion);
      if (res.success) setData(res.data);
    } catch (error) {
      console.error('Error load', error);
    } finally {
      setLoading(false);
    }
  };

  const exportPDF = () => {
    // Use native browser print dialog
    window.print();
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-40 transition-opacity" onClick={onClose} />
      
      <div className={`fixed inset-y-0 right-0 w-full max-w-xl bg-gray-50 shadow-2xl z-50 transform transition-transform duration-300 flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        
        <div className="bg-white px-6 py-4 border-b border-gray-100 flex items-center justify-between shadow-sm z-10">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Detalle del Mes</h2>
            <p className="text-sm text-gray-500 font-mono mt-0.5">{new Date(mesAplicacion).toLocaleDateString('es-EC', { month: 'long', year: 'numeric', timeZone: 'America/Guayaquil' })}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={exportPDF} disabled={!data} className="px-3 py-1.5 text-sm font-medium text-white bg-[#27A9E1] rounded hover:bg-blue-600 disabled:opacity-50 transition-colors">
              PDF
            </button>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
              <FiX size={20} />
            </button>
          </div>
        </div>

        {loading || !data ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-[#27A9E1]/30 border-t-[#27A9E1] rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            
            {/* Info Basica */}
            <div className="bg-white p-6 border-b border-gray-100">
              <h3 className="text-2xl font-bold text-gray-800">{data.personal.nombre_completo}</h3>
              <p className="text-sm text-gray-500 mt-1">{data.personal.cargo_nombre} - {data.personal.contrato_nombre}</p>
              {data.sueldo_base <= 0 && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg flex gap-2 text-sm items-start">
                  <FiInfo className="mt-0.5 flex-shrink-0" />
                  <p>El trabajador no tiene un sueldo configurado vigente para este mes. No se pueden registrar anticipos hasta que se corrija el historial salarial.</p>
                </div>
              )}
            </div>

            {/* Resumen Numeros */}
            <div className="p-6 space-y-6">
              
              <div className="grid grid-cols-2 gap-4">
                
                {/* Ingresos */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                  <h4 className="text-xs font-bold text-gray-400 uppercase mb-3 flex items-center gap-1"><FiDollarSign /> Ingresos (A)</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-gray-500">Sueldo Base</span><span className="font-mono text-gray-800">${parseFloat(data.sueldo_base).toFixed(2)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Horas Extras</span><span className="font-mono text-gray-800">${parseFloat(data.ajustes.horas_extras).toFixed(2)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Otros Ingresos</span><span className="font-mono text-gray-800">${parseFloat(data.ajustes.otros_ingresos).toFixed(2)}</span></div>
                    <div className="pt-2 border-t flex justify-between font-bold">
                      <span className="text-gray-700">Total Ingresos</span>
                      <span className="text-green-600 font-mono">${parseFloat(data.totales.ingresos).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Egresos */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                  <h4 className="text-xs font-bold text-gray-400 uppercase mb-3 flex items-center gap-1"><FiDollarSign /> Egresos (B)</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-gray-500">Anticipos Activos</span><span className="font-mono text-gray-800">${parseFloat(data.totales.anticipos).toFixed(2)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Otras Deducc.</span><span className="font-mono text-gray-800">${parseFloat(data.ajustes.otras_deducciones).toFixed(2)}</span></div>
                    <div className="pt-2 border-t mt-auto flex justify-between font-bold">
                      <span className="text-gray-700">Total Egresos</span>
                      <span className="text-red-500 font-mono">${parseFloat(data.totales.deducciones).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Neto */}
              <div className={`p-5 rounded-xl border flex items-center justify-between ${data.totales.neto_estimado < 0 ? 'bg-red-50 border-red-200 text-red-800' : 'bg-[#27A9E1]/10 border-[#27A9E1]/20 text-blue-900'}`}>
                <div>
                  <h4 className="font-bold text-lg">Neto Estimado (A - B)</h4>
                  <p className="text-xs opacity-70">Saldo disponible después de descuentos provisionales.</p>
                </div>
                <span className="text-3xl font-mono font-bold">${parseFloat(data.totales.neto_estimado).toFixed(2)}</span>
              </div>

              {/* Lista Anticipos */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold text-gray-700 flex items-center gap-2"><FiFileText /> Anticipos Registrados en el Mes</h4>
                  {onDarAnticipo && (
                    <button 
                      onClick={() => onDarAnticipo(data.personal)}
                      disabled={data.sueldo_base <= 0}
                      className="px-3 py-1.5 bg-[#27A9E1] text-white rounded-lg text-xs font-medium hover:bg-blue-600 transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <FiDollarSign size={14} /> Registrar anticipo
                    </button>
                  )}
                </div>
                {data.anticipos.length === 0 ? (
                  <div className="bg-white border border-gray-100 border-dashed rounded-xl p-8 text-center text-gray-400">
                    <FiClock size={24} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No hay anticipos registrados para este mes.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {data.anticipos.map(a => (
                      <div key={a.id} className={`bg-white rounded-xl p-4 border shadow-sm ${a.estado === 'ANULADO' ? 'border-gray-200 opacity-60' : 'border-gray-100'}`}>
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <span className="font-mono text-lg font-bold text-gray-800">${parseFloat(a.valor).toFixed(2)}</span>
                            {a.estado === 'ANULADO' && <Badge variant="gray" className="ml-2">ANULADO</Badge>}
                          </div>
                          <p className="text-xs text-gray-500">{new Date(a.fecha).toLocaleDateString()}</p>
                        </div>
                        <p className="text-sm text-gray-700">{a.descripcion}</p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-[10px] text-gray-500">
                          <span>Cuenta: {a.cuenta}</span>
                          <span>Reg: {a.registrado_por}</span>
                        </div>
                        {a.valor_excedido && (
                          <div className="mt-2 pt-2 border-t border-red-100">
                            <p className="text-[10px] text-red-600 font-medium">Autorización Extraordinaria por excedente de ${parseFloat(a.valor_excedido).toFixed(2)}</p>
                            <p className="text-[10px] text-red-500 italic mt-0.5">"{a.justificacion}"</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default SueldoDetailDrawer;
