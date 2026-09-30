import api from './api';

export const getMensualidades = async (params) => {
  const query = new URLSearchParams(params).toString();
  const res = await api.get(`/pensiones/mensualidades?${query}`);
  return res.data;
};

export const getMensualidadById = async (id) => {
  const res = await api.get(`/pensiones/mensualidades/${id}`);
  return res.data;
};

export const getMensualidadesKPI = async (params) => {
  const query = new URLSearchParams(params).toString();
  const res = await api.get(`/pensiones/mensualidades/kpis?${query}`);
  return res.data;
};

export const getMesesDisponibles = async (matriculaId) => {
  const res = await api.get(`/pensiones/mensualidades/matricula/${matriculaId}/meses-disponibles`);
  return res.data;
};

export const generarMensualidadIndividual = async (data) => {
  const res = await api.post('/pensiones/mensualidades/generar', data);
  return res.data;
};

export const anularMensualidad = async (id, motivo) => {
  const res = await api.patch(`/pensiones/mensualidades/${id}/anular`, { motivo });
  return res.data;
};

export const registrarAjuste = async (id, data) => {
  const res = await api.post(`/pensiones/mensualidades/${id}/ajustes`, data);
  return res.data;
};
