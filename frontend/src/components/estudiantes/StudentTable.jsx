import React from 'react';
import { FiEdit2, FiTrash2, FiEye, FiClock, FiDollarSign } from 'react-icons/fi';

const StudentTable = ({ data, onEdit, onDelete, onView }) => {
  if (!data || data.length === 0) {
    return (
      <div className="empty-state">
        <p>No se encontraron estudiantes con los filtros actuales.</p>
      </div>
    );
  }

  return (
    <div className="table-responsive">
      <table className="custom-table">
        <thead>
          <tr>
            <th>Código</th>
            <th>Estudiante</th>
            <th>Curso</th>
            <th>Paralelo</th>
            <th>Representante</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {data.map((student) => (
            <tr key={student.id_estudiante}>
              <td>
                <span className="badge-codigo">{student.codigo}</span>
              </td>
              <td>
                <div className="cell-flex">
                  <span className="font-medium text-gray-800">{student.nombres} {student.apellidos}</span>
                  <span className="text-xs text-gray-500">C.I: {student.cedula}</span>
                </div>
              </td>
              <td>{student.curso || '-'}</td>
              <td>{student.paralelo || '-'}</td>
              <td>{student.representante_nombre || '-'}</td>
              <td>
                <span className={`status-badge ${student.estado === 'Activo' ? 'status-active' : 'status-inactive'}`}>
                  {student.estado}
                </span>
              </td>
              <td>
                <div className="action-buttons">
                  <button 
                    className="btn-icon btn-view" 
                    title="Ver Detalle"
                    onClick={() => onView(student)}
                  >
                    <FiEye />
                  </button>
                  <button 
                    className="btn-icon btn-edit" 
                    title="Editar"
                    onClick={() => onEdit(student)}
                  >
                    <FiEdit2 />
                  </button>
                  {/* Optional actions from UX requirements */}
                  <button className="btn-icon btn-history" title="Historial">
                    <FiClock />
                  </button>
                  <button className="btn-icon btn-payments" title="Ver Pensiones">
                    <FiDollarSign />
                  </button>
                  {/* Delete button (will be conditionally hidden based on user role in parent component) */}
                  <button 
                    className="btn-icon btn-delete" 
                    title="Eliminar"
                    onClick={() => onDelete(student.id_estudiante)}
                  >
                    <FiTrash2 />
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

export default StudentTable;
