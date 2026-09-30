const pool = require('../config/db');

/**
 * Obtener todos los representantes
 */
const getAll = async (search = '', page = 1, limit = 20) => {
  const offset = (page - 1) * limit;
  let sql = 'SELECT * FROM representantes';
  let params = [];

  if (search) {
    sql += ' WHERE cedula LIKE ? OR nombres LIKE ? OR apellidos LIKE ?';
    const s = `%${search}%`;
    params.push(s, s, s);
  }

  sql += ' ORDER BY apellidos ASC, nombres ASC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));

  // Count total
  let countSql = 'SELECT COUNT(*) as total FROM representantes';
  let countParams = [];
  if (search) {
    countSql += ' WHERE cedula LIKE ? OR nombres LIKE ? OR apellidos LIKE ?';
    countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  const [countRows] = await pool.execute(countSql, countParams);
  const total = countRows[0].total;

  const [rows] = await pool.execute(sql, params);

  return {
    data: rows,
    total,
    page: parseInt(page),
    limit: parseInt(limit),
    totalPages: Math.ceil(total / limit)
  };
};

/**
 * Obtener representante por ID
 */
const getById = async (id) => {
  const [rows] = await pool.execute('SELECT * FROM representantes WHERE id_representante = ?', [id]);
  return rows[0] || null;
};

/**
 * Buscar representante por cédula (para autocompletado y validaciones)
 */
const getByCedula = async (cedula) => {
  const [rows] = await pool.execute('SELECT * FROM representantes WHERE cedula = ?', [cedula]);
  return rows[0] || null;
};

/**
 * Crear un representante
 */
const create = async (data, connection = null) => {
  const conn = connection || pool;
  const { cedula, nombres, apellidos, telefono, correo, direccion } = data;
  
  const [result] = await conn.execute(
    'INSERT INTO representantes (cedula, nombres, apellidos, telefono, correo, direccion) VALUES (?, ?, ?, ?, ?, ?)',
    [cedula || null, nombres, apellidos, telefono || null, correo || null, direccion || null]
  );
  
  return result.insertId;
};

/**
 * Actualizar representante
 */
const update = async (id, data, connection = null) => {
  const conn = connection || pool;
  const { cedula, nombres, apellidos, telefono, correo, direccion } = data;
  
  await conn.execute(
    'UPDATE representantes SET cedula=?, nombres=?, apellidos=?, telefono=?, correo=?, direccion=? WHERE id_representante=?',
    [cedula || null, nombres, apellidos, telefono || null, correo || null, direccion || null, id]
  );
  
  return true;
};

module.exports = {
  getAll,
  getById,
  getByCedula,
  create,
  update
};
