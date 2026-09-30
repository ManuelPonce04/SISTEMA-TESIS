import React, { useState, useEffect } from 'react';
import { FiX, FiSave, FiSettings, FiCheck, FiAlertCircle } from 'react-icons/fi';
import Swal from 'sweetalert2';
import { getInstitucionConfig, updateInstitucionConfig } from '../../../services/facturacionService';
import { validarRuc } from '../../../utils/sriValidation';

export default function ConfiguracionFacturacionModal({ isOpen, onClose, onSaved }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    razon_social: '',
    nombre_comercial: '',
    ruc: '',
    direccion_matriz: '',
    direccion_establecimiento: '',
    telefono: '',
    email: '',
    obligado_contabilidad: 'NO',
    contribuyente_especial: '',
    regimen: 'RIMPE_EMPRENDEDOR',
    ambiente: 1,
    codigo_establecimiento: '001',
    codigo_punto_emision: '001',
    tarifa_iva_defecto: 0.00,
    facturacion_automatica: 0
  });

  useEffect(() => {
    if (isOpen) {
      cargarConfig();
    }
  }, [isOpen]);

  const cargarConfig = async () => {
    setLoading(true);
    try {
      const res = await getInstitucionConfig();
      if (res.success && res.config) {
        setForm({
          ...res.config,
          ambiente: parseInt(res.config.ambiente) || 1,
          tarifa_iva_defecto: parseFloat(res.config.tarifa_iva_defecto) || 0.00,
          facturacion_automatica: res.config.facturacion_automatica ? 1 : 0
        });
      }
    } catch {
      Swal.fire('Error', 'No se pudo cargar la configuración.', 'error');
    }
    setLoading(false);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (checked ? 1 : 0) : value
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.razon_social.trim() || !form.ruc.trim()) {
      return Swal.fire('Atención', 'Razón social y RUC son requeridos.', 'warning');
    }

    if (!validarRuc(form.ruc.trim())) {
      return Swal.fire('RUC Inválido', 'El RUC debe tener 13 dígitos y cumplir el algoritmo de validación del SRI.', 'warning');
    }

    setSaving(true);
    try {
      const res = await updateInstitucionConfig(form);
      if (res.success) {
        Swal.fire({
          icon: 'success',
          title: 'Configuración guardada',
          text: 'Los datos del emisor han sido actualizados.',
          timer: 1800,
          showConfirmButton: false
        });
        if (onSaved) onSaved(res.config);
        onClose();
      }
    } catch (err) {
      Swal.fire('Error', err.response?.data?.message || 'Error al guardar.', 'error');
    }
    setSaving(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden my-auto animate-fade-in">
        
        {/* Header */}
        <div className="px-6 py-4 bg-[#0f172a] text-white flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#27A9E1]/20 flex items-center justify-center text-[#27A9E1]">
              <FiSettings size={18} />
            </div>
            <div>
              <h3 className="font-bold text-base">Configuración de Facturación</h3>
              <p className="text-xs text-slate-400">Datos fiscales y parámetros de emisión institucional</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition">
            <FiX size={20} />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-5 text-sm">
          {loading ? (
            <div className="py-12 text-center text-gray-400">Cargando configuración...</div>
          ) : (
            <>
              {/* Sección 1: Datos Emisor */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider pb-1 border-b">
                  Datos de la Institución (Emisor)
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Razón Social *</label>
                    <input
                      type="text"
                      name="razon_social"
                      value={form.razon_social}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-[#27A9E1]/30 focus:border-[#27A9E1] text-xs font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Nombre Comercial</label>
                    <input
                      type="text"
                      name="nombre_comercial"
                      value={form.nombre_comercial}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-[#27A9E1]/30 focus:border-[#27A9E1] text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">R.U.C. (13 dígitos) *</label>
                    <input
                      type="text"
                      name="ruc"
                      value={form.ruc}
                      onChange={handleChange}
                      maxLength={13}
                      required
                      className="w-full px-3 py-2 border rounded-xl font-mono focus:ring-2 focus:ring-[#27A9E1]/30 focus:border-[#27A9E1] text-xs font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Teléfono Institucional</label>
                    <input
                      type="text"
                      name="telefono"
                      value={form.telefono}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-[#27A9E1]/30 focus:border-[#27A9E1] text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Correo Electrónico</label>
                    <input
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-[#27A9E1]/30 focus:border-[#27A9E1] text-xs"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Dirección Matriz</label>
                    <input
                      type="text"
                      name="direccion_matriz"
                      value={form.direccion_matriz}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-[#27A9E1]/30 focus:border-[#27A9E1] text-xs"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Dirección Establecimiento / Sucursal</label>
                    <input
                      type="text"
                      name="direccion_establecimiento"
                      value={form.direccion_establecimiento}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-[#27A9E1]/30 focus:border-[#27A9E1] text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Sección 2: Régimen y SRI */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider pb-1 border-b">
                  Régimen Tributario y Puntos de Emisión
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Obligado Contabilidad</label>
                    <select
                      name="obligado_contabilidad"
                      value={form.obligado_contabilidad}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border rounded-xl bg-white text-xs"
                    >
                      <option value="NO">NO</option>
                      <option value="SI">SI</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Régimen</label>
                    <select
                      name="regimen"
                      value={form.regimen}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border rounded-xl bg-white text-xs"
                    >
                      <option value="RIMPE_EMPRENDEDOR">RIMPE Emprendedor</option>
                      <option value="RIMPE_POPULAR">RIMPE Negocio Popular</option>
                      <option value="GENERAL">Régimen General</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Ambiente SRI</label>
                    <select
                      name="ambiente"
                      value={form.ambiente}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border rounded-xl bg-white text-xs"
                    >
                      <option value={1}>1 - Pruebas</option>
                      <option value={2}>2 - Producción</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Establecimiento</label>
                    <input
                      type="text"
                      name="codigo_establecimiento"
                      value={form.codigo_establecimiento}
                      onChange={handleChange}
                      maxLength={3}
                      className="w-full px-3 py-2 border rounded-xl font-mono text-center text-xs font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Punto Emisión</label>
                    <input
                      type="text"
                      name="codigo_punto_emision"
                      value={form.codigo_punto_emision}
                      onChange={handleChange}
                      maxLength={3}
                      className="w-full px-3 py-2 border rounded-xl font-mono text-center text-xs font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Tarifa IVA Defecto</label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        name="tarifa_iva_defecto"
                        value={form.tarifa_iva_defecto}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border rounded-xl font-mono text-right pr-7 text-xs font-bold"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sección 3: Opciones de Operación */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider pb-1 border-b">
                  Automatización de Cobros
                </h4>

                <label className="flex items-start gap-3 p-3 bg-blue-50/60 border border-blue-100 rounded-xl cursor-pointer hover:bg-blue-50 transition">
                  <input
                    type="checkbox"
                    name="facturacion_automatica"
                    checked={form.facturacion_automatica === 1}
                    onChange={handleChange}
                    className="mt-0.5 rounded text-[#27A9E1] focus:ring-[#27A9E1] w-4 h-4"
                  />
                  <div>
                    <p className="font-semibold text-xs text-gray-800">
                      Facturar automáticamente al registrar el cobro
                    </p>
                    <p className="text-[11px] text-gray-500">
                      Si está activo, al confirmar un cobro de pensión se generará de inmediato la factura correspondiente usando el cliente predeterminado del estudiante.
                    </p>
                  </div>
                </label>
              </div>
            </>
          )}

          {/* Botones de acción */}
          <div className="pt-4 border-t flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || loading}
              className="flex items-center gap-2 px-5 py-2 bg-[#27A9E1] hover:bg-[#1f93c6] text-white text-xs font-bold rounded-xl shadow-md transition disabled:opacity-50"
            >
              <FiSave size={15} /> {saving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
