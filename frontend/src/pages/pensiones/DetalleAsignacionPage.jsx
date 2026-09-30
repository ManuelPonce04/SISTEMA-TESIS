import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '../../components/layout/MainLayout';
import { getAsignacionById, enviarAprobacion, aprobarAsignacion, rechazarAsignacion, activarAsignacion, suspenderAsignacion, anularAsignacion } from '../../services/asignacionPensionService';
import { useAuth } from '../../context/AuthContext';
import Swal from 'sweetalert2';
import { FiArrowLeft, FiCheck, FiX, FiPlay, FiPause, FiTrash2, FiFileText, FiClock, FiDollarSign, FiInfo } from 'react-icons/fi';

const TABS = [
  { id: 'info', label: 'Información General', icon: FiInfo },
  { id: 'calculo', label: 'Tarifa y Cálculo', icon: FiDollarSign },
  { id: 'documentos', label: 'Documentos', icon: FiFileText },
  { id: 'historial', label: 'Historial', icon: FiClock },
];

export default function DetalleAsignacionPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { usuario } = useAuth();
  
  const [asignacion, setAsignacion] = useState(null);
  const [beneficios, setBeneficios] = useState([]);
  const [documentos, setDocumentos] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('info');

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await getAsignacionById(id);
      if (res.success) {
        setAsignacion(res.asignacion);
        setBeneficios(res.asignacion.beneficios || []);
        setDocumentos(res.asignacion.documentos || []);
        setHistorial(res.asignacion.historial || []);
      }
    } catch (error) {
      Swal.fire('Error', 'No se pudo cargar la asignación', 'error');
      navigate('/pensiones/asignaciones');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (actionFn, actionName, needsMotivo = false) => {
    try {
      let motivo = '';
      if (needsMotivo) {
        const { value } = await Swal.fire({
          title: `Motivo para ${actionName.toLowerCase()}`,
          input: 'textarea',
          inputPlaceholder: 'Ingrese el motivo aquí...',
          showCancelButton: true,
          confirmButtonText: 'Confirmar',
          cancelButtonText: 'Cancelar',
          confirmButtonColor: '#27A9E1',
          inputValidator: (v) => (!v || !v.trim()) ? 'El motivo es requerido' : null
        });
        if (!value) return;
        motivo = value;
      } else {
        const { isConfirmed } = await Swal.fire({
          title: `¿Confirmar ${actionName.toLowerCase()}?`,
          icon: 'question',
          showCancelButton: true,
          confirmButtonText: 'Sí, continuar',
          cancelButtonText: 'Cancelar',
          confirmButtonColor: '#27A9E1',
        });
        if (!isConfirmed) return;
      }

      const res = needsMotivo ? await actionFn(id, motivo) : await actionFn(id);
      if (res.success) {
        Swal.fire('Éxito', res.message, 'success');
        fetchData();
      }
    } catch (error) {
      Swal.fire('Error', error.response?.data?.message || `Error al ${actionName.toLowerCase()}`, 'error');
    }
  };

  if (loading || !asignacion) return (
    <MainLayout><div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#27A9E1]"></div></div></MainLayout>
  );

  return (
    <MainLayout title={`Asignación #${id}`} subtitle="Inicio / Control Financiero / Asignación de pensiones / Detalle">
      
      {/* Header y Acciones */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/pensiones/asignaciones')} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors">
            <FiArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {asignacion.est_nombres} {asignacion.est_apellidos}
            </h1>
            <div className="text-sm text-gray-500 flex items-center gap-2 mt-1">
              <span className="font-mono bg-gray-100 px-2 rounded">{asignacion.numero_matricula}</span>
              <span>{asignacion.periodo_nombre}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold text-white uppercase ${
                asignacion.estado === 'ACTIVA' ? 'bg-emerald-500' :
                asignacion.estado === 'APROBADA' ? 'bg-blue-500' :
                asignacion.estado === 'PENDIENTE_APROBACION' ? 'bg-amber-500' :
                'bg-gray-500'
              }`}>
                {asignacion.estado}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {asignacion.estado === 'BORRADOR' && (
            <button onClick={() => handleAction(enviarAprobacion, 'Enviar a Aprobación')} className="btn-action bg-amber-500 hover:bg-amber-600 text-white">
              Enviar a Aprobación
            </button>
          )}
          
          {asignacion.estado === 'PENDIENTE_APROBACION' && usuario?.es_admin && (
            <>
              <button onClick={() => handleAction(aprobarAsignacion, 'Aprobar')} className="btn-action bg-blue-500 hover:bg-blue-600 text-white"><FiCheck/> Aprobar</button>
              <button onClick={() => handleAction(rechazarAsignacion, 'Rechazar', true)} className="btn-action bg-red-500 hover:bg-red-600 text-white"><FiX/> Rechazar</button>
            </>
          )}

          {asignacion.estado === 'APROBADA' && usuario?.es_admin && (
            <button onClick={() => handleAction(activarAsignacion, 'Activar')} className="btn-action bg-emerald-500 hover:bg-emerald-600 text-white"><FiPlay/> Activar</button>
          )}

          {asignacion.estado === 'ACTIVA' && (
            <>
              <button onClick={() => handleAction(suspenderAsignacion, 'Suspender', true)} className="btn-action bg-orange-500 hover:bg-orange-600 text-white"><FiPause/> Suspender</button>
            </>
          )}

          {['ACTIVA', 'APROBADA', 'PENDIENTE_APROBACION'].includes(asignacion.estado) && usuario?.es_admin && (
            <button onClick={() => handleAction(anularAsignacion, 'Anular', true)} className="btn-action bg-gray-800 hover:bg-gray-900 text-white"><FiTrash2/> Anular</button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id ? 'border-[#27A9E1] text-[#27A9E1]' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <tab.icon size={16} /> {tab.label}
          </button>
        ))}
      </div>

      {/* Contenido Tabs */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 min-h-[400px]">
        {activeTab === 'info' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Datos Académicos</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Nivel:</span> <span className="font-medium text-gray-900">{asignacion.nivel_nombre}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Curso:</span> <span className="font-medium text-gray-900">{asignacion.curso_nombre}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Paralelo:</span> <span className="font-medium text-gray-900">{asignacion.paralelo_nombre}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Estado Matrícula:</span> <span className="font-medium text-gray-900">{asignacion.matricula_estado}</span></div>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Representantes</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Principal:</span> <span className="font-medium text-gray-900">{asignacion.rep_nombres} {asignacion.rep_apellidos}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Resp. Económico:</span> <span className="font-medium text-gray-900">{asignacion.resp_nombres} {asignacion.resp_apellidos}</span></div>
              </div>
              <h3 className="text-lg font-bold text-gray-800 mt-6 mb-4 border-b pb-2">Vigencia</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Desde:</span> <span className="font-medium text-gray-900">{moment(asignacion.mes_desde).format('MMMM YYYY')}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Hasta:</span> <span className="font-medium text-gray-900">{moment(asignacion.mes_hasta).format('MMMM YYYY')}</span></div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'calculo' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Resumen Financiero</h3>
              
              <div className="bg-gray-50 p-4 rounded-xl space-y-3">
                <div className="flex justify-between items-center text-gray-600">
                  <span>Tarifa Base Mensual</span>
                  <span className="font-mono text-lg">${parseFloat(asignacion.tarifa_base_snapshot).toFixed(2)}</span>
                </div>
                
                {beneficios.map((b, i) => (
                  <div key={i} className="flex justify-between items-center text-emerald-600 text-sm">
                    <span>- {b.beneficio_nombre}</span>
                    <span className="font-mono">
                      {b.tipo_calculo_snapshot === 'PORCENTAJE' ? `${parseFloat(b.porcentaje_aplicado)}%` : 
                       b.tipo_calculo_snapshot === 'MONTO_FIJO' ? `$${parseFloat(b.valor_aplicado).toFixed(2)}` : 
                       `Final: $${parseFloat(b.valor_final_especial).toFixed(2)}`}
                    </span>
                  </div>
                ))}
                
                <div className="border-t border-gray-200 my-2 pt-2"></div>
                
                <div className="flex justify-between items-center">
                  <span className="font-bold text-gray-800 text-lg">Pensión Final</span>
                  <span className="font-mono font-bold text-2xl text-[#27A9E1]">${parseFloat(asignacion.valor_mensual_final).toFixed(2)}</span>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Detalle de Beneficios</h3>
              {beneficios.length === 0 ? (
                <p className="text-gray-500 italic text-sm">No aplica beneficios ni descuentos.</p>
              ) : (
                <div className="space-y-3">
                  {beneficios.map((b, i) => (
                    <div key={i} className="border border-gray-100 p-3 rounded-xl shadow-sm">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-gray-800 text-sm">{b.beneficio_nombre}</p>
                          <p className="text-xs text-gray-500">Cat: {b.categoria} • Vig: {b.mes_desde.slice(0,7)} a {b.mes_hasta.slice(0,7)}</p>
                        </div>
                        <span className="bg-gray-100 text-gray-600 text-[10px] px-2 py-0.5 rounded font-bold">{b.tipo_calculo_snapshot}</span>
                      </div>
                      {b.motivo && <p className="text-xs text-gray-600 mt-2 bg-yellow-50 p-2 rounded">{b.motivo}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'historial' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 animate-fade-in">
            <h2 className="text-lg font-bold text-gray-800 mb-6">Historial de Cambios</h2>
            {historial.length === 0 ? (
              <p className="text-gray-500 italic">No hay historial registrado.</p>
            ) : (
              <div className="space-y-6">
                {historial.map((h, i) => (
                  <div key={h.id} className="flex gap-4 relative">
                    {i !== historial.length - 1 && <div className="absolute left-5 top-10 bottom-0 w-px bg-gray-200"></div>}
                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 z-10 shrink-0 border-4 border-white">
                      <FiInfo size={18} />
                    </div>
                    <div className="pt-2 pb-4">
                      <div className="flex items-center gap-3 mb-1">
                       <span className="font-bold text-gray-800">{h.accion}</span>
                       <span className="text-xs text-gray-400">{new Date(h.created_at).toLocaleString('es-EC')}</span>
                     </div>
                     <p className="text-xs text-gray-500 mt-1">Por: {h.usuario_nombre || 'Sistema'}</p>
                     {h.estado_nuevo && <p className="text-xs text-gray-600 mt-1">Estado: <span className="font-bold">{h.estado_anterior} &rarr; {h.estado_nuevo}</span></p>}
                     {h.motivo && <p className="text-xs text-red-600 mt-2 bg-red-50 p-2 rounded">{h.motivo}</p>}
                   </div>
                 </div>
               ))}
             </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        .btn-action { @apply flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm; }
      `}</style>
    </MainLayout>
  );
}
