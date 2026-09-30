const pool = require('../config/db');

// --- H E L P E R S ---
const getActivePeriodo = async () => {
  const [rows] = await pool.query('SELECT id, nombre FROM periodos_lectivos WHERE es_activo = 1 LIMIT 1');
  return rows.length > 0 ? rows[0] : null;
};

// --- GET MATRÍCULAS ---
exports.getMatriculas = async (req, res) => {
  try {
    const { periodo_lectivo_id, search, estado } = req.query;
    
    let sql = `
      SELECT 
        m.*,
        e.nombres as estudiante_nombres, e.apellidos as estudiante_apellidos, e.apellidos_nombres as estudiante_apellidos_nombres, e.codigo as estudiante_codigo, e.cedula as estudiante_cedula,
        c.nombre as curso_nombre,
        p.nombre as paralelo_nombre,
        j.nombre as jornada_nombre
      FROM matriculas m
      JOIN estudiantes e ON m.estudiante_id = e.id_estudiante
      JOIN oferta_academica o ON m.oferta_academica_id = o.id
      JOIN cursos c ON o.curso_id = c.id
      JOIN paralelos p ON o.paralelo_id = p.id
      LEFT JOIN jornadas j ON o.jornada_id = j.id
      WHERE 1=1
    `;
    const params = [];

    if (periodo_lectivo_id) {
      sql += ' AND m.periodo_lectivo_id = ?';
      params.push(periodo_lectivo_id);
    }
    
    if (estado) {
      sql += ' AND m.estado = ?';
      params.push(estado);
    }

    if (search) {
      sql += ' AND (e.nombres LIKE ? OR e.apellidos LIKE ? OR e.cedula LIKE ? OR e.codigo LIKE ? OR m.numero_matricula LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s, s, s);
    }

    sql += ' ORDER BY m.created_at DESC';

    const [rows] = await pool.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- GET MATRICULA BY ID ---
exports.getMatriculaById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(`
      SELECT 
        m.*,
        e.nombres as estudiante_nombres, e.apellidos as estudiante_apellidos, e.apellidos_nombres as estudiante_apellidos_nombres, e.codigo as estudiante_codigo, e.cedula as estudiante_cedula,
        rp.nombres as rep_nombres, rp.apellidos as rep_apellidos, rp.cedula as rep_cedula, rp.telefono as rep_telefono, rp.correo as rep_correo,
        re.nombres as resp_nombres, re.apellidos as resp_apellidos, re.cedula as resp_cedula,
        c.nombre as curso_nombre, c.nivel_id, c.id as curso_id,
        p.nombre as paralelo_nombre, p.id as paralelo_id,
        j.nombre as jornada_nombre,
        t.nombre as tipo_matricula_nombre
      FROM matriculas m
      JOIN estudiantes e ON m.estudiante_id = e.id_estudiante
      LEFT JOIN representantes rp ON m.representante_principal_id = rp.id_representante
      LEFT JOIN representantes re ON m.responsable_economico_id = re.id_representante
      JOIN oferta_academica o ON m.oferta_academica_id = o.id
      JOIN cursos c ON o.curso_id = c.id
      JOIN paralelos p ON o.paralelo_id = p.id
      LEFT JOIN jornadas j ON o.jornada_id = j.id
      JOIN tipos_matricula t ON m.tipo_matricula_id = t.id
      WHERE m.id = ?
    `, [id]);

    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Matrícula no encontrada' });
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- GET TIPOS MATRICULA ---
exports.getTiposMatricula = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM tipos_matricula WHERE activo = 1 ORDER BY orden ASC');
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- GET TARIFA ---
exports.getTarifa = async (req, res) => {
  try {
    const { periodo_lectivo_id, nivel_id, tipo_matricula_id } = req.query;
    const [rows] = await pool.query(`
      SELECT valor FROM tarifas_matricula 
      WHERE periodo_lectivo_id = ? AND nivel_id = ? AND tipo_matricula_id = ? AND activo = 1
      LIMIT 1
    `, [periodo_lectivo_id, nivel_id, tipo_matricula_id]);
    
    if (rows.length > 0) {
      res.json({ success: true, valor: rows[0].valor });
    } else {
      res.json({ success: true, valor: 0 }); // Fallback
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- CREATE MATRICULA (BORRADOR) ---
exports.createMatricula = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { 
      estudiante_id, periodo_lectivo_id, oferta_academica_id, tipo_matricula_id, 
      representante_principal_id, responsable_economico_id,
      tarifa_base, tipo_descuento, valor_descuento, tipo_recargo, valor_recargo, observacion 
    } = req.body;
    const usuario_id = req.user?.id_usuario;

    await conn.beginTransaction();

    // 1. Verificar si ya existe matrícula ACTIVA o PENDIENTE en el mismo periodo
    const [duplicados] = await conn.query(`
      SELECT id FROM matriculas 
      WHERE estudiante_id = ? AND periodo_lectivo_id = ? AND estado NOT IN ('ANULADA', 'RETIRADA')
    `, [estudiante_id, periodo_lectivo_id]);
    
    if (duplicados.length > 0) {
      await conn.rollback();
      return res.status(400).json({ success: false, message: 'El estudiante ya tiene una matrícula activa en este periodo.' });
    }

    // 2. Determinar si es estudiante nuevo o antiguo
    const [historial] = await conn.query('SELECT id FROM matriculas WHERE estudiante_id = ? LIMIT 1', [estudiante_id]);
    const es_nuevo = historial.length === 0;

    // 3. Generar número de matrícula
    const [per] = await conn.query('SELECT nombre FROM periodos_lectivos WHERE id = ?', [periodo_lectivo_id]);
    const yearPrefix = per[0]?.nombre.split('-')[0] || new Date().getFullYear();
    const [countRows] = await conn.query('SELECT COUNT(*) as count FROM matriculas WHERE periodo_lectivo_id = ?', [periodo_lectivo_id]);
    const nextNum = countRows[0].count + 1;
    const numero_matricula = `MAT-${yearPrefix}-${nextNum.toString().padStart(4, '0')}`;

    // 4. Calcular valor final
    let desc = parseFloat(valor_descuento || 0);
    let rec = parseFloat(valor_recargo || 0);
    let base = parseFloat(tarifa_base || 0);

    if (tipo_descuento === 'PORCENTAJE') desc = base * (desc / 100);
    if (tipo_recargo === 'PORCENTAJE') rec = base * (rec / 100);
    
    const valor_final = base - desc + rec;

    const [result] = await conn.query(`
      INSERT INTO matriculas (
        numero_matricula, estudiante_id, periodo_lectivo_id, oferta_academica_id, tipo_matricula_id,
        fecha_matricula, es_estudiante_nuevo, representante_principal_id, responsable_economico_id,
        tarifa_base, tipo_descuento, valor_descuento, tipo_recargo, valor_recargo, valor_final, saldo,
        estado, observacion, creado_por
      ) VALUES (?, ?, ?, ?, ?, CURDATE(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'BORRADOR', ?, ?)
    `, [
      numero_matricula, estudiante_id, periodo_lectivo_id, oferta_academica_id, tipo_matricula_id,
      es_nuevo, representante_principal_id || null, responsable_economico_id || null,
      base, tipo_descuento || null, valor_descuento || 0, tipo_recargo || null, valor_recargo || 0,
      valor_final, valor_final, observacion || null, usuario_id
    ]);

    await conn.commit();
    res.json({ success: true, message: 'Borrador de matrícula creado', id: result.insertId });
  } catch (error) {
    await conn.rollback();
    res.status(500).json({ success: false, message: error.message });
  } finally {
    conn.release();
  }
};

// --- UPDATE MATRICULA ---
exports.updateMatricula = async (req, res) => {
  const { id } = req.params;
  const { representante_principal_id, responsable_economico_id, observacion } = req.body;
  try {
    await pool.query(`
      UPDATE matriculas 
      SET representante_principal_id = ?, responsable_economico_id = ?, observacion = ?
      WHERE id = ?
    `, [representante_principal_id || null, responsable_economico_id || null, observacion || null, id]);
    res.json({ success: true, message: 'Matrícula actualizada' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- CONFIRMAR MATRICULA ---
exports.confirmarMatricula = async (req, res) => {
  const { id } = req.params;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [matriculaRows] = await conn.query('SELECT oferta_academica_id, estado FROM matriculas WHERE id = ? FOR UPDATE', [id]);
    if (matriculaRows.length === 0) throw new Error('Matrícula no encontrada');
    if (matriculaRows[0].estado === 'ACTIVA') throw new Error('La matrícula ya está confirmada');

    // Verificar cupo
    const oferta_id = matriculaRows[0].oferta_academica_id;
    const [ofertaRows] = await conn.query('SELECT cupo_maximo FROM oferta_academica WHERE id = ? FOR UPDATE', [oferta_id]);
    
    const [matriculadosRows] = await conn.query('SELECT COUNT(*) as ocupados FROM matriculas WHERE oferta_academica_id = ? AND estado IN ("ACTIVA", "PENDIENTE")', [oferta_id]);
    const ocupados = matriculadosRows[0].ocupados;
    const cupo = ofertaRows[0]?.cupo_maximo;

    if (cupo && ocupados >= cupo && !req.user?.es_admin) {
      throw new Error('No hay cupos disponibles en la oferta seleccionada');
    }

    // Confirmar
    await conn.query('UPDATE matriculas SET estado = "ACTIVA", confirmado_por = ?, confirmado_at = NOW() WHERE id = ?', [req.user?.id_usuario, id]);
    
    await conn.commit();
    res.json({ success: true, message: 'Matrícula confirmada y cupo ocupado' });
  } catch (error) {
    await conn.rollback();
    res.status(400).json({ success: false, message: error.message });
  } finally {
    conn.release();
  }
};

// --- ANULAR MATRICULA ---
exports.anularMatricula = async (req, res) => {
  const { id } = req.params;
  const { motivo } = req.body;
  try {
    await pool.query(`
      UPDATE matriculas 
      SET estado = 'ANULADA', motivo_anulacion = ?, anulado_por = ?, anulado_at = NOW() 
      WHERE id = ?
    `, [motivo, req.user?.id_usuario, id]);
    res.json({ success: true, message: 'Matrícula anulada' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- CAMBIAR OFERTA ---
exports.cambiarOferta = async (req, res) => {
  const { id } = req.params;
  const { oferta_nueva_id, motivo } = req.body;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [matriculaRows] = await conn.query('SELECT oferta_academica_id FROM matriculas WHERE id = ? FOR UPDATE', [id]);
    if (matriculaRows.length === 0) throw new Error('Matrícula no encontrada');
    const oferta_anterior_id = matriculaRows[0].oferta_academica_id;

    if (oferta_anterior_id == oferta_nueva_id) throw new Error('La oferta nueva es igual a la actual');

    // Verificar cupo en nueva
    const [ofertaRows] = await conn.query('SELECT cupo_maximo FROM oferta_academica WHERE id = ? FOR UPDATE', [oferta_nueva_id]);
    const [matriculadosRows] = await conn.query('SELECT COUNT(*) as ocupados FROM matriculas WHERE oferta_academica_id = ? AND estado IN ("ACTIVA", "PENDIENTE")', [oferta_nueva_id]);
    
    if (ofertaRows[0]?.cupo_maximo && matriculadosRows[0].ocupados >= ofertaRows[0].cupo_maximo && !req.user?.es_admin) {
      throw new Error('No hay cupos en la nueva oferta');
    }

    // Actualizar matrícula
    await conn.query('UPDATE matriculas SET oferta_academica_id = ? WHERE id = ?', [oferta_nueva_id, id]);
    
    // Registrar historial
    await conn.query(`
      INSERT INTO historial_matricula_oferta (matricula_id, oferta_anterior_id, oferta_nueva_id, motivo, usuario_id)
      VALUES (?, ?, ?, ?, ?)
    `, [id, oferta_anterior_id, oferta_nueva_id, motivo, req.user?.id_usuario]);

    await conn.commit();
    res.json({ success: true, message: 'Oferta académica cambiada' });
  } catch (error) {
    await conn.rollback();
    res.status(400).json({ success: false, message: error.message });
  } finally {
    conn.release();
  }
};

// --- PAGOS ---
exports.getPagosMatricula = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(`
      SELECT p.*, c.nombre as cuenta_nombre, u.nombre_completo as registrado_por
      FROM pagos_matricula p
      LEFT JOIN cuentas_financieras c ON p.cuenta_financiera_id = c.id
      LEFT JOIN usuarios u ON p.usuario_id = u.id_usuario
      WHERE p.matricula_id = ?
      ORDER BY p.fecha DESC, p.created_at DESC
    `, [id]);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.registrarPago = async (req, res) => {
  const { id } = req.params; // matricula_id
  const { fecha, valor, cuenta_financiera_id, numero_comprobante, observacion } = req.body;
  const usuario_id = req.user?.id_usuario;
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [mat] = await conn.query('SELECT * FROM matriculas WHERE id = ? FOR UPDATE', [id]);
    if (mat.length === 0) throw new Error('Matrícula no encontrada');
    const matricula = mat[0];

    const v = parseFloat(valor);
    if (v <= 0) throw new Error('El valor del pago debe ser mayor a 0');
    if (v > parseFloat(matricula.saldo) && !req.user?.es_admin) {
      throw new Error('El pago excede el saldo pendiente. Requiere autorización.');
    }

    // 1. Crear pago
    const [resultPago] = await conn.query(`
      INSERT INTO pagos_matricula (matricula_id, fecha, valor, cuenta_financiera_id, numero_comprobante, observacion, usuario_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [id, fecha, v, cuenta_financiera_id || null, numero_comprobante || null, observacion || null, usuario_id]);
    const pago_id = resultPago.insertId;

    // 2. Integrar con movimientos financieros (Crear INGRESO)
    // Se requiere un catalogo_movimiento_id para el concepto de matrícula. Buscamos uno o usamos uno genérico temporalmente si no existe.
    // Usaremos un concepto que sea tipo INGRESO, categoria 'MATRICULAS'. Si no existe lo asumo 1, o preferiblemente busco.
    const [conceptos] = await conn.query(`SELECT id FROM catalogo_movimientos WHERE tipo = 'INGRESO' AND nombre LIKE '%Matrícula%' LIMIT 1`);
    const concepto_id = conceptos.length > 0 ? conceptos[0].id : 1; 

    const descripcion_mov = `Pago de matrícula - ${matricula.numero_matricula}${observacion ? ' - ' + observacion : ''}`;
    
    const [resultMov] = await conn.query(`
      INSERT INTO movimientos_financieros 
      (fecha, descripcion, mes_aplicacion, valor, estado, numero_comprobante, periodo_lectivo_id, cuenta_financiera_id, catalogo_movimiento_id, usuario_id)
      VALUES (?, ?, NULL, ?, 'ACTIVO', ?, ?, ?, ?, ?)
    `, [fecha, descripcion_mov, v, numero_comprobante || null, matricula.periodo_lectivo_id, cuenta_financiera_id || null, concepto_id, usuario_id]);

    const mov_id = resultMov.insertId;

    // 3. Relacionar
    await conn.query('UPDATE pagos_matricula SET movimiento_financiero_id = ? WHERE id = ?', [mov_id, pago_id]);

    // 4. Actualizar Matrícula
    const nuevoPagado = parseFloat(matricula.total_pagado) + v;
    const nuevoSaldo = parseFloat(matricula.valor_final) - nuevoPagado;
    await conn.query(`UPDATE matriculas SET total_pagado = ?, saldo = ? WHERE id = ?`, [nuevoPagado, nuevoSaldo, id]);

    await conn.commit();
    res.json({ success: true, message: 'Pago registrado exitosamente' });
  } catch (error) {
    await conn.rollback();
    res.status(400).json({ success: false, message: error.message });
  } finally {
    conn.release();
  }
};

exports.anularPago = async (req, res) => {
  const { id, pagoId } = req.params;
  const { motivo } = req.body;
  const usuario_id = req.user?.id_usuario;
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [pagos] = await conn.query('SELECT * FROM pagos_matricula WHERE id = ? AND matricula_id = ? FOR UPDATE', [pagoId, id]);
    if (pagos.length === 0) throw new Error('Pago no encontrado');
    const pago = pagos[0];

    if (pago.estado === 'ANULADO') throw new Error('El pago ya está anulado');

    // Anular pago
    await conn.query(`
      UPDATE pagos_matricula SET estado = 'ANULADO', motivo_anulacion = ?, anulado_por = ?, anulado_at = NOW() 
      WHERE id = ?
    `, [motivo, usuario_id, pagoId]);

    // Revertir en matrícula
    await conn.query(`
      UPDATE matriculas 
      SET total_pagado = total_pagado - ?, saldo = saldo + ? 
      WHERE id = ?
    `, [pago.valor, pago.valor, id]);

    // Anular movimiento financiero
    if (pago.movimiento_financiero_id) {
      await conn.query(`
        UPDATE movimientos_financieros SET estado = 'ANULADO' WHERE id = ?
      `, [pago.movimiento_financiero_id]);
    }

    await conn.commit();
    res.json({ success: true, message: 'Pago anulado' });
  } catch (error) {
    await conn.rollback();
    res.status(400).json({ success: false, message: error.message });
  } finally {
    conn.release();
  }
};
