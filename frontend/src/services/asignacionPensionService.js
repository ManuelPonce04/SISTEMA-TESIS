import api from './api';

const BASE_URL = '/pensiones/asignaciones';

export const getAsignaciones = async (params) => {
  const { data } = await api.get(BASE_URL, { params });
  return data;
};

export const getAsignacionById = async (id) => {
  const { data } = await api.get(`${BASE_URL}/${id}`);
  return data;
};

export const crearAsignacion = async (payload) => {
  const { data } = await api.post(BASE_URL, payload);
  return data;
};

export const actualizarBorrador = async (id, payload) => {
  const { data } = await api.put(`${BASE_URL}/${id}`, payload);
  return data;
};

// ── Transiciones de estado ──
export const enviarAprobacion = async (id) => {
  const { data } = await api.patch(`${BASE_URL}/${id}/enviar-aprobacion`);
  return data;
};

export const aprobarAsignacion = async (id) => {
  const { data } = await api.patch(`${BASE_URL}/${id}/aprobar`);
  return data;
};

export const rechazarAsignacion = async (id, motivo) => {
  const { data } = await api.patch(`${BASE_URL}/${id}/rechazar`, { motivo });
  return data;
};

export const activarAsignacion = async (id) => {
  const { data } = await api.patch(`${BASE_URL}/${id}/activar`);
  return data;
};

export const suspenderAsignacion = async (id, motivo) => {
  const { data } = await api.patch(`${BASE_URL}/${id}/suspender`, { motivo });
  return data;
};

export const anularAsignacion = async (id, motivo) => {
  const { data } = await api.patch(`${BASE_URL}/${id}/anular`, { motivo });
  return data;
};

export const crearNuevaVigencia = async (id, payload) => {
  const { data } = await api.post(`${BASE_URL}/${id}/nueva-vigencia`, payload);
  return data;
};

// ── Beneficios ──
export const getBeneficiosAsignacion = async (id) => {
  const { data } = await api.get(`${BASE_URL}/${id}/beneficios`);
  return data;
};

export const addBeneficioAsignacion = async (id, payload) => {
  const { data } = await api.post(`${BASE_URL}/${id}/beneficios`, payload);
  return data;
};

export const deleteBeneficioAsignacion = async (id, beneficioId) => {
  const { data } = await api.delete(`${BASE_URL}/${id}/beneficios/${beneficioId}`);
  return data;
};

// ── Documentos ──
export const getDocumentos = async (id) => {
  const { data } = await api.get(`${BASE_URL}/${id}/documentos`);
  return data;
};

export const subirDocumento = async (id, formData) => {
  const { data } = await api.post(`${BASE_URL}/${id}/documentos`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};

export const eliminarDocumento = async (id, documentoId) => {
  const { data } = await api.delete(`${BASE_URL}/${id}/documentos/${documentoId}`);
  return data;
};

// ── Auxiliares ──
export const getMatriculasDisponibles = async (params) => {
  const { data } = await api.get(`${BASE_URL}/matriculas-disponibles`, { params });
  return data;
};

export const getResumenMatricula = async (matriculaId) => {
  const { data } = await api.get(`${BASE_URL}/matricula/${matriculaId}/resumen`);
  return data;
};

export const getSugerencias = async (matriculaId) => {
  const { data } = await api.get(`${BASE_URL}/matricula/${matriculaId}/sugerencias`);
  return data;
};

export const simularAsignacion = async (payload) => {
  const { data } = await api.post(`${BASE_URL}/simular`, payload);
  return data;
};

export const asignacionMasiva = async (payload) => {
  const { data } = await api.post(`${BASE_URL}/asignacion-masiva`, payload);
  return data;
};

export const getPendientes = async () => {
  const { data } = await api.get(`${BASE_URL}/pendientes`);
  return data;
};

export const getAsignacionesKPI = async (params) => {
  const { data } = await api.get(`${BASE_URL}/kpi`, { params });
  return data;
};
