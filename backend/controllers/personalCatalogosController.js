/**
 * ============================================================
 * Controller: Catálogos de Personal
 * Administra Tipos de Contrato, Funciones y Cargos
 * ============================================================
 */
const pool = require('../config/db');

// ── Helpers genéricos ──
const getAllCatalog = async (tableName, res) => {
  try {
    const [rows] = await pool.query(`SELECT * FROM ${tableName} ORDER BY orden, nombre`);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error(`Error fetching ${tableName}:`, error);
    res.status(500).json({ success: false, message: 'Error al obtener el catálogo.' });
  }
};

const updateCatalog = async (tableName, req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, activo, orden, genera_nomina, codigo, funcion_id } = req.body;
    
    let query = `UPDATE ${tableName} SET nombre = ?, descripcion = ?, activo = ?, orden = ?`;
    const params = [nombre, descripcion, activo ? 1 : 0, orden || 0];

    if (genera_nomina !== undefined) {
      query += `, genera_nomina = ?`;
      params.push(genera_nomina ? 1 : 0);
    }
    if (codigo !== undefined) {
      query += `, codigo = ?`;
      params.push(codigo);
    }
    if (funcion_id !== undefined) {
      query += `, funcion_id = ?`;
      params.push(funcion_id || null);
    }

    query += ` WHERE id = ?`;
    params.push(id);

    await pool.query(query, params);
    res.json({ success: true, message: 'Catálogo actualizado exitosamente.' });
  } catch (error) {
    console.error(`Error updating ${tableName}:`, error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, message: 'El valor proporcionado ya existe.' });
    }
    res.status(500).json({ success: false, message: 'Error al actualizar el catálogo.' });
  }
};

const createCatalog = async (tableName, req, res) => {
  try {
    const { nombre, descripcion, activo, orden, genera_nomina, codigo, funcion_id } = req.body;
    
    const fields = ['nombre', 'descripcion', 'activo', 'orden'];
    const values = [nombre, descripcion, activo !== false ? 1 : 0, orden || 0];
    const placeholders = ['?', '?', '?', '?'];

    if (genera_nomina !== undefined) {
      fields.push('genera_nomina');
      values.push(genera_nomina ? 1 : 0);
      placeholders.push('?');
    }
    if (codigo !== undefined) {
      fields.push('codigo');
      values.push(codigo);
      placeholders.push('?');
    }
    if (funcion_id !== undefined) {
      fields.push('funcion_id');
      values.push(funcion_id || null);
      placeholders.push('?');
    }

    await pool.query(`INSERT INTO ${tableName} (${fields.join(', ')}) VALUES (${placeholders.join(', ')})`, values);
    res.status(201).json({ success: true, message: 'Elemento creado exitosamente.' });
  } catch (error) {
    console.error(`Error creating ${tableName}:`, error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, message: 'El valor proporcionado ya existe.' });
    }
    res.status(500).json({ success: false, message: 'Error al crear en el catálogo.' });
  }
};

// ── Tipos de Contrato ──
const getTiposContrato = (req, res) => getAllCatalog('tipos_contrato', res);
const updateTipoContrato = (req, res) => updateCatalog('tipos_contrato', req, res);
const createTipoContrato = (req, res) => createCatalog('tipos_contrato', req, res);

// ── Funciones ──
const getFunciones = (req, res) => getAllCatalog('funciones_personal', res);
const updateFuncion = (req, res) => updateCatalog('funciones_personal', req, res);
const createFuncion = (req, res) => createCatalog('funciones_personal', req, res);

// ── Cargos ──
const getCargos = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT c.*, f.nombre as funcion_nombre 
      FROM cargos_personal c 
      LEFT JOIN funciones_personal f ON f.id = c.funcion_id 
      ORDER BY c.orden, c.nombre
    `);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener cargos.' });
  }
};
const updateCargo = (req, res) => updateCatalog('cargos_personal', req, res);
const createCargo = (req, res) => createCatalog('cargos_personal', req, res);

module.exports = {
  getTiposContrato, updateTipoContrato, createTipoContrato,
  getFunciones, updateFuncion, createFuncion,
  getCargos, updateCargo, createCargo
};
