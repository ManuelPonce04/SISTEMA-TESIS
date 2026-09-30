import api from './authService';

/**
 * Obtiene el resumen de KPIs
 * @param {object} params - { periodo, mes, curso }
 */
export const getDashboardSummary = async (params = {}) => {
  const response = await api.get('/dashboard/summary', { params });
  return response.data;
};

export const getMonthlyCollections = async (params = {}) => {
  const response = await api.get('/dashboard/monthly-collections', { params });
  return response.data;
};

export const getCourseCollections = async (params = {}) => {
  const response = await api.get('/dashboard/course-collections', { params });
  return response.data;
};

export const getRecentPayments = async (params = {}) => {
  const response = await api.get('/dashboard/recent-payments', { params });
  return response.data;
};

export const getUpcomingPayments = async (params = {}) => {
  const response = await api.get('/dashboard/upcoming-payments', { params });
  return response.data;
};

export const getTopDebtors = async (params = {}) => {
  const response = await api.get('/dashboard/top-debtors', { params });
  return response.data;
};

export const getActivity = async (params = {}) => {
  const response = await api.get('/dashboard/activity', { params });
  return response.data;
};

export const getGoals = async (params = {}) => {
  const response = await api.get('/dashboard/goals', { params });
  return response.data;
};
