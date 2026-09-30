/**
 * ============================================================
 * Controller: Movimientos Financieros (Ingresos y Egresos)
 * CRUD + anulación + auditoría + exportación + saldos
 * ============================================================
 */
const pool = require('../config/db');
const path = require('path');
const fs = require('fs');

// ── Helpers ──────────────────────────────────────────────────

/** Registrar acción en auditoria_financiera */
const registrarAuditoria = async (conn, { usuario_id, entidad, entidad_id, accion, datos_anteriores, datos_nuevos, motivo, ip, user_agent }) => {
  await conn.query(
    `INSERT INTO auditoria_financiera (usuario_id, entidad, entidad_id, accion, datos_anteriores, datos_nuevos, motivo, ip, user_agent)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      usuario_id, entidad, entidad_id, accion,
      datos_anteriores ? JSON.stringify(datos_anteriores) : null,
      datos_nuevos ? JSON.stringify(datos_nuevos) : null,
      motivo || null,
      ip || null,
      user_agent ? String(user_agent).substring(0, 500) : null,
    ]
  );
};

/** Obtener IP del request */
const getClientIp = (req) => req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null;

// ═══════════════════════════════════════════════════════════════
// GET /api/finanzas/movimientos/resumen
// ═══════════════════════════════════════════════════════════════
const getResumen = async (req, res) => {
  try {
    const { periodo_id, fecha_desde, fecha_hasta, cuenta_id } = req.query;
    const conditions = ['mf.estado = ?'];
    const params = ['ACTIVO'];

    if (periodo_id) { conditions.push('mf.periodo_lectivo_id = ?'); params.push(parseInt(periodo_id)); }
    if (fecha_desde) { conditions.push('mf.fecha >= ?'); params.push(fecha_desde); }
    if (fecha_hasta) { conditions.push('mf.fecha <= ?'); params.push(fecha_hasta); }
    if (cuenta_id) { conditions.push('mf.cuenta_financiera_id = ?'); params.push(parseInt(cuenta_id)); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [totales] = await pool.query(`
      SELECT
        COALESCE(SUM(CASE WHEN cm.tipo = 'INGRESO' THEN mf.valor ELSE 0 END), 0) AS total_ingresos,
        COALESCE(SUM(CASE WHEN cm.tipo = 'EGRESO'  THEN mf.valor ELSE 0 END), 0) AS total_egresos
      FROM movimientos_financieros mf
      JOIN catalogo_movimientos cm ON cm.id = mf.catalogo_movimiento_id
      ${where}
    `, params);

    // Saldo general = saldo_inicial de cuentas activas + ingresos - egresos (todos activos, sin filtro de fecha)
    const [saldoGen] = await pool.query(`
      SELECT
        (SELECT COALESCE(SUM(saldo_inicial), 0) FROM cuentas_financieras WHERE activo = 1)
        + COALESCE(SUM(CASE WHEN cm.tipo = 'INGRESO' THEN mf.valor ELSE 0 END), 0)
        - COALESCE(SUM(CASE WHEN cm.tipo = 'EGRESO'  THEN mf.valor ELSE 0 END), 0)
        AS saldo_general
      FROM movimientos_financieros mf
      JOIN catalogo_movimientos cm ON cm.id = mf.catalogo_movimiento_id
      WHERE mf.estado = 'ACTIVO'
    `);

    const ingresos = parseFloat(totales[0].total_ingresos);
    const egresos = parseFloat(totales[0].total_egresos);

    res.json({
      success: true,
      data: {
        total_ingresos: ingresos,
        total_egresos: egresos,
        diferencia: ingresos - egresos,
        saldo_general: parseFloat(saldoGen[0].saldo_general),
      },
    });
  } catch (error) {
    console.error('Error en getResumen:', error);
    res.status(500).json({ success: false, message: 'Error al obtener el resumen.' });
  }
};

// ═══════════════════════════════════════════════════════════════
// GET /api/finanzas/movimientos
// ═══════════════════════════════════════════════════════════════
const getMovimientos = async (req, res) => {
  try {
    const {
      page = 1, limit = 20, search = '',
      periodo_id, fecha_desde, fecha_hasta, tipo, categoria, concepto_id,
      cuenta_id, mes_aplicacion, estado, usuario_id, personal_id,
      numero_comprobante, sort_by = 'fecha', sort_order = 'DESC',
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions = [];
    const params = [];

    if (search.trim()) {
      conditions.push('(mf.descripcion LIKE ? OR mf.numero_comprobante LIKE ? OR cm.codigo LIKE ? OR cm.nombre LIKE ?)');
      params.push(`%${search.trim()}%`, `%${search.trim()}%`, `%${search.trim()}%`, `%${search.trim()}%`);
    }
    if (periodo_id) { conditions.push('mf.periodo_lectivo_id = ?'); params.push(parseInt(periodo_id)); }
    if (fecha_desde) { conditions.push('mf.fecha >= ?'); params.push(fecha_desde); }
    if (fecha_hasta) { conditions.push('mf.fecha <= ?'); params.push(fecha_hasta); }
    if (tipo && ['INGRESO', 'EGRESO'].includes(tipo.toUpperCase())) { conditions.push('cm.tipo = ?'); params.push(tipo.toUpperCase()); }
    if (categoria) { conditions.push('cm.categoria = ?'); params.push(categoria); }
    if (concepto_id) { conditions.push('mf.catalogo_movimiento_id = ?'); params.push(parseInt(concepto_id)); }
    if (cuenta_id) { conditions.push('mf.cuenta_financiera_id = ?'); params.push(parseInt(cuenta_id)); }
    if (mes_aplicacion) { conditions.push('mf.mes_aplicacion = ?'); params.push(mes_aplicacion); }
    if (estado && ['ACTIVO', 'ANULADO'].includes(estado.toUpperCase())) { conditions.push('mf.estado = ?'); params.push(estado.toUpperCase()); }
    else { conditions.push('mf.estado = ?'); params.push('ACTIVO'); } // default solo activos
    if (usuario_id) { conditions.push('mf.usuario_id = ?'); params.push(parseInt(usuario_id)); }
    if (personal_id) { conditions.push('mf.personal_id = ?'); params.push(parseInt(personal_id)); }
    if (numero_comprobante) { conditions.push('mf.numero_comprobante LIKE ?'); params.push(`%${numero_comprobante.trim()}%`); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    // Validar sort
    const allowedSort = { fecha: 'mf.fecha', created_at: 'mf.created_at', valor: 'mf.valor', codigo: 'cm.codigo', concepto: 'cm.nombre', cuenta: 'cf.nombre', id: 'mf.id' };
    const safeSort = allowedSort[sort_by] || 'mf.fecha';
    const safeOrder = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Count
    const [countResult] = await pool.query(`
      SELECT COUNT(*) as total
      FROM movimientos_financieros mf
      JOIN catalogo_movimientos cm ON cm.id = mf.catalogo_movimiento_id
      JOIN cuentas_financieras cf ON cf.id = mf.cuenta_financiera_id
      ${where}
    `, params);
    const total = countResult[0].total;

    // Totales filtrados (solo activos)
    const activeConditions = [...conditions.filter(c => !c.includes('mf.estado'))];
    activeConditions.push("mf.estado = 'ACTIVO'");
    const activeParams = [...params.filter((_, i) => !conditions[i]?.includes('mf.estado'))];
    // Rebuild for totals - simpler approach
    const totalsConditions = conditions.map(c => c.includes("mf.estado = ?") ? "mf.estado = 'ACTIVO'" : c);
    const totalsParams = params.filter((_, i) => !conditions[i]?.includes('mf.estado'));
    const totalsWhere = totalsConditions.length ? `WHERE ${totalsConditions.join(' AND ')}` : '';

    const [totales] = await pool.query(`
      SELECT
        COALESCE(SUM(CASE WHEN cm.tipo = 'INGRESO' THEN mf.valor ELSE 0 END), 0) AS total_ingresos,
        COALESCE(SUM(CASE WHEN cm.tipo = 'EGRESO'  THEN mf.valor ELSE 0 END), 0) AS total_egresos
      FROM movimientos_financieros mf
      JOIN catalogo_movimientos cm ON cm.id = mf.catalogo_movimiento_id
      JOIN cuentas_financieras cf ON cf.id = mf.cuenta_financiera_id
      ${totalsWhere}
    `, totalsParams);

    // Saldo general
    const [saldoGen] = await pool.query(`
      SELECT
        (SELECT COALESCE(SUM(saldo_inicial), 0) FROM cuentas_financieras WHERE activo = 1)
        + COALESCE(SUM(CASE WHEN cm.tipo = 'INGRESO' THEN mf.valor ELSE 0 END), 0)
        - COALESCE(SUM(CASE WHEN cm.tipo = 'EGRESO'  THEN mf.valor ELSE 0 END), 0)
        AS saldo_general
      FROM movimientos_financieros mf
      JOIN catalogo_movimientos cm ON cm.id = mf.catalogo_movimiento_id
      WHERE mf.estado = 'ACTIVO'
    `);

    // Datos con saldo acumulado via window function
    const [rows] = await pool.query(`
      SELECT
        sub.*,
        (
          (SELECT COALESCE(SUM(saldo_inicial), 0) FROM cuentas_financieras WHERE activo = 1)
          + sub.saldo_running
        ) AS saldo_acumulado
      FROM (
        SELECT
          mf.id, mf.fecha, mf.descripcion, mf.mes_aplicacion, mf.valor,
          mf.estado, mf.numero_comprobante, mf.archivo_url, mf.created_at,
          mf.periodo_lectivo_id, mf.cuenta_financiera_id, mf.catalogo_movimiento_id,
          mf.usuario_id, mf.personal_id,
          cm.codigo, cm.nombre AS concepto, cm.tipo, cm.categoria,
          cf.nombre AS cuenta, cf.tipo AS tipo_cuenta,
          u.nombre_completo AS registrado_por,
          pl.nombre AS periodo,
          SUM(
            CASE
              WHEN mf2.estado = 'ACTIVO' AND cm2.tipo = 'INGRESO' THEN mf2.valor
              WHEN mf2.estado = 'ACTIVO' AND cm2.tipo = 'EGRESO'  THEN -mf2.valor
              ELSE 0
            END
          ) AS saldo_running
        FROM movimientos_financieros mf
        JOIN catalogo_movimientos cm ON cm.id = mf.catalogo_movimiento_id
        JOIN cuentas_financieras cf ON cf.id = mf.cuenta_financiera_id
        JOIN usuarios u ON u.id_usuario = mf.usuario_id
        JOIN periodos_lectivos pl ON pl.id = mf.periodo_lectivo_id
        LEFT JOIN movimientos_financieros mf2 ON (
          mf2.fecha < mf.fecha
          OR (mf2.fecha = mf.fecha AND mf2.created_at < mf.created_at)
          OR (mf2.fecha = mf.fecha AND mf2.created_at = mf.created_at AND mf2.id <= mf.id)
        )
        LEFT JOIN catalogo_movimientos cm2 ON cm2.id = mf2.catalogo_movimiento_id
        ${where}
        GROUP BY mf.id
        ORDER BY ${safeSort} ${safeOrder}, mf.created_at ${safeOrder}, mf.id ${safeOrder}
        LIMIT ? OFFSET ?
      ) sub
    `, [...params, parseInt(limit), offset]);

    const ingresos = parseFloat(totales[0].total_ingresos);
    const egresos = parseFloat(totales[0].total_egresos);

    res.json({
      success: true,
      data: rows,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
      totales: {
        total_ingresos: ingresos,
        total_egresos: egresos,
        diferencia: ingresos - egresos,
        saldo_general: parseFloat(saldoGen[0].saldo_general),
      },
    });
  } catch (error) {
    console.error('Error en getMovimientos:', error);
    res.status(500).json({ success: false, message: 'Error al obtener los movimientos.' });
  }
};

// ═══════════════════════════════════════════════════════════════
// GET /api/finanzas/movimientos/:id
// ═══════════════════════════════════════════════════════════════
const getMovimientoById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(`
      SELECT
        mf.*,
        cm.codigo, cm.nombre AS concepto, cm.tipo, cm.categoria,
        cm.requiere_mes, cm.requiere_personal,
        cf.nombre AS cuenta, cf.tipo AS tipo_cuenta,
        u.nombre_completo AS registrado_por,
        pl.nombre AS periodo,
        ua.nombre_completo AS anulado_por_nombre
      FROM movimientos_financieros mf
      JOIN catalogo_movimientos cm ON cm.id = mf.catalogo_movimiento_id
      JOIN cuentas_financieras cf ON cf.id = mf.cuenta_financiera_id
      JOIN usuarios u ON u.id_usuario = mf.usuario_id
      JOIN periodos_lectivos pl ON pl.id = mf.periodo_lectivo_id
      LEFT JOIN usuarios ua ON ua.id_usuario = mf.anulado_por
      WHERE mf.id = ?
    `, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Movimiento no encontrado.' });
    }

    // Historial de auditoría
    const [auditoria] = await pool.query(`
      SELECT af.*, u.nombre_completo AS usuario_nombre
      FROM auditoria_financiera af
      JOIN usuarios u ON u.id_usuario = af.usuario_id
      WHERE af.entidad = 'movimientos_financieros' AND af.entidad_id = ?
      ORDER BY af.created_at DESC
      LIMIT 20
    `, [id]);

    res.json({ success: true, data: rows[0], auditoria });
  } catch (error) {
    console.error('Error en getMovimientoById:', error);
    res.status(500).json({ success: false, message: 'Error al obtener el movimiento.' });
  }
};

// ═══════════════════════════════════════════════════════════════
// POST /api/finanzas/movimientos
// ═══════════════════════════════════════════════════════════════
const createMovimiento = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const { periodo_lectivo_id, fecha, catalogo_movimiento_id, descripcion, mes_aplicacion, valor, cuenta_financiera_id, personal_id, observacion, notas, numero_comprobante } = req.body;

    // ── Validaciones ──────────────────────────────────────────
    const errors = [];
    if (!periodo_lectivo_id) errors.push('El periodo lectivo es obligatorio.');
    if (!fecha) errors.push('La fecha es obligatoria.');
    if (!catalogo_movimiento_id) errors.push('El concepto es obligatorio.');
    if (!descripcion || !String(descripcion).trim()) errors.push('La descripción es obligatoria.');
    if (!valor && valor !== 0) errors.push('El valor es obligatorio.');
    if (!cuenta_financiera_id) errors.push('La cuenta financiera es obligatoria.');

    const valorNum = parseFloat(valor);
    if (isNaN(valorNum) || valorNum <= 0) errors.push('El valor debe ser mayor que cero.');
    if (!isNaN(valorNum)) {
      const parts = String(valor).split('.');
      if (parts[1] && parts[1].length > 2) errors.push('El valor debe tener máximo dos decimales.');
    }

    if (errors.length > 0) {
      await conn.rollback();
      conn.release();
      return res.status(400).json({ success: false, message: errors.join(' '), errors });
    }

    // Validar concepto existe y está activo
    const [conceptoRows] = await conn.query('SELECT * FROM catalogo_movimientos WHERE id = ?', [catalogo_movimiento_id]);
    if (conceptoRows.length === 0) { await conn.rollback(); conn.release(); return res.status(400).json({ success: false, message: 'Concepto no encontrado.' }); }
    const concepto = conceptoRows[0];
    if (!concepto.activo) { await conn.rollback(); conn.release(); return res.status(400).json({ success: false, message: 'El concepto seleccionado está inactivo.' }); }

    // Validar mes si requerido
    if (concepto.requiere_mes && !mes_aplicacion) {
      await conn.rollback(); conn.release();
      return res.status(400).json({ success: false, message: 'El mes de aplicación es obligatorio para este concepto.' });
    }

    // Validar personal si requerido (SPDOCE bloquea)
    if (concepto.requiere_personal && concepto.codigo === 'SPDOCE' && !personal_id) {
      await conn.rollback(); conn.release();
      return res.status(400).json({ success: false, message: 'El concepto SPDOCE requiere seleccionar personal. Este módulo aún no está disponible.' });
    }

    // Validar cuenta activa
    const [cuentaRows] = await conn.query('SELECT * FROM cuentas_financieras WHERE id = ?', [cuenta_financiera_id]);
    if (cuentaRows.length === 0) { await conn.rollback(); conn.release(); return res.status(400).json({ success: false, message: 'Cuenta financiera no encontrada.' }); }
    if (!cuentaRows[0].activo) { await conn.rollback(); conn.release(); return res.status(400).json({ success: false, message: 'La cuenta financiera está inactiva.' }); }

    // Validar periodo
    const [periodoRows] = await conn.query('SELECT * FROM periodos_lectivos WHERE id = ?', [periodo_lectivo_id]);
    if (periodoRows.length === 0) { await conn.rollback(); conn.release(); return res.status(400).json({ success: false, message: 'Periodo lectivo no encontrado.' }); }

    // Validar fecha
    const fechaValida = new Date(fecha);
    if (isNaN(fechaValida.getTime())) { await conn.rollback(); conn.release(); return res.status(400).json({ success: false, message: 'La fecha no es válida.' }); }

    // ── Verificar posible duplicado (advertencia) ─────────────
    const [dupes] = await conn.query(`
      SELECT id FROM movimientos_financieros
      WHERE fecha = ? AND catalogo_movimiento_id = ? AND valor = ? AND cuenta_financiera_id = ?
        AND descripcion = ? AND estado = 'ACTIVO'
        AND created_at > DATE_SUB(NOW(), INTERVAL 60 SECOND)
    `, [fecha, catalogo_movimiento_id, valorNum, cuenta_financiera_id, String(descripcion).trim()]);

    // Archivo
    const archivoUrl = req.file ? `/uploads/financiero/${req.file.filename}` : null;

    // ── Insertar ──────────────────────────────────────────────
    const [result] = await conn.query(`
      INSERT INTO movimientos_financieros
        (periodo_lectivo_id, fecha, catalogo_movimiento_id, descripcion, mes_aplicacion,
         valor, cuenta_financiera_id, personal_id, observacion, notas, numero_comprobante,
         archivo_url, estado, usuario_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVO', ?)
    `, [
      periodo_lectivo_id, fecha, catalogo_movimiento_id,
      String(descripcion).trim(),
      mes_aplicacion || null,
      valorNum,
      cuenta_financiera_id,
      personal_id || null,
      observacion ? String(observacion).trim() : null,
      notas ? String(notas).trim() : null,
      numero_comprobante ? String(numero_comprobante).trim() : null,
      archivoUrl,
      req.usuario.id,
    ]);

    // ── Auditoría ─────────────────────────────────────────────
    await registrarAuditoria(conn, {
      usuario_id: req.usuario.id,
      entidad: 'movimientos_financieros',
      entidad_id: result.insertId,
      accion: 'CREAR',
      datos_anteriores: null,
      datos_nuevos: { periodo_lectivo_id, fecha, catalogo_movimiento_id, descripcion: String(descripcion).trim(), valor: valorNum, cuenta_financiera_id, tipo: concepto.tipo },
      motivo: null,
      ip: getClientIp(req),
      user_agent: req.headers['user-agent'],
    });

    await conn.commit();
    conn.release();

    // Obtener registro completo
    const [newRow] = await pool.query(`
      SELECT mf.*, cm.codigo, cm.nombre AS concepto, cm.tipo, cf.nombre AS cuenta
      FROM movimientos_financieros mf
      JOIN catalogo_movimientos cm ON cm.id = mf.catalogo_movimiento_id
      JOIN cuentas_financieras cf ON cf.id = mf.cuenta_financiera_id
      WHERE mf.id = ?
    `, [result.insertId]);

    res.status(201).json({
      success: true,
      message: `${concepto.tipo === 'INGRESO' ? 'Ingreso' : 'Egreso'} registrado exitosamente.`,
      data: newRow[0],
      advertencia_duplicado: dupes.length > 0 ? 'Se detectó un registro similar reciente. Verifique que no sea un duplicado.' : null,
    });
  } catch (error) {
    await conn.rollback();
    conn.release();
    console.error('Error en createMovimiento:', error);
    res.status(500).json({ success: false, message: 'Error al registrar el movimiento.' });
  }
};

// ═══════════════════════════════════════════════════════════════
// PUT /api/finanzas/movimientos/:id
// ═══════════════════════════════════════════════════════════════
const updateMovimiento = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { id } = req.params;
    const { periodo_lectivo_id, fecha, catalogo_movimiento_id, descripcion, mes_aplicacion, valor, cuenta_financiera_id, personal_id, observacion, notas, numero_comprobante, motivo_edicion } = req.body;

    // Verificar existencia
    const [existing] = await conn.query('SELECT * FROM movimientos_financieros WHERE id = ?', [id]);
    if (existing.length === 0) { await conn.rollback(); conn.release(); return res.status(404).json({ success: false, message: 'Movimiento no encontrado.' }); }
    const original = existing[0];

    if (original.estado === 'ANULADO') { await conn.rollback(); conn.release(); return res.status(400).json({ success: false, message: 'No se puede editar un movimiento anulado.' }); }

    // Validaciones
    const errors = [];
    if (!periodo_lectivo_id) errors.push('El periodo lectivo es obligatorio.');
    if (!fecha) errors.push('La fecha es obligatoria.');
    if (!catalogo_movimiento_id) errors.push('El concepto es obligatorio.');
    if (!descripcion || !String(descripcion).trim()) errors.push('La descripción es obligatoria.');
    if (!valor && valor !== 0) errors.push('El valor es obligatorio.');
    if (!cuenta_financiera_id) errors.push('La cuenta financiera es obligatoria.');

    const valorNum = parseFloat(valor);
    if (isNaN(valorNum) || valorNum <= 0) errors.push('El valor debe ser mayor que cero.');

    if (errors.length > 0) { await conn.rollback(); conn.release(); return res.status(400).json({ success: false, message: errors.join(' '), errors }); }

    // Validar concepto
    const [conceptoRows] = await conn.query('SELECT * FROM catalogo_movimientos WHERE id = ?', [catalogo_movimiento_id]);
    if (conceptoRows.length === 0) { await conn.rollback(); conn.release(); return res.status(400).json({ success: false, message: 'Concepto no encontrado.' }); }
    const concepto = conceptoRows[0];

    if (concepto.requiere_mes && !mes_aplicacion) { await conn.rollback(); conn.release(); return res.status(400).json({ success: false, message: 'El mes de aplicación es obligatorio para este concepto.' }); }
    if (concepto.requiere_personal && concepto.codigo === 'SPDOCE' && !personal_id) { await conn.rollback(); conn.release(); return res.status(400).json({ success: false, message: 'El concepto SPDOCE requiere seleccionar personal.' }); }

    // Validar cuenta activa
    const [cuentaRows] = await conn.query('SELECT * FROM cuentas_financieras WHERE id = ? AND activo = 1', [cuenta_financiera_id]);
    if (cuentaRows.length === 0) { await conn.rollback(); conn.release(); return res.status(400).json({ success: false, message: 'Cuenta financiera no encontrada o inactiva.' }); }

    // Validar periodo
    const [periodoRows] = await conn.query('SELECT * FROM periodos_lectivos WHERE id = ?', [periodo_lectivo_id]);
    if (periodoRows.length === 0) { await conn.rollback(); conn.release(); return res.status(400).json({ success: false, message: 'Periodo lectivo no encontrado.' }); }

    // Archivo
    let archivoUrl = original.archivo_url;
    if (req.file) {
      archivoUrl = `/uploads/financiero/${req.file.filename}`;
    }

    // Datos anteriores para auditoría
    const datosAnteriores = {
      periodo_lectivo_id: original.periodo_lectivo_id, fecha: original.fecha,
      catalogo_movimiento_id: original.catalogo_movimiento_id, descripcion: original.descripcion,
      valor: parseFloat(original.valor), cuenta_financiera_id: original.cuenta_financiera_id,
      mes_aplicacion: original.mes_aplicacion, observacion: original.observacion,
    };

    // Actualizar
    await conn.query(`
      UPDATE movimientos_financieros SET
        periodo_lectivo_id = ?, fecha = ?, catalogo_movimiento_id = ?, descripcion = ?,
        mes_aplicacion = ?, valor = ?, cuenta_financiera_id = ?, personal_id = ?,
        observacion = ?, notas = ?, numero_comprobante = ?, archivo_url = ?
      WHERE id = ?
    `, [
      periodo_lectivo_id, fecha, catalogo_movimiento_id,
      String(descripcion).trim(), mes_aplicacion || null, valorNum,
      cuenta_financiera_id, personal_id || null,
      observacion ? String(observacion).trim() : null,
      notas ? String(notas).trim() : null,
      numero_comprobante ? String(numero_comprobante).trim() : null,
      archivoUrl, id,
    ]);

    const datosNuevos = {
      periodo_lectivo_id, fecha, catalogo_movimiento_id, descripcion: String(descripcion).trim(),
      valor: valorNum, cuenta_financiera_id, tipo: concepto.tipo,
    };

    await registrarAuditoria(conn, {
      usuario_id: req.usuario.id,
      entidad: 'movimientos_financieros',
      entidad_id: parseInt(id),
      accion: 'EDITAR',
      datos_anteriores: datosAnteriores,
      datos_nuevos: datosNuevos,
      motivo: motivo_edicion || null,
      ip: getClientIp(req),
      user_agent: req.headers['user-agent'],
    });

    await conn.commit();
    conn.release();

    res.json({ success: true, message: 'Movimiento actualizado exitosamente.' });
  } catch (error) {
    await conn.rollback();
    conn.release();
    console.error('Error en updateMovimiento:', error);
    res.status(500).json({ success: false, message: 'Error al actualizar el movimiento.' });
  }
};

// ═══════════════════════════════════════════════════════════════
// PATCH /api/finanzas/movimientos/:id/anular
// ═══════════════════════════════════════════════════════════════
const anularMovimiento = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { id } = req.params;
    const { motivo } = req.body;

    if (!motivo || !String(motivo).trim()) {
      await conn.rollback(); conn.release();
      return res.status(400).json({ success: false, message: 'El motivo de anulación es obligatorio.' });
    }

    const [existing] = await conn.query('SELECT * FROM movimientos_financieros WHERE id = ?', [id]);
    if (existing.length === 0) { await conn.rollback(); conn.release(); return res.status(404).json({ success: false, message: 'Movimiento no encontrado.' }); }
    if (existing[0].estado === 'ANULADO') { await conn.rollback(); conn.release(); return res.status(400).json({ success: false, message: 'El movimiento ya está anulado.' }); }

    await conn.query(`
      UPDATE movimientos_financieros SET estado = 'ANULADO', motivo_anulacion = ?, anulado_por = ?, anulado_at = NOW()
      WHERE id = ?
    `, [String(motivo).trim(), req.usuario.id, id]);

    await registrarAuditoria(conn, {
      usuario_id: req.usuario.id,
      entidad: 'movimientos_financieros',
      entidad_id: parseInt(id),
      accion: 'ANULAR',
      datos_anteriores: { estado: 'ACTIVO', valor: parseFloat(existing[0].valor) },
      datos_nuevos: { estado: 'ANULADO' },
      motivo: String(motivo).trim(),
      ip: getClientIp(req),
      user_agent: req.headers['user-agent'],
    });

    await conn.commit();
    conn.release();
    res.json({ success: true, message: 'Movimiento anulado exitosamente.' });
  } catch (error) {
    await conn.rollback();
    conn.release();
    console.error('Error en anularMovimiento:', error);
    res.status(500).json({ success: false, message: 'Error al anular el movimiento.' });
  }
};

// ═══════════════════════════════════════════════════════════════
// GET /api/finanzas/movimientos/:id/archivo
// ═══════════════════════════════════════════════════════════════
const descargarArchivo = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query('SELECT archivo_url FROM movimientos_financieros WHERE id = ?', [id]);
    if (rows.length === 0 || !rows[0].archivo_url) {
      return res.status(404).json({ success: false, message: 'Archivo no encontrado.' });
    }

    const filePath = path.join(__dirname, '..', rows[0].archivo_url);

    // Protección contra path traversal
    const normalizedPath = path.normalize(filePath);
    const uploadsDir = path.normalize(path.join(__dirname, '..', 'uploads'));
    if (!normalizedPath.startsWith(uploadsDir)) {
      return res.status(403).json({ success: false, message: 'Acceso denegado.' });
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'El archivo ya no existe en el servidor.' });
    }

    res.download(filePath);
  } catch (error) {
    console.error('Error en descargarArchivo:', error);
    res.status(500).json({ success: false, message: 'Error al descargar el archivo.' });
  }
};

// ═══════════════════════════════════════════════════════════════
// GET /api/finanzas/movimientos/exportar/excel
// ═══════════════════════════════════════════════════════════════
const exportarExcel = async (req, res) => {
  try {
    const ExcelJS = require('exceljs');
    const { periodo_id, fecha_desde, fecha_hasta, tipo, categoria, concepto_id, cuenta_id, estado, incluir_anulados } = req.query;

    const conditions = [];
    const params = [];

    if (!incluir_anulados || incluir_anulados !== 'true') { conditions.push("mf.estado = 'ACTIVO'"); }
    if (periodo_id) { conditions.push('mf.periodo_lectivo_id = ?'); params.push(parseInt(periodo_id)); }
    if (fecha_desde) { conditions.push('mf.fecha >= ?'); params.push(fecha_desde); }
    if (fecha_hasta) { conditions.push('mf.fecha <= ?'); params.push(fecha_hasta); }
    if (tipo) { conditions.push('cm.tipo = ?'); params.push(tipo.toUpperCase()); }
    if (categoria) { conditions.push('cm.categoria = ?'); params.push(categoria); }
    if (concepto_id) { conditions.push('mf.catalogo_movimiento_id = ?'); params.push(parseInt(concepto_id)); }
    if (cuenta_id) { conditions.push('mf.cuenta_financiera_id = ?'); params.push(parseInt(cuenta_id)); }
    if (estado) { conditions.push('mf.estado = ?'); params.push(estado.toUpperCase()); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [rows] = await pool.query(`
      SELECT mf.fecha, cm.codigo, cm.nombre AS concepto, mf.descripcion,
             mf.mes_aplicacion, cf.nombre AS cuenta, cm.tipo, mf.valor,
             mf.estado, u.nombre_completo AS registrado_por,
             mf.observacion, mf.numero_comprobante
      FROM movimientos_financieros mf
      JOIN catalogo_movimientos cm ON cm.id = mf.catalogo_movimiento_id
      JOIN cuentas_financieras cf ON cf.id = mf.cuenta_financiera_id
      JOIN usuarios u ON u.id_usuario = mf.usuario_id
      ${where}
      ORDER BY mf.fecha ASC, mf.created_at ASC, mf.id ASC
    `, params);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'SIGCOP-KPI';
    const sheet = workbook.addWorksheet('Ingresos y Egresos');

    // Header
    sheet.addRow(['UNIDAD EDUCATIVA JUAN LEÓN MERA']);
    sheet.addRow(['Reporte de Ingresos y Egresos']);
    sheet.addRow([`Generado: ${new Date().toLocaleString('es-EC', { timeZone: 'America/Guayaquil' })}`]);
    sheet.addRow([]);

    // Columnas
    sheet.addRow(['Fecha', 'Código', 'Concepto', 'Descripción', 'Mes', 'Cuenta', 'Ingreso', 'Egreso', 'Estado', 'Registrado por', 'Observación', 'Comprobante']);
    const headerRow = sheet.getRow(5);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF27A9E1' } };

    let totalIngresos = 0;
    let totalEgresos = 0;

    rows.forEach(r => {
      const ingreso = r.tipo === 'INGRESO' ? parseFloat(r.valor) : 0;
      const egreso = r.tipo === 'EGRESO' ? parseFloat(r.valor) : 0;
      totalIngresos += ingreso;
      totalEgresos += egreso;

      const mesStr = r.mes_aplicacion ? new Date(r.mes_aplicacion).toLocaleDateString('es-EC', { month: 'long', year: 'numeric', timeZone: 'America/Guayaquil' }) : '';
      const fechaStr = new Date(r.fecha).toLocaleDateString('es-EC', { timeZone: 'America/Guayaquil' });

      sheet.addRow([fechaStr, r.codigo, r.concepto, r.descripcion, mesStr, r.cuenta, ingreso || '', egreso || '', r.estado, r.registrado_por, r.observacion || '', r.numero_comprobante || '']);
    });

    // Totales
    sheet.addRow([]);
    sheet.addRow(['', '', '', '', '', 'TOTAL INGRESOS:', totalIngresos, '', '', '', '', '']);
    sheet.addRow(['', '', '', '', '', 'TOTAL EGRESOS:', '', totalEgresos, '', '', '', '']);
    sheet.addRow(['', '', '', '', '', 'DIFERENCIA:', totalIngresos - totalEgresos, '', '', '', '', '']);

    // Anchos
    sheet.columns.forEach((col, i) => {
      const widths = [12, 10, 30, 35, 15, 15, 14, 14, 10, 20, 25, 15];
      col.width = widths[i] || 15;
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=ingresos_egresos_${Date.now()}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error en exportarExcel:', error);
    res.status(500).json({ success: false, message: 'Error al exportar a Excel.' });
  }
};

// ═══════════════════════════════════════════════════════════════
// GET /api/finanzas/movimientos/exportar/pdf
// ═══════════════════════════════════════════════════════════════
const exportarPDF = async (req, res) => {
  try {
    const PDFDocument = require('pdfkit');
    const { periodo_id, fecha_desde, fecha_hasta, tipo, incluir_anulados } = req.query;

    const conditions = [];
    const params = [];

    if (!incluir_anulados || incluir_anulados !== 'true') { conditions.push("mf.estado = 'ACTIVO'"); }
    if (periodo_id) { conditions.push('mf.periodo_lectivo_id = ?'); params.push(parseInt(periodo_id)); }
    if (fecha_desde) { conditions.push('mf.fecha >= ?'); params.push(fecha_desde); }
    if (fecha_hasta) { conditions.push('mf.fecha <= ?'); params.push(fecha_hasta); }
    if (tipo) { conditions.push('cm.tipo = ?'); params.push(tipo.toUpperCase()); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [rows] = await pool.query(`
      SELECT mf.fecha, cm.codigo, cm.nombre AS concepto, mf.descripcion,
             cf.nombre AS cuenta, cm.tipo, mf.valor, mf.estado
      FROM movimientos_financieros mf
      JOIN catalogo_movimientos cm ON cm.id = mf.catalogo_movimiento_id
      JOIN cuentas_financieras cf ON cf.id = mf.cuenta_financiera_id
      ${where}
      ORDER BY mf.fecha ASC, mf.created_at ASC, mf.id ASC
    `, params);

    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 30 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=reporte_IE_${Date.now()}.pdf`);
    doc.pipe(res);

    // Header
    doc.fontSize(16).font('Helvetica-Bold').text('UNIDAD EDUCATIVA JUAN LEÓN MERA', { align: 'center' });
    doc.fontSize(12).text('Reporte de Ingresos y Egresos', { align: 'center' });
    doc.fontSize(9).font('Helvetica').text(`Generado: ${new Date().toLocaleString('es-EC', { timeZone: 'America/Guayaquil' })} | Por: ${req.usuario.correo || 'Usuario'}`, { align: 'center' });
    if (fecha_desde || fecha_hasta) {
      doc.text(`Periodo: ${fecha_desde || '—'} a ${fecha_hasta || '—'}`, { align: 'center' });
    }
    doc.moveDown(1);

    // Table header
    const cols = [30, 90, 150, 310, 460, 560, 640, 720];
    const colLabels = ['Fecha', 'Código', 'Concepto', 'Descripción', 'Cuenta', 'Ingreso', 'Egreso', 'Estado'];
    const y0 = doc.y;
    doc.rect(25, y0 - 3, 790, 18).fill('#27A9E1');
    doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold');
    colLabels.forEach((label, i) => doc.text(label, cols[i], y0, { width: (cols[i + 1] || 810) - cols[i] - 5 }));
    doc.fillColor('#000000').font('Helvetica').fontSize(7);
    doc.moveDown(0.5);

    let totalI = 0, totalE = 0;
    let lineY = doc.y + 5;

    rows.forEach((r, idx) => {
      if (lineY > 540) {
        doc.addPage();
        lineY = 40;
      }
      const ingreso = r.tipo === 'INGRESO' ? parseFloat(r.valor) : 0;
      const egreso = r.tipo === 'EGRESO' ? parseFloat(r.valor) : 0;
      totalI += ingreso;
      totalE += egreso;

      if (idx % 2 === 0) doc.rect(25, lineY - 2, 790, 14).fill('#f8fafc').fillColor('#000000');
      else doc.fillColor('#000000');

      const fechaStr = new Date(r.fecha).toLocaleDateString('es-EC', { timeZone: 'America/Guayaquil' });
      doc.text(fechaStr, cols[0], lineY, { width: 55 });
      doc.text(r.codigo, cols[1], lineY, { width: 55 });
      doc.text(r.concepto.substring(0, 30), cols[2], lineY, { width: 155 });
      doc.text(r.descripcion.substring(0, 30), cols[3], lineY, { width: 145 });
      doc.text(r.cuenta, cols[4], lineY, { width: 95 });
      doc.text(ingreso ? `$${ingreso.toFixed(2)}` : '', cols[5], lineY, { width: 75 });
      doc.text(egreso ? `$${egreso.toFixed(2)}` : '', cols[6], lineY, { width: 75 });
      doc.text(r.estado, cols[7], lineY, { width: 60 });
      lineY += 14;
    });

    // Totales
    lineY += 10;
    doc.fontSize(9).font('Helvetica-Bold');
    doc.text(`Total Ingresos: $${totalI.toFixed(2)}`, 460, lineY);
    doc.text(`Total Egresos: $${totalE.toFixed(2)}`, 460, lineY + 14);
    doc.text(`Diferencia: $${(totalI - totalE).toFixed(2)}`, 460, lineY + 28);

    doc.end();
  } catch (error) {
    console.error('Error en exportarPDF:', error);
    res.status(500).json({ success: false, message: 'Error al exportar a PDF.' });
  }
};

// ═══════════════════════════════════════════════════════════════
// Auxiliar: periodos y datos para formulario
// ═══════════════════════════════════════════════════════════════
const getDatosFormulario = async (req, res) => {
  try {
    const [periodos] = await pool.query('SELECT id, nombre, activo FROM periodos_lectivos ORDER BY id DESC');
    const [conceptos] = await pool.query('SELECT id, codigo, nombre, tipo, categoria, requiere_mes, requiere_personal FROM catalogo_movimientos WHERE activo = 1 ORDER BY orden, nombre');
    const [cuentas] = await pool.query('SELECT id, nombre, tipo FROM cuentas_financieras WHERE activo = 1 ORDER BY orden, nombre');
    const [usuarios] = await pool.query("SELECT id_usuario, nombre_completo FROM usuarios WHERE estado = 'Activo' ORDER BY nombre_completo");

    res.json({ success: true, data: { periodos, conceptos, cuentas, usuarios } });
  } catch (error) {
    console.error('Error en getDatosFormulario:', error);
    res.status(500).json({ success: false, message: 'Error al obtener datos del formulario.' });
  }
};

module.exports = {
  getResumen,
  getMovimientos,
  getMovimientoById,
  createMovimiento,
  updateMovimiento,
  anularMovimiento,
  descargarArchivo,
  exportarExcel,
  exportarPDF,
  getDatosFormulario,
};
