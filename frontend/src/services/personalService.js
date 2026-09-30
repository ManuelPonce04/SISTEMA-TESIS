import api from './authService';

const personalService = {
  // ── Personal ──
  getAll: async (params) => {
    const response = await api.get('/personal', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/personal/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/personal', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/personal/${id}`, data);
    return response.data;
  },

  cambiarEstado: async (id, data) => {
    const response = await api.patch(`/personal/${id}/estado`, data);
    return response.data;
  },

  // ── Historial Salarial ──
  getHistorialSueldos: async (id) => {
    const response = await api.get(`/personal/${id}/historial-sueldos`);
    return response.data;
  },

  cambiarSueldo: async (id, data) => {
    const response = await api.post(`/personal/${id}/cambiar-sueldo`, data);
    return response.data;
  },

  // ── Exportación ──
  exportarExcel: async (params) => {
    const response = await api.get('/personal/exportar/excel', { params, responseType: 'blob' });
    return response.data;
  },

  exportarPDF: async (params) => {
    const response = await api.get('/personal/exportar/pdf', { params, responseType: 'blob' });
    return response.data;
  },

  // ── Catálogos ──
  getTiposContrato: async () => {
    const response = await api.get('/personal/catalogos/tipos-contrato');
    return response.data;
  },

  getFunciones: async () => {
    const response = await api.get('/personal/catalogos/funciones');
    return response.data;
  },

  getCargos: async () => {
    const response = await api.get('/personal/catalogos/cargos');
    return response.data;
  }
};

export default personalService;
