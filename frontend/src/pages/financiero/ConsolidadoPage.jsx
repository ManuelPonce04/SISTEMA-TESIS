import React, { useState, useEffect } from 'react';
import consolidadoService from '../../services/consolidadoService';
import movimientosFinancierosService from '../../services/movimientosFinancierosService';
import { FiFilter, FiDownload, FiBarChart2, FiList, FiDollarSign, FiTool, FiPrinter } from 'react-icons/fi';
import MainLayout from '../../components/layout/MainLayout';

// ── Export Helpers (sin dependencias externas) ─────────────────────
const exportToCSV = (mensual, resumen, filtros, periodos) => {
  if (!mensual) return;
  
  const lines = [];
  const periodoNombre = periodos.find(p => p.id == filtros.periodo_id)?.nombre || '';
  
  lines.push(`Consolidado Financiero - ${periodoNombre} - Año ${filtros.anio}`);
  lines.push(`Saldo Inicial;${resumen?.saldo_inicial?.toFixed(2) || '0.00'}`);
  lines.push(`Total Ingresos;${resumen?.ingresos?.toFixed(2) || '0.00'}`);
  lines.push(`Total Egresos;${resumen?.egresos?.toFixed(2) || '0.00'}`);
  lines.push(`Resultado;${resumen?.resultado?.toFixed(2) || '0.00'}`);
  lines.push(`Saldo Final;${resumen?.saldo_final?.toFixed(2) || '0.00'}`);
  lines.push('');

  // Header row
  const headerCols = ['Categoría / Concepto', ...mensual.meses.map(m => formatMes(m)), 'Total General'];
  lines.push(headerCols.join(';'));

  // INGRESOS
  lines.push('INGRESOS');
  mensual.matriz.INGRESO.forEach(cat => {
    const catRow = [cat.nombre, ...mensual.meses.map(m => (cat.totalesMes[m] || 0).toFixed(2)), cat.totalGeneral.toFixed(2)];
    lines.push(catRow.join(';'));
    cat.conceptos.forEach(c => {
      const cRow = [`  ${c.nombre}`, ...mensual.meses.map(m => (c.meses[m] || 0).toFixed(2)), c.totalConcepto.toFixed(2)];
      lines.push(cRow.join(';'));
    });
  });

  const totIngRow = ['TOTAL INGRESOS', ...mensual.meses.map(m => (mensual.ingresosPorMes[m] || 0).toFixed(2)), resumen?.ingresos?.toFixed(2) || ''];
  lines.push(totIngRow.join(';'));
  lines.push('');

  // EGRESOS
  lines.push('EGRESOS');
  mensual.matriz.EGRESO.forEach(cat => {
    const catRow = [cat.nombre, ...mensual.meses.map(m => (cat.totalesMes[m] || 0).toFixed(2)), cat.totalGeneral.toFixed(2)];
    lines.push(catRow.join(';'));
    cat.conceptos.forEach(c => {
      const cRow = [`  ${c.nombre}`, ...mensual.meses.map(m => (c.meses[m] || 0).toFixed(2)), c.totalConcepto.toFixed(2)];
      lines.push(cRow.join(';'));
    });
  });

  const totEgRow = ['TOTAL EGRESOS', ...mensual.meses.map(m => (mensual.egresosPorMes[m] || 0).toFixed(2)), resumen?.egresos?.toFixed(2) || ''];
  lines.push(totEgRow.join(';'));

  // BOM para que Excel abra UTF-8 correctamente
  const bom = '\uFEFF';
  const csvContent = bom + lines.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Consolidado_${filtros.anio}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

const formatMes = (dateStr) => {
  if (!dateStr) return '';
  // Use UTC to avoid timezone offset shifting day
  const [y, m] = dateStr.split('-');
  const d = new Date(Date.UTC(parseInt(y), parseInt(m) - 1, 1));
  return d.toLocaleDateString('es-EC', { month: 'short', year: 'numeric', timeZone: 'UTC' }).toUpperCase();
};

// ── Page Component ─────────────────────────────────────────────────
const ConsolidadoPage = () => {
  const [activeTab, setActiveTab] = useState('matriz');
  const [periodos, setPeriodos] = useState([]);
  const [cuentas, setCuentas] = useState([]);
  const currentYear = new Date().getFullYear();
  const [filtros, setFiltros] = useState({
    periodo_id: '',
    cuenta_id: '',
    anio: currentYear.toString(),
    mes_desde: '01',
    mes_hasta: '12'
  });
  const [resumen, setResumen] = useState(null);
  const [mensual, setMensual] = useState(null);
  const [saldosCuentas, setSaldosCuentas] = useState([]);
  const [mejoras, setMejoras] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => { loadDependencies(); }, []);

  useEffect(() => {
    if (filtros.periodo_id) fetchData();
  }, [filtros, activeTab]);

  const loadDependencies = async () => {
    try {
      const [resP, resC] = await Promise.all([
        movimientosFinancierosService.getPeriodos(),
        movimientosFinancierosService.getCuentasActivas()
      ]);
      if (resP.success) {
        setPeriodos(resP.data);
        const activo = resP.data.find(p => p.activo);
        if (activo) setFiltros(f => ({ ...f, periodo_id: activo.id }));
      }
      if (resC.success) setCuentas(resC.data);
    } catch (e) {
      console.error('Error cargando dependencias:', e);
      setError('Error al cargar los filtros. Verifica la conexión al servidor.');
    }
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const resG = await consolidadoService.getResumenGeneral(filtros);
      if (resG.success) setResumen(resG.data);

      if (activeTab === 'matriz') {
        const resM = await consolidadoService.getConsolidadoMensual(filtros);
        if (resM.success) setMensual(resM.data);
        else setMensual(null);
      } else if (activeTab === 'cuentas') {
        const resC = await consolidadoService.getSaldosCuentas(filtros);
        if (resC.success) setSaldosCuentas(resC.data);
      } else if (activeTab === 'mejoras') {
        const resMej = await consolidadoService.getMejorasPlantel(filtros);
        if (resMej.success) setMejoras(resMej.data);
      }
    } catch (err) {
      console.error('Error cargando consolidado:', err);
      setError('Error al cargar los datos del consolidado.');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFiltros(prev => ({ ...prev, [name]: value }));
  };

  const monthsList = [
    {val:'01',name:'ENERO'},{val:'02',name:'FEBRERO'},{val:'03',name:'MARZO'},{val:'04',name:'ABRIL'},
    {val:'05',name:'MAYO'},{val:'06',name:'JUNIO'},{val:'07',name:'JULIO'},{val:'08',name:'AGOSTO'},
    {val:'09',name:'SEPTIEMBRE'},{val:'10',name:'OCTUBRE'},{val:'11',name:'NOVIEMBRE'},{val:'12',name:'DICIEMBRE'}
  ];

  const handleExportCSV = () => exportToCSV(mensual, resumen, filtros, periodos);
  const handlePrint = () => window.print();

  // ── Renders ──────────────────────────────────────────────────────

  const renderMatriz = () => {
    if (!mensual) return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center text-gray-400">
        No hay movimientos financieros para el rango seleccionado.
      </div>
    );
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px] text-sm">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-200">
                <th className="px-4 py-3 font-bold text-gray-700 min-w-[250px] sticky left-0 bg-gray-100 z-10 border-r border-gray-200">Categoría / Concepto</th>
                {mensual.meses.map(m => (
                  <th key={m} className="px-4 py-3 font-bold text-gray-700 text-right min-w-[100px]">{formatMes(m)}</th>
                ))}
                <th className="px-4 py-3 font-bold text-gray-800 text-right bg-blue-50/50 min-w-[120px]">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">

              {/* INGRESOS */}
              <tr className="bg-green-50">
                <td colSpan={mensual.meses.length + 2} className="px-4 py-2 font-bold text-green-800 sticky left-0 text-xs uppercase tracking-widest">▼ INGRESOS</td>
              </tr>
              {mensual.matriz.INGRESO.map(cat => (
                <React.Fragment key={cat.id}>
                  <tr className="bg-gray-50/70">
                    <td className="px-4 py-2 font-semibold text-gray-700 pl-6 sticky left-0 bg-gray-50 border-r border-gray-200">▪ {cat.nombre}</td>
                    {mensual.meses.map(m => (
                      <td key={m} className="px-4 py-2 text-right font-semibold text-gray-600">${parseFloat(cat.totalesMes[m] || 0).toFixed(2)}</td>
                    ))}
                    <td className="px-4 py-2 text-right font-semibold text-gray-800 bg-blue-50/20">${parseFloat(cat.totalGeneral).toFixed(2)}</td>
                  </tr>
                  {cat.conceptos.map(c => (
                    <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-2 text-gray-500 pl-10 sticky left-0 bg-white border-r border-gray-100 text-xs">{c.nombre}</td>
                      {mensual.meses.map(m => (
                        <td key={m} className="px-4 py-2 text-right font-mono text-gray-400 text-xs">${parseFloat(c.meses[m] || 0).toFixed(2)}</td>
                      ))}
                      <td className="px-4 py-2 text-right font-mono text-gray-600 text-xs bg-blue-50/10">${parseFloat(c.totalConcepto).toFixed(2)}</td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}

              <tr className="bg-green-100 border-t-2 border-green-200">
                <td className="px-4 py-3 font-bold text-green-900 sticky left-0 bg-green-100 border-r border-green-200 text-xs uppercase tracking-wide">TOTAL INGRESOS</td>
                {mensual.meses.map(m => (
                  <td key={m} className="px-4 py-3 text-right font-bold text-green-900">${parseFloat(mensual.ingresosPorMes[m] || 0).toFixed(2)}</td>
                ))}
                <td className="px-4 py-3 text-right font-bold text-green-900 bg-green-200/50">${resumen?.ingresos?.toFixed(2) || '0.00'}</td>
              </tr>

              {/* EGRESOS */}
              <tr className="bg-red-50">
                <td colSpan={mensual.meses.length + 2} className="px-4 py-2 font-bold text-red-800 sticky left-0 text-xs uppercase tracking-widest">▼ EGRESOS</td>
              </tr>
              {mensual.matriz.EGRESO.map(cat => (
                <React.Fragment key={cat.id}>
                  <tr className="bg-gray-50/70">
                    <td className="px-4 py-2 font-semibold text-gray-700 pl-6 sticky left-0 bg-gray-50 border-r border-gray-200">▪ {cat.nombre}</td>
                    {mensual.meses.map(m => (
                      <td key={m} className="px-4 py-2 text-right font-semibold text-gray-600">${parseFloat(cat.totalesMes[m] || 0).toFixed(2)}</td>
                    ))}
                    <td className="px-4 py-2 text-right font-semibold text-gray-800 bg-blue-50/20">${parseFloat(cat.totalGeneral).toFixed(2)}</td>
                  </tr>
                  {cat.conceptos.map(c => (
                    <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-2 text-gray-500 pl-10 sticky left-0 bg-white border-r border-gray-100 text-xs">{c.nombre}</td>
                      {mensual.meses.map(m => (
                        <td key={m} className="px-4 py-2 text-right font-mono text-gray-400 text-xs">${parseFloat(c.meses[m] || 0).toFixed(2)}</td>
                      ))}
                      <td className="px-4 py-2 text-right font-mono text-gray-600 text-xs bg-blue-50/10">${parseFloat(c.totalConcepto).toFixed(2)}</td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}

              <tr className="bg-red-100 border-t-2 border-red-200">
                <td className="px-4 py-3 font-bold text-red-900 sticky left-0 bg-red-100 border-r border-red-200 text-xs uppercase tracking-wide">TOTAL EGRESOS</td>
                {mensual.meses.map(m => (
                  <td key={m} className="px-4 py-3 text-right font-bold text-red-900">${parseFloat(mensual.egresosPorMes[m] || 0).toFixed(2)}</td>
                ))}
                <td className="px-4 py-3 text-right font-bold text-red-900 bg-red-200/50">${resumen?.egresos?.toFixed(2) || '0.00'}</td>
              </tr>

              {/* RESULTADO */}
              <tr className="bg-[#27A9E1] text-white border-t-2 border-blue-400">
                <td className="px-4 py-3 font-bold sticky left-0 bg-[#27A9E1] border-r border-blue-400 text-xs uppercase tracking-wide">RESULTADO MENSUAL</td>
                {mensual.meses.map(m => {
                  const resMes = parseFloat(mensual.ingresosPorMes[m] || 0) - parseFloat(mensual.egresosPorMes[m] || 0);
                  return <td key={m} className={`px-4 py-3 text-right font-bold ${resMes < 0 ? 'text-red-200' : 'text-white'}`}>${resMes.toFixed(2)}</td>;
                })}
                <td className={`px-4 py-3 text-right font-bold bg-blue-600 ${(resumen?.resultado || 0) < 0 ? 'text-red-200' : ''}`}>${resumen?.resultado?.toFixed(2) || '0.00'}</td>
              </tr>

              <tr className="bg-gray-800 text-white">
                <td className="px-4 py-3 font-bold sticky left-0 bg-gray-800 border-r border-gray-600 text-xs uppercase tracking-wide">SALDO ACUMULADO FIN MES</td>
                {(() => {
                  let acum = parseFloat(resumen?.saldo_inicial || 0);
                  return mensual.meses.map(m => {
                    acum += parseFloat(mensual.ingresosPorMes[m] || 0) - parseFloat(mensual.egresosPorMes[m] || 0);
                    return <td key={m} className={`px-4 py-3 text-right font-bold font-mono ${acum < 0 ? 'text-red-300' : ''}`}>${acum.toFixed(2)}</td>;
                  });
                })()}
                <td className="px-4 py-3 text-right font-bold font-mono bg-black/30">${resumen?.saldo_final?.toFixed(2) || '0.00'}</td>
              </tr>

            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderCuentas = () => (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <table className="w-full text-left border-collapse text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500">
            <th className="px-4 py-3 font-medium">Cuenta Financiera</th>
            <th className="px-4 py-3 font-medium text-right">Saldo Inicial</th>
            <th className="px-4 py-3 font-medium text-right text-green-600">Ingresos</th>
            <th className="px-4 py-3 font-medium text-right text-red-500">Egresos</th>
            <th className="px-4 py-3 font-medium text-right">Saldo Final</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {saldosCuentas.length === 0 && (
            <tr><td colSpan="5" className="p-8 text-center text-gray-400">No hay cuentas con movimientos.</td></tr>
          )}
          {saldosCuentas.map(c => (
            <tr key={c.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3 font-medium text-gray-800">{c.nombre}<br/><span className="text-xs text-gray-400">{c.tipo}</span></td>
              <td className="px-4 py-3 text-right font-mono text-gray-600">${parseFloat(c.saldo_inicial || 0).toFixed(2)}</td>
              <td className="px-4 py-3 text-right font-mono text-green-600">${parseFloat(c.total_ingresos || 0).toFixed(2)}</td>
              <td className="px-4 py-3 text-right font-mono text-red-500">${parseFloat(c.total_egresos || 0).toFixed(2)}</td>
              <td className={`px-4 py-3 text-right font-mono font-bold ${parseFloat(c.saldo_final) < 0 ? 'text-red-600' : 'text-blue-600'}`}>${parseFloat(c.saldo_final || 0).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderMejoras = () => (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <table className="w-full text-left border-collapse text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500">
            <th className="px-4 py-3 font-medium">Fecha</th>
            <th className="px-4 py-3 font-medium">Concepto</th>
            <th className="px-4 py-3 font-medium">Descripción</th>
            <th className="px-4 py-3 font-medium">Cuenta</th>
            <th className="px-4 py-3 font-medium text-right">Valor</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {mejoras.length === 0 && (
            <tr><td colSpan="5" className="p-8 text-center text-gray-400">No hay mejoras del plantel en el período seleccionado.</td></tr>
          )}
          {mejoras.map(m => (
            <tr key={m.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3 text-gray-600">{new Date(m.fecha + 'T00:00:00').toLocaleDateString('es-EC')}</td>
              <td className="px-4 py-3 font-medium text-gray-800">{m.concepto}</td>
              <td className="px-4 py-3 text-gray-500 text-xs">{m.descripcion}</td>
              <td className="px-4 py-3 text-gray-500 text-xs">{m.cuenta}</td>
              <td className="px-4 py-3 text-right font-mono font-bold text-gray-800">${parseFloat(m.valor).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // ── Render Principal ───────────────────────────────────────────

  return (
    <MainLayout title="Consolidado Financiero" subtitle="Inicio / Control Financiero / Consolidado">
    <div className="p-6 max-w-[1600px] mx-auto">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Consolidado Financiero</h1>
          <p className="text-sm text-gray-500">Analítica global de ingresos, egresos y saldos institucionales.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 text-sm flex items-center gap-2 transition-colors"
          >
            <FiPrinter size={15} /> Imprimir / PDF
          </button>
          <button
            onClick={handleExportCSV}
            disabled={!mensual}
            className="px-4 py-2 bg-green-600 text-white rounded-xl shadow hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed text-sm flex items-center gap-2 transition-colors"
          >
            <FiDownload size={15} /> Exportar CSV
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>
      )}

      {/* Filtros */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6 flex flex-wrap gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Período</label>
          <select name="periodo_id" value={filtros.periodo_id} onChange={handleFilterChange} className="px-3 py-2 border border-gray-200 rounded-xl text-sm min-w-[200px] focus:outline-none focus:ring-2 focus:ring-blue-300">
            <option value="">Seleccionar período...</option>
            {periodos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Año</label>
          <select name="anio" value={filtros.anio} onChange={handleFilterChange} className="px-3 py-2 border border-gray-200 rounded-xl text-sm w-24 focus:outline-none focus:ring-2 focus:ring-blue-300">
            {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Mes desde</label>
          <select name="mes_desde" value={filtros.mes_desde} onChange={handleFilterChange} className="px-3 py-2 border border-gray-200 rounded-xl text-sm min-w-[140px] focus:outline-none focus:ring-2 focus:ring-blue-300">
            {monthsList.map(m => <option key={m.val} value={m.val}>{m.name}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Mes hasta</label>
          <select name="mes_hasta" value={filtros.mes_hasta} onChange={handleFilterChange} className="px-3 py-2 border border-gray-200 rounded-xl text-sm min-w-[140px] focus:outline-none focus:ring-2 focus:ring-blue-300">
            {monthsList.map(m => <option key={m.val} value={m.val}>{m.name}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Cuenta</label>
          <select name="cuenta_id" value={filtros.cuenta_id} onChange={handleFilterChange} className="px-3 py-2 border border-gray-200 rounded-xl text-sm min-w-[180px] focus:outline-none focus:ring-2 focus:ring-blue-300">
            <option value="">Todas las cuentas</option>
            {cuentas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </div>
      </div>

      {/* Tarjetas Resumen */}
      {resumen && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Saldo Inicial</p>
            <p className="text-xl font-bold font-mono text-gray-800 mt-1">${resumen.saldo_inicial.toFixed(2)}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-2xl shadow-sm border border-green-100">
            <p className="text-[11px] font-bold text-green-700 uppercase tracking-wider">Total Ingresos</p>
            <p className="text-xl font-bold font-mono text-green-700 mt-1">${resumen.ingresos.toFixed(2)}</p>
          </div>
          <div className="bg-red-50 p-4 rounded-2xl shadow-sm border border-red-100">
            <p className="text-[11px] font-bold text-red-700 uppercase tracking-wider">Total Egresos</p>
            <p className="text-xl font-bold font-mono text-red-700 mt-1">${resumen.egresos.toFixed(2)}</p>
          </div>
          <div className={`p-4 rounded-2xl shadow-sm border ${resumen.resultado >= 0 ? 'bg-blue-50 border-blue-100' : 'bg-red-50 border-red-200'}`}>
            <p className={`text-[11px] font-bold uppercase tracking-wider ${resumen.resultado >= 0 ? 'text-blue-700' : 'text-red-700'}`}>Resultado</p>
            <p className={`text-xl font-bold font-mono mt-1 ${resumen.resultado >= 0 ? 'text-blue-700' : 'text-red-700'}`}>${resumen.resultado.toFixed(2)}</p>
          </div>
          <div className="bg-gray-800 p-4 rounded-2xl shadow-lg border border-gray-700 text-white">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Saldo Final</p>
            <p className={`text-xl font-bold font-mono mt-1 ${resumen.saldo_final < 0 ? 'text-red-300' : 'text-white'}`}>${resumen.saldo_final.toFixed(2)}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        {[
          { id: 'matriz', label: 'Matriz Mensual', icon: FiBarChart2 },
          { id: 'cuentas', label: 'Saldos por Cuenta', icon: FiList },
          { id: 'mejoras', label: 'Mejoras del Plantel', icon: FiTool },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === tab.id ? 'border-[#27A9E1] text-[#27A9E1]' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon size={15} /> {tab.label}
          </button>
        ))}
      </div>

      {/* Contenido */}
      {!filtros.periodo_id ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400">
          Selecciona un período para ver el consolidado.
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center p-20">
          <div className="w-10 h-10 border-4 border-[#27A9E1]/30 border-t-[#27A9E1] rounded-full animate-spin"></div>
        </div>
      ) : (
        <>
          {activeTab === 'matriz' && renderMatriz()}
          {activeTab === 'cuentas' && renderCuentas()}
          {activeTab === 'mejoras' && renderMejoras()}
        </>
      )}

    </div>
    </MainLayout>
  );
};

export default ConsolidadoPage;
