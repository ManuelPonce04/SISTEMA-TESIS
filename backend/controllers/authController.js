const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const { findByEmail, findById, updateLastAccess } = require('../models/userModel');

/**
 * POST /api/auth/login
 * Autentica al usuario y retorna un JWT
 */
const login = async (req, res) => {
  // 1. Validar campos de entrada
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Datos de entrada inválidos',
      errors: errors.array(),
    });
  }

  const { correo, password, recordarme } = req.body;

  try {
    // 2. Buscar usuario en la base de datos
    const usuario = await findByEmail(correo);
    if (!usuario) {
      return res.status(401).json({
        success: false,
        message: 'Correo o contraseña incorrectos',
      });
    }

    // 3. Verificar contraseña con bcrypt
    const passwordValida = await bcrypt.compare(password, usuario.password);
    if (!passwordValida) {
      return res.status(401).json({
        success: false,
        message: 'Correo o contraseña incorrectos',
      });
    }

    // 4. Update last access
    await updateLastAccess(usuario.id_usuario);

    // 5. Generar JWT
    const expiresIn = recordarme ? '7d' : process.env.JWT_EXPIRES_IN || '8h';
    const token = jwt.sign(
      {
        id: usuario.id_usuario,
        correo: usuario.correo,
        es_admin: !!usuario.es_admin
      },
      process.env.JWT_SECRET,
      { expiresIn }
    );

    // 6. Responder con token y datos del usuario
    return res.status(200).json({
      success: true,
      message: 'Inicio de sesión exitoso',
      token,
      usuario: {
        id: usuario.id_usuario,
        nombre_completo: usuario.nombre_completo,
        correo: usuario.correo,
        es_admin: !!usuario.es_admin
      },
    });
  } catch (error) {
    console.error('Error en login:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
    });
  }
};

/**
 * GET /api/auth/verify
 * Verifica si el token JWT es válido
 */
const verifyToken = async (req, res) => {
  try {
    // El middleware authMiddleware ya validó el token y adjuntó req.usuario
    const usuario = await findById(req.usuario.id);
    if (!usuario) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }
    return res.status(200).json({ success: true, usuario });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

module.exports = { login, verifyToken };
