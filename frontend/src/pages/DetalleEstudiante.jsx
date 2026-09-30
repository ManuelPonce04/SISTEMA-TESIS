import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiUser, FiCheckCircle, FiDollarSign, FiClock, FiCreditCard, FiUsers } from 'react-icons/fi';
import estudiantesService from '../services/estudiantesService';
import MainLayout from '../components/layout/MainLayout';
import Swal from 'sweetalert2';

const DetalleEstudiante = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('personal'); // 'personal', 'representantes', 'matricula'

  useEffect(() => {
    const fetchStudent = async () => {
      try {
        const res = await estudiantesService.getById(id);
        if (res.success) {
          setStudent(res.data);
        } else {
          Swal.fire('Error', 'Estudiante no encontrado', 'error');
          navigate('/estudiantes');
        }
      } catch (error) {
        Swal.fire('Error', 'No se pudieron cargar los datos', 'error');
        navigate('/estudiantes');
      } finally {
        setLoading(false);
      }
    };
    fetchStudent();
  }, [id, navigate]);

  if (loading) {
    return (
      <MainLayout title="Detalle del Estudiante" subtitle="Dashboard / Estudiantes / Detalle">
        <div className="p-8 text-center">Cargando perfil...</div>
      </MainLayout>
    );
  }

  if (!student) return null;

  return (
    <MainLayout title="Perfil del Estudiante" subtitle="Dashboard / Estudiantes / Perfil">
      <div className="max-w-5xl mx-auto pb-12 animate-fade-in space-y-6">
        
        {/* Header con botón regresar */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-2">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/estudiantes')}
              className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition shadow-sm"
            >
              <FiArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                {student.apellidos_nombres || `${student.apellidos} ${student.nombres}`}
              </h1>
              <p className="text-sm text-gray-500 font-medium mt-0.5">Cód: <span className="text-[#00AEEF]">{student.codigo}</span> | C.I: {student.cedula}</p>
            </div>
          </div>
          <div className="sm:ml-auto flex gap-3">
            <span className={`px-4 py-1.5 text-sm font-bold rounded-lg ${
              student.estado?.toUpperCase() === 'ACTIVO' ? 'bg-[#e0f7ff] text-[#00AEEF] border border-[#27A9E1]/20' : 'bg-red-50 text-red-600 border border-red-200'
            }`}>
              {student.estado}
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex overflow-x-auto hide-scrollbar">
          <button 
            onClick={() => setActiveTab('personal')}
            className={`flex items-center gap-2 px-6 py-4 font-semibold text-sm transition-colors border-b-2 whitespace-nowrap ${
              activeTab === 'personal' ? 'border-[#00AEEF] text-[#00AEEF] bg-sky-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <FiUser size={16} /> Información Personal
          </button>
          <button 
            onClick={() => setActiveTab('representantes')}
            className={`flex items-center gap-2 px-6 py-4 font-semibold text-sm transition-colors border-b-2 whitespace-nowrap ${
              activeTab === 'representantes' ? 'border-[#00AEEF] text-[#00AEEF] bg-sky-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <FiUsers size={16} /> Representantes
          </button>
          <button 
            onClick={() => setActiveTab('matricula')}
            className={`flex items-center gap-2 px-6 py-4 font-semibold text-sm transition-colors border-b-2 whitespace-nowrap ${
              activeTab === 'matricula' ? 'border-[#00AEEF] text-[#00AEEF] bg-sky-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <FiClock size={16} /> Matrícula Académica
          </button>
        </div>

        {/* Tab Content */}
        <div className="animate-fade-in-up">
          
          {/* TAB: INFORMACIÓN PERSONAL */}
          {activeTab === 'personal' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sm:p-8">
              <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                Datos del Estudiante
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-8 gap-x-6">
                <div>
                  <span className="block text-gray-400 font-bold text-[10px] uppercase tracking-wider mb-1">Fecha Nacimiento</span>
                  <span className="text-gray-800 font-medium">{student.fecha_nacimiento ? new Date(student.fecha_nacimiento).toLocaleDateString('es-ES') : 'N/A'}</span>
                </div>
                <div>
                  <span className="block text-gray-400 font-bold text-[10px] uppercase tracking-wider mb-1">Sexo</span>
                  <span className="text-gray-800 font-medium">{student.sexo || 'N/A'}</span>
                </div>
                <div>
                  <span className="block text-gray-400 font-bold text-[10px] uppercase tracking-wider mb-1">Nacionalidad</span>
                  <span className="text-gray-800 font-medium">{student.nacionalidad || 'N/A'}</span>
                </div>
                <div>
                  <span className="block text-gray-400 font-bold text-[10px] uppercase tracking-wider mb-1">Teléfono</span>
                  <span className="text-gray-800 font-medium">{student.telefono || 'N/A'}</span>
                </div>
                <div className="md:col-span-2">
                  <span className="block text-gray-400 font-bold text-[10px] uppercase tracking-wider mb-1">Correo Electrónico</span>
                  <span className="text-gray-800 font-medium">{student.correo || 'N/A'}</span>
                </div>
                <div className="sm:col-span-2 md:col-span-3">
                  <span className="block text-gray-400 font-bold text-[10px] uppercase tracking-wider mb-1">Dirección Domiciliaria</span>
                  <span className="text-gray-800 font-medium">{student.direccion || 'N/A'}</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB: REPRESENTANTES */}
          {activeTab === 'representantes' && (
            <div className="space-y-6">
              {student.representantes && student.representantes.length > 0 ? (
                student.representantes.map((rep, index) => (
                  <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden relative">
                    
                    {rep.es_principal === 1 && (
                      <div className="absolute top-0 right-0 bg-[#00AEEF] text-white text-xs font-bold px-3 py-1.5 rounded-bl-xl flex items-center gap-1 shadow-sm z-10">
                        <FiCheckCircle size={14} /> Representante Principal
                      </div>
                    )}
                    
                    <div className="p-6 sm:p-8">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 rounded-full bg-sky-100 flex items-center justify-center text-[#00AEEF]">
                          <FiUser size={24} />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-800 leading-tight">{rep.nombres} {rep.apellidos}</h3>
                          <span className="text-sm text-gray-500 font-medium">{rep.parentesco || 'Familiar'}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-6 gap-x-6">
                        <div>
                          <span className="block text-gray-400 font-bold text-[10px] uppercase tracking-wider mb-1">Cédula</span>
                          <span className="text-gray-800 font-medium">{rep.cedula || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="block text-gray-400 font-bold text-[10px] uppercase tracking-wider mb-1">Teléfono Principal</span>
                          <span className="text-gray-800 font-medium">{rep.telefono || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="block text-gray-400 font-bold text-[10px] uppercase tracking-wider mb-1">Correo Electrónico</span>
                          <span className="text-gray-800 font-medium">{rep.correo || 'N/A'}</span>
                        </div>
                        <div className="sm:col-span-2 md:col-span-3">
                          <span className="block text-gray-400 font-bold text-[10px] uppercase tracking-wider mb-1">Dirección</span>
                          <span className="text-gray-800 font-medium">{rep.direccion || 'N/A'}</span>
                        </div>
                      </div>
                      
                      {/* Tags de Permisos */}
                      <div className="mt-6 pt-5 border-t border-gray-100 flex flex-wrap gap-2">
                        {rep.es_responsable_economico === 1 && (
                          <span className="text-[11px] font-bold bg-[#fef3c7] text-[#92400e] px-2.5 py-1 rounded-md border border-[#fde68a]">
                            Responsable Económico
                          </span>
                        )}
                        {rep.autorizado_retiro === 1 && (
                          <span className="text-[11px] font-bold bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-md border border-emerald-200">
                            Autorizado Retiro
                          </span>
                        )}
                        {rep.recibe_notificaciones === 1 && (
                          <span className="text-[11px] font-bold bg-purple-100 text-purple-800 px-2.5 py-1 rounded-md border border-purple-200">
                            Recibe Notificaciones
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center flex flex-col items-center">
                  <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                    <FiUsers size={28} className="text-gray-300" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-800 mb-1">Sin Representantes</h3>
                  <p className="text-sm text-gray-500">No hay representantes asignados a este estudiante.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB: MATRICULA ACADEMICA */}
          {activeTab === 'matricula' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Información Académica */}
              {student.matricula_activa ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 relative overflow-hidden group">
                  <div className="absolute -right-4 -top-4 w-24 h-24 bg-sky-50 rounded-full opacity-50 group-hover:scale-110 transition-transform"></div>
                  
                  <h2 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-4 mb-5 flex items-center gap-2">
                    <FiClock className="text-[#00AEEF]" /> Matrícula Activa
                  </h2>
                  
                  <div className="space-y-5 relative z-10">
                    <div>
                      <span className="block text-gray-400 font-bold text-[10px] uppercase tracking-wider mb-1">Curso y Paralelo</span>
                      <span className="text-lg font-bold text-gray-900">{student.matricula_activa.curso_nombre || 'No matriculado'} "{student.matricula_activa.paralelo || '-'}"</span>
                    </div>
                    <div>
                      <span className="block text-gray-400 font-bold text-[10px] uppercase tracking-wider mb-1">Año Lectivo</span>
                      <span className="text-gray-800 font-medium bg-gray-100 px-2.5 py-1 rounded-md inline-block">{student.matricula_activa.anio_lectivo || '-'}</span>
                    </div>
                    <div>
                      <span className="block text-gray-400 font-bold text-[10px] uppercase tracking-wider mb-1">Jornada</span>
                      <span className="text-gray-800 font-medium">Matutina</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                    <FiClock size={28} className="text-gray-300" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-800 mb-1">Sin Matrícula Activa</h3>
                  <p className="text-sm text-gray-500">El estudiante no se encuentra matriculado en el periodo actual.</p>
                </div>
              )}

              {/* Estado Financiero (Sólo si hay matrícula) */}
              {student.matricula_activa && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col">
                  <h2 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-4 mb-5 flex items-center gap-2">
                    <FiDollarSign className="text-emerald-500" /> Estado Financiero
                  </h2>
                  
                  <div className="space-y-4 flex-1">
                    <div className="bg-gray-50 p-4 rounded-xl flex justify-between items-center">
                      <span className="text-gray-600 text-sm font-semibold flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div> Total Pagado
                      </span>
                      <span className="text-lg font-bold text-gray-900">$0.00</span>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-xl flex justify-between items-center">
                      <span className="text-gray-600 text-sm font-semibold flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div> Pendiente
                      </span>
                      <span className="text-lg font-bold text-gray-900">$0.00</span>
                    </div>
                    <div className="bg-red-50 p-4 rounded-xl flex justify-between items-center border border-red-100">
                      <span className="text-gray-600 text-sm font-semibold flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div> Vencido
                      </span>
                      <span className="text-lg font-bold text-red-600">$0.00</span>
                    </div>
                  </div>

                  <button className="w-full mt-6 bg-white border border-gray-200 text-gray-700 font-bold text-sm py-2.5 rounded-xl hover:bg-gray-50 flex items-center justify-center gap-2 transition-colors">
                    <FiCreditCard size={16} /> Ver Historial de Pagos
                  </button>
                </div>
              )}
            </div>
          )}

        </div>

      </div>
    </MainLayout>
  );
};

export default DetalleEstudiante;
