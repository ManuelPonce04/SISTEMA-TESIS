import api from './authService';

const catalogoMovimientosService = {
  // Obtener lista de movimientos (con paginación, filtros y búsqueda)
  getAll: async (params) => {
    const response = await api.get('/catalogos/movimientos', { params });
    return response.data;
  },

  // Obtener un movimiento por ID
  getById: async (id) => {
    const response = await api.get(`/catalogos/movimientos/${id}`);
    return response.data;
  },

  // Crear un nuevo concepto
  create: async (data) => {
    const response = await api.post('/catalogos/movimientos', data);
    return response.data;
  },

  // Actualizar un concepto existente
  update: async (id, data) => {
    const response = await api.put(`/catalogos/movimientos/${id}`, data);
    return response.data;
  },

  // Activar o desactivar un concepto
  toggleEstado: async (id) => {
    const response = await api.patch(`/catalogos/movimientos/${id}/estado`);
    return response.data;
  },
};

export default catalogoMovimientosService;
