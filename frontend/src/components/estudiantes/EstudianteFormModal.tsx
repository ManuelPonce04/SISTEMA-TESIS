import React, { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { FiX, FiSave, FiUser, FiLoader, FiChevronRight, FiChevronLeft, FiClock } from 'react-icons/fi';
import { Estudiante } from '../../types/estudiante';
import estudiantesService from '../../services/estudiantesService';
import representantesService from '../../services/representantesService';
import academicoService from '../../services/academicoService';
import matriculaService from '../../services/matriculaService';
import Swal from 'sweetalert2';

interface EstudianteFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitSuccess: () => void;
  studentToEdit?: Estudiante | null;
  createEstudiante: (data: any) => Promise<any>;
  updateEstudiante: (id: number, data: any) => Promise<any>;
}

export const EstudianteFormModal: React.FC<EstudianteFormModalProps> = ({
  isOpen,
  onClose,
  onSubmitSuccess,
  studentToEdit,
  createEstudiante,
  updateEstudiante,
}) => {
  const isEditMode = !!studentToEdit;
  const [step, setStep] = useState(1);
  const [loadingRep, setLoadingRep] = useState(false);
  const [repStatus, setRepStatus] = useState<'idle' | 'found' | 'new'>('idle');

  // Step 3 States
  const [generarMatricula, setGenerarMatricula] = useState(true);
  const [periodoActivo, setPeriodoActivo] = useState<any>(null);
  const [ofertas, setOfertas] = useState<any[]>([]);
  const [tiposMatricula, setTiposMatricula] = useState<any[]>([]);
  const [tarifaBase, setTarifaBase] = useState<number>(0);

  const { register, handleSubmit, setValue, watch, reset, control, trigger, formState: { errors } } = useForm<any>({
    mode: 'onChange',
    defaultValues: {
      estado: 'ACTIVO',
      representantes: [{}],
      matricula: {}
    }
  });

  const repCedulaWatcher = watch('representantes.0.cedula');
  const watchOferta = watch('matricula.oferta_academica_id');
  const watchTipo = watch('matricula.tipo_matricula_id');

  // Buscar representante
  useEffect(() => {
    const searchRep = async () => {
      if (repCedulaWatcher && repCedulaWatcher.length >= 10 && !isEditMode) {
        setLoadingRep(true);
        try {
          const res = await representantesService.buscarPorCedula(repCedulaWatcher);
          if (res.success && res.data) {
            const rep = res.data;
            setValue('representantes.0.id_representante', rep.id_representante);
            setValue('representantes.0.nombres', rep.nombres);
            setValue('representantes.0.apellidos', rep.apellidos);
            setValue('representantes.0.telefono', rep.telefono || '');
            setValue('representantes.0.correo', rep.correo || '');
            setValue('representantes.0.direccion', rep.direccion || '');
            setRepStatus('found');
          } else {
            setValue('representantes.0.id_representante', null);
            setRepStatus('new');
          }
        } catch (e) {
          console.error("Error buscando representante:", e);
        } finally {
          setLoadingRep(false);
        }
      } else {
        setRepStatus('idle');
      }
    };

    const delayDebounce = setTimeout(searchRep, 500);
    return () => clearTimeout(delayDebounce);
  }, [repCedulaWatcher, setValue, isEditMode]);

  // Cargar datos para Matrícula en modo nuevo
  useEffect(() => {
    if (isOpen && !isEditMode) {
      const fetchCatalogos = async () => {
        try {
          const [resPeriodo, resTipos] = await Promise.all([
            academicoService.getPeriodoActivo().catch(() => null),
            matriculaService.getTiposMatricula().catch(() => null)
          ]);
          
          if (resPeriodo?.success && resPeriodo.data) {
            const periodo = resPeriodo.data;
            setPeriodoActivo(periodo);
            setValue('matricula.periodo_lectivo_id', periodo.id);
            
            // Cargar ofertas del periodo
            const resOfertas = await academicoService.getOfertas(periodo.id);
            if (resOfertas?.success) setOfertas(resOfertas.data);
          }
          
          if (resTipos?.success) {
            setTiposMatricula(resTipos.data);
            if (resTipos.data.length > 0) {
              setValue('matricula.tipo_matricula_id', resTipos.data[0].id);
            }
          }
        } catch (error) {
          console.error('Error al cargar catálogos para matrícula:', error);
        }
      };
      fetchCatalogos();
    }
  }, [isOpen, isEditMode, setValue]);

  // Calcular tarifa base cuando cambia la oferta o tipo
  useEffect(() => {
    if (periodoActivo && watchOferta && watchTipo && !isEditMode && generarMatricula) {
      const fetchTarifa = async () => {
        try {
          const oferta = ofertas.find(o => o.id.toString() === watchOferta.toString());
          if (oferta && oferta.nivel_id) {
            const res = await matriculaService.getTarifa({
              periodo_lectivo_id: periodoActivo.id,
              nivel_id: oferta.nivel_id,
              tipo_matricula_id: watchTipo
            });
            if (res.success) {
              setTarifaBase(res.valor);
              setValue('matricula.tarifa_base', res.valor);
            }
          }
        } catch (error) {
          console.error('Error fetching tarifa:', error);
        }
      };
      fetchTarifa();
    }
  }, [periodoActivo, watchOferta, watchTipo, isEditMode, generarMatricula, ofertas, setValue]);

  // Cargar datos en edición o limpiar en creación
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      if (studentToEdit) {
        reset({
          codigo: studentToEdit.codigo,
          cedula: studentToEdit.cedula || '',
          nombres: studentToEdit.nombres || '',
          apellidos: studentToEdit.apellidos || '',
          fecha_nacimiento: studentToEdit.fecha_nacimiento ? studentToEdit.fecha_nacimiento.split('T')[0] : '',
          sexo: studentToEdit.sexo || 'Masculino',
          nacionalidad: studentToEdit.nacionalidad || 'Ecuatoriana',
          direccion: studentToEdit.direccion || '',
          telefono: studentToEdit.telefono || '',
          correo: studentToEdit.correo || '',
          estado: studentToEdit.estado || 'ACTIVO',
          observaciones: studentToEdit.observaciones || '',
          
          representantes: studentToEdit.representantes && studentToEdit.representantes.length > 0 
            ? studentToEdit.representantes 
            : [{}]
        });
        setRepStatus('found');
      } else {
        reset({
          estado: 'ACTIVO',
          nombres: '',
          apellidos: '',
          cedula: '',
          fecha_nacimiento: '',
          sexo: 'Masculino',
          nacionalidad: 'Ecuatoriana',
          representantes: [{ es_principal: true, es_responsable_economico: true, recibe_notificaciones: true }],
          matricula: {}
        });
        setRepStatus('idle');
        setGenerarMatricula(true);
      }
    }
  }, [isOpen, studentToEdit, reset]);

  const onNextStep = async () => {
    if (step === 1) {
      const isStep1Valid = await trigger(['nombres', 'apellidos', 'cedula', 'fecha_nacimiento', 'sexo']);
      if (isStep1Valid) setStep(2);
    } else if (step === 2) {
      const isStep2Valid = await trigger(['representantes.0.cedula', 'representantes.0.nombres', 'representantes.0.apellidos', 'representantes.0.telefono']);
      if (isStep2Valid) {
        if (isEditMode) {
          // Si es modo edición, no hay paso 3 (matriculación), se guarda directamente.
          handleSubmit(onSubmit)();
        } else {
          setStep(3);
        }
      }
    }
  };

  const onSubmit = async (data: any) => {
    try {
      Swal.fire({ title: 'Procesando...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });
      
      // Aseguramos que el representante 0 sea principal
      if (data.representantes && data.representantes.length > 0) {
        data.representantes[0].es_principal = true;
      }

      if (isEditMode && studentToEdit) {
        await updateEstudiante(studentToEdit.id_estudiante!, data);
        Swal.fire('Guardado', 'Estudiante actualizado exitosamente.', 'success');
        onSubmitSuccess();
        onClose();
      } else {
        // Modo Creación
        const resEstudiante = await createEstudiante(data);
        const estudianteId = resEstudiante.id || resEstudiante.id_estudiante;
        
        // Generar matrícula si corresponde
        if (generarMatricula && data.matricula && data.matricula.oferta_academica_id) {
          try {
            const matriculaPayload = {
              estudiante_id: estudianteId,
              periodo_lectivo_id: periodoActivo?.id,
              oferta_academica_id: data.matricula.oferta_academica_id,
              tipo_matricula_id: data.matricula.tipo_matricula_id,
              tarifa_base: tarifaBase,
              valor_descuento: 0,
              valor_recargo: 0,
              // Asignamos el representante guardado
              representante_principal_id: resEstudiante.id_representante || null
            };
            await matriculaService.createMatricula(matriculaPayload);
            Swal.fire('¡Registro Completo!', 'Estudiante registrado y matrícula en borrador creada con éxito. Visite el módulo de Matrículas para confirmarla.', 'success');
          } catch (eMat: any) {
            Swal.fire('Atención', 'El estudiante se guardó, pero hubo un error al generar la matrícula: ' + (eMat.response?.data?.message || eMat.message), 'warning');
          }
        } else {
          Swal.fire('Registrado', 'Estudiante registrado con éxito.', 'success');
        }
        
        onSubmitSuccess();
        onClose();
      }
    } catch (e: any) {
      Swal.fire('Error', e.response?.data?.message || 'Hubo un error al guardar los datos.', 'error');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true"></div>

      {/* Modal Content */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-gray-50">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <FiUser className="text-[#00AEEF]" />
            {isEditMode ? `Editar Ficha: ${studentToEdit?.apellidos_nombres}` : 'Nuevo Estudiante'}
          </h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
            <FiX size={20} />
          </button>
        </div>

        {/* Stepper Header */}
        <div className="flex bg-white px-6 py-4 border-b border-gray-100 items-center justify-center gap-4 flex-wrap">
          <div className={`flex items-center gap-2 ${step >= 1 ? 'text-[#00AEEF]' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= 1 ? 'bg-[#00AEEF] text-white' : 'bg-gray-100 text-gray-500'}`}>1</div>
            <span className="font-semibold text-sm hidden sm:block">Datos Personales</span>
          </div>
          <div className={`w-8 sm:w-12 h-px ${step >= 2 ? 'bg-[#00AEEF]' : 'bg-gray-200'}`}></div>
          <div className={`flex items-center gap-2 ${step >= 2 ? 'text-[#00AEEF]' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= 2 ? 'bg-[#00AEEF] text-white' : 'bg-gray-100 text-gray-500'}`}>2</div>
            <span className="font-semibold text-sm hidden sm:block">Representante</span>
          </div>
          {!isEditMode && (
            <>
              <div className={`w-8 sm:w-12 h-px ${step >= 3 ? 'bg-[#00AEEF]' : 'bg-gray-200'}`}></div>
              <div className={`flex items-center gap-2 ${step >= 3 ? 'text-[#00AEEF]' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= 3 ? 'bg-[#00AEEF] text-white' : 'bg-gray-100 text-gray-500'}`}>3</div>
                <span className="font-semibold text-sm hidden sm:block">Matrícula</span>
              </div>
            </>
          )}
        </div>

        {/* Form Body */}
        <form id="student-modal-form" onSubmit={handleSubmit(onSubmit)} className="overflow-y-auto p-6 flex-1">
          
          {step === 1 && (
            <div className="space-y-6 animate-fade-in">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider border-b pb-1.5">
                Información Personal del Estudiante
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Nombres *</label>
                  <input
                    {...register('nombres', { required: 'Nombres requeridos' })}
                    className="form-input w-full bg-gray-50 focus:bg-white"
                    placeholder="Nombres completos"
                  />
                  {errors.nombres && <span className="text-xs text-red-500 mt-1 block">{errors.nombres.message as string}</span>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Apellidos *</label>
                  <input
                    {...register('apellidos', { required: 'Apellidos requeridos' })}
                    className="form-input w-full bg-gray-50 focus:bg-white"
                    placeholder="Apellidos completos"
                  />
                  {errors.apellidos && <span className="text-xs text-red-500 mt-1 block">{errors.apellidos.message as string}</span>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Cédula de Identidad *</label>
                  <input
                    {...register('cedula', { 
                      required: 'Cédula es obligatoria',
                      minLength: { value: 10, message: 'Debe tener al menos 10 dígitos' }
                    })}
                    maxLength={15}
                    className="form-input w-full bg-gray-50 focus:bg-white"
                    placeholder="Número de cédula"
                  />
                  {errors.cedula && <span className="text-xs text-red-500 mt-1 block">{errors.cedula.message as string}</span>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Fecha de Nacimiento *</label>
                  <input
                    type="date"
                    {...register('fecha_nacimiento', { required: 'Requerido' })}
                    className="form-input w-full bg-gray-50 focus:bg-white"
                  />
                  {errors.fecha_nacimiento && <span className="text-xs text-red-500 mt-1 block">{errors.fecha_nacimiento.message as string}</span>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Sexo *</label>
                  <select
                    {...register('sexo')}
                    className="form-input w-full bg-gray-50 focus:bg-white cursor-pointer"
                  >
                    <option value="Masculino">Masculino</option>
                    <option value="Femenino">Femenino</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Nacionalidad</label>
                  <input
                    {...register('nacionalidad')}
                    className="form-input w-full bg-gray-50 focus:bg-white"
                    placeholder="Ej. Ecuatoriana"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Dirección (Opcional)</label>
                  <input
                    {...register('direccion')}
                    className="form-input w-full bg-gray-50 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Teléfono (Opcional)</label>
                  <input
                    {...register('telefono')}
                    className="form-input w-full bg-gray-50 focus:bg-white"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Observaciones</label>
                <textarea
                  {...register('observaciones')}
                  rows={2}
                  className="form-input w-full bg-gray-50 focus:bg-white"
                  placeholder="Detalles adicionales sobre el estudiante..."
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-fade-in">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider border-b pb-1.5">
                Representante Principal
              </h3>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                <strong>Nota:</strong> Digite la cédula. Si el representante ya existe, sus datos se completarán automáticamente.
              </div>

              <input type="hidden" {...register('representantes.0.id_representante')} />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Cédula del Representante *</label>
                  <div className="relative">
                    <input
                      {...register('representantes.0.cedula', { required: 'La cédula del representante es obligatoria' })}
                      className="form-input w-full"
                      placeholder="Buscar por cédula..."
                    />
                    {loadingRep && (
                      <div className="absolute right-3 top-2.5">
                        <FiLoader className="animate-spin text-[#00AEEF]" size={16} />
                      </div>
                    )}
                  </div>
                  {repStatus === 'found' && (
                    <span className="text-[10px] text-emerald-600 font-semibold mt-1 block">✓ Representante registrado</span>
                  )}
                  {repStatus === 'new' && (
                    <span className="text-[10px] text-amber-600 font-semibold mt-1 block">⚠ Nuevo representante a crear</span>
                  )}
                  {errors.representantes?.[0]?.cedula && <span className="text-xs text-red-500 mt-1 block">{errors.representantes[0].cedula.message as string}</span>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Nombres del Representante *</label>
                  <input
                    {...register('representantes.0.nombres', { required: 'Obligatorio' })}
                    disabled={repStatus === 'found'}
                    className="form-input w-full disabled:bg-gray-100 disabled:text-gray-400"
                  />
                  {errors.representantes?.[0]?.nombres && <span className="text-xs text-red-500 mt-1 block">Requerido</span>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Apellidos del Representante *</label>
                  <input
                    {...register('representantes.0.apellidos', { required: 'Obligatorio' })}
                    disabled={repStatus === 'found'}
                    className="form-input w-full disabled:bg-gray-100 disabled:text-gray-400"
                  />
                  {errors.representantes?.[0]?.apellidos && <span className="text-xs text-red-500 mt-1 block">Requerido</span>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Parentesco</label>
                  <select
                    {...register('representantes.0.parentesco')}
                    className="form-input w-full cursor-pointer bg-white"
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
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Teléfono Principal *</label>
                  <input
                    {...register('representantes.0.telefono', { required: 'Obligatorio' })}
                    disabled={repStatus === 'found'}
                    className="form-input w-full disabled:bg-gray-100 disabled:text-gray-400"
                  />
                  {errors.representantes?.[0]?.telefono && <span className="text-xs text-red-500 mt-1 block">Requerido</span>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Correo Electrónico</label>
                  <input
                    type="email"
                    {...register('representantes.0.correo')}
                    disabled={repStatus === 'found'}
                    className="form-input w-full disabled:bg-gray-100 disabled:text-gray-400"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Dirección del Representante</label>
                <input
                  {...register('representantes.0.direccion')}
                  disabled={repStatus === 'found'}
                  className="form-input w-full disabled:bg-gray-100 disabled:text-gray-400"
                />
              </div>

              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <p className="text-xs font-bold text-gray-600 mb-3 uppercase">Permisos del Representante</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" {...register('representantes.0.es_responsable_economico')} className="rounded border-gray-300 text-[#00AEEF] focus:ring-[#00AEEF]" />
                    <span className="text-sm text-gray-700">Responsable Económico</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" {...register('representantes.0.autorizado_retiro')} className="rounded border-gray-300 text-[#00AEEF] focus:ring-[#00AEEF]" />
                    <span className="text-sm text-gray-700">Autorizado para Retiro</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" {...register('representantes.0.recibe_notificaciones')} className="rounded border-gray-300 text-[#00AEEF] focus:ring-[#00AEEF]" />
                    <span className="text-sm text-gray-700">Recibe Notificaciones</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" {...register('representantes.0.vive_con_estudiante')} className="rounded border-gray-300 text-[#00AEEF] focus:ring-[#00AEEF]" />
                    <span className="text-sm text-gray-700">Vive con el Estudiante</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {step === 3 && !isEditMode && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
                  <FiClock className="text-[#00AEEF]" /> Matrícula Académica (Opcional)
                </h3>
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-sm font-semibold text-gray-600">Generar Matrícula</span>
                  <div className={`w-10 h-5 flex items-center rounded-full p-1 transition-colors ${generarMatricula ? 'bg-[#00AEEF]' : 'bg-gray-300'}`} onClick={() => setGenerarMatricula(!generarMatricula)}>
                    <div className={`bg-white w-3 h-3 rounded-full shadow-md transform transition-transform ${generarMatricula ? 'translate-x-5' : ''}`}></div>
                  </div>
                </label>
              </div>

              {generarMatricula ? (
                <div className="space-y-6">
                  {periodoActivo ? (
                    <div className="bg-sky-50 text-sky-800 p-3 rounded-lg text-sm border border-sky-100 flex items-center justify-between">
                      <span className="font-semibold">Periodo Lectivo Activo:</span>
                      <span className="font-bold">{periodoActivo.nombre}</span>
                    </div>
                  ) : (
                    <div className="bg-amber-50 text-amber-800 p-3 rounded-lg text-sm border border-amber-100">
                      ⚠ No hay un periodo lectivo activo configurado.
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Oferta Académica (Curso) *</label>
                      <select
                        {...register('matricula.oferta_academica_id', { required: generarMatricula })}
                        className="form-input w-full cursor-pointer bg-gray-50 focus:bg-white"
                        disabled={!periodoActivo}
                      >
                        <option value="">Seleccione una oferta...</option>
                        {ofertas.map(o => (
                          <option key={o.id} value={o.id}>{o.curso_nombre} "{o.paralelo_nombre}" - Cupos: {o.cupos_disponibles}</option>
                        ))}
                      </select>
                      {errors.matricula?.oferta_academica_id && <span className="text-xs text-red-500 mt-1 block">Seleccione la oferta</span>}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Tipo de Matrícula *</label>
                      <select
                        {...register('matricula.tipo_matricula_id', { required: generarMatricula })}
                        className="form-input w-full cursor-pointer bg-gray-50 focus:bg-white"
                      >
                        {tiposMatricula.map(t => (
                          <option key={t.id} value={t.id}>{t.nombre}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex justify-between items-center h-full">
                      <span className="text-sm font-semibold text-gray-500">Tarifa Base Calculada:</span>
                      <span className="text-lg font-bold text-gray-800">${tarifaBase.toFixed(2)}</span>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mt-2">
                        La matrícula se creará en estado <strong>BORRADOR</strong>.
                        Podrá registrar descuentos, recargos y confirmar la matrícula en el módulo de Matrículas una vez registrado el estudiante.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 p-8 rounded-xl border border-gray-100 text-center text-gray-500 text-sm">
                  La matrícula se ha deshabilitado. El estudiante será registrado únicamente en el directorio.
                </div>
              )}
            </div>
          )}

        </form>

        {/* Footer */}
        <div className="flex justify-between items-center px-6 py-4 border-t border-gray-100 bg-gray-50">
          <div className="flex gap-2">
             {step > 1 && (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-150 rounded-xl transition-colors border border-gray-200 flex items-center gap-1"
              >
                <FiChevronLeft size={16} /> Atrás
              </button>
            )}
          </div>
          <div className="flex gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-150 rounded-xl transition-colors border border-gray-200"
            >
              Cancelar
            </button>
            
            {step < (isEditMode ? 2 : 3) ? (
              <button
                type="button"
                onClick={onNextStep}
                className="px-5 py-2 text-sm font-semibold text-white bg-[#00AEEF] hover:bg-[#0095CC] rounded-xl shadow-sm hover:shadow-md transition-all flex items-center gap-1.5"
              >
                Siguiente <FiChevronRight size={16} />
              </button>
            ) : (
              <button
                type="submit"
                form="student-modal-form"
                className="px-5 py-2 text-sm font-semibold text-gray-900 bg-[#F4C542] hover:bg-[#E3B632] rounded-xl shadow-sm hover:shadow-md transition-all flex items-center gap-1.5"
              >
                <FiSave size={15} />
                {isEditMode ? 'Guardar Cambios' : 'Finalizar Registro'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EstudianteFormModal;
