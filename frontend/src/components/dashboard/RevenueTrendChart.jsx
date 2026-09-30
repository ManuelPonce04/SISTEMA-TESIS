import React, { useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import Card from '../ui/Card';

/**
 * RevenueTrendChart
 * ────────────────────────────────────────────────────────────
 * Gráfico de área con dos series:
 *  - recaudado: ingresos reales del período
 *  - meta: meta de recaudación proyectada
 *
 * Endpoint real: GET /api/dashboard/monthly-collections
 * Parámetros: { anio, curso, paralelo }
 */

const formatUSD = (v) =>
  `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-3 min-w-[160px]">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
          <span className="text-xs text-gray-500 flex-1">{p.name}</span>
          <span className="text-sm font-bold text-gray-800">{formatUSD(p.value)}</span>
        </div>
      ))}
      {payload.length === 2 && (
        <div className="mt-2 pt-2 border-t border-gray-50">
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-400">Cumplimiento</span>
            <span className={`text-xs font-bold ${
              payload[0].value >= payload[1].value ? 'text-emerald-500' : 'text-red-500'
            }`}>
              {((payload[0].value / payload[1].value) * 100).toFixed(1)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

const RANGOS = [
  { label: '6 meses', value: 6 },
  { label: '12 meses', value: 12 },
];

const RevenueTrendChart = ({ data = [] }) => {
  const [rango, setRango] = useState(12);
  const slicedData = data.slice(-rango);

  const totalRecaudado = slicedData.reduce((s, d) => s + (d.recaudado || 0), 0);
  const totalMeta = slicedData.reduce((s, d) => s + (d.meta || 0), 0);
  const cumplimiento = totalMeta > 0 ? ((totalRecaudado / totalMeta) * 100).toFixed(1) : '—';

  return (
    <Card noPadding className="flex flex-col">
      <div className="p-5 border-b border-gray-50 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-gray-800">Evolución de Recaudación</h3>
          <p className="text-xs text-gray-400 mt-0.5">Recaudado mensual vs meta proyectada</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Métricas resumen */}
          <div className="hidden sm:flex items-center gap-4 text-right mr-2">
            <div>
              <p className="text-xs text-gray-400">Total período</p>
              <p className="text-sm font-bold text-gray-800">{formatUSD(totalRecaudado)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Cumplimiento</p>
              <p className={`text-sm font-bold ${parseFloat(cumplimiento) >= 100 ? 'text-emerald-500' : parseFloat(cumplimiento) >= 80 ? 'text-amber-500' : 'text-red-500'}`}>
                {cumplimiento}%
              </p>
            </div>
          </div>

          {/* Selector de rango */}
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            {RANGOS.map(r => (
              <button
                key={r.value}
                onClick={() => setRango(r.value)}
                aria-pressed={rango === r.value}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  rango === r.value
                    ? 'bg-white text-[#27A9E1] shadow-sm'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-5 h-[280px]">
        {data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-300 text-sm">
            Sin datos para mostrar
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={slicedData} margin={{ top: 10, right: 5, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gradRecaudado" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#27A9E1" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#27A9E1" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="gradMeta" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#F59E0B" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="mes"
                axisLine={false} tickLine={false}
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                dy={8}
              />
              <YAxis
                axisLine={false} tickLine={false}
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickFormatter={formatUSD}
                width={70}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                iconType="circle" iconSize={8}
                wrapperStyle={{ paddingTop: '12px', fontSize: '12px' }}
              />
              <Area
                type="monotone"
                dataKey="meta"
                name="Meta"
                stroke="#F59E0B"
                strokeWidth={2}
                strokeDasharray="5 4"
                fill="url(#gradMeta)"
                dot={false}
                animationDuration={1500}
              />
              <Area
                type="monotone"
                dataKey="recaudado"
                name="Recaudado"
                stroke="#27A9E1"
                strokeWidth={2.5}
                fill="url(#gradRecaudado)"
                dot={{ r: 3, fill: '#27A9E1', strokeWidth: 2, stroke: '#fff' }}
                activeDot={{ r: 5 }}
                animationDuration={1500}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
};

export default RevenueTrendChart;
