import React from 'react';
import { FiEdit2, FiTrash2, FiEye, FiClock, FiDollarSign } from 'react-icons/fi';
import { Estudiante } from '../../types/estudiante';
import Badge from '../ui/Badge';

interface EstudianteTableProps {
  data: Estudiante[];
  onEdit: (student: Estudiante) => void;
  onDelete: (id: number) => void;
  onView: (student: Estudiante) => void;
  currentUser?: { es_admin?: boolean };
}

const getEstadoBadgeVariant = (estado: string) => {
  switch (estado) {
    case 'ACTIVO':
      return 'green';
    case 'INACTIVO':
      return 'red';
    case 'RETIRADO':
      return 'yellow';
    default:
      return 'gray';
  }
};

export const EstudianteTable: React.FC<EstudianteTableProps> = ({ data, onEdit, onDelete, onView, currentUser }) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm whitespace-nowrap" role="table" aria-label="Tabla de estudiantes">
        <thead className="bg-gray-50 text-gray-400 font-semibold uppercase tracking-wider text-xs border-b border-gray-100">
          <tr>
            <th className="px-6 py-4" scope="col">Código</th>
            <th className="px-6 py-4" scope="col">Estudiante</th>
            <th className="px-6 py-4" scope="col">Fecha Nac.</th>
            <th className="px-6 py-4" scope="col">Representante Principal</th>
            <th className="px-6 py-4" scope="col">Contacto Rep.</th>
            <th className="px-6 py-4" scope="col">Estado</th>
            <th className="px-6 py-4 text-right" scope="col">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {data.map((student) => (
            <tr key={student.id_estudiante} className="hover:bg-[#f8fafc] transition-colors group">
              {/* Código */}
              <td className="px-6 py-4">
                <span className="inline-flex items-center px-2.5 py-1 bg-[#e0f7ff] text-[#00AEEF] text-xs font-bold rounded-lg border border-[#27A9E1]/20">
                  {student.codigo}
                </span>
              </td>
              {/* Apellidos y Nombres */}
              <td className="px-6 py-4">
                <div className="flex flex-col">
                  <span className="font-semibold text-gray-800 text-sm">
                    {student.apellidos_nombres}
                  </span>
                  <span className="text-xs text-gray-400 font-medium">
                    C.I: {student.cedula || 'N/A'} {student.es_nuevo ? '· (Nuevo)' : ''}
                  </span>
                </div>
              </td>
              {/* Fecha Nacimiento */}
              <td className="px-6 py-4 text-gray-600 text-sm">
                {student.fecha_nacimiento ? new Date(student.fecha_nacimiento).toLocaleDateString() : '-'}
              </td>
              {/* Representante Nombre */}
              <td className="px-6 py-4 text-gray-600 text-sm font-semibold">
                {student.representante_nombre || 'No Asignado'}
              </td>
              {/* Contacto */}
              <td className="px-6 py-4">
                <span className="text-sm text-gray-600">
                  {student.representante_telefono || '-'}
                </span>
              </td>
              {/* Estado */}
              <td className="px-6 py-4">
                <Badge variant={getEstadoBadgeVariant(student.estado || 'INACTIVO')}>
                  {student.estado}
                </Badge>
              </td>
              {/* Acciones */}
              <td className="px-6 py-4 text-right">
                <div className="flex items-center justify-end gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => onView(student)}
                    className="p-1.5 text-gray-400 hover:text-[#27A9E1] hover:bg-sky-50 rounded-lg transition-colors"
                    title="Ver Ficha Detallada"
                    aria-label={`Ver detalle de ${student.apellidos_nombres}`}
                  >
                    <FiEye size={16} />
                  </button>
                  <button
                    onClick={() => onEdit(student)}
                    className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                    title="Editar Información"
                    aria-label={`Editar a ${student.apellidos_nombres}`}
                  >
                    <FiEdit2 size={16} />
                  </button>
                  <button
                    onClick={() => student.id_estudiante && onDelete(student.id_estudiante)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Dar de Baja (Inactivo)"
                    aria-label={`Desactivar a ${student.apellidos_nombres}`}
                  >
                    <FiTrash2 size={16} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default EstudianteTable;
