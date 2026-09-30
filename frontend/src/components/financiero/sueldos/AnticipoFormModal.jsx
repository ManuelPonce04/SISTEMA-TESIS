import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import sueldosAnticiposService from '../../../services/sueldosAnticiposService';
import movimientosFinancierosService from '../../../services/movimientosFinancierosService';
import { FiX, FiAlertTriangle, FiCheck, FiDollarSign, FiUser } from 'react-icons/fi';
import { useAuth } from '../../../context/AuthContext';
import personalService from '../../../services/personalService';

const AnticipoFormModal = ({ isOpen, onClose, onSuccess, personalId, periodoId, mesAplicacion, saldoDisponible, nombrePersonal }) => {
  const { user } = useAuth();
  
  const [formData, setFormData] = useState({
    catalogo_movimiento_id: '',
    cuenta_financiera_id: '',
    valor: '',
    fecha: new Date().toISOString().split('T')[0],
    descripcion: '',
    numero_comprobante: '',
    observacion: '',
    justificacion_exceso: ''
  });

  const [catalogosAnticipo, setCatalogosAnticipo] = useState([]);
  const [cuentas, setCuentas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [excedido, setExcedido] = useState(0);

  const [personalActivo, setPersonalActivo] = useState([]);
  const [selectedTrabajadorId, setSelectedTrabajadorId] = useState('');
  const [dinamicSaldo, setDinamicSaldo] = useState(0);
  const [dinamicSueldo, setDinamicSueldo] = useState(0);
  const [dinamicAnticipos, setDinamicAnticipos] = useState(0);

  useEffect(() => {
    if (isOpen) {
      loadDependencies();
      setFormData(prev => ({ ...prev, valor: '', justificacion_exceso: '' }));
      setExcedido(0);
      setSelectedTrabajadorId(personalId || '');
      
      if (personalId) {
        setDinamicSaldo(saldoDisponible || 0);
      } else {
        setDinamicSaldo(0);
        setDinamicSueldo(0);
        setDinamicAnticipos(0);
      }
    }
  }, [isOpen, personalId, saldoDisponible]);

  const loadDependencies = async () => {
    try {
      const [resCat, resCuentas, resPersonal] = await Promise.all([
        movimientosFinancierosService.getCatalogosActivos(),
        movimientosFinancierosService.getCuentasActivas(),
        !personalId ? personalService.getAll({ estado: 'ACTIVO', limit: 1000 }) : Promise.resolve({ success: false })
      ]);
      if (resCat.success) {
        const anticiposCatalogs = resCat.data.filter(c => c.afecta_nomina === 'ANTICIPO_SUELDO' && c.tipo === 'EGRESO');
        setCatalogosAnticipo(anticiposCatalogs);
        if (anticiposCatalogs.length === 1) {
          setFormData(prev => ({ ...prev, catalogo_movimiento_id: anticiposCatalogs[0].id }));
        }
      }
      if (resCuentas.success) setCuentas(resCuentas.data);
      if (resPersonal?.success) setPersonalActivo(resPersonal.data);
    } catch (error) {
      console.error('Error', error);
    }
  };

  const handleWorkerChange = async (e) => {
    const id = e.target.value;
    setSelectedTrabajadorId(id);
    if (id) {
      setLoading(true);
      try {
        const res = await sueldosAnticiposService.getDetalleTrabajador(id, periodoId, mesAplicacion);
        if (res.success && res.data) {
          const t = res.data;
          const s = t.sueldo_base || 0;
          const ant = t.total_anticipos || 0;
          const saldo = t.neto_estimado || 0;
          setDinamicSueldo(s);
          setDinamicAnticipos(ant);
          setDinamicSaldo(saldo);
        }
      } catch (err) {
        console.error('Error al cargar detalle del trabajador', err);
      } finally {
        setLoading(false);
      }
    } else {
      setDinamicSaldo(0);
      setDinamicSueldo(0);
      setDinamicAnticipos(0);
    }
  };

  useEffect(() => {
    const v = parseFloat(formData.valor) || 0;
    if (v > dinamicSaldo) {
      setExcedido(v - dinamicSaldo);
    } else {
      setExcedido(0);
    }
  }, [formData.valor, dinamicSaldo]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (excedido > 0 && !user?.es_admin) {
      Swal.fire('Prohibido', 'No puedes registrar un anticipo superior al saldo disponible.', 'error');
      return;
    }

    if (excedido > 0 && (!formData.justificacion_exceso || formData.justificacion_exceso.trim().length < 5)) {
      Swal.fire('Advertencia', 'Debes ingresar una justificación válida para autorizar el excedente.', 'warning');
      return;
    }

    if (!selectedTrabajadorId) {
      Swal.fire('Atención', 'Debe seleccionar un trabajador.', 'warning');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...formData,
        periodo_lectivo_id: periodoId,
        mes_aplicacion: mesAplicacion
      };

      await sueldosAnticiposService.registrarAnticipo(selectedTrabajadorId, payload);
      Swal.fire({ icon: 'success', title: 'Anticipo registrado con éxito', timer: 2000, showConfirmButton: false });
      onSuccess();
      onClose();
    } catch (error) {
      Swal.fire('Error', error.response?.data?.message || 'Ocurrió un error', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-[#27A9E1] to-blue-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 text-white">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
              <FiDollarSign size={24} />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">Registrar Anticipo</h3>
              {personalId && <p className="text-white/80 text-xs font-medium">{nombrePersonal}</p>}
            </div>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white bg-transparent hover:bg-white/10 p-2 rounded-xl transition-colors">
            <FiX size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar max-h-[75vh]">
          {/* Resumen */}
          <div className="flex flex-col mb-6 bg-gray-50 border border-gray-100 rounded-xl p-4 gap-2">
            {!personalId && (
              <div className="mb-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Trabajador <span className="text-red-500">*</span></label>
                <select 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  value={selectedTrabajadorId}
                  onChange={handleWorkerChange}
                  disabled={loading}
                >
                  <option value="">Seleccione o busque un trabajador...</option>
                  {personalActivo.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre_completo} - {p.cedula}</option>
                  ))}
                </select>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Sueldo del mes</p>
                <p className="text-sm font-bold font-mono text-gray-700">${parseFloat(dinamicSueldo).toFixed(2)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 mb-1">Anticipos anteriores</p>
                <p className="text-sm font-bold font-mono text-red-600">${parseFloat(dinamicAnticipos).toFixed(2)}</p>
              </div>
              
              <div className="col-span-2 border-t border-gray-200 my-1"></div>

              <div>
                <p className="text-xs text-gray-500 mb-1">Saldo Disponible</p>
                <p className={`text-lg font-bold font-mono ${dinamicSaldo >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  ${parseFloat(dinamicSaldo).toFixed(2)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 mb-1">Nuevo anticipo</p>
                <p className="text-lg font-bold font-mono text-blue-600">
                  ${parseFloat(formData.valor || 0).toFixed(2)}
                </p>
              </div>

              <div className="col-span-2 bg-white rounded p-2 flex justify-between items-center mt-1 border border-gray-100 shadow-sm">
                <span className="text-xs font-bold text-gray-600">Saldo Restante Final:</span>
                <span className={`text-xl font-bold font-mono ${(dinamicSaldo - (parseFloat(formData.valor) || 0)) >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                  ${parseFloat(dinamicSaldo - (parseFloat(formData.valor) || 0)).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <form id="anticipoForm" onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Concepto <span className="text-red-500">*</span></label>
                <select
                  required
                  value={formData.catalogo_movimiento_id}
                  onChange={(e) => setFormData({ ...formData, catalogo_movimiento_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[#27A9E1] outline-none focus:border-[#27A9E1]"
                >
                  <option value="">Seleccione concepto...</option>
                  {catalogosAnticipo.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>

              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha <span className="text-red-500">*</span></label>
                <input
                  required type="date"
                  value={formData.fecha}
                  onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[#27A9E1] outline-none focus:border-[#27A9E1]"
                />
              </div>

              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Valor ($) <span className="text-red-500">*</span></label>
                <input
                  required type="number" step="0.01" min="0.01"
                  value={formData.valor}
                  onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg font-mono focus:ring-[#27A9E1] outline-none focus:border-[#27A9E1]"
                />
              </div>

              {excedido > 0 && (
                <div className="col-span-2 bg-red-50 border border-red-200 rounded-xl p-4 animate-scale-in">
                  <div className="flex items-start gap-2 mb-2">
                    <FiAlertTriangle className="text-red-500 mt-1" />
                    <div>
                      <h4 className="text-sm font-bold text-red-700">El valor supera el saldo disponible</h4>
                      <p className="text-xs text-red-600">Excedente: <span className="font-mono font-bold">${excedido.toFixed(2)}</span></p>
                    </div>
                  </div>
                  
                  {user?.es_admin ? (
                    <div className="mt-3 border-t border-red-200 pt-3">
                      <p className="text-xs text-red-700 font-medium mb-2">Autorización Extraordinaria (Solo Admin)</p>
                      <textarea
                        required={excedido > 0}
                        placeholder="Escriba la justificación para autorizar este anticipo excedido..."
                        value={formData.justificacion_exceso}
                        onChange={(e) => setFormData({ ...formData, justificacion_exceso: e.target.value })}
                        className="w-full px-3 py-2 border border-red-200 rounded-lg text-sm bg-white focus:ring-red-500 focus:border-red-500 outline-none"
                        rows="2"
                      />
                    </div>
                  ) : (
                    <p className="text-xs text-red-600 mt-2 font-medium bg-red-100 p-2 rounded">
                      Operación bloqueada. Solo un usuario administrador puede autorizar este excedente.
                    </p>
                  )}
                </div>
              )}

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Cuenta Financiera <span className="text-red-500">*</span></label>
                <select
                  required
                  value={formData.cuenta_financiera_id}
                  onChange={(e) => setFormData({ ...formData, cuenta_financiera_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[#27A9E1] outline-none focus:border-[#27A9E1]"
                >
                  <option value="">Seleccione cuenta (desde donde sale el dinero)...</option>
                  {cuentas.map(c => <option key={c.id} value={c.id}>{c.nombre} - ${c.saldo_actual}</option>)}
                </select>
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción <span className="text-red-500">*</span></label>
                <input
                  required type="text"
                  placeholder="Ej. Anticipo de quincena..."
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[#27A9E1] outline-none focus:border-[#27A9E1]"
                />
              </div>

            </div>
          </form>

        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-200 bg-gray-100 rounded-xl transition-colors">
            Cancelar
          </button>
          <button
            type="submit"
            form="anticipoForm"
            disabled={loading || (excedido > 0 && !user?.es_admin)}
            className="px-5 py-2.5 text-sm font-medium text-white bg-[#27A9E1] hover:bg-blue-600 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-md shadow-blue-500/20"
          >
            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : (
              <><FiCheck /> Guardar Anticipo</>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

export default AnticipoFormModal;
