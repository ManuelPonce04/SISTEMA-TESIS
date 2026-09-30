import React, { useState, useEffect } from 'react';
import { FiX, FiSave, FiAlertCircle } from 'react-icons/fi';
import matriculaService from '../../../services/matriculaService';
import cuentasFinancierasService from '../../../services/cuentasFinancierasService';

const PagoMatriculaModal = ({ matricula, onClose, onSuccess }) => {
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [valor, setValor] = useState(matricula?.saldo || 0);
  const [cuentaId, setCuentaId] = useState('');
  const [numeroComprobante, setNumeroComprobante] = useState('');
  const [observacion, setObservacion] = useState('');
  const [cuentas, setCuentas] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadCuentas();
  }, []);

  const loadCuentas = async () => {
    try {
      const res = await cuentasFinancierasService.getAll({ activo: 1 });
      if (res.success && res.data) {
        setCuentas(res.data);
      }
    } catch (err) {
      console.error('Error al cargar cuentas', err);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (parseFloat(valor) <= 0) return setError('El valor debe ser mayor a 0');
    
    setLoading(true);
    setError(null);
    try {
      const res = await matriculaService.registrarPago(matricula.id, {
        fecha,
        valor,
        cuenta_financiera_id: cuentaId || null,
        numero_comprobante,
        observacion
      });
      if (res.success) {
        onSuccess();
      } else {
        setError(res.message);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Error al registrar pago');
    } finally {
      setLoading(false);
    }
  };

  const saldo = parseFloat(matricula?.saldo || 0);
  const v = parseFloat(valor || 0);
  const nuevoSaldo = saldo - v;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl flex flex-col animate-scale-up overflow-hidden">
        
        <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50/50">
          <h2 className="font-bold text-slate-800">Registrar Pago de Matrícula</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <FiX size={24} />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-5 flex flex-col gap-4">
          
          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-start gap-2 border border-red-100">
              <FiAlertCircle size={16} className="mt-0.5 shrink-0" /> {error}
            </div>
          )}

          <div className="bg-amber-50 p-3 rounded-lg border border-amber-100 text-sm mb-2">
            <div className="flex justify-between text-amber-800 mb-1">
              <span>Saldo actual:</span>
              <span className="font-bold">${saldo.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-amber-800">
              <span>Nuevo saldo proyectado:</span>
              <span className={`font-bold ${nuevoSaldo < 0 ? 'text-red-600' : ''}`}>
                ${nuevoSaldo.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Fecha</label>
              <input 
                type="date"
                required
                value={fecha}
                onChange={e => setFecha(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-[#27A9E1] text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Valor ($)</label>
              <input 
                type="number"
                step="0.01"
                min="0.01"
                required
                value={valor}
                onChange={e => setValor(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-[#27A9E1] font-bold text-[#27A9E1]"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Cuenta / Caja</label>
            <select
              value={cuentaId}
              onChange={e => setCuentaId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-[#27A9E1] text-sm"
            >
              <option value="">-- Seleccionar --</option>
              {cuentas.map(c => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Número de Comprobante</label>
            <input 
              type="text"
              value={numeroComprobante}
              onChange={e => setNumeroComprobante(e.target.value)}
              placeholder="Ej. TRANSF-001 o RECIBO-001"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-[#27A9E1] text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Observación</label>
            <textarea 
              rows="2"
              value={observacion}
              onChange={e => setObservacion(e.target.value)}
              placeholder="Detalles adicionales del pago..."
              className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-[#27A9E1] text-sm"
            ></textarea>
          </div>

          <div className="flex gap-3 mt-4 pt-4 border-t border-slate-100">
            <button 
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors font-medium"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              disabled={loading || parseFloat(valor) <= 0}
              className="flex-1 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-medium flex items-center justify-center gap-2 shadow-md shadow-green-600/20 disabled:opacity-50"
            >
              {loading ? 'Procesando...' : <><FiSave /> Registrar Pago</>}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default PagoMatriculaModal;
