import React, { useState, useEffect, useCallback } from 'react';
import MainLayout from '../../components/layout/MainLayout';
import { FiSearch, FiUser, FiRefreshCw, FiAlertCircle, FiCheckCircle, FiClock } from 'react-icons/fi';
import { buscarEstudiantesParaPension, getCuotasEstudiante } from '../../services/cobrarPensionesService';
import Swal from 'sweetalert2';

const fmt$ = (n) => {
  const num = parseFloat(n) || 0;
  return `$ ${num.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
const mesLabel = (mesStr) => {
  if (!mesStr) return '';
  const [y, m] = mesStr.split('-');
  const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  return `${meses[parseInt(m, 10) - 1]} ${y}`;
};
const anioActual = () => {
  const y = new Date().getFullYear();
  const m = new Date().getMonth() + 1;
  return m >= 5 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
};

const EstadoBadge = ({ estado }) => {
  const styles = {
    PAGADO:    { cls: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: <FiCheckCircle size={12} /> },
    PARCIAL:   { cls: 'bg-amber-100 text-amber-700 border-amber-200',       icon: <FiClock size={12} /> },
    PENDIENTE: { cls: 'bg-red-100 text-red-700 border-red-200',             icon: <FiAlertCircle size={12} /> },
  };
  const s = styles[estado] || { cls: 'bg-gray-100 text-gray-600 border-gray-200', icon: null };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${s.cls}`}>
      {s.icon} {estado}
    </span>
  );
};

export default function EstadoCuentaPage() {
  const anio_lectivo = anioActual();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [estudiante, setEstudiante] = useState(null);
  const [cuotas, setCuotas] = useState([]);
  const [deudaTotal, setDeudaTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (searchTerm.length < 2) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await buscarEstudiantesParaPension(searchTerm, anio_lectivo);
        if (res.success) setSearchResults(res.estudiantes);
      } catch { /* silent */ }
      setIsSearching(false);
    }, 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const handleSelectEstudiante = async (est) => {
    setEstudiante(est);
    setSearchTerm('');
    setSearchResults([]);
    setLoading(true);
    try {
      const res = await getCuotasEstudiante(est.id_estudiante, anio_lectivo);
      if (res.success) {
        setCuotas(res.cuotas);
        setDeudaTotal(res.deuda_total);
      }
    } catch {
      Swal.fire('Error', 'No se pudo cargar el estado de cuenta.', 'error');
    }
    setLoading(false);
  };

  const totalPension = cuotas.reduce((a, c) => a + parseFloat(c.valor_pension || 0), 0);
  const totalPagado  = cuotas.reduce((a, c) => a + parseFloat(c.total_pagado || 0), 0);

  return (
    <MainLayout>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FiUser className="text-[#27A9E1]" size={24} />
            Estado de Cuenta — Pensiones
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Año lectivo: <span className="font-semibold">{anio_lectivo}</span></p>
        </div>

        {/* Búsqueda */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <label className="block text-sm font-medium text-gray-700 mb-2">Buscar estudiante</label>
          <div className="relative max-w-md">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Código, apellidos o nombres..."
              className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#27A9E1]/30 focus:border-[#27A9E1]"
            />
            {isSearching && <FiRefreshCw className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" size={15} />}
            {searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto">
                {searchResults.map(est => (
                  <button
                    key={est.id_estudiante}
                    onClick={() => handleSelectEstudiante(est)}
                    className="w-full text-left px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-blue-50 transition flex flex-col"
                  >
                    <span className="font-semibold text-gray-900 text-sm">{est.apellidos}, {est.nombres}</span>
                    <span className="text-xs text-gray-500">Código: {est.codigo} · {est.curso_nombre} "{est.paralelo}"</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Estado de cuenta */}
        {estudiante && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Ficha estudiante */}
            <div className="bg-[#0f172a] px-6 py-4 text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#27A9E1]/20 rounded-full flex items-center justify-center">
                  <FiUser size={18} className="text-[#27A9E1]" />
                </div>
                <div>
                  <p className="font-bold text-lg">{estudiante.apellidos}, {estudiante.nombres}</p>
                  <p className="text-sm text-slate-400">{estudiante.codigo} · {estudiante.curso_nombre} "{estudiante.paralelo}"</p>
                </div>
              </div>
              {/* KPI row */}
              <div className="mt-4 grid grid-cols-3 gap-3">
                {[
                  { label: 'Total Pensión', value: fmt$(totalPension), color: 'text-white' },
                  { label: 'Total Pagado',  value: fmt$(totalPagado),  color: 'text-emerald-400' },
                  { label: 'Deuda Total',   value: fmt$(deudaTotal),   color: deudaTotal > 0 ? 'text-red-400' : 'text-emerald-400' },
                ].map(k => (
                  <div key={k.label} className="bg-white/5 rounded-xl p-3 text-center">
                    <p className="text-xs text-slate-400">{k.label}</p>
                    <p className={`font-mono font-bold text-base ${k.color}`}>{k.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Tabla de cuotas */}
            <div className="overflow-x-auto">
              {loading ? (
                <div className="flex items-center justify-center py-12 text-gray-400 gap-3">
                  <FiRefreshCw className="animate-spin" /> Cargando...
                </div>
              ) : cuotas.length === 0 ? (
                <div className="text-center py-12 text-gray-400">No hay cuotas registradas para este año lectivo.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider border-b">
                      {['Mes','Valor Pensión','Total Pagado','Saldo','Estado'].map(h => (
                        <th key={h} className="px-6 py-3 text-left font-semibold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {cuotas.map(c => (
                      <tr key={c.id} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-3 font-medium text-gray-800">{mesLabel(c.mes)}</td>
                        <td className="px-6 py-3 font-mono text-gray-700">{fmt$(c.valor_pension)}</td>
                        <td className="px-6 py-3 font-mono font-semibold text-emerald-700">{fmt$(c.total_pagado)}</td>
                        <td className="px-6 py-3 font-mono font-bold">
                          <span className={parseFloat(c.saldo) <= 0 ? 'text-emerald-600' : 'text-red-600'}>
                            {fmt$(c.saldo)}
                          </span>
                        </td>
                        <td className="px-6 py-3"><EstadoBadge estado={c.estado} /></td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 font-bold border-t-2 border-gray-200">
                      <td className="px-6 py-3 text-gray-700">TOTAL</td>
                      <td className="px-6 py-3 font-mono">{fmt$(totalPension)}</td>
                      <td className="px-6 py-3 font-mono text-emerald-700">{fmt$(totalPagado)}</td>
                      <td className="px-6 py-3 font-mono text-red-600">{fmt$(deudaTotal)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
