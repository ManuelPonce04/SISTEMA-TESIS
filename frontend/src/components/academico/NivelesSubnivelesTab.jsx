import React, { useState, useEffect } from 'react';
import { FiPlus, FiEdit2, FiLayers } from 'react-icons/fi';
import academicoService from '../../services/academicoService';
import Swal from 'sweetalert2';

const NivelesSubnivelesTab = () => {
  const [niveles, setNiveles] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNiveles = async () => {
    try {
      setLoading(true);
      const res = await academicoService.getNiveles();
      if (res.success) setNiveles(res.data);
    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'No se pudieron cargar los niveles', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNiveles();
  }, []);

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-slate-800">Estructura de Niveles y Subniveles</h2>
      </div>

      {loading ? (
        <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#27A9E1]"></div></div>
      ) : (
        <div className="space-y-4">
          {niveles.map(nivel => (
            <div key={nivel.id} className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-50 p-4 flex items-center justify-between border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#27A9E1]/10 text-[#27A9E1] flex items-center justify-center">
                    <FiLayers size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800">{nivel.nombre} <span className="text-sm font-normal text-slate-500 ml-2">({nivel.codigo})</span></h3>
                  </div>
                </div>
              </div>
              <div className="p-4 bg-white">
                {nivel.subniveles && nivel.subniveles.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {nivel.subniveles.map(sub => (
                      <div key={sub.id} className="border border-slate-100 rounded-lg p-3 bg-slate-50 flex items-center justify-between">
                        <span className="font-medium text-slate-700">{sub.nombre}</span>
                        <span className="text-xs text-slate-400 bg-white px-2 py-1 rounded border border-slate-100">{sub.codigo}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 italic">No hay subniveles registrados (ej. Bachillerato no suele tener subniveles).</p>
                )}
              </div>
            </div>
          ))}
          {niveles.length === 0 && (
            <div className="p-8 text-center text-slate-500 border border-slate-200 rounded-xl">No hay niveles registrados</div>
          )}
        </div>
      )}
    </div>
  );
};

export default NivelesSubnivelesTab;
