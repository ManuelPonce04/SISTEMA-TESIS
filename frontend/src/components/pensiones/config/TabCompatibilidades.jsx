import React, { useState, useEffect } from 'react';
import { FiSave, FiAlertTriangle, FiCheckCircle, FiXCircle } from 'react-icons/fi';
import Swal from 'sweetalert2';
import { getBeneficios, getCompatibilidades, actualizarCompatibilidades } from '../../../services/pensionesConfigService';

export default function TabCompatibilidades({ isAdmin }) {
  const [beneficios, setBeneficios] = useState([]);
  const [selected, setSelected] = useState(null);
  const [compatibilidades, setCompatibilidades] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [changes, setChanges] = useState({});

  useEffect(() => {
    getBeneficios({ activo: 'true' }).then(res => {
      if (res.success) setBeneficios(res.beneficios);
    });
  }, []);

  const handleSelect = async (b) => {
    setSelected(b);
    setLoading(true);
    setChanges({});
    try {
      const res = await getCompatibilidades(b.id);
      if (res.success) {
        // Crear mapa: beneficio_relacionado_id → { son_compatibles, observacion }
        const map = {};
        res.compatibilidades.forEach(c => {
          const otherId = c.beneficio_id === b.id ? c.beneficio_relacionado_id : c.beneficio_id;
          map[otherId] = { son_compatibles: !!c.son_compatibles, observacion: c.observacion || '' };
        });
        setCompatibilidades(map);
      }
    } finally { setLoading(false); }
  };

  const handleToggle = (otherId) => {
    if (!isAdmin) return;
    const current = compatibilidades[otherId];
    const newVal = current ? !current.son_compatibles : true;
    const updated = { ...(compatibilidades[otherId] || { observacion: '' }), son_compatibles: newVal };
    setCompatibilidades(p => ({ ...p, [otherId]: updated }));
    setChanges(p => ({ ...p, [otherId]: updated }));
  };

  const handleSave = async () => {
    if (!selected || Object.keys(changes).length === 0) return;
    setSaving(true);
    try {
      const items = Object.entries(compatibilidades).map(([id, val]) => ({
        beneficio_relacionado_id: parseInt(id),
        son_compatibles: !!val.son_compatibles,
        observacion: val.observacion || null,
      }));
      const res = await actualizarCompatibilidades(selected.id, items);
      if (res.success) {
        Swal.fire({ icon: 'success', title: 'Compatibilidades guardadas', timer: 1500, showConfirmButton: false });
        setChanges({});
      }
    } catch (err) {
      Swal.fire('Error', err.response?.data?.message || 'Error al guardar.', 'error');
    } finally { setSaving(false); }
  };

  const otrosBeneficios = beneficios.filter(b => b.id !== selected?.id);

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-start gap-3">
        <FiAlertTriangle className="text-[#27A9E1] flex-shrink-0 mt-0.5" size={16} />
        <p className="text-sm text-blue-700">
          Selecciona un beneficio para configurar su compatibilidad con los demás. Si dos beneficios están marcados como <strong>incompatibles</strong>, el sistema mostrará una advertencia al intentar asignarlos juntos.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Lista de beneficios */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h4 className="text-sm font-semibold text-gray-700">Seleccionar beneficio</h4>
          </div>
          <div className="overflow-y-auto max-h-[500px]">
            {beneficios.map(b => (
              <button key={b.id} onClick={() => handleSelect(b)}
                className={`w-full text-left px-4 py-3 text-sm border-b border-gray-50 transition-colors ${selected?.id === b.id ? 'bg-[#27A9E1] text-white' : 'hover:bg-gray-50 text-gray-700'}`}>
                <div className="font-medium truncate">{b.nombre}</div>
                <div className={`text-xs mt-0.5 ${selected?.id === b.id ? 'text-blue-100' : 'text-gray-400'}`}>{b.categoria}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Matriz de compatibilidad */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <h4 className="text-sm font-semibold text-gray-700">
              {selected ? `Compatibilidades — ${selected.nombre}` : 'Selecciona un beneficio'}
            </h4>
            {isAdmin && selected && Object.keys(changes).length > 0 && (
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-3 py-1.5 bg-[#27A9E1] text-white rounded-lg text-sm font-medium hover:bg-[#1E8BBF] disabled:opacity-50 transition-colors">
                <FiSave size={13} />{saving ? 'Guardando...' : `Guardar cambios (${Object.keys(changes).length})`}
              </button>
            )}
          </div>

          {!selected ? (
            <div className="p-12 text-center text-gray-400">
              <div className="text-4xl mb-2">↑</div>
              <p className="text-sm">Selecciona un beneficio de la lista</p>
            </div>
          ) : loading ? (
            <div className="p-8 space-y-3">{[1,2,3,4].map(i => <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />)}</div>
          ) : otrosBeneficios.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">No hay otros beneficios para comparar.</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {otrosBeneficios.map(b => {
                const comp = compatibilidades[b.id];
                const esCompatible = comp?.son_compatibles ?? null;
                return (
                  <div key={b.id} className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-800 truncate">{b.nombre}</div>
                      <div className="text-xs text-gray-400">{b.categoria} · {b.tipo_calculo}</div>
                    </div>
                    {isAdmin ? (
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleToggle(b.id)}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                            esCompatible === true  ? 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100' :
                            esCompatible === false ? 'bg-red-50 text-red-500 border-red-200 hover:bg-red-100' :
                            'bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100'
                          }`}>
                          {esCompatible === true  ? <><FiCheckCircle size={14} />Compatible</> :
                           esCompatible === false ? <><FiXCircle size={14} />Incompatible</> :
                           'Sin definir'}
                        </button>
                      </div>
                    ) : (
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        esCompatible === true  ? 'bg-emerald-100 text-emerald-700' :
                        esCompatible === false ? 'bg-red-100 text-red-600' :
                        'bg-gray-100 text-gray-400'
                      }`}>
                        {esCompatible === true ? 'Compatible' : esCompatible === false ? 'Incompatible' : 'Sin definir'}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
