import api from './authService';

// MATRÍCULAS
export const getMatriculas = async (filtros) => {
  const params = new URLSearchParams();
  if (filtros?.search) params.append('search', filtros.search);
  if (filtros?.anio_lectivo) params.append('anio_lectivo', filtros.anio_lectivo);
  if (filtros?.curso) params.append('curso', filtros.curso);
  if (filtros?.estado) params.append('estado', filtros.estado);

  const response = await api.get(`/matriculas?${params.toString()}`);
  return response.data;
};

export const getMatriculaById = async (id) => {
  const response = await api.get(`/matriculas/${id}`);
  return response.data;
};

export const createMatricula = async (matriculaData) => {
  const response = await api.post('/matriculas', matriculaData);
  return response.data;
};

export const updateMatricula = async (id, matriculaData) => {
  const response = await api.put(`/matriculas/${id}`, matriculaData);
  return response.data;
};

export const anularMatricula = async (id, motivo_anulacion) => {
  const response = await api.patch(`/matriculas/${id}/anular`, { motivo_anulacion });
  return response.data;
};

export const getPensionesByMatricula = async (id) => {
  const response = await api.get(`/matriculas/${id}/pensiones`);
  return response.data;
};

// AUXILIARES
export const getCursos = async () => {
  const response = await api.get('/auxiliares/cursos');
  return response.data;
};

export const getParalelos = async () => {
  const response = await api.get('/auxiliares/paralelos');
  return response.data;
};

export const getAniosLectivos = async () => {
  const response = await api.get('/auxiliares/anios-lectivos');
  return response.data;
};

export const getConfigPensiones = async (id_curso, anio_lectivo) => {
  const params = new URLSearchParams();
  if (id_curso) params.append('id_curso', id_curso);
  if (anio_lectivo) params.append('anio_lectivo', anio_lectivo);
  
  const response = await api.get(`/auxiliares/config-pensiones?${params.toString()}`);
  return response.data;
};
