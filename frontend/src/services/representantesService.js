import api from './authService';

const representantesService = {
  getRepresentantes: async (params) => {
    const response = await api.get('/representantes', { params });
    return response.data;
  },
  buscarPorCedula: async (cedula) => {
    const response = await api.get(`/representantes/buscar/${cedula}`);
    return response.data;
  },
  createRepresentante: async (data) => {
    const response = await api.post('/representantes', data);
    return response.data;
  },
  updateRepresentante: async (id, data) => {
    const response = await api.put(`/representantes/${id}`, data);
    return response.data;
  }
};

export default representantesService;
