import React, { useState, useMemo } from 'react';
import { FiDownload, FiEye, FiChevronLeft, FiChevronRight, FiFileText } from 'react-icons/fi';
import Card from '../ui/Card';
import Badge from '../ui/Badge';

/**
 * RecentPaymentsTable
 * ────────────────────────────────────────────────────────────
 * Tabla de últimos pagos registrados con:
 *  - Paginación del lado del cliente (PAGE_SIZE = 10)
 *  - Exportar a CSV (sin dependencias externas)
 *  - Skeleton loader mientras loading=true
 *  - Estado vacío si no hay datos
 *
 * Endpoint real: GET /api/dashboard/recent-payments
 * Parámetros: { anio, curso, paralelo, mes, estado }
 */

const PAGE_SIZE = 10;

const ESTADO_BADGE = {
  'Pagado': 'green',
  'Abono':  'yellow',
  'Anulado':'red',
};

// ── Exportar CSV ──────────────────────────────────────────────────
const exportCSV = (data) => {
  const headers = ['Fecha', 'Estudiante', 'Curso', 'Mes', 'Valor (USD)', 'Método', 'Usuario', 'Estado'];
  const rows = data.map(r => [
    r.fecha, r.estudiante, r.curso, r.mes,
    r.valor.toFixed(2), r.metodo, r.usuario, r.estado,
  ]);
  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `pagos_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// ── Skeleton rows ─────────────────────────────────────────────────
const SkeletonRow = () => (
  <tr className="animate-pulse">
    {Array.from({ length: 8 }).map((_, i) => (
      <td key={i} className="px-5 py-3.5">
        <div className="h-3.5 bg-gray-100 rounded-full w-full max-w-[100px]" />
      </td>
    ))}
  </tr>
);

// ── Componente principal ─────────────────────────────────────────
const RecentPaymentsTable = ({ data = [], loading = false }) => {
  const [page, setPage] = useState(1);

  const totalPages = Math.ceil(data.length / PAGE_SIZE);
  const pageData = useMemo(
    () => data.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [data, page]
  );

  const handlePageChange = (newPage) => {
    setPage(Math.max(1, Math.min(newPage, totalPages)));
  };

  return (
    <Card noPadding className="flex flex-col">
      {/* Header */}
      <div className="p-5 border-b border-gray-50 flex flex-wrap items-center justify-between gap-3 bg-white">
        <div>
          <h3 className="text-base font-bold text-gray-800">Actividad de Cobros Recientes</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {data.length > 0
              ? `Mostrando ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, data.length)} de ${data.length} registros`
              : 'Sin pagos registrados'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportCSV(data)}
            disabled={data.length === 0 || loading}
            aria-label="Exportar pagos a CSV"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#27A9E1] hover:bg-[#e0f7ff] border border-[#27A9E1]/30 rounded-lg transition-colors disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-[#27A9E1]"
          >
            <FiDownload size={13} aria-hidden="true" />
            CSV
          </button>
          <button
            onClick={() => window.print()}
            aria-label="Imprimir o exportar a PDF"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-500 hover:bg-gray-50 border border-gray-200 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-200"
          >
            <FiFileText size={13} aria-hidden="true" />
            PDF
          </button>
        </div>
      </div>

      {/* Tabla con scroll horizontal contenido */}
      <div className="overflow-x-auto w-full min-w-0 max-w-full custom-scrollbar">
        <table className="w-full text-left text-sm whitespace-nowrap min-w-[620px]" role="table" aria-label="Tabla de pagos recientes">
          <thead className="bg-gray-50 text-gray-400 font-semibold uppercase tracking-wider text-xs">
            <tr>
              <th className="px-5 py-3.5 font-semibold" scope="col">Fecha</th>
              <th className="px-5 py-3.5 font-semibold" scope="col">Estudiante</th>
              <th className="px-5 py-3.5 font-semibold" scope="col">Curso</th>
              <th className="px-5 py-3.5 font-semibold" scope="col">Mes</th>
              <th className="px-5 py-3.5 font-semibold" scope="col">Monto</th>
              <th className="px-5 py-3.5 font-semibold" scope="col">Método</th>
              <th className="px-5 py-3.5 font-semibold" scope="col">Usuario</th>
              <th className="px-5 py-3.5 font-semibold" scope="col">Estado</th>
              <th className="px-5 py-3.5" scope="col"><span className="sr-only">Acciones</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
            ) : pageData.length > 0 ? (
              pageData.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-[#f8fafc] transition-colors group"
                >
                  <td className="px-5 py-3.5 text-gray-400 font-medium text-xs">{item.fecha}</td>
                  <td className="px-5 py-3.5 font-semibold text-gray-800">{item.estudiante}</td>
                  <td className="px-5 py-3.5 text-gray-500 text-xs">{item.curso}</td>
                  <td className="px-5 py-3.5 text-gray-600 font-medium text-xs">{item.mes}</td>
                  <td className="px-5 py-3.5">
                    <span className="font-bold text-gray-800">
                      ${item.valor.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-gray-500 text-xs">{item.metodo}</td>
                  <td className="px-5 py-3.5 text-gray-500 text-xs">{item.usuario}</td>
                  <td className="px-5 py-3.5">
                    <Badge variant={ESTADO_BADGE[item.estado] || 'gray'}>
                      {item.estado}
                    </Badge>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      className="p-1.5 text-gray-400 hover:text-[#27A9E1] hover:bg-[#e0f7ff] rounded-lg transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 focus:outline-none"
                      aria-label={`Ver detalle de pago de ${item.estudiante}`}
                    >
                      <FiEye size={15} aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="9" className="py-12 text-center">
                  <div className="flex flex-col items-center gap-2 text-gray-300">
                    <FiFileText size={32} aria-hidden="true" />
                    <p className="text-sm">No hay pagos registrados en este período</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {!loading && totalPages > 1 && (
        <div className="px-5 py-3 border-t border-gray-50 flex items-center justify-between bg-white">
          <span className="text-xs text-gray-400">
            Página {page} de {totalPages}
          </span>
          <div className="flex items-center gap-1" role="navigation" aria-label="Paginación">
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1}
              aria-label="Página anterior"
              className="p-1.5 text-gray-400 hover:text-[#27A9E1] hover:bg-[#e0f7ff] rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#27A9E1]"
            >
              <FiChevronLeft size={16} aria-hidden="true" />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(n => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
              .reduce((acc, n, i, arr) => {
                if (i > 0 && n - arr[i - 1] > 1) acc.push('...');
                acc.push(n);
                return acc;
              }, [])
              .map((item, i) =>
                item === '...' ? (
                  <span key={`ellipsis-${i}`} className="px-2 text-gray-300 text-xs">…</span>
                ) : (
                  <button
                    key={item}
                    onClick={() => handlePageChange(item)}
                    aria-label={`Ir a página ${item}`}
                    aria-current={page === item ? 'page' : undefined}
                    className={`w-7 h-7 text-xs font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#27A9E1] ${
                      page === item
                        ? 'bg-[#27A9E1] text-white'
                        : 'text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    {item}
                  </button>
                )
              )
            }

            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page === totalPages}
              aria-label="Página siguiente"
              className="p-1.5 text-gray-400 hover:text-[#27A9E1] hover:bg-[#e0f7ff] rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#27A9E1]"
            >
              <FiChevronRight size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </Card>
  );
};

export default RecentPaymentsTable;
