import React, { useEffect, useRef, useState } from 'react';
import {
  FiUsers, FiDollarSign, FiAlertTriangle, FiTrendingUp,
  FiTrendingDown, FiPercent, FiClock, FiActivity,
} from 'react-icons/fi';

/**
 * KpiCardV2
 * ────────────────────────────────────────────────────────────
 * Tarjeta KPI con:
 *  - Ícono semántico con fondo de color
 *  - Valor grande con animación de contador al montar
 *  - Variación porcentual vs período anterior (flecha ▲▼ + color)
 *  - Sparkline SVG nativo (sin Recharts, liviano)
 *  - Skeleton loader mientras loading=true
 *  - Estado vacío si valor === null
 *
 * Props:
 *  titulo      string
 *  valor       number | null
 *  subtitulo   string
 *  variacion   number  (positivo = subió, negativo = bajó)
 *  sparkline   number[] (últimos N períodos)
 *  tipo        'estudiantes'|'recaudado'|'pendiente'|'morosos'|'recaudacion'|'atraso'
 *  color       'celeste'|'verde'|'rojo'|'naranja'|'amarillo'
 *  prefix      '$' | ''
 *  suffix      '%' | ' días' | ''
 *  loading     boolean
 *  variacionInversa  boolean (si true: negativo es bueno — ej. cartera vencida)
 */

const ICON_MAP = {
  estudiantes:  FiUsers,
  recaudado:    FiDollarSign,
  pendiente:    FiDollarSign,
  morosos:      FiAlertTriangle,
  recaudacion:  FiPercent,
  atraso:       FiClock,
};

const COLOR_MAP = {
  celeste:  { iconBg: 'bg-[#e0f7ff]', iconText: 'text-[#27A9E1]', spark: '#27A9E1', bar: 'bg-[#27A9E1]' },
  verde:    { iconBg: 'bg-emerald-50', iconText: 'text-emerald-500', spark: '#10B981', bar: 'bg-emerald-500' },
  rojo:     { iconBg: 'bg-red-50',    iconText: 'text-red-500',    spark: '#EF4444', bar: 'bg-red-500' },
  naranja:  { iconBg: 'bg-orange-50', iconText: 'text-orange-500', spark: '#F97316', bar: 'bg-orange-500' },
  amarillo: { iconBg: 'bg-amber-50',  iconText: 'text-amber-500',  spark: '#F59E0B', bar: 'bg-amber-500' },
};

// ── Sparkline SVG nativo ─────────────────────────────────────────
const Sparkline = ({ data, color, positive }) => {
  if (!data || data.length < 2) return null;
  const W = 80, H = 28;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - ((v - min) / range) * (H - 4) - 2;
    return `${x},${y}`;
  }).join(' ');

  const fill = positive ? color : '#EF4444';

  return (
    <svg
      width={W} height={H}
      viewBox={`0 0 ${W} ${H}`}
      aria-hidden="true"
      role="img"
    >
      <polyline
        points={pts}
        fill="none"
        stroke={fill}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.8"
      />
      {/* Punto final */}
      {(() => {
        const last = data[data.length - 1];
        const x = W;
        const y = H - ((last - min) / range) * (H - 4) - 2;
        return <circle cx={x - 2} cy={y} r="2.5" fill={fill} />;
      })()}
    </svg>
  );
};

// ── Skeleton ─────────────────────────────────────────────────────
const KpiSkeleton = () => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 animate-pulse">
    <div className="flex items-start justify-between mb-4">
      <div className="w-11 h-11 rounded-xl bg-gray-100" />
      <div className="w-16 h-5 rounded-full bg-gray-100" />
    </div>
    <div className="w-24 h-7 rounded-lg bg-gray-100 mb-2" />
    <div className="w-32 h-4 rounded-lg bg-gray-100 mb-4" />
    <div className="w-20 h-6 rounded bg-gray-100" />
  </div>
);

// ── Contador animado ─────────────────────────────────────────────
const useCounter = (target, duration = 1000) => {
  const [display, setDisplay] = useState(0);
  const raf = useRef(null);
  useEffect(() => {
    if (target == null) return;
    let start = null;
    const step = (ts) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      // easeOutQuart
      const eased = 1 - Math.pow(1 - progress, 4);
      setDisplay(target * eased);
      if (progress < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);
  return display;
};

// ── Componente principal ─────────────────────────────────────────
const KpiCardV2 = ({
  titulo,
  valor,
  subtitulo,
  variacion,
  sparkline,
  tipo = 'recaudado',
  color = 'celeste',
  prefix = '',
  suffix = '',
  loading = false,
  variacionInversa = false,
}) => {
  const display = useCounter(typeof valor === 'number' ? valor : 0);
  const colors = COLOR_MAP[color] || COLOR_MAP.celeste;
  const Icon = ICON_MAP[tipo] || FiActivity;

  if (loading) return <KpiSkeleton />;

  if (valor == null) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center justify-center min-h-[140px]">
        <p className="text-sm text-gray-300">Sin datos</p>
      </div>
    );
  }

  // Determinar si la variación es positiva para el negocio
  const isPositive = variacionInversa ? variacion <= 0 : variacion >= 0;

  const formatValue = (v) => {
    if (prefix === '$') {
      return `$${Number(v).toLocaleString('en-US', {
        minimumFractionDigits: 2, maximumFractionDigits: 2,
      })}`;
    }
    if (suffix === '%') {
      return `${Number(v).toFixed(1)}%`;
    }
    if (suffix === ' días') {
      return `${Number(v).toFixed(1)} días`;
    }
    return Number(v).toLocaleString('es-EC');
  };

  return (
    <div
      className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3.5 sm:p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group flex flex-col justify-between"
      role="region"
      aria-label={`KPI: ${titulo}`}
    >
      <div>
        {/* Fila superior: ícono + variación */}
        <div className="flex items-start justify-between mb-2 sm:mb-3">
          <div
            className={`w-9 h-9 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${colors.iconBg} group-hover:scale-110 transition-transform duration-200`}
            aria-hidden="true"
          >
            <Icon size={18} className={`${colors.iconText} sm:hidden`} />
            <Icon size={20} className={`${colors.iconText} hidden sm:block`} />
          </div>

          {/* Variación vs período anterior */}
          {variacion != null && (
            <span
              className={`flex items-center gap-0.5 text-[10px] sm:text-xs font-bold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full ${
                isPositive
                  ? 'bg-emerald-50 text-emerald-600'
                  : 'bg-red-50 text-red-500'
              }`}
              aria-label={`Variación: ${variacion > 0 ? '+' : ''}${variacion.toFixed(1)}% vs período anterior`}
            >
              {isPositive
                ? <FiTrendingUp size={10} aria-hidden="true" />
                : <FiTrendingDown size={10} aria-hidden="true" />
              }
              {variacion > 0 ? '+' : ''}{variacion.toFixed(1)}%
            </span>
          )}
        </div>

        {/* Valor principal */}
        <div
          className="text-lg sm:text-2xl font-extrabold text-gray-800 leading-tight mb-0.5 sm:mb-1 tabular-nums truncate"
          aria-live="polite"
          title={formatValue(display)}
        >
          {formatValue(display)}
        </div>

        {/* Título */}
        <p className="text-[11px] sm:text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 truncate">
          {titulo}
        </p>

        {/* Subtítulo */}
        {subtitulo && (
          <p className="text-[11px] sm:text-xs text-gray-500 mb-2 sm:mb-3 leading-relaxed line-clamp-2">{subtitulo}</p>
        )}
      </div>

      {/* Sparkline + barra de referencia */}
      <div className="flex items-end justify-between mt-2 pt-1 border-t border-gray-50/80">
        <div className="max-w-[75px] sm:max-w-none flex-1">
          <Sparkline
            data={sparkline}
            color={colors.spark}
            positive={isPositive}
          />
        </div>
        <div className="flex flex-col items-end gap-0.5 ml-2 flex-shrink-0">
          <span className="text-[9px] sm:text-[10px] text-gray-300 font-medium">6 meses</span>
          <div className={`h-1 w-10 sm:w-12 rounded-full opacity-20 ${colors.bar}`} />
        </div>
      </div>
    </div>
  );
};

export default KpiCardV2;
