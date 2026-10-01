import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, LabelList,
} from 'recharts';
import Card from '../ui/Card';

/**
 * ArrearsByLevelChart
 * ────────────────────────────────────────────────────────────
 * Barras apiladas: cartera vencida por nivel académico.
 *  - Serie "pagado":    color celeste — monto ya cobrado
 *  - Serie "pendiente": color rojo    — monto aún por cobrar
 *
 * Endpoint real: GET /api/dashboard/arrears-by-level
 * Parámetros: { anio, mes }
 *
 * Fórmula de mora por nivel:
 *   % mora = pendiente / (pagado + pendiente) * 100
 */

const formatUSD = (v) =>
  `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 0 })}`;

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const pagado   = payload.find(p => p.dataKey === 'pagado')?.value  || 0;
  const pendiente= payload.find(p => p.dataKey === 'pendiente')?.value|| 0;
  const total    = pagado + pendiente;
  // Fórmula: % mora por nivel = pendiente / total * 100
  const pctMora  = total > 0 ? ((pendiente / total) * 100).toFixed(1) : '0.0';

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-3 min-w-[180px]">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{label}</p>
      <div className="flex items-center gap-2 mb-1">
        <span className="w-2 h-2 rounded-full bg-[#27A9E1] flex-shrink-0" />
        <span className="text-xs text-gray-500 flex-1">Cobrado</span>
        <span className="text-sm font-bold text-gray-800">{formatUSD(pagado)}</span>
      </div>
      <div className="flex items-center gap-2 mb-2">
        <span className="w-2 h-2 rounded-full bg-[#EF4444] flex-shrink-0" />
        <span className="text-xs text-gray-500 flex-1">Pendiente</span>
        <span className="text-sm font-bold text-red-500">{formatUSD(pendiente)}</span>
      </div>
      <div className="pt-2 border-t border-gray-50 flex justify-between items-center">
        <span className="text-xs text-gray-400">Total facturado</span>
        <span className="text-xs font-bold text-gray-700">{formatUSD(total)}</span>
      </div>
      <div className="flex justify-between items-center mt-1">
        {/* Fórmula: % mora nivel = pendiente / (pagado + pendiente) × 100 */}
        <span className="text-xs text-gray-400">Mora del nivel</span>
        <span className="text-xs font-bold text-red-500">{pctMora}%</span>
      </div>
    </div>
  );
};

const ArrearsByLevelChart = ({ data = [] }) => {
  return (
    <Card noPadding className="flex flex-col">
      <div className="p-5 border-b border-gray-50">
        <h3 className="text-base font-bold text-gray-800">Cartera por Nivel Académico</h3>
        <p className="text-xs text-gray-400 mt-0.5">
          Monto cobrado vs pendiente, separado por nivel
        </p>
      </div>

      <div className="p-3 sm:p-5 h-[260px] w-full min-w-0">
        {data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-300 text-sm">
            Sin datos para mostrar
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 16, right: 5, left: 0, bottom: 0 }}
              barSize={36}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="nivel"
                axisLine={false} tickLine={false}
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                dy={6}
              />
              <YAxis
                axisLine={false} tickLine={false}
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickFormatter={formatUSD}
                width={70}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
              <Legend
                iconType="circle" iconSize={8}
                wrapperStyle={{ paddingTop: '8px', fontSize: '12px' }}
              />
              <Bar
                dataKey="pagado"
                name="Cobrado"
                stackId="a"
                fill="#27A9E1"
                radius={[0, 0, 4, 4]}
                animationDuration={1400}
              />
              <Bar
                dataKey="pendiente"
                name="Pendiente"
                stackId="a"
                fill="#EF4444"
                radius={[4, 4, 0, 0]}
                animationDuration={1400}
              >
                <LabelList
                  dataKey="pendiente"
                  position="top"
                  formatter={(v) => v > 0 ? `$${(v / 1000).toFixed(1)}k` : ''}
                  style={{ fill: '#EF4444', fontSize: 10, fontWeight: 700 }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
};

export default ArrearsByLevelChart;
