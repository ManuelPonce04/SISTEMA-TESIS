const getEstadoCobranza = (pct) => {
  if (pct >= 95) return { label: 'Excelente', color: '#16A34A', bg: '#F0FDF4', icon: '🟢' };
  if (pct >= 80) return { label: 'Aceptable', color: '#D97706', bg: '#FFFBEB', icon: '🟡' };
  return              { label: 'Crítico',    color: '#DC2626', bg: '#FEF2F2', icon: '🔴' };
};

const KpiBar = ({ label, value, max = 100, color = '#00AEEF' }) => (
  <div className="kpi-bar-item">
    <div className="kpi-bar-header">
      <span className="kpi-bar-label">{label}</span>
      <span className="kpi-bar-value" style={{ color }}>{value}{typeof max === 'number' ? '%' : ''}</span>
    </div>
    <div className="kpi-bar-track">
      <div className="kpi-bar-fill" style={{ width: `${value}%`, background: color }} />
    </div>
  </div>
);

const KpiIndicadores = ({ data = {} }) => {
  const estado = getEstadoCobranza(data.porcentajeCobranza || 0);

  const kpis = [
    { label: '💰 Cobros del Día',           value: `$${(data.cobrosDelDia || 0).toLocaleString('es-EC')}`,    highlight: true },
    { label: '📅 Cobros del Mes',           value: `$${(data.cobrosDelMes || 0).toLocaleString('es-EC')}`,    highlight: false },
    { label: '📊 Promedio por Estudiante',  value: `$${(data.promedioEstudiante || 0).toFixed(2)}`,           highlight: false },
    { label: '✅ Estudiantes al Día',       value: (data.estudiantesAlDia || 0).toLocaleString(),             highlight: false },
    { label: '⏳ Estudiantes Pendientes',   value: (data.estudiantesPendientes || 0).toLocaleString(),        highlight: true  },
    { label: '⚠️ Índice de Morosidad',      value: `${data.indiceMorosidad || 0}%`,                          highlight: true  },
    { label: '📉 Curso Mayor Morosidad',    value: data.cursoMayorMorosidad || '—',                           highlight: false },
    { label: '📈 Curso Mayor Recaudación',  value: data.cursoMayorRecaudacion || '—',                         highlight: false },
  ];

  return (
    <div className="kpi-indicadores-wrap">
      {/* Encabezado con estado */}
      <div className="kpi-ind-header">
        <h3 className="table-title">📈 Indicadores KPI</h3>
        <span
          className="estado-cobranza"
          style={{ background: estado.bg, color: estado.color, border: `1px solid ${estado.color}30` }}
        >
          {estado.icon} {estado.label} — {data.porcentajeCobranza}%
        </span>
      </div>

      {/* Grid de KPI pequeños */}
      <div className="kpi-ind-grid">
        {kpis.map((k, i) => (
          <div key={i} className={`kpi-ind-item ${k.highlight ? 'kpi-ind-highlight' : ''}`}>
            <div className="kpi-ind-label">{k.label}</div>
            <div className="kpi-ind-value">{k.value}</div>
          </div>
        ))}
      </div>

      {/* Barras de progreso */}
      <div className="kpi-bars-section">
        <KpiBar
          label="📊 Porcentaje de Cobranza"
          value={data.porcentajeCobranza || 0}
          color={estado.color}
        />
        <KpiBar
          label="🎯 Meta de Cobranza"
          value={data.metaCobranza || 0}
          color="#00AEEF"
        />
      </div>
    </div>
  );
};

export default KpiIndicadores;
