import React, { useState, useEffect } from 'react';
import academicoService from '../../services/academicoService';
import Swal from 'sweetalert2';

const CursosTab = () => {
  const [cursos, setCursos] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchCursos = async () => {
    try {
      setLoading(true);
      const res = await academicoService.getCursos();
      if (res.success) setCursos(res.data);
    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'No se pudieron cargar los cursos', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCursos();
  }, []);

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-slate-800">Cursos Registrados</h2>
      </div>

      {loading ? (
        <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#27A9E1]"></div></div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 text-sm border-b border-slate-200">
                <th className="p-4 font-semibold w-24 text-center">Orden</th>
                <th className="p-4 font-semibold">Código</th>
                <th className="p-4 font-semibold">Nombre del Curso</th>
                <th className="p-4 font-semibold">Nivel Educativo</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {cursos.map(c => (
                <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="p-4 text-center">
                    <span className="bg-slate-200 text-slate-700 font-bold px-2.5 py-1 rounded-full text-xs">{c.orden_academico}</span>
                  </td>
                  <td className="p-4 font-medium text-slate-700">{c.codigo}</td>
                  <td className="p-4 font-semibold text-slate-800">{c.nombre}</td>
                  <td className="p-4 text-slate-600">{c.nivel_nombre}</td>
                </tr>
              ))}
              {cursos.length === 0 && (
                <tr><td colSpan="4" className="p-8 text-center text-slate-500">No hay cursos registrados</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default CursosTab;
