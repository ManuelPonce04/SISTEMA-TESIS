import React, { useState, useEffect } from 'react';
import { FiSave, FiInfo } from 'react-icons/fi';
import Swal from 'sweetalert2';
import { getConfigFinanciera, actualizarConfigFinanciera } from '../../../services/pensionesConfigService';

const TIPOS_LABEL = {
  COBRO_PENSION_NORMAL:       'Cobro de pensión normal',
  COBRO_PENSION_DIFERENCIADA: 'Cobro de pensión diferenciada',
  COBRO_PENSION_ANTERIOR:     'Cobro de pensión de año anterior',
  RECARGO_PENSION:            'Recargo por mora',
  DEVOLUCION_PENSION:         'Devolución de pensión',
};

const TIPOS_DESC = {
  COBRO_PENSION_NORMAL:       'Movimiento financiero que se genera al cobrar la pensión mensual estándar.',
  COBRO_PENSION_DIFERENCIADA: 'Movimiento para pensiones con valor especial autorizado.',
  COBRO_PENSION_ANTERIOR:     'Movimiento para recuperación de pensiones de periodos anteriores.',
  RECARGO_PENSION:            'Movimiento de recargo por pago tardío.',
  DEVOLUCION_PENSION:         'Movimiento de devolución o nota de crédito sobre pensión.',
};

export default function TabConfigFinanciera({ isAdmin }) {
  const [config, setConfig] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [edits, setEdits] = useState({});

  useEffect(() => {
    getConfigFinanciera().then(res => {
      if (res.success) setConfig(res.configuracion);
    }).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const items = config.map(c => ({
        id: c.id,
        catalogo_movimiento_id: edits[c.id]?.catalogo_movimiento_id ?? c.catalogo_movimiento_id ?? null,
        activo: edits[c.id]?.activo ?? c.activo,
        observacion: edits[c.id]?.observacion ?? c.observacion ?? null,
      }));
      const res = await actualizarConfigFinanciera(items);
      if (res.success) {
        Swal.fire({ icon: 'success', title: 'Configuración guardada', timer: 1500, showConfirmButton: false });
        setEdits({});
      }
    } catch (err) {
      Swal.fire('Error', err.response?.data?.message || 'Error al guardar.', 'error');
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-start gap-3">
        <FiInfo className="text-[#27A9E1] flex-shrink-0 mt-0.5" size={16} />
        <div className="text-sm text-blue-700">
          <p className="font-medium mb-1">Mapa de operaciones financieras</p>
          <p>Asocia cada tipo de operación de pensión con un concepto del catálogo de movimientos financieros. Esta configuración se utilizará en el futuro para generar movimientos contables automáticamente.</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3,4,5].map(i => <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />)}</div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
          {config.map(c => (
            <div key={c.id} className="p-5 flex flex-col md:flex-row md:items-start gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-800 text-sm">{TIPOS_LABEL[c.tipo_operacion] || c.tipo_operacion}</span>
                  <span className="text-xs font-mono text-gray-400 bg-gray-100 px-2 py-0.5 rounded">{c.tipo_operacion}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">{TIPOS_DESC[c.tipo_operacion] || ''}</p>
                {c.movimiento_nombre && (
                  <p className="text-xs text-[#27A9E1] mt-1.5 font-medium">Vinculado: {c.movimiento_codigo} — {c.movimiento_nombre}</p>
                )}
              </div>
              <div className="flex flex-col gap-2 md:w-72">
                <div className="text-xs text-gray-500 font-medium">ID de catálogo de movimientos</div>
                <input
                  type="number"
                  placeholder="ID del catálogo de movimientos"
                  defaultValue={c.catalogo_movimiento_id || ''}
                  onChange={e => setEdits(p => ({ ...p, [c.id]: { ...p[c.id], catalogo_movimiento_id: e.target.value ? parseInt(e.target.value) : null } }))}
                  disabled={!isAdmin}
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#27A9E1] disabled:bg-gray-50"
                />
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                  <input type="checkbox" defaultChecked={!!c.activo} onChange={e => setEdits(p => ({ ...p, [c.id]: { ...p[c.id], activo: e.target.checked } }))} disabled={!isAdmin} className="w-4 h-4 accent-[#27A9E1]" />
                  Activo
                </label>
              </div>
            </div>
          ))}
        </div>
      )}

      {isAdmin && !loading && (
        <div className="flex justify-end">
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 bg-[#27A9E1] text-white rounded-xl text-sm font-medium hover:bg-[#1E8BBF] disabled:opacity-50 transition-colors shadow-sm">
            <FiSave size={15} />{saving ? 'Guardando...' : 'Guardar configuración'}
          </button>
        </div>
      )}
    </div>
  );
}
