import api from './authService';
const estudiantesService = {
  // Obtener lista de estudiantes (con paginación, filtros y búsqueda)
  getAll: async (params) => {
    const response = await api.get('/estudiantes', { params });
    return response.data;
  },

  // Obtener un estudiante por ID
  getById: async (id) => {
    const response = await api.get(`/estudiantes/${id}`);
    return response.data;
  },

  // Crear un nuevo estudiante
  create: async (data) => {
    const response = await api.post('/estudiantes', data);
    return response.data;
  },

  // Actualizar un estudiante existente
  update: async (id, data) => {
    const response = await api.put(`/estudiantes/${id}`, data);
    return response.data;
  },

  // Eliminar un estudiante (borrado lógico)
  delete: async (id) => {
    const response = await api.delete(`/estudiantes/${id}`);
    return response.data;
  },

  // Obtener cursos para los selectores
  getCursos: async () => {
    const response = await api.get('/estudiantes/cursos');
    return response.data;
  },

  // Buscar representante por cédula para autocompletar
  getRepresentanteByCedula: async (cedula) => {
    const response = await api.get(`/estudiantes/representante/${cedula}`);
    return response.data;
  },

  // Obtener lista de estudiantes del histórico para re-matriculación
  getHistorico: async () => {
    const response = await api.get('/estudiantes/historico');
    return response.data;
  }
};

export default estudiantesService;
