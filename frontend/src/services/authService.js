import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Interceptor: adjunta el token en cada petición
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Inicia sesión del usuario
 * @param {string} correo
 * @param {string} password
 * @param {boolean} recordarme
 */
export const loginUser = async (correo, password, recordarme = false) => {
  const response = await api.post('/auth/login', { correo, password, recordarme });
  return response.data;
};

/**
 * Verifica si el token actual es válido
 */
export const verifySession = async () => {
  const response = await api.get('/auth/verify');
  return response.data;
};

export default api;
