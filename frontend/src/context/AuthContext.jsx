import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { verifySession } from '../services/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [usuario, setUsuario] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Restaurar sesión al cargar la app
  useEffect(() => {
    const initAuth = async () => {
      const storedToken =
        localStorage.getItem('token') || sessionStorage.getItem('token');

      if (storedToken) {
        try {
          const data = await verifySession();
          if (data.success) {
            setToken(storedToken);
            setUsuario(data.usuario);
            setIsAuthenticated(true);
          } else {
            clearSession();
          }
        } catch {
          clearSession();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const clearSession = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    sessionStorage.removeItem('token');
    setToken(null);
    setUsuario(null);
    setIsAuthenticated(false);
  };

  const login = useCallback((tokenData, usuarioData, recordarme = false) => {
    if (recordarme) {
      localStorage.setItem('token', tokenData);
      localStorage.setItem('usuario', JSON.stringify(usuarioData));
    } else {
      sessionStorage.setItem('token', tokenData);
    }
    setToken(tokenData);
    setUsuario(usuarioData);
    setIsAuthenticated(true);
  }, []);

  const logout = useCallback(() => {
    clearSession();
  }, []);

  return (
    <AuthContext.Provider
      value={{ usuario, token, isAuthenticated, loading, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Hook personalizado
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
};

export default AuthContext;
