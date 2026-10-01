import React, { useState, useEffect } from 'react';
import MainLayout from '../components/layout/MainLayout';
import { useAuth } from '../context/AuthContext';
import { FiUser, FiLock, FiSave, FiAlertCircle } from 'react-icons/fi';
import Swal from 'sweetalert2';
import api from '../services/authService';

const PerfilPage = () => {
  const { usuario, token, login } = useAuth();
  const [formData, setFormData] = useState({ nombre_completo: '', password: '', confirm_password: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (usuario) {
      setFormData(prev => ({ ...prev, nombre_completo: usuario.nombre_completo || '' }));
    }
  }, [usuario]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password && formData.password !== formData.confirm_password) {
      Swal.fire('Error', 'Las contraseñas no coinciden', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload = { nombre_completo: formData.nombre_completo };
      if (formData.password) payload.password = formData.password;

      const { data } = await api.put('/usuarios/perfil', payload);
      
      if (data.success) {
        Swal.fire('Éxito', 'Perfil actualizado correctamente', 'success');
        // Actualizar el contexto local
        login(token, { ...usuario, nombre_completo: formData.nombre_completo });
        setFormData(prev => ({ ...prev, password: '', confirm_password: '' }));
      } else {
        Swal.fire('Error', data.message || 'No se pudo actualizar el perfil', 'error');
      }
    } catch (error) {
      Swal.fire('Error', 'Error de conexión', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <MainLayout title="Mi Perfil" subtitle="Configuración / Perfil">
      <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
        
        {/* Banner de Perfil */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 flex items-center gap-6">
          <div className="w-24 h-24 rounded-full bg-[#27A9E1] text-white flex items-center justify-center text-4xl font-bold shadow-md">
            {usuario?.nombre_completo ? usuario.nombre_completo.substring(0, 2).toUpperCase() : 'US'}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">{usuario?.nombre_completo}</h2>
            <p className="text-gray-500 mb-2">{usuario?.correo}</p>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${usuario?.es_admin ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}`}>
              {usuario?.es_admin ? 'Cuenta de Administrador' : 'Cuenta Estándar'}
            </span>
          </div>
        </div>

        {/* Formulario de Edición */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <FiUser className="text-[#27A9E1]" /> Ajustes de Cuenta
            </h3>
          </div>
          
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nombre Completo</label>
              <div className="relative">
                <FiUser className="absolute left-3 top-3 text-gray-400" />
                <input 
                  type="text" required
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#27A9E1] outline-none"
                  value={formData.nombre_completo}
                  onChange={(e) => setFormData({...formData, nombre_completo: e.target.value})}
                />
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100">
              <h4 className="text-md font-medium text-gray-800 mb-1 flex items-center gap-2">
                <FiLock className="text-[#F4C542]" /> Cambiar Contraseña
              </h4>
              <p className="text-xs text-gray-500 mb-4 flex items-center gap-1">
                <FiAlertCircle /> Déjalo en blanco si no deseas cambiarla.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nueva Contraseña</label>
                  <input 
                    type="password" minLength="6"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#27A9E1] outline-none"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Confirmar Nueva Contraseña</label>
                  <input 
                    type="password" minLength="6"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#27A9E1] outline-none"
                    value={formData.confirm_password}
                    onChange={(e) => setFormData({...formData, confirm_password: e.target.value})}
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button 
                type="submit" 
                disabled={saving}
                className="bg-[#27A9E1] hover:bg-[#1E8BBF] text-white px-6 py-2.5 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-colors disabled:opacity-50"
              >
                <FiSave /> {saving ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </form>
        </div>

      </div>
    </MainLayout>
  );
};

export default PerfilPage;
