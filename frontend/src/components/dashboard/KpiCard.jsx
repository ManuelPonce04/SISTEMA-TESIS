import { FiUsers, FiDollarSign, FiFileText, FiAlertTriangle, FiTrendingUp } from 'react-icons/fi';
import { useEffect, useState } from 'react';

const iconMap = {
  estudiantes: FiUsers,
  recaudado:   FiDollarSign,
  pendiente:   FiFileText,
  morosos:     FiAlertTriangle,
};

const colorMap = {
  celeste:  { bg: 'kpi-celeste',  icon: '#00AEEF' },
  verde:    { bg: 'kpi-verde',    icon: '#10B981' },
  naranja:  { bg: 'kpi-naranja',  icon: '#F59E0B' },
  rojo:     { bg: 'kpi-rojo',     icon: '#EF4444' },
};

const KpiCard = ({ titulo, valor, subtitulo, tipo, color, prefix = '', suffix = '', tendencia }) => {
  const [display, setDisplay] = useState(0);
  const Icon = iconMap[tipo] || FiTrendingUp;
  const { bg } = colorMap[color] || colorMap.celeste;
  const target = typeof valor === 'number' ? valor : 0;

  // Animación de contador al cargar
  useEffect(() => {
    let start = 0;
    const duration = 1200;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setDisplay(target); clearInterval(timer); }
      else setDisplay(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [target]);

  const formatVal = (v) => {
    if (prefix === '$') return `$${Number(v).toLocaleString('es-EC', { minimumFractionDigits: 0 })}`;
    return v.toLocaleString('es-EC');
  };

  return (
    <div className={`kpi-card ${bg}`}>
      <div className="kpi-card-top">
        <div className="kpi-icon-wrap">
          <Icon size={24} />
        </div>
        {tendencia !== undefined && (
          <span className={`kpi-tendencia ${tendencia >= 0 ? 'tend-pos' : 'tend-neg'}`}>
            {tendencia >= 0 ? '↑' : '↓'} {Math.abs(tendencia)}%
          </span>
        )}
      </div>
      <div className="kpi-valor">{formatVal(display)}{suffix}</div>
      <div className="kpi-titulo">{titulo}</div>
      {subtitulo && <div className="kpi-subtitulo">{subtitulo}</div>}
    </div>
  );
};

export default KpiCard;
