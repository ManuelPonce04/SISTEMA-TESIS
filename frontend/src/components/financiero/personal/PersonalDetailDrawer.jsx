import React, { useState, useEffect } from 'react';
import personalService from '../../../services/personalService';
import Badge from '../../ui/Badge';
import { 
  FiX, FiUser, FiBriefcase, FiDollarSign, FiClock, 
  FiMapPin, FiMail, FiPhone, FiCalendar
} from 'react-icons/fi';

const PersonalDetailDrawer = ({ isOpen, onClose, personalId }) => {
  const [personal, setPersonal] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('info');

  useEffect(() => {
    if (isOpen && personalId) {
      loadData();
    } else {
      setPersonal(null);
      setHistorial([]);
      setActiveTab('info');
    }
  }, [isOpen, personalId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [resPersonal, resHistorial] = await Promise.all([
        personalService.getById(personalId),
        personalService.getHistorialSueldos(personalId)
      ]);
      if (resPersonal.success) setPersonal(resPersonal.data);
      if (resHistorial.success) setHistorial(resHistorial.data);
    } catch (error) {
      console.error('Error loading detail', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-40 transition-opacity" onClick={onClose} />
      
      {/* Drawer */}
      <div className={`fixed inset-y-0 right-0 w-full max-w-xl bg-gray-50 shadow-2xl z-50 transform transition-transform duration-300 flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        
        {/* Header */}
        <div className="bg-white px-6 py-4 border-b border-gray-100 flex items-center justify-between shadow-sm z-10">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Detalle de Personal</h2>
            {personal && <p className="text-sm text-gray-500 font-mono mt-0.5">{personal.codigo_interno}</p>}
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
            <FiX size={20} />
          </button>
        </div>

        {loading || !personal ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-[#27A9E1]/30 border-t-[#27A9E1] rounded-full animate-spin"></div>
          </div>
        ) : (
          <>
            {/* Perfil Header */}
            <div className="bg-white px-6 py-6 border-b border-gray-100">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-gray-800">{personal.nombre_completo}</h3>
                  <div className="flex gap-3 mt-2">
                    <Badge variant={personal.estado === 'ACTIVO' ? 'green' : 'gray'}>{personal.estado}</Badge>
                    <Badge variant={personal.contrato_codigo === 'PL' ? 'blue' : 'amber'}>{personal.contrato_nombre}</Badge>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500 mb-1">Sueldo Actual</p>
                  <p className="text-2xl font-mono font-bold text-green-600">${parseFloat(personal.sueldo_actual).toFixed(2)}</p>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="bg-white px-6 flex gap-6 border-b border-gray-100 text-sm font-medium">
              <button onClick={() => setActiveTab('info')} className={`py-3 border-b-2 transition-colors ${activeTab === 'info' ? 'border-[#27A9E1] text-[#27A9E1]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Información</button>
              <button onClick={() => setActiveTab('laboral')} className={`py-3 border-b-2 transition-colors ${activeTab === 'laboral' ? 'border-[#27A9E1] text-[#27A9E1]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Laboral</button>
              <button onClick={() => setActiveTab('sueldos')} className={`py-3 border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'sueldos' ? 'border-[#27A9E1] text-[#27A9E1]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                Historial Salarial <span className="bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">{historial.length}</span>
              </button>
            </div>

            {/* Contenido */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
              
              {activeTab === 'info' && (
                <div className="space-y-6 animate-fade-in">
                  <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
                    <h4 className="flex items-center gap-2 font-semibold text-gray-700 mb-4 pb-2 border-b"><FiUser className="text-[#27A9E1]" /> Datos Personales</h4>
                    <div className="grid grid-cols-2 gap-y-4 gap-x-6">
                      <div><p className="text-xs text-gray-500">Cédula</p><p className="font-mono text-gray-800">{personal.cedula || 'No registrada'}</p></div>
                      <div><p className="text-xs text-gray-500">Nombre Corto</p><p className="text-gray-800">{personal.nombre_corto || '—'}</p></div>
                      <div><p className="text-xs text-gray-500">Apellidos</p><p className="text-gray-800">{personal.apellidos || '—'}</p></div>
                      <div><p className="text-xs text-gray-500">Nombres</p><p className="text-gray-800">{personal.nombres || '—'}</p></div>
                      <div className="col-span-2">
                        <p className="text-xs text-gray-500">Fecha de Nacimiento</p>
                        <p className="text-gray-800">{personal.fecha_nacimiento ? new Date(personal.fecha_nacimiento).toLocaleDateString() : '—'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
                    <h4 className="flex items-center gap-2 font-semibold text-gray-700 mb-4 pb-2 border-b"><FiMapPin className="text-[#27A9E1]" /> Contacto</h4>
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 text-gray-700"><FiMail className="text-gray-400" /> <span>{personal.correo || 'Sin correo'}</span></div>
                      <div className="flex items-center gap-3 text-gray-700"><FiPhone className="text-gray-400" /> <span>{personal.telefono || 'Sin teléfono'}</span></div>
                      <div className="flex items-center gap-3 text-gray-700 items-start"><FiMapPin className="text-gray-400 mt-1" /> <span>{personal.direccion || 'Sin dirección registrada'}</span></div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'laboral' && (
                <div className="space-y-6 animate-fade-in">
                  <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
                    <h4 className="flex items-center gap-2 font-semibold text-gray-700 mb-4 pb-2 border-b"><FiBriefcase className="text-[#27A9E1]" /> Contrato y Cargo</h4>
                    <div className="grid grid-cols-2 gap-y-4 gap-x-6">
                      <div><p className="text-xs text-gray-500">Tipo de Contrato</p><p className="text-gray-800">{personal.contrato_nombre}</p></div>
                      <div><p className="text-xs text-gray-500">Modalidad de Pago</p><p className="text-gray-800">{personal.modalidad_pago || '—'}</p></div>
                      <div><p className="text-xs text-gray-500">Cargo Institucional</p><p className="text-gray-800">{personal.cargo_nombre || '—'}</p></div>
                      <div><p className="text-xs text-gray-500">Función Base</p><p className="text-gray-800">{personal.funcion_nombre || '—'}</p></div>
                      
                      <div className="col-span-2 pt-2 border-t border-gray-50">
                        <p className="text-xs text-gray-500 mb-1">Observación</p>
                        <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100">{personal.observacion || 'Ninguna observación.'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
                    <h4 className="flex items-center gap-2 font-semibold text-gray-700 mb-4 pb-2 border-b"><FiCalendar className="text-[#27A9E1]" /> Fechas</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-500">Fecha de Ingreso</p>
                        <p className="text-gray-800 font-medium">{personal.fecha_ingreso ? new Date(personal.fecha_ingreso).toLocaleDateString() : '—'}</p>
                      </div>
                      {personal.estado === 'INACTIVO' && (
                        <div>
                          <p className="text-xs text-red-500">Fecha de Salida</p>
                          <p className="text-gray-800 font-medium">{personal.fecha_salida ? new Date(personal.fecha_salida).toLocaleDateString() : '—'}</p>
                        </div>
                      )}
                    </div>
                    {personal.estado === 'INACTIVO' && personal.motivo_inactivacion && (
                      <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-lg">
                        <p className="text-xs text-red-600 font-medium mb-1">Motivo de Salida</p>
                        <p className="text-sm text-red-800">{personal.motivo_inactivacion}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'sueldos' && (
                <div className="animate-fade-in relative">
                  {historial.length === 0 ? (
                    <div className="text-center py-10 text-gray-400">
                      <FiClock size={32} className="mx-auto mb-3 opacity-50" />
                      <p>No hay historial salarial registrado.</p>
                    </div>
                  ) : (
                    <div className="space-y-4 relative before:absolute before:inset-y-0 before:left-[19px] before:w-0.5 before:bg-gray-200 pl-2">
                      {historial.map((h, index) => {
                        const isVigente = !h.fecha_hasta;
                        return (
                          <div key={h.id} className="relative pl-10">
                            <div className={`absolute left-0 top-1.5 w-6 h-6 rounded-full border-4 border-gray-50 z-10 flex items-center justify-center ${isVigente ? 'bg-green-500' : 'bg-gray-300'}`}>
                              {isVigente && <div className="w-2 h-2 bg-white rounded-full"></div>}
                            </div>
                            <div className={`bg-white rounded-xl p-4 border shadow-sm transition-all ${isVigente ? 'border-green-200 shadow-green-500/5' : 'border-gray-100'}`}>
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <span className={`font-mono text-lg font-bold ${isVigente ? 'text-green-600' : 'text-gray-600'}`}>
                                    ${parseFloat(h.sueldo).toFixed(2)}
                                  </span>
                                  {isVigente && <span className="ml-2 text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded uppercase">Vigente</span>}
                                </div>
                                <div className="text-right text-xs text-gray-500">
                                  <p>Desde: {new Date(h.fecha_desde).toLocaleDateString()}</p>
                                  {h.fecha_hasta && <p>Hasta: {new Date(h.fecha_hasta).toLocaleDateString()}</p>}
                                </div>
                              </div>
                              <p className="text-sm text-gray-700 mb-2">{h.motivo}</p>
                              <p className="text-[10px] text-gray-400">Registrado por: {h.usuario_nombre}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

            </div>
          </>
        )}
      </div>
    </>
  );
};

export default PersonalDetailDrawer;
