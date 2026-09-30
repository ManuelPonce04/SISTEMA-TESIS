import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const nominaService = {
  listarNominas: async (params) => {
    try {
      const response = await axios.get(`${API_URL}/finanzas/nominas`, { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  generarNomina: async (data) => {
    try {
      const response = await axios.post(`${API_URL}/finanzas/nominas/generar`, data);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getNominaDetalle: async (id) => {
    try {
      const response = await axios.get(`${API_URL}/finanzas/nominas/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  recalcularNomina: async (id) => {
    try {
      const response = await axios.post(`${API_URL}/finanzas/nominas/${id}/recalcular`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  cambiarEstado: async (id, estado) => {
    try {
      const response = await axios.patch(`${API_URL}/finanzas/nominas/${id}/estado`, { estado });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  pagarIndividual: async (nominaId, detalleId, data) => {
    try {
      const response = await axios.post(`${API_URL}/finanzas/nominas/${nominaId}/detalles/${detalleId}/pagar`, data);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

export default nominaService;
