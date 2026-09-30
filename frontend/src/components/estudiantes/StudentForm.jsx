import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import estudiantesService from '../../services/estudiantesService';
import Swal from 'sweetalert2';

const StudentForm = ({ initialData, onSubmitSuccess, onCancel, cursos }) => {
  const { register, handleSubmit, setValue, getValues, watch, formState: { errors } } = useForm({
    defaultValues: initialData || {
      estado: 'Activo',
      anio_lectivo: '2026-2027',
      sexo: 'Masculino'
    }
  });

  const [loadingRep, setLoadingRep] = useState(false);
  const repCedula = watch('rep_cedula');

  // Si estamos en modo edición y hay datos iniciales
  useEffect(() => {
    if (initialData) {
      Object.keys(initialData).forEach(key => {
        // Formatear fechas para los input type="date"
        if (key === 'fecha_nacimiento' && initialData[key]) {
          setValue(key, initialData[key].split('T')[0]);
        } else {
          setValue(key, initialData[key]);
        }
      });
      // Set representant data
      if (initialData.rep_cedula) {
        setValue('rep_cedula', initialData.rep_cedula);
        setValue('rep_nombres', initialData.rep_nombres);
        setValue('rep_apellidos', initialData.rep_apellidos);
        setValue('rep_telefono', initialData.rep_telefono);
        setValue('rep_correo', initialData.rep_correo);
        setValue('rep_direccion', initialData.rep_direccion);
      }
    }
  }, [initialData, setValue]);

  // Autocompletar representante cuando la cédula alcanza 10 caracteres (Ecuador)
  useEffect(() => {
    const fetchRepresentante = async () => {
      if (repCedula && repCedula.length >= 10 && !initialData?.id_representante) {
        setLoadingRep(true);
        try {
          const res = await estudiantesService.getRepresentanteByCedula(repCedula);
          if (res.success && res.data) {
            const rep = res.data;
            setValue('id_representante', rep.id_representante);
            setValue('rep_nombres', rep.nombres);
            setValue('rep_apellidos', rep.apellidos);
            setValue('rep_telefono', rep.telefono || '');
            setValue('rep_correo', rep.correo || '');
            setValue('rep_direccion', rep.direccion || '');
            
            // Notification toast that it was found
            const Toast = Swal.mixin({
              toast: true,
              position: 'top-end',
              showConfirmButton: false,
              timer: 3000
            });
            Toast.fire({ icon: 'info', title: 'Representante encontrado' });
          } else {
            // Limpiar si no existe, para que pueda escribirlo
            setValue('id_representante', null);
          }
        } catch (error) {
          console.error("Error fetching representante", error);
        } finally {
          setLoadingRep(false);
        }
      }
    };

    // Debounce manual simple
    const timer = setTimeout(() => {
      fetchRepresentante();
    }, 500);

    return () => clearTimeout(timer);
  }, [repCedula, initialData, setValue]);

  const onSubmit = async (data) => {
    try {
      if (initialData?.id_estudiante) {
        await estudiantesService.update(initialData.id_estudiante, data);
        Swal.fire('Actualizado', 'El estudiante ha sido actualizado correctamente.', 'success');
      } else {
        await estudiantesService.create(data);
        Swal.fire('Registrado', 'El estudiante ha sido registrado correctamente.', 'success');
      }
      onSubmitSuccess();
    } catch (error) {
      Swal.fire('Error', error.response?.data?.message || 'Hubo un problema al guardar', 'error');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="student-form space-y-6">
      
      {/* Información Personal */}
      <div className="form-section">
        <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 mb-4">Información Personal</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Código *</label>
            <input 
              {...register('codigo', { required: 'Requerido' })} 
              className={`form-input mt-1 block w-full ${errors.codigo ? 'border-red-500' : ''}`} 
              placeholder="Ej. 2026001" 
            />
            {errors.codigo && <span className="text-xs text-red-500">{errors.codigo.message}</span>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Cédula *</label>
            <input 
              {...register('cedula', { 
                required: 'Requerido',
                minLength: { value: 10, message: 'Debe tener 10 dígitos' }
              })} 
              className={`form-input mt-1 block w-full ${errors.cedula ? 'border-red-500' : ''}`} 
              maxLength="15"
            />
            {errors.cedula && <span className="text-xs text-red-500">{errors.cedula.message}</span>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Nombres *</label>
            <input 
              {...register('nombres', { required: 'Requerido' })} 
              className={`form-input mt-1 block w-full ${errors.nombres ? 'border-red-500' : ''}`} 
            />
            {errors.nombres && <span className="text-xs text-red-500">{errors.nombres.message}</span>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Apellidos *</label>
            <input 
              {...register('apellidos', { required: 'Requerido' })} 
              className={`form-input mt-1 block w-full ${errors.apellidos ? 'border-red-500' : ''}`} 
            />
            {errors.apellidos && <span className="text-xs text-red-500">{errors.apellidos.message}</span>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Fecha de nacimiento *</label>
            <input 
              type="date"
              {...register('fecha_nacimiento', { required: 'Requerido' })} 
              className={`form-input mt-1 block w-full ${errors.fecha_nacimiento ? 'border-red-500' : ''}`} 
            />
            {errors.fecha_nacimiento && <span className="text-xs text-red-500">{errors.fecha_nacimiento.message}</span>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Sexo *</label>
            <select 
              {...register('sexo', { required: 'Requerido' })} 
              className="form-input mt-1 block w-full"
            >
              <option value="Masculino">Masculino</option>
              <option value="Femenino">Femenino</option>
            </select>
          </div>
          
        </div>
      </div>

      {/* Información Académica */}
      <div className="form-section">
        <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 mb-4">Información Académica</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Curso *</label>
            <select 
              {...register('id_curso', { required: 'Requerido' })} 
              className={`form-input mt-1 block w-full ${errors.id_curso ? 'border-red-500' : ''}`}
            >
              <option value="">Seleccione...</option>
              {cursos.map(c => (
                <option key={c.id_curso} value={c.id_curso}>{c.nombre}</option>
              ))}
            </select>
            {errors.id_curso && <span className="text-xs text-red-500">{errors.id_curso.message}</span>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Paralelo *</label>
            <select 
              {...register('paralelo', { required: 'Requerido' })} 
              className="form-input mt-1 block w-full"
            >
              <option value="">Seleccione...</option>
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="C">C</option>
              <option value="D">D</option>
            </select>
            {errors.paralelo && <span className="text-xs text-red-500">{errors.paralelo.message}</span>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Año Lectivo *</label>
            <input 
              {...register('anio_lectivo', { required: 'Requerido' })} 
              className="form-input mt-1 block w-full bg-gray-50" 
              readOnly
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Estado</label>
            <select 
              {...register('estado')} 
              className="form-input mt-1 block w-full"
            >
              <option value="Activo">Activo</option>
              <option value="Inactivo">Inactivo</option>
            </select>
          </div>

        </div>
      </div>

      {/* Información del Representante */}
      <div className="form-section bg-gray-50 p-4 rounded-lg border">
        <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 mb-4">Información del Representante</h3>
        
        <input type="hidden" {...register('id_representante')} />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Cédula * {loadingRep && <span className="text-blue-500 text-xs ml-2">Buscando...</span>}
            </label>
            <input 
              {...register('rep_cedula', { required: 'Requerido' })} 
              className={`form-input mt-1 block w-full ${errors.rep_cedula ? 'border-red-500' : ''}`} 
              maxLength="15"
            />
            {errors.rep_cedula && <span className="text-xs text-red-500">{errors.rep_cedula.message}</span>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Nombres *</label>
            <input 
              {...register('rep_nombres', { required: 'Requerido' })} 
              className={`form-input mt-1 block w-full ${errors.rep_nombres ? 'border-red-500' : ''}`} 
            />
            {errors.rep_nombres && <span className="text-xs text-red-500">{errors.rep_nombres.message}</span>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Apellidos *</label>
            <input 
              {...register('rep_apellidos', { required: 'Requerido' })} 
              className={`form-input mt-1 block w-full ${errors.rep_apellidos ? 'border-red-500' : ''}`} 
            />
            {errors.rep_apellidos && <span className="text-xs text-red-500">{errors.rep_apellidos.message}</span>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Teléfono</label>
            <input 
              {...register('rep_telefono')} 
              className="form-input mt-1 block w-full" 
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Correo</label>
            <input 
              type="email"
              {...register('rep_correo')} 
              className="form-input mt-1 block w-full" 
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Dirección</label>
            <input 
              {...register('rep_direccion')} 
              className="form-input mt-1 block w-full" 
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <button type="button" onClick={onCancel} className="btn-secondary px-6 py-2">
          Cancelar
        </button>
        <button type="submit" className="btn-primary px-6 py-2">
          Guardar Estudiante
        </button>
      </div>

    </form>
  );
};

export default StudentForm;
