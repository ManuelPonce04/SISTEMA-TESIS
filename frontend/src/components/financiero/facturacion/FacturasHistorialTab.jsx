import React, { useState, useEffect, useCallback } from 'react';
import {
  FiSearch, FiFilter, FiPrinter, FiEye, FiXCircle,
  FiRefreshCw, FiDollarSign, FiCalendar, FiCheckCircle, FiFileText,
  FiDownload
} from 'react-icons/fi';
import Swal from 'sweetalert2';
import { getFacturas, anularFactura, getFacturaById } from '../../../services/facturacionService';
import { exportarHistorialFacturasExcel } from '../../../utils/exportFacturacionExcel';
import FacturaModal from './FacturaModal';
import CierreFacturacionModal from './CierreFacturacionModal';

const fmt$ = (n) => {
  const num = parseFloat(n) || 0;
  return `$ ${num.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const fmtFecha = (d) => {
  if (!d) return '-';
  const dt = new Date(d + 'T12:00:00');
  return dt.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export default function FacturasHistorialTab() {
  const [facturas, setFacturas] = useState([]);
  const [totales, setTotales] = useState({});
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filtros
  const [filtros, setFiltros] = useState({
    fecha_desde: '',
    fecha_hasta: '',
    numero: '',
    estado: 'TODOS',
    forma_pago: 'TODAS'
  });

  // Factura seleccionada para ver/imprimir
  const [facturaSeleccionada, setFacturaSeleccionada] = useState(null);
  const [loadingFactura, setLoadingFactura] = useState(false);

  // Modal Cierre y Arqueo Diario
  const [showCierreModal, setShowCierreModal] = useState(false);

  const cargarFacturas = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const res = await getFacturas({ ...filtros, page: p, limit: 25 });
      if (res.success) {
        setFacturas(res.facturas || []);
        setTotales(res.totales || {});
        setPage(res.page || 1);
        setTotalPages(res.totalPages || 1);
      }
    } catch {
      Swal.fire('Error', 'No se pudieron cargar las facturas.', 'error');
    }
    setLoading(false);
  }, [filtros]);

  useEffect(() => {
    cargarFacturas(1);
  }, [cargarFacturas]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFiltros(prev => ({ ...prev, [name]: value }));
  };

  const handleVerFactura = async (id) => {
    setLoadingFactura(true);
    try {
      const res = await getFacturaById(id);
      if (res.success && res.factura) {
        setFacturaSeleccionada(res.factura);
      }
    } catch (e) {
      Swal.fire('Error', 'No se pudo obtener el detalle de la factura.', 'error');
    }
    setLoadingFactura(false);
  };

  const handleAnular = async (fac) => {
    if (fac.estado === 'ANULADA') {
      return Swal.fire('Información', 'Esta factura ya está anulada.', 'info');
    }

    const { value: motivo } = await Swal.fire({
      title: `¿Anular Factura ${fac.numero}?`,
      text: 'Esta acción no se puede deshacer. Los cobros de pensión asociados quedarán liberados para volver a facturarse.',
      icon: 'warning',
      input: 'textarea',
      inputLabel: 'Motivo obligatorio de anulación:',
      inputPlaceholder: 'Especifique la razón (error en datos, cambio de RUC, etc.)...',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Sí, anular factura',
      cancelButtonText: 'Cancelar',
      preConfirm: (val) => {
        if (!val || val.trim().length < 5) {
          Swal.showValidationMessage('El motivo debe tener al menos 5 caracteres.');
        }
        return val;
      }
    });

    if (!motivo) return;

    try {
      const res = await anularFactura(fac.id, motivo);
      if (res.success) {
        await Swal.fire('Factura Anulada', res.message, 'success');
        cargarFacturas(page);
      }
    } catch (err) {
      Swal.fire('Error', err.response?.data?.message || 'Error al anular la factura.', 'error');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Tarjetas de Resumen */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Facturas Emitidas</p>
          <p className="text-2xl font-extrabold text-[#0f172a] mt-1">
            {totales.total_facturas || 0}
          </p>
          <span className="text-[11px] text-gray-400">Total en el período</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-xs text-emerald-600 uppercase tracking-wider font-semibold">Total Emitido (Neto)</p>
          <p className="text-2xl font-extrabold text-emerald-600 font-mono mt-1">
            {fmt$(totales.total_emitido)}
          </p>
          <span className="text-[11px] text-gray-400">Válido para contabilidad</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Subtotal 0% IVA</p>
          <p className="text-2xl font-bold text-gray-800 font-mono mt-1">
            {fmt$(totales.total_subtotal_0)}
          </p>
          <span className="text-[11px] text-gray-400">Servicios educativos</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-xs text-red-500 uppercase tracking-wider font-semibold">Total Anulado</p>
          <p className="text-2xl font-bold text-red-500 font-mono mt-1">
            {fmt$(totales.total_anulado)}
          </p>
          <span className="text-[11px] text-gray-400">Comprobantes invalidados</span>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <FiFilter className="text-[#27A9E1]" size={16} /> Filtros de Búsqueda
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => exportarHistorialFacturasExcel(facturas, filtros)}
              disabled={loading || facturas.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition shadow-sm"
              title="Descargar listado en formato Excel / CSV"
            >
              <FiDownload size={13} /> Exportar Excel
            </button>
            <button
              onClick={() => setShowCierreModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl transition shadow-sm"
              title="Reporte de Arqueo y Cierre Diario"
            >
              <FiFileText size={13} /> Cierre y Arqueo
            </button>
            <button
              onClick={() => cargarFacturas(1)}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl transition"
            >
              <FiRefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Actualizar
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-xs">
          <div>
            <label className="block text-gray-500 font-medium mb-1">N° de Factura</label>
            <input
              type="text"
              name="numero"
              value={filtros.numero}
              onChange={handleFilterChange}
              placeholder="001-001-000000001"
              className="w-full px-3 py-2 border rounded-xl font-mono focus:ring-2 focus:ring-[#27A9E1]/30 focus:border-[#27A9E1]"
            />
          </div>

          <div>
            <label className="block text-gray-500 font-medium mb-1">Fecha Desde</label>
            <input
              type="date"
              name="fecha_desde"
              value={filtros.fecha_desde}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-[#27A9E1]/30 focus:border-[#27A9E1]"
            />
          </div>

          <div>
            <label className="block text-gray-500 font-medium mb-1">Fecha Hasta</label>
            <input
              type="date"
              name="fecha_hasta"
              value={filtros.fecha_hasta}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-[#27A9E1]/30 focus:border-[#27A9E1]"
            />
          </div>

          <div>
            <label className="block text-gray-500 font-medium mb-1">Estado</label>
            <select
              name="estado"
              value={filtros.estado}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 border rounded-xl bg-white focus:ring-2 focus:ring-[#27A9E1]/30"
            >
              <option value="TODOS">Todos los Estados</option>
              <option value="EMITIDA">Emitidas</option>
              <option value="ANULADA">Anuladas</option>
            </select>
          </div>

          <div>
            <label className="block text-gray-500 font-medium mb-1">Forma de Pago</label>
            <select
              name="forma_pago"
              value={filtros.forma_pago}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 border rounded-xl bg-white focus:ring-2 focus:ring-[#27A9E1]/30"
            >
              <option value="TODAS">Todas las Formas</option>
              <option value="EFECTIVO">Efectivo</option>
              <option value="TRANSFERENCIA">Transferencia</option>
              <option value="TARJETA">Tarjeta</option>
              <option value="DEPOSITO">Depósito</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabla de Facturas */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#0f172a] text-white text-xs uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">N° Factura</th>
                <th className="py-3 px-4">Fecha</th>
                <th className="py-3 px-4">Estudiante</th>
                <th className="py-3 px-4">Cliente / Razón Social</th>
                <th className="py-3 px-4">RUC / Cédula</th>
                <th className="py-3 px-4 text-center">Forma Pago</th>
                <th className="py-3 px-4 text-right">Total</th>
                <th className="py-3 px-4 text-center">Estado</th>
                <th className="py-3 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-gray-400">
                    <FiRefreshCw className="animate-spin inline-block mr-2" /> Cargando facturas...
                  </td>
                </tr>
              ) : facturas.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-gray-400">
                    No se encontraron facturas con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                facturas.map(fac => {
                  const esAnulada = fac.estado === 'ANULADA';
                  return (
                    <tr
                      key={fac.id}
                      className={`hover:bg-blue-50/40 transition-colors ${esAnulada ? 'bg-red-50/20 text-gray-400' : ''}`}
                    >
                      <td className="py-3 px-4 font-mono font-bold text-gray-900 whitespace-nowrap">
                        {fac.numero}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-gray-600">
                        {fmtFecha(fac.fecha_emision)}
                      </td>
                      <td className="py-3 px-4 font-medium text-gray-800">
                        {fac.estudiante_nombre}
                        <span className="block text-[10px] text-gray-400 font-mono">{fac.estudiante_codigo}</span>
                      </td>
                      <td className="py-3 px-4 font-medium text-gray-700">
                        {fac.cliente_nombre}
                      </td>
                      <td className="py-3 px-4 font-mono text-gray-600">
                        {fac.cliente_identificacion}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-700">
                          {fac.forma_pago}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-gray-900 text-sm whitespace-nowrap">
                        {fmt$(fac.total)}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${esAnulada ? 'bg-red-100 text-red-700 border-red-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200'}`}>
                          {fac.estado}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleVerFactura(fac.id)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Ver / Imprimir Factura"
                          >
                            <FiPrinter size={16} />
                          </button>
                          {!esAnulada && (
                            <button
                              onClick={() => handleAnular(fac)}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition"
                              title="Anular Factura"
                            >
                              <FiXCircle size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="px-6 py-3 bg-gray-50 border-t flex items-center justify-between text-xs text-gray-600">
            <span>Página {page} de {totalPages}</span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => cargarFacturas(page - 1)}
                className="px-3 py-1 bg-white border rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >
                Anterior
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => cargarFacturas(page + 1)}
                className="px-3 py-1 bg-white border rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Impresión / Visualización */}
      {facturaSeleccionada && (
        <FacturaModal
          factura={facturaSeleccionada}
          onClose={() => setFacturaSeleccionada(null)}
        />
      )}

      {/* Modal de Cierre y Arqueo Diario */}
      <CierreFacturacionModal
        isOpen={showCierreModal}
        onClose={() => setShowCierreModal(false)}
      />

    </div>
  );
}
