import api from './authService';

const academicoService = {
  // Periodos
  getPeriodos: async () => {
    const response = await api.get('/academico/periodos');
    return response.data;
  },
  getPeriodoActivo: async () => {
    const response = await api.get('/academico/periodos/activo');
    return response.data;
  },
  createPeriodo: async (data) => {
    const response = await api.post('/academico/periodos', data);
    return response.data;
  },
  updatePeriodo: async (id, data) => {
    const response = await api.put(`/academico/periodos/${id}`, data);
    return response.data;
  },
  activarPeriodo: async (id) => {
    const response = await api.patch(`/academico/periodos/${id}/activar`);
    return response.data;
  },
  cambiarEstadoPeriodo: async (id, estado) => {
    const response = await api.patch(`/academico/periodos/${id}/estado`, { estado });
    return response.data;
  },

  // Niveles
  getNiveles: async () => {
    const response = await api.get('/academico/niveles');
    return response.data;
  },
  createNivel: async (data) => {
    const response = await api.post('/academico/niveles', data);
    return response.data;
  },
  updateNivel: async (id, data) => {
    const response = await api.put(`/academico/niveles/${id}`, data);
    return response.data;
  },

  // Cursos
  getCursos: async () => {
    const response = await api.get('/academico/cursos');
    return response.data;
  },
  createCurso: async (data) => {
    const response = await api.post('/academico/cursos', data);
    return response.data;
  },
  updateCurso: async (id, data) => {
    const response = await api.put(`/academico/cursos/${id}`, data);
    return response.data;
  },

  // Paralelos
  getParalelos: async () => {
    const response = await api.get('/academico/paralelos');
    return response.data;
  },
  createParalelo: async (data) => {
    const response = await api.post('/academico/paralelos', data);
    return response.data;
  },
  updateParalelo: async (id, data) => {
    const response = await api.put(`/academico/paralelos/${id}`, data);
    return response.data;
  },

  // Jornadas
  getJornadas: async () => {
    const response = await api.get('/academico/jornadas');
    return response.data;
  },
  createJornada: async (data) => {
    const response = await api.post('/academico/jornadas', data);
    return response.data;
  },
  updateJornada: async (id, data) => {
    const response = await api.put(`/academico/jornadas/${id}`, data);
    return response.data;
  },

  // Ofertas
  getOfertas: async (periodo_id) => {
    const response = await api.get('/academico/ofertas', { params: { periodo_id } });
    return response.data;
  },
  getOfertaAcademica: async (params) => {
    const response = await api.get('/academico/ofertas', { params: { periodo_id: params.periodo_lectivo_id || params.periodo_id } });
    return response.data;
  },
  createOferta: async (data) => {
    const response = await api.post('/academico/ofertas', data);
    return response.data;
  },
  updateOferta: async (id, data) => {
    const response = await api.put(`/academico/ofertas/${id}`, data);
    return response.data;
  },
  creacionMasivaOfertas: async (data) => {
    const response = await api.post('/academico/ofertas/creacion-masiva', data);
    return response.data;
  },
  copiarPeriodo: async (data) => {
    const response = await api.post('/academico/ofertas/copiar-periodo', data);
    return response.data;
  }
};

// Exportar aliases para compatibilidad con componentes que usan importaciones nombradas
export const getPeriodosLectivos = academicoService.getPeriodos;
export const getNivelesEducativos = academicoService.getNiveles;
export const getCursos = academicoService.getCursos;
export const getParalelos = academicoService.getParalelos;
export const getJornadas = academicoService.getJornadas;
export const getOfertaAcademica = academicoService.getOfertas;

export default academicoService;
