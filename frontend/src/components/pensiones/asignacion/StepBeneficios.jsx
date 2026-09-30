import React, { useState, useEffect } from 'react';
import { getSugerencias } from '../../../services/asignacionPensionService';
import api from '../../../services/api';
import { FiPlus, FiTrash2, FiInfo, FiPercent, FiDollarSign, FiStar, FiAlertCircle } from 'react-icons/fi';
import Swal from 'sweetalert2';

export default function StepBeneficios({ formData, updateFormData }) {
  const [catalog, setCatalog] = useState([]);
  const [sugerencias, setSugerencias] = useState([]);
  const [loading, setLoading] = useState(true);

  // Formulario para agregar un nuevo beneficio
  const [selectedId, setSelectedId] = useState('');
  const [customPct, setCustomPct] = useState('');
  const [customVal, setCustomVal] = useState('');
  const [motivo, setMotivo] = useState('');

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line
  }, [formData.matriculaId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Cargar catálogo activo
      const resCat = await api.get('/pensiones/configuracion/beneficios?estado=ACTIVO');
      setCatalog(resCat.data.beneficios || []);

      // 2. Cargar sugerencias
      if (formData.matriculaId) {
        const resSug = await getSugerencias(formData.matriculaId);
        if (resSug.success) setSugerencias(resSug.sugerencias);
      }
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  };

  const handleAdd = () => {
    if (!selectedId) return;
    const catItem = catalog.find(c => c.id === parseInt(selectedId));
    if (!catItem) return;

    // Verificar si ya está agregado
    if (formData.beneficios.some(b => b.tipo_beneficio_id === catItem.id)) {
      return Swal.fire('Atención', 'Este beneficio ya está agregado.', 'warning');
    }

    const newB = {
      tipo_beneficio_id: catItem.id,
      nombre: catItem.nombre,
      categoria: catItem.categoria,
      tipo_calculo_snapshot: catItem.tipo_calculo,
      porcentaje_aplicado: customPct ? parseFloat(customPct) : catItem.porcentaje_predeterminado,
      valor_aplicado: customVal ? parseFloat(customVal) : catItem.valor_predeterminado,
      valor_final_especial: catItem.tipo_calculo === 'VALOR_FINAL' ? (customVal ? parseFloat(customVal) : catItem.valor_predeterminado) : null,
      prioridad_snapshot: catItem.prioridad || 0,
      motivo: motivo,
      requiere_documento_snapshot: catItem.requiere_documento,
    };

    updateFormData('beneficios', [...formData.beneficios, newB]);
    
    // Limpiar formulario
    setSelectedId('');
    setCustomPct('');
    setCustomVal('');
    setMotivo('');
  };

  const handleRemove = (id) => {
    updateFormData('beneficios', formData.beneficios.filter(b => b.tipo_beneficio_id !== id));
  };

  const catSelected = catalog.find(c => c.id === parseInt(selectedId));

  return (
    <div className="animate-fade-in max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">Becas y Descuentos</h2>
        <p className="text-sm text-gray-500">Agregue los beneficios aplicables. El sistema verificará incompatibilidades automáticamente.</p>
      </div>

      {/* Sugerencias Inteligentes */}
      {sugerencias.length > 0 && (
        <div className="mb-8 space-y-3">
          <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2"><FiStar className="text-amber-500" /> Sugerencias del Sistema</h3>
          {sugerencias.map((sug, i) => (
            <div key={i} className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start gap-3">
              <FiInfo className="text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-bold text-amber-800 text-sm">{sug.titulo}</h4>
                <p className="text-sm text-amber-700 mt-1">{sug.descripcion}</p>
                {sug.tipo === 'HERMANOS' && sug.hermanos && (
                  <ul className="mt-2 text-xs text-amber-800 list-disc pl-5">
                    {sug.hermanos.map(h => <li key={h.matricula_id}>{h.nombres} {h.apellidos} - {h.curso_nombre}</li>)}
                  </ul>
                )}
                <div className="mt-3 text-xs font-bold text-amber-900 bg-amber-200/50 inline-block px-3 py-1 rounded-full">
                  Recomendación: {sug.accion_recomendada}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Formulario Add */}
        <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200">
          <h3 className="text-md font-bold text-gray-800 mb-4">Agregar Beneficio</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Beneficio del catálogo</label>
              <select
                value={selectedId}
                onChange={e => setSelectedId(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-[#27A9E1] outline-none"
              >
                <option value="">Seleccione...</option>
                {catalog.map(c => <option key={c.id} value={c.id}>{c.nombre} ({c.codigo})</option>)}
              </select>
            </div>

            {catSelected && (
              <div className="bg-white p-3 rounded-xl border border-gray-200 text-sm animate-fade-in">
                <div className="flex justify-between items-center mb-2 border-b pb-2">
                  <span className="font-bold text-gray-700">Tipo:</span>
                  <span className="bg-gray-100 px-2 py-0.5 rounded text-xs font-bold">{catSelected.tipo_calculo}</span>
                </div>
                
                {catSelected.tipo_calculo === 'PORCENTAJE' && (
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Porcentaje a aplicar (%)</label>
                    <div className="relative">
                      <FiPercent className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                      <input type="number" step="0.01" min="0" max="100" placeholder={catSelected.porcentaje_predeterminado} value={customPct} onChange={e => setCustomPct(e.target.value)} className="w-full pl-9 pr-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-[#27A9E1]" />
                    </div>
                  </div>
                )}

                {(catSelected.tipo_calculo === 'MONTO_FIJO' || catSelected.tipo_calculo === 'VALOR_FINAL') && (
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Valor a aplicar ($)</label>
                    <div className="relative">
                      <FiDollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                      <input type="number" step="0.01" min="0" placeholder={catSelected.valor_predeterminado} value={customVal} onChange={e => setCustomVal(e.target.value)} className="w-full pl-9 pr-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-[#27A9E1]" />
                    </div>
                  </div>
                )}
                
                {catSelected.requiere_documento === 1 && (
                  <p className="text-xs text-red-500 mt-2 font-bold"><FiAlertCircle className="inline" /> Requerirá adjuntar documento de respaldo.</p>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Motivo / Justificación</label>
              <input type="text" value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Opcional..." className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-[#27A9E1] outline-none" />
            </div>

            <button
              onClick={handleAdd}
              disabled={!selectedId}
              className="w-full flex items-center justify-center gap-2 bg-gray-800 text-white rounded-xl py-2.5 font-medium hover:bg-gray-900 transition-colors disabled:opacity-50"
            >
              <FiPlus /> Agregar a la lista
            </button>
          </div>
        </div>

        {/* Lista de Seleccionados y Simulador en tiempo real */}
        <div>
          <h3 className="text-md font-bold text-gray-800 mb-4">Beneficios Aplicados ({formData.beneficios.length})</h3>
          
          <div className="space-y-3 mb-6">
            {formData.beneficios.length === 0 ? (
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center text-gray-400 text-sm">
                No hay beneficios agregados. Aplica pensión completa.
              </div>
            ) : (
              formData.beneficios.map((b, i) => (
                <div key={i} className="bg-white border border-gray-200 rounded-xl p-3 flex justify-between items-center shadow-sm">
                  <div>
                    <p className="font-bold text-sm text-gray-800">{b.nombre}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {b.tipo_calculo_snapshot === 'PORCENTAJE' ? `${b.porcentaje_aplicado}%` : `$${parseFloat(b.valor_aplicado || b.valor_final_especial).toFixed(2)}`} • {b.categoria}
                    </p>
                  </div>
                  <button onClick={() => handleRemove(b.tipo_beneficio_id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                    <FiTrash2 size={16} />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Mini-Simulador (solo lectura) */}
          <div className="bg-[#27A9E1]/10 rounded-2xl p-5 border border-[#27A9E1]/20">
            <h3 className="text-sm font-bold text-[#27A9E1] mb-3 uppercase tracking-wider">Cálculo Proyectado</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Tarifa Base</span>
                <span className="font-mono">${formData.tarifa ? parseFloat(formData.tarifa.valor_mensual).toFixed(2) : '0.00'}</span>
              </div>
              <div className="flex justify-between text-emerald-600 font-medium">
                <span>Total Descuentos</span>
                <span className="font-mono">
                  -${formData.calculoFinal ? parseFloat(parseFloat(formData.calculoFinal.descuento_fijo) + parseFloat(formData.calculoFinal.monto_descuento_pct || 0)).toFixed(2) : '0.00'}
                </span>
              </div>
              <div className="border-t border-[#27A9E1]/20 my-2 pt-2 flex justify-between font-bold text-lg text-gray-900">
                <span>Pensión Mensual Final</span>
                <span className="font-mono">${formData.calculoFinal ? parseFloat(formData.calculoFinal.valor_final).toFixed(2) : '0.00'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
