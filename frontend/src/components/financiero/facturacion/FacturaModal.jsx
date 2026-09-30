import React, { useState, useEffect } from 'react';
import {
  FiX, FiPrinter, FiDownload, FiFileText, FiCheckCircle,
  FiAlertTriangle, FiRefreshCw, FiSend, FiCopy, FiCheck
} from 'react-icons/fi';
import Swal from 'sweetalert2';
import logoEscuela from '../../../assets/logo.png';
import { getFacturaById, descargarXmlFactura, procesarSriFactura } from '../../../services/facturacionService';

const fmt$ = (n) => {
  const num = parseFloat(n) || 0;
  return `$ ${num.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const fmtFecha = (d) => {
  if (!d) return '-';
  const dt = new Date(d + 'T12:00:00');
  return dt.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export default function FacturaModal({ factura: facturaProp = null, facturaId = null, onClose }) {
  const [formato, setFormato] = useState('A4'); // 'A4' o 'TICKET'
  const [factura, setFactura] = useState(facturaProp);
  const [loading, setLoading] = useState(!facturaProp && !!facturaId);
  const [sriLoading, setSriLoading] = useState(false);
  const [copiedClave, setCopiedClave] = useState(false);

  useEffect(() => {
    if (facturaProp) {
      setFactura(facturaProp);
    } else if (facturaId) {
      setLoading(true);
      getFacturaById(facturaId)
        .then(res => {
          if (res.success && res.factura) {
            setFactura(res.factura);
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [facturaProp, facturaId]);

  if (!factura && loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl p-8 flex flex-col items-center gap-3">
          <FiRefreshCw className="animate-spin text-[#27A9E1]" size={28} />
          <p className="text-sm font-semibold text-gray-700">Cargando comprobante...</p>
        </div>
      </div>
    );
  }

  if (!factura) return null;

  const inst = factura.institucion || {};
  const detalles = factura.detalles || [];
  const esAnulada = factura.estado === 'ANULADA';

  const handlePrint = () => {
    window.print();
  };

  const handleDescargarXml = async () => {
    try {
      await descargarXmlFactura(factura.id, factura.numero);
    } catch {
      Swal.fire('Error', 'No se pudo generar el archivo XML de la factura.', 'error');
    }
  };

  const handleProcesarSri = async () => {
    const confirm = await Swal.fire({
      title: '¿Transmitir Factura al SRI?',
      html: `
        <div style="text-align:left;font-size:0.9rem" class="space-y-1">
          <p><b>Comprobante:</b> ${factura.numero}</p>
          <p><b>Ambiente:</b> ${inst.ambiente === '2' ? 'PRODUCCIÓN' : 'PRUEBAS'}</p>
          <p class="text-xs text-gray-500 mt-2">
            Se generará la <b>Clave de Acceso de 49 dígitos</b> y se validará la estructura XML contra los Web Services oficiales del SRI.
          </p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#27A9E1',
      confirmButtonText: 'Sí, transmitir al SRI',
      cancelButtonText: 'Cancelar'
    });
    if (!confirm.isConfirmed) return;

    setSriLoading(true);
    try {
      const res = await procesarSriFactura(factura.id);
      if (res.success) {
        Swal.fire({
          title: '¡Comprobante Autorizado!',
          html: `
            <div style="text-align:left;font-size:0.88rem" class="space-y-2">
              <p><b>Estado:</b> <span class="text-emerald-600 font-bold">${res.estado_sri}</span></p>
              <p><b>Ambiente:</b> ${res.ambiente}</p>
              <p><b>N° Autorización / Clave:</b></p>
              <p class="font-mono text-xs bg-gray-100 p-2 rounded-lg break-all border text-gray-700">${res.clave_acceso}</p>
              <p class="text-xs text-gray-500">Fecha de autorización: ${res.fecha_autorizacion}</p>
            </div>
          `,
          icon: 'success'
        });
        setFactura(prev => ({
          ...prev,
          clave_acceso: res.clave_acceso,
          estado_sri: res.estado_sri,
          numero_autorizacion: res.numero_autorizacion,
          fecha_autorizacion: res.fecha_autorizacion
        }));
      }
    } catch (e) {
      Swal.fire('Error SRI', e.response?.data?.message || 'Error al comunicarse con el SRI.', 'error');
    }
    setSriLoading(false);
  };

  const handleCopyClave = () => {
    if (!factura.clave_acceso) return;
    navigator.clipboard.writeText(factura.clave_acceso);
    setCopiedClave(true);
    setTimeout(() => setCopiedClave(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      {/* Contenedor Modal */}
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden my-auto print:m-0 print:p-0 print:shadow-none print:max-w-none print:w-full">
        
        {/* Barra de Controles Superior (se oculta al imprimir) */}
        <div className="px-6 py-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 flex-shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <FiFileText className="text-[#27A9E1]" size={22} />
            <div>
              <h3 className="font-bold text-base leading-tight">Comprobante de Factura</h3>
              <p className="text-xs text-slate-400 font-mono">{factura.numero}</p>
            </div>
            {esAnulada ? (
              <span className="ml-2 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-500/20 text-red-300 border border-red-500/30">
                ANULADA
              </span>
            ) : (
              <span className={`ml-2 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                factura.estado_sri === 'AUTORIZADO'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
              }`}>
                {factura.estado_sri || 'NO ENVIADA'}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Selector de formato */}
            <div className="flex bg-slate-800 p-1 rounded-xl text-xs font-semibold">
              <button
                onClick={() => setFormato('A4')}
                className={`px-3 py-1.5 rounded-lg transition ${formato === 'A4' ? 'bg-[#27A9E1] text-white shadow' : 'text-slate-400 hover:text-white'}`}
              >
                A4
              </button>
              <button
                onClick={() => setFormato('TICKET')}
                className={`px-3 py-1.5 rounded-lg transition ${formato === 'TICKET' ? 'bg-[#27A9E1] text-white shadow' : 'text-slate-400 hover:text-white'}`}
              >
                Ticket 80mm
              </button>
            </div>

            {/* Descargar XML */}
            <button
              onClick={handleDescargarXml}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition"
              title="Descargar XML oficial SRI v1.1.0"
            >
              <FiDownload size={13} /> XML SRI
            </button>

            {/* Transmitir al SRI */}
            {!esAnulada && (
              <button
                onClick={handleProcesarSri}
                disabled={sriLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md transition"
                title="Transmitir comprobante al Servicio de Rentas Internas"
              >
                <FiSend size={13} className={sriLoading ? 'animate-spin' : ''} />
                <span>{sriLoading ? 'Enviando...' : factura.estado_sri === 'AUTORIZADO' ? 'Re-validar SRI' : 'Enviar SRI'}</span>
              </button>
            )}

            {/* Botón Imprimir */}
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-[#27A9E1] hover:bg-[#1f93c6] text-white text-xs font-bold rounded-xl shadow-md transition"
            >
              <FiPrinter size={14} /> Imprimir
            </button>

            {/* Cerrar */}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              title="Cerrar"
            >
              <FiX size={18} />
            </button>
          </div>
        </div>

        {/* Área del Documento Imprimible */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-gray-50 flex justify-center print:bg-white print:p-0">
          
          {/* FORMATO A4 */}
          {formato === 'A4' && (
            <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-8 max-w-3xl w-full text-gray-800 print:border-0 print:shadow-none print:p-4 text-xs font-sans relative">
              
              {/* Marca de agua si es anulada */}
              {esAnulada && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-15 rotate-[-30deg]">
                  <span className="text-8xl font-black text-red-600 border-8 border-red-600 px-8 py-2 rounded-2xl">
                    ANULADA
                  </span>
                </div>
              )}

              {/* Encabezado */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-gray-200">
                {/* Logo y datos institucionales */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-3 mb-2">
                    <img src={logoEscuela} alt="Logo" className="w-14 h-14 object-contain" />
                    <div>
                      <h2 className="text-base font-extrabold text-[#0f172a] uppercase tracking-tight">
                        {inst.razon_social || 'UNIDAD EDUCATIVA JUAN LEÓN MERA'}
                      </h2>
                      <p className="text-[11px] font-semibold text-[#27A9E1]">
                        {inst.nombre_comercial || 'UE JUAN LEÓN MERA'}
                      </p>
                    </div>
                  </div>
                  <p><span className="font-semibold text-gray-700">R.U.C.:</span> {inst.ruc || '1391700000001'}</p>
                  <p><span className="font-semibold text-gray-700">Matriz:</span> {inst.direccion_matriz || 'Jaramijó, Manabí'}</p>
                  <p><span className="font-semibold text-gray-700">Establecimiento:</span> {inst.direccion_establecimiento || 'Jaramijó, Manabí'}</p>
                  <p><span className="font-semibold text-gray-700">Teléfono:</span> {inst.telefono || '052600000'}</p>
                  <p><span className="font-semibold text-gray-700">Correo:</span> {inst.email || 'colecturia@juanleonmera.edu.ec'}</p>
                  <div className="pt-1 flex flex-wrap gap-2 text-[10px]">
                    <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-medium">
                      Obligado a contabilidad: {inst.obligado_contabilidad || 'NO'}
                    </span>
                    <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-medium">
                      Régimen: {inst.regimen || 'RIMPE_EMPRENDEDOR'}
                    </span>
                  </div>
                </div>

                {/* Cuadro Oficial de Factura */}
                <div className="border border-gray-300 rounded-xl p-4 bg-gray-50 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between border-b pb-2 mb-2">
                      <span className="text-xs font-bold tracking-widest uppercase text-gray-600">FACTURA</span>
                      <span className="text-[10px] text-gray-500 uppercase">Ambiente: {inst.ambiente === 2 ? 'Producción' : 'Pruebas'}</span>
                    </div>
                    <p className="text-lg font-mono font-extrabold text-[#0f172a] text-center my-1 tracking-wider">
                      N° {factura.numero}
                    </p>
                    <div className="mt-3 space-y-1 text-[11px]">
                      <p><span className="font-semibold text-gray-600">Fecha de Emisión:</span> {fmtFecha(factura.fecha_emision)}</p>
                      <p><span className="font-semibold text-gray-600">Año Lectivo:</span> {factura.anio_lectivo || '2026-2027'}</p>
                      <p><span className="font-semibold text-gray-600">Forma de Pago:</span> {factura.forma_pago}</p>
                    </div>
                  </div>

                  {factura.clave_acceso && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <div className="flex items-center justify-between text-[9px] text-gray-500 font-mono mb-0.5">
                        <span className="font-bold">CLAVE DE ACCESO SRI (49 DÍGITOS):</span>
                        <button
                          onClick={handleCopyClave}
                          className="print:hidden text-[#27A9E1] hover:underline flex items-center gap-1 font-sans font-bold"
                          title="Copiar Clave de Acceso"
                        >
                          {copiedClave ? <FiCheck className="text-emerald-600" /> : <FiCopy />}
                          <span>{copiedClave ? 'Copiado' : 'Copiar'}</span>
                        </button>
                      </div>
                      <p className="text-[9px] font-mono break-all text-gray-800 tracking-tighter leading-tight bg-white p-1.5 rounded-lg border border-gray-200">
                        {factura.clave_acceso}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Datos del Cliente y Estudiante */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4 p-3 bg-gray-50 rounded-xl border border-gray-200">
                <div>
                  <p className="text-[10px] font-bold text-[#27A9E1] uppercase tracking-wider mb-1">Datos del Cliente / Facturado a:</p>
                  <p><span className="font-semibold">Razón Social:</span> {factura.cliente_nombre || 'CONSUMIDOR FINAL'}</p>
                  <p><span className="font-semibold">{factura.cliente_tipo_identificacion || 'Cédula/RUC'}:</span> {factura.cliente_identificacion || '9999999999999'}</p>
                  <p><span className="font-semibold">Dirección:</span> {factura.cliente_direccion || 'CIUDAD'}</p>
                  <p><span className="font-semibold">Teléfono:</span> {factura.cliente_telefono || '-'}</p>
                  <p><span className="font-semibold">Email:</span> {factura.cliente_email || '-'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-[#27A9E1] uppercase tracking-wider mb-1">Datos del Estudiante:</p>
                  <p><span className="font-semibold">Estudiante:</span> {factura.estudiante_nombre}</p>
                  <p><span className="font-semibold">Código:</span> {factura.estudiante_codigo}</p>
                  {factura.observaciones && (
                    <p className="mt-1 text-gray-600 italic"><span className="font-semibold not-italic">Obs:</span> {factura.observaciones}</p>
                  )}
                </div>
              </div>

              {/* Tabla de Detalles */}
              <div className="my-4 overflow-hidden border border-gray-200 rounded-xl">
                <table className="w-full text-left">
                  <thead className="bg-[#0f172a] text-white text-[11px] uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Código</th>
                      <th className="py-2.5 px-3">Descripción</th>
                      <th className="py-2.5 px-3 text-center">Cant.</th>
                      <th className="py-2.5 px-3 text-right">Precio Unit.</th>
                      <th className="py-2.5 px-3 text-right">Desc.</th>
                      <th className="py-2.5 px-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-[11px]">
                    {detalles.map((d, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/50">
                        <td className="py-2 px-3 font-mono text-gray-500">{d.codigo || 'PEN'}</td>
                        <td className="py-2 px-3 font-medium text-gray-800">{d.descripcion}</td>
                        <td className="py-2 px-3 text-center font-mono">{d.cantidad}</td>
                        <td className="py-2 px-3 text-right font-mono">{fmt$(d.precio_unitario)}</td>
                        <td className="py-2 px-3 text-right font-mono text-gray-500">{fmt$(d.descuento)}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-gray-900">{fmt$(d.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totales y Firma */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4 pt-2">
                <div className="text-[11px] text-gray-500 space-y-2 flex flex-col justify-end">
                  <p className="border-t border-gray-300 pt-3 w-48 text-center text-gray-600">
                    Firma Autorizada / Caja
                  </p>
                  <p className="text-[10px] text-gray-400">
                    Generado por SIGCOP-KPI el {new Date().toLocaleString('es-EC')}
                  </p>
                </div>

                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-1.5 text-[11px]">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal 0% (Servicios Educativos):</span>
                    <span className="font-mono font-semibold">{fmt$(factura.subtotal_0)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal Gravado IVA:</span>
                    <span className="font-mono font-semibold">{fmt$(factura.subtotal_iva)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Descuento:</span>
                    <span className="font-mono font-semibold text-emerald-600">-{fmt$(factura.descuento)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>IVA ({factura.tarifa_iva || 0}%):</span>
                    <span className="font-mono font-semibold">{fmt$(factura.iva)}</span>
                  </div>
                  <div className="border-t border-gray-300 pt-2 flex justify-between text-sm font-bold text-[#0f172a]">
                    <span>VALOR TOTAL:</span>
                    <span className="font-mono text-base text-[#27A9E1]">{fmt$(factura.total)}</span>
                  </div>
                </div>
              </div>

              {esAnulada && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs">
                  <span className="font-bold">Motivo de Anulación:</span> {factura.motivo_anulacion}
                  <span className="block text-[10px] text-red-500 mt-0.5">Anulado el: {factura.anulado_at || '-'}</span>
                </div>
              )}
            </div>
          )}

          {/* FORMATO TICKET (80mm) */}
          {formato === 'TICKET' && (
            <div className="bg-white border border-gray-300 shadow-sm rounded-lg p-5 max-w-[340px] w-full text-black font-mono text-[11px] print:border-0 print:shadow-none print:p-0">
              
              <div className="text-center pb-3 border-b border-dashed border-gray-400">
                <img src={logoEscuela} alt="Logo" className="w-10 h-10 mx-auto object-contain mb-1" />
                <h3 className="font-bold text-xs uppercase">{inst.razon_social || 'UE JUAN LEÓN MERA'}</h3>
                <p className="text-[10px]">RUC: {inst.ruc || '1391700000001'}</p>
                <p className="text-[9px]">{inst.direccion_matriz || 'Jaramijó, Manabí'}</p>
                <p className="text-[9px]">Telf: {inst.telefono || '052600000'}</p>
                <p className="text-[9px] mt-1 font-bold">FACTURA N° {factura.numero}</p>
                {esAnulada && <p className="text-red-600 font-bold mt-1 text-sm">*** ANULADA ***</p>}
              </div>

              <div className="py-2 border-b border-dashed border-gray-400 space-y-0.5 text-[10px]">
                <p><b>Fecha:</b> {fmtFecha(factura.fecha_emision)}</p>
                <p><b>Cliente:</b> {factura.cliente_nombre}</p>
                <p><b>RUC/CI:</b> {factura.cliente_identificacion}</p>
                <p><b>Dir:</b> {factura.cliente_direccion || 'CIUDAD'}</p>
                <p><b>Estudiante:</b> {factura.estudiante_nombre}</p>
              </div>

              <div className="py-2 border-b border-dashed border-gray-400">
                <div className="grid grid-cols-12 font-bold pb-1 text-[9px] uppercase border-b">
                  <span className="col-span-8">Descrip.</span>
                  <span className="col-span-4 text-right">Total</span>
                </div>
                {detalles.map((d, idx) => (
                  <div key={idx} className="grid grid-cols-12 py-1 text-[10px]">
                    <div className="col-span-8 pr-1">
                      <p className="font-semibold leading-tight">{d.descripcion}</p>
                      <p className="text-[9px] text-gray-500">{d.cantidad} x {fmt$(d.precio_unitario)}</p>
                    </div>
                    <div className="col-span-4 text-right font-bold">
                      {fmt$(d.total)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="py-2 space-y-1 text-[10px]">
                <div className="flex justify-between">
                  <span>Subtotal 0%:</span>
                  <span>{fmt$(factura.subtotal_0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>IVA 0%:</span>
                  <span>$ 0.00</span>
                </div>
                <div className="flex justify-between font-bold text-xs pt-1 border-t border-dashed">
                  <span>TOTAL:</span>
                  <span>{fmt$(factura.total)}</span>
                </div>
                <div className="flex justify-between text-[9px] text-gray-600 pt-1">
                  <span>Forma Pago:</span>
                  <span>{factura.forma_pago}</span>
                </div>
              </div>

              {factura.clave_acceso && (
                <div className="pt-2 border-t border-dashed border-gray-400 text-[8px] break-all leading-tight text-center font-mono">
                  <p className="font-bold">CLAVE DE ACCESO SRI:</p>
                  <p>{factura.clave_acceso}</p>
                </div>
              )}

              <div className="text-center pt-3 border-t border-dashed border-gray-400 text-[9px] text-gray-600">
                <p>¡Gracias por su puntualidad!</p>
                <p className="text-[8px] mt-1">UE Juan León Mera &middot; SIGCOP</p>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-white border-t border-gray-200 flex justify-end gap-3 print:hidden">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl transition"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
}
