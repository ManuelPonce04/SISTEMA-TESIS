import React from 'react';

const StudentDetails = ({ student }) => {
  if (!student) return null;

  return (
    <div className="space-y-6">
      
      {/* Sección 1: Info Personal */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="text-md font-semibold text-gray-800 mb-3 border-b pb-2">Información Personal</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="block text-gray-500 font-medium text-xs">Código</span>
            <span className="text-gray-900 font-semibold">{student.codigo}</span>
          </div>
          <div>
            <span className="block text-gray-500 font-medium text-xs">Cédula</span>
            <span className="text-gray-900">{student.cedula}</span>
          </div>
          <div>
            <span className="block text-gray-500 font-medium text-xs">Nombre Completo</span>
            <span className="text-gray-900">{student.nombres} {student.apellidos}</span>
          </div>
          <div>
            <span className="block text-gray-500 font-medium text-xs">Fecha Nacimiento</span>
            <span className="text-gray-900">{new Date(student.fecha_nacimiento).toLocaleDateString('es-ES')}</span>
          </div>
          <div>
            <span className="block text-gray-500 font-medium text-xs">Sexo</span>
            <span className="text-gray-900">{student.sexo}</span>
          </div>
          <div>
            <span className="block text-gray-500 font-medium text-xs">Estado</span>
            <span className={`status-badge ${student.estado === 'Activo' ? 'status-active' : 'status-inactive'}`}>
              {student.estado}
            </span>
          </div>
        </div>
      </div>

      {/* Sección 2: Info Académica */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="text-md font-semibold text-gray-800 mb-3 border-b pb-2">Información Académica (Matrícula Activa)</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="block text-gray-500 font-medium text-xs">Curso</span>
            <span className="text-gray-900 font-semibold">{student.curso_nombre || 'No asignado'}</span>
          </div>
          <div>
            <span className="block text-gray-500 font-medium text-xs">Paralelo</span>
            <span className="text-gray-900">{student.paralelo || '-'}</span>
          </div>
          <div>
            <span className="block text-gray-500 font-medium text-xs">Año Lectivo</span>
            <span className="text-gray-900">{student.anio_lectivo || '-'}</span>
          </div>
        </div>
      </div>

      {/* Sección 3: Representante */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="text-md font-semibold text-gray-800 mb-3 border-b pb-2">Información del Representante</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="block text-gray-500 font-medium text-xs">Cédula</span>
            <span className="text-gray-900">{student.rep_cedula || '-'}</span>
          </div>
          <div>
            <span className="block text-gray-500 font-medium text-xs">Nombre</span>
            <span className="text-gray-900">{student.rep_nombres} {student.rep_apellidos}</span>
          </div>
          <div>
            <span className="block text-gray-500 font-medium text-xs">Teléfono</span>
            <span className="text-gray-900">{student.rep_telefono || '-'}</span>
          </div>
          <div>
            <span className="block text-gray-500 font-medium text-xs">Correo</span>
            <span className="text-gray-900">{student.rep_correo || '-'}</span>
          </div>
          <div className="col-span-2">
            <span className="block text-gray-500 font-medium text-xs">Dirección</span>
            <span className="text-gray-900">{student.rep_direccion || '-'}</span>
          </div>
        </div>
      </div>

    </div>
  );
};

export default StudentDetails;
