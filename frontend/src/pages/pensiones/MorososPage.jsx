import React, { useState, useEffect, useCallback } from 'react';
import MainLayout from '../../components/layout/MainLayout';
import { FiAlertCircle, FiSearch, FiRefreshCw, FiFilter } from 'react-icons/fi';
import { getMorosos } from '../../services/cobrarPensionesService';

const fmt$ = (n) => {
  const num = parseFloat(n) || 0;
  return `$ ${num.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
const mesLabel = (mesStr) => {
  if (!mesStr) return '';
  const [y, m] = mesStr.split('-');
  const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  return `${meses[parseInt(m, 10) - 1]} ${y}`;
};
const anioActual = () => {
  const y = new Date().getFullYear();
  const m = new Date().getMonth() + 1;
  return m >= 5 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
};
const mesActual = () => new Date().toISOString().slice(0, 7);

export default function MorososPage() {
  const anio_lectivo = anioActual();
  const [filtros, setFiltros] = useState({
    mes:          mesActual(),
    anio_lectivo,
    nivel:        '',
    paralelo:     '',
  });
  const [morosos, setMorosos]   = useState([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const params = Object.fromEntries(Object.entries(filtros).filter(([, v]) => v));
      const res = await getMorosos({ ...params, limit: 200 });
      if (res.success) {
        setMorosos(res.morosos);
        setTotal(res.total);
      }
    } catch { /* silent */ }
    setLoading(false);
  }, [filtros]);

  useEffect(() => { cargar(); }, [cargar]);

  const totalSaldo = morosos.reduce((a, m) => a + parseFloat(m.saldo || 0), 0);

  return (
    <MainLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FiAlertCircle className="text-red-500" size={24} />
              Reporte de Morosos
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">Año lectivo: <span className="font-semibold">{anio_lectivo}</span></p>
          </div>
          <button
            onClick={cargar}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-[#27A9E1] text-white rounded-xl text-sm font-medium hover:bg-blue-600 transition shadow-sm"
          >
            <FiRefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Actualizar
          </button>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Mes</label>
              <input
                type="month"
                value={filtros.mes}
                onChange={e => setFiltros(p => ({ ...p, mes: e.target.value }))}
                className="border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#27A9E1]/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Nivel</label>
              <select
                value={filtros.nivel}
                onChange={e => setFiltros(p => ({ ...p, nivel: e.target.value }))}
                className="border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#27A9E1]/30 min-w-[140px]"
              >
                <option value="">Todos</option>
                {['Inicial','EGB','Bachillerato'].map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Paralelo</label>
              <input
                type="text"
                value={filtros.paralelo}
                onChange={e => setFiltros(p => ({ ...p, paralelo: e.target.value }))}
                placeholder="A, B, C..."
                className="border border-gray-300 rounded-xl px-3 py-2 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-[#27A9E1]/30"
              />
            </div>
          </div>
        </div>

        {/* Resumen */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total morosos',  value: total,                       color: 'text-red-600',     fmt: String },
            { label: 'Deuda total',    value: fmt$(totalSaldo),             color: 'text-red-600',     fmt: String },
            { label: 'Cuotas vencidas',value: morosos.filter(m => m.estado === 'PENDIENTE').length, color: 'text-amber-600', fmt: String },
          ].map(k => (
            <div key={k.label} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 text-center">
              <p className="text-xs text-gray-500 uppercase tracking-wider">{k.label}</p>
              <p className={`font-bold text-2xl mt-1 ${k.color}`}>{k.fmt(k.value)}</p>
            </div>
          ))}
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center py-16 text-gray-400 gap-3">
                <FiRefreshCw className="animate-spin" /> Cargando...
              </div>
            ) : morosos.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <FiAlertCircle size={40} className="mx-auto mb-3 text-gray-300" />
                <p>No se encontraron morosos con los filtros seleccionados.</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider border-b">
                    {['Código','Apellidos y Nombres','Grado/Curso','Par.','Mes','Val. Pensión','Pagado','Saldo','Estado'].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-semibold whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {morosos.map((m, idx) => (
                    <tr key={idx} className="hover:bg-red-50/30 transition">
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{m.codigo}</td>
                      <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{m.apellidos}, {m.nombres}</td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{m.curso_nombre}</td>
                      <td className="px-4 py-3 text-center font-bold">{m.paralelo}</td>
                      <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{mesLabel(m.mes)}</td>
                      <td className="px-4 py-3 font-mono text-gray-700">{fmt$(m.valor_pension)}</td>
                      <td className="px-4 py-3 font-mono text-emerald-700">{fmt$(m.total_pagado)}</td>
                      <td className="px-4 py-3 font-mono font-bold text-red-600">{fmt$(m.saldo)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold border ${
                          m.estado === 'PENDIENTE'
                            ? 'bg-red-100 text-red-700 border-red-200'
                            : 'bg-amber-100 text-amber-700 border-amber-200'
                        }`}>
                          {m.estado}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-red-50 border-t-2 border-red-200 font-bold">
                    <td colSpan="7" className="px-4 py-3 text-right text-gray-700">TOTAL ADEUDADO:</td>
                    <td className="px-4 py-3 font-mono text-red-700 text-base">{fmt$(totalSaldo)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
