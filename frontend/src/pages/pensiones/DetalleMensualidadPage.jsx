import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '../../components/layout/MainLayout';
import { getMensualidadById, anularMensualidad } from '../../services/mensualidadService';
import { useAuth } from '../../context/AuthContext';
import Swal from 'sweetalert2';
import { FiArrowLeft, FiClock, FiDollarSign, FiInfo, FiTrash2, FiSettings, FiActivity } from 'react-icons/fi';
import AjusteMensualidadModal from '../../components/pensiones/mensualidades/AjusteMensualidadModal';

const TABS = [
  { id: 'info', label: 'Información y Cálculo', icon: FiInfo },
  { id: 'ajustes', label: 'Ajustes', icon: FiSettings },
  { id: 'historial', label: 'Historial', icon: FiClock },
];

export default function DetalleMensualidadPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { usuario } = useAuth();
  
  const [mensualidad, setMensualidad] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('info');
  const [isAjusteOpen, setIsAjusteOpen] = useState(false);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await getMensualidadById(id);
      if (res.success) {
        setMensualidad(res.mensualidad);
      }
    } catch (error) {
      Swal.fire('Error', 'No se pudo cargar la mensualidad', 'error');
      navigate('/pensiones/mensualidades');
    } finally {
      setLoading(false);
    }
  };

  const handleAnular = async () => {
    const { value: motivo } = await Swal.fire({
      title: 'Anular Obligación',
      text: 'Ingrese el motivo de la anulación:',
      input: 'textarea',
      inputPlaceholder: 'Motivo de la anulación...',
      showCancelButton: true,
      confirmButtonText: 'Confirmar Anulación',
      confirmButtonColor: '#d33',
      inputValidator: (value) => !value ? 'Debe ingresar un motivo' : null
    });

    if (motivo) {
      try {
        const res = await anularMensualidad(id, motivo);
        if (res.success) {
          Swal.fire('Anulada', 'La obligación ha sido anulada exitosamente.', 'success');
          fetchData();
        }
      } catch (error) {
        Swal.fire('Error', error.response?.data?.message || 'Error al anular', 'error');
      }
    }
  };

  if (loading || !mensualidad) return (
    <MainLayout><div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#27A9E1]"></div></div></MainLayout>
  );

  return (
    <MainLayout title={`Obligación ${mensualidad.codigo}`} subtitle="Inicio / Control Financiero / Mensualidades / Detalle">
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/pensiones/mensualidades')} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors">
            <FiArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{mensualidad.est_nombres} {mensualidad.est_apellidos}</h1>
            <div className="text-sm text-gray-500 flex items-center gap-2 mt-1">
              <span className="font-mono bg-gray-100 px-2 rounded font-bold">{mensualidad.codigo}</span>
              <span>{mensualidad.mes_nombre}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold text-white uppercase bg-gray-600`}>
                {mensualidad.estado}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {mensualidad.estado !== 'ANULADA' && mensualidad.estado !== 'PAGADA' && usuario?.es_admin && (
            <button onClick={() => setIsAjusteOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-bold transition-colors">
              <FiSettings /> Aplicar Ajuste
            </button>
          )}
          
          {mensualidad.estado !== 'ANULADA' && parseFloat(mensualidad.total_pagado) === 0 && usuario?.es_admin && (
            <button onClick={handleAnular} className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-xl text-sm font-bold transition-colors">
              <FiTrash2 /> Anular Obligación
            </button>
          )}
        </div>
      </div>

      <div className="flex border-b border-gray-200 mb-6 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id ? 'border-[#27A9E1] text-[#27A9E1]' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <tab.icon size={16} /> {tab.label} {tab.id === 'ajustes' && mensualidad.ajustes?.length > 0 && `(${mensualidad.ajustes.length})`}
          </button>
        ))}
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 min-h-[400px]">
        {activeTab === 'info' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-gray-800 border-b pb-2 mb-3">Fechas y Matrícula</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Matrícula:</span> <span className="font-mono text-gray-900">{mensualidad.numero_matricula}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Curso:</span> <span className="font-medium text-gray-900">{mensualidad.curso_nombre} "{mensualidad.paralelo_nombre}"</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Emisión:</span> <span className="font-medium text-gray-900">{new Date(mensualidad.fecha_emision).toLocaleDateString('es-EC')}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500 font-bold">Vencimiento:</span> <span className="font-medium text-red-600 font-bold">{new Date(mensualidad.fecha_vencimiento).toLocaleDateString('es-EC')}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Asignación Utilizada:</span> <span className="font-mono text-gray-700">#{mensualidad.asignacion_pension_id}</span></div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-gray-800 border-b pb-2 mb-3">Beneficios Aplicados (Snapshot)</h3>
                {mensualidad.beneficios_snapshot && mensualidad.beneficios_snapshot.length > 0 ? (
                  <div className="space-y-2">
                    {mensualidad.beneficios_snapshot.map((b, i) => (
                      <div key={i} className="bg-emerald-50 border border-emerald-100 p-2 rounded flex justify-between text-sm">
                        <span className="font-bold text-emerald-800">{b.nombre}</span>
                        <span className="text-emerald-700 font-mono">
                          {b.tipo_calculo_snapshot === 'PORCENTAJE' ? `${b.porcentaje_aplicado}%` : `$${parseFloat(b.valor_aplicado || b.valor_final_especial).toFixed(2)}`}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">No aplicaron becas ni descuentos de asignación.</p>
                )}
              </div>
            </div>

            <div>
              <div className="bg-[#27A9E1]/5 p-6 rounded-2xl border border-[#27A9E1]/20 h-full">
                <h3 className="text-sm font-bold text-[#27A9E1] border-b border-[#27A9E1]/20 pb-2 mb-4 uppercase tracking-wider">Cálculo Financiero</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Tarifa Base</span>
                    <span className="font-mono">${parseFloat(mensualidad.tarifa_base_snapshot).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-600">
                    <span>Descuentos Asignación</span>
                    <span className="font-mono">-${parseFloat(mensualidad.descuento_snapshot).toFixed(2)}</span>
                  </div>
                  <div className="border-t border-gray-200 my-2"></div>
                  <div className="flex justify-between font-bold text-gray-900">
                    <span>Valor Original Generado</span>
                    <span className="font-mono">${parseFloat(mensualidad.valor_original).toFixed(2)}</span>
                  </div>
                  
                  {parseFloat(mensualidad.valor_ajustes) !== 0 && (
                    <div className={`flex justify-between font-bold mt-2 ${parseFloat(mensualidad.valor_ajustes) > 0 ? 'text-blue-600' : 'text-emerald-600'}`}>
                      <span>Ajustes Manuales ({mensualidad.ajustes?.length || 0})</span>
                      <span className="font-mono">{parseFloat(mensualidad.valor_ajustes) > 0 ? '+' : ''}${parseFloat(mensualidad.valor_ajustes).toFixed(2)}</span>
                    </div>
                  )}

                  <div className="border-t-2 border-[#27A9E1] pt-3 mt-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-700 font-bold">Valor Actual Exigible</span>
                      <span className="font-mono font-bold text-xl">${parseFloat(mensualidad.valor_actual).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-emerald-600 mb-2">
                      <span>Total Pagado a la Fecha</span>
                      <span className="font-mono font-bold">-${parseFloat(mensualidad.total_pagado).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center mt-4 pt-2 border-t border-[#27A9E1]/30">
                      <span className="font-black text-gray-900 text-lg">Saldo Pendiente</span>
                      <span className={`font-mono font-black text-3xl ${parseFloat(mensualidad.saldo) > 0 ? 'text-[#27A9E1]' : 'text-emerald-500'}`}>
                        ${parseFloat(mensualidad.saldo).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'ajustes' && (
          <div>
            <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Ajustes Registrados</h3>
            {mensualidad.ajustes?.length === 0 ? (
              <div className="text-center p-8 text-gray-500">No hay ajustes registrados en esta obligación.</div>
            ) : (
              <div className="space-y-4">
                {mensualidad.ajustes?.map(ajuste => (
                  <div key={ajuste.id} className="border border-gray-200 rounded-xl p-4 flex justify-between items-center">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${ajuste.signo === 'SUMA' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {ajuste.tipo}
                        </span>
                        <span className="text-xs text-gray-500">{moment(ajuste.created_at).format('DD/MM/YYYY HH:mm')}</span>
                      </div>
                      <p className="text-sm font-medium text-gray-800 mt-2">{ajuste.motivo}</p>
                    </div>
                    <div className="text-right">
                      <span className={`font-mono font-bold text-lg ${ajuste.signo === 'SUMA' ? 'text-blue-600' : 'text-emerald-600'}`}>
                        {ajuste.signo === 'SUMA' ? '+' : '-'}${parseFloat(ajuste.valor).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'historial' && (
          <div>
            <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Historial de la Obligación</h3>
            <div className="space-y-4">
               {mensualidad.historial?.map((h, i) => (
                 <div key={h.id} className="flex gap-4">
                   <div className="flex flex-col items-center">
                     <div className="w-3 h-3 bg-gray-400 rounded-full mt-1.5"></div>
                     {i !== mensualidad.historial.length - 1 && <div className="w-0.5 bg-gray-200 flex-1 my-1"></div>}
                   </div>
                   <div className="bg-gray-50 p-3 rounded-xl flex-1 mb-2">
                     <div className="flex justify-between items-start">
                       <p className="font-bold text-sm text-gray-800">{h.accion}</p>
                       <span className="text-xs text-gray-400">{moment(h.created_at).format('DD/MM/YYYY HH:mm')}</span>
                     </div>
                     {h.estado_nuevo && <p className="text-xs text-gray-600 mt-1">Estado: <span className="font-bold">{h.estado_anterior} &rarr; {h.estado_nuevo}</span></p>}
                     {h.motivo && <p className="text-xs text-gray-600 mt-2 italic">"{h.motivo}"</p>}
                   </div>
                 </div>
               ))}
             </div>
          </div>
        )}
      </div>

      <AjusteMensualidadModal 
        isOpen={isAjusteOpen} 
        onClose={() => setIsAjusteOpen(false)} 
        obligacionId={id} 
        onSuccess={() => { setIsAjusteOpen(false); fetchData(); }} 
      />
    </MainLayout>
  );
}
