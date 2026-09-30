import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Protege rutas requiriendo autenticación y opcionalmente un rol específico
 * @param {string[]} allowedRoles - Roles permitidos (vacío = cualquier usuario autenticado)
 */
const ProtectedRoute = ({ allowedRoles = [] }) => {
  const { isAuthenticated, usuario, loading } = useAuth();

  // Mostrar spinner mientras se verifica la sesión
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 text-sm font-medium">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  // Si no está autenticado, redirigir al login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Si hay roles requeridos y el usuario no tiene permiso
  if (allowedRoles.length > 0 && !allowedRoles.includes(usuario?.rol)) {
    return <Navigate to="/no-autorizado" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
