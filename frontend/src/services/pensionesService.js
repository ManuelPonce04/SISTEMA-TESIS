import api from './authService';

export const getPensiones = async (filtros) => {
  const params = new URLSearchParams();
  if (filtros?.search) params.append('search', filtros.search);
  if (filtros?.anio_lectivo) params.append('anio_lectivo', filtros.anio_lectivo);
  if (filtros?.curso) params.append('curso', filtros.curso);
  if (filtros?.paralelo) params.append('paralelo', filtros.paralelo);
  if (filtros?.mes) params.append('mes', filtros.mes);
  if (filtros?.estado) params.append('estado', filtros.estado);
  if (filtros?.fecha_desde) params.append('fecha_desde', filtros.fecha_desde);
  if (filtros?.fecha_hasta) params.append('fecha_hasta', filtros.fecha_hasta);

  const response = await api.get(`/pensiones?${params.toString()}`);
  return response.data;
};

export const getPensionById = async (id) => {
  const response = await api.get(`/pensiones/${id}`);
  return response.data;
};

export const getPensionesByEstudiante = async (id_estudiante) => {
  const response = await api.get(`/pensiones/estudiante/${id_estudiante}`);
  return response.data;
};

export const getResumenPensiones = async () => {
  const response = await api.get('/pensiones/resumen');
  return response.data;
};

export const getPagosByPension = async (id_pension) => {
  const response = await api.get(`/pensiones/${id_pension}/pagos`);
  return response.data;
};

export const registrarPago = async (id_pension, pagoData) => {
  const response = await api.post(`/pensiones/${id_pension}/pagar`, pagoData);
  return response.data;
};

export const anularPension = async (id, observacion) => {
  const response = await api.patch(`/pensiones/${id}/anular`, { observacion });
  return response.data;
};
