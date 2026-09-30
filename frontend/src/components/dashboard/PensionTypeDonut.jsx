import React, { useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Sector } from 'recharts';
import Card from '../ui/Card';

/**
 * PensionTypeDonut
 * ────────────────────────────────────────────────────────────
 * Gráfico de dona: distribución de estudiantes por tipo de pensión.
 * Muestra el impacto de las becas en el ingreso potencial.
 *
 * Endpoint real: GET /api/dashboard/pension-type-distribution
 * Parámetros: { anio, curso }
 *
 * Fórmula de impacto de beca:
 *   ingreso_potencial = suma(monto_pension_normal * cantidad)
 *   reduccion_beca    = ingreso_potencial - suma(monto_real * cantidad)
 *   % reduccion       = reduccion_beca / ingreso_potencial * 100
 */

const formatUSD = (v) =>
  `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 0 })}`;

// Sector activo (hover) con anillo expandido
const renderActiveShape = (props) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent } = props;
  return (
    <g>
      <text x={cx} y={cy - 10} textAnchor="middle" fill="#1e293b" fontSize={22} fontWeight={800}>
        {payload.cantidad}
      </text>
      <text x={cx} y={cy + 14} textAnchor="middle" fill="#94a3b8" fontSize={11}>
        estudiantes
      </text>
      <text x={cx} y={cy + 30} textAnchor="middle" fill={fill} fontSize={11} fontWeight={700}>
        {(percent * 100).toFixed(1)}%
      </text>
      <Sector
        cx={cx} cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 6}
        startAngle={startAngle} endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx} cy={cy}
        innerRadius={outerRadius + 10}
        outerRadius={outerRadius + 13}
        startAngle={startAngle} endAngle={endAngle}
        fill={fill} opacity={0.4}
      />
    </g>
  );
};

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-3 min-w-[180px]">
      <div className="flex items-center gap-2 mb-2">
        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
        <span className="text-sm font-bold text-gray-800">{d.tipo}</span>
      </div>
      <div className="flex justify-between text-xs text-gray-500 mb-0.5">
        <span>Estudiantes</span>
        <span className="font-semibold text-gray-700">{d.cantidad}</span>
      </div>
      <div className="flex justify-between text-xs text-gray-500">
        <span>Recaudado</span>
        <span className="font-semibold text-gray-700">{formatUSD(d.monto)}</span>
      </div>
    </div>
  );
};

const PensionTypeDonut = ({ data = [] }) => {
  const [activeIndex, setActiveIndex] = useState(0);

  const total = data.reduce((s, d) => s + d.cantidad, 0);
  const totalMonto = data.reduce((s, d) => s + d.monto, 0);

  return (
    <Card noPadding className="flex flex-col">
      <div className="p-5 border-b border-gray-50">
        <h3 className="text-base font-bold text-gray-800">Distribución por Tipo de Pensión</h3>
        <p className="text-xs text-gray-400 mt-0.5">
          Impacto de becas y diferenciadas en la recaudación
        </p>
      </div>

      {data.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-gray-300 text-sm">
          Sin datos para mostrar
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-center p-4 gap-4">
          {/* Dona */}
          <div className="w-full sm:w-[200px] h-[200px] flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  activeIndex={activeIndex}
                  activeShape={renderActiveShape}
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={62}
                  outerRadius={88}
                  dataKey="cantidad"
                  onMouseEnter={(_, i) => setActiveIndex(i)}
                  animationDuration={1200}
                >
                  {data.map((entry, i) => (
                    <Cell key={entry.tipo} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Leyenda */}
          <div className="flex-1 w-full">
            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
              {data.map((d, i) => {
                const pct = total > 0 ? ((d.cantidad / total) * 100).toFixed(1) : '0.0';
                return (
                  <button
                    key={d.tipo}
                    onClick={() => setActiveIndex(i)}
                    className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg transition-colors text-left ${
                      activeIndex === i ? 'bg-gray-50' : 'hover:bg-gray-50'
                    }`}
                    aria-pressed={activeIndex === i}
                    aria-label={`${d.tipo}: ${d.cantidad} estudiantes, ${pct}%`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ background: d.color }}
                      aria-hidden="true"
                    />
                    <span className="flex-1 text-xs text-gray-600 truncate">{d.tipo}</span>
                    <span className="text-xs font-bold text-gray-700 ml-auto">{pct}%</span>
                    <span className="text-xs text-gray-400 w-8 text-right">{d.cantidad}</span>
                  </button>
                );
              })}
            </div>

            {/* Resumen */}
            <div className="mt-3 pt-3 border-t border-gray-50 flex justify-between items-center">
              <span className="text-xs text-gray-400">Total estudiantes</span>
              <span className="text-sm font-bold text-gray-800">{total}</span>
            </div>
            <div className="flex justify-between items-center mt-1">
              <span className="text-xs text-gray-400">Monto recaudado</span>
              <span className="text-sm font-bold text-[#27A9E1]">{formatUSD(totalMonto)}</span>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

export default PensionTypeDonut;
