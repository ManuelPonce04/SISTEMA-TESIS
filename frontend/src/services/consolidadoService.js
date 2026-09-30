import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const consolidadoService = {
  getResumenGeneral: async (params) => {
    try {
      const response = await axios.get(`${API_URL}/finanzas/consolidado/resumen`, { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getConsolidadoMensual: async (params) => {
    try {
      const response = await axios.get(`${API_URL}/finanzas/consolidado/mensual`, { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getSaldosCuentas: async (params) => {
    try {
      const response = await axios.get(`${API_URL}/finanzas/consolidado/cuentas`, { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getMejorasPlantel: async (params) => {
    try {
      const response = await axios.get(`${API_URL}/finanzas/consolidado/mejoras-plantel`, { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

export default consolidadoService;
