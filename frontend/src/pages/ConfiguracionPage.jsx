import React, { useState, useEffect } from 'react';
import MainLayout from '../components/layout/MainLayout';
import { useAuth } from '../context/AuthContext';
import {
  FiSettings, FiMoon, FiSun, FiUser, FiLock,
  FiBell, FiShield, FiSave, FiInfo, FiTrash2,
  FiCheck, FiMonitor, FiDatabase, FiRefreshCw
} from 'react-icons/fi';
import Swal from 'sweetalert2';
import api from '../services/authService';

export default function ConfiguracionPage() {
  const { usuario, token, login } = useAuth();
  const [activeTab, setActiveTab] = useState('apariencia');

  // Estado de apariencia
  const [theme, setTheme] = useState(() => localStorage.getItem('theme_mode') || 'light');
  const [density, setDensity] = useState(() => localStorage.getItem('ui_density') || 'comfortable');
  const [reducedAnimations, setReducedAnimations] = useState(() => localStorage.getItem('reduced_animations') === 'true');

  // Estado de notificaciones
  const [notifications, setNotifications] = useState({
    toasts: localStorage.getItem('notif_toasts') !== 'false',
    sounds: localStorage.getItem('notif_sounds') === 'true',
    emailAlerts: localStorage.getItem('notif_email') !== 'false'
  });

  // Estado de preferencias de sistema
  const [preferences, setPreferences] = useState({
    defaultPageSize: localStorage.getItem('pref_page_size') || '10',
    dateFormat: localStorage.getItem('pref_date_format') || 'DD/MM/YYYY',
    currency: 'USD'
  });

  // Estado de cuenta / perfil
  const [profileData, setProfileData] = useState({
    nombre_completo: '',
    password: '',
    confirm_password: ''
  });
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (usuario) {
      setProfileData(prev => ({
        ...prev,
        nombre_completo: usuario.nombre_completo || ''
      }));
    }
  }, [usuario]);

  // Aplicar tema
  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('theme_mode', newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    Swal.fire({
      icon: 'success',
      title: `Modo ${newTheme === 'dark' ? 'Oscuro' : 'Claro'} aplicado`,
      toast: true,
      position: 'top-end',
      timer: 2000,
      showConfirmButton: false
    });
  };

  const handleDensityChange = (newDensity) => {
    setDensity(newDensity);
    localStorage.setItem('ui_density', newDensity);
  };

  const handleToggleAnimations = () => {
    const newVal = !reducedAnimations;
    setReducedAnimations(newVal);
    localStorage.setItem('reduced_animations', newVal ? 'true' : 'false');
  };

  const handleNotificationToggle = (key) => {
    const updated = { ...notifications, [key]: !notifications[key] };
    setNotifications(updated);
    localStorage.setItem(`notif_${key}`, updated[key]);
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    if (profileData.password && profileData.password !== profileData.confirm_password) {
      Swal.fire('Error', 'Las contraseñas no coinciden', 'error');
      return;
    }

    setSavingProfile(true);
    try {
      const payload = { nombre_completo: profileData.nombre_completo };
      if (profileData.password) payload.password = profileData.password;

      const { data } = await api.put('/usuarios/perfil', payload);

      if (data.success) {
        Swal.fire({
          icon: 'success',
          title: 'Perfil actualizado correctamente',
          toast: true,
          position: 'top-end',
          timer: 2500,
          showConfirmButton: false
        });
        login(token, { ...usuario, nombre_completo: profileData.nombre_completo });
        setProfileData(prev => ({ ...prev, password: '', confirm_password: '' }));
      } else {
        Swal.fire('Error', data.message || 'No se pudo actualizar el perfil', 'error');
      }
    } catch (error) {
      Swal.fire('Error', error.response?.data?.message || 'Error al conectar con el servidor', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleClearCache = () => {
    Swal.fire({
      title: '¿Limpiar datos de caché local?',
      text: 'Se restablecerán las preferencias visuales temporales sin afectar la base de datos.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#27A9E1',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, limpiar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        localStorage.removeItem('theme_mode');
        localStorage.removeItem('ui_density');
        localStorage.removeItem('reduced_animations');
        Swal.fire('Listo', 'Caché local limpiada correctamente.', 'success').then(() => {
          window.location.reload();
        });
      }
    });
  };

  const tabs = [
    { id: 'apariencia', label: 'Apariencia y Tema', icon: FiMoon },
    { id: 'cuenta', label: 'Cuenta y Seguridad', icon: FiUser },
    { id: 'notificaciones', label: 'Notificaciones', icon: FiBell },
    { id: 'sistema', label: 'Preferencias del Sistema', icon: FiSettings },
    { id: 'acerca_de', label: 'Acerca del Sistema', icon: FiInfo },
  ];

  return (
    <MainLayout
      title="Configuración General"
      subtitle="Inicio / Ajustes del Sistema y Preferencias"
    >
      <div className="max-w-5xl mx-auto space-y-6 pb-12 animate-fade-in">
        
        {/* Header con icono y resumen */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#27A9E1] to-[#1E8BBF] flex items-center justify-center text-white text-2xl shadow-lg shadow-[#27A9E1]/20">
              <FiSettings />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Ajustes del Sistema</h1>
              <p className="text-sm text-gray-500">
                Personaliza la apariencia, gestiona tu cuenta y configura los parámetros de tu sesión
              </p>
            </div>
          </div>
          <button
            onClick={handleClearCache}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl transition-all"
            title="Limpiar preferencias temporales"
          >
            <FiRefreshCw size={14} /> Restablecer Preferencias
          </button>
        </div>

        {/* Panel principal de navegación por Tabs */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          
          {/* Barra de Tabs */}
          <div className="flex border-b border-gray-100 overflow-x-auto bg-gray-50/50">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-semibold whitespace-nowrap border-b-2 transition-all ${
                    isActive
                      ? 'border-[#27A9E1] text-[#27A9E1] bg-white'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100/50'
                  }`}
                >
                  <Icon size={16} className={isActive ? 'text-[#27A9E1]' : 'text-gray-400'} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Contenido de cada pestaña */}
          <div className="p-6 md:p-8">

            {/* TAB 1: APARIENCIA */}
            {activeTab === 'apariencia' && (
              <div className="space-y-8 animate-fade-in">
                <div>
                  <h3 className="text-base font-bold text-gray-800 mb-1">Tema Visual</h3>
                  <p className="text-xs text-gray-500 mb-4">Elige cómo deseas visualizar la interfaz del sistema en tu pantalla.</p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Claro */}
                    <div
                      onClick={() => handleThemeChange('light')}
                      className={`cursor-pointer rounded-2xl p-5 border-2 transition-all flex items-center justify-between ${
                        theme === 'light'
                          ? 'border-[#27A9E1] bg-blue-50/30 shadow-md shadow-[#27A9E1]/10'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center text-xl">
                          <FiSun />
                        </div>
                        <div>
                          <p className="font-bold text-gray-800">Modo Claro (Predeterminado)</p>
                          <p className="text-xs text-gray-500">Diseño nítido y limpio con fondos blancos</p>
                        </div>
                      </div>
                      {theme === 'light' && (
                        <div className="w-6 h-6 rounded-full bg-[#27A9E1] text-white flex items-center justify-center text-xs">
                          <FiCheck />
                        </div>
                      )}
                    </div>

                    {/* Oscuro */}
                    <div
                      onClick={() => handleThemeChange('dark')}
                      className={`cursor-pointer rounded-2xl p-5 border-2 transition-all flex items-center justify-between ${
                        theme === 'dark'
                          ? 'border-[#27A9E1] bg-blue-50/30 shadow-md shadow-[#27A9E1]/10'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-slate-800 text-slate-200 flex items-center justify-center text-xl">
                          <FiMoon />
                        </div>
                        <div>
                          <p className="font-bold text-gray-800">Modo Oscuro</p>
                          <p className="text-xs text-gray-500">Reduce el cansancio visual en entornos con poca luz</p>
                        </div>
                      </div>
                      {theme === 'dark' && (
                        <div className="w-6 h-6 rounded-full bg-[#27A9E1] text-white flex items-center justify-center text-xs">
                          <FiCheck />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-6">
                  <h3 className="text-base font-bold text-gray-800 mb-1">Densidad de la Interfaz</h3>
                  <p className="text-xs text-gray-500 mb-4">Ajusta el espaciado en tablas y formularios.</p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <label
                      onClick={() => handleDensityChange('comfortable')}
                      className={`cursor-pointer flex items-center justify-between p-4 rounded-xl border ${
                        density === 'comfortable' ? 'border-[#27A9E1] bg-sky-50/40 text-sky-900 font-semibold' : 'border-gray-200 text-gray-700'
                      }`}
                    >
                      <span>Espaciado Cómodo (Normal)</span>
                      <input type="radio" checked={density === 'comfortable'} onChange={() => {}} className="text-[#27A9E1]" />
                    </label>

                    <label
                      onClick={() => handleDensityChange('compact')}
                      className={`cursor-pointer flex items-center justify-between p-4 rounded-xl border ${
                        density === 'compact' ? 'border-[#27A9E1] bg-sky-50/40 text-sky-900 font-semibold' : 'border-gray-200 text-gray-700'
                      }`}
                    >
                      <span>Espaciado Compacto (Más registros)</span>
                      <input type="radio" checked={density === 'compact'} onChange={() => {}} className="text-[#27A9E1]" />
                    </label>
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-6 flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-gray-800 text-sm">Reducir animaciones</h4>
                    <p className="text-xs text-gray-500">Útil para dispositivos de bajo rendimiento o transiciones más rápidas.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={reducedAnimations}
                    onChange={handleToggleAnimations}
                    className="w-5 h-5 rounded text-[#27A9E1] focus:ring-[#27A9E1] cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* TAB 2: CUENTA Y SEGURIDAD */}
            {activeTab === 'cuenta' && (
              <div className="space-y-6 animate-fade-in max-w-2xl">
                {/* Resumen del Usuario */}
                <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 flex items-center gap-5">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#27A9E1] to-[#1E8BBF] text-white flex items-center justify-center text-2xl font-bold shadow-md">
                    {usuario?.nombre_completo ? usuario.nombre_completo.substring(0, 2).toUpperCase() : 'US'}
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-gray-900">{usuario?.nombre_completo}</h4>
                    <p className="text-xs text-gray-500">{usuario?.correo}</p>
                    <span className={`inline-block mt-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase ${
                      usuario?.es_admin ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {usuario?.es_admin ? 'Administrador del Sistema' : 'Operador / Cobranzas'}
                    </span>
                  </div>
                </div>

                {/* Formulario de actualización */}
                <form onSubmit={handleProfileSubmit} className="space-y-5">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Nombre Completo</label>
                    <input
                      type="text"
                      value={profileData.nombre_completo}
                      onChange={(e) => setProfileData({ ...profileData, nombre_completo: e.target.value })}
                      required
                      className="form-input w-full bg-gray-50 focus:bg-white"
                      placeholder="Ej. Juan Pérez"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Correo Institucional (Solo Lectura)</label>
                    <input
                      type="email"
                      value={usuario?.correo || ''}
                      disabled
                      className="form-input w-full bg-gray-100 text-gray-500 cursor-not-allowed"
                    />
                  </div>

                  <div className="border-t border-gray-100 pt-4">
                    <h4 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                      <FiLock className="text-[#27A9E1]" /> Cambiar Contraseña (Opcional)
                    </h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Nueva Contraseña</label>
                        <input
                          type="password"
                          value={profileData.password}
                          onChange={(e) => setProfileData({ ...profileData, password: e.target.value })}
                          className="form-input w-full bg-gray-50 focus:bg-white"
                          placeholder="Mínimo 6 caracteres"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Confirmar Contraseña</label>
                        <input
                          type="password"
                          value={profileData.confirm_password}
                          onChange={(e) => setProfileData({ ...profileData, confirm_password: e.target.value })}
                          className="form-input w-full bg-gray-50 focus:bg-white"
                          placeholder="Repite la nueva contraseña"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={savingProfile}
                      className="flex items-center gap-2 px-6 py-2.5 bg-[#27A9E1] hover:bg-[#1E8BBF] text-white font-semibold rounded-xl shadow-md shadow-[#27A9E1]/20 transition-all disabled:opacity-50"
                    >
                      <FiSave /> {savingProfile ? 'Guardando...' : 'Guardar Cambios de Cuenta'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* TAB 3: NOTIFICACIONES */}
            {activeTab === 'notificaciones' && (
              <div className="space-y-6 animate-fade-in max-w-2xl">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:bg-gray-50/50 transition-colors">
                    <div>
                      <h4 className="font-semibold text-gray-800 text-sm">Alertas flotantes (Toasts)</h4>
                      <p className="text-xs text-gray-500">Muestra mensajes emergentes de confirmación al guardar o registrar cobros.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifications.toasts}
                      onChange={() => handleNotificationToggle('toasts')}
                      className="w-5 h-5 rounded text-[#27A9E1] focus:ring-[#27A9E1] cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:bg-gray-50/50 transition-colors">
                    <div>
                      <h4 className="font-semibold text-gray-800 text-sm">Sonidos de confirmación</h4>
                      <p className="text-xs text-gray-500">Emite un tono breve al realizar transacciones financieras con éxito.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifications.sounds}
                      onChange={() => handleNotificationToggle('sounds')}
                      className="w-5 h-5 rounded text-[#27A9E1] focus:ring-[#27A9E1] cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:bg-gray-50/50 transition-colors">
                    <div>
                      <h4 className="font-semibold text-gray-800 text-sm">Notificaciones por Correo</h4>
                      <p className="text-xs text-gray-500">Enviar comprobantes automáticos al correo del representante al recaudar pensión.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifications.emailAlerts}
                      onChange={() => handleNotificationToggle('emailAlerts')}
                      className="w-5 h-5 rounded text-[#27A9E1] focus:ring-[#27A9E1] cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: PREFERENCIAS DEL SISTEMA */}
            {activeTab === 'sistema' && (
              <div className="space-y-6 animate-fade-in max-w-2xl">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Registros por página (Tablas)</label>
                    <select
                      value={preferences.defaultPageSize}
                      onChange={(e) => {
                        setPreferences({ ...preferences, defaultPageSize: e.target.value });
                        localStorage.setItem('pref_page_size', e.target.value);
                      }}
                      className="form-input w-full bg-gray-50 focus:bg-white"
                    >
                      <option value="10">10 registros</option>
                      <option value="25">25 registros</option>
                      <option value="50">50 registros</option>
                      <option value="100">100 registros</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Moneda Oficial</label>
                    <input
                      type="text"
                      value="Dólar Estadounidense (USD - $)"
                      disabled
                      className="form-input w-full bg-gray-100 text-gray-500 cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Formato de Fecha</label>
                    <select
                      value={preferences.dateFormat}
                      onChange={(e) => {
                        setPreferences({ ...preferences, dateFormat: e.target.value });
                        localStorage.setItem('pref_date_format', e.target.value);
                      }}
                      className="form-input w-full bg-gray-50 focus:bg-white"
                    >
                      <option value="DD/MM/YYYY">DD/MM/AAAA (Ej. 30/09/2026)</option>
                      <option value="YYYY-MM-DD">AAAA-MM-DD (Ej. 2026-09-30)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Zona Horaria</label>
                    <input
                      type="text"
                      value="América / Guayaquil (UTC-5)"
                      disabled
                      className="form-input w-full bg-gray-100 text-gray-500 cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: ACERCA DEL SISTEMA */}
            {activeTab === 'acerca_de' && (
              <div className="space-y-6 animate-fade-in max-w-2xl">
                <div className="bg-sky-50/50 p-6 rounded-2xl border border-sky-100">
                  <div className="flex items-center gap-3 mb-2">
                    <FiInfo className="text-[#27A9E1] text-xl" />
                    <h4 className="font-bold text-gray-900 text-base">Sistema de Gestión Académica y Control Financiero</h4>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Desarrollado para la Unidad Educativa "Juan León Mera" como proyecto de tesis de grado.
                  </p>
                </div>

                <div className="divide-y divide-gray-100 text-sm">
                  <div className="py-3 flex justify-between">
                    <span className="text-gray-500">Versión del Software</span>
                    <span className="font-semibold text-gray-800">1.0.0 (Release Tesis 2026)</span>
                  </div>
                  <div className="py-3 flex justify-between">
                    <span className="text-gray-500">Frontend Framework</span>
                    <span className="font-semibold text-gray-800">React 19 + Vite 6 + TailwindCSS</span>
                  </div>
                  <div className="py-3 flex justify-between">
                    <span className="text-gray-500">Backend API</span>
                    <span className="font-semibold text-gray-800">Node.js + Express (Desplegado en Render)</span>
                  </div>
                  <div className="py-3 flex justify-between">
                    <span className="text-gray-500">Base de Datos</span>
                    <span className="font-semibold text-gray-800">MySQL 8.0 (Clever Cloud)</span>
                  </div>
                  <div className="py-3 flex justify-between">
                    <span className="text-gray-500">Estado de la Sesión</span>
                    <span className="font-semibold text-emerald-600 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Activo
                    </span>
                  </div>
                </div>
              </div>
            )}

          </div>

        </div>

      </div>
    </MainLayout>
  );
}
