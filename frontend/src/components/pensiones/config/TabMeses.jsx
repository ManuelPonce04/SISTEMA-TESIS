import React, { useState, useEffect, useCallback } from 'react';
import { FiPlus, FiEdit2, FiRefreshCw, FiCalendar, FiZap } from 'react-icons/fi';
import Swal from 'sweetalert2';
import { getMeses, crearMes, generarMeses, actualizarMes, cambiarEstadoMes } from '../../../services/pensionesConfigService';

const MESES_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const estadoBadge = {
  PLANIFICADO: 'bg-blue-100 text-blue-700',
  ABIERTO:     'bg-emerald-100 text-emerald-700',
  CERRADO:     'bg-slate-100 text-slate-500',
  CANCELADO:   'bg-red-100 text-red-500',
};

function formatMes(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return `${MESES_ES[d.getMonth()]} ${d.getFullYear()}`;
}

export default function TabMeses({ catalogos, isAdmin }) {
  const [meses, setMeses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [periodoFiltro, setPeriodoFiltro] = useState('');
  const [showWizard, setShowWizard] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editMes, setEditMes] = useState(null);
  const [wizard, setWizard] = useState({ periodo_lectivo_id: '', mes_desde: '', mes_hasta: '', dia_vencimiento: 10, politica: 'DIA_FIJO', meses_excluidos: [] });
  const [previewMeses, setPreviewMeses] = useState(null);
  const [generando, setGenerando] = useState(false);

  const { periodos = [] } = catalogos || {};

  const fetchMeses = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (periodoFiltro) params.periodo_lectivo_id = periodoFiltro;
      const res = await getMeses(params);
      if (res.success) setMeses(res.meses);
    } catch { Swal.fire('Error', 'No se pudieron cargar los meses cobrables.', 'error'); }
    finally { setLoading(false); }
  }, [periodoFiltro]);

  useEffect(() => { fetchMeses(); }, [fetchMeses]);

  // Preview local de los meses que se generarán
  const generarPreview = () => {
    if (!wizard.mes_desde || !wizard.mes_hasta || !wizard.dia_vencimiento) return;
    const desde = new Date(wizard.mes_desde + 'T00:00:00');
    const hasta = new Date(wizard.mes_hasta + 'T00:00:00');
    const resultado = [];
    const cursor = new Date(desde.getFullYear(), desde.getMonth(), 1);
    let orden = 1;
    while (cursor <= hasta) {
      const anio = cursor.getFullYear();
      const mes = cursor.getMonth() + 1;
      const primerDia = `${anio}-${String(mes).padStart(2,'0')}-01`;
      if (!wizard.meses_excluidos.includes(primerDia)) {
        const ultimoDia = new Date(anio, mes, 0).getDate();
        const diaValido = Math.min(parseInt(wizard.dia_vencimiento), ultimoDia);
        resultado.push({ mes: primerDia, nombre: `${MESES_ES[mes-1]} ${anio}`, orden, vencimiento: `${anio}-${String(mes).padStart(2,'0')}-${String(diaValido).padStart(2,'0')}` });
        orden++;
      }
      cursor.setMonth(cursor.getMonth() + 1);
    }
    setPreviewMeses(resultado);
  };

  useEffect(() => { if (showWizard) generarPreview(); }, [wizard.mes_desde, wizard.mes_hasta, wizard.dia_vencimiento, wizard.meses_excluidos]);

  const toggleExcluir = (mes) => {
    setWizard(p => ({
      ...p,
      meses_excluidos: p.meses_excluidos.includes(mes) ? p.meses_excluidos.filter(m => m !== mes) : [...p.meses_excluidos, mes]
    }));
  };

  const handleGenerarConfirmar = async () => {
    if (!wizard.periodo_lectivo_id) return Swal.fire('Atención', 'Seleccione un periodo lectivo.', 'warning');
    setGenerando(true);
    try {
      const res = await generarMeses({
        periodo_lectivo_id: parseInt(wizard.periodo_lectivo_id),
        mes_desde: wizard.mes_desde + '-01',
        mes_hasta: wizard.mes_hasta + '-01',
        dia_vencimiento: parseInt(wizard.dia_vencimiento),
        politica_vencimiento: wizard.politica,
        meses_excluidos: wizard.meses_excluidos,
      });
      if (res.success) {
        Swal.fire({ icon: 'success', title: res.message, timer: 2500, showConfirmButton: false });
        setShowWizard(false); setPreviewMeses(null); fetchMeses();
      }
    } catch (err) {
      Swal.fire('Error', err.response?.data?.message || 'Error al generar meses.', 'error');
    } finally { setGenerando(false); }
  };

  const handleCambiarEstado = async (mes, estado) => {
    try {
      await cambiarEstadoMes(mes.id, estado);
      fetchMeses();
    } catch (err) { Swal.fire('Error', err.response?.data?.message || 'Error.', 'error'); }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      await actualizarMes(editMes.id, { fecha_vencimiento: editMes.fecha_vencimiento?.split('T')[0], cobrable: editMes.cobrable, observacion: editMes.observacion });
      Swal.fire({ icon: 'success', title: 'Mes actualizado', timer: 1500, showConfirmButton: false });
      setShowEditModal(false); fetchMeses();
    } catch (err) { Swal.fire('Error', err.response?.data?.message || 'Error.', 'error'); }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Periodo</label>
          <select value={periodoFiltro} onChange={e => setPeriodoFiltro(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#27A9E1]">
            <option value="">Todos los periodos</option>
            {periodos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </div>
        <button onClick={fetchMeses} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"><FiRefreshCw size={13} />Actualizar</button>
        {isAdmin && (
          <button onClick={() => { setShowWizard(true); setPreviewMeses(null); }} className="ml-auto flex items-center gap-2 px-4 py-2 bg-[#27A9E1] text-white rounded-xl text-sm font-medium hover:bg-[#1E8BBF] transition-colors shadow-sm">
            <FiZap size={15} />Generar meses del periodo
          </button>
        )}
      </div>

      {/* Grid de meses */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : meses.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
          <div className="text-5xl mb-3">📅</div>
          <p className="text-gray-500 font-medium">No hay meses cobrables configurados</p>
          <p className="text-gray-400 text-sm mt-1">Usa el asistente para generar los meses del periodo.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          {meses.map(m => (
            <div key={m.id} className={`bg-white rounded-2xl border shadow-sm p-4 flex flex-col gap-2 ${m.estado === 'CERRADO' ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between">
                <FiCalendar size={16} className="text-[#27A9E1] mt-0.5" />
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${estadoBadge[m.estado] || 'bg-gray-100 text-gray-500'}`}>{m.estado}</span>
              </div>
              <div>
                <p className="font-bold text-gray-800 text-sm">{m.nombre_mostrar}</p>
                <p className="text-xs text-gray-500 mt-0.5">Vence: {m.fecha_vencimiento?.split('T')[0]}</p>
              </div>
              <div className="text-xs">
                {m.cobrable ? <span className="text-emerald-600 font-medium">● Cobrable</span> : <span className="text-gray-400">○ No cobrable</span>}
              </div>
              {isAdmin && (
                <div className="flex gap-1 mt-1">
                  <button onClick={() => { setEditMes({ ...m, fecha_vencimiento: m.fecha_vencimiento?.split('T')[0] }); setShowEditModal(true); }} className="flex-1 py-1 text-xs text-[#27A9E1] border border-[#27A9E1]/30 rounded-lg hover:bg-blue-50 transition-colors">Editar</button>
                  {m.estado === 'PLANIFICADO' && <button onClick={() => handleCambiarEstado(m, 'ABIERTO')} className="flex-1 py-1 text-xs text-emerald-600 border border-emerald-200 rounded-lg hover:bg-emerald-50 transition-colors">Abrir</button>}
                  {m.estado === 'ABIERTO' && <button onClick={() => handleCambiarEstado(m, 'CERRADO')} className="flex-1 py-1 text-xs text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">Cerrar</button>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Wizard de generación masiva */}
      {showWizard && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center pt-8 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2"><FiZap className="text-[#27A9E1]" />Asistente de meses cobrables</h3>
              <button onClick={() => setShowWizard(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg text-xl">×</button>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Periodo lectivo</label>
                <select value={wizard.periodo_lectivo_id} onChange={e => setWizard(p => ({ ...p, periodo_lectivo_id: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#27A9E1]">
                  <option value="">Seleccionar periodo...</option>
                  {periodos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Primer mes (YYYY-MM)</label>
                  <input type="month" value={wizard.mes_desde} onChange={e => setWizard(p => ({ ...p, mes_desde: e.target.value, meses_excluidos: [] }))} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#27A9E1]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Último mes (YYYY-MM)</label>
                  <input type="month" value={wizard.mes_hasta} onChange={e => setWizard(p => ({ ...p, mes_hasta: e.target.value, meses_excluidos: [] }))} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#27A9E1]" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Día de vencimiento</label>
                  <input type="number" min="1" max="31" value={wizard.dia_vencimiento} onChange={e => setWizard(p => ({ ...p, dia_vencimiento: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#27A9E1]" />
                  <p className="text-xs text-gray-400 mt-1">Se ajusta automáticamente si el día no existe en el mes.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Política de vencimiento</label>
                  <select value={wizard.politica} onChange={e => setWizard(p => ({ ...p, politica: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#27A9E1]">
                    <option value="DIA_FIJO">Día fijo del mes</option>
                    <option value="ULTIMO_DIA">Último día del mes</option>
                  </select>
                </div>
              </div>

              {/* Preview */}
              {previewMeses && previewMeses.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Vista previa — {previewMeses.length} meses a generar</p>
                  <p className="text-xs text-gray-400 mb-2">Haz clic en un mes para excluirlo.</p>
                  <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                    {previewMeses.map(m => (
                      <button key={m.mes} type="button" onClick={() => toggleExcluir(m.mes)}
                        className={`p-2 rounded-lg text-xs text-left border transition-all ${wizard.meses_excluidos.includes(m.mes) ? 'bg-red-50 border-red-200 text-red-500 line-through opacity-60' : 'bg-blue-50 border-blue-100 text-blue-700 hover:bg-blue-100'}`}>
                        <div className="font-medium">{m.nombre}</div>
                        <div className="text-[10px] opacity-70">Vence: {m.vencimiento}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowWizard(false)} className="flex-1 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50">Cancelar</button>
                <button type="button" onClick={handleGenerarConfirmar} disabled={generando || !wizard.periodo_lectivo_id || !previewMeses?.length} className="flex-1 py-2 bg-[#27A9E1] text-white rounded-xl text-sm font-medium hover:bg-[#1E8BBF] disabled:opacity-50 transition-colors">
                  {generando ? 'Generando...' : `Confirmar (${previewMeses?.filter(m => !wizard.meses_excluidos.includes(m.mes)).length || 0} meses)`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal editar mes */}
      {showEditModal && editMes && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-800">Editar — {editMes.nombre_mostrar}</h3>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de vencimiento</label>
                <input type="date" value={editMes.fecha_vencimiento || ''} onChange={e => setEditMes(p => ({ ...p, fecha_vencimiento: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#27A9E1]" />
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="cobrable" checked={!!editMes.cobrable} onChange={e => setEditMes(p => ({ ...p, cobrable: e.target.checked }))} className="w-4 h-4 accent-[#27A9E1]" />
                <label htmlFor="cobrable" className="text-sm text-gray-700">Cobrable (genera obligación de pago)</label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observación</label>
                <textarea value={editMes.observacion || ''} onChange={e => setEditMes(p => ({ ...p, observacion: e.target.value }))} rows={2} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#27A9E1] resize-none" />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowEditModal(false)} className="flex-1 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50">Cancelar</button>
                <button type="submit" className="flex-1 py-2 bg-[#27A9E1] text-white rounded-xl text-sm font-medium hover:bg-[#1E8BBF]">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
