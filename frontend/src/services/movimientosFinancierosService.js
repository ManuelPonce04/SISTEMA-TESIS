import api from './authService';

const movimientosFinancierosService = {
  // Obtener resumen de tarjetas (totales)
  getResumen: async (params) => {
    const response = await api.get('/finanzas/movimientos/resumen', { params });
    return response.data;
  },

  // Obtener lista paginada y filtrada
  getAll: async (params) => {
    const response = await api.get('/finanzas/movimientos', { params });
    return response.data;
  },

  // Obtener un movimiento por ID
  getById: async (id) => {
    const response = await api.get(`/finanzas/movimientos/${id}`);
    return response.data;
  },

  // Crear un movimiento (soporta archivo vía FormData)
  create: async (formData) => {
    const response = await api.post('/finanzas/movimientos', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Editar un movimiento (soporta archivo vía FormData)
  update: async (id, formData) => {
    const response = await api.put(`/finanzas/movimientos/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Anular un movimiento
  anular: async (id, motivo) => {
    const response = await api.patch(`/finanzas/movimientos/${id}/anular`, { motivo });
    return response.data;
  },

  // Exportar a Excel
  exportarExcel: async (params) => {
    const response = await api.get('/finanzas/movimientos/exportar/excel', {
      params,
      responseType: 'blob', // Importante para manejar archivos binarios
    });
    return response.data;
  },

  // Exportar a PDF
  exportarPDF: async (params) => {
    const response = await api.get('/finanzas/movimientos/exportar/pdf', {
      params,
      responseType: 'blob',
    });
    return response.data;
  },

  // Obtener URL de descarga del archivo
  getArchivoUrl: (id) => {
    return `${import.meta.env.VITE_API_URL}/finanzas/movimientos/${id}/archivo`;
  },

  // Obtener datos iniciales para el formulario (periodos, cuentas, conceptos)
  getDatosFormulario: async () => {
    const response = await api.get('/finanzas/movimientos/datos-formulario');
    return response.data;
  },

  // Obtener lista de periodos lectivos
  getPeriodos: async () => {
    const response = await api.get('/finanzas/movimientos/datos-formulario');
    return { success: response.data.success, data: response.data.data?.periodos || [] };
  },

  // Obtener cuentas financieras activas
  getCuentasActivas: async () => {
    const response = await api.get('/finanzas/movimientos/datos-formulario');
    return { success: response.data.success, data: response.data.data?.cuentas || [] };
  }
};

export default movimientosFinancierosService;
