import React, { useState, useEffect } from 'react';
import academicoService from '../../services/academicoService';
import Swal from 'sweetalert2';
import { FiClock } from 'react-icons/fi';

const JornadasTab = () => {
  const [jornadas, setJornadas] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchJornadas = async () => {
    try {
      setLoading(true);
      const res = await academicoService.getJornadas();
      if (res.success) setJornadas(res.data);
    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'No se pudieron cargar las jornadas', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJornadas();
  }, []);

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-slate-800">Jornadas Habilitadas</h2>
      </div>

      {loading ? (
        <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#27A9E1]"></div></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {jornadas.map(j => (
            <div key={j.id} className="border border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center bg-slate-50 hover:bg-white hover:shadow-md transition-all">
              <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-3">
                <FiClock size={24} />
              </div>
              <span className="text-xl font-bold text-slate-800 mb-1">{j.nombre}</span>
              <span className="text-sm font-medium text-slate-500 uppercase tracking-wide">{j.codigo}</span>
            </div>
          ))}
          {jornadas.length === 0 && (
            <div className="col-span-3 p-8 text-center text-slate-500 border border-slate-200 rounded-xl">No hay jornadas registradas</div>
          )}
        </div>
      )}
    </div>
  );
};

export default JornadasTab;
