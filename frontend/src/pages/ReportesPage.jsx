import React, { useState, useEffect } from 'react';
import MainLayout from '../components/layout/MainLayout';
import {
  getDashboardSummary,
  getMonthlyCollections,
  getCourseCollections,
  getTopDebtors
} from '../services/dashboardService';
import { FiDownload, FiUsers, FiDollarSign, FiTrendingUp, FiAlertCircle, FiFileText, FiBarChart2 } from 'react-icons/fi';

const ReportesPage = () => {
  const [summary, setSummary] = useState(null);
  const [monthly, setMonthly] = useState([]);
  const [byCourse, setByCourse] = useState([]);
  const [topDeudores, setTopDeudores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [s, m, c, d] = await Promise.allSettled([
        getDashboardSummary(),
        getMonthlyCollections(),
        getCourseCollections(),
        getTopDebtors(),
      ]);
      if (s.status === 'fulfilled' && s.value?.data) setSummary(s.value.data);
      if (m.status === 'fulfilled' && m.value?.data) setMonthly(m.value.data);
      if (c.status === 'fulfilled' && c.value?.data) setByCourse(c.value.data);
      if (d.status === 'fulfilled' && d.value?.data) setTopDeudores(d.value.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fmt = (n) => `$${parseFloat(n || 0).toFixed(2)}`;

  // Determina max para la barra
  const maxMensual = monthly.reduce((mx, r) => Math.max(mx, parseFloat(r.total || 0)), 1);
  const maxCurso = byCourse.reduce((mx, r) => Math.max(mx, parseFloat(r.total || 0)), 1);

  const reportCards = [
    { label: 'Estudiantes Activos', value: summary?.total_estudiantes ?? '—', icon: FiUsers, color: 'text-[#27A9E1]', bg: 'bg-[#27A9E1]/10' },
    { label: 'Cobrado este Mes', value: summary ? fmt(summary.cobrado_mes) : '—', icon: FiDollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Saldo por Cobrar', value: summary ? fmt(summary.saldo_pendiente) : '—', icon: FiAlertCircle, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Total Recaudado', value: summary ? fmt(summary.total_cobrado) : '—', icon: FiTrendingUp, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  return (
    <MainLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Reportes</h1>
            <p className="text-sm text-slate-500">Resumen financiero y estadísticas generales de la institución</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors shadow-sm text-sm font-medium">
            <FiDownload /> Exportar PDF
          </button>
        </div>

        {/* KPI Cards */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => (
              <div key={i} className="bg-white rounded-xl border border-slate-100 p-5 animate-pulse h-24"></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {reportCards.map((c, i) => {
              const Icon = c.icon;
              return (
                <div key={i} className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl ${c.bg} flex items-center justify-center flex-shrink-0`}>
                    <Icon size={22} className={c.color} />
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-0.5">{c.label}</div>
                    <div className="text-2xl font-bold text-slate-800">{c.value}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Recaudación Mensual */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-5">
              <FiBarChart2 className="text-[#27A9E1]" size={20} />
              <h2 className="font-bold text-slate-800">Recaudación Mensual</h2>
            </div>
            {monthly.length === 0 ? (
              <div className="text-center text-slate-400 py-10 text-sm">Sin datos disponibles</div>
            ) : (
              <div className="space-y-3">
                {monthly.slice(0, 12).map((row, i) => {
                  const pct = (parseFloat(row.total) / maxMensual) * 100;
                  return (
                    <div key={i}>
                      <div className="flex justify-between text-xs text-slate-600 mb-1">
                        <span className="font-medium">{row.mes || row.periodo || `Mes ${i+1}`}</span>
                        <span className="font-bold text-[#27A9E1]">{fmt(row.total)}</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-2 bg-[#27A9E1] rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recaudación por Curso */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-5">
              <FiFileText className="text-purple-500" size={20} />
              <h2 className="font-bold text-slate-800">Recaudación por Curso</h2>
            </div>
            {byCourse.length === 0 ? (
              <div className="text-center text-slate-400 py-10 text-sm">Sin datos disponibles</div>
            ) : (
              <div className="space-y-3">
                {byCourse.slice(0, 8).map((row, i) => {
                  const pct = (parseFloat(row.total) / maxCurso) * 100;
                  return (
                    <div key={i}>
                      <div className="flex justify-between text-xs text-slate-600 mb-1">
                        <span className="font-medium">{row.curso || row.nombre || `Curso ${i+1}`}</span>
                        <span className="font-bold text-purple-600">{fmt(row.total)}</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-2 bg-purple-400 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Top Deudores */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-5">
            <FiAlertCircle className="text-amber-500" size={20} />
            <h2 className="font-bold text-slate-800">Principales Deudores</h2>
          </div>
          {topDeudores.length === 0 ? (
            <div className="text-center text-slate-400 py-8 text-sm">No hay deudores registrados o los datos aún se están cargando.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="text-xs uppercase text-slate-400 border-b border-slate-100">
                    <th className="pb-3 pr-4">#</th>
                    <th className="pb-3 pr-4">Estudiante</th>
                    <th className="pb-3 pr-4">Representante</th>
                    <th className="pb-3 text-right">Saldo Deudor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {topDeudores.slice(0, 10).map((d, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="py-3 pr-4 text-slate-400 font-mono">{i + 1}</td>
                      <td className="py-3 pr-4 font-medium text-slate-800">{d.estudiante || d.nombre || '—'}</td>
                      <td className="py-3 pr-4 text-slate-500">{d.representante || '—'}</td>
                      <td className="py-3 text-right font-bold text-amber-600">{fmt(d.saldo || d.deuda || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </MainLayout>
  );
};

export default ReportesPage;
