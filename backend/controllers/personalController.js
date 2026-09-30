/**
 * ============================================================
 * Controller: Personal
 * CRUD + Historial Salarial + Exportación
 * ============================================================
 */
const pool = require('../config/db');

// ── Helpers ──────────────────────────────────────────────────
const getClientIp = (req) => req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null;

const validarCedulaEcuatoriana = (cedula) => {
  if (cedula.length !== 10) return false;
  const digito_region = parseInt(cedula.substring(0, 2), 10);
  if (digito_region < 1 || digito_region > 24) return false;
  
  const ultimo_digito = parseInt(cedula.substring(9, 10), 10);
  let pares = 0;
  let impares = 0;
  
  for (let i = 0; i < 9; i++) {
    let num = parseInt(cedula.charAt(i), 10);
    if (i % 2 === 0) {
      num = num * 2;
      if (num > 9) num -= 9;
      impares += num;
    } else {
      pares += num;
    }
  }
  const suma_total = pares + impares;
  const decena_superior = Math.ceil(suma_total / 10) * 10;
  let digito_validador = decena_superior - suma_total;
  if (digito_validador === 10) digito_validador = 0;
  
  return digito_validador === ultimo_digito;
};

// ═══════════════════════════════════════════════════════════════
// GET /api/personal
// ═══════════════════════════════════════════════════════════════
const getPersonal = async (req, res) => {
  try {
    const {
      page = 1, limit = 20, search = '',
      estado, tipo_contrato_id, funcion_id, cargo_id,
      con_sueldo, sin_cedula, fecha_ingreso_desde, fecha_ingreso_hasta,
      sort_by = 'apellidos', sort_order = 'ASC'
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions = [];
    const params = [];

    if (search.trim()) {
      conditions.push('(p.codigo_interno LIKE ? OR p.nombre_completo LIKE ? OR p.cedula LIKE ?)');
      params.push(`%${search.trim()}%`, `%${search.trim()}%`, `%${search.trim()}%`);
    }
    if (estado) { conditions.push('p.estado = ?'); params.push(estado.toUpperCase()); }
    if (tipo_contrato_id) { conditions.push('p.tipo_contrato_id = ?'); params.push(parseInt(tipo_contrato_id)); }
    if (funcion_id) { conditions.push('p.funcion_id = ?'); params.push(parseInt(funcion_id)); }
    if (cargo_id) { conditions.push('p.cargo_id = ?'); params.push(parseInt(cargo_id)); }
    if (con_sueldo === 'true') { conditions.push('p.sueldo_actual > 0'); }
    if (sin_cedula === 'true') { conditions.push('(p.cedula IS NULL OR p.cedula = "")'); }
    if (fecha_ingreso_desde) { conditions.push('p.fecha_ingreso >= ?'); params.push(fecha_ingreso_desde); }
    if (fecha_ingreso_hasta) { conditions.push('p.fecha_ingreso <= ?'); params.push(fecha_ingreso_hasta); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const allowedSort = { apellidos: 'p.apellidos', fecha_ingreso: 'p.fecha_ingreso', codigo_interno: 'p.codigo_interno', sueldo: 'p.sueldo_actual' };
    const safeSort = allowedSort[sort_by] || 'p.apellidos';
    const safeOrder = sort_order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    // Total counts
    const [countResult] = await pool.query(`SELECT COUNT(*) as total FROM personal p ${where}`, params);
    const total = countResult[0].total;

    // Data
    const [rows] = await pool.query(`
      SELECT 
        p.id, p.codigo_interno, p.cedula, p.nombre_completo, p.nombre_corto, p.correo, p.telefono,
        p.fecha_ingreso, p.sueldo_actual, p.estado,
        tc.codigo AS contrato_codigo, tc.nombre AS contrato_nombre,
        f.nombre AS funcion_nombre,
        c.nombre AS cargo_nombre
      FROM personal p
      LEFT JOIN tipos_contrato tc ON tc.id = p.tipo_contrato_id
      LEFT JOIN funciones_personal f ON f.id = p.funcion_id
      LEFT JOIN cargos_personal c ON c.id = p.cargo_id
      ${where}
      ORDER BY ${safeSort} ${safeOrder}, p.nombres ${safeOrder}
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), offset]);

    // Resumen
    const [resumen] = await pool.query(`
      SELECT 
        COUNT(CASE WHEN p.estado = 'ACTIVO' THEN 1 END) as total_activos,
        COUNT(CASE WHEN tc.codigo = 'PL' AND p.estado = 'ACTIVO' THEN 1 END) as total_planta,
        COUNT(CASE WHEN tc.codigo = 'SP' AND p.estado = 'ACTIVO' THEN 1 END) as total_servicios,
        COUNT(CASE WHEN f.nombre = 'Docente' AND p.estado = 'ACTIVO' THEN 1 END) as total_docentes,
        COUNT(CASE WHEN f.nombre = 'Administrativo' AND p.estado = 'ACTIVO' THEN 1 END) as total_admin
      FROM personal p
      LEFT JOIN tipos_contrato tc ON tc.id = p.tipo_contrato_id
      LEFT JOIN funciones_personal f ON f.id = p.funcion_id
    `);

    res.json({
      success: true,
      data: rows,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) },
      resumen: resumen[0]
    });
  } catch (error) {
    console.error('Error en getPersonal:', error);
    res.status(500).json({ success: false, message: 'Error al obtener personal.' });
  }
};

// ═══════════════════════════════════════════════════════════════
// GET /api/personal/:id
// ═══════════════════════════════════════════════════════════════
const getPersonalById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(`
      SELECT p.*, tc.nombre AS contrato_nombre, f.nombre AS funcion_nombre, c.nombre AS cargo_nombre
      FROM personal p
      LEFT JOIN tipos_contrato tc ON tc.id = p.tipo_contrato_id
      LEFT JOIN funciones_personal f ON f.id = p.funcion_id
      LEFT JOIN cargos_personal c ON c.id = p.cargo_id
      WHERE p.id = ?
    `, [id]);

    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Personal no encontrado.' });
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener detalle del personal.' });
  }
};

// ═══════════════════════════════════════════════════════════════
// POST /api/personal
// ═══════════════════════════════════════════════════════════════
const createPersonal = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const body = req.body;
    
    // Validaciones básicas
    if (!body.codigo_interno) throw new Error('Código interno requerido');
    if (!body.nombre_completo) throw new Error('Nombre completo requerido');
    if (!body.tipo_contrato_id) throw new Error('Tipo de contrato requerido');

    // Validar cédula
    if (body.cedula && body.cedula.trim() !== '') {
      const ced = body.cedula.trim();
      if (!validarCedulaEcuatoriana(ced)) throw new Error('Cédula no válida');
      const [dupes] = await conn.query('SELECT id FROM personal WHERE cedula = ?', [ced]);
      if (dupes.length > 0) throw new Error('La cédula ya está registrada');
      body.cedula = ced;
    } else {
      body.cedula = null;
    }

    // Validar código
    const [codeDupes] = await conn.query('SELECT id FROM personal WHERE codigo_interno = ?', [body.codigo_interno]);
    if (codeDupes.length > 0) throw new Error('El código interno ya está en uso');

    const sueldo_actual = parseFloat(body.sueldo_actual) || 0;

    const [result] = await conn.query(`
      INSERT INTO personal (
        codigo_interno, cedula, apellidos, nombres, nombre_completo, nombre_corto,
        correo, telefono, direccion, fecha_nacimiento, tipo_contrato_id, cargo_id,
        funcion_id, fecha_ingreso, sueldo_actual, modalidad_pago, creado_por
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      body.codigo_interno.trim().toUpperCase(), body.cedula, body.apellidos, body.nombres, body.nombre_completo, body.nombre_corto,
      body.correo, body.telefono, body.direccion, body.fecha_nacimiento || null, body.tipo_contrato_id, body.cargo_id || null,
      body.funcion_id || null, body.fecha_ingreso || null, sueldo_actual, body.modalidad_pago, req.usuario.id
    ]);

    const newId = result.insertId;

    // Si hay sueldo inicial, crear historial
    if (sueldo_actual > 0) {
      await conn.query(`
        INSERT INTO historial_sueldos (personal_id, sueldo, fecha_desde, motivo, usuario_id)
        VALUES (?, ?, ?, ?, ?)
      `, [newId, sueldo_actual, body.fecha_ingreso || new Date(), 'Sueldo inicial al registro', req.usuario.id]);
    }

    await conn.commit();
    conn.release();
    res.status(201).json({ success: true, message: 'Personal registrado exitosamente.', id: newId });
  } catch (error) {
    await conn.rollback();
    conn.release();
    res.status(400).json({ success: false, message: error.message || 'Error al crear registro' });
  }
};

// ═══════════════════════════════════════════════════════════════
// PUT /api/personal/:id
// ═══════════════════════════════════════════════════════════════
const updatePersonal = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { id } = req.params;
    const body = req.body;

    const [existing] = await conn.query('SELECT * FROM personal WHERE id = ?', [id]);
    if (existing.length === 0) throw new Error('Registro no encontrado');

    if (body.cedula && body.cedula.trim() !== '' && body.cedula !== existing[0].cedula) {
      const ced = body.cedula.trim();
      if (!validarCedulaEcuatoriana(ced)) throw new Error('Cédula no válida');
      const [dupes] = await conn.query('SELECT id FROM personal WHERE cedula = ? AND id != ?', [ced, id]);
      if (dupes.length > 0) throw new Error('La cédula ya está registrada');
      body.cedula = ced;
    } else if (!body.cedula || body.cedula.trim() === '') {
      body.cedula = null;
    }

    await conn.query(`
      UPDATE personal SET
        codigo_interno = ?, cedula = ?, apellidos = ?, nombres = ?, nombre_completo = ?, nombre_corto = ?,
        correo = ?, telefono = ?, direccion = ?, fecha_nacimiento = ?, tipo_contrato_id = ?, cargo_id = ?,
        funcion_id = ?, fecha_ingreso = ?, modalidad_pago = ?, actualizado_por = ?, observacion = ?
      WHERE id = ?
    `, [
      body.codigo_interno.trim().toUpperCase(), body.cedula, body.apellidos, body.nombres, body.nombre_completo, body.nombre_corto,
      body.correo, body.telefono, body.direccion, body.fecha_nacimiento || null, body.tipo_contrato_id, body.cargo_id || null,
      body.funcion_id || null, body.fecha_ingreso || null, body.modalidad_pago, req.usuario.id, body.observacion, id
    ]);

    await conn.commit();
    conn.release();
    res.json({ success: true, message: 'Personal actualizado exitosamente.' });
  } catch (error) {
    await conn.rollback();
    conn.release();
    res.status(400).json({ success: false, message: error.message });
  }
};

// ═══════════════════════════════════════════════════════════════
// POST /api/personal/:id/cambiar-sueldo
// ═══════════════════════════════════════════════════════════════
const cambiarSueldo = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { id } = req.params;
    const { nuevo_sueldo, fecha_vigencia, motivo } = req.body;

    const sueldo = parseFloat(nuevo_sueldo);
    if (isNaN(sueldo) || sueldo < 0) throw new Error('Sueldo no válido');
    if (!fecha_vigencia) throw new Error('Fecha de vigencia requerida');
    if (!motivo) throw new Error('Motivo requerido');

    // Cerrar el sueldo vigente
    const [activos] = await conn.query('SELECT id FROM historial_sueldos WHERE personal_id = ? AND fecha_hasta IS NULL ORDER BY fecha_desde DESC LIMIT 1', [id]);
    if (activos.length > 0) {
      await conn.query('UPDATE historial_sueldos SET fecha_hasta = ? WHERE id = ?', [fecha_vigencia, activos[0].id]);
    }

    // Crear nuevo historial
    await conn.query(`
      INSERT INTO historial_sueldos (personal_id, sueldo, fecha_desde, motivo, usuario_id)
      VALUES (?, ?, ?, ?, ?)
    `, [id, sueldo, fecha_vigencia, motivo, req.usuario.id]);

    // Actualizar tabla principal
    await conn.query('UPDATE personal SET sueldo_actual = ? WHERE id = ?', [sueldo, id]);

    await conn.commit();
    conn.release();
    res.json({ success: true, message: 'Sueldo actualizado exitosamente.' });
  } catch (error) {
    await conn.rollback();
    conn.release();
    res.status(400).json({ success: false, message: error.message });
  }
};

// ═══════════════════════════════════════════════════════════════
// PATCH /api/personal/:id/estado
// ═══════════════════════════════════════════════════════════════
const cambiarEstado = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado, fecha_salida, motivo } = req.body;
    
    if (estado === 'INACTIVO' && !motivo) return res.status(400).json({ success: false, message: 'Motivo de salida requerido' });

    await pool.query(`
      UPDATE personal 
      SET estado = ?, fecha_salida = ?, motivo_inactivacion = ?, actualizado_por = ?
      WHERE id = ?
    `, [estado, estado === 'INACTIVO' ? fecha_salida || null : null, estado === 'INACTIVO' ? motivo : null, req.usuario.id, id]);

    res.json({ success: true, message: `Personal marcado como ${estado}` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al cambiar estado' });
  }
};

// ═══════════════════════════════════════════════════════════════
// GET /api/personal/:id/historial-sueldos
// ═══════════════════════════════════════════════════════════════
const getHistorialSueldos = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(`
      SELECT hs.*, u.nombre_completo as usuario_nombre
      FROM historial_sueldos hs
      JOIN usuarios u ON u.id_usuario = hs.usuario_id
      WHERE hs.personal_id = ?
      ORDER BY hs.fecha_desde DESC, hs.id DESC
    `, [id]);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener historial' });
  }
};

// Exportar (Stubs base que puedes ampliar con ExcelJS / PDFKit similar a Movimientos)
const exportarExcel = async (req, res) => {
  res.status(501).json({ message: 'Exportación en desarrollo' });
};

const exportarPDF = async (req, res) => {
  res.status(501).json({ message: 'Exportación en desarrollo' });
};

module.exports = {
  getPersonal,
  getPersonalById,
  createPersonal,
  updatePersonal,
  cambiarSueldo,
  cambiarEstado,
  getHistorialSueldos,
  exportarExcel,
  exportarPDF
};
