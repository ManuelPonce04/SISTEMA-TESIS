const colorConfig = {
  rojo:     { bg: '#FEF2F2', border: '#FCA5A5', icon: '🔴', text: '#DC2626' },
  amarillo: { bg: '#FFFBEB', border: '#FCD34D', icon: '🟡', text: '#D97706' },
  verde:    { bg: '#F0FDF4', border: '#86EFAC', icon: '🟢', text: '#16A34A' },
  azul:     { bg: '#EFF6FF', border: '#93C5FD', icon: '🔵', text: '#2563EB' },
};

const AlertasBanner = ({ alertas = [] }) => {
  if (!alertas.length) return null;

  return (
    <div className="alertas-banner">
      {alertas.map((alerta, i) => {
        const cfg = colorConfig[alerta.tipo] || colorConfig.azul;
        return (
          <div
            key={i}
            className="alerta-item"
            style={{
              background: cfg.bg,
              borderLeft: `4px solid ${cfg.border}`,
              color: cfg.text,
            }}
          >
            <span className="alerta-icon">{cfg.icon}</span>
            <span className="alerta-msg">{alerta.mensaje}</span>
          </div>
        );
      })}
    </div>
  );
};

export default AlertasBanner;
