import React, { useState, useEffect } from 'react';
import { FiX, FiAlertCircle, FiUploadCloud, FiTrash2, FiCalendar, FiBookOpen, FiDollarSign } from 'react-icons/fi';
import Swal from 'sweetalert2';
import movimientosFinancierosService from '../../services/movimientosFinancierosService';
import personalService from '../../services/personalService';

const MovimientoFormModal = ({ isOpen, onClose, onSuccess, mode = 'create', data = null, datosFormulario }) => {
  const { periodos = [], conceptos = [], cuentas = [] } = datosFormulario || {};
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [personalActivo, setPersonalActivo] = useState([]);

  const periodoActivo = periodos.find(p => p.activo)?.id || '';

  const initialForm = {
    periodo_lectivo_id: periodoActivo,
    fecha: new Date().toISOString().split('T')[0],
    catalogo_movimiento_id: '',
    descripcion: '',
    valor: '',
    cuenta_financiera_id: '',
    mes_aplicacion: '',
    personal_id: '',
    observacion: '',
    notas: '',
    numero_comprobante: '',
    motivo_edicion: '',
  };

  const [formData, setFormData] = useState(initialForm);
  const [archivo, setArchivo] = useState(null);
  const [conceptoSeleccionado, setConceptoSeleccionado] = useState(null);

  useEffect(() => {
    const fetchPersonal = async () => {
      try {
        const res = await personalService.getAll({ estado: 'ACTIVO', limit: 1000 });
        if (res.success) setPersonalActivo(res.data);
      } catch (error) {
        console.error('Error cargando personal', error);
      }
    };
    fetchPersonal();
  }, []);

  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && data) {
        setFormData({
          periodo_lectivo_id: data.periodo_lectivo_id || periodoActivo,
          fecha: data.fecha ? data.fecha.split('T')[0] : '',
          catalogo_movimiento_id: data.catalogo_movimiento_id || '',
          descripcion: data.descripcion || '',
          valor: data.valor ? parseFloat(data.valor).toFixed(2) : '',
          cuenta_financiera_id: data.cuenta_financiera_id || '',
          mes_aplicacion: data.mes_aplicacion ? data.mes_aplicacion.split('T')[0] : '',
          personal_id: data.personal_id || '',
          observacion: data.observacion || '',
          notas: data.notas || '',
          numero_comprobante: data.numero_comprobante || '',
          motivo_edicion: '',
        });
        const conc = conceptos.find(c => c.id === data.catalogo_movimiento_id);
        setConceptoSeleccionado(conc || null);
      } else {
        setFormData(initialForm);
        setConceptoSeleccionado(null);
      }
      setArchivo(null);
      setErrors({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, mode, data, periodos, conceptos]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'catalogo_movimiento_id') {
      const conc = conceptos.find(c => c.id === parseInt(value));
      setConceptoSeleccionado(conc || null);
      setFormData(prev => ({ 
        ...prev, 
        [name]: value,
        mes_aplicacion: conc && !conc.requiere_mes ? '' : prev.mes_aplicacion,
        personal_id: conc && !conc.requiere_personal ? '' : prev.personal_id,
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setErrors(prev => ({ ...prev, archivo: 'El archivo excede el límite de 5MB.' }));
        return;
      }
      setArchivo(file);
      setErrors(prev => ({ ...prev, archivo: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const newErrors = {};
    if (!formData.periodo_lectivo_id) newErrors.periodo_lectivo_id = 'Requerido';
    if (!formData.fecha) newErrors.fecha = 'Requerido';
    if (!formData.catalogo_movimiento_id) newErrors.catalogo_movimiento_id = 'Requerido';
    if (!formData.descripcion.trim()) newErrors.descripcion = 'Requerido';
    if (!formData.cuenta_financiera_id) newErrors.cuenta_financiera_id = 'Requerido';
    
    const valorNum = parseFloat(formData.valor);
    if (!formData.valor || isNaN(valorNum) || valorNum <= 0) {
      newErrors.valor = 'Debe ser mayor a 0';
    } else {
      const parts = String(formData.valor).split('.');
      if (parts[1] && parts[1].length > 2) newErrors.valor = 'Máximo 2 decimales';
    }

    if (conceptoSeleccionado?.requiere_mes && !formData.mes_aplicacion) {
      newErrors.mes_aplicacion = 'Requerido para este concepto';
    }
    
    if (conceptoSeleccionado?.requiere_personal && !formData.personal_id) {
      newErrors.personal_id = 'Requerido para este concepto';
    }

    if (mode === 'edit' && !formData.motivo_edicion.trim()) {
      newErrors.motivo_edicion = 'Debe indicar un motivo de edición';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSaving(true);
    try {
      const form = new FormData();
      Object.keys(formData).forEach(key => {
        if (formData[key] !== null && formData[key] !== '') {
          form.append(key, formData[key]);
        }
      });
      if (archivo) {
        form.append('archivo', archivo);
      }

      let res;
      if (mode === 'create') {
        res = await movimientosFinancierosService.create(form);
      } else {
        res = await movimientosFinancierosService.update(data.id, form);
      }

      if (res.success) {
        if (res.advertencia_duplicado) {
          Swal.fire('Advertencia', res.advertencia_duplicado, 'warning');
        } else {
          Swal.fire({
            icon: 'success',
            title: mode === 'create' ? 'Guardado' : 'Actualizado',
            toast: true,
            position: 'top-end',
            timer: 2000,
            showConfirmButton: false,
          });
        }
        onSuccess();
        onClose();
      }
    } catch (error) {
      const msg = error.response?.data?.message || 'Error al guardar el movimiento.';
      Swal.fire('Error', msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl animate-scale-in">
        
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <div>
            <h2 className="text-lg font-bold text-gray-800">
              {mode === 'create' ? 'Registrar Movimiento Financiero' : 'Editar Movimiento'}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">Complete la información del ingreso o egreso</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-xl transition-colors">
            <FiX size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <form id="movimiento-form" onSubmit={handleSubmit} className="space-y-6">
            
            <div>
              <h3 className="text-sm font-semibold text-[#27A9E1] mb-4 flex items-center gap-2">
                <FiCalendar /> Datos Generales
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Concepto Financiero <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <select
                      name="catalogo_movimiento_id"
                      value={formData.catalogo_movimiento_id}
                      onChange={handleChange}
                      className={`w-full pl-3 pr-10 py-2.5 bg-gray-50 border rounded-xl text-sm focus:ring-2 focus:outline-none appearance-none ${
                        errors.catalogo_movimiento_id ? 'border-red-300 focus:ring-red-200 focus:border-red-400' : 'border-gray-200 focus:ring-[#27A9E1]/30 focus:border-[#27A9E1]'
                      }`}
                    >
                      <option value="">Seleccione un concepto...</option>
                      {conceptos.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.codigo} - {c.nombre}
                        </option>
                      ))}
                    </select>
                    {conceptoSeleccionado && (
                      <div className="absolute right-8 top-1/2 -translate-y-1/2 pointer-events-none">
                        <span className={`px-2 py-0.5 text-xs font-bold rounded-md ${conceptoSeleccionado.tipo === 'INGRESO' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {conceptoSeleccionado.tipo}
                        </span>
                      </div>
                    )}
                  </div>
                  {errors.catalogo_movimiento_id && <p className="text-red-500 text-xs mt-1">{errors.catalogo_movimiento_id}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Periodo Lectivo <span className="text-red-500">*</span></label>
                  <select
                    name="periodo_lectivo_id"
                    value={formData.periodo_lectivo_id}
                    onChange={handleChange}
                    className={`w-full px-3 py-2.5 bg-gray-50 border rounded-xl text-sm focus:ring-2 focus:outline-none ${errors.periodo_lectivo_id ? 'border-red-300' : 'border-gray-200 focus:ring-[#27A9E1]/30'}`}
                  >
                    <option value="">Seleccione...</option>
                    {periodos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                  {errors.periodo_lectivo_id && <p className="text-red-500 text-xs mt-1">{errors.periodo_lectivo_id}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Fecha del Movimiento <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    name="fecha"
                    value={formData.fecha}
                    onChange={handleChange}
                    className={`w-full px-3 py-2.5 bg-gray-50 border rounded-xl text-sm focus:ring-2 focus:outline-none ${errors.fecha ? 'border-red-300' : 'border-gray-200 focus:ring-[#27A9E1]/30'}`}
                  />
                  {errors.fecha && <p className="text-red-500 text-xs mt-1">{errors.fecha}</p>}
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-[#27A9E1] mb-4 flex items-center gap-2 pt-4 border-t border-gray-100">
                <FiDollarSign /> Detalle del Valor
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Descripción <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    name="descripcion"
                    maxLength={250}
                    value={formData.descripcion}
                    onChange={handleChange}
                    placeholder="Ej. Pago de mensualidad Julio..."
                    className={`w-full px-3 py-2.5 bg-gray-50 border rounded-xl text-sm focus:ring-2 focus:outline-none ${errors.descripcion ? 'border-red-300' : 'border-gray-200 focus:ring-[#27A9E1]/30'}`}
                  />
                  {errors.descripcion && <p className="text-red-500 text-xs mt-1">{errors.descripcion}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Valor ($) <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    step="0.01"
                    name="valor"
                    value={formData.valor}
                    onChange={handleChange}
                    placeholder="0.00"
                    className={`w-full px-3 py-2.5 bg-gray-50 border rounded-xl text-sm font-mono focus:ring-2 focus:outline-none ${errors.valor ? 'border-red-300' : 'border-gray-200 focus:ring-[#27A9E1]/30'}`}
                  />
                  {errors.valor && <p className="text-red-500 text-xs mt-1">{errors.valor}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Cuenta Financiera <span className="text-red-500">*</span></label>
                  <select
                    name="cuenta_financiera_id"
                    value={formData.cuenta_financiera_id}
                    onChange={handleChange}
                    className={`w-full px-3 py-2.5 bg-gray-50 border rounded-xl text-sm focus:ring-2 focus:outline-none ${errors.cuenta_financiera_id ? 'border-red-300' : 'border-gray-200 focus:ring-[#27A9E1]/30'}`}
                  >
                    <option value="">Seleccione...</option>
                    {cuentas.map(c => <option key={c.id} value={c.id}>{c.nombre} ({c.tipo})</option>)}
                  </select>
                  {errors.cuenta_financiera_id && <p className="text-red-500 text-xs mt-1">{errors.cuenta_financiera_id}</p>}
                </div>
              </div>
            </div>

            {conceptoSeleccionado && (conceptoSeleccionado.requiere_mes || conceptoSeleccionado.requiere_personal) && (
              <div>
                <h3 className="text-sm font-semibold text-[#F4C542] mb-4 flex items-center gap-2 pt-4 border-t border-gray-100">
                  <FiAlertCircle /> Requisitos Adicionales
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {conceptoSeleccionado.requiere_mes && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Mes de Aplicación <span className="text-red-500">*</span></label>
                      <input
                        type="date"
                        name="mes_aplicacion"
                        value={formData.mes_aplicacion}
                        onChange={handleChange}
                        className={`w-full px-3 py-2.5 bg-amber-50/30 border rounded-xl text-sm focus:ring-2 focus:outline-none ${errors.mes_aplicacion ? 'border-red-300' : 'border-amber-200 focus:ring-amber-400/30'}`}
                      />
                      <p className="text-[10px] text-gray-400 mt-1">Seleccione cualquier día del mes aplicable.</p>
                      {errors.mes_aplicacion && <p className="text-red-500 text-xs mt-1">{errors.mes_aplicacion}</p>}
                    </div>
                  )}

                  {/* Personal */}
                  {conceptoSeleccionado.requiere_personal && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Personal Relacionado <span className={conceptoSeleccionado.codigo === 'SPDOCE' ? 'text-red-500' : ''}>*</span></label>
                      <select disabled className="w-full px-3 py-2.5 bg-gray-100 border border-gray-200 rounded-xl text-sm text-gray-500 cursor-not-allowed">
                        <option>Módulo de personal no disponible aún</option>
                      </select>
                      {errors.personal_id && <p className="text-red-500 text-xs mt-1">{errors.personal_id}</p>}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── SECCIÓN 4: Extras ── */}
            <div>
              <h3 className="text-sm font-semibold text-[#27A9E1] mb-4 flex items-center gap-2 pt-4 border-t border-gray-100">
                <FiBookOpen /> Información Adicional
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Comprobante */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">N° Comprobante (Opcional)</label>
                  <input
                    type="text"
                    name="numero_comprobante"
                    maxLength={100}
                    value={formData.numero_comprobante}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:outline-none focus:ring-[#27A9E1]/30 focus:border-[#27A9E1]"
                  />
                </div>

                {/* Archivo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Documento Adjunto (Opcional)</label>
                  <div className="flex items-center gap-2">
                    <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 border border-dashed border-gray-300 rounded-xl text-sm text-gray-600 hover:bg-gray-50 hover:border-[#27A9E1] cursor-pointer transition-colors">
                      <FiUploadCloud size={18} className={archivo ? 'text-[#27A9E1]' : 'text-gray-400'} />
                      <span className="truncate max-w-[150px]">{archivo ? archivo.name : 'Subir PDF o Imagen (Max 5MB)'}</span>
                      <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleFileChange} />
                    </label>
                    {archivo && (
                      <button type="button" onClick={() => setArchivo(null)} className="p-2.5 text-red-500 bg-red-50 rounded-xl hover:bg-red-100">
                        <FiTrash2 size={16} />
                      </button>
                    )}
                  </div>
                  {errors.archivo && <p className="text-red-500 text-xs mt-1">{errors.archivo}</p>}
                </div>

                {/* Observación */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Observación (Opcional)</label>
                  <input
                    type="text"
                    name="observacion"
                    maxLength={500}
                    value={formData.observacion}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:outline-none focus:ring-[#27A9E1]/30 focus:border-[#27A9E1]"
                  />
                </div>

                {/* Notas */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Notas Extensas (Opcional)</label>
                  <textarea
                    name="notas"
                    rows={3}
                    value={formData.notas}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:outline-none focus:ring-[#27A9E1]/30 focus:border-[#27A9E1] resize-none"
                  ></textarea>
                </div>

                {/* Motivo edición (solo en modo editar) */}
                {mode === 'edit' && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Motivo de Edición <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      name="motivo_edicion"
                      value={formData.motivo_edicion}
                      onChange={handleChange}
                      placeholder="Ej. Corrección de valor ingresado..."
                      className={`w-full px-3 py-2.5 bg-red-50/30 border rounded-xl text-sm focus:ring-2 focus:outline-none ${errors.motivo_edicion ? 'border-red-300' : 'border-red-200 focus:ring-red-400/30'}`}
                    />
                    {errors.motivo_edicion && <p className="text-red-500 text-xs mt-1">{errors.motivo_edicion}</p>}
                  </div>
                )}
                
              </div>
            </div>

          </form>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            form="movimiento-form"
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 text-sm font-medium text-white bg-[#27A9E1] rounded-xl hover:bg-[#1e8bbf] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center min-w-[120px] transition-colors shadow-md shadow-[#27A9E1]/20"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : mode === 'create' ? 'Registrar' : 'Guardar Cambios'}
          </button>
        </div>

      </div>
    </div>
  );
};

export default MovimientoFormModal;
