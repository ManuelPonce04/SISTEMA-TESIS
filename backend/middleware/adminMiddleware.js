/**
 * Middleware: Verifica que el usuario tenga privilegios de administrador (es_admin = true)
 */
const checkAdmin = (req, res, next) => {
  if (!req.usuario) {
    return res.status(401).json({
      success: false,
      message: 'No autenticado.',
    });
  }

  if (req.usuario.es_admin !== true && req.usuario.es_admin !== 1) {
    return res.status(403).json({
      success: false,
      message: 'Acceso denegado. Se requiere ser Administrador.',
    });
  }

  next();
};

module.exports = { checkAdmin };
