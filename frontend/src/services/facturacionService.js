/**
 * facturacionService.js
 * Servicio frontend para el módulo Control Financiero → Facturación
 */
import api from './authService';

const BASE = '/control-financiero/facturacion';

/** Configuración de la institución emisora */
export const getInstitucionConfig = async () => {
  const { data } = await api.get(`${BASE}/config`);
  return data;
};

export const updateInstitucionConfig = async (payload) => {
  const { data } = await api.put(`${BASE}/config`, payload);
  return data;
};

/** Clientes de Facturación */
export const buscarClientesFacturacion = async (q = '', limit = 20) => {
  const params = new URLSearchParams({ q, limit });
  const { data } = await api.get(`${BASE}/clientes?${params}`);
  return data;
};

export const getClienteByEstudiante = async (estudiante_id) => {
  const { data } = await api.get(`${BASE}/clientes/estudiante/${estudiante_id}`);
  return data;
};

export const createClienteFacturacion = async (payload) => {
  const { data } = await api.post(`${BASE}/clientes`, payload);
  return data;
};

export const updateClienteFacturacion = async (id, payload) => {
  const { data } = await api.put(`${BASE}/clientes/${id}`, payload);
  return data;
};

/** Pagos de pensión pendientes de facturar por estudiante */
export const getPagosPendientesEstudiante = async (estudiante_id) => {
  const { data } = await api.get(`${BASE}/estudiante/${estudiante_id}/pagos-pendientes`);
  return data;
};

/** Emitir una factura */
export const emitirFactura = async (payload) => {
  const { data } = await api.post(`${BASE}/emitir`, payload);
  return data;
};

/** Listado de facturas con filtros y paginación */
export const getFacturas = async (filtros = {}) => {
  const params = new URLSearchParams();
  Object.entries(filtros).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') {
      params.append(k, v);
    }
  });
  const { data } = await api.get(`${BASE}/facturas?${params}`);
  return data;
};

/** Detalle completo de una factura */
export const getFacturaById = async (id) => {
  const { data } = await api.get(`${BASE}/facturas/${id}`);
  return data;
};

/** Anular una factura */
export const anularFactura = async (id, motivo) => {
  const { data } = await api.patch(`${BASE}/facturas/${id}/anular`, { motivo });
  return data;
};

/** Cierre diario comparativo cobrado vs facturado */
export const getCierreDiario = async (fecha) => {
  const params = fecha ? `?fecha=${fecha}` : '';
  const { data } = await api.get(`${BASE}/cierre-diario${params}`);
  return data;
};

export const getCierreFacturacion = getCierreDiario;

/** Descargar archivo XML oficial SRI v1.1.0 */
export const descargarXmlFactura = async (id, numero = '') => {
  const response = await api.get(`${BASE}/facturas/${id}/xml`, {
    responseType: 'blob'
  });
  const blob = new Blob([response.data], { type: 'application/xml;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const cleanNumero = String(numero || `ID_${id}`).replace(/[^a-zA-Z0-9_-]/g, '_');
  link.setAttribute('download', `factura_${cleanNumero}.xml`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/** Procesar y autorizar comprobante con el SRI */
export const procesarSriFactura = async (id) => {
  const { data } = await api.post(`${BASE}/facturas/${id}/sri`);
  return data;
};

export default {
  getInstitucionConfig,
  updateInstitucionConfig,
  buscarClientesFacturacion,
  getClienteByEstudiante,
  createClienteFacturacion,
  updateClienteFacturacion,
  getPagosPendientesEstudiante,
  emitirFactura,
  getFacturas,
  getFacturaById,
  anularFactura,
  getCierreDiario,
  getCierreFacturacion,
  descargarXmlFactura,
  procesarSriFactura
};

