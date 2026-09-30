import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { FiCheckCircle, FiAlertCircle, FiUser, FiLoader, FiSave, FiX, FiRefreshCcw } from 'react-icons/fi';
import Swal from 'sweetalert2';
import estudiantesService from '../services/estudiantesService';
import MainLayout from '../components/layout/MainLayout';

const NuevoEstudiante = () => {
  const navigate = useNavigate();
  const [cursos, setCursos] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [repStatus, setRepStatus] = useState('idle'); // idle | found | new
  const [estudiantesAsociados, setEstudiantesAsociados] = useState([]);

  const { register, handleSubmit, setValue, watch, formState: { errors, isValid } } = useForm({
    mode: 'onChange',
    defaultValues: {
      estado: 'Activo',
      anio_lectivo: '2026-2027',
      sexo: 'Masculino',
      nacionalidad: 'Ecuatoriana',
      rep_parentesco: 'Padre'
    }
  });

  const repCedula = watch('rep_cedula');

  // Load Cursos
  useEffect(() => {
    const fetchCursos = async () => {
      try {
        const res = await estudiantesService.getCursos();
        if (res.success) setCursos(res.data);
      } catch (error) {
        console.error("Error loading cursos", error);
      }
    };
    fetchCursos();
  }, []);

  // Debounce for representative search
  useEffect(() => {
    const fetchRepresentante = async () => {
      if (repCedula && repCedula.length >= 10) {
        setIsSearching(true);
        try {
          const res = await estudiantesService.getRepresentanteByCedula(repCedula);
          if (res.success && res.data) {
            const rep = res.data;
            setValue('id_representante', rep.id_representante);
            setValue('rep_nombres', rep.nombres);
            setValue('rep_apellidos', rep.apellidos);
            setValue('rep_parentesco', rep.parentesco || 'Otro');
            setValue('rep_telefono_principal', rep.telefono_principal || '');
            setValue('rep_telefono_secundario', rep.telefono_secundario || '');
            setValue('rep_correo', rep.correo || '');
            setValue('rep_direccion', rep.direccion || '');
            
            setEstudiantesAsociados(rep.hijos || []);
            setRepStatus('found');
          } else {
            setValue('id_representante', null);
            setEstudiantesAsociados([]);
            setRepStatus('new');
          }
        } catch (error) {
          console.error("Error fetching", error);
        } finally {
          setIsSearching(false);
        }
      } else {
        setRepStatus('idle');
        setEstudiantesAsociados([]);
      }
    };

    const timer = setTimeout(() => {
      fetchRepresentante();
    }, 600);

    return () => clearTimeout(timer);
  }, [repCedula, setValue]);

  const onSubmit = async (data) => {
    try {
      Swal.fire({ title: 'Guardando...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });
      await estudiantesService.create(data);
      Swal.fire({
        icon: 'success',
        title: 'Estudiante registrado correctamente',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000
      });
      navigate('/estudiantes');
    } catch (error) {
      Swal.fire('Error', error.response?.data?.message || 'Hubo un problema al guardar', 'error');
    }
  };

  const handleLimpiar = () => {
    window.location.reload();
  };

  return (
    <MainLayout title="Nuevo Estudiante" subtitle="Dashboard / Estudiantes / Nuevo">
      <div className="pb-24 max-w-5xl mx-auto animate-fade-in">
        
        <form id="student-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          
          {/* TARJETA 1: INFORMACIÓN DEL ESTUDIANTE */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-800 border-b border-gray-100 pb-3 mb-5 flex items-center gap-2">
              <FiUser className="text-[#27A9E1]" /> Información del Estudiante
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Código institucional <span className="text-red-500">*</span></label>
                <input 
                  {...register('codigo', { required: 'El código es obligatorio' })} 
                  className={`form-input w-full ${errors.codigo ? 'border-red-500 bg-red-50' : 'bg-gray-50 focus:bg-white'}`} 
                  placeholder="Ej. 2026001" 
                />
                {errors.codigo && <span className="text-xs text-red-500 mt-1 block">{errors.codigo.message}</span>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cédula <span className="text-red-500">*</span></label>
                <input 
                  {...register('cedula', { 
                    required: 'La cédula es obligatoria',
                    minLength: { value: 10, message: 'Debe tener 10 dígitos' }
                  })} 
                  className={`form-input w-full ${errors.cedula ? 'border-red-500 bg-red-50' : 'bg-gray-50 focus:bg-white'}`} 
                  maxLength="15"
                  placeholder="Número de identidad"
                />
                {errors.cedula && <span className="text-xs text-red-500 mt-1 block">{errors.cedula.message}</span>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombres <span className="text-red-500">*</span></label>
                <input 
                  {...register('nombres', { required: 'Los nombres son obligatorios' })} 
                  className={`form-input w-full ${errors.nombres ? 'border-red-500 bg-red-50' : 'bg-gray-50 focus:bg-white'}`} 
                />
                {errors.nombres && <span className="text-xs text-red-500 mt-1 block">{errors.nombres.message}</span>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Apellidos <span className="text-red-500">*</span></label>
                <input 
                  {...register('apellidos', { required: 'Los apellidos son obligatorios' })} 
                  className={`form-input w-full ${errors.apellidos ? 'border-red-500 bg-red-50' : 'bg-gray-50 focus:bg-white'}`} 
                />
                {errors.apellidos && <span className="text-xs text-red-500 mt-1 block">{errors.apellidos.message}</span>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de nacimiento <span className="text-red-500">*</span></label>
                <input 
                  type="date"
                  {...register('fecha_nacimiento', { required: 'La fecha es obligatoria' })} 
                  className={`form-input w-full ${errors.fecha_nacimiento ? 'border-red-500 bg-red-50' : 'bg-gray-50 focus:bg-white'}`} 
                />
                {errors.fecha_nacimiento && <span className="text-xs text-red-500 mt-1 block">{errors.fecha_nacimiento.message}</span>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sexo <span className="text-red-500">*</span></label>
                <select 
                  {...register('sexo', { required: 'Requerido' })} 
                  className="form-input w-full bg-gray-50 focus:bg-white"
                >
                  <option value="Masculino">Masculino</option>
                  <option value="Femenino">Femenino</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nacionalidad</label>
                <input 
                  {...register('nacionalidad')} 
                  className="form-input w-full bg-gray-50 focus:bg-white" 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                <input 
                  {...register('telefono')} 
                  className="form-input w-full bg-gray-50 focus:bg-white" 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Correo electrónico</label>
                <input 
                  type="email"
                  {...register('correo')} 
                  className="form-input w-full bg-gray-50 focus:bg-white" 
                />
              </div>

              <div className="md:col-span-2 lg:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                <input 
                  {...register('direccion')} 
                  className="form-input w-full bg-gray-50 focus:bg-white" 
                />
              </div>
            </div>
          </div>

          {/* TARJETA 2: INFORMACIÓN ACADÉMICA */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-800 border-b border-gray-100 pb-3 mb-5 flex items-center gap-2">
              <FiCheckCircle className="text-[#F4C542]" /> Información Académica
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Año Lectivo <span className="text-red-500">*</span></label>
                <input 
                  {...register('anio_lectivo', { required: 'Requerido' })} 
                  className="form-input w-full bg-gray-100 text-gray-500 cursor-not-allowed" 
                  readOnly
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Curso <span className="text-red-500">*</span></label>
                <select 
                  {...register('id_curso', { required: 'Seleccione un curso' })} 
                  className={`form-input w-full ${errors.id_curso ? 'border-red-500 bg-red-50' : 'bg-gray-50 focus:bg-white'}`}
                >
                  <option value="">Seleccione...</option>
                  {cursos.map(c => (
                    <option key={c.id_curso} value={c.id_curso}>{c.nombre}</option>
                  ))}
                </select>
                {errors.id_curso && <span className="text-xs text-red-500 mt-1 block">{errors.id_curso.message}</span>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Paralelo <span className="text-red-500">*</span></label>
                <select 
                  {...register('paralelo', { required: 'Seleccione un paralelo' })} 
                  className={`form-input w-full ${errors.paralelo ? 'border-red-500 bg-red-50' : 'bg-gray-50 focus:bg-white'}`}
                >
                  <option value="">Seleccione...</option>
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                  <option value="D">D</option>
                </select>
                {errors.paralelo && <span className="text-xs text-red-500 mt-1 block">{errors.paralelo.message}</span>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                <select 
                  {...register('estado')} 
                  className="form-input w-full bg-gray-50 focus:bg-white"
                >
                  <option value="Activo">Activo</option>
                  <option value="Inactivo">Inactivo</option>
                </select>
              </div>
            </div>
          </div>

          {/* TARJETA 3: REPRESENTANTE LEGAL */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 relative overflow-hidden">
            {/* Banner decorativo */}
            <div className={`absolute top-0 left-0 w-1 h-full ${repStatus === 'found' ? 'bg-[#22C55E]' : repStatus === 'new' ? 'bg-[#F59E0B]' : 'bg-[#27A9E1]'}`}></div>
            
            <h2 className="text-lg font-semibold text-gray-800 border-b border-gray-100 pb-3 mb-5 pl-2">
              Representante Legal (Facturación)
            </h2>

            <input type="hidden" {...register('id_representante')} />

            {/* Fila superior de búsqueda */}
            <div className="bg-slate-50 p-4 rounded-lg mb-6 border border-slate-100 flex flex-col md:flex-row md:items-end gap-4">
              <div className="w-full md:w-1/3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cédula del Representante <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input 
                    {...register('rep_cedula', { required: 'Requerido' })} 
                    className={`form-input w-full pl-3 pr-10 ${errors.rep_cedula ? 'border-red-500' : 'border-gray-300'}`} 
                    maxLength="15"
                    placeholder="Escriba para buscar..."
                  />
                  {isSearching && (
                    <div className="absolute right-3 top-2.5">
                      <FiLoader className="animate-spin text-[#27A9E1]" size={18} />
                    </div>
                  )}
                </div>
                {errors.rep_cedula && <span className="text-xs text-red-500 mt-1 block">{errors.rep_cedula.message}</span>}
              </div>

              <div className="flex-1 flex items-center h-[42px]">
                {repStatus === 'found' && (
                  <div className="flex items-center gap-2 text-[#22C55E] bg-green-50 px-3 py-1.5 rounded-md font-medium text-sm border border-green-100">
                    <FiCheckCircle size={18} /> Representante encontrado (Reutilizando datos)
                  </div>
                )}
                {repStatus === 'new' && (
                  <div className="flex items-center gap-2 text-[#F59E0B] bg-amber-50 px-3 py-1.5 rounded-md font-medium text-sm border border-amber-100">
                    <FiAlertCircle size={18} /> Nuevo representante
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pl-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombres <span className="text-red-500">*</span></label>
                <input 
                  {...register('rep_nombres', { required: 'Requerido' })} 
                  className="form-input w-full bg-gray-50 focus:bg-white" 
                  disabled={repStatus === 'found'}
                />
                {errors.rep_nombres && <span className="text-xs text-red-500 mt-1 block">{errors.rep_nombres.message}</span>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Apellidos <span className="text-red-500">*</span></label>
                <input 
                  {...register('rep_apellidos', { required: 'Requerido' })} 
                  className="form-input w-full bg-gray-50 focus:bg-white" 
                  disabled={repStatus === 'found'}
                />
                {errors.rep_apellidos && <span className="text-xs text-red-500 mt-1 block">{errors.rep_apellidos.message}</span>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Parentesco</label>
                <select 
                  {...register('rep_parentesco')} 
                  className="form-input w-full bg-gray-50 focus:bg-white"
                  disabled={repStatus === 'found'}
                >
                  <option value="Padre">Padre</option>
                  <option value="Madre">Madre</option>
                  <option value="Abuelo">Abuelo</option>
                  <option value="Abuela">Abuela</option>
                  <option value="Tutor">Tutor</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono principal <span className="text-red-500">*</span></label>
                <input 
                  {...register('rep_telefono_principal', { required: 'Requerido' })} 
                  className="form-input w-full bg-gray-50 focus:bg-white" 
                  disabled={repStatus === 'found'}
                />
                {errors.rep_telefono_principal && <span className="text-xs text-red-500 mt-1 block">{errors.rep_telefono_principal.message}</span>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono secundario</label>
                <input 
                  {...register('rep_telefono_secundario')} 
                  className="form-input w-full bg-gray-50 focus:bg-white" 
                  disabled={repStatus === 'found'}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Correo electrónico</label>
                <input 
                  type="email"
                  {...register('rep_correo')} 
                  className="form-input w-full bg-gray-50 focus:bg-white" 
                  disabled={repStatus === 'found'}
                />
              </div>

              <div className="md:col-span-2 lg:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                <input 
                  {...register('rep_direccion')} 
                  className="form-input w-full bg-gray-50 focus:bg-white" 
                  disabled={repStatus === 'found'}
                />
              </div>
            </div>

            {/* SECCIÓN HIJOS ASOCIADOS */}
            {repStatus === 'found' && estudiantesAsociados.length > 0 && (
              <div className="mt-8 pl-2">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Estudiantes Asociados ({estudiantesAsociados.length})</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {estudiantesAsociados.map((hijo, i) => (
                    <div key={i} className="flex items-center p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
                      <div className="w-10 h-10 rounded-full bg-[#27A9E1]/10 flex items-center justify-center text-[#27A9E1] font-bold mr-3">
                        {hijo.nombres.charAt(0)}{hijo.apellidos.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-800 line-clamp-1">{hijo.nombres} {hijo.apellidos}</p>
                        <p className="text-xs text-gray-500">{hijo.curso} "{hijo.paralelo}"</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
          </div>
        </form>

      </div>

      {/* FOOTER FIJO DE ACCIONES */}
      <div className="fixed bottom-0 left-0 md:left-64 right-0 bg-white border-t border-gray-200 p-4 px-6 z-40 flex justify-between items-center shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <div className="hidden sm:block text-sm text-gray-500">
          Asegúrese de verificar la información antes de guardar.
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <button 
            type="button" 
            onClick={() => navigate('/estudiantes')} 
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition flex items-center gap-2"
          >
            <FiX /> Cancelar
          </button>
          <button 
            type="button" 
            onClick={handleLimpiar}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition flex items-center gap-2"
          >
            <FiRefreshCcw /> Limpiar
          </button>
          <button 
            type="submit" 
            form="student-form"
            className="px-6 py-2 text-sm font-semibold text-gray-900 bg-[#F4C542] hover:bg-[#E3B632] rounded-lg shadow-sm transition flex items-center gap-2"
          >
            <FiSave /> Guardar Estudiante
          </button>
        </div>
      </div>
    </MainLayout>
  );
};

export default NuevoEstudiante;
