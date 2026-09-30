import React, { useState, useEffect } from 'react';
import { FiX, FiCheck, FiXCircle, FiCreditCard, FiPrinter, FiAlertCircle } from 'react-icons/fi';
import matriculaService from '../../../services/matriculaService';
import PagoMatriculaModal from './PagoMatriculaModal';

const DetalleMatriculaDrawer = ({ matriculaId, onClose }) => {
  const [matricula, setMatricula] = useState(null);
  const [pagos, setPagos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('INFO'); // INFO, PAGOS, HISTORIAL
  const [showPagoModal, setShowPagoModal] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (matriculaId) {
      loadData();
    }
  }, [matriculaId]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await matriculaService.getMatriculaById(matriculaId);
      if (res.success) {
        setMatricula(res.data);
      }
      const pRes = await matriculaService.getPagos(matriculaId);
      if (pRes.success) {
        setPagos(pRes.data);
      }
    } catch (err) {
      setError('Error al cargar la matrícula');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmar = async () => {
    if (!window.confirm('¿Está seguro de confirmar esta matrícula? Ocupará un cupo.')) return;
    try {
      const res = await matriculaService.confirmarMatricula(matriculaId);
      if (res.success) {
        loadData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error al confirmar');
    }
  };

  const handleAnular = async () => {
    const motivo = window.prompt('Ingrese el motivo de anulación:');
    if (!motivo) return;
    try {
      const res = await matriculaService.anularMatricula(matriculaId, motivo);
      if (res.success) {
        loadData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error al anular');
    }
  };

  const handleAnularPago = async (pagoId) => {
    const motivo = window.prompt('Ingrese motivo de anulación de pago:');
    if (!motivo) return;
    try {
      const res = await matriculaService.anularPago(matriculaId, pagoId, motivo);
      if (res.success) {
        loadData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error al anular pago');
    }
  };

  if (!matricula && loading) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col animate-slide-in-right">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-200">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Detalle de Matrícula</h2>
            <div className="text-sm text-slate-500 mt-1 flex items-center gap-2">
              <span className="font-medium text-[#27A9E1]">{matricula?.numero_matricula}</span>
              <span>•</span>
              <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                matricula?.estado === 'ACTIVA' ? 'bg-green-100 text-green-700' :
                matricula?.estado === 'PENDIENTE' ? 'bg-amber-100 text-amber-700' :
                matricula?.estado === 'BORRADOR' ? 'bg-slate-100 text-slate-600' :
                'bg-red-100 text-red-700'
              }`}>
                {matricula?.estado}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
            <FiX size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 px-6 mt-2">
          {['INFO', 'PAGOS', 'HISTORIAL'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 px-4 text-sm font-medium transition-colors ${
                activeTab === tab 
                  ? 'border-b-2 border-[#27A9E1] text-[#27A9E1]' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab === 'INFO' ? 'Información' : tab === 'PAGOS' ? 'Pagos' : 'Historial'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && <div className="text-red-500 mb-4">{error}</div>}

          {activeTab === 'INFO' && matricula && (
            <div className="space-y-6">
              {/* Resumen Estudiante */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Estudiante</h3>
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-bold text-slate-800">{matricula.estudiante_nombres} {matricula.estudiante_apellidos}</div>
                    <div className="text-sm text-slate-500">CI: {matricula.estudiante_cedula} • Cód: {matricula.estudiante_codigo}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-slate-700">Responsable Económico</div>
                    <div className="text-sm text-slate-500">{matricula.resp_nombres ? `${matricula.resp_nombres} ${matricula.resp_apellidos}` : 'No asignado'}</div>
                  </div>
                </div>
              </div>

              {/* Oferta y Costos */}
              <div className="grid grid-cols-2 gap-4">
                <div className="border border-slate-200 rounded-xl p-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Oferta Académica</h3>
                  <div className="font-medium text-slate-800">{matricula.curso_nombre} "{matricula.paralelo_nombre}"</div>
                  <div className="text-sm text-slate-500">Jornada: {matricula.jornada_nombre || 'N/A'}</div>
                  <div className="text-sm text-slate-500 mt-2">Tipo: {matricula.tipo_matricula_nombre}</div>
                </div>
                
                <div className="border border-slate-200 rounded-xl p-4 bg-[#27A9E1]/5">
                  <h3 className="text-xs font-bold text-[#27A9E1] uppercase tracking-wider mb-2">Resumen Económico</h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between text-slate-600"><span>Tarifa Base:</span> <span>${parseFloat(matricula.tarifa_base).toFixed(2)}</span></div>
                    {parseFloat(matricula.valor_descuento) > 0 && (
                      <div className="flex justify-between text-green-600"><span>Descuento:</span> <span>-${parseFloat(matricula.valor_descuento).toFixed(2)}</span></div>
                    )}
                    <div className="flex justify-between font-bold text-slate-800 border-t border-slate-200 pt-1 mt-1">
                      <span>Valor Final:</span> <span>${parseFloat(matricula.valor_final).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600"><span>Pagado:</span> <span>${parseFloat(matricula.total_pagado).toFixed(2)}</span></div>
                    <div className="flex justify-between font-bold text-amber-600">
                      <span>Saldo:</span> <span>${parseFloat(matricula.saldo).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'PAGOS' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-slate-800">Historial de Pagos</h3>
                {matricula?.estado !== 'ANULADA' && parseFloat(matricula?.saldo) > 0 && (
                  <button 
                    onClick={() => setShowPagoModal(true)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
                  >
                    <FiCreditCard /> Registrar Pago
                  </button>
                )}
              </div>

              {pagos.length === 0 ? (
                <div className="text-center p-8 text-slate-400 bg-slate-50 rounded-xl border border-slate-100">
                  No hay pagos registrados para esta matrícula.
                </div>
              ) : (
                <div className="space-y-3">
                  {pagos.map(p => (
                    <div key={p.id} className={`p-4 rounded-xl border flex justify-between items-center ${p.estado === 'ANULADO' ? 'bg-red-50 border-red-100 opacity-70' : 'bg-white border-slate-200'}`}>
                      <div>
                        <div className="font-bold text-slate-800">${parseFloat(p.valor).toFixed(2)}</div>
                        <div className="text-xs text-slate-500">{new Date(p.fecha).toLocaleDateString()} • {p.cuenta_nombre || 'Sin cuenta'}</div>
                        {p.estado === 'ANULADO' && <div className="text-xs text-red-600 font-medium mt-1">ANULADO: {p.motivo_anulacion}</div>}
                      </div>
                      <div className="flex items-center gap-2">
                        {p.estado === 'ACTIVO' && (
                          <button 
                            onClick={() => handleAnularPago(p.id)}
                            className="text-xs text-red-500 hover:text-red-700 underline"
                          >
                            Anular
                          </button>
                        )}
                        <span className={`px-2 py-1 rounded text-[10px] font-bold ${p.estado === 'ACTIVO' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {p.estado}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'HISTORIAL' && (
            <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-slate-100">
              El historial de auditoría y cambios académicos se mostrará aquí.
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-between">
          <button className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg text-sm font-medium transition-colors">
            <FiPrinter /> Imprimir Comprobante
          </button>
          
          <div className="flex gap-2">
            {matricula?.estado === 'BORRADOR' && (
              <button 
                onClick={handleConfirmar}
                className="flex items-center gap-2 px-4 py-2 bg-[#27A9E1] text-white rounded-lg hover:bg-[#1f8ec0] transition-colors text-sm font-medium shadow-sm"
              >
                <FiCheck /> Confirmar
              </button>
            )}
            {matricula?.estado !== 'ANULADA' && (
              <button 
                onClick={handleAnular}
                className="flex items-center gap-2 px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium"
              >
                <FiXCircle /> Anular Matrícula
              </button>
            )}
          </div>
        </div>
      </div>

      {showPagoModal && (
        <PagoMatriculaModal 
          matricula={matricula}
          onClose={() => setShowPagoModal(false)}
          onSuccess={() => {
            setShowPagoModal(false);
            loadData();
          }}
        />
      )}
    </div>
  );
};

export default DetalleMatriculaDrawer;
