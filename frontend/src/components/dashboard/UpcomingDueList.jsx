import React, { useState } from 'react';
import { FiClock, FiBell, FiCheck, FiUser, FiCalendar } from 'react-icons/fi';
import Card from '../ui/Card';

/**
 * UpcomingDueList
 * ────────────────────────────────────────────────────────────
 * Lista de estudiantes con pensión que vence en los próximos 7 días.
 * Ordenado por urgencia (menos días restantes primero).
 *
 * Endpoint real: GET /api/dashboard/upcoming-dues
 * Parámetros: { anio, dias: 7 }
 *
 * Estados de días restantes (semáforo):
 *  0-2 días  → rojo    (muy urgente)
 *  3-5 días  → ámbar   (próximo)
 *  6-7 días  → verde   (esta semana)
 */

const getDaysStyle = (dias) => {
  if (dias <= 2) return {
    badge:  'bg-red-100 text-red-600 border border-red-200',
    dot:    'bg-[#EF4444]',
    label:  dias === 0 ? 'Hoy' : dias === 1 ? 'Mañana' : `${dias} días`,
  };
  if (dias <= 5) return {
    badge:  'bg-amber-100 text-amber-600 border border-amber-200',
    dot:    'bg-[#F59E0B]',
    label:  `${dias} días`,
  };
  return {
    badge:  'bg-emerald-100 text-emerald-600 border border-emerald-200',
    dot:    'bg-[#10B981]',
    label:  `${dias} días`,
  };
};

// ── Componente principal ─────────────────────────────────────────
const UpcomingDueList = ({ data = [], loading = false }) => {
  const [sent, setSent] = useState(new Set());

  // Ordenar de más urgente a menos urgente
  const sorted = [...data].sort((a, b) => a.diasRestantes - b.diasRestantes);

  const handleReminder = (est) => {
    // TODO: Conectar con endpoint real: POST /api/notificaciones/recordatorio
    // Actualmente simula envío con feedback visual
    setSent(prev => new Set([...prev, est.id]));
    setTimeout(() => {
      setSent(prev => {
        const next = new Set(prev);
        next.delete(est.id);
        return next;
      });
    }, 3000);
  };

  return (
    <Card noPadding className="flex flex-col">
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-gray-50 flex items-start justify-between">
        <div>
          <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
            <FiClock size={16} className="text-amber-500" aria-hidden="true" />
            Próximos Vencimientos
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Pensiones que vencen en los próximos 7 días
          </p>
        </div>
        {sorted.length > 0 && (
          <span className="flex items-center justify-center w-6 h-6 bg-amber-100 text-amber-600 text-xs font-bold rounded-full flex-shrink-0">
            {sorted.length}
          </span>
        )}
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto w-full min-w-0">
        {loading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="animate-pulse flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gray-100 flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 bg-gray-100 rounded-full w-3/4" />
                  <div className="h-3 bg-gray-100 rounded-full w-1/2" />
                </div>
                <div className="w-14 h-6 bg-gray-100 rounded-full flex-shrink-0" />
              </div>
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center px-5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center mb-3">
              <FiCheck size={22} className="text-emerald-400" aria-hidden="true" />
            </div>
            <p className="text-sm font-semibold text-gray-500">Sin vencimientos próximos</p>
            <p className="text-xs text-gray-300 mt-1">
              No hay pensiones que venzan en los próximos 7 días.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-50" role="list" aria-label="Lista de próximos vencimientos">
            {sorted.map((est) => {
              const style = getDaysStyle(est.diasRestantes);
              const isSent = sent.has(est.id);

              return (
                <li
                  key={est.id}
                  className="p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors group"
                  role="listitem"
                  aria-label={`${est.estudiante}, vence en ${est.diasRestantes} días, monto $${est.monto.toFixed(2)}`}
                >
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
                      <FiUser size={16} className="text-gray-400" aria-hidden="true" />
                    </div>
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${style.dot}`}
                      aria-hidden="true"
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{est.estudiante}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <FiCalendar size={10} className="text-gray-300 flex-shrink-0" aria-hidden="true" />
                      <p className="text-xs text-gray-400 truncate">{est.curso}</p>
                      <span className="text-gray-200 text-xs">·</span>
                      <p className="text-xs font-semibold text-gray-600">
                        ${est.monto.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>

                  {/* Badge días + botón recordatorio */}
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${style.badge}`}>
                      {style.label}
                    </span>
                    <button
                      onClick={() => handleReminder(est)}
                      disabled={isSent}
                      aria-label={
                        isSent
                          ? `Recordatorio enviado a ${est.estudiante}`
                          : `Enviar recordatorio a ${est.estudiante}`
                      }
                      className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-[#27A9E1] ${
                        isSent
                          ? 'bg-emerald-100 text-emerald-600 cursor-default'
                          : 'text-[#27A9E1] hover:bg-[#e0f7ff] opacity-0 group-hover:opacity-100 focus:opacity-100'
                      }`}
                    >
                      {isSent ? (
                        <><FiCheck size={10} aria-hidden="true" /> Enviado</>
                      ) : (
                        <><FiBell size={10} aria-hidden="true" /> Recordar</>
                      )}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Footer */}
      {sorted.length > 0 && (
        <div className="p-4 border-t border-gray-50 bg-gray-50/50">
          <p className="text-xs text-gray-400 text-center">
            <span className="font-semibold text-gray-500">{sorted.length}</span> pensión{sorted.length !== 1 ? 'es' : ''} con vencimiento próximo
          </p>
        </div>
      )}
    </Card>
  );
};

export default UpcomingDueList;
