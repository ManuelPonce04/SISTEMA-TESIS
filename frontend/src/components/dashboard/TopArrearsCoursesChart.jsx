import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, LabelList,
} from 'recharts';
import Card from '../ui/Card';

/**
 * TopArrearsCoursesChart
 * ────────────────────────────────────────────────────────────
 * Barras horizontales: ranking de los 5 cursos con mayor
 * índice de morosidad.
 *
 * Endpoint real: GET /api/dashboard/top-arrears-courses
 * Parámetros: { anio, mes }
 *
 * Fórmula del índice de morosidad por curso:
 *   índice_mora_curso = alumnos_con_saldo_pendiente / total_alumnos_curso × 100
 */

// Colores semáforo según severidad
const getSeverityColor = (pct) => {
  if (pct >= 30) return '#EF4444'; // rojo — crítico
  if (pct >= 20) return '#F97316'; // naranja — alto
  if (pct >= 15) return '#F59E0B'; // ámbar — medio
  return '#10B981';                 // verde — bajo
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-3 min-w-[200px]">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{d.curso}</p>
      <div className="flex justify-between text-xs text-gray-500 mb-0.5">
        <span>Alumnos en mora</span>
        <span className="font-bold text-gray-700">{d.mora} / {d.total}</span>
      </div>
      <div className="flex justify-between text-xs text-gray-500">
        {/* Fórmula: índice mora curso = alumnos_mora / total_alumnos × 100 */}
        <span>Índice morosidad</span>
        <span className="font-bold" style={{ color: getSeverityColor(d.morosidad) }}>
          {d.morosidad.toFixed(1)}%
        </span>
      </div>
    </div>
  );
};

// Etiqueta personalizada al final de cada barra
const CustomLabel = ({ x, y, width, value, index, data }) => {
  const d = data[index];
  const color = getSeverityColor(value);
  return (
    <g>
      <text
        x={x + width + 6}
        y={y + 10}
        fill={color}
        fontSize={12}
        fontWeight={700}
      >
        {value.toFixed(1)}%
      </text>
      <text
        x={x + width + 6}
        y={y + 23}
        fill="#94a3b8"
        fontSize={10}
      >
        {d?.mora}/{d?.total}
      </text>
    </g>
  );
};

const TopArrearsCoursesChart = ({ data = [] }) => {
  // Ordenar de mayor a menor morosidad
  const sorted = [...data].sort((a, b) => b.morosidad - a.morosidad).slice(0, 5);

  return (
    <Card noPadding className="flex flex-col">
      <div className="p-5 border-b border-gray-50 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-gray-800">Top 5 Cursos — Mayor Morosidad</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Ranking de cursos con mayor índice de alumnos en mora
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
          {[
            { label: '≥30% crítico', color: '#EF4444' },
            { label: '≥20% alto',   color: '#F97316' },
            { label: '≥15% medio',  color: '#F59E0B' },
          ].map(s => (
            <span key={s.label} className="flex items-center gap-1 text-[10px] text-gray-400 font-medium">
              <span className="w-2 h-2 rounded-full" style={{ background: s.color }} aria-hidden="true" />
              {s.label}
            </span>
          ))}
        </div>
      </div>

      <div className="p-5">
        {sorted.length === 0 ? (
          <div className="flex items-center justify-center py-10 text-gray-300 text-sm">
            Sin datos para mostrar
          </div>
        ) : (
          <div className="space-y-3">
            {sorted.map((d, i) => {
              const color = getSeverityColor(d.morosidad);
              return (
                <div key={d.curso} aria-label={`${d.curso}: ${d.morosidad.toFixed(1)}% de morosidad`}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-xs font-black text-gray-300 w-4 text-right flex-shrink-0"
                        aria-hidden="true"
                      >
                        {i + 1}
                      </span>
                      <span className="text-sm font-semibold text-gray-700">{d.curso}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">{d.mora}/{d.total} alumnos</span>
                      <span className="text-sm font-bold" style={{ color }}>
                        {d.morosidad.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  {/* Barra de progreso */}
                  <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden" role="progressbar"
                    aria-valuenow={d.morosidad} aria-valuemin={0} aria-valuemax={100}>
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${Math.min(d.morosidad, 100)}%`,
                        background: color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
};

export default TopArrearsCoursesChart;
