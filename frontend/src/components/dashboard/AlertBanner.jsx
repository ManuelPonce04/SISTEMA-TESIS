import React, { useState, useEffect } from 'react';
import {
  FiAlertCircle, FiAlertTriangle, FiCheckCircle, FiInfo,
  FiX, FiChevronRight, FiUser, FiClock,
} from 'react-icons/fi';

/**
 * AlertBanner
 * ────────────────────────────────────────────────────────────
 * Banda de 4 tarjetas de alerta con semáforo de colores.
 * Cada tarjeta es accionable: abre un modal con el listado
 * detallado de estudiantes relacionados.
 *
 * Semáforo:
 *  rojo     = crítico (pensiones vencidas >30 días)
 *  amarillo = próximo a vencer (≤7 días)
 *  verde    = meta cumplida / indicador positivo
 *  azul     = informativo
 */

const ALERT_STYLES = {
  rojo: {
    border:  'border-l-4 border-[#EF4444]',
    bg:      'bg-red-50 hover:bg-red-100',
    iconBg:  'bg-red-100',
    iconColor:'text-[#EF4444]',
    badge:   'bg-[#EF4444] text-white',
    text:    'text-red-800',
    sub:     'text-red-600',
    Icon:    FiAlertCircle,
    label:   'Crítico',
  },
  amarillo: {
    border:  'border-l-4 border-[#F59E0B]',
    bg:      'bg-amber-50 hover:bg-amber-100',
    iconBg:  'bg-amber-100',
    iconColor:'text-[#F59E0B]',
    badge:   'bg-[#F59E0B] text-white',
    text:    'text-amber-800',
    sub:     'text-amber-600',
    Icon:    FiAlertTriangle,
    label:   'Atención',
  },
  verde: {
    border:  'border-l-4 border-[#10B981]',
    bg:      'bg-emerald-50 hover:bg-emerald-100',
    iconBg:  'bg-emerald-100',
    iconColor:'text-[#10B981]',
    badge:   'bg-[#10B981] text-white',
    text:    'text-emerald-800',
    sub:     'text-emerald-600',
    Icon:    FiCheckCircle,
    label:   'Meta cumplida',
  },
  azul: {
    border:  'border-l-4 border-[#27A9E1]',
    bg:      'bg-sky-50 hover:bg-sky-100',
    iconBg:  'bg-sky-100',
    iconColor:'text-[#27A9E1]',
    badge:   'bg-[#27A9E1] text-white',
    text:    'text-sky-800',
    sub:     'text-sky-600',
    Icon:    FiInfo,
    label:   'Informativo',
  },
};

// ── Modal de detalle ─────────────────────────────────────────────
const AlertModal = ({ alerta, onClose }) => {
  const style = ALERT_STYLES[alerta.tipo] || ALERT_STYLES.azul;
  const { Icon } = style;

  // Cerrar con Escape
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Detalle alerta: ${alerta.titulo}`}
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden animate-fade-in">
        {/* Header del modal */}
        <div className={`flex items-center gap-3 p-5 border-b border-gray-100 ${style.bg}`}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${style.iconBg}`}>
            <Icon size={20} className={style.iconColor} aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-xs font-semibold uppercase tracking-wider mb-0.5 ${style.sub}`}>
              {style.label}
            </p>
            <h3 className={`font-bold text-base leading-tight ${style.text}`}>
              {alerta.titulo}
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar modal"
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white/60 rounded-lg transition-colors"
          >
            <FiX size={18} />
          </button>
        </div>

        {/* Cuerpo */}
        <div className="overflow-y-auto flex-1 p-5">
          {alerta.estudiantes && alerta.estudiantes.length > 0 ? (
            <ul className="divide-y divide-gray-50" role="list">
              {alerta.estudiantes.map((est) => (
                <li key={est.id} className="py-3 flex items-center gap-3 group">
                  <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <FiUser size={15} className="text-gray-400" aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 text-sm truncate">{est.nombre}</p>
                    <p className="text-xs text-gray-500">{est.curso}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {est.diasMora != null && (
                      <span className="flex items-center gap-1 text-xs font-semibold text-red-600">
                        <FiClock size={12} aria-hidden="true" />
                        {est.diasMora} días mora
                      </span>
                    )}
                    {est.diasRestantes != null && (
                      <span className="flex items-center gap-1 text-xs font-semibold text-amber-600">
                        <FiClock size={12} aria-hidden="true" />
                        Vence en {est.diasRestantes} día{est.diasRestantes !== 1 ? 's' : ''}
                      </span>
                    )}
                    {(est.saldo || est.monto) && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        ${(est.saldo ?? est.monto).toFixed(2)}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <FiCheckCircle size={40} className="text-gray-200 mb-3" aria-hidden="true" />
              <p className="text-gray-400 text-sm">Sin registros adicionales para mostrar.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-gray-200"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Tarjeta individual ───────────────────────────────────────────
const AlertCard = ({ alerta, onClick }) => {
  const style = ALERT_STYLES[alerta.tipo] || ALERT_STYLES.azul;
  const { Icon } = style;
  const hasDetail = alerta.estudiantes && alerta.estudiantes.length > 0;

  return (
    <button
      onClick={() => hasDetail && onClick(alerta)}
      aria-label={`${alerta.titulo}. ${hasDetail ? 'Clic para ver detalle' : alerta.mensaje}`}
      className={`
        w-full text-left rounded-xl shadow-sm transition-all duration-200
        border border-gray-100 overflow-hidden
        ${style.bg} ${style.border}
        ${hasDetail ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5' : 'cursor-default'}
        focus:outline-none focus:ring-2 focus:ring-[#27A9E1] focus:ring-offset-2
      `}
    >
      <div className="p-4 flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${style.iconBg}`}>
          <Icon size={20} className={style.iconColor} aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className={`text-xs font-bold uppercase tracking-wider ${style.sub}`}>
              {style.label}
            </span>
            {hasDetail && (
              <FiChevronRight size={14} className={`flex-shrink-0 ${style.sub}`} aria-hidden="true" />
            )}
          </div>
          <p className={`font-bold text-sm leading-tight ${style.text}`}>{alerta.titulo}</p>
          <p className={`text-xs mt-1 leading-relaxed ${style.sub}`}>{alerta.mensaje}</p>
        </div>
      </div>
    </button>
  );
};

// ── Componente principal ─────────────────────────────────────────
const AlertBanner = ({ alertas = [] }) => {
  const [modalAlerta, setModalAlerta] = useState(null);

  if (!alertas.length) return null;

  return (
    <>
      <div
        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6"
        role="region"
        aria-label="Alertas del sistema"
      >
        {alertas.map((alerta) => (
          <AlertCard
            key={alerta.id}
            alerta={alerta}
            onClick={setModalAlerta}
          />
        ))}
      </div>

      {modalAlerta && (
        <AlertModal
          alerta={modalAlerta}
          onClose={() => setModalAlerta(null)}
        />
      )}
    </>
  );
};

export default AlertBanner;
