import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const sueldosAnticiposService = {
  getResumenMensual: async (params) => {
    try {
      const response = await axios.get(`${API_URL}/finanzas/sueldos-anticipos`, { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getDetalleTrabajador: async (personalId, periodo_id, mes) => {
    try {
      const response = await axios.get(`${API_URL}/finanzas/sueldos-anticipos/${personalId}`, {
        params: { periodo_id, mes }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  actualizarAjustesMensuales: async (personalId, data) => {
    try {
      const response = await axios.put(`${API_URL}/finanzas/sueldos-anticipos/${personalId}/ajustes`, data);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  registrarAnticipo: async (personalId, data) => {
    try {
      const response = await axios.post(`${API_URL}/finanzas/sueldos-anticipos/${personalId}/anticipo`, data);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

export default sueldosAnticiposService;
