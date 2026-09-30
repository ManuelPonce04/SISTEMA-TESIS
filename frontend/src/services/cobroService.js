import api from './api';

export const buscarEstudiantesParaCobro = async (q) => {
  try {
    const { data } = await api.get(`/pensiones/cobros/estudiantes/buscar?q=${q}`);
    return data;
  } catch (error) {
    throw error;
  }
};

export const getObligacionesCobrables = async (matriculaId) => {
  try {
    const { data } = await api.get(`/pensiones/cobros/matricula/${matriculaId}/obligaciones`);
    return data;
  } catch (error) {
    throw error;
  }
};

export const getMetodosPago = async () => {
  try {
    const { data } = await api.get('/pensiones/cobros/metodos-pago');
    return data;
  } catch (error) {
    throw error;
  }
};

export const registrarCobro = async (payload) => {
  try {
    const { data } = await api.post('/pensiones/cobros', payload);
    return data;
  } catch (error) {
    throw error;
  }
};
