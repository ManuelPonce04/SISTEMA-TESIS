import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  FiFileText, FiUser, FiSearch, FiPlus, FiCheck, FiPrinter,
  FiDollarSign, FiCalendar, FiCheckSquare, FiSquare, FiAlertCircle,
  FiSettings, FiRefreshCw, FiCreditCard, FiX
} from 'react-icons/fi';
import Swal from 'sweetalert2';
import logoEscuela from '../../../assets/logo.png';
import {
  getInstitucionConfig,
  buscarClientesFacturacion,
  getClienteByEstudiante,
  createClienteFacturacion,
  getPagosPendientesEstudiante,
  emitirFactura
} from '../../../services/facturacionService';
import { buscarEstudiantesParaPension } from '../../../services/cobrarPensionesService';
import { validarIdentificacion } from '../../../utils/sriValidation';
import FacturaModal from './FacturaModal';
import ConfiguracionFacturacionModal from './ConfiguracionFacturacionModal';

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

export default function FacturacionPanel({
  estudianteInicial = null,
  pagoIdInicial = null,
  onFacturaEmitida
}) {
  // Configuración institucional
  const [config, setConfig] = useState(null);
  const [modalConfigOpen, setModalConfigOpen] = useState(false);

  // Estudiante
  const [estudiante, setEstudiante] = useState(estudianteInicial);
  const [searchEstTerm, setSearchEstTerm] = useState('');
  const [searchEstResults, setSearchEstResults] = useState([]);
  const [isSearchingEst, setIsSearchingEst] = useState(false);

  // Cliente
  const [cliente, setCliente] = useState(null);
  const [searchCliTerm, setSearchCliTerm] = useState('');
  const [searchCliResults, setSearchCliResults] = useState([]);
  const [isSearchingCli, setIsSearchingCli] = useState(false);
  const [showNuevoCliente, setShowNuevoCliente] = useState(false);
  const [nuevoClienteForm, setNuevoClienteForm] = useState({
    tipo_identificacion: 'CEDULA',
    identificacion: '',
    razon_social: '',
    direccion: '',
    telefono: '',
    email: ''
  });
  const [errorIdentificacion, setErrorIdentificacion] = useState('');

  // Pagos pendientes
  const [pagosPendientes, setPagosPendientes] = useState([]);
  const [pagosSeleccionados, setPagosSeleccionados] = useState([]);
  const [loadingPagos, setLoadingPagos] = useState(false);

  // Datos factura
  const [formaPago, setFormaPago] = useState('EFECTIVO');
  const [observaciones, setObservaciones] = useState('');
  const [emitirLoading, setEmitirLoading] = useState(false);

  // Modal Factura Emitida / Vista Previa
  const [facturaModalData, setFacturaModalData] = useState(null);

  // Cargar configuración de la institución al montar
  useEffect(() => {
    cargarConfig();
  }, []);

  const cargarConfig = async () => {
    try {
      const res = await getInstitucionConfig();
      if (res.success) setConfig(res.config);
    } catch { /* silencioso */ }
  };

  // Si cambia el estudiante prop
  useEffect(() => {
    if (estudianteInicial) {
      setEstudiante(estudianteInicial);
    }
  }, [estudianteInicial]);

  // Buscar cliente predeterminado cuando cambia el estudiante
  const cargarClienteYPagos = useCallback(async (est) => {
    if (!est) {
      setPagosPendientes([]);
      setPagosSeleccionados([]);
      return;
    }

    // 1. Cargar cliente de facturación del estudiante
    try {
      const resCli = await getClienteByEstudiante(est.id_estudiante);
      if (resCli.success && resCli.cliente) {
        setCliente(resCli.cliente);
      }
    } catch { /* silencioso */ }

    // 2. Cargar pagos de pensión pendientes
    setLoadingPagos(true);
    try {
      const resPagos = await getPagosPendientesEstudiante(est.id_estudiante);
      if (resPagos.success) {
        setPagosPendientes(resPagos.pagos || []);
        // Si venía un pagoIdInicial específico, pre-seleccionarlo
        if (pagoIdInicial) {
          const match = resPagos.pagos.find(p => p.pago_id === parseInt(pagoIdInicial));
          if (match) {
            setPagosSeleccionados([match.pago_id]);
          } else {
            setPagosSeleccionados(resPagos.pagos.map(p => p.pago_id));
          }
        } else {
          // Pre-seleccionar todos los no facturados
          setPagosSeleccionados(resPagos.pagos.map(p => p.pago_id));
        }
      }
    } catch { /* silencioso */ }
    setLoadingPagos(false);
  }, [pagoIdInicial]);

  useEffect(() => {
    cargarClienteYPagos(estudiante);
  }, [estudiante, cargarClienteYPagos]);

  // Búsqueda de Estudiante con debounce
  useEffect(() => {
    if (searchEstTerm.length < 2) {
      setSearchEstResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setIsSearchingEst(true);
      try {
        const res = await buscarEstudiantesParaPension(searchEstTerm);
        if (Array.isArray(res?.estudiantes)) {
          setSearchEstResults(res.estudiantes);
        } else if (res?.success && Array.isArray(res?.data)) {
          setSearchEstResults(res.data);
        } else {
          setSearchEstResults([]);
        }
      } catch (err) {
        console.error('[FacturacionPanel] Error buscando estudiante:', err);
        setSearchEstResults([]);
      }
      setIsSearchingEst(false);
    }, 350);
    return () => clearTimeout(t);
  }, [searchEstTerm]);

  // Búsqueda de Cliente con debounce
  useEffect(() => {
    if (searchCliTerm.length < 2) {
      setSearchCliResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setIsSearchingCli(true);
      try {
        const res = await buscarClientesFacturacion(searchCliTerm);
        if (res.success) setSearchCliResults(res.clientes || []);
      } catch { /* silencioso */ }
      setIsSearchingCli(false);
    }, 350);
    return () => clearTimeout(t);
  }, [searchCliTerm]);

  // Seleccionar Consumidor Final
  const handleSeleccionarConsumidorFinal = async () => {
    try {
      const res = await buscarClientesFacturacion('9999999999999');
      if (res.success && res.clientes.length > 0) {
        setCliente(res.clientes[0]);
      } else {
        setCliente({
          id: null,
          tipo_identificacion: 'CONSUMIDOR_FINAL',
          identificacion: '9999999999999',
          razon_social: 'CONSUMIDOR FINAL',
          direccion: 'CIUDAD',
          telefono: '9999999999',
          email: 'consumidorfinal@juanleonmera.edu.ec'
        });
      }
    } catch { /* silencioso */ }
  };

  // Validar identificación en vivo para nuevo cliente
  const handleIdentificacionChange = (val, tipo) => {
    const t = tipo || nuevoClienteForm.tipo_identificacion;
    setNuevoClienteForm(prev => ({ ...prev, identificacion: val }));
    if (val.trim()) {
      const check = validarIdentificacion(t, val);
      setErrorIdentificacion(check.valido ? '' : check.mensaje);
    } else {
      setErrorIdentificacion('');
    }
  };

  // Guardar nuevo cliente
  const handleGuardarNuevoCliente = async (e) => {
    e.preventDefault();
    const check = validarIdentificacion(nuevoClienteForm.tipo_identificacion, nuevoClienteForm.identificacion);
    if (!check.valido) {
      return Swal.fire('Documento Inválido', check.mensaje, 'warning');
    }
    if (!nuevoClienteForm.razon_social.trim()) {
      return Swal.fire('Atención', 'Ingrese la Razón Social o Nombres del cliente.', 'warning');
    }

    try {
      const payload = {
        ...nuevoClienteForm,
        estudiante_id: estudiante ? estudiante.id_estudiante : null,
        es_predeterminado: true
      };
      const res = await createClienteFacturacion(payload);
      if (res.success && res.cliente) {
        setCliente(res.cliente);
        setShowNuevoCliente(false);
        Swal.fire({
          icon: 'success',
          title: 'Cliente Guardado',
          timer: 1500,
          showConfirmButton: false,
          toast: true,
          position: 'top-end'
        });
      }
    } catch (err) {
      Swal.fire('Error', err.response?.data?.message || 'Error al guardar cliente.', 'error');
    }
  };

  // Manejo de selección de pagos
  const togglePago = (pagoId) => {
    setPagosSeleccionados(prev =>
      prev.includes(pagoId) ? prev.filter(id => id !== pagoId) : [...prev, pagoId]
    );
  };

  const toggleTodosPagos = () => {
    if (pagosSeleccionados.length === pagosPendientes.length) {
      setPagosSeleccionados([]);
    } else {
      setPagosSeleccionados(pagosPendientes.map(p => p.pago_id));
    }
  };

  // Cálculo de subtotales
  const pagosParaFacturar = pagosPendientes.filter(p => pagosSeleccionados.includes(p.pago_id));
  const subtotal0 = pagosParaFacturar.reduce((acc, p) => acc + parseFloat(p.monto || 0), 0);
  const tarifaIva = parseFloat(config?.tarifa_iva_defecto || 0);
  const ivaTotal = tarifaIva > 0 ? (subtotal0 * tarifaIva) / 100 : 0;
  const totalFactura = subtotal0 + ivaTotal;

  // Emitir Factura
  const handleEmitirFactura = async () => {
    if (!estudiante) {
      return Swal.fire('Atención', 'Debe seleccionar un estudiante matriculado.', 'warning');
    }
    if (!cliente) {
      return Swal.fire('Atención', 'Debe seleccionar o registrar los datos fiscales del cliente.', 'warning');
    }
    if (pagosSeleccionados.length === 0) {
      return Swal.fire('Atención', 'Debe seleccionar al menos un pago registrado para facturar.', 'warning');
    }

    const confirm = await Swal.fire({
      title: '¿Emitir Factura Oficial?',
      html: `
        <div style="text-align:left;font-size:0.9rem;" class="space-y-1">
          <p><b>Estudiante:</b> ${estudiante.apellidos}, ${estudiante.nombres}</p>
          <p><b>Facturar a:</b> ${cliente.razon_social} (${cliente.identificacion})</p>
          <p><b>Ítems seleccionados:</b> ${pagosSeleccionados.length} pago(s)</p>
          <p><b>Forma de Pago:</b> ${formaPago}</p>
          <hr class="my-2"/>
          <p style="font-size:1.1rem;font-weight:bold;color:#27A9E1;">Total Factura: ${fmt$(totalFactura)}</p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#27A9E1',
      confirmButtonText: 'Sí, emitir factura',
      cancelButtonText: 'Cancelar'
    });

    if (!confirm.isConfirmed) return;

    setEmitirLoading(true);
    try {
      const payload = {
        estudiante_id: estudiante.id_estudiante,
        cliente_id: cliente.id,
        pago_ids: pagosSeleccionados,
        forma_pago: formaPago,
        observaciones: observaciones?.trim() || null,
        anio_lectivo: estudiante.anio_lectivo || config?.anio_lectivo || '2026-2027'
      };

      const res = await emitirFactura(payload);
      if (res.success && res.factura) {
        await Swal.fire({
          icon: 'success',
          title: '¡Factura Emitida!',
          text: `Comprobante N° ${res.factura.numero} generado con éxito.`,
          timer: 2000,
          showConfirmButton: false
        });

        // Abrir modal de impresión automáticamente
        setFacturaModalData(res.factura);

        // Limpiar o recargar pagos pendientes
        await cargarClienteYPagos(estudiante);

        if (onFacturaEmitida) {
          onFacturaEmitida(res.factura);
        }
      }
    } catch (err) {
      Swal.fire('Error', err.response?.data?.message || 'Error al emitir factura.', 'error');
    }
    setEmitirLoading(false);
  };

  // Vista Previa sin guardar
  const handleVistaPrevia = () => {
    if (!estudiante || !cliente || pagosSeleccionados.length === 0) {
      return Swal.fire('Datos Incompletos', 'Seleccione estudiante, cliente y al menos un pago para previsualizar.', 'warning');
    }

    const facturaSimulada = {
      id: 0,
      numero: `${config?.codigo_establecimiento || '001'}-${config?.codigo_punto_emision || '001'}-000000000 (VISTA PREVIA)`,
      fecha_emision: new Date().toISOString().slice(0, 10),
      anio_lectivo: estudiante.anio_lectivo || '2026-2027',
      cliente_nombre: cliente.razon_social,
      cliente_identificacion: cliente.identificacion,
      cliente_tipo_identificacion: cliente.tipo_identificacion,
      cliente_direccion: cliente.direccion,
      cliente_telefono: cliente.telefono,
      cliente_email: cliente.email,
      estudiante_nombre: `${estudiante.apellidos}, ${estudiante.nombres}`,
      estudiante_codigo: estudiante.codigo,
      forma_pago: formaPago,
      observaciones,
      subtotal_0: subtotal0,
      subtotal_iva: 0,
      descuento: 0,
      tarifa_iva: tarifaIva,
      iva: ivaTotal,
      total: totalFactura,
      estado: 'EMITIDA',
      institucion: config,
      detalles: pagosParaFacturar.map(p => ({
        codigo: 'PEN',
        descripcion: `Pensión ${mesLabel(p.mes)} - ${p.curso_nombre || ''} ${p.paralelo || ''} - ${estudiante.apellidos} ${estudiante.nombres}`.trim(),
        cantidad: 1,
        precio_unitario: p.monto,
        descuento: 0,
        tarifa_iva: tarifaIva,
        valor_iva: 0,
        total: p.monto
      }))
    };

    setFacturaModalData(facturaSimulada);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* ── Encabezado Institucional de Emisión ── */}
      <div className="bg-gradient-to-r from-[#0f172a] via-[#1e293b] to-[#0f172a] rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <img
            src={logoEscuela}
            alt="Logo"
            className="w-16 h-16 object-contain bg-white rounded-2xl p-2 drop-shadow-md flex-shrink-0"
          />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-extrabold uppercase tracking-tight">
                {config?.razon_social || 'UNIDAD EDUCATIVA JUAN LEÓN MERA'}
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#27A9E1]/20 text-[#27A9E1] border border-[#27A9E1]/30">
                Punto: {config?.codigo_establecimiento || '001'}-{config?.codigo_punto_emision || '001'}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              RUC: <span className="font-mono font-bold text-white">{config?.ruc || '1391700000001'}</span>
              &nbsp;&middot;&nbsp;
              Matriz: <span>{config?.direccion_matriz || 'Jaramijó, Manabí'}</span>
            </p>
            <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
              <span>Obligado Contab: <b className="text-slate-200">{config?.obligado_contabilidad || 'NO'}</b></span>
              <span>&bull;</span>
              <span>Régimen: <b className="text-[#F4C542]">{config?.regimen || 'RIMPE_EMPRENDEDOR'}</b></span>
              <span>&bull;</span>
              <span>Ambiente: <b className="text-slate-200">{config?.ambiente === 2 ? 'Producción' : 'Pruebas'}</b></span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setModalConfigOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-semibold border border-slate-700 shadow-sm transition"
          >
            <FiSettings size={15} /> Configurar Emisor
          </button>
        </div>
      </div>

      {/* ── Grid Principal de Facturación ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Panel Izquierdo: Selección Estudiante + Cliente (5 Cols) */}
        <div className="lg:col-span-5 space-y-5">
          
          {/* 1. SELECCIÓN DE ESTUDIANTE */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-2"><FiUser size={15} className="text-[#27A9E1]" /> Estudiante</span>
              {estudiante && (
                <button
                  onClick={() => { setEstudiante(null); setCliente(null); }}
                  className="text-xs text-red-500 hover:underline font-normal flex items-center gap-1"
                >
                  <FiX size={13} /> Cambiar
                </button>
              )}
            </h3>

            {estudiante ? (
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-900 text-sm">{estudiante.apellidos}, {estudiante.nombres}</span>
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-[#27A9E1]/10 text-[#27A9E1] font-semibold">
                    {estudiante.codigo}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 pt-1 border-t border-slate-200">
                  <p><span className="text-gray-400">Curso:</span> {estudiante.curso_nombre}</p>
                  <p><span className="text-gray-400">Paralelo:</span> {estudiante.paralelo_nombre || estudiante.paralelo || '-'}</p>
                  <p><span className="text-gray-400">Año Lectivo:</span> {estudiante.anio_lectivo || '2026-2027'}</p>
                  <p><span className="text-gray-400">Cédula:</span> {estudiante.cedula || '-'}</p>
                </div>
              </div>
            ) : (
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                <input
                  type="text"
                  value={searchEstTerm}
                  onChange={e => setSearchEstTerm(e.target.value)}
                  placeholder="Buscar estudiante por código, cédula o nombre..."
                  className="w-full pl-9 pr-4 py-2 border rounded-xl text-xs focus:ring-2 focus:ring-[#27A9E1]/30 focus:border-[#27A9E1]"
                />
                {isSearchingEst && (
                  <FiRefreshCw className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" size={14} />
                )}
                {searchEstResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-30 max-h-56 overflow-y-auto">
                    {searchEstResults.map(e => (
                      <button
                        key={e.id_estudiante}
                        onClick={() => {
                          setEstudiante(e);
                          setSearchEstTerm('');
                          setSearchEstResults([]);
                        }}
                        className="w-full text-left px-3 py-2.5 border-b last:border-0 hover:bg-blue-50 text-xs flex flex-col"
                      >
                        <span className="font-semibold text-gray-800">{e.apellidos}, {e.nombres}</span>
                        <span className="text-[10px] text-gray-500 font-mono">Cod: {e.codigo} &middot; {e.curso_nombre} "{e.paralelo_nombre}"</span>
                      </button>
                    ))}
                  </div>
                )}
                {searchEstTerm.length >= 2 && !isSearchingEst && searchEstResults.length === 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-30 p-3 text-center text-xs text-gray-500">
                    No se encontraron estudiantes con "{searchEstTerm}".
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 2. DATOS DEL CLIENTE / RECEPTOR DE LA FACTURA */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider flex items-center gap-2">
                <FiFileText size={15} className="text-[#27A9E1]" /> Datos del Cliente / Facturado a
              </h3>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleSeleccionarConsumidorFinal}
                  className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-[11px] font-semibold rounded-lg transition"
                >
                  Consumidor Final
                </button>
                <button
                  type="button"
                  onClick={() => setShowNuevoCliente(true)}
                  className="px-2.5 py-1 bg-[#27A9E1] hover:bg-[#1f93c6] text-white text-[11px] font-semibold rounded-lg shadow-sm transition flex items-center gap-1"
                >
                  <FiPlus size={12} /> Nuevo
                </button>
              </div>
            </div>

            {/* Buscador de clientes */}
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <input
                type="text"
                value={searchCliTerm}
                onChange={e => setSearchCliTerm(e.target.value)}
                placeholder="Buscar por cédula, RUC o razón social..."
                className="w-full pl-9 pr-4 py-2 border rounded-xl text-xs focus:ring-2 focus:ring-[#27A9E1]/30 focus:border-[#27A9E1]"
              />
              {isSearchingCli && (
                <FiRefreshCw className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" size={13} />
              )}
              {searchCliResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-30 max-h-56 overflow-y-auto">
                  {searchCliResults.map(c => (
                    <button
                      key={c.id}
                      onClick={() => {
                        setCliente(c);
                        setSearchCliTerm('');
                        setSearchCliResults([]);
                      }}
                      className="w-full text-left px-3 py-2.5 border-b last:border-0 hover:bg-blue-50 text-xs flex flex-col"
                    >
                      <span className="font-semibold text-gray-800">{c.razon_social}</span>
                      <span className="text-[10px] text-gray-500 font-mono">{c.tipo_identificacion}: {c.identificacion} &middot; {c.email}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Ficha Cliente Seleccionado */}
            {cliente ? (
              <div className="p-3.5 bg-blue-50/50 border border-blue-100 rounded-xl space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-900 text-sm">{cliente.razon_social}</span>
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-blue-100 text-blue-700 font-semibold">
                    {cliente.tipo_identificacion}: {cliente.identificacion}
                  </span>
                </div>
                <div className="space-y-1 text-gray-600 text-[11px] pt-1 border-t border-blue-100">
                  <p><span className="font-semibold text-gray-500">Dirección:</span> {cliente.direccion || 'CIUDAD'}</p>
                  <p><span className="font-semibold text-gray-500">Teléfono:</span> {cliente.telefono || '-'}</p>
                  <p><span className="font-semibold text-gray-500">Email:</span> {cliente.email || '-'}</p>
                </div>
                {cliente.es_sugerido && (
                  <p className="text-[10px] text-amber-600 font-medium bg-amber-50 p-1.5 rounded-lg border border-amber-200">
                    ℹ️ Datos precargados del representante legal. Se guardará como cliente formal al emitir.
                  </p>
                )}
              </div>
            ) : (
              <div className="p-4 border-2 border-dashed border-gray-200 rounded-xl text-center text-xs text-gray-400">
                Seleccione un cliente con el buscador o pulse "Consumidor Final"
              </div>
            )}
          </div>

        </div>

        {/* Panel Derecho: Pagos Pendientes + Detalle + Totales (7 Cols) */}
        <div className="lg:col-span-7 space-y-5">
          
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-4">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b">
              <div>
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <FiDollarSign size={17} className="text-[#27A9E1]" /> Pagos de Pensión por Facturar
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Seleccione las cuotas cobradas que se incluirán en el comprobante
                </p>
              </div>

              {pagosPendientes.length > 0 && (
                <button
                  type="button"
                  onClick={toggleTodosPagos}
                  className="text-xs text-[#27A9E1] hover:underline font-semibold flex items-center gap-1 self-start sm:self-center"
                >
                  {pagosSeleccionados.length === pagosPendientes.length ? (
                    <><FiCheckSquare size={14} /> Desmarcar Todos</>
                  ) : (
                    <><FiSquare size={14} /> Marcar Todos ({pagosPendientes.length})</>
                  )}
                </button>
              )}
            </div>

            {/* Listado de Pagos de Pensión */}
            {!estudiante ? (
              <div className="py-12 text-center text-gray-400 text-xs">
                Seleccione un estudiante a la izquierda para cargar sus cobros no facturados.
              </div>
            ) : loadingPagos ? (
              <div className="py-12 text-center text-gray-400 text-xs flex items-center justify-center gap-2">
                <FiRefreshCw className="animate-spin" size={16} /> Consultando pagos pendientes...
              </div>
            ) : pagosPendientes.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-xs">
                Este estudiante no tiene cobros de pensión pendientes por facturar.
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {pagosPendientes.map(p => {
                  const seleccionado = pagosSeleccionados.includes(p.pago_id);
                  return (
                    <div
                      key={p.pago_id}
                      onClick={() => togglePago(pago_id)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 text-xs ${
                        seleccionado
                          ? 'bg-blue-50/70 border-[#27A9E1] shadow-sm'
                          : 'bg-gray-50 border-gray-200 hover:bg-gray-100/60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-md flex items-center justify-center ${seleccionado ? 'bg-[#27A9E1] text-white' : 'border border-gray-300 bg-white'}`}>
                          {seleccionado && <FiCheck size={14} />}
                        </div>
                        <div>
                          <p className="font-bold text-gray-800">
                            Pensión {mesLabel(p.mes)}
                          </p>
                          <p className="text-[11px] text-gray-500 font-mono">
                            Cobrado el: {fmtFecha(p.fecha_pago)} &middot; Recibo #{p.numero_recibo || '-'}
                          </p>
                        </div>
                      </div>

                      <div className="text-right font-mono">
                        <span className="text-xs font-bold text-gray-900 block">{fmt$(p.monto)}</span>
                        <span className="text-[10px] text-gray-400">Tarifa: 0% IVA</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Opciones de Cobro: Forma de pago y Observaciones */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Forma de Pago *</label>
                <select
                  value={formaPago}
                  onChange={e => setFormaPago(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-xs bg-white focus:ring-2 focus:ring-[#27A9E1]/30 font-medium"
                >
                  <option value="EFECTIVO">Efectivo</option>
                  <option value="TRANSFERENCIA">Transferencia Bancaria</option>
                  <option value="TARJETA">Tarjeta de Débito/Crédito</option>
                  <option value="DEPOSITO">Depósito Bancario</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Observaciones / Nota</label>
                <input
                  type="text"
                  value={observaciones}
                  onChange={e => setObservaciones(e.target.value)}
                  placeholder="Detalle adicional opcional..."
                  className="w-full px-3 py-2 border rounded-xl text-xs focus:ring-2 focus:ring-[#27A9E1]/30"
                />
              </div>
            </div>

            {/* Cuadro de Totales */}
            <div className="bg-slate-900 text-white rounded-xl p-5 space-y-2 font-mono text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal 0% (Servicios Educativos):</span>
                <span className="font-bold text-white">{fmt$(subtotal0)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Subtotal IVA ({tarifaIva}%):</span>
                <span>$ 0.00</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>IVA {tarifaIva}%:</span>
                <span>{fmt$(ivaTotal)}</span>
              </div>
              <div className="border-t border-slate-800 pt-2 flex justify-between items-center text-sm font-extrabold">
                <span className="text-slate-200">TOTAL A FACTURAR:</span>
                <span className="text-xl text-[#27A9E1]">{fmt$(totalFactura)}</span>
              </div>
            </div>

            {/* Botones Principales */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleVistaPrevia}
                disabled={!estudiante || !cliente || pagosSeleccionados.length === 0}
                className="w-full sm:w-auto px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition disabled:opacity-40"
              >
                Vista Previa
              </button>
              
              <button
                type="button"
                onClick={handleEmitirFactura}
                disabled={emitirLoading || !estudiante || !cliente || pagosSeleccionados.length === 0}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-[#27A9E1] hover:bg-[#1f93c6] text-white rounded-xl text-xs font-bold shadow-lg shadow-[#27A9E1]/30 transition disabled:opacity-50"
              >
                {emitirLoading ? (
                  <><FiRefreshCw className="animate-spin" size={15} /> Emitiendo Factura...</>
                ) : (
                  <><FiPrinter size={15} /> Emitir Factura</>
                )}
              </button>
            </div>

          </div>

        </div>

      </div>

      {/* Modal Nuevo Cliente */}
      {showNuevoCliente && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 my-auto animate-fade-in">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-sm text-gray-800">Registrar Cliente de Facturación</h3>
              <button onClick={() => setShowNuevoCliente(false)} className="text-gray-400 hover:text-gray-600">
                <FiX size={18} />
              </button>
            </div>

            <form onSubmit={handleGuardarNuevoCliente} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Tipo de Identificación *</label>
                <select
                  value={nuevoClienteForm.tipo_identificacion}
                  onChange={e => {
                    const tipo = e.target.value;
                    setNuevoClienteForm(prev => ({ ...prev, tipo_identificacion: tipo }));
                    handleIdentificacionChange(nuevoClienteForm.identificacion, tipo);
                  }}
                  className="w-full px-3 py-2 border rounded-xl bg-white"
                >
                  <option value="CEDULA">Cédula (10 dígitos)</option>
                  <option value="RUC">R.U.C. (13 dígitos)</option>
                  <option value="PASAPORTE">Pasaporte</option>
                  <option value="CONSUMIDOR_FINAL">Consumidor Final</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Número de Identificación *</label>
                <input
                  type="text"
                  value={nuevoClienteForm.identificacion}
                  onChange={e => handleIdentificacionChange(e.target.value)}
                  maxLength={nuevoClienteForm.tipo_identificacion === 'RUC' ? 13 : nuevoClienteForm.tipo_identificacion === 'CEDULA' ? 10 : 20}
                  required
                  placeholder="Ej: 1312345678"
                  className={`w-full px-3 py-2 border rounded-xl font-mono ${errorIdentificacion ? 'border-red-400 bg-red-50/50' : ''}`}
                />
                {errorIdentificacion && (
                  <p className="text-[10px] text-red-500 mt-1 flex items-center gap-1">
                    <FiAlertCircle size={11} /> {errorIdentificacion}
                  </p>
                )}
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Nombres / Razón Social *</label>
                <input
                  type="text"
                  value={nuevoClienteForm.razon_social}
                  onChange={e => setNuevoClienteForm({ ...nuevoClienteForm, razon_social: e.target.value })}
                  required
                  placeholder="Apellidos y Nombres o Nombre de la Empresa"
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Dirección Fiscal *</label>
                <input
                  type="text"
                  value={nuevoClienteForm.direccion}
                  onChange={e => setNuevoClienteForm({ ...nuevoClienteForm, direccion: e.target.value })}
                  required
                  placeholder="Calle, cantón o ciudad"
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Teléfono</label>
                  <input
                    type="text"
                    value={nuevoClienteForm.telefono}
                    onChange={e => setNuevoClienteForm({ ...nuevoClienteForm, telefono: e.target.value })}
                    placeholder="0991234567"
                    className="w-full px-3 py-2 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Correo Electrónico</label>
                  <input
                    type="email"
                    value={nuevoClienteForm.email}
                    onChange={e => setNuevoClienteForm({ ...nuevoClienteForm, email: e.target.value })}
                    placeholder="correo@ejemplo.com"
                    className="w-full px-3 py-2 border rounded-xl"
                  />
                </div>
              </div>

              <div className="pt-3 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNuevoCliente(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!!errorIdentificacion}
                  className="px-5 py-2 bg-[#27A9E1] hover:bg-[#1f93c6] text-white rounded-xl font-bold shadow disabled:opacity-50"
                >
                  Guardar y Usar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Configuración */}
      <ConfiguracionFacturacionModal
        isOpen={modalConfigOpen}
        onClose={() => setModalConfigOpen(false)}
        onSaved={nuevaConfig => setConfig(nuevaConfig)}
      />

      {/* Modal Factura Emitida / Vista Previa */}
      {facturaModalData && (
        <FacturaModal
          factura={facturaModalData}
          onClose={() => setFacturaModalData(null)}
        />
      )}

    </div>
  );
}
