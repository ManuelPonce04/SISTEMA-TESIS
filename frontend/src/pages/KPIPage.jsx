import React, { useState, useEffect } from 'react';
import MainLayout from '../components/layout/MainLayout';
import {
  getDashboardSummary,
  getMonthlyCollections,
  getCourseCollections,
  getTopDebtors
} from '../services/dashboardService';
import {
  FiUsers, FiDollarSign, FiTrendingUp, FiAlertCircle,
  FiTarget, FiActivity, FiBarChart2, FiCheckCircle
} from 'react-icons/fi';

const KPIPage = () => {
  const [summary, setSummary] = useState(null);
  const [monthly, setMonthly] = useState([]);
  const [byCourse, setByCourse] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [s, m, c] = await Promise.allSettled([
        getDashboardSummary(),
        getMonthlyCollections(),
        getCourseCollections(),
      ]);
      if (s.status === 'fulfilled' && s.value?.data) setSummary(s.value.data);
      if (m.status === 'fulfilled' && m.value?.data) setMonthly(m.value.data);
      if (c.status === 'fulfilled' && c.value?.data) setByCourse(c.value.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fmt = (n) => `$${parseFloat(n || 0).toFixed(2)}`;
  const pct = (part, total) => total > 0 ? Math.min(100, Math.round((part / total) * 100)) : 0;

  const cobrado = parseFloat(summary?.total_cobrado || 0);
  const pendiente = parseFloat(summary?.saldo_pendiente || 0);
  const total = cobrado + pendiente;
  const eficiencia = pct(cobrado, total);
  const mesActual = parseFloat(monthly[monthly.length - 1]?.total || 0);
  const mesAnterior = parseFloat(monthly[monthly.length - 2]?.total || 0);
  const variacion = mesAnterior > 0 ? Math.round(((mesActual - mesAnterior) / mesAnterior) * 100) : 0;
  const maxMensual = monthly.reduce((mx, r) => Math.max(mx, parseFloat(r.total || 0)), 1);

  const kpis = [
    {
      title: 'Eficiencia de Cobro',
      value: `${eficiencia}%`,
      subtitle: `${fmt(cobrado)} cobrado de ${fmt(total)}`,
      icon: FiTarget,
      color: eficiencia >= 80 ? 'text-emerald-600' : eficiencia >= 50 ? 'text-amber-500' : 'text-red-500',
      bg: eficiencia >= 80 ? 'from-emerald-500 to-teal-500' : eficiencia >= 50 ? 'from-amber-400 to-orange-500' : 'from-red-500 to-rose-600',
      barColor: eficiencia >= 80 ? 'bg-emerald-500' : eficiencia >= 50 ? 'bg-amber-400' : 'bg-red-500',
      barValue: eficiencia,
    },
    {
      title: 'Variación Mensual',
      value: `${variacion >= 0 ? '+' : ''}${variacion}%`,
      subtitle: `vs mes anterior: ${fmt(mesAnterior)}`,
      icon: FiActivity,
      color: variacion >= 0 ? 'text-[#27A9E1]' : 'text-rose-500',
      bg: variacion >= 0 ? 'from-[#27A9E1] to-blue-600' : 'from-rose-500 to-red-600',
      barColor: variacion >= 0 ? 'bg-[#27A9E1]' : 'bg-rose-500',
      barValue: Math.min(100, Math.abs(variacion)),
    },
    {
      title: 'Saldo Pendiente',
      value: fmt(pendiente),
      subtitle: `${pct(pendiente, total)}% del total facturado`,
      icon: FiAlertCircle,
      color: 'text-amber-600',
      bg: 'from-amber-400 to-orange-500',
      barColor: 'bg-amber-400',
      barValue: pct(pendiente, total),
    },
    {
      title: 'Estudiantes Activos',
      value: summary?.total_estudiantes ?? '—',
      subtitle: 'En el período actual',
      icon: FiUsers,
      color: 'text-purple-600',
      bg: 'from-purple-500 to-violet-600',
      barColor: 'bg-purple-500',
      barValue: 100,
    },
  ];

  return (
    <MainLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Indicadores KPI</h1>
          <p className="text-sm text-slate-500 mt-1">Panel de indicadores clave de desempeño — UE Juan León Mera</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          {loading ? (
            [1,2,3,4].map(i => (
              <div key={i} className="bg-white rounded-2xl border border-slate-100 p-6 animate-pulse h-36"></div>
            ))
          ) : (
            kpis.map((k, i) => {
              const Icon = k.icon;
              return (
                <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col gap-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">{k.title}</p>
                      <p className={`text-3xl font-bold ${k.color}`}>{k.value}</p>
                    </div>
                    <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${k.bg} flex items-center justify-center shadow-md`}>
                      <Icon size={20} className="text-white" />
                    </div>
                  </div>
                  <div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-1.5">
                      <div
                        className={`h-1.5 ${k.barColor} rounded-full transition-all duration-700`}
                        style={{ width: `${k.barValue}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-slate-400">{k.subtitle}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Tendencia Mensual */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-6">
              <FiBarChart2 className="text-[#27A9E1]" size={20} />
              <h2 className="font-bold text-slate-800">Tendencia de Recaudación Mensual</h2>
            </div>
            {monthly.length === 0 ? (
              <div className="text-center text-slate-400 py-10 text-sm">Sin datos de tendencia</div>
            ) : (
              <div className="flex items-end gap-2 h-40">
                {monthly.slice(-12).map((row, i) => {
                  const h = Math.max(8, (parseFloat(row.total) / maxMensual) * 100);
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                      <div className="text-[9px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity font-bold">
                        ${parseFloat(row.total || 0).toFixed(0)}
                      </div>
                      <div
                        className="w-full bg-gradient-to-t from-[#27A9E1] to-[#27A9E1]/60 rounded-t-md transition-all duration-500 hover:from-[#F4C542] hover:to-[#F4C542]/60 cursor-default"
                        style={{ height: `${h}%` }}
                        title={`${row.mes || ''}: ${fmt(row.total)}`}
                      />
                      <div className="text-[9px] text-slate-400 text-center leading-tight">{(row.mes || '').substring(0, 3)}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Por Curso */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-5">
              <FiCheckCircle className="text-emerald-500" size={18} />
              <h2 className="font-bold text-slate-800 text-sm">Por Nivel / Curso</h2>
            </div>
            {byCourse.length === 0 ? (
              <div className="text-center text-slate-400 py-10 text-sm">Sin datos</div>
            ) : (
              <div className="space-y-4">
                {byCourse.slice(0, 6).map((row, i) => {
                  const maxC = Math.max(...byCourse.map(r => parseFloat(r.total || 0)), 1);
                  const p = (parseFloat(row.total) / maxC) * 100;
                  const colores = ['bg-[#27A9E1]', 'bg-purple-500', 'bg-emerald-500', 'bg-amber-400', 'bg-rose-500', 'bg-indigo-400'];
                  return (
                    <div key={i}>
                      <div className="flex justify-between items-center text-xs mb-1">
                        <span className="text-slate-700 font-medium truncate max-w-[120px]">{row.curso || row.nombre || `Nivel ${i+1}`}</span>
                        <span className="text-slate-500 ml-2">{fmt(row.total)}</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-2 ${colores[i % colores.length]} rounded-full`} style={{ width: `${p}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Métricas Rápidas */}
        <div className="bg-gradient-to-r from-[#0f172a] to-slate-800 rounded-2xl p-6 text-white">
          <h2 className="font-bold text-lg mb-1 text-white">Resumen Ejecutivo</h2>
          <p className="text-slate-400 text-sm mb-6">UE Juan León Mera — Jaramijó, Manabí</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { label: 'Total Facturado', value: fmt(total), color: 'text-[#F4C542]' },
              { label: 'Total Cobrado', value: fmt(cobrado), color: 'text-emerald-400' },
              { label: 'Pendiente', value: fmt(pendiente), color: 'text-amber-400' },
              { label: 'Mes Actual', value: fmt(mesActual), color: 'text-[#27A9E1]' },
            ].map((m, i) => (
              <div key={i}>
                <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">{m.label}</p>
                <p className={`text-2xl font-bold font-mono ${m.color}`}>{m.value}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </MainLayout>
  );
};

export default KPIPage;
