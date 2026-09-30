import React, { useState, useEffect, useCallback } from 'react';
import {
  FiX, FiCalendar, FiPrinter, FiDownload, FiDollarSign,
  FiCheckCircle, FiAlertTriangle, FiFileText, FiRefreshCw,
  FiCreditCard, FiArrowRight
} from 'react-icons/fi';
import Swal from 'sweetalert2';
import logoEscuela from '../../../assets/logo.png';
import { getCierreFacturacion } from '../../../services/facturacionService';
import { exportarCierreFacturacionExcel } from '../../../utils/exportFacturacionExcel';
import FacturaModal from './FacturaModal';

const fmt$ = (n) => {
  const num = parseFloat(n) || 0;
  return `$ ${num.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const fmtFecha = (d) => {
  if (!d) return '-';
  const dt = new Date(d + 'T12:00:00');
  return dt.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const mesLabel = (mesStr) => {
  if (!mesStr) return '';
  const [y, m] = mesStr.split('-');
  const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  return `${meses[parseInt(m, 10) - 1]} ${y}`;
};

export default function CierreFacturacionModal({
  isOpen,
  onClose,
  fechaInicial = null,
  onFacturarPago = null
}) {
  const [fecha, setFecha] = useState(fechaInicial || new Date().toISOString().split('T')[0]);
  const [cierre, setCierre] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState('facturas'); // 'facturas' | 'pendientes'

  // Para ver una factura en detalle
  const [verFacturaId, setVerFacturaId] = useState(null);

  const cargarCierre = useCallback(async (f) => {
    setLoading(true);
    try {
      const res = await getCierreFacturacion(f);
      if (res.success) {
        setCierre(res);
      }
    } catch {
      Swal.fire('Error', 'No se pudo cargar el reporte de cierre.', 'error');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      cargarCierre(fecha);
    }
  }, [isOpen, fecha, cargarCierre]);

  if (!isOpen) return null;

  const cobrado = cierre?.cobrado || { cantidad: 0, monto: 0 };
  const facturado = cierre?.facturado || { cantidad: 0, monto: 0, por_forma_pago: [] };
  const anuladas = cierre?.anuladas || { cantidad: 0, monto: 0 };
  const diferencia = cierre?.diferencia || { monto: 0, estado: 'CUADRADO' };
  const institucion = cierre?.institucion || {};

  const handleExportExcel = () => {
    if (!cierre) return;
    exportarCierreFacturacionExcel(cierre);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden my-auto max-h-[95vh] flex flex-col border border-gray-100">

        {/* Header Modal */}
        <div className="bg-[#0f172a] px-6 py-4 flex items-center justify-between text-white flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#27A9E1]/20 flex items-center justify-center text-[#27A9E1]">
              <FiFileText size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold">Cierre y Arqueo Diario de Facturación</h2>
              <p className="text-xs text-slate-400">Cuadre entre cobros de caja y facturas emitidas</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition p-1.5 rounded-lg hover:bg-white/10"
          >
            <FiX size={20} />
          </button>
        </div>

        {/* Barra de Filtro de Fecha */}
        <div className="bg-slate-50 border-b border-gray-200 px-6 py-3 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <FiCalendar className="text-gray-500" size={16} />
            <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Fecha de corte:</label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="border border-gray-300 rounded-xl px-3 py-1.5 text-xs font-medium focus:ring-2 focus:ring-[#27A9E1]/30 focus:border-[#27A9E1] bg-white"
            />
            <button
              onClick={() => cargarCierre(fecha)}
              className="p-1.5 text-gray-500 hover:text-[#27A9E1] rounded-lg hover:bg-white border border-transparent hover:border-gray-200 transition"
              title="Actualizar datos"
            >
              <FiRefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
            >
              <FiDownload size={14} />
              <span>Exportar Excel</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold shadow-sm transition"
            >
              <FiPrinter size={14} />
              <span>Imprimir</span>
            </button>
          </div>
        </div>

        {/* Contenido imprimible y navegable */}
        <div id="cierre-print" className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">

          {/* Membrete para impresión */}
          <div className="hidden print:block text-center border-b pb-4 mb-4">
            <h1 className="text-xl font-bold text-gray-900">{institucion.nombre_comercial || 'UNIDAD EDUCATIVA JUAN LEÓN MERA'}</h1>
            <p className="text-xs text-gray-500">RUC: {institucion.ruc || '1790000000001'} &middot; {institucion.direccion_matriz || 'Quito, Ecuador'}</p>
            <h2 className="text-base font-bold text-gray-800 mt-2">REPORTE DE CIERRE Y ARQUEO DIARIO DE FACTURACIÓN</h2>
            <p className="text-xs text-gray-600">Fecha de Corte: <b>{fmtFecha(fecha)}</b> &middot; Generado: {new Date().toLocaleString('es-EC')}</p>
          </div>

          {/* Tarjetas de Resumen KPI */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Total Cobrado */}
            <div className="bg-gradient-to-br from-blue-50 to-sky-100/50 border border-blue-200/80 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between text-blue-800 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider">Total Cobrado</span>
                <FiDollarSign size={18} />
              </div>
              <p className="text-2xl font-black text-blue-950 font-mono">{fmt$(cobrado.monto)}</p>
              <p className="text-xs text-blue-700/80 mt-1 font-medium">{cobrado.cantidad} pago{cobrado.cantidad === 1 ? '' : 's'} registrado{cobrado.cantidad === 1 ? '' : 's'}</p>
            </div>

            {/* Total Facturado */}
            <div className="bg-gradient-to-br from-emerald-50 to-teal-100/50 border border-emerald-200/80 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between text-emerald-800 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider">Total Facturado</span>
                <FiCheckCircle size={18} />
              </div>
              <p className="text-2xl font-black text-emerald-950 font-mono">{fmt$(facturado.monto)}</p>
              <p className="text-xs text-emerald-700/80 mt-1 font-medium">{facturado.cantidad} factura{facturado.cantidad === 1 ? '' : 's'} emitida{facturado.cantidad === 1 ? '' : 's'}</p>
            </div>

            {/* Diferencia / Cuadre */}
            <div className={`rounded-2xl p-4 shadow-sm border ${
              Math.abs(diferencia.monto) < 0.005
                ? 'bg-emerald-500/10 border-emerald-300 text-emerald-900'
                : diferencia.monto > 0
                ? 'bg-amber-500/10 border-amber-300 text-amber-900'
                : 'bg-red-500/10 border-red-300 text-red-900'
            }`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold uppercase tracking-wider">
                  {Math.abs(diferencia.monto) < 0.005 ? 'Cuadre Perfecto' : 'Diferencia / Pendiente'}
                </span>
                <FiAlertTriangle size={18} />
              </div>
              <p className="text-2xl font-black font-mono">{fmt$(diferencia.monto)}</p>
              <p className="text-xs mt-1 font-semibold">
                {Math.abs(diferencia.monto) < 0.005
                  ? '✅ Todo lo cobrado está facturado'
                  : diferencia.monto > 0
                  ? `⚠️ Faltan ${fmt$(diferencia.monto)} por facturar`
                  : '⚠️ Facturación superior al cobro del día'}
              </p>
            </div>

            {/* Facturas Anuladas */}
            <div className="bg-gradient-to-br from-rose-50 to-red-100/40 border border-red-200/80 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between text-rose-800 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider">Facturas Anuladas</span>
                <FiX size={18} />
              </div>
              <p className="text-2xl font-black text-rose-950 font-mono">{fmt$(anuladas.monto)}</p>
              <p className="text-xs text-rose-700/80 mt-1 font-medium">{anuladas.cantidad} anulada{anuladas.cantidad === 1 ? '' : 's'}</p>
            </div>

          </div>

          {/* Desglose por Forma de Pago */}
          {facturado.por_forma_pago?.length > 0 && (
            <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-3 flex items-center gap-2">
                <FiCreditCard size={15} /> Desglose por Forma de Pago Facturada
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {facturado.por_forma_pago.map((fp) => (
                  <div key={fp.forma_pago} className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                    <p className="text-xs text-slate-500 font-medium">{fp.forma_pago}</p>
                    <p className="text-base font-bold text-gray-900 font-mono mt-0.5">{fmt$(fp.total)}</p>
                    <p className="text-[11px] text-gray-400">{fp.cantidad} comprobante{fp.cantidad === 1 ? '' : 's'}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pestañas de detalle para pantalla (se imprimen juntas en print) */}
          <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 flex items-center justify-between print:hidden">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveSubTab('facturas')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    activeSubTab === 'facturas'
                      ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <FiFileText size={13} />
                  <span>Facturas Emitidas ({cierre?.facturas?.length || 0})</span>
                </button>
                <button
                  onClick={() => setActiveSubTab('pendientes')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    activeSubTab === 'pendientes'
                      ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <FiAlertTriangle size={13} className={cierre?.pagos_sin_facturar?.length > 0 ? 'text-amber-500' : ''} />
                  <span>Cobros Pendientes de Facturar ({cierre?.pagos_sin_facturar?.length || 0})</span>
                </button>
              </div>
            </div>

            {/* TAB: Facturas Emitidas */}
            <div className={`${activeSubTab === 'facturas' ? 'block' : 'hidden'} print:block`}>
              <div className="px-4 py-3 bg-slate-100 border-b border-gray-200 print:bg-transparent">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700">Facturas del Día ({fmtFecha(fecha)})</h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 uppercase tracking-wider border-b">
                      {['N° Factura', 'RUC / Cédula', 'Cliente', 'Estudiante', 'Forma Pago', 'Total', 'Estado', 'Acción'].map(h => (
                        <th key={h} className="px-3 py-2 text-left font-semibold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {!cierre?.facturas || cierre.facturas.length === 0 ? (
                      <tr><td colSpan="8" className="py-6 text-center text-gray-400">No se emitieron facturas en esta fecha.</td></tr>
                    ) : cierre.facturas.map(f => (
                      <tr key={f.id} className={`hover:bg-blue-50/30 transition ${f.estado === 'ANULADA' ? 'opacity-50 line-through' : ''}`}>
                        <td className="px-3 py-2.5 font-mono font-bold text-[#27A9E1]">{f.numero}</td>
                        <td className="px-3 py-2.5 font-mono text-gray-600">{f.cliente_identificacion}</td>
                        <td className="px-3 py-2.5 font-medium text-gray-800 whitespace-nowrap">{f.cliente_razon_social}</td>
                        <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">{f.estudiante_nombre || '-'}</td>
                        <td className="px-3 py-2.5 text-gray-600">{f.forma_pago}</td>
                        <td className="px-3 py-2.5 font-mono font-bold text-emerald-700">{fmt$(f.total)}</td>
                        <td className="px-3 py-2.5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            f.estado === 'EMITIDA' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {f.estado}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 print:hidden">
                          <button
                            onClick={() => setVerFacturaId(f.id)}
                            className="p-1 rounded-lg text-gray-400 hover:text-[#27A9E1] hover:bg-blue-50 transition"
                            title="Ver Factura"
                          >
                            <FiFileText size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* TAB: Cobros Pendientes de Facturar */}
            <div className={`${activeSubTab === 'pendientes' ? 'block' : 'hidden'} print:block print:mt-6`}>
              <div className="px-4 py-3 bg-amber-50 border-b border-amber-200 print:bg-transparent">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900">Cobros Pendientes de Facturar ({cierre?.pagos_sin_facturar?.length || 0})</h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 uppercase tracking-wider border-b">
                      {['N° Recibo', 'Estudiante', 'Curso / Paralelo', 'Mes Pensión', 'Monto Cobrado', 'Nota', 'Acción'].map(h => (
                        <th key={h} className="px-3 py-2 text-left font-semibold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {!cierre?.pagos_sin_facturar || cierre.pagos_sin_facturar.length === 0 ? (
                      <tr><td colSpan="7" className="py-6 text-center text-emerald-600 font-medium">✨ Excelente: Todos los cobros de esta fecha ya cuentan con su factura emitida.</td></tr>
                    ) : cierre.pagos_sin_facturar.map(p => (
                      <tr key={p.pago_id} className="hover:bg-amber-50/40 transition">
                        <td className="px-3 py-2.5 font-mono font-bold text-gray-700">#{p.numero_recibo}</td>
                        <td className="px-3 py-2.5 font-medium text-gray-900 whitespace-nowrap">
                          {p.apellidos}, {p.nombres}
                        </td>
                        <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">{p.curso_nombre} "{p.paralelo}"</td>
                        <td className="px-3 py-2.5 text-gray-600">{mesLabel(p.mes)}</td>
                        <td className="px-3 py-2.5 font-mono font-bold text-emerald-700">{fmt$(p.monto)}</td>
                        <td className="px-3 py-2.5 text-gray-500 max-w-[120px] truncate">{p.nota || '-'}</td>
                        <td className="px-3 py-2.5 print:hidden">
                          {onFacturarPago && (
                            <button
                              onClick={() => {
                                onClose();
                                onFacturarPago(p);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-100 text-amber-800 hover:bg-amber-200 transition"
                            >
                              <span>Facturar ahora</span>
                              <FiArrowRight size={11} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          {/* Firmas para impresión de arqueo */}
          <div className="hidden print:grid grid-cols-2 gap-12 mt-12 pt-8 text-center text-xs text-gray-700">
            <div className="border-t border-gray-400 pt-2">
              <p className="font-bold">Responsable de Caja / Cobranzas</p>
              <p className="text-gray-500">Firma y Sello</p>
            </div>
            <div className="border-t border-gray-400 pt-2">
              <p className="font-bold">Contabilidad / Administración</p>
              <p className="text-gray-500">Revisado y Aprobado</p>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center flex-shrink-0">
          <p className="text-xs text-gray-500 italic">
            El arqueo compara pagos registrados contra facturas con estado EMITIDA.
          </p>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold text-xs transition"
          >
            Cerrar
          </button>
        </div>

      </div>

      {/* Modal para ver factura si se presiona el botón */}
      {verFacturaId && (
        <FacturaModal
          facturaId={verFacturaId}
          onClose={() => setVerFacturaId(null)}
        />
      )}

      {/* Reglas de impresión */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          #cierre-print {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            padding: 20px !important;
            background: white !important;
          }
        }
      `}</style>
    </div>
  );
}
