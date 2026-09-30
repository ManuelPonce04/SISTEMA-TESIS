import React from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import { FiEye, FiEdit2, FiXCircle } from 'react-icons/fi';

const MatriculaTable = ({ matriculas, loading }) => {
  const navigate = useNavigate();

  const getEstadoBadge = (estado) => {
    switch (estado) {
      case 'Activa': return <Badge type="success">Activa</Badge>;
      case 'Anulada': return <Badge type="danger">Anulada</Badge>;
      case 'Finalizada': return <Badge type="info">Finalizada</Badge>;
      case 'Pendiente': return <Badge type="warning">Pendiente</Badge>;
      default: return <Badge>{estado}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <div className="flex flex-col gap-4 animate-pulse">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-12 bg-gray-100 rounded-lg"></div>
          ))}
        </div>
      </Card>
    );
  }

  if (!matriculas || matriculas.length === 0) {
    return (
      <Card>
        <div className="text-center py-10 text-gray-500">
          <p>No se encontraron matrículas con los filtros aplicados.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card noPadding className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-500 uppercase tracking-wider text-[0.7rem] font-bold border-b border-gray-100">
              <th className="px-4 py-3">Código</th>
              <th className="px-4 py-3">Estudiante</th>
              <th className="px-4 py-3">Año Lectivo</th>
              <th className="px-4 py-3">Curso</th>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3 text-center">Pensiones</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {matriculas.map((mat) => (
              <tr key={mat.id_matricula} className="hover:bg-gray-50/50 transition-colors group">
                <td className="px-4 py-3 font-medium text-gray-900">{mat.codigo_matricula}</td>
                <td className="px-4 py-3">
                  <div className="font-semibold text-gray-800">{mat.estudiante_nombres} {mat.estudiante_apellidos}</div>
                  <div className="text-xs text-gray-400">CI: {mat.estudiante_cedula}</div>
                </td>
                <td className="px-4 py-3 font-medium text-gray-700">{mat.anio_lectivo}</td>
                <td className="px-4 py-3">
                  <div className="text-gray-800">{mat.curso_nombre}</div>
                  <div className="text-xs text-gray-500">Paralelo {mat.paralelo}</div>
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {new Date(mat.fecha_matricula).toLocaleDateString('es-EC')}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-xs">
                    {mat.pensiones_generadas}
                  </span>
                </td>
                <td className="px-4 py-3">{getEstadoBadge(mat.estado)}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => navigate(`/matriculas/${mat.id_matricula}`)}
                      className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Ver detalle"
                    >
                      <FiEye size={16} />
                    </button>
                    {mat.estado === 'Activa' && (
                      <>
                        <button 
                          onClick={() => navigate(`/matriculas/${mat.id_matricula}/editar`)}
                          className="p-1.5 text-orange-500 hover:bg-orange-50 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <FiEdit2 size={16} />
                        </button>
                        <button 
                          onClick={() => alert('Anular ' + mat.id_matricula)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Anular"
                        >
                          <FiXCircle size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

export default MatriculaTable;
