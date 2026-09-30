import React, { useState, useEffect } from 'react';
import { FiX, FiDownload, FiClock, FiUser, FiInfo, FiFileText, FiTag, FiHash, FiCreditCard } from 'react-icons/fi';
import movimientosFinancierosService from '../../services/movimientosFinancierosService';
import Badge from '../ui/Badge';
import Swal from 'sweetalert2';

const formatDate = (dateString) => {
  if (!dateString) return '—';
  const options = { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'America/Guayaquil' };
  return new Date(dateString).toLocaleDateString('es-EC', options);
};

const formatDateTime = (dateString) => {
  if (!dateString) return '—';
  const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/Guayaquil' };
  return new Date(dateString).toLocaleDateString('es-EC', options);
};

const formatCurrency = (value) => {
  return new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(value || 0);
};

const MovimientoDetailDrawer = ({ isOpen, onClose, movimientoId }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && movimientoId) {
      loadData();
    } else {
      setData(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, movimientoId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await movimientosFinancierosService.getById(movimientoId);
      if (res.success) {
        setData(res);
      }
    } catch (error) {
      Swal.fire('Error', 'No se pudieron cargar los detalles del movimiento.', 'error');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!data?.data?.archivo_url) return;
    const url = movimientosFinancierosService.getArchivoUrl(data.data.id);
    window.open(url, '_blank');
  };

  if (!isOpen) return null;

  const item = data?.data;
  const auditoria = data?.auditoria || [];

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[70] transition-opacity" onClick={onClose}></div>
      
      {/* Drawer */}
      <div className={`fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-[80] transform transition-transform duration-300 ease-in-out flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100 bg-gray-50/80">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Detalle del Movimiento</h2>
            {item && (
              <p className="text-xs text-gray-500 font-mono mt-0.5">ID: {String(item.id).padStart(6, '0')}</p>
            )}
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-xl transition-colors">
            <FiX size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-white">
          {loading ? (
            <div className="p-6 space-y-4 animate-pulse">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-100 rounded-xl w-full"></div>
              ))}
            </div>
          ) : !item ? (
            <div className="p-6 text-center text-gray-500">No se encontraron datos.</div>
          ) : (
            <div className="p-6 space-y-6">
              
              {/* Status & Amount Banner */}
              <div className={`rounded-2xl p-5 border ${item.estado === 'ANULADO' ? 'bg-red-50/50 border-red-100' : 'bg-gray-50 border-gray-100'}`}>
                <div className="flex justify-between items-start mb-2">
                  <Badge variant={item.estado === 'ANULADO' ? 'red' : item.tipo === 'INGRESO' ? 'green' : 'red'}>
                    {item.estado === 'ANULADO' ? 'ANULADO' : item.tipo}
                  </Badge>
                  <span className={`text-2xl font-bold font-mono ${item.estado === 'ANULADO' ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                    {formatCurrency(item.valor)}
                  </span>
                </div>
                <h3 className="font-medium text-gray-800 mb-1">{item.descripcion}</h3>
                <p className="text-xs text-gray-500 flex items-center gap-1.5"><FiCalendar size={12}/> {formatDate(item.fecha)} | Periodo: {item.periodo}</p>
                
                {item.estado === 'ANULADO' && (
                  <div className="mt-3 pt-3 border-t border-red-200/50">
                    <p className="text-xs text-red-600 font-medium mb-1">Motivo de Anulación:</p>
                    <p className="text-xs text-red-500">{item.motivo_anulacion}</p>
                    <p className="text-[10px] text-red-400 mt-1">Anulado por {item.anulado_por_nombre} el {formatDateTime(item.anulado_at)}</p>
                  </div>
                )}
              </div>

              {/* Categorization */}
              <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2"><FiTag size={12}/> Clasificación</h4>
                <div className="bg-gray-50 rounded-xl p-4 space-y-3 border border-gray-100">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Concepto:</span>
                    <span className="font-medium text-gray-800 text-right">{item.concepto} <br/><span className="text-xs font-mono text-gray-400">{item.codigo}</span></span>
                  </div>
                  <div className="flex justify-between text-sm border-t border-gray-100 pt-3">
                    <span className="text-gray-500">Categoría:</span>
                    <span className="font-medium text-gray-800">{item.categoria}</span>
                  </div>
                  {item.requiere_mes && (
                    <div className="flex justify-between text-sm border-t border-gray-100 pt-3">
                      <span className="text-gray-500">Mes Aplicación:</span>
                      <span className="font-medium text-gray-800">{new Date(item.mes_aplicacion).toLocaleDateString('es-EC', {month:'long', year:'numeric', timeZone: 'America/Guayaquil'})}</span>
                    </div>
                  )}
                  {item.personal_nombre && (
                    <div className="flex justify-between text-sm border-t border-gray-100 pt-3">
                      <span className="text-gray-500 flex items-center gap-1"><FiUser size={14}/> Personal:</span>
                      <span className="font-medium text-gray-800">{item.personal_nombre}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm border-t border-gray-100 pt-3">
                    <span className="text-gray-500 flex items-center gap-1"><FiCreditCard size={14}/> Cuenta:</span>
                    <span className="font-medium text-gray-800">{item.cuenta} <span className="text-xs font-normal text-gray-400">({item.tipo_cuenta})</span></span>
                  </div>
                </div>
              </div>

              {/* Additional Info */}
              <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2"><FiInfo size={12}/> Información Adicional</h4>
                <div className="bg-gray-50 rounded-xl p-4 space-y-3 border border-gray-100">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Registrado por:</span>
                    <span className="font-medium text-gray-800 flex items-center gap-1.5"><FiUser size={14}/> {item.registrado_por}</span>
                  </div>
                  <div className="flex justify-between text-sm border-t border-gray-100 pt-3">
                    <span className="text-gray-500">Fecha registro:</span>
                    <span className="font-medium text-gray-800">{formatDateTime(item.created_at)}</span>
                  </div>
                  {item.numero_comprobante && (
                    <div className="flex justify-between text-sm border-t border-gray-100 pt-3">
                      <span className="text-gray-500 flex items-center gap-1"><FiHash size={14}/> Comprobante:</span>
                      <span className="font-medium text-gray-800 font-mono">{item.numero_comprobante}</span>
                    </div>
                  )}
                  {item.observacion && (
                    <div className="border-t border-gray-100 pt-3">
                      <span className="text-gray-500 text-sm block mb-1">Observación:</span>
                      <p className="text-sm text-gray-800 bg-white p-2 rounded border border-gray-200">{item.observacion}</p>
                    </div>
                  )}
                  {item.notas && (
                    <div className="border-t border-gray-100 pt-3">
                      <span className="text-gray-500 text-sm block mb-1">Notas:</span>
                      <p className="text-sm text-gray-800 bg-white p-2 rounded border border-gray-200 whitespace-pre-wrap">{item.notas}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Attachment */}
              {item.archivo_url && (
                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2"><FiFileText size={12}/> Documento Adjunto</h4>
                  <button 
                    onClick={handleDownload}
                    className="w-full flex items-center justify-between p-4 bg-blue-50/50 border border-blue-100 hover:bg-blue-50 hover:border-blue-200 rounded-xl transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                        <FiFileText size={20} />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-medium text-gray-800 group-hover:text-blue-700">Documento Financiero</p>
                        <p className="text-xs text-gray-500">Ver archivo adjunto</p>
                      </div>
                      {item.personal_nombre && (
                        <div className="mt-2 pt-2 border-t border-blue-100">
                          <p className="text-xs text-gray-500">Personal Relacionado</p>
                          <p className="text-sm font-medium text-gray-800">{item.personal_nombre}</p>
                        </div>
                      )}
                    </div>
                    <FiDownload size={18} className="text-gray-400 group-hover:text-blue-600" />
                  </button>
                </div>
              )}

              {/* Audit Trail */}
              {auditoria && auditoria.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2"><FiClock size={12}/> Historial de Cambios</h4>
                  <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                    {auditoria.map((audit, i) => (
                      <div key={audit.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                        {/* Icono linea tiempo */}
                        <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-100 text-slate-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                          <FiClock size={16} />
                        </div>
                        {/* Card */}
                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-3 rounded-xl border border-slate-100 bg-white shadow-sm">
                          <div className="flex items-center justify-between space-x-2 mb-1">
                            <div className="font-bold text-slate-800 text-xs">
                              {audit.accion}
                            </div>
                            <time className="text-[10px] text-slate-500">{formatDateTime(audit.created_at)}</time>
                          </div>
                          <div className="text-slate-500 text-xs">
                            Por <span className="font-medium text-slate-700">{audit.usuario_nombre}</span>
                          </div>
                          {audit.motivo && (
                            <div className="mt-1 text-[10px] text-slate-600 bg-slate-50 p-1.5 rounded border border-slate-100">
                              <span className="font-medium">Motivo:</span> {audit.motivo}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default MovimientoDetailDrawer;
