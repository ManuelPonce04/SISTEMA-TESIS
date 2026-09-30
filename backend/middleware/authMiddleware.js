const jwt = require('jsonwebtoken');

/**
 * Middleware: Verifica que el token JWT sea válido
 */
const verifyJWT = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Acceso denegado. Token no proporcionado.',
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'La sesión ha expirado. Inicia sesión nuevamente.',
      });
    }
    return res.status(403).json({
      success: false,
      message: 'Token inválido.',
    });
  }
};

module.exports = { verifyJWT };
