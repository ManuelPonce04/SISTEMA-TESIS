import React, { useState } from 'react';
import { FiPlay, FiAlertTriangle, FiCheckCircle, FiInfo, FiXCircle } from 'react-icons/fi';
import { simularPension, getBeneficios } from '../../../services/pensionesConfigService';
import { useEffect } from 'react';

const MESES_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

export default function TabSimulador({ catalogos }) {
  const [form, setForm] = useState({ periodo_lectivo_id: '', nivel_id: '', subnivel_id: '', curso_id: '', mes: '' });
  const [beneficiosDisponibles, setBeneficiosDisponibles] = useState([]);
  const [selectedBeneficios, setSelectedBeneficios] = useState([]);
  const [resultado, setResultado] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { periodos = [], niveles = [], subniveles = [], cursos = [] } = catalogos || {};

  useEffect(() => {
    getBeneficios({ activo: 'true' }).then(res => {
      if (res.success) setBeneficiosDisponibles(res.beneficios);
    });
  }, []);

  const subnivelesFiltrados = subniveles.filter(s => !form.nivel_id || s.nivel_id === parseInt(form.nivel_id));
  const cursosFiltrados = cursos.filter(c => (!form.nivel_id || c.nivel_id === parseInt(form.nivel_id)) && (!form.subnivel_id || c.subnivel_id === parseInt(form.subnivel_id)));

  const toggleBeneficio = (id) => {
    setSelectedBeneficios(p => p.includes(id) ? p.filter(i => i !== id) : [...p, id]);
    setResultado(null);
  };

  const handleSimular = async () => {
    if (!form.periodo_lectivo_id || !form.mes) {
      setError('Selecciona al menos el periodo y el mes.');
      return;
    }
    setLoading(true); setError(null); setResultado(null);
    try {
      const res = await simularPension({
        periodo_lectivo_id: parseInt(form.periodo_lectivo_id),
        nivel_id: form.nivel_id ? parseInt(form.nivel_id) : null,
        subnivel_id: form.subnivel_id ? parseInt(form.subnivel_id) : null,
        curso_id: form.curso_id ? parseInt(form.curso_id) : null,
        mes: form.mes,
        beneficio_ids: selectedBeneficios,
      });
      if (res.success) setResultado(res.simulacion);
      else setError(res.mensaje || res.message || 'Error en la simulación.');
    } catch (err) {
      const d = err.response?.data;
      if (d?.error === 'CONFLICTO_TARIFA') setError(`Conflicto de tarifas: existen ${d.tarifas_en_conflicto?.length} tarifas activas con la misma prioridad para este contexto.`);
      else if (d?.error === 'SIN_TARIFA') setError('No se encontró tarifa activa para los parámetros seleccionados.');
      else setError(d?.message || 'Error al simular la pensión.');
    } finally { setLoading(false); }
  };

  const calculo = resultado?.calculo;
  const mesLabel = form.mes ? (() => { const d = new Date(form.mes + 'T00:00:00'); return `${MESES_ES[d.getMonth()]} ${d.getFullYear()}`; })() : '';

  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-start gap-3">
        <FiInfo className="text-amber-500 flex-shrink-0 mt-0.5" size={16} />
        <p className="text-sm text-amber-700">El simulador calcula el valor de pensión usando las tarifas y beneficios configurados. <strong>No guarda ningún dato</strong> ni genera obligaciones.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Formulario */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h4 className="font-semibold text-gray-800 text-sm">Parámetros</h4>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Periodo lectivo <span className="text-red-500">*</span></label>
            <select value={form.periodo_lectivo_id} onChange={e => setForm(p => ({ ...p, periodo_lectivo_id: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#27A9E1]">
              <option value="">Seleccionar periodo...</option>
              {periodos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nivel educativo</label>
            <select value={form.nivel_id} onChange={e => setForm(p => ({ ...p, nivel_id: e.target.value, subnivel_id: '', curso_id: '' }))} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#27A9E1]">
              <option value="">General (sin nivel específico)</option>
              {niveles.map(n => <option key={n.id} value={n.id}>{n.nombre}</option>)}
            </select>
          </div>

          {form.nivel_id && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Subnivel</label>
              <select value={form.subnivel_id} onChange={e => setForm(p => ({ ...p, subnivel_id: e.target.value, curso_id: '' }))} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#27A9E1]">
                <option value="">Sin subnivel específico</option>
                {subnivelesFiltrados.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </select>
            </div>
          )}

          {form.nivel_id && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Curso específico</label>
              <select value={form.curso_id} onChange={e => setForm(p => ({ ...p, curso_id: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#27A9E1]">
                <option value="">Sin curso específico</option>
                {cursosFiltrados.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Mes de la pensión <span className="text-red-500">*</span></label>
            <input type="date" value={form.mes} onChange={e => setForm(p => ({ ...p, mes: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#27A9E1]" />
            <p className="text-xs text-gray-400 mt-1">Ingresa el primer día del mes (ej: 2026-05-01)</p>
          </div>

          {/* Beneficios */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">Beneficios a aplicar (opcional)</label>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {beneficiosDisponibles.map(b => (
                <label key={b.id} className={`flex items-center gap-2.5 px-3 py-2 rounded-xl cursor-pointer border transition-all ${selectedBeneficios.includes(b.id) ? 'bg-[#27A9E1]/10 border-[#27A9E1]/30 text-[#27A9E1]' : 'bg-gray-50 border-gray-100 text-gray-600 hover:border-gray-200'}`}>
                  <input type="checkbox" checked={selectedBeneficios.includes(b.id)} onChange={() => toggleBeneficio(b.id)} className="w-4 h-4 accent-[#27A9E1]" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{b.nombre}</div>
                    <div className="text-xs opacity-60">{b.tipo_calculo}{b.porcentaje_predeterminado ? ` — ${b.porcentaje_predeterminado}%` : ''}{b.valor_predeterminado !== null && b.valor_predeterminado !== undefined ? ` — $${b.valor_predeterminado}` : ''}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
              <FiAlertTriangle size={14} />{error}
            </div>
          )}

          <button onClick={handleSimular} disabled={loading} className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#27A9E1] text-white rounded-xl text-sm font-medium hover:bg-[#1E8BBF] disabled:opacity-50 transition-colors shadow-sm">
            <FiPlay size={15} />{loading ? 'Calculando...' : 'Simular pensión'}
          </button>
        </div>

        {/* Resultado */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h4 className="font-semibold text-gray-800 text-sm">Resultado de la simulación</h4>

          {!resultado && !loading && (
            <div className="py-16 text-center text-gray-400">
              <div className="text-4xl mb-2">🧮</div>
              <p className="text-sm">Configura los parámetros y presiona "Simular"</p>
            </div>
          )}

          {loading && (
            <div className="py-16 text-center">
              <div className="w-8 h-8 border-3 border-[#27A9E1] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-sm text-gray-400">Calculando...</p>
            </div>
          )}

          {resultado && calculo && (
            <div className="space-y-4">
              {/* Tarifa encontrada */}
              <div className="p-4 bg-gray-50 rounded-xl">
                <div className="text-xs font-medium text-gray-500 mb-2">Tarifa aplicada</div>
                <div className="text-lg font-bold text-gray-900">${parseFloat(resultado.tarifa.valor_mensual).toFixed(2)}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {resultado.tarifa.curso_nombre || resultado.tarifa.nivel_nombre || 'General'} · {mesLabel} ·
                  Prioridad {resultado.tarifa.prioridad}
                </div>
              </div>

              {/* Desglose */}
              <div className="space-y-2">
                <div className="text-xs font-medium text-gray-500">Desglose del cálculo</div>

                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Tarifa base</span>
                  <span className="font-semibold text-gray-900">${calculo.tarifa_base?.toFixed(2)}</span>
                </div>

                {calculo.descuento_porcentual > 0 && (
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-sm text-amber-600">Descuento porcentual ({calculo.descuento_porcentual}%)</span>
                    <span className="font-semibold text-amber-600">− ${calculo.monto_descuento_pct?.toFixed(2)}</span>
                  </div>
                )}

                {calculo.descuento_fijo > 0 && (
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-sm text-amber-600">Descuento fijo</span>
                    <span className="font-semibold text-amber-600">− ${calculo.descuento_fijo?.toFixed(2)}</span>
                  </div>
                )}

                {calculo.valor_especial !== null && calculo.valor_especial !== undefined && (
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-sm text-purple-600">Valor especial autorizado</span>
                    <span className="font-semibold text-purple-600">${parseFloat(calculo.valor_especial).toFixed(2)}</span>
                  </div>
                )}

                <div className={`flex justify-between items-center py-3 px-4 rounded-xl ${calculo.valor_final === 0 ? 'bg-emerald-50' : 'bg-[#27A9E1]/10'}`}>
                  <span className="font-bold text-gray-800">Valor final a pagar</span>
                  <span className={`text-2xl font-bold ${calculo.valor_final === 0 ? 'text-emerald-600' : 'text-[#27A9E1]'}`}>
                    ${calculo.valor_final?.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Compatibilidad */}
              {resultado.compatibilidad && !resultado.compatibilidad.compatible && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-xl">
                  <FiXCircle className="text-red-500 flex-shrink-0 mt-0.5" size={14} />
                  <div>
                    <p className="text-sm font-medium text-red-700">Beneficios incompatibles</p>
                    <p className="text-xs text-red-600 mt-0.5">Algunos beneficios seleccionados no pueden aplicarse juntos.</p>
                  </div>
                </div>
              )}

              {/* Advertencias */}
              {resultado.advertencias?.length > 0 && (
                <div className="space-y-1.5">
                  {resultado.advertencias.map((a, i) => (
                    <div key={i} className="flex items-start gap-2 p-2.5 bg-amber-50 border border-amber-100 rounded-lg text-xs text-amber-700">
                      <FiAlertTriangle size={12} className="flex-shrink-0 mt-0.5" />{a}
                    </div>
                  ))}
                </div>
              )}

              {resultado.compatibilidad?.compatible && resultado.advertencias?.length === 0 && (
                <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-sm text-emerald-700">
                  <FiCheckCircle size={14} />Configuración válida sin advertencias.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
