import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import personalService from '../../../services/personalService';
import { FiX, FiUser, FiBriefcase } from 'react-icons/fi';

const PersonalFormModal = ({ isOpen, onClose, onSuccess, mode, data, catalogos }) => {
  const [formData, setFormData] = useState({
    codigo_interno: '',
    cedula: '',
    apellidos: '',
    nombres: '',
    nombre_completo: '',
    nombre_corto: '',
    correo: '',
    telefono: '',
    direccion: '',
    fecha_nacimiento: '',
    tipo_contrato_id: '',
    cargo_id: '',
    funcion_id: '',
    fecha_ingreso: '',
    sueldo_actual: '0.00',
    modalidad_pago: '',
    observacion: ''
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && data) {
        setFormData({
          codigo_interno: data.codigo_interno || '',
          cedula: data.cedula || '',
          apellidos: data.apellidos || '',
          nombres: data.nombres || '',
          nombre_completo: data.nombre_completo || '',
          nombre_corto: data.nombre_corto || '',
          correo: data.correo || '',
          telefono: data.telefono || '',
          direccion: data.direccion || '',
          fecha_nacimiento: data.fecha_nacimiento ? data.fecha_nacimiento.split('T')[0] : '',
          tipo_contrato_id: data.tipo_contrato_id || '',
          cargo_id: data.cargo_id || '',
          funcion_id: data.funcion_id || '',
          fecha_ingreso: data.fecha_ingreso ? data.fecha_ingreso.split('T')[0] : '',
          sueldo_actual: data.sueldo_actual || '0.00',
          modalidad_pago: data.modalidad_pago || '',
          observacion: data.observacion || ''
        });
      } else {
        setFormData({
          codigo_interno: `PER-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
          cedula: '', apellidos: '', nombres: '', nombre_completo: '', nombre_corto: '',
          correo: '', telefono: '', direccion: '', fecha_nacimiento: '',
          tipo_contrato_id: '', cargo_id: '', funcion_id: '',
          fecha_ingreso: new Date().toISOString().split('T')[0],
          sueldo_actual: '0.00', modalidad_pago: 'Transferencia', observacion: ''
        });
      }
    }
  }, [isOpen, mode, data]);

  // Autogenerar nombre completo y corto
  useEffect(() => {
    if (formData.apellidos || formData.nombres) {
      const full = `${formData.apellidos} ${formData.nombres}`.trim();
      setFormData(prev => ({ ...prev, nombre_completo: full }));

      // Nombre corto: Primer nombre + Primer apellido
      const apArr = formData.apellidos.trim().split(' ');
      const nomArr = formData.nombres.trim().split(' ');
      if (apArr[0] && nomArr[0]) {
        setFormData(prev => ({ ...prev, nombre_corto: `${nomArr[0]} ${apArr[0]}` }));
      }
    }
  }, [formData.apellidos, formData.nombres]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'create') {
        await personalService.create(formData);
        Swal.fire({ icon: 'success', title: 'Personal registrado', timer: 2000, showConfirmButton: false });
      } else {
        await personalService.update(data.id, formData);
        Swal.fire({ icon: 'success', title: 'Personal actualizado', timer: 2000, showConfirmButton: false });
      }
      onSuccess();
      onClose();
    } catch (error) {
      Swal.fire('Error', error.response?.data?.message || 'Error al guardar el registro.', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-bold text-gray-800">
              {mode === 'create' ? 'Registrar Personal' : 'Editar Personal'}
            </h3>
            <p className="text-sm text-gray-500">Complete los datos solicitados. El sueldo se cambia desde el modal específico.</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl">
            <FiX size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-gray-50">
          <form id="personalForm" onSubmit={handleSubmit} className="space-y-6">
            
            {/* ── Sección A: Información Personal ── */}
            <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
              <h4 className="flex items-center gap-2 text-md font-semibold text-gray-700 mb-4 pb-2 border-b">
                <FiUser className="text-[#27A9E1]" /> Información Personal
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Cód. Interno <span className="text-red-500">*</span></label>
                  <input required type="text" name="codigo_interno" value={formData.codigo_interno} onChange={handleChange} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Cédula</label>
                  <input type="text" name="cedula" maxLength={10} value={formData.cedula} onChange={handleChange} placeholder="Opcional si es extranjero" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Apellidos</label>
                  <input type="text" name="apellidos" value={formData.apellidos} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Nombres</label>
                  <input type="text" name="nombres" value={formData.nombres} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Nombre Completo <span className="text-red-500">*</span></label>
                  <input required type="text" name="nombre_completo" value={formData.nombre_completo} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-blue-50" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Nombre Corto</label>
                  <input type="text" name="nombre_corto" value={formData.nombre_corto} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Correo Electrónico</label>
                  <input type="email" name="correo" value={formData.correo} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Teléfono</label>
                  <input type="text" name="telefono" value={formData.telefono} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
                <div className="lg:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Dirección</label>
                  <input type="text" name="direccion" value={formData.direccion} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
              </div>
            </div>

            {/* ── Sección B: Información Laboral ── */}
            <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
              <h4 className="flex items-center gap-2 text-md font-semibold text-gray-700 mb-4 pb-2 border-b">
                <FiBriefcase className="text-[#27A9E1]" /> Información Laboral
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Contrato <span className="text-red-500">*</span></label>
                  <select required name="tipo_contrato_id" value={formData.tipo_contrato_id} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
                    <option value="">Seleccione...</option>
                    {catalogos.contratos.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Cargo Institucional</label>
                  <select name="cargo_id" value={formData.cargo_id} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
                    <option value="">Ninguno específico</option>
                    {catalogos.cargos.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Función Base</label>
                  <select name="funcion_id" value={formData.funcion_id} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
                    <option value="">Ninguna</option>
                    {catalogos.funciones.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Fecha de Ingreso</label>
                  <input type="date" name="fecha_ingreso" value={formData.fecha_ingreso} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Modalidad de Pago</label>
                  <select name="modalidad_pago" value={formData.modalidad_pago} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
                    <option value="Transferencia">Transferencia</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Efectivo">Efectivo</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Sueldo Inicial <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="number" step="0.01" name="sueldo_actual" 
                    value={formData.sueldo_actual} onChange={handleChange} 
                    disabled={mode === 'edit'} 
                    className={`w-full px-3 py-2 border rounded-lg text-sm font-mono ${mode === 'edit' ? 'bg-gray-100 text-gray-500 border-gray-200' : 'bg-green-50 border-green-200 text-green-700'}`}
                  />
                  {mode === 'edit' && <p className="text-[10px] text-gray-400 mt-1">El sueldo se cambia con el botón "$".</p>}
                </div>

                <div className="md:col-span-2 lg:col-span-3">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Observación</label>
                  <input type="text" name="observacion" value={formData.observacion} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="Opcional..." />
                </div>

              </div>
            </div>

          </form>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 bg-white flex justify-end gap-3 rounded-b-2xl">
          <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 border border-gray-200 rounded-xl transition-colors">
            Cancelar
          </button>
          <button 
            type="submit" 
            form="personalForm" 
            disabled={loading}
            className="px-5 py-2.5 text-sm font-medium text-white bg-[#27A9E1] hover:bg-[#1E8BBF] rounded-xl transition-colors disabled:opacity-70 flex items-center gap-2"
          >
            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
            {mode === 'create' ? 'Guardar Personal' : 'Actualizar Personal'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PersonalFormModal;
