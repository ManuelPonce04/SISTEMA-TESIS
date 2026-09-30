import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import MainLayout from '../../components/layout/MainLayout';
import Swal from 'sweetalert2';
import {
  FiSearch, FiDollarSign, FiUser, FiPrinter,
  FiXCircle, FiCheckCircle, FiAlertCircle, FiRefreshCw,
  FiBarChart2, FiFileText, FiChevronDown, FiClock,
  FiSettings, FiPlus
} from 'react-icons/fi';
import {
  buscarEstudiantesParaPension,
  getCuotaMes,
  registrarCobro,
  getCobrosRecientes,
  anularPago,
  getTotalesDia,
} from '../../services/cobrarPensionesService';
import FacturacionPanel from '../../components/financiero/facturacion/FacturacionPanel';
import FacturasHistorialTab from '../../components/financiero/facturacion/FacturasHistorialTab';
import FacturaModal from '../../components/financiero/facturacion/FacturaModal';
import ConfiguracionFacturacionModal from '../../components/financiero/facturacion/ConfiguracionFacturacionModal';
import CierreFacturacionModal from '../../components/financiero/facturacion/CierreFacturacionModal';

// ── Helpers ──────────────────────────────────────────────────
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
const hoy = () => new Date().toISOString().slice(0, 10);
const mesActual = () => new Date().toISOString().slice(0, 7);
const anioActual = () => {
  const y = new Date().getFullYear();
  const m = new Date().getMonth() + 1;
  return m >= 5 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
};

// ── Badge de estado ─────────────────────────────────────────
const EstadoBadge = ({ estado }) => {
  const map = {
    PAGADO:    'bg-emerald-100 text-emerald-700 border-emerald-200',
    PARCIAL:   'bg-amber-100   text-amber-700   border-amber-200',
    PENDIENTE: 'bg-red-100     text-red-700     border-red-200',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${map[estado] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
      {estado}
    </span>
  );
};

// ─────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────
export default function CobrarPensionesPage({ defaultTab = 'cobro' }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabFromUrl || defaultTab);

  const anio_lectivo = anioActual();

  // Estados de Facturación
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showCierreModal, setShowCierreModal] = useState(false);
  const [verFacturaId, setVerFacturaId] = useState(null);
  const [facturacionEstudiante, setFacturacionEstudiante] = useState(null);
  const [facturacionPagoId, setFacturacionPagoId] = useState(null);

  // Busqueda
  const [searchTerm, setSearchTerm]       = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching]     = useState(false);
  const searchRef = useRef(null);

  // Estudiante seleccionado
  const [estudiante, setEstudiante]   = useState(null);
  const [nivelConfig, setNivelConfig] = useState('');

  // Formulario de cobro
  const [mes, setMes]             = useState(mesActual());
  const [fechaPago, setFechaPago] = useState(hoy());
  const [monto, setMonto]         = useState('');
  const [nota, setNota]           = useState('');
  const [saving, setSaving]       = useState(false);

  // Cuota del mes
  const [cuota, setCuota]               = useState(null);
  const [totalPagado, setTotalPagado]   = useState(0);
  const [saldo, setSaldo]               = useState(0);
  const [valorPension, setValorPension] = useState(0);
  const [loadingCuota, setLoadingCuota] = useState(false);

  // Cobros recientes
  const [cobros, setCobros]               = useState([]);
  const [loadingCobros, setLoadingCobros] = useState(false);

  // Panel totales del dia
  const [fechaCorte, setFechaCorte]         = useState(hoy());
  const [totalesDia, setTotalesDia]         = useState(null);
  const [loadingTotales, setLoadingTotales] = useState(false);

  // Recibo
  const [reciboData, setReciboData] = useState(null);
  const [showRecibo, setShowRecibo] = useState(false);

  // Sincronizar tab con URL si cambia
  useEffect(() => {
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  // Buscar al escribir (debounce 400ms)
  useEffect(() => {
    if (searchTerm.length < 2) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await buscarEstudiantesParaPension(searchTerm, anio_lectivo);
        // Acepta tanto { success: true, estudiantes: [] } como { estudiantes: [] }
        if (Array.isArray(res.estudiantes)) {
          setSearchResults(res.estudiantes);
        }
      } catch (err) {
        console.error('[CobrarPensiones] Error al buscar estudiante:', err?.response?.data || err.message);
        setSearchResults([]);
      }
      setIsSearching(false);
    }, 400);
    return () => clearTimeout(t);
  }, [searchTerm, anio_lectivo]);


  // Cargar cuota cuando cambia estudiante o mes
  const cargarCuota = useCallback(async (est, m) => {
    if (!est) return;
    setLoadingCuota(true);
    try {
      const anio = est.anio_lectivo || anio_lectivo;
      const res = await getCuotaMes(est.id_estudiante, m, anio);
      if (res.success) {
        setCuota(res.cuota);
        setTotalPagado(parseFloat(res.total_pagado));
        setSaldo(parseFloat(res.saldo));
        setValorPension(parseFloat(res.valor_pension));
      }
    } catch { /* silencioso */ }
    setLoadingCuota(false);
  }, [anio_lectivo]);

  useEffect(() => {
    cargarCuota(estudiante, mes);
  }, [estudiante, mes, cargarCuota]);

  // Cargar cobros recientes
  const cargarCobros = useCallback(async () => {
    setLoadingCobros(true);
    try {
      const res = await getCobrosRecientes({ anio_lectivo, limit: 30 });
      if (res.success) setCobros(res.cobros);
    } catch { /* silencioso */ }
    setLoadingCobros(false);
  }, [anio_lectivo]);

  useEffect(() => { cargarCobros(); }, [cargarCobros]);

  // Cargar totales del dia
  const cargarTotales = useCallback(async () => {
    setLoadingTotales(true);
    try {
      const res = await getTotalesDia(fechaCorte, anio_lectivo);
      if (res.success) setTotalesDia(res);
    } catch { /* silencioso */ }
    setLoadingTotales(false);
  }, [fechaCorte, anio_lectivo]);

  useEffect(() => { cargarTotales(); }, [cargarTotales]);

  // Seleccionar estudiante
  const handleSelectEstudiante = (est) => {
    setEstudiante(est);
    setNivelConfig(est.nivel_config || '');
    setSearchTerm('');
    setSearchResults([]);
    setMonto('');
    setNota('');
  };

  // Registrar cobro
  const handleCobrar = async () => {
    if (!estudiante) return Swal.fire('Atención', 'Selecciona un estudiante primero.', 'warning');
    if (!monto || parseFloat(monto) <= 0)
      return Swal.fire('Atención', 'El monto debe ser mayor a 0.', 'warning');
    if (parseFloat(monto) > saldo + 0.005)
      return Swal.fire('Atención', `El monto (${fmt$(monto)}) supera el saldo (${fmt$(saldo)}).`, 'warning');

    const confirm = await Swal.fire({
      title: '¿Confirmar cobro?',
      html: `
        <div style="text-align:left;font-size:0.95rem">
          <b>Estudiante:</b> ${estudiante.apellidos} ${estudiante.nombres}<br/>
          <b>Mes:</b> ${mesLabel(mes)}<br/>
          <b>Abono:</b> ${fmt$(monto)}<br/>
          <b>Saldo nuevo:</b> ${fmt$(saldo - parseFloat(monto))}
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#27A9E1',
      confirmButtonText: 'Sí, registrar',
      cancelButtonText: 'Cancelar',
    });
    if (!confirm.isConfirmed) return;

    setSaving(true);
    try {
      const res = await registrarCobro({
        estudiante_id: estudiante.id_estudiante,
        mes,
        anio_lectivo: estudiante.anio_lectivo || anio_lectivo,
        monto: parseFloat(monto),
        fecha_pago: fechaPago,
        nota: nota || null,
      });
      if (res.success) {
        setMonto('');
        setNota('');
        await cargarCuota(estudiante, mes);
        await cargarCobros();
        await cargarTotales();

        const decision = await Swal.fire({
          title: '¡Cobro Registrado!',
          html: `
            <div style="text-align:left;font-size:0.92rem" class="space-y-1">
              <p><b>N° de Recibo:</b> <span class="text-[#27A9E1] font-mono font-bold">${res.numero_recibo}</span></p>
              <p><b>Estudiante:</b> ${estudiante.apellidos}, ${estudiante.nombres}</p>
              <p><b>Monto Cobrado:</b> <span class="font-mono font-bold text-emerald-600">${fmt$(monto)}</span></p>
              <div class="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-900">
                ¿Deseas emitir la <b>Factura</b> electrónica para este pago en este momento?
              </div>
            </div>
          `,
          icon: 'success',
          showCancelButton: true,
          confirmButtonColor: '#0f172a',
          cancelButtonColor: '#27A9E1',
          confirmButtonText: '🧾 Emitir Factura',
          cancelButtonText: '🖨️ Ver Recibo'
        });

        if (decision.isConfirmed) {
          setFacturacionEstudiante(estudiante);
          setFacturacionPagoId(res.pago_id || res.id);
          setActiveTab('facturar');
        } else {
          setReciboData({
            ...res,
            estudiante,
            mes,
            monto: parseFloat(monto),
            fecha_pago: fechaPago,
            nota,
            anio_lectivo: estudiante.anio_lectivo || anio_lectivo,
          });
          setShowRecibo(true);
        }
      }
    } catch (e) {
      Swal.fire('Error', e.response?.data?.message || 'Error al registrar el cobro.', 'error');
    }
    setSaving(false);
  };

  // Anular pago
  const handleAnular = async (pago) => {
    const { value: motivo } = await Swal.fire({
      title: 'Anular pago',
      input: 'textarea',
      inputLabel: 'Motivo de anulación (obligatorio)',
      inputPlaceholder: 'Ingrese el motivo...',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Anular',
      cancelButtonText: 'Cancelar',
      preConfirm: (val) => {
        if (!val || val.trim().length < 5)
          Swal.showValidationMessage('El motivo debe tener al menos 5 caracteres.');
        return val;
      },
    });
    if (!motivo) return;

    try {
      const res = await anularPago(pago.id, motivo);
      if (res.success) {
        await Swal.fire('Anulado', 'El pago ha sido anulado.', 'success');
        await cargarCobros();
        await cargarCuota(estudiante, mes);
        await cargarTotales();
      }
    } catch (e) {
      Swal.fire('Error', e.response?.data?.message || 'Error al anular.', 'error');
    }
  };

  // ─────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────
  return (
    <MainLayout>
      <div className="p-6 max-w-[1650px] mx-auto space-y-6">

        {/* Header & Tabs */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FiDollarSign className="text-[#27A9E1]" size={26} />
              Cobro y Facturación de Pensiones
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Periodo: <span className="font-semibold text-gray-700">{anio_lectivo}</span>
              &nbsp;&middot;&nbsp;
              Fecha: <span className="font-semibold text-gray-700">{fmtFecha(hoy())}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Pestañas de Navegación */}
            <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200">
              <button
                onClick={() => setActiveTab('cobro')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition ${
                  activeTab === 'cobro'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                <FiDollarSign size={16} className={activeTab === 'cobro' ? 'text-[#27A9E1]' : ''} />
                <span>Cobro de Pensiones</span>
              </button>

              <button
                onClick={() => setActiveTab('facturar')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition ${
                  activeTab === 'facturar'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                <FiFileText size={16} className={activeTab === 'facturar' ? 'text-[#27A9E1]' : ''} />
                <span>Facturación</span>
              </button>

              <button
                onClick={() => setActiveTab('historial')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition ${
                  activeTab === 'historial'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                <FiClock size={16} className={activeTab === 'historial' ? 'text-[#27A9E1]' : ''} />
                <span>Historial de Facturas</span>
              </button>
            </div>

            {/* Botón Configuración Emisor */}
            <button
              onClick={() => setShowConfigModal(true)}
              className="p-2.5 bg-white border border-gray-200 rounded-xl text-gray-600 hover:text-[#27A9E1] hover:border-[#27A9E1] shadow-sm transition flex items-center gap-2 text-xs font-semibold"
              title="Configuración de Facturación e Institución"
            >
              <FiSettings size={16} />
              <span className="hidden sm:inline">Configuración</span>
            </button>
          </div>
        </div>

        {/* ─── TAB 1: COBRO DE PENSIONES ─── */}
        {activeTab === 'cobro' && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 animate-fade-in">

            {/* IZQUIERDA (2/3) */}
            <div className="xl:col-span-2 space-y-5">

              {/* Busqueda */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <FiSearch size={15} /> Buscar Estudiante
                </h2>
                <div className="relative" ref={searchRef}>
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Código, apellidos o nombres..."
                    className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#27A9E1]/30 focus:border-[#27A9E1] transition"
                  />
                  {isSearching && (
                    <FiRefreshCw className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" size={15} />
                  )}
                  {searchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 max-h-64 overflow-y-auto">
                      {searchResults.map(est => (
                        <button
                          key={est.id_estudiante}
                          onClick={() => handleSelectEstudiante(est)}
                          className="w-full text-left px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-blue-50 transition flex flex-col"
                        >
                          <span className="font-semibold text-gray-900 text-sm">
                            {est.apellidos}, {est.nombres}
                          </span>
                          <span className="text-xs text-gray-500">
                            Cód: {est.codigo} &middot; {est.curso_nombre} "{est.paralelo_nombre}" &middot; {est.anio_lectivo}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                  {searchTerm.length >= 2 && !isSearching && searchResults.length === 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 p-4 text-center text-xs text-gray-500">
                      No se encontraron estudiantes con "{searchTerm}".
                    </div>
                  )}
                </div>
              </div>

              {/* Ficha estudiante + formulario */}
              {estudiante ? (
                <>
                  {/* Ficha */}
                  <div className="bg-gradient-to-r from-[#0f172a] to-[#1e293b] rounded-2xl p-5 text-white shadow-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-[#27A9E1]/20 rounded-full flex items-center justify-center flex-shrink-0">
                        <FiUser size={22} className="text-[#27A9E1]" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-slate-400 uppercase tracking-wider">Estudiante</p>
                        <h3 className="text-lg font-bold">{estudiante.apellidos}, {estudiante.nombres}</h3>
                      </div>
                      <button
                        onClick={() => { setEstudiante(null); setCuota(null); setSaldo(0); setTotalPagado(0); setValorPension(0); }}
                        className="text-slate-400 hover:text-white transition"
                        title="Deseleccionar"
                      >
                        <FiXCircle size={20} />
                      </button>
                    </div>
                    <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      {[
                        { label: 'Código',   value: estudiante.codigo },
                        { label: 'Grado',    value: estudiante.curso_nombre },
                        { label: 'Paralelo', value: estudiante.paralelo_nombre },
                        { label: 'Nivel',    value: nivelConfig },
                      ].map(f => (
                        <div key={f.label} className="bg-white/5 rounded-xl p-3">
                          <p className="text-xs text-slate-400">{f.label}</p>
                          <p className="font-semibold">{f.value || '-'}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Tabla de cobro */}
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="bg-gray-50 px-5 py-3 border-b flex flex-col sm:flex-row sm:items-center gap-3">
                      <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-2 flex-1">
                        <FiFileText size={14} /> Registro de Cobro
                      </h2>
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-medium text-gray-500">Mes:</label>
                        <input
                          type="month"
                          value={mes}
                          onChange={e => setMes(e.target.value)}
                          className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#27A9E1]/30 focus:border-[#27A9E1]"
                        />
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-[#0f172a] text-white text-xs uppercase tracking-wider">
                            {['Fecha','Cód. Est.','Apellidos y Nombres','Grado/Curso','Par.','Val. Pens. Mens.','Mes','Cobro/Abono','Total','Saldo Pens. Mes','Nota/Observ.'].map(h => (
                              <th key={h} className="px-3 py-2.5 text-left whitespace-nowrap font-semibold">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b border-gray-100 hover:bg-blue-50/30 transition-colors">
                            <td className="px-3 py-2">
                              <input
                                type="date"
                                value={fechaPago}
                                onChange={e => setFechaPago(e.target.value)}
                                className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs w-32 focus:outline-none focus:ring-2 focus:ring-[#27A9E1]/30"
                              />
                            </td>
                            <td className="px-3 py-2 font-mono text-gray-600 text-xs">{estudiante.codigo}</td>
                            <td className="px-3 py-2 font-medium text-gray-800 whitespace-nowrap">
                              {estudiante.apellidos}, {estudiante.nombres}
                            </td>
                            <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{estudiante.curso_nombre}</td>
                            <td className="px-3 py-2 text-center font-bold text-gray-700">{estudiante.paralelo_nombre}</td>
                            <td className="px-3 py-2 text-right font-mono font-bold text-gray-800">
                              {loadingCuota ? '...' : fmt$(valorPension)}
                            </td>
                            <td className="px-3 py-2 text-gray-700 whitespace-nowrap font-medium">
                              {mesLabel(mes)}
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={monto}
                                onChange={e => setMonto(e.target.value)}
                                placeholder="0.00"
                                className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm font-mono text-right w-28 focus:outline-none focus:ring-2 focus:ring-[#27A9E1]/30 focus:border-[#27A9E1]"
                              />
                            </td>
                            <td className="px-3 py-2 text-right font-mono font-bold text-emerald-700">
                              {loadingCuota ? '...' : fmt$(totalPagado)}
                            </td>
                            <td className="px-3 py-2 text-right font-mono font-bold">
                              <span className={saldo <= 0 ? 'text-emerald-600' : 'text-red-600'}>
                                {loadingCuota ? '...' : fmt$(saldo)}
                              </span>
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="text"
                                value={nota}
                                onChange={e => setNota(e.target.value)}
                                placeholder="Opcional..."
                                className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs w-36 focus:outline-none focus:ring-2 focus:ring-[#27A9E1]/30"
                              />
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Resumen + boton */}
                    <div className="px-5 py-4 bg-gray-50 border-t flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="flex gap-6 text-sm">
                        <div className="text-center">
                          <p className="text-xs text-gray-500 uppercase tracking-wide">Valor Pensión</p>
                          <p className="font-bold text-gray-800 font-mono text-base">{fmt$(valorPension)}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-500 uppercase tracking-wide">Total Cobrado</p>
                          <p className="font-bold text-emerald-700 font-mono text-base">{fmt$(totalPagado)}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-500 uppercase tracking-wide">Saldo</p>
                          <p className={`font-bold font-mono text-base ${saldo <= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {fmt$(saldo)}
                          </p>
                        </div>
                        {cuota && <div className="flex items-center"><EstadoBadge estado={cuota.estado} /></div>}
                      </div>
                      <button
                        onClick={handleCobrar}
                        disabled={saving || saldo <= 0.005}
                        className="flex items-center gap-2 px-6 py-2.5 bg-[#27A9E1] hover:bg-blue-600 text-white font-bold rounded-xl shadow-md shadow-blue-500/20 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <FiCheckCircle size={18} />
                        {saving ? 'Registrando...' : saldo <= 0.005 ? 'Cuota Pagada' : 'Registrar Cobro'}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-16 flex flex-col items-center justify-center text-center min-h-[320px]">
                  <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                    <FiDollarSign size={34} className="text-[#27A9E1]" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-700">Ningún estudiante seleccionado</h3>
                  <p className="text-gray-400 mt-2 max-w-sm text-sm">
                    Use el buscador para encontrar al estudiante y registrar el cobro de la pensión.
                  </p>
                </div>
              )}

              {/* Cobros recientes */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-5 py-3 border-b bg-gray-50 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                    <FiClock size={14} /> Cobros Recientes
                  </h2>
                  <button onClick={cargarCobros} className="text-gray-400 hover:text-[#27A9E1] transition p-1 rounded-lg hover:bg-blue-50">
                    <FiRefreshCw size={15} className={loadingCobros ? 'animate-spin' : ''} />
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50 text-gray-500 uppercase tracking-wider">
                        {['N° Recibo','Fecha','Estudiante','Grado','Par.','Mes','Monto','Estado','Facturación','Nota','Acciones'].map(h => (
                          <th key={h} className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {loadingCobros ? (
                        <tr><td colSpan="11" className="text-center py-8 text-gray-400">Cargando...</td></tr>
                      ) : cobros.length === 0 ? (
                        <tr><td colSpan="11" className="text-center py-8 text-gray-400">No hay cobros registrados aún.</td></tr>
                      ) : cobros.map(c => (
                        <tr key={c.id} className={`hover:bg-gray-50 transition ${c.anulado ? 'opacity-50 line-through' : ''}`}>
                          <td className="px-3 py-2.5 font-mono font-bold text-[#27A9E1]">#{c.numero_recibo}</td>
                          <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">{fmtFecha(c.fecha_pago)}</td>
                          <td className="px-3 py-2.5 font-medium text-gray-800 whitespace-nowrap">{c.apellidos}, {c.nombres}</td>
                          <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">{c.curso_nombre}</td>
                          <td className="px-3 py-2.5 text-center font-bold">{c.paralelo}</td>
                          <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">{mesLabel(c.mes)}</td>
                          <td className="px-3 py-2.5 font-mono font-bold text-emerald-700 whitespace-nowrap">{fmt$(c.monto)}</td>
                          <td className="px-3 py-2.5">
                            {c.anulado
                              ? <span className="text-red-500 font-semibold text-xs">ANULADO</span>
                              : <span className="text-emerald-600 font-semibold text-xs">VÁLIDO</span>
                            }
                          </td>
                          {/* Columna Facturación */}
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            {c.anulado ? (
                              <span className="text-gray-400 text-xs italic">-</span>
                            ) : c.facturado ? (
                              <button
                                onClick={() => setVerFacturaId(c.factura_id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition shadow-sm"
                                title="Ver / Imprimir Factura"
                              >
                                <FiFileText size={12} className="text-emerald-600" />
                                <span className="font-mono">{c.factura_numero || 'Facturado'}</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setFacturacionEstudiante({
                                    id_estudiante: c.estudiante_id,
                                    apellidos: c.apellidos,
                                    nombres: c.nombres,
                                    codigo: c.codigo,
                                    curso_nombre: c.curso_nombre,
                                    paralelo_nombre: c.paralelo,
                                    anio_lectivo: c.anio_lectivo
                                  });
                                  setFacturacionPagoId(c.id);
                                  setActiveTab('facturar');
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition shadow-sm"
                                title="Facturar este pago"
                              >
                                <FiPlus size={12} />
                                <span>Facturar</span>
                              </button>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-gray-500 max-w-[140px] truncate">{c.nota || '-'}</td>
                          <td className="px-3 py-2.5">
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => { setReciboData(c); setShowRecibo(true); }}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-[#27A9E1] hover:bg-blue-50 transition"
                                title="Imprimir recibo"
                              >
                                <FiPrinter size={14} />
                              </button>
                              {!c.anulado && (
                                <button
                                  onClick={() => handleAnular(c)}
                                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition"
                                  title="Anular pago"
                                >
                                  <FiXCircle size={14} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* DERECHA: Totales por Día (1/3) */}
            <div className="xl:col-span-1 space-y-5">
              <div className="bg-gradient-to-b from-[#0f172a] to-[#1e293b] rounded-2xl p-5 shadow-xl text-white sticky top-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2">
                    <FiBarChart2 size={15} className="text-[#F4C542]" /> Totales por Día
                  </h2>
                  <button onClick={cargarTotales} className="text-slate-400 hover:text-white transition p-1 rounded-lg hover:bg-white/10">
                    <FiRefreshCw size={14} className={loadingTotales ? 'animate-spin' : ''} />
                  </button>
                </div>

                <div className="mb-4">
                  <label className="text-xs text-slate-400 block mb-1">Corte al:</label>
                  <input
                    type="date"
                    value={fechaCorte}
                    onChange={e => setFechaCorte(e.target.value)}
                    className="w-full bg-white/10 border border-white/20 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#27A9E1]/40"
                  />
                </div>

                {totalesDia ? (
                  <div className="space-y-2">
                    {Object.entries(totalesDia.totales || {}).map(([label, valor]) => (
                      <div key={label} className="flex items-center justify-between py-2 border-b border-white/10 last:border-0">
                        <span className="text-xs text-slate-300">{label}</span>
                        <span className={`font-mono font-bold text-sm ${valor > 0 ? 'text-[#F4C542]' : 'text-slate-500'}`}>
                          {fmt$(valor)}
                        </span>
                      </div>
                    ))}

                    <div className="pt-3 mt-1 border-t-2 border-[#27A9E1]/40 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white uppercase tracking-wider">TOTAL COBRADO</span>
                        <span className="font-mono font-bold text-base text-[#27A9E1]">{fmt$(totalesDia.total_diario || 0)}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                          <FiCheckCircle size={12} /> TOTAL FACTURADO
                        </span>
                        <span className="font-mono font-bold text-base text-emerald-400">
                          {fmt$(totalesDia.total_facturado || 0)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-white/10">
                        <span className="text-xs text-amber-300 uppercase tracking-wider">Pendiente Facturar</span>
                        <span className={`font-mono font-bold text-sm ${(totalesDia.diferencia_facturacion || 0) > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                          {fmt$(totalesDia.diferencia_facturacion || 0)}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => setShowCierreModal(true)}
                      className="w-full mt-3 py-2 px-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-xs font-semibold text-white transition flex items-center justify-center gap-2"
                    >
                      <FiFileText size={14} className="text-[#F4C542]" />
                      <span>Ver Cierre y Arqueo Diario</span>
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-6 text-slate-400 text-sm">Sin datos para esta fecha.</div>
                )}
              </div>

              {/* Accesos rápidos */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-2">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Accesos rápidos</h3>
                {[
                  { label: 'Facturación directa',             icon: FiFileText,    action: () => setActiveTab('facturar') },
                  { label: 'Historial de facturas emitidas',  icon: FiClock,       action: () => setActiveTab('historial') },
                  { label: 'Cierre y arqueo de facturación',   icon: FiFileText,    action: () => setShowCierreModal(true) },
                  { label: 'Estado de cuenta por estudiante', icon: FiUser,        href: '/control-financiero/pensiones/estado-cuenta' },
                  { label: 'Reporte de morosos',              icon: FiAlertCircle, href: '/control-financiero/pensiones/morosos' },
                ].map(a => (
                  a.action ? (
                    <button
                      key={a.label}
                      onClick={a.action}
                      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-blue-50 hover:text-[#27A9E1] text-gray-600 transition group text-left"
                    >
                      <a.icon size={16} className="flex-shrink-0" />
                      <span className="text-sm font-medium">{a.label}</span>
                      <FiChevronDown size={13} className="ml-auto rotate-[-90deg] text-gray-300 group-hover:text-[#27A9E1]" />
                    </button>
                  ) : (
                    <a
                      key={a.label}
                      href={a.href}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-blue-50 hover:text-[#27A9E1] text-gray-600 transition group"
                    >
                      <a.icon size={16} className="flex-shrink-0" />
                      <span className="text-sm font-medium">{a.label}</span>
                      <FiChevronDown size={13} className="ml-auto rotate-[-90deg] text-gray-300 group-hover:text-[#27A9E1]" />
                    </a>
                  )
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 2: FACTURACIÓN ─── */}
        {activeTab === 'facturar' && (
          <div className="animate-fade-in">
            <FacturacionPanel
              estudianteInicial={facturacionEstudiante}
              pagoIdInicial={facturacionPagoId}
              onFacturaEmitida={async (nuevaFactura) => {
                await cargarCobros();
                await cargarTotales();
                if (estudiante) {
                  await cargarCuota(estudiante, mes);
                }
              }}
            />
          </div>
        )}

        {/* ─── TAB 3: HISTORIAL DE FACTURAS ─── */}
        {activeTab === 'historial' && (
          <div className="animate-fade-in">
            <FacturasHistorialTab />
          </div>
        )}

      </div>

      {/* Modal de Recibo Simple */}
      {showRecibo && reciboData && (
        <ReciboModal data={reciboData} onClose={() => setShowRecibo(false)} />
      )}

      {/* Modal de Factura Electrónica (A4 y Ticket 80mm) */}
      {verFacturaId && (
        <FacturaModal
          facturaId={verFacturaId}
          onClose={() => setVerFacturaId(null)}
        />
      )}

      {/* Modal de Configuración Emisor */}
      <ConfiguracionFacturacionModal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
      />

      {/* Modal de Cierre y Arqueo Diario */}
      <CierreFacturacionModal
        isOpen={showCierreModal}
        onClose={() => setShowCierreModal(false)}
        fechaInicial={fechaCorte}
        onFacturarPago={(p) => {
          setFacturacionEstudiante({
            id_estudiante: p.id_estudiante,
            apellidos: p.apellidos,
            nombres: p.nombres,
            codigo: p.codigo,
            curso_nombre: p.curso_nombre,
            paralelo_nombre: p.paralelo,
            anio_lectivo: p.anio_lectivo
          });
          setFacturacionPagoId(p.pago_id);
          setActiveTab('facturar');
        }}
      />
    </MainLayout>
  );
}

// ─────────────────────────────────────────────────────────────
// COMPONENTE: ReciboModal
// ─────────────────────────────────────────────────────────────
function ReciboModal({ data, onClose }) {
  const est = data.estudiante || data;
  const mesLabel = (mesStr) => {
    if (!mesStr) return '';
    const [y, m] = mesStr.split('-');
    const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    return `${meses[parseInt(m, 10) - 1]} ${y}`;
  };
  const fmt$ = (n) => `$ ${(parseFloat(n)||0).toLocaleString('es-EC',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
  const fmtFecha = (d) => { if(!d) return '-'; return new Date(d+'T12:00:00').toLocaleDateString('es-EC',{day:'2-digit',month:'2-digit',year:'numeric'}); };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="bg-[#0f172a] px-6 py-4 flex items-center justify-between">
          <h3 className="text-white font-bold flex items-center gap-2">
            <FiPrinter size={18} className="text-[#27A9E1]" /> Recibo de Pago
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition"><FiXCircle size={20} /></button>
        </div>

        <div id="recibo-print" className="p-6 space-y-4">
          <div className="text-center border-b pb-4">
            <h2 className="font-bold text-xl text-gray-900">Unidad Educativa Juan Leon Mera</h2>
            <p className="text-gray-500 text-sm">Sistema SIGCOP-KPI</p>
            <div className="mt-3 inline-block bg-[#27A9E1]/10 border border-[#27A9E1]/30 rounded-xl px-4 py-1.5">
              <span className="font-mono font-bold text-[#27A9E1] text-lg">
                Recibo N {String(data.numero_recibo || data.id || 0).padStart(5, '0')}
              </span>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            {[
              { label: 'Fecha de pago', value: fmtFecha(data.fecha_pago) },
              { label: 'Estudiante',    value: `${est.apellidos || ''} ${est.nombres || ''}`.trim() },
              { label: 'Codigo',        value: est.codigo || '-' },
              { label: 'Grado/Curso',   value: est.curso_nombre || '-' },
              { label: 'Paralelo',      value: est.paralelo_nombre || est.paralelo || '-' },
              { label: 'Concepto',      value: `Pension ${mesLabel(data.mes)}` },
              { label: 'Ano lectivo',   value: data.anio_lectivo || '-' },
              { label: 'Nota',          value: data.nota || '-' },
            ].map(f => (
              <div key={f.label} className="flex justify-between border-b border-gray-100 pb-1.5">
                <span className="text-gray-500 font-medium">{f.label}:</span>
                <span className="font-semibold text-gray-900">{f.value}</span>
              </div>
            ))}
          </div>

          <div className="bg-gradient-to-r from-[#27A9E1]/10 to-[#27A9E1]/5 rounded-xl p-4 flex items-center justify-between border border-[#27A9E1]/20">
            <span className="font-bold text-gray-700 text-lg">VALOR COBRADO</span>
            <span className="font-mono font-black text-2xl text-[#27A9E1]">{fmt$(data.monto || 0)}</span>
          </div>

          <p className="text-center text-xs text-gray-400 italic">
            Comprobante generado por el Sistema SIGCOP-KPI. Conservelo como comprobante oficial.
          </p>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-100 text-sm font-medium transition">
            Cerrar
          </button>
          <button onClick={() => window.print()}
            className="px-5 py-2 rounded-xl bg-[#27A9E1] text-white font-bold text-sm hover:bg-blue-600 transition flex items-center gap-2 shadow-md shadow-blue-500/20"
          >
            <FiPrinter size={16} /> Imprimir Recibo
          </button>
        </div>
      </div>

      <style>{`
        @media print {
          body > * { display: none !important; }
          #recibo-print { display: block !important; }
        }
      `}</style>
    </div>
  );
}
