import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell
} from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div className="chart-tooltip">
        <p className="tooltip-label">{label}</p>
        <p className="tooltip-value">${payload[0].value.toLocaleString('es-EC')}</p>
      </div>
    );
  }
  return null;
};

const CobrosMensuales = ({ data = [] }) => {
  const mesActual = new Date().getMonth(); // 0-indexed

  return (
    <div className="chart-card">
      <div className="chart-card-header">
        <h3 className="chart-title">📊 Cobros Mensuales</h3>
        <span className="chart-subtitle">Ingresos por mes — 2026</span>
      </div>
      <div className="chart-body">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" />
            <XAxis
              dataKey="mes"
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `$${v >= 1000 ? (v/1000).toFixed(1)+'k' : v}`}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,174,239,0.05)' }} />
            <Bar dataKey="total" radius={[6, 6, 0, 0]} maxBarSize={36}>
              {data.map((entry, index) => (
                <Cell
                  key={index}
                  fill={index === mesActual ? '#00AEEF' : index < mesActual ? '#0097d4' : '#e2e8f0'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default CobrosMensuales;
