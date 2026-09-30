import api from './authService';

const cuentasFinancierasService = {
  // Obtener lista de cuentas financieras (con paginación, filtros y búsqueda)
  getAll: async (params) => {
    const response = await api.get('/catalogos/cuentas-financieras', { params });
    return response.data;
  },

  // Obtener una cuenta por ID
  getById: async (id) => {
    const response = await api.get(`/catalogos/cuentas-financieras/${id}`);
    return response.data;
  },

  // Crear una nueva cuenta
  create: async (data) => {
    const response = await api.post('/catalogos/cuentas-financieras', data);
    return response.data;
  },

  // Actualizar una cuenta existente
  update: async (id, data) => {
    const response = await api.put(`/catalogos/cuentas-financieras/${id}`, data);
    return response.data;
  },

  // Activar o desactivar una cuenta
  toggleEstado: async (id) => {
    const response = await api.patch(`/catalogos/cuentas-financieras/${id}/estado`);
    return response.data;
  },
};

export default cuentasFinancierasService;
