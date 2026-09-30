const pool = require('../config/db');
const bcrypt = require('bcryptjs');

/**
 * GET /api/usuarios
 * Obtener todos los usuarios (Solo Admin)
 */
const getUsuarios = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id_usuario, nombre_completo, correo, estado, es_admin, ultimo_acceso, created_at FROM usuarios ORDER BY id_usuario ASC'
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching usuarios:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

/**
 * POST /api/usuarios
 * Crear un nuevo usuario (Solo Admin)
 */
const createUsuario = async (req, res) => {
  try {
    const { nombre_completo, correo, password, es_admin } = req.body;

    // Verificar si el correo ya existe
    const [existing] = await pool.execute('SELECT id_usuario FROM usuarios WHERE correo = ?', [correo]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'El correo ya está registrado' });
    }

    // Hashear contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const [result] = await pool.execute(
      'INSERT INTO usuarios (nombre_completo, correo, password, es_admin) VALUES (?, ?, ?, ?)',
      [nombre_completo, correo, hashedPassword, es_admin ? 1 : 0]
    );

    res.status(201).json({ success: true, message: 'Usuario creado exitosamente', id: result.insertId });
  } catch (error) {
    console.error('Error creating usuario:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

/**
 * PUT /api/usuarios/perfil
 * Actualizar el perfil propio (Cualquier usuario)
 */
const updatePerfil = async (req, res) => {
  try {
    const id = req.usuario.id;
    const { nombre_completo, password } = req.body;

    if (password) {
      // Hashear nueva contraseña
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      await pool.execute(
        'UPDATE usuarios SET nombre_completo = ?, password = ? WHERE id_usuario = ?',
        [nombre_completo, hashedPassword, id]
      );
    } else {
      await pool.execute(
        'UPDATE usuarios SET nombre_completo = ? WHERE id_usuario = ?',
        [nombre_completo, id]
      );
    }

    res.json({ success: true, message: 'Perfil actualizado exitosamente' });
  } catch (error) {
    console.error('Error updating perfil:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

module.exports = {
  getUsuarios,
  createUsuario,
  updatePerfil
};
