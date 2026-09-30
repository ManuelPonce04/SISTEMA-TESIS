import React, { useState, useEffect, useCallback } from 'react';
import { FiPlus, FiEdit2, FiToggleLeft, FiToggleRight, FiRefreshCw, FiFilter, FiAlertTriangle, FiCopy, FiEye } from 'react-icons/fi';
import Swal from 'sweetalert2';
import { getTarifas, crearTarifa, actualizarTarifa, cambiarEstadoTarifa } from '../../../services/pensionesConfigService';

const ESTADOS = ['BORRADOR', 'ACTIVA', 'INACTIVA', 'FINALIZADA'];

const estadoBadge = {
  ACTIVA:     'bg-emerald-100 text-emerald-700 border border-emerald-200',
  BORRADOR:   'bg-amber-100 text-amber-700 border border-amber-200',
  INACTIVA:   'bg-slate-100 text-slate-500 border border-slate-200',
  FINALIZADA: 'bg-gray-100 text-gray-400 border border-gray-200',
};

const TIPOS_APLICACION = [
  { value: 'GENERAL',   label: 'General del periodo' },
  { value: 'NIVEL',     label: 'Por nivel educativo' },
  { value: 'SUBNIVEL',  label: 'Por subnivel' },
  { value: 'CURSO',     label: 'Por curso específico' },
];

const initForm = {
  periodo_lectivo_id: '', tipo_aplicacion: 'GENERAL',
  nivel_id: '', subnivel_id: '', curso_id: '',
  valor_mensual: '', mes_desde: '', mes_hasta: '',
  fecha_desde: '', fecha_hasta: '', estado: 'BORRADOR', observacion: '',
};

export default function TabTarifas({ catalogos, isAdmin }) {
  const [tarifas, setTarifas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState({ periodo_lectivo_id: '', nivel_id: '', estado: '' });
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(initForm);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const { periodos = [], niveles = [], subniveles = [], cursos = [] } = catalogos || {};

  const fetchTarifas = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filtros.periodo_lectivo_id) params.periodo_lectivo_id = filtros.periodo_lectivo_id;
      if (filtros.nivel_id) params.nivel_id = filtros.nivel_id;
      if (filtros.estado) params.estado = filtros.estado;
      const res = await getTarifas(params);
      if (res.success) setTarifas(res.tarifas);
    } catch (e) {
      Swal.fire('Error', 'No se pudieron cargar las tarifas.', 'error');
    } finally {
      setLoading(false);
    }
  }, [filtros]);

  useEffect(() => { fetchTarifas(); }, [fetchTarifas]);

  const subnivelesFiltrados = subniveles.filter(s => !form.nivel_id || s.nivel_id === parseInt(form.nivel_id));
  const cursosFiltrados = cursos.filter(c => (!form.nivel_id || c.nivel_id === parseInt(form.nivel_id)) && (!form.subnivel_id || c.subnivel_id === parseInt(form.subnivel_id)));

  const validate = () => {
    const e = {};
    if (!form.periodo_lectivo_id) e.periodo_lectivo_id = 'Seleccione un periodo lectivo.';
    if (!form.valor_mensual || isNaN(form.valor_mensual) || parseFloat(form.valor_mensual) < 0) e.valor_mensual = 'Ingrese un valor mensual válido (≥ 0).';
    if (!form.mes_desde) e.mes_desde = 'Seleccione mes desde.';
    if (!form.mes_hasta) e.mes_hasta = 'Seleccione mes hasta.';
    if (form.mes_desde && form.mes_hasta && new Date(form.mes_desde) > new Date(form.mes_hasta)) e.mes_hasta = 'El mes hasta debe ser posterior al mes desde.';
    if (form.tipo_aplicacion === 'NIVEL' && !form.nivel_id) e.nivel_id = 'Seleccione un nivel.';
    if (form.tipo_aplicacion === 'SUBNIVEL' && !form.subnivel_id) e.subnivel_id = 'Seleccione un subnivel.';
    if (form.tipo_aplicacion === 'CURSO' && !form.curso_id) e.curso_id = 'Seleccione un curso.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        periodo_lectivo_id: parseInt(form.periodo_lectivo_id),
        nivel_id: form.tipo_aplicacion !== 'GENERAL' ? (parseInt(form.nivel_id) || null) : null,
        subnivel_id: ['SUBNIVEL', 'CURSO'].includes(form.tipo_aplicacion) ? (parseInt(form.subnivel_id) || null) : null,
        curso_id: form.tipo_aplicacion === 'CURSO' ? (parseInt(form.curso_id) || null) : null,
        valor_mensual: parseFloat(form.valor_mensual),
        mes_desde: form.mes_desde, mes_hasta: form.mes_hasta,
        fecha_desde: form.fecha_desde || null, fecha_hasta: form.fecha_hasta || null,
        estado: form.estado, observacion: form.observacion || null,
      };

      let res;
      if (editId) {
        res = await actualizarTarifa(editId, { ...payload, motivo: form.observacion });
      } else {
        res = await crearTarifa(payload);
      }

      if (res.success) {
        Swal.fire({ icon: 'success', title: editId ? 'Tarifa actualizada' : 'Tarifa creada', timer: 2000, showConfirmButton: false });
        setShowForm(false); setEditId(null); setForm(initForm); fetchTarifas();
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Error al guardar tarifa.';
      const data = err.response?.data?.data;
      if (err.response?.status === 409) {
        Swal.fire({ icon: 'warning', title: 'Conflicto detectado', html: `<p>${msg}</p>${data ? `<pre class="text-xs text-left mt-2">${JSON.stringify(data, null, 2)}</pre>` : ''}`, });
      } else {
        Swal.fire('Error', msg, 'error');
      }
    } finally { setSaving(false); }
  };

  const handleCambiarEstado = async (tarifa, nuevoEstado) => {
    const conf = await Swal.fire({ title: `¿Cambiar a ${nuevoEstado}?`, text: `Tarifa: ${tarifa.curso_nombre || tarifa.nivel_nombre || 'General'} — $${tarifa.valor_mensual}`, icon: 'question', showCancelButton: true, confirmButtonColor: '#27A9E1', confirmButtonText: 'Sí, cambiar' });
    if (!conf.isConfirmed) return;
    try {
      const res = await cambiarEstadoTarifa(tarifa.id, nuevoEstado);
      if (res.success) { Swal.fire({ icon: 'success', title: 'Estado actualizado', timer: 1500, showConfirmButton: false }); fetchTarifas(); }
    } catch (err) {
      const msg = err.response?.data?.message || 'Error al cambiar estado.';
      Swal.fire(err.response?.status === 409 ? 'Conflicto' : 'Error', msg, err.response?.status === 409 ? 'warning' : 'error');
    }
  };

  const handleEditar = (t) => {
    const tipo = t.curso_id ? 'CURSO' : t.subnivel_id ? 'SUBNIVEL' : t.nivel_id ? 'NIVEL' : 'GENERAL';
    setForm({
      periodo_lectivo_id: t.periodo_lectivo_id || '', tipo_aplicacion: tipo,
      nivel_id: t.nivel_id || '', subnivel_id: t.subnivel_id || '', curso_id: t.curso_id || '',
      valor_mensual: t.valor_mensual, mes_desde: t.mes_desde?.split('T')[0] || '', mes_hasta: t.mes_hasta?.split('T')[0] || '',
      fecha_desde: t.fecha_desde?.split('T')[0] || '', fecha_hasta: t.fecha_hasta?.split('T')[0] || '',
      estado: t.estado, observacion: t.observacion || '',
    });
    setEditId(t.id); setShowForm(true); setErrors({});
  };

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex items-center gap-2 text-gray-500 text-sm font-medium"><FiFilter size={14} />Filtros</div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Periodo</label>
            <select value={filtros.periodo_lectivo_id} onChange={e => setFiltros(p => ({ ...p, periodo_lectivo_id: e.target.value }))} className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#27A9E1]">
              <option value="">Todos</option>
              {periodos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Nivel</label>
            <select value={filtros.nivel_id} onChange={e => setFiltros(p => ({ ...p, nivel_id: e.target.value }))} className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#27A9E1]">
              <option value="">Todos</option>
              {niveles.map(n => <option key={n.id} value={n.id}>{n.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Estado</label>
            <select value={filtros.estado} onChange={e => setFiltros(p => ({ ...p, estado: e.target.value }))} className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#27A9E1]">
              <option value="">Todos</option>
              {ESTADOS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <button onClick={fetchTarifas} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
            <FiRefreshCw size={13} />Aplicar
          </button>
          {isAdmin && (
            <button onClick={() => { setShowForm(true); setEditId(null); setForm(initForm); setErrors({}); }} className="ml-auto flex items-center gap-2 px-4 py-2 bg-[#27A9E1] text-white rounded-xl text-sm font-medium hover:bg-[#1E8BBF] transition-colors shadow-sm">
              <FiPlus size={15} />Nueva tarifa
            </button>
          )}
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />)}
            </div>
          ) : tarifas.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-5xl mb-3">💰</div>
              <p className="text-gray-500 font-medium">No hay tarifas configuradas</p>
              <p className="text-gray-400 text-sm mt-1">Crea la primera tarifa de pensión con el botón superior.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Periodo', 'Nivel / Curso', 'Valor mensual', 'Vigencia de meses', 'Prioridad', 'Estado', 'Acciones'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {tarifas.map(t => (
                  <tr key={t.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{t.periodo_nombre || `#${t.periodo_lectivo_id}`}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800">{t.curso_nombre || t.subnivel_nombre || t.nivel_nombre || <span className="text-gray-400 italic">General</span>}</div>
                      <div className="text-xs text-gray-400">{t.curso_id ? 'Curso' : t.subnivel_id ? 'Subnivel' : t.nivel_id ? 'Nivel' : 'General'}</div>
                    </td>
                    <td className="px-4 py-3 font-bold text-gray-900">${parseFloat(t.valor_mensual).toFixed(2)}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {t.mes_desde?.split('T')[0]} → {t.mes_hasta?.split('T')[0]}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#27A9E1]/10 text-[#27A9E1] text-xs font-bold">{t.prioridad}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${estadoBadge[t.estado] || 'bg-gray-100 text-gray-500'}`}>{t.estado}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {isAdmin && (
                          <>
                            <button onClick={() => handleEditar(t)} title="Editar" className="p-1.5 text-gray-400 hover:text-[#27A9E1] hover:bg-blue-50 rounded-lg transition-colors"><FiEdit2 size={14} /></button>
                            {t.estado === 'BORRADOR' && <button onClick={() => handleCambiarEstado(t, 'ACTIVA')} title="Activar" className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"><FiToggleLeft size={15} /></button>}
                            {t.estado === 'ACTIVA' && <button onClick={() => handleCambiarEstado(t, 'INACTIVA')} title="Desactivar" className="p-1.5 text-gray-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"><FiToggleRight size={15} /></button>}
                            {t.estado === 'INACTIVA' && <button onClick={() => handleCambiarEstado(t, 'ACTIVA')} title="Reactivar" className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"><FiToggleLeft size={15} /></button>}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal de formulario */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center pt-8 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-800">{editId ? 'Editar tarifa' : 'Nueva tarifa de pensión'}</h3>
              <button onClick={() => { setShowForm(false); setEditId(null); }} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><span className="text-xl">×</span></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Periodo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Periodo lectivo <span className="text-red-500">*</span></label>
                <select value={form.periodo_lectivo_id} onChange={e => setForm(p => ({ ...p, periodo_lectivo_id: e.target.value }))} className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#27A9E1] ${errors.periodo_lectivo_id ? 'border-red-300' : 'border-gray-200'}`}>
                  <option value="">Seleccionar periodo...</option>
                  {periodos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
                {errors.periodo_lectivo_id && <p className="text-red-500 text-xs mt-1">{errors.periodo_lectivo_id}</p>}
              </div>

              {/* Tipo de aplicación */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Aplicación</label>
                <div className="grid grid-cols-2 gap-2">
                  {TIPOS_APLICACION.map(t => (
                    <button key={t.value} type="button" onClick={() => setForm(p => ({ ...p, tipo_aplicacion: t.value, nivel_id: '', subnivel_id: '', curso_id: '' }))}
                      className={`px-3 py-2 rounded-xl text-sm font-medium border transition-all ${form.tipo_aplicacion === t.value ? 'bg-[#27A9E1] text-white border-[#27A9E1]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#27A9E1]'}`}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Nivel */}
              {['NIVEL', 'SUBNIVEL', 'CURSO'].includes(form.tipo_aplicacion) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nivel educativo <span className="text-red-500">*</span></label>
                  <select value={form.nivel_id} onChange={e => setForm(p => ({ ...p, nivel_id: e.target.value, subnivel_id: '', curso_id: '' }))} className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#27A9E1] ${errors.nivel_id ? 'border-red-300' : 'border-gray-200'}`}>
                    <option value="">Seleccionar nivel...</option>
                    {niveles.map(n => <option key={n.id} value={n.id}>{n.nombre}</option>)}
                  </select>
                  {errors.nivel_id && <p className="text-red-500 text-xs mt-1">{errors.nivel_id}</p>}
                </div>
              )}

              {/* Subnivel */}
              {['SUBNIVEL', 'CURSO'].includes(form.tipo_aplicacion) && form.nivel_id && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subnivel</label>
                  <select value={form.subnivel_id} onChange={e => setForm(p => ({ ...p, subnivel_id: e.target.value, curso_id: '' }))} className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#27A9E1] ${errors.subnivel_id ? 'border-red-300' : 'border-gray-200'}`}>
                    <option value="">Todos los subniveles</option>
                    {subnivelesFiltrados.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                  </select>
                  {errors.subnivel_id && <p className="text-red-500 text-xs mt-1">{errors.subnivel_id}</p>}
                </div>
              )}

              {/* Curso */}
              {form.tipo_aplicacion === 'CURSO' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Curso <span className="text-red-500">*</span></label>
                  <select value={form.curso_id} onChange={e => setForm(p => ({ ...p, curso_id: e.target.value }))} className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#27A9E1] ${errors.curso_id ? 'border-red-300' : 'border-gray-200'}`}>
                    <option value="">Seleccionar curso...</option>
                    {cursosFiltrados.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                  {errors.curso_id && <p className="text-red-500 text-xs mt-1">{errors.curso_id}</p>}
                </div>
              )}

              {/* Valor mensual */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Valor mensual ($) <span className="text-red-500">*</span></label>
                <input type="number" min="0" step="0.01" value={form.valor_mensual} onChange={e => setForm(p => ({ ...p, valor_mensual: e.target.value }))} placeholder="0.00" className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#27A9E1] ${errors.valor_mensual ? 'border-red-300' : 'border-gray-200'}`} />
                {errors.valor_mensual && <p className="text-red-500 text-xs mt-1">{errors.valor_mensual}</p>}
              </div>

              {/* Rango de meses */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mes desde <span className="text-red-500">*</span></label>
                  <input type="date" value={form.mes_desde} onChange={e => setForm(p => ({ ...p, mes_desde: e.target.value }))} className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#27A9E1] ${errors.mes_desde ? 'border-red-300' : 'border-gray-200'}`} />
                  {errors.mes_desde && <p className="text-red-500 text-xs mt-1">{errors.mes_desde}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mes hasta <span className="text-red-500">*</span></label>
                  <input type="date" value={form.mes_hasta} onChange={e => setForm(p => ({ ...p, mes_hasta: e.target.value }))} className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#27A9E1] ${errors.mes_hasta ? 'border-red-300' : 'border-gray-200'}`} />
                  {errors.mes_hasta && <p className="text-red-500 text-xs mt-1">{errors.mes_hasta}</p>}
                </div>
              </div>

              {/* Estado */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estado inicial</label>
                <select value={form.estado} onChange={e => setForm(p => ({ ...p, estado: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#27A9E1]">
                  {ESTADOS.filter(s => s !== 'FINALIZADA').map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {/* Observación */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observación</label>
                <textarea value={form.observacion} onChange={e => setForm(p => ({ ...p, observacion: e.target.value }))} rows={2} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#27A9E1] resize-none" placeholder="Observación opcional..." />
              </div>

              {editId && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
                  <FiAlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                  Si la tarifa está ACTIVA, se cerrará la vigencia anterior y se creará una nueva. Esta acción quedará en auditoría.
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowForm(false); setEditId(null); }} className="flex-1 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 py-2 bg-[#27A9E1] text-white rounded-xl text-sm font-medium hover:bg-[#1E8BBF] transition-colors disabled:opacity-50">
                  {saving ? 'Guardando...' : editId ? 'Actualizar tarifa' : 'Crear tarifa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
