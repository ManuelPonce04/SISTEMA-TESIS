import api from './authService';

export const buscarEstudiantesCobranzas = async (search) => {
  const response = await api.get(`/cobranzas/estudiantes/buscar?search=${search}`);
  return response.data;
};

export const getResumenFinancieroEstudiante = async (id_estudiante) => {
  const response = await api.get(`/cobranzas/resumen/${id_estudiante}`);
  return response.data;
};

export const registrarPagoGlobal = async (pagoData) => {
  const response = await api.post('/cobranzas/pagos', pagoData);
  return response.data;
};

export const getHistorialPagosGlobal = async () => {
  const response = await api.get('/cobranzas/pagos');
  return response.data;
};

export const anularPago = async (id_pago, motivo_anulacion) => {
  const response = await api.patch(`/cobranzas/pagos/${id_pago}/anular`, { motivo_anulacion });
  return response.data;
};

export const descargarReciboPDF = async (id_pago) => {
  // Retorna un blob para descargar o mostrar
  const response = await api.get(`/cobranzas/recibos/${id_pago}`, { responseType: 'blob' });
  return response.data;
};
