import api from './authService';

const matriculaService = {
  getMatriculas: async (params) => {
    const response = await api.get('/matricula', { params });
    return response.data;
  },
  getMatriculaById: async (id) => {
    const response = await api.get(`/matricula/${id}`);
    return response.data;
  },
  getTiposMatricula: async () => {
    const response = await api.get('/matricula/tipos');
    return response.data;
  },
  getTarifa: async (params) => {
    const response = await api.get('/matricula/tarifa', { params });
    return response.data;
  },
  createMatricula: async (data) => {
    const response = await api.post('/matricula', data);
    return response.data;
  },
  updateMatricula: async (id, data) => {
    const response = await api.put(`/matricula/${id}`, data);
    return response.data;
  },
  confirmarMatricula: async (id) => {
    const response = await api.patch(`/matricula/${id}/confirmar`);
    return response.data;
  },
  anularMatricula: async (id, motivo) => {
    const response = await api.patch(`/matricula/${id}/anular`, { motivo });
    return response.data;
  },
  cambiarOferta: async (id, data) => {
    const response = await api.patch(`/matricula/${id}/cambiar-oferta`, data);
    return response.data;
  },
  getPagos: async (id) => {
    const response = await api.get(`/matricula/${id}/pagos`);
    return response.data;
  },
  registrarPago: async (id, data) => {
    const response = await api.post(`/matricula/${id}/pagos`, data);
    return response.data;
  },
  anularPago: async (id, pagoId, motivo) => {
    const response = await api.patch(`/matricula/${id}/pagos/${pagoId}/anular`, { motivo });
    return response.data;
  }
};

export default matriculaService;
