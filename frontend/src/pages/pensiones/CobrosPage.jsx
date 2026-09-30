import React, { useState, useEffect } from 'react';
import MainLayout from '../../components/layout/MainLayout';
import { FiSearch, FiDollarSign, FiCheckCircle, FiAlertCircle, FiUser } from 'react-icons/fi';
import { buscarEstudiantesParaCobro, getObligacionesCobrables, getMetodosPago, registrarCobro } from '../../services/cobroService';
import ReciboPagoModal from '../../components/pensiones/cobros/ReciboPagoModal';
import Swal from 'sweetalert2';

const ESTADO_BADGE = {
  PENDIENTE: 'bg-yellow-100 text-yellow-700',
  VENCIDA: 'bg-red-100 text-red-700',
  PARCIAL: 'bg-blue-100 text-blue-700',
};

export default function CobrosPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const [selectedMatricula, setSelectedMatricula] = useState(null);
  const [obligaciones, setObligaciones] = useState([]);
  const [creditoDisponible, setCreditoDisponible] = useState(0);
  const [loadingDeudas, setLoadingDeudas] = useState(false);
  
  const [metodosPago, setMetodosPago] = useState([]);
  
  // Payment Form State
  const [valorRecibido, setValorRecibido] = useState('');
  const [metodoSeleccionado, setMetodoSeleccionado] = useState('');
  const [numeroComprobante, setNumeroComprobante] = useState('');
  const [observacion, setObservacion] = useState('');
  
  // Distribution State
  const [distribucionManual, setDistribucionManual] = useState(false);
  const [aplicaciones, setAplicaciones] = useState({}); // { obligacionId: valorAplicado }

  const [processing, setProcessing] = useState(false);
  
  // Receipt State
  const [reciboData, setReciboData] = useState(null);
  const [isReciboOpen, setIsReciboOpen] = useState(false);

  useEffect(() => {
    cargarMetodos();
  }, []);

  const cargarMetodos = async () => {
    try {
      const res = await getMetodosPago();
      if (res.success) setMetodosPago(res.metodos);
    } catch (e) {
      console.error(e);
    }
  };

  // Debounced Search
  useEffect(() => {
    if (searchTerm.length < 3) {
      setSearchResults([]);
      return;
    }
    const delay = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await buscarEstudiantesParaCobro(searchTerm);
        if (res.success) setSearchResults(res.resultados);
      } catch (e) {
        console.error(e);
      }
      setIsSearching(false);
    }, 500);
    return () => clearTimeout(delay);
  }, [searchTerm]);

  const handleSelectStudent = async (student) => {
    setSelectedMatricula(student);
    setSearchTerm('');
    setSearchResults([]);
    setLoadingDeudas(true);
    try {
      const res = await getObligacionesCobrables(student.matricula_id);
      if (res.success) {
        setObligaciones(res.obligaciones);
        setCreditoDisponible(parseFloat(res.credito_disponible));
        setAplicaciones({});
        setValorRecibido('');
      }
    } catch (error) {
      Swal.fire('Error', 'No se pudieron cargar las obligaciones', 'error');
    }
    setLoadingDeudas(false);
  };

  // Automatic Distribution Logic
  useEffect(() => {
    if (distribucionManual || !valorRecibido) return;
    
    let restante = parseFloat(valorRecibido);
    const nuevasApls = {};
    
    for (const ob of obligaciones) {
      const saldo = parseFloat(ob.saldo);
      if (restante <= 0) break;
      
      const aplicar = Math.min(saldo, restante);
      nuevasApls[ob.id] = aplicar.toFixed(2);
      restante -= aplicar;
    }
    setAplicaciones(nuevasApls);
  }, [valorRecibido, distribucionManual, obligaciones]);

  const handleManualDist = (id, valor) => {
    const v = parseFloat(valor) || 0;
    setAplicaciones(prev => ({
      ...prev,
      [id]: v > 0 ? v : undefined
    }));
  };

  const handleSumTotal = () => {
    return Object.values(aplicaciones).reduce((acc, curr) => acc + (parseFloat(curr) || 0), 0);
  };

  const submitCobro = async () => {
    const vr = parseFloat(valorRecibido);
    if (!vr || vr <= 0) return Swal.fire('Atención', 'Ingrese el valor recibido.', 'warning');
    if (!metodoSeleccionado) return Swal.fire('Atención', 'Seleccione un método de pago.', 'warning');
    
    const met = metodosPago.find(m => m.id === parseInt(metodoSeleccionado));
    if (met && met.requiere_comprobante && !numeroComprobante) {
      return Swal.fire('Atención', `El método ${met.nombre} requiere número de comprobante.`, 'warning');
    }

    const arrAplicaciones = Object.entries(aplicaciones)
      .map(([id, val]) => ({ obligacion_id: id, valor_aplicar: parseFloat(val) }))
      .filter(x => x.valor_aplicar > 0);
      
    if (arrAplicaciones.length === 0) {
      return Swal.fire('Atención', 'No se ha distribuido el pago en ninguna obligación.', 'warning');
    }

    const totalAplicado = handleSumTotal();
    const excedente = vr - totalAplicado;
    
    if (excedente < -0.01) {
      return Swal.fire('Error', 'El valor a aplicar supera al valor recibido.', 'error');
    }

    let confirmMsg = `Va a registrar un pago por $ ${vr.toFixed(2)}.`;
    if (excedente > 0.01) confirmMsg += `<br/><br/>Se generará un <b>Crédito a Favor</b> de $ ${excedente.toFixed(2)}.`;

    const result = await Swal.fire({
      title: '¿Confirmar Cobro?',
      html: confirmMsg,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, Registrar',
      confirmButtonColor: '#27A9E1',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      setProcessing(true);
      try {
        const payload = {
          estudiante_id: selectedMatricula.estudiante_id,
          matricula_id: selectedMatricula.matricula_id,
          periodo_lectivo_id: 1, // Este valor vendría del contexto o de la matricula
          fecha_pago: new Date().toISOString().split('T')[0],
          valor_recibido: vr,
          metodos: [{
            metodo_pago_id: metodoSeleccionado,
            valor: vr,
            numero_comprobante: numeroComprobante
          }],
          aplicaciones: arrAplicaciones,
          observacion
        };
        
        const res = await registrarCobro(payload);
        if (res.success) {
          Swal.fire('¡Éxito!', 'Pago registrado correctamente.', 'success');
          // Abrir modal de recibo
          setReciboData({ 
            numero_recibo: res.numero_recibo, 
            codigo: res.codigo, 
            estudiante: selectedMatricula, 
            total: vr, 
            metodo: met.nombre,
            comprobante: numeroComprobante,
            aplicaciones: arrAplicaciones,
            excedente
          });
          setIsReciboOpen(true);
          
          // Refrescar
          handleSelectStudent(selectedMatricula);
        }
      } catch (error) {
        Swal.fire('Error', error.response?.data?.message || 'Hubo un error al registrar el pago.', 'error');
      }
      setProcessing(false);
    }
  };

  const totalDeuda = obligaciones.reduce((acc, curr) => acc + parseFloat(curr.saldo), 0);
  const totalAplicado = handleSumTotal();
  const sobrante = parseFloat(valorRecibido || 0) - totalAplicado;

  return (
    <MainLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Registrar Cobro de Pensión</h1>
            <p className="text-gray-500 mt-1">Busque al estudiante y registre los valores recaudados.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Columna Izquierda: Buscador y Resumen */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">Buscar Estudiante</label>
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text" 
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-[#27A9E1] outline-none" 
                  placeholder="Nombre, cédula o código..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>

              {searchResults.length > 0 && (
                <div className="mt-2 border border-gray-200 rounded-xl overflow-hidden shadow-lg absolute z-10 w-full max-w-sm bg-white max-h-60 overflow-y-auto">
                  {searchResults.map(s => (
                    <div 
                      key={s.matricula_id} 
                      className="p-3 border-b hover:bg-gray-50 cursor-pointer flex flex-col"
                      onClick={() => handleSelectStudent(s)}
                    >
                      <span className="font-bold text-gray-800 text-sm">{s.nombres} {s.apellidos}</span>
                      <span className="text-xs text-gray-500">{s.curso} "{s.paralelo}" | Código: {s.codigo_interno}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {selectedMatricula && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 animate-fade-in">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                    <FiUser size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800">{selectedMatricula.nombres} {selectedMatricula.apellidos}</h3>
                    <p className="text-xs text-gray-500">{selectedMatricula.curso} "{selectedMatricula.paralelo}"</p>
                  </div>
                </div>
                
                <div className="space-y-3 pt-4 border-t border-gray-100">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Deuda Total:</span>
                    <span className="font-bold text-gray-800">${totalDeuda.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Crédito a Favor:</span>
                    <span className="font-bold text-emerald-600">${creditoDisponible.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Columna Derecha: Obligaciones y Pago */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            {!selectedMatricula ? (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 flex flex-col items-center justify-center text-center h-full min-h-[400px]">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                  <FiDollarSign size={32} className="text-gray-300" />
                </div>
                <h3 className="text-lg font-bold text-gray-700">Ningún Estudiante Seleccionado</h3>
                <p className="text-gray-500 max-w-md mt-2">Busque y seleccione un estudiante para visualizar sus obligaciones pendientes y registrar un nuevo cobro.</p>
              </div>
            ) : (
              <>
                {/* Formulario de Pago */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <h2 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Detalles del Ingreso</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Valor Recibido ($) *</label>
                      <input 
                        type="number" step="0.01" min="0.01"
                        className="w-full border border-gray-300 rounded-xl px-4 py-2.5 outline-none focus:ring-[#27A9E1] font-mono text-lg font-bold text-gray-800"
                        value={valorRecibido}
                        onChange={e => setValorRecibido(e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Método de Pago *</label>
                      <select 
                        className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:ring-[#27A9E1]"
                        value={metodoSeleccionado}
                        onChange={e => setMetodoSeleccionado(e.target.value)}
                      >
                        <option value="">Seleccione...</option>
                        {metodosPago.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">No. Comprobante / Ref</label>
                      <input 
                        type="text" 
                        className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:ring-[#27A9E1]"
                        value={numeroComprobante}
                        onChange={e => setNumeroComprobante(e.target.value)}
                        placeholder="Opcional..."
                      />
                    </div>
                  </div>
                </div>

                {/* Lista de Obligaciones */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h2 className="text-lg font-bold text-gray-800">Distribución de Pago</h2>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Manual:</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={distribucionManual} onChange={() => setDistribucionManual(!distribucionManual)} />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#27A9E1]"></div>
                      </label>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-gray-500 uppercase bg-gray-50/50">
                        <tr>
                          <th className="px-6 py-3 font-medium">Mes</th>
                          <th className="px-6 py-3 font-medium">Estado</th>
                          <th className="px-6 py-3 font-medium">Saldo Real</th>
                          <th className="px-6 py-3 font-medium">Aplicar ($)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {obligaciones.length === 0 ? (
                          <tr><td colSpan="4" className="text-center py-6 text-gray-500">No hay obligaciones pendientes</td></tr>
                        ) : (
                          obligaciones.map(ob => (
                            <tr key={ob.id} className="border-b last:border-0 hover:bg-gray-50/50">
                              <td className="px-6 py-4">
                                <p className="font-bold text-gray-800">{ob.mes_nombre}</p>
                                <p className="text-xs text-gray-500">Vence: {new Date(ob.fecha_vencimiento).toLocaleDateString('es-EC', {day: '2-digit', month: '2-digit', year: 'numeric'})}</p>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`px-2.5 py-1 text-xs font-bold rounded-lg ${ESTADO_BADGE[ob.estado]}`}>
                                  {ob.estado}
                                </span>
                              </td>
                              <td className="px-6 py-4 font-mono font-bold text-gray-800">
                                ${parseFloat(ob.saldo).toFixed(2)}
                              </td>
                              <td className="px-6 py-4">
                                <input 
                                  type="number" step="0.01" min="0" max={ob.saldo}
                                  className="w-24 border border-gray-300 rounded-lg px-2 py-1.5 outline-none focus:ring-[#27A9E1] font-mono text-right"
                                  value={aplicaciones[ob.id] || ''}
                                  onChange={e => handleManualDist(ob.id, e.target.value)}
                                  disabled={!distribucionManual}
                                  placeholder="0.00"
                                />
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Footer de Confirmación */}
                  <div className="p-6 bg-gray-50 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="text-sm">
                      <p className="text-gray-600">Total Distribuido: <span className="font-bold text-gray-800 font-mono">${totalAplicado.toFixed(2)}</span></p>
                      {sobrante > 0.01 && (
                        <p className="text-amber-600 font-medium flex items-center gap-1 mt-1">
                          <FiAlertCircle /> Genera Crédito a Favor: ${sobrante.toFixed(2)}
                        </p>
                      )}
                    </div>
                    <button 
                      onClick={submitCobro}
                      disabled={processing || obligaciones.length === 0}
                      className="w-full md:w-auto px-8 py-3 bg-[#27A9E1] hover:bg-blue-600 text-white font-bold rounded-xl transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <FiCheckCircle size={20} />
                      {processing ? 'Procesando...' : 'Confirmar Cobro'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

        </div>
      </div>

      <ReciboPagoModal isOpen={isReciboOpen} onClose={() => setIsReciboOpen(false)} data={reciboData} />
    </MainLayout>
  );
}
