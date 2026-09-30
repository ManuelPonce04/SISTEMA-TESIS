/**
 * ============================================================
 * Controller: Sueldos y Anticipos
 * ============================================================
 */
const pool = require('../config/db');
const sueldosService = require('../services/sueldosService');

// ═══════════════════════════════════════════════════════════════
// GET /api/finanzas/sueldos-anticipos
// ═══════════════════════════════════════════════════════════════
const getResumenMensual = async (req, res) => {
  try {
    const {
      periodo_id, mes,
      page = 1, limit = 20, search = '',
      tipo_contrato_id, funcion_id, cargo_id, estado_personal,
      con_anticipos, saldo_excedido
    } = req.query;

    if (!periodo_id || !mes) return res.status(400).json({ success: false, message: 'Faltan parámetros obligatorios (periodo y mes).' });

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions = [];
    const params = [];

    if (search.trim()) {
      conditions.push('(p.codigo_interno LIKE ? OR p.nombre_completo LIKE ? OR p.cedula LIKE ?)');
      params.push(`%${search.trim()}%`, `%${search.trim()}%`, `%${search.trim()}%`);
    }
    if (estado_personal) { conditions.push('p.estado = ?'); params.push(estado_personal.toUpperCase()); }
    if (tipo_contrato_id) { conditions.push('p.tipo_contrato_id = ?'); params.push(parseInt(tipo_contrato_id)); }
    if (funcion_id) { conditions.push('p.funcion_id = ?'); params.push(parseInt(funcion_id)); }
    if (cargo_id) { conditions.push('p.cargo_id = ?'); params.push(parseInt(cargo_id)); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    // Total de personal que coincide con los filtros básicos
    const [countResult] = await pool.query(`SELECT COUNT(*) as total FROM personal p ${where}`, params);
    const totalPersonal = countResult[0].total;

    // Obtener personal paginado
    const [personalRows] = await pool.query(`
      SELECT 
        p.id, p.codigo_interno, p.cedula, p.nombre_completo, p.estado,
        tc.nombre AS contrato_nombre, c.nombre AS cargo_nombre
      FROM personal p
      LEFT JOIN tipos_contrato tc ON tc.id = p.tipo_contrato_id
      LEFT JOIN cargos_personal c ON c.id = p.cargo_id
      ${where}
      ORDER BY p.apellidos ASC
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), offset]);

    // Procesar cada trabajador para adjuntar los datos del mes
    const data = [];
    let sumTotalSueldos = 0;
    let sumTotalAnticipos = 0;
    let sumTotalNeto = 0;
    let cantConAnticipos = 0;
    let cantSinSueldo = 0;
    let cantExcedidos = 0;

    for (const p of personalRows) {
      const sueldoBase = await sueldosService.getSueldoBaseMensual(p.id, mes);
      const ajustes = await sueldosService.getAjustesMensuales(p.id, periodo_id, mes);
      const totalAnticipos = await sueldosService.getTotalAnticipos(p.id, periodo_id, mes);
      
      const totalIngresos = sueldoBase + ajustes.horas_extras + ajustes.otros_ingresos;
      const totalDeducciones = totalAnticipos + ajustes.otras_deducciones;
      const netoEstimado = totalIngresos - totalDeducciones;

      // Filtros post-cálculo (si se piden en query)
      if (con_anticipos === 'true' && totalAnticipos <= 0) continue;
      if (con_anticipos === 'false' && totalAnticipos > 0) continue;
      
      // Chequeo de excedidos
      const [excedidosRows] = await pool.query(`
        SELECT COUNT(*) as c FROM autorizaciones_anticipos 
        WHERE personal_id = ? AND periodo_lectivo_id = ? AND mes = ?
      `, [p.id, periodo_id, mes]);
      
      const isExcedido = excedidosRows[0].c > 0;
      if (saldo_excedido === 'true' && !isExcedido) continue;

      if (sueldoBase <= 0) cantSinSueldo++;
      if (totalAnticipos > 0) cantConAnticipos++;
      if (isExcedido) cantExcedidos++;

      sumTotalSueldos += sueldoBase;
      sumTotalAnticipos += totalAnticipos;
      sumTotalNeto += netoEstimado;

      data.push({
        ...p,
        sueldo_base: sueldoBase,
        ajustes,
        total_anticipos: totalAnticipos,
        neto_estimado: netoEstimado,
        tiene_excedente: isExcedido
      });
    }

    res.json({
      success: true,
      data,
      pagination: { total: totalPersonal, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(totalPersonal / parseInt(limit)) },
      resumen: {
        total_sueldos: sumTotalSueldos,
        total_anticipos: sumTotalAnticipos,
        neto_estimado: sumTotalNeto,
        trabajadores_con_anticipos: cantConAnticipos,
        trabajadores_sin_sueldo: cantSinSueldo,
        anticipos_excedidos: cantExcedidos
      }
    });

  } catch (error) {
    console.error('Error en getResumenMensual:', error);
    res.status(500).json({ success: false, message: 'Error al obtener resumen de sueldos.' });
  }
};

// ═══════════════════════════════════════════════════════════════
// GET /api/finanzas/sueldos-anticipos/:personalId
// ═══════════════════════════════════════════════════════════════
const getDetalleTrabajador = async (req, res) => {
  try {
    const { personalId } = req.params;
    const { periodo_id, mes } = req.query;

    if (!periodo_id || !mes) return res.status(400).json({ success: false, message: 'Faltan parámetros obligatorios.' });

    // Datos del trabajador
    const [pRows] = await pool.query(`
      SELECT p.id, p.codigo_interno, p.cedula, p.nombre_completo, p.nombre_corto, p.estado,
             tc.nombre AS contrato_nombre, c.nombre AS cargo_nombre, f.nombre AS funcion_nombre
      FROM personal p
      LEFT JOIN tipos_contrato tc ON tc.id = p.tipo_contrato_id
      LEFT JOIN cargos_personal c ON c.id = p.cargo_id
      LEFT JOIN funciones_personal f ON f.id = p.funcion_id
      WHERE p.id = ?
    `, [personalId]);

    if (pRows.length === 0) return res.status(404).json({ success: false, message: 'Personal no encontrado.' });

    const sueldoBase = await sueldosService.getSueldoBaseMensual(personalId, mes);
    const ajustes = await sueldosService.getAjustesMensuales(personalId, periodo_id, mes);
    const totalAnticipos = await sueldosService.getTotalAnticipos(personalId, periodo_id, mes);
    const anticipos = await sueldosService.getListaAnticiposMes(personalId, periodo_id, mes);

    const totalIngresos = sueldoBase + ajustes.horas_extras + ajustes.otros_ingresos;
    const totalDeducciones = totalAnticipos + ajustes.otras_deducciones;
    const netoEstimado = totalIngresos - totalDeducciones;
    const saldoDisponible = totalIngresos - totalDeducciones;

    res.json({
      success: true,
      data: {
        personal: pRows[0],
        sueldo_base: sueldoBase,
        ajustes,
        totales: {
          ingresos: totalIngresos,
          anticipos: totalAnticipos,
          deducciones: totalDeducciones,
          neto_estimado: netoEstimado,
          saldo_disponible: saldoDisponible
        },
        anticipos
      }
    });

  } catch (error) {
    console.error('Error en getDetalleTrabajador:', error);
    res.status(500).json({ success: false, message: 'Error al obtener detalle del trabajador.' });
  }
};

// ═══════════════════════════════════════════════════════════════
// PUT /api/finanzas/sueldos-anticipos/:personalId/ajustes
// ═══════════════════════════════════════════════════════════════
const upsertAjustesMensuales = async (req, res) => {
  try {
    const { personalId } = req.params;
    const { periodo_lectivo_id, mes, horas_extras = 0, otros_ingresos = 0, otras_deducciones = 0, observacion = '' } = req.body;

    await pool.query(`
      INSERT INTO ajustes_mensuales_personal (
        periodo_lectivo_id, mes, personal_id, horas_extras, otros_ingresos, otras_deducciones, observacion, creado_por
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE 
        horas_extras = VALUES(horas_extras),
        otros_ingresos = VALUES(otros_ingresos),
        otras_deducciones = VALUES(otras_deducciones),
        observacion = VALUES(observacion),
        actualizado_por = VALUES(creado_por)
    `, [periodo_lectivo_id, mes, personalId, horas_extras, otros_ingresos, otras_deducciones, observacion, req.usuario.id]);

    res.json({ success: true, message: 'Ajustes guardados correctamente.' });
  } catch (error) {
    console.error('Error en upsertAjustesMensuales:', error);
    res.status(500).json({ success: false, message: 'Error al guardar los ajustes.' });
  }
};

// ═══════════════════════════════════════════════════════════════
// POST /api/finanzas/sueldos-anticipos/:personalId/anticipo
// ═══════════════════════════════════════════════════════════════
const registrarAnticipo = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const { personalId } = req.params;
    const { 
      periodo_lectivo_id, mes_aplicacion, fecha, catalogo_movimiento_id, 
      descripcion, valor, cuenta_financiera_id, numero_comprobante, observacion, 
      justificacion_exceso // Si viene, significa que es exceso
    } = req.body;

    const monto = parseFloat(valor);
    if (monto <= 0) throw new Error('El valor debe ser mayor a cero.');

    // 1. Validar que el concepto sea un ANTICIPO_SUELDO y EGRESO
    const [cmRows] = await conn.query('SELECT tipo, afecta_nomina FROM catalogo_movimientos WHERE id = ?', [catalogo_movimiento_id]);
    if (cmRows.length === 0) throw new Error('Concepto financiero no existe.');
    if (cmRows[0].tipo !== 'EGRESO' || cmRows[0].afecta_nomina !== 'ANTICIPO_SUELDO') {
      throw new Error('El concepto seleccionado no es válido para anticipos de sueldo.');
    }

    // 2. Comprobar Sueldo Configurado
    const sueldoBase = await sueldosService.getSueldoBaseMensual(personalId, mes_aplicacion, conn);
    if (sueldoBase <= 0) throw new Error('El trabajador no tiene sueldo base configurado para este mes.');

    // 3. Comprobar Saldo
    const saldoDisp = await sueldosService.getSaldoDisponible(personalId, periodo_lectivo_id, mes_aplicacion, conn);
    let excedido = 0;

    if (monto > saldoDisp) {
      excedido = monto - saldoDisp;
      // Si excede, requerimos ser admin y justificación
      if (!req.usuario.es_admin) throw new Error('El valor excede el saldo disponible. Solo un Administrador puede autorizarlo.');
      if (!justificacion_exceso || justificacion_exceso.trim() === '') {
        throw new Error('Se requiere una justificación para autorizar el excedente.');
      }
    }

    // 4. Crear Movimiento Financiero
    const [mfResult] = await conn.query(`
      INSERT INTO movimientos_financieros (
        periodo_lectivo_id, fecha, catalogo_movimiento_id, descripcion, valor, 
        cuenta_financiera_id, mes_aplicacion, personal_id, numero_comprobante, observacion, creado_por
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      periodo_lectivo_id, fecha, catalogo_movimiento_id, descripcion, monto, 
      cuenta_financiera_id, mes_aplicacion, personalId, numero_comprobante || null, observacion || null, req.usuario.id
    ]);

    const movId = mfResult.insertId;

    // 5. Auditoría
    const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null;
    await conn.query(`
      INSERT INTO auditoria_financiera (
        movimiento_financiero_id, accion, usuario_id, datos_nuevos, direccion_ip
      ) VALUES (?, 'CREACION', ?, ?, ?)
    `, [movId, req.usuario.id, JSON.stringify(req.body), ip]);

    // 6. Registrar Autorización Extraordinaria si aplica
    if (excedido > 0) {
      await conn.query(`
        INSERT INTO autorizaciones_anticipos (
          movimiento_financiero_id, personal_id, periodo_lectivo_id, mes,
          saldo_disponible, valor_anticipo, valor_excedido, justificacion, autorizado_por
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [movId, personalId, periodo_lectivo_id, mes_aplicacion, saldoDisp, monto, excedido, justificacion_exceso, req.usuario.id]);
    }

    await conn.commit();
    res.status(201).json({ success: true, message: excedido > 0 ? 'Anticipo excedido registrado con autorización.' : 'Anticipo registrado.' });
  } catch (error) {
    await conn.rollback();
    console.error('Error registrarAnticipo:', error);
    res.status(400).json({ success: false, message: error.message || 'Error al registrar anticipo.' });
  } finally {
    conn.release();
  }
};

module.exports = {
  getResumenMensual,
  getDetalleTrabajador,
  upsertAjustesMensuales,
  registrarAnticipo
};
