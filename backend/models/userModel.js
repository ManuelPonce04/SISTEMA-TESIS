const pool = require('../config/db');

/**
 * Busca un usuario por su correo electrónico
 * @param {string} correo
 * @returns {Promise<object|null>}
 */
const findByEmail = async (correo) => {
  const [rows] = await pool.execute(
    'SELECT * FROM usuarios WHERE correo = ? AND estado = ?',
    [correo, 'Activo']
  );
  return rows.length > 0 ? rows[0] : null;
};

/**
 * Busca un usuario por su ID
 * @param {number} id
 * @returns {Promise<object|null>}
 */
const findById = async (id) => {
  const [rows] = await pool.execute(
    'SELECT id_usuario, nombre_completo, correo, estado, es_admin, ultimo_acceso, created_at FROM usuarios WHERE id_usuario = ?',
    [id]
  );
  return rows.length > 0 ? rows[0] : null;
};

/**
 * Actualiza la fecha de último acceso del usuario
 * @param {number} id 
 */
const updateLastAccess = async (id) => {
  await pool.execute(
    'UPDATE usuarios SET ultimo_acceso = NOW() WHERE id_usuario = ?',
    [id]
  );
};

module.exports = { findByEmail, findById, updateLastAccess };
