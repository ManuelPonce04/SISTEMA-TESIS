/**
 * cobrarPensionesService.js
 * Servicio frontend para el módulo Control Financiero → Cobro de Pensiones
 */
import api from './authService';

const BASE = '/control-financiero/pensiones';

/** Busca estudiantes matriculados por nombre, código o cédula */
export const buscarEstudiantesParaPension = async (q, anio_lectivo) => {
  const params = new URLSearchParams({ q });
  if (anio_lectivo) params.append('anio_lectivo', anio_lectivo);
  const { data } = await api.get(`${BASE}/buscar?${params}`);
  return data;
};

/** Obtiene la configuración de tarifas por año lectivo */
export const getConfigPensiones = async (anio_lectivo) => {
  const params = anio_lectivo ? `?anio_lectivo=${anio_lectivo}` : '';
  const { data } = await api.get(`${BASE}/config${params}`);
  return data;
};

/** Crea/actualiza una tarifa (admin) */
export const upsertConfigPension = async (payload) => {
  const { data } = await api.post(`${BASE}/config`, payload);
  return data;
};

/** Genera cuotas para uno o todos los estudiantes */
export const generarCuotas = async (payload) => {
  const { data } = await api.post(`${BASE}/cuotas/generar`, payload);
  return data;
};

/** Estado de cuenta por estudiante (todos los meses) */
export const getCuotasEstudiante = async (estudiante_id, anio_lectivo) => {
  const params = anio_lectivo ? `?anio_lectivo=${anio_lectivo}` : '';
  const { data } = await api.get(`${BASE}/cuotas/${estudiante_id}${params}`);
  return data;
};

/** Cuota de un estudiante para un mes específico */
export const getCuotaMes = async (estudiante_id, mes, anio_lectivo) => {
  const params = new URLSearchParams({ estudiante_id, mes });
  if (anio_lectivo) params.append('anio_lectivo', anio_lectivo);
  const { data } = await api.get(`${BASE}/cuotas/mes?${params}`);
  return data;
};

/** Registrar un cobro/abono */
export const registrarCobro = async (payload) => {
  const { data } = await api.post(`${BASE}/cobrar`, payload);
  return data;
};

/** Listado de cobros recientes */
export const getCobrosRecientes = async (filtros = {}) => {
  const params = new URLSearchParams(filtros);
  const { data } = await api.get(`${BASE}/cobros-recientes?${params}`);
  return data;
};

/** Anular un pago */
export const anularPago = async (id, motivo) => {
  const { data } = await api.patch(`${BASE}/pagos/${id}/anular`, { motivo });
  return data;
};

/** Totales recaudados por día y nivel */
export const getTotalesDia = async (fecha, anio_lectivo) => {
  const params = new URLSearchParams({ fecha });
  if (anio_lectivo) params.append('anio_lectivo', anio_lectivo);
  const { data } = await api.get(`${BASE}/totales-dia?${params}`);
  return data;
};

/** Reporte de morosos */
export const getMorosos = async (filtros = {}) => {
  const params = new URLSearchParams(filtros);
  const { data } = await api.get(`${BASE}/morosos?${params}`);
  return data;
};

/** Datos del recibo para impresión */
export const getRecibo = async (pago_id) => {
  const { data } = await api.get(`${BASE}/recibo/${pago_id}`);
  return data;
};
