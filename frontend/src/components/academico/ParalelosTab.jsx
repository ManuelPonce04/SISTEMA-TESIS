import React, { useState, useEffect } from 'react';
import academicoService from '../../services/academicoService';
import Swal from 'sweetalert2';

const ParalelosTab = () => {
  const [paralelos, setParalelos] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchParalelos = async () => {
    try {
      setLoading(true);
      const res = await academicoService.getParalelos();
      if (res.success) setParalelos(res.data);
    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'No se pudieron cargar los paralelos', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParalelos();
  }, []);

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-slate-800">Paralelos Habilitados</h2>
      </div>

      {loading ? (
        <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#27A9E1]"></div></div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {paralelos.map(p => (
            <div key={p.id} className="border border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center bg-slate-50 hover:bg-white hover:shadow-md transition-all">
              <span className="text-4xl font-black text-[#27A9E1] mb-2">{p.codigo}</span>
              <span className="text-sm font-medium text-slate-600">{p.nombre}</span>
            </div>
          ))}
          {paralelos.length === 0 && (
            <div className="col-span-4 p-8 text-center text-slate-500 border border-slate-200 rounded-xl">No hay paralelos registrados</div>
          )}
        </div>
      )}
    </div>
  );
};

export default ParalelosTab;
