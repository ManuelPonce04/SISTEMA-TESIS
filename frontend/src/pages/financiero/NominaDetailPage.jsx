import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import nominaService from '../../services/nominaService';
import { FiArrowLeft, FiCheckCircle, FiXCircle, FiPrinter, FiDollarSign, FiRefreshCw, FiLock, FiUnlock, FiFileText } from 'react-icons/fi';
import Badge from '../../components/ui/Badge';
import { useAuth } from '../../context/AuthContext';
import PagoNominaModal from '../../components/financiero/rol/PagoNominaModal';
import MainLayout from '../../components/layout/MainLayout';
// Exports use native browser APIs (no external dependencies required)

const NominaDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [nomina, setNomina] = useState(null);
  const [detalles, setDetalles] = useState([]);
  const [loading, setLoading] = useState(true);

  // Pago Modal
  const [showPagoModal, setShowPagoModal] = useState(false);
  const [selectedDetalle, setSelectedDetalle] = useState(null);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await nominaService.getNominaDetalle(id);
      if (res.success) {
        setNomina(res.data.nomina);
        setDetalles(res.data.detalles);
      }
    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'No se pudo cargar la nómina.', 'error');
      navigate('/financiero/rol-pagos');
    } finally {
      setLoading(false);
    }
  };

  const handleRecalcular = async () => {
    if (nomina.estado !== 'BORRADOR') return;
    const result = await Swal.fire({
      title: '¿Recalcular Nómina?',
      text: "Esto volverá a consultar los sueldos y horas extras actuales y sobreescribirá este borrador.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, recalcular',
      cancelButtonText: 'Cancelar'
    });
    if (result.isConfirmed) {
      try {
        await nominaService.recalcularNomina(id);
        Swal.fire('Listo', 'Nómina recalculada.', 'success');
        fetchData();
      } catch (error) {
        Swal.fire('Error', error.response?.data?.message || 'Error al recalcular.', 'error');
      }
    }
  };

  const handleCambiarEstado = async (nuevoEstado) => {
    const mensajes = {
      'REVISADA': '¿Marcar como revisada? (Aún se podrán hacer correcciones volviendo a borrador)',
      'CERRADA': '¿Cerrar Nómina? (Los valores quedarán congelados permanentemente y habilitará los pagos)',
      'BORRADOR': '¿Devolver a Borrador? (Permitirá recalcular los valores)'
    };

    const result = await Swal.fire({
      title: 'Cambio de Estado',
      text: mensajes[nuevoEstado],
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Confirmar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      try {
        await nominaService.cambiarEstado(id, nuevoEstado);
        Swal.fire('Listo', `Estado cambiado a ${nuevoEstado}.`, 'success');
        fetchData();
      } catch (error) {
        Swal.fire('Error', error.response?.data?.message || 'Error al cambiar estado.', 'error');
      }
    }
  };

  const openPagoModal = (detalle) => {
    if (nomina.estado !== 'CERRADA') {
      Swal.fire('Aviso', 'La nómina debe estar CERRADA para procesar pagos individuales.', 'info');
      return;
    }
    setSelectedDetalle(detalle);
    setShowPagoModal(true);
  };

  const exportPDF = () => {
    // Use native browser print dialog — works in all browsers without external libraries
    window.print();
  };

  const exportExcel = () => {
    if (!nomina) return;
    const bom = '\uFEFF';
    const header = 'Cédula;Nombre;Cargo;Contrato;Sueldo;H.Extras;Otros Ing;T.Ingresos;IESS;Anticipos;Otras Ded;T.Egresos;Neto a Pagar;Estado';
    const rows = detalles.map(d => [
      d.cedula_snapshot, d.nombre_snapshot, d.cargo_snapshot, d.contrato_snapshot,
      parseFloat(d.sueldo).toFixed(2),
      parseFloat(d.horas_extras).toFixed(2),
      parseFloat(d.otros_ingresos).toFixed(2),
      parseFloat(d.subtotal_ingresos).toFixed(2),
      parseFloat(d.aporte_personal_iess).toFixed(2),
      parseFloat(d.anticipos).toFixed(2),
      parseFloat(d.otras_deducciones).toFixed(2),
      parseFloat(d.subtotal_egresos).toFixed(2),
      parseFloat(d.neto_recibir).toFixed(2),
      d.estado_pago
    ].join(';'));
    const csv = bom + [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Rol_Pagos_${nomina.mes}_${nomina.id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading || !nomina) return (
    <MainLayout title="Detalle de Nómina" subtitle="Cargando...">
      <div className="p-8 text-center text-gray-500">Cargando nómina...</div>
    </MainLayout>
  );

  return (
    <MainLayout title={`Detalle Nómina #${nomina.id}`} subtitle="Inicio / Control Financiero / Rol de pagos / Detalle">
    <div className="p-6 max-w-[1400px] mx-auto animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/financiero/rol-pagos')} className="p-2 bg-white border rounded-xl hover:bg-gray-50 shadow-sm transition-colors text-gray-500">
            <FiArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
              Detalle Nómina #{nomina.id}
              {nomina.estado === 'BORRADOR' && <Badge variant="blue">BORRADOR</Badge>}
              {nomina.estado === 'REVISADA' && <Badge variant="warning">REVISADA</Badge>}
              {nomina.estado === 'CERRADA' && <Badge variant="gray">CERRADA <FiLock className="inline ml-1"/></Badge>}
              {nomina.estado === 'PAGADA' && <Badge variant="success">PAGADA</Badge>}
            </h1>
            <p className="text-sm text-gray-500">{new Date(nomina.mes).toLocaleDateString('es-EC', {month:'long', year:'numeric'}).toUpperCase()} - {nomina.descripcion_grupo}</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button onClick={exportPDF} className="px-4 py-2 bg-white border shadow-sm rounded-xl text-gray-700 hover:bg-gray-50 text-sm font-medium flex items-center gap-2">
            <FiFileText /> PDF
          </button>
          <button onClick={exportExcel} className="px-4 py-2 bg-green-50 text-green-700 border border-green-200 shadow-sm rounded-xl hover:bg-green-100 text-sm font-medium flex items-center gap-2">
            <FiCheckCircle /> Excel
          </button>
        </div>
      </div>

      {/* Toolbar / Actions */}
      {user?.es_admin && (
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6 flex flex-wrap gap-3 items-center">
          <span className="text-sm font-bold text-gray-400 uppercase tracking-wider mr-2">Acciones Admin:</span>
          
          {nomina.estado === 'BORRADOR' && (
            <>
              <button onClick={handleRecalcular} className="px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-sm font-medium hover:bg-blue-100 flex items-center gap-2"><FiRefreshCw /> Recalcular</button>
              <button onClick={() => handleCambiarEstado('REVISADA')} className="px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-sm font-medium hover:bg-amber-100 flex items-center gap-2"><FiCheckCircle /> Marcar Revisada</button>
            </>
          )}

          {nomina.estado === 'REVISADA' && (
            <>
              <button onClick={() => handleCambiarEstado('BORRADOR')} className="px-3 py-1.5 bg-gray-100 text-gray-700 border rounded-lg text-sm font-medium hover:bg-gray-200 flex items-center gap-2"><FiArrowLeft /> Volver a Borrador</button>
              <button onClick={() => handleCambiarEstado('CERRADA')} className="px-3 py-1.5 bg-gray-800 text-white rounded-lg text-sm font-medium hover:bg-gray-900 flex items-center gap-2"><FiLock /> Cerrar Nómina</button>
            </>
          )}

          {nomina.estado === 'CERRADA' && (
            <>
              <button onClick={() => handleCambiarEstado('BORRADOR')} className="px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm font-medium hover:bg-red-100 flex items-center gap-2"><FiUnlock /> Reabrir (Borrador)</button>
              {/* Massive payment button could go here */}
            </>
          )}
        </div>
      )}

      {/* Totals Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-xs uppercase font-bold text-gray-400">Personal</p>
          <p className="text-2xl font-bold text-gray-800">{nomina.cantidad_personal}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-xs uppercase font-bold text-gray-400">T. Ingresos</p>
          <p className="text-2xl font-bold font-mono text-gray-800">${parseFloat(nomina.total_ingresos).toFixed(2)}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-xs uppercase font-bold text-gray-400">T. Egresos (Incl. Anticipos)</p>
          <p className="text-2xl font-bold font-mono text-red-500">${parseFloat(nomina.total_egresos).toFixed(2)}</p>
        </div>
        <div className="bg-[#27A9E1]/10 p-4 rounded-2xl shadow-sm border border-[#27A9E1]/30">
          <p className="text-xs uppercase font-bold text-[#27A9E1]">Total Neto a Pagar</p>
          <p className="text-2xl font-bold font-mono text-blue-900">${parseFloat(nomina.total_neto).toFixed(2)}</p>
        </div>
      </div>

      {/* Table details */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[1200px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-[11px] uppercase tracking-wider text-gray-500 font-bold">
                <th className="px-4 py-3 border-r border-gray-100">Trabajador</th>
                <th className="px-3 py-3 text-right">Sueldo Base</th>
                <th className="px-3 py-3 text-right">H. Extras</th>
                <th className="px-3 py-3 text-right border-r border-gray-100 bg-blue-50/30">T. Ingresos</th>
                <th className="px-3 py-3 text-right text-orange-600">Aporte IESS</th>
                <th className="px-3 py-3 text-right text-red-500">Anticipos</th>
                <th className="px-3 py-3 text-right text-red-500">Otras Ded.</th>
                <th className="px-3 py-3 text-right border-r border-gray-100 bg-red-50/30">T. Egresos</th>
                <th className="px-4 py-3 text-right text-blue-700 bg-blue-50">Neto a Pagar</th>
                <th className="px-4 py-3 text-center">Estado Pago</th>
                <th className="px-4 py-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-[13px]">
              {detalles.map(d => (
                <tr key={d.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-2 border-r border-gray-100">
                    <div className="font-bold text-gray-800">{d.nombre_snapshot}</div>
                    <div className="text-[10px] text-gray-400 font-mono mt-0.5">{d.cedula_snapshot} • {d.cargo_snapshot}</div>
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-gray-600">${parseFloat(d.sueldo).toFixed(2)}</td>
                  <td className="px-3 py-2 text-right font-mono text-green-600">${parseFloat(d.horas_extras).toFixed(2)}</td>
                  <td className="px-3 py-2 text-right font-mono font-bold text-gray-800 border-r border-gray-100 bg-blue-50/30">${parseFloat(d.subtotal_ingresos).toFixed(2)}</td>
                  
                  <td className="px-3 py-2 text-right font-mono text-orange-600">${parseFloat(d.aporte_personal_iess).toFixed(2)}</td>
                  <td className="px-3 py-2 text-right font-mono text-red-500">${parseFloat(d.anticipos).toFixed(2)}</td>
                  <td className="px-3 py-2 text-right font-mono text-red-500">${parseFloat(d.otras_deducciones).toFixed(2)}</td>
                  <td className="px-3 py-2 text-right font-mono font-bold text-red-600 border-r border-gray-100 bg-red-50/30">${parseFloat(d.subtotal_egresos).toFixed(2)}</td>
                  
                  <td className="px-4 py-2 text-right font-mono font-bold text-xl text-blue-700 bg-blue-50">${parseFloat(d.neto_recibir).toFixed(2)}</td>
                  
                  <td className="px-4 py-2 text-center">
                    {d.estado_pago === 'PAGADO' ? <Badge variant="success">PAGADO</Badge> : <Badge variant="gray">PENDIENTE</Badge>}
                  </td>
                  <td className="px-4 py-2 text-center">
                    <div className="flex items-center justify-center gap-2">
                      {nomina.estado === 'CERRADA' && d.estado_pago === 'PENDIENTE' && d.neto_recibir > 0 && (
                        <button onClick={() => openPagoModal(d)} title="Pagar" className="p-1.5 bg-green-100 text-green-700 hover:bg-green-200 rounded-lg transition-colors">
                          <FiDollarSign size={16} />
                        </button>
                      )}
                      {nomina.estado === 'BORRADOR' && (
                        <button 
                          onClick={() => navigate(`/financiero/sueldos-anticipos?personal_id=${d.personal_id}&periodo_id=${nomina.periodo_lectivo_id}&mes=${nomina.mes}`)}
                          title="Ir a Sueldos y Anticipos" 
                          className="p-1.5 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg transition-colors"
                        >
                          <FiDollarSign size={16} />
                        </button>
                      )}
                      {d.estado_pago === 'PAGADO' && (
                        <span className="text-[10px] text-green-600 font-bold block mt-1"><FiCheckCircle className="inline mr-1"/> Pagado</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <PagoNominaModal 
        isOpen={showPagoModal}
        onClose={() => setShowPagoModal(false)}
        onSuccess={fetchData}
        nominaId={id}
        detalle={selectedDetalle}
        mesNomina={nomina.mes}
      />

    </div>
    </MainLayout>
  );
};

export default NominaDetailPage;
