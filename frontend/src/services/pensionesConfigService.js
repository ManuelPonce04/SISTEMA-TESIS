/**
 * Service: Configuración de Pensiones (Frontend)
 */
import api from './authService';

const BASE = '/pensiones/configuracion';

// ── Catálogos de apoyo ─────────────────────────────────────────
export const getCatalogosApoyo = async () => {
  const r = await api.get(`${BASE}/catalogos`);
  return r.data;
};

// ── Tarifas ────────────────────────────────────────────────────
export const getTarifas = async (params = {}) => {
  const r = await api.get(`${BASE}/tarifas`, { params });
  return r.data;
};

export const getTarifaById = async (id) => {
  const r = await api.get(`${BASE}/tarifas/${id}`);
  return r.data;
};

export const crearTarifa = async (data) => {
  const r = await api.post(`${BASE}/tarifas`, data);
  return r.data;
};

export const actualizarTarifa = async (id, data) => {
  const r = await api.put(`${BASE}/tarifas/${id}`, data);
  return r.data;
};

export const cambiarEstadoTarifa = async (id, estado, motivo) => {
  const r = await api.patch(`${BASE}/tarifas/${id}/estado`, { estado, motivo });
  return r.data;
};

export const crearTarifasMasivo = async (data) => {
  const r = await api.post(`${BASE}/tarifas/masiva`, data);
  return r.data;
};

export const copiarPeriodo = async (data) => {
  const r = await api.post(`${BASE}/tarifas/copiar-periodo`, data);
  return r.data;
};

export const resolverTarifa = async (params) => {
  const r = await api.get(`${BASE}/tarifas/resolver`, { params });
  return r.data;
};

// ── Meses cobrables ────────────────────────────────────────────
export const getMeses = async (params = {}) => {
  const r = await api.get(`${BASE}/meses`, { params });
  return r.data;
};

export const crearMes = async (data) => {
  const r = await api.post(`${BASE}/meses`, data);
  return r.data;
};

export const generarMeses = async (data) => {
  const r = await api.post(`${BASE}/meses/generar`, data);
  return r.data;
};

export const actualizarMes = async (id, data) => {
  const r = await api.put(`${BASE}/meses/${id}`, data);
  return r.data;
};

export const cambiarEstadoMes = async (id, estado) => {
  const r = await api.patch(`${BASE}/meses/${id}/estado`, { estado });
  return r.data;
};

// ── Beneficios ─────────────────────────────────────────────────
export const getBeneficios = async (params = {}) => {
  const r = await api.get(`${BASE}/beneficios`, { params });
  return r.data;
};

export const getBeneficioById = async (id) => {
  const r = await api.get(`${BASE}/beneficios/${id}`);
  return r.data;
};

export const crearBeneficio = async (data) => {
  const r = await api.post(`${BASE}/beneficios`, data);
  return r.data;
};

export const actualizarBeneficio = async (id, data) => {
  const r = await api.put(`${BASE}/beneficios/${id}`, data);
  return r.data;
};

export const cambiarEstadoBeneficio = async (id, activo) => {
  const r = await api.patch(`${BASE}/beneficios/${id}/estado`, { activo });
  return r.data;
};

export const getCompatibilidades = async (id) => {
  const r = await api.get(`${BASE}/beneficios/${id}/compatibilidades`);
  return r.data;
};

export const actualizarCompatibilidades = async (id, compatibilidades) => {
  const r = await api.put(`${BASE}/beneficios/${id}/compatibilidades`, { compatibilidades });
  return r.data;
};

// ── Simulador ──────────────────────────────────────────────────
export const simularPension = async (data) => {
  const r = await api.post(`${BASE}/simular`, data);
  return r.data;
};

// ── Configuración financiera ───────────────────────────────────
export const getConfigFinanciera = async (params = {}) => {
  const r = await api.get(`${BASE}/financiera`, { params });
  return r.data;
};

export const actualizarConfigFinanciera = async (items) => {
  const r = await api.put(`${BASE}/financiera`, { items });
  return r.data;
};

// ── Auditoría ──────────────────────────────────────────────────
export const getAuditoria = async (params = {}) => {
  const r = await api.get(`${BASE}/auditoria`, { params });
  return r.data;
};
