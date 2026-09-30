import React, { useState, useEffect, useCallback } from 'react';
import { FiPlus, FiEdit2, FiToggleLeft, FiToggleRight, FiPercent, FiDollarSign, FiStar } from 'react-icons/fi';
import Swal from 'sweetalert2';
import { getBeneficios, crearBeneficio, actualizarBeneficio, cambiarEstadoBeneficio } from '../../../services/pensionesConfigService';

const CATEGORIAS = ['BECA','DESCUENTO','PENSION_DIFERENCIADA','EXONERACION','CONVENIO','OTRO'];
const TIPOS_CALCULO = ['PORCENTAJE','VALOR_FIJO','VALOR_FINAL','EXONERACION_TOTAL'];

const categoriaBadge = {
  BECA:               'bg-blue-100 text-blue-700',
  DESCUENTO:          'bg-amber-100 text-amber-700',
  PENSION_DIFERENCIADA:'bg-purple-100 text-purple-700',
  EXONERACION:        'bg-emerald-100 text-emerald-700',
  CONVENIO:           'bg-cyan-100 text-cyan-700',
  OTRO:               'bg-gray-100 text-gray-500',
};

const tipoCalcIcon = {
  PORCENTAJE:      <FiPercent size={12} />,
  VALOR_FIJO:      <FiDollarSign size={12} />,
  VALOR_FINAL:     <FiStar size={12} />,
  EXONERACION_TOTAL: <span className="text-[10px] font-bold">EX</span>,
};

const initForm = {
  codigo: '', nombre: '', descripcion: '', categoria: 'BECA', tipo_calculo: 'PORCENTAJE',
  valor_predeterminado: '', porcentaje_predeterminado: '', requiere_documento: false,
  requiere_autorizacion: true, permite_acumulacion: false, prioridad: 10,
};

export default function TabBeneficios({ isAdmin }) {
  const [beneficios, setBeneficios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [filtroActivo, setFiltroActivo] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(initForm);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const fetchBeneficios = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filtroCategoria) params.categoria = filtroCategoria;
      if (filtroActivo !== '') params.activo = filtroActivo;
      const res = await getBeneficios(params);
      if (res.success) setBeneficios(res.beneficios);
    } catch { Swal.fire('Error', 'No se pudo cargar el catálogo de beneficios.', 'error'); }
    finally { setLoading(false); }
  }, [filtroCategoria, filtroActivo]);

  useEffect(() => { fetchBeneficios(); }, [fetchBeneficios]);

  const validate = () => {
    const e = {};
    if (!form.codigo.trim()) e.codigo = 'El código es requerido.';
    if (!form.nombre.trim()) e.nombre = 'El nombre es requerido.';
    if (!form.categoria) e.categoria = 'Seleccione una categoría.';
    if (!form.tipo_calculo) e.tipo_calculo = 'Seleccione el tipo de cálculo.';
    if (form.tipo_calculo === 'PORCENTAJE' && form.porcentaje_predeterminado !== '' && (isNaN(form.porcentaje_predeterminado) || parseFloat(form.porcentaje_predeterminado) < 0 || parseFloat(form.porcentaje_predeterminado) > 100))
      e.porcentaje_predeterminado = 'El porcentaje debe ser entre 0 y 100.';
    if (form.tipo_calculo === 'VALOR_FIJO' && form.valor_predeterminado !== '' && (isNaN(form.valor_predeterminado) || parseFloat(form.valor_predeterminado) < 0))
      e.valor_predeterminado = 'El valor fijo debe ser ≥ 0.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        valor_predeterminado: form.valor_predeterminado !== '' ? parseFloat(form.valor_predeterminado) : null,
        porcentaje_predeterminado: form.porcentaje_predeterminado !== '' ? parseFloat(form.porcentaje_predeterminado) : null,
        prioridad: parseInt(form.prioridad) || 0,
      };
      let res;
      if (editId) {
        res = await actualizarBeneficio(editId, payload);
      } else {
        res = await crearBeneficio(payload);
      }
      if (res.success) {
        Swal.fire({ icon: 'success', title: editId ? 'Beneficio actualizado' : 'Beneficio creado', timer: 2000, showConfirmButton: false });
        setShowForm(false); setEditId(null); setForm(initForm); fetchBeneficios();
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Error al guardar.';
      if (err.response?.status === 409) Swal.fire('Conflicto', msg, 'warning');
      else Swal.fire('Error', msg, 'error');
    } finally { setSaving(false); }
  };

  const handleToggleActivo = async (b) => {
    const conf = await Swal.fire({ title: `¿${b.activo ? 'Desactivar' : 'Activar'} beneficio?`, text: b.nombre, icon: 'question', showCancelButton: true, confirmButtonColor: '#27A9E1', confirmButtonText: 'Confirmar' });
    if (!conf.isConfirmed) return;
    try {
      await cambiarEstadoBeneficio(b.id, !b.activo);
      fetchBeneficios();
    } catch (err) { Swal.fire('Error', err.response?.data?.message || 'Error.', 'error'); }
  };

  const handleEditar = (b) => {
    setForm({
      codigo: b.codigo, nombre: b.nombre, descripcion: b.descripcion || '', categoria: b.categoria, tipo_calculo: b.tipo_calculo,
      valor_predeterminado: b.valor_predeterminado ?? '', porcentaje_predeterminado: b.porcentaje_predeterminado ?? '',
      requiere_documento: !!b.requiere_documento, requiere_autorizacion: !!b.requiere_autorizacion,
      permite_acumulacion: !!b.permite_acumulacion, prioridad: b.prioridad ?? 0,
    });
    setEditId(b.id); setShowForm(true); setErrors({});
  };

  const InputError = ({ msg }) => msg ? <p className="text-red-500 text-xs mt-1">{msg}</p> : null;

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Categoría</label>
          <select value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#27A9E1]">
            <option value="">Todas</option>
            {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Estado</label>
          <select value={filtroActivo} onChange={e => setFiltroActivo(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#27A9E1]">
            <option value="">Todos</option>
            <option value="true">Activos</option>
            <option value="false">Inactivos</option>
          </select>
        </div>
        {isAdmin && (
          <button onClick={() => { setShowForm(true); setEditId(null); setForm(initForm); setErrors({}); }} className="ml-auto flex items-center gap-2 px-4 py-2 bg-[#27A9E1] text-white rounded-xl text-sm font-medium hover:bg-[#1E8BBF] transition-colors shadow-sm">
            <FiPlus size={15} />Nuevo beneficio
          </button>
        )}
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 space-y-3">{[1,2,3].map(i => <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />)}</div>
          ) : beneficios.length === 0 ? (
            <div className="p-12 text-center"><div className="text-5xl mb-3">🎓</div><p className="text-gray-500 font-medium">No hay beneficios configurados</p></div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Código','Nombre','Categoría','Tipo cálculo','Valor / %','Req. doc.','Req. aut.','Prio.','Estado','Acciones'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {beneficios.map(b => (
                  <tr key={b.id} className={`hover:bg-blue-50/30 transition-colors ${!b.activo ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{b.codigo}</td>
                    <td className="px-4 py-3 font-medium text-gray-800 max-w-[180px]">
                      <div className="truncate">{b.nombre}</div>
                      {b.descripcion && <div className="text-xs text-gray-400 truncate">{b.descripcion}</div>}
                    </td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${categoriaBadge[b.categoria]}`}>{b.categoria}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-xs text-gray-600">{tipoCalcIcon[b.tipo_calculo]}<span>{b.tipo_calculo}</span></div>
                    </td>
                    <td className="px-4 py-3 text-gray-700 font-medium">
                      {b.tipo_calculo === 'PORCENTAJE' ? (b.porcentaje_predeterminado != null ? `${b.porcentaje_predeterminado}%` : <span className="text-gray-400 italic">configurable</span>) :
                       b.tipo_calculo === 'VALOR_FIJO' ? (b.valor_predeterminado != null ? `$${b.valor_predeterminado}` : <span className="text-gray-400 italic">configurable</span>) :
                       b.tipo_calculo === 'EXONERACION_TOTAL' ? '$0.00' : <span className="text-gray-400 italic">especial</span>}
                    </td>
                    <td className="px-4 py-3 text-center">{b.requiere_documento ? '✅' : '—'}</td>
                    <td className="px-4 py-3 text-center">{b.requiere_autorizacion ? '✅' : '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#27A9E1]/10 text-[#27A9E1] text-xs font-bold">{b.prioridad}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${b.activo ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-400'}`}>{b.activo ? 'Activo' : 'Inactivo'}</span>
                    </td>
                    <td className="px-4 py-3">
                      {isAdmin && (
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleEditar(b)} title="Editar" className="p-1.5 text-gray-400 hover:text-[#27A9E1] hover:bg-blue-50 rounded-lg transition-colors"><FiEdit2 size={14} /></button>
                          <button onClick={() => handleToggleActivo(b)} title={b.activo ? 'Desactivar' : 'Activar'} className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors">
                            {b.activo ? <FiToggleRight size={16} /> : <FiToggleLeft size={16} />}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal formulario */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center pt-6 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-800">{editId ? 'Editar beneficio' : 'Nuevo tipo de beneficio'}</h3>
              <button onClick={() => { setShowForm(false); setEditId(null); }} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Código <span className="text-red-500">*</span></label>
                  <input value={form.codigo} onChange={e => setForm(p => ({ ...p, codigo: e.target.value.toUpperCase() }))} disabled={!!editId} placeholder="BECA_10" className={`w-full border rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#27A9E1] ${errors.codigo ? 'border-red-300' : 'border-gray-200'} ${editId ? 'bg-gray-50' : ''}`} />
                  <InputError msg={errors.codigo} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prioridad</label>
                  <input type="number" min="0" value={form.prioridad} onChange={e => setForm(p => ({ ...p, prioridad: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#27A9E1]" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre <span className="text-red-500">*</span></label>
                <input value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#27A9E1] ${errors.nombre ? 'border-red-300' : 'border-gray-200'}`} />
                <InputError msg={errors.nombre} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <textarea value={form.descripcion} onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))} rows={2} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#27A9E1] resize-none" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categoría <span className="text-red-500">*</span></label>
                  <select value={form.categoria} onChange={e => setForm(p => ({ ...p, categoria: e.target.value }))} className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#27A9E1] ${errors.categoria ? 'border-red-300' : 'border-gray-200'}`}>
                    {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <InputError msg={errors.categoria} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de cálculo <span className="text-red-500">*</span></label>
                  <select value={form.tipo_calculo} onChange={e => setForm(p => ({ ...p, tipo_calculo: e.target.value, valor_predeterminado: '', porcentaje_predeterminado: '' }))} className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#27A9E1] ${errors.tipo_calculo ? 'border-red-300' : 'border-gray-200'}`}>
                    {TIPOS_CALCULO.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              {form.tipo_calculo === 'PORCENTAJE' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Porcentaje predeterminado (%) — dejar vacío si es configurable</label>
                  <input type="number" min="0" max="100" step="0.0001" value={form.porcentaje_predeterminado} onChange={e => setForm(p => ({ ...p, porcentaje_predeterminado: e.target.value }))} placeholder="Ej: 10" className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#27A9E1] ${errors.porcentaje_predeterminado ? 'border-red-300' : 'border-gray-200'}`} />
                  <InputError msg={errors.porcentaje_predeterminado} />
                </div>
              )}

              {form.tipo_calculo === 'VALOR_FIJO' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valor fijo predeterminado ($) — dejar vacío si es configurable</label>
                  <input type="number" min="0" step="0.01" value={form.valor_predeterminado} onChange={e => setForm(p => ({ ...p, valor_predeterminado: e.target.value }))} placeholder="Ej: 5.00" className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#27A9E1] ${errors.valor_predeterminado ? 'border-red-300' : 'border-gray-200'}`} />
                  <InputError msg={errors.valor_predeterminado} />
                </div>
              )}

              {form.tipo_calculo === 'VALOR_FINAL' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valor final especial ($) — dejar vacío si se define en la asignación individual</label>
                  <input type="number" min="0" step="0.01" value={form.valor_predeterminado} onChange={e => setForm(p => ({ ...p, valor_predeterminado: e.target.value }))} className={`w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#27A9E1]`} />
                </div>
              )}

              <div className="space-y-2">
                {[
                  { key: 'requiere_documento',    label: 'Requiere documento de respaldo' },
                  { key: 'requiere_autorizacion',  label: 'Requiere autorización administrativa' },
                  { key: 'permite_acumulacion',    label: 'Permite acumulación con otros beneficios' },
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={!!form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.checked }))} className="w-4 h-4 accent-[#27A9E1]" />
                    <span className="text-sm text-gray-700">{label}</span>
                  </label>
                ))}
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowForm(false); setEditId(null); }} className="flex-1 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 py-2 bg-[#27A9E1] text-white rounded-xl text-sm font-medium hover:bg-[#1E8BBF] disabled:opacity-50">
                  {saving ? 'Guardando...' : editId ? 'Actualizar' : 'Crear beneficio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
