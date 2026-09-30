const db = require('../config/db');

// Genera el código único PEN-YYYY-00000X
const generarCodigoObligacion = async (connection, mesDate) => {
  const anio = mesDate.substring(0, 4);
  const prefix = `PEN-${anio}-`;
  
  const [rows] = await connection.query(`
    SELECT codigo FROM obligaciones_pension 
    WHERE codigo LIKE ? 
    ORDER BY id DESC LIMIT 1
  `, [prefix + '%']);
  
  if (rows.length === 0) {
    return `${prefix}000001`;
  }
  
  const lastCode = rows[0].codigo;
  const lastNumber = parseInt(lastCode.split('-')[2], 10);
  const newNumber = (lastNumber + 1).toString().padStart(6, '0');
  
  return `${prefix}${newNumber}`;
};

// Determina el estado de una mensualidad en base a sus saldos
const determinarEstado = (valor_actual, total_pagado, fecha_vencimiento, es_exonerada) => {
  const saldo = parseFloat(valor_actual) - parseFloat(total_pagado);
  
  if (es_exonerada && parseFloat(valor_actual) === 0) return 'EXONERADA';
  if (saldo <= 0 && parseFloat(valor_actual) > 0) return 'PAGADA';
  if (parseFloat(total_pagado) > 0 && saldo > 0) return 'PARCIAL';
  
  const vencimiento = new Date(fecha_vencimiento);
  const ahora = new Date();
  vencimiento.setHours(23, 59, 59, 999);
  
  if (saldo > 0 && ahora > vencimiento) return 'VENCIDA';
  if (saldo > 0 && ahora <= vencimiento) return 'PENDIENTE';
  
  return 'PENDIENTE';
};

const generarObligacionIndividual = async (matriculaId, mesCobrableId, usuarioId) => {
  const connection = await db.getConnection();
  await connection.beginTransaction();
  
  try {
    // 1. Validar matrícula y obtener datos
    const [matriculas] = await connection.query(`
      SELECT m.*, e.id as estudiante_id 
      FROM matriculas m
      JOIN estudiantes e ON m.estudiante_id = e.id
      WHERE m.id = ? AND m.estado_matricula IN ('MATRICULADO', 'RETIRADO')
    `, [matriculaId]);
    
    if (matriculas.length === 0) throw new Error('Matrícula inválida o no encontrada.');
    const matricula = matriculas[0];

    // 2. Obtener el mes cobrable
    const [meses] = await connection.query(`
      SELECT * FROM periodo_meses_cobrables 
      WHERE id = ? AND periodo_lectivo_id = ? AND cobrable = 1
    `, [mesCobrableId, matricula.periodo_lectivo_id]);
    
    if (meses.length === 0) throw new Error('Mes cobrable inválido o no permitido.');
    const mes = meses[0];

    // Verificar si el estudiante se retiró ANTES del mes
    if (matricula.estado_matricula === 'RETIRADO' && matricula.fecha_retiro) {
       const fechaRetiro = new Date(matricula.fecha_retiro);
       const mesDate = new Date(mes.mes);
       if (fechaRetiro < mesDate) {
         throw new Error('No se pueden generar meses posteriores al retiro del estudiante.');
       }
    }

    // 3. Verificar que no exista ya una obligación activa o pendiente para esta matrícula y mes
    const [existentes] = await connection.query(`
      SELECT id FROM obligaciones_pension 
      WHERE matricula_id = ? AND mes_cobrable_id = ? AND estado != 'ANULADA'
    `, [matriculaId, mesCobrableId]);
    
    if (existentes.length > 0) throw new Error('Ya existe una obligación generada para este mes.');

    // 4. Buscar asignación vigente (ACTIVA o APROBADA)
    const [asignaciones] = await connection.query(`
      SELECT * FROM asignaciones_pension
      WHERE matricula_id = ? 
        AND estado IN ('ACTIVA', 'APROBADA')
        AND mes_desde <= ? AND mes_hasta >= ?
      ORDER BY id DESC LIMIT 1
    `, [matriculaId, mes.mes, mes.mes]);

    if (asignaciones.length === 0) throw new Error('El estudiante no tiene una asignación de pensión activa para este mes.');
    const asignacion = asignaciones[0];

    // 5. Cargar beneficios de la asignación
    const [beneficios] = await connection.query(`
      SELECT * FROM asignacion_pension_beneficios 
      WHERE asignacion_pension_id = ? AND estado = 'ACTIVO'
        AND mes_desde <= ? AND mes_hasta >= ?
    `, [asignacion.id, mes.mes, mes.mes]);

    // 6. Preparar los valores monetarios
    const tarifaBase = parseFloat(asignacion.tarifa_base_snapshot);
    const descuentoTotal = parseFloat(asignacion.descuento_total_snapshot);
    const valorOriginal = parseFloat(asignacion.valor_mensual_final); // El valor de la asignación es el valor base del mes
    const esExonerada = valorOriginal === 0;
    const estado = esExonerada ? 'EXONERADA' : 'PENDIENTE'; // Al emitirse directamente
    const codigo = await generarCodigoObligacion(connection, mes.mes);

    // 7. Insertar obligación
    const [result] = await connection.query(`
      INSERT INTO obligaciones_pension (
        codigo, matricula_id, estudiante_id, periodo_lectivo_id, mes_cobrable_id, asignacion_pension_id,
        mes, fecha_emision, fecha_vencimiento, tarifa_base_snapshot, descuento_snapshot,
        valor_original, valor_actual, saldo, beneficios_snapshot, regla_calculo_snapshot,
        es_exonerada, estado, generado_por, generado_at, emitido_por, emitido_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, NOW())
    `, [
      codigo, matriculaId, matricula.estudiante_id, matricula.periodo_lectivo_id, mesCobrableId, asignacion.id,
      mes.mes, mes.fecha_emision || new Date(), mes.fecha_vencimiento, tarifaBase, descuentoTotal,
      valorOriginal, valorOriginal, valorOriginal, JSON.stringify(beneficios), asignacion.regla_tarifa_snapshot,
      esExonerada, estado, usuarioId, usuarioId
    ]);

    const obligacionId = result.insertId;

    // 8. Historial
    await connection.query(`
      INSERT INTO historial_obligacion_pension (obligacion_pension_id, accion, estado_nuevo, motivo, usuario_id)
      VALUES (?, 'GENERACIÓN_INDIVIDUAL', ?, 'Obligación mensual generada y emitida.', ?)
    `, [obligacionId, estado, usuarioId]);

    await connection.commit();
    return { success: true, obligacionId, codigo };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const anularObligacion = async (id, motivo, usuarioId) => {
  const connection = await db.getConnection();
  await connection.beginTransaction();
  
  try {
    const [obligaciones] = await connection.query('SELECT * FROM obligaciones_pension WHERE id = ?', [id]);
    if (obligaciones.length === 0) throw new Error('Obligación no encontrada.');
    const ob = obligaciones[0];

    if (ob.estado === 'ANULADA') throw new Error('La obligación ya está anulada.');
    if (parseFloat(ob.total_pagado) > 0) throw new Error('No se puede anular una obligación que tiene pagos registrados.');

    await connection.query(`
      UPDATE obligaciones_pension 
      SET estado = 'ANULADA', anulado_por = ?, anulado_at = NOW(), motivo_anulacion = ?, saldo = 0, valor_actual = 0
      WHERE id = ?
    `, [usuarioId, motivo, id]);

    await connection.query(`
      INSERT INTO historial_obligacion_pension (obligacion_pension_id, accion, estado_anterior, estado_nuevo, motivo, usuario_id)
      VALUES (?, 'ANULACIÓN', ?, 'ANULADA', ?, ?)
    `, [id, ob.estado, motivo, usuarioId]);

    await connection.commit();
    return { success: true, message: 'Obligación anulada correctamente.' };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const aplicarAjuste = async (obligacionId, tipo, valor, signo, motivo, usuarioId) => {
  const connection = await db.getConnection();
  await connection.beginTransaction();
  
  try {
    const [obligaciones] = await connection.query('SELECT * FROM obligaciones_pension WHERE id = ? FOR UPDATE', [obligacionId]);
    if (obligaciones.length === 0) throw new Error('Obligación no encontrada.');
    const ob = obligaciones[0];

    if (ob.estado === 'ANULADA' || ob.estado === 'PAGADA') {
      throw new Error(`No se pueden aplicar ajustes a una obligación en estado ${ob.estado}.`);
    }

    const valorAjuste = parseFloat(valor);
    if (isNaN(valorAjuste) || valorAjuste <= 0) throw new Error('El valor del ajuste debe ser mayor a 0.');

    let nuevoValorAjustes = parseFloat(ob.valor_ajustes);
    let nuevoValorActual = parseFloat(ob.valor_actual);

    if (signo === 'SUMA') {
      nuevoValorAjustes += valorAjuste;
      nuevoValorActual += valorAjuste;
    } else {
      nuevoValorAjustes -= valorAjuste;
      nuevoValorActual -= valorAjuste;
      if (nuevoValorActual < 0) throw new Error('El ajuste resultaría en un valor actual negativo.');
      if (nuevoValorActual < parseFloat(ob.total_pagado)) throw new Error('El ajuste resultaría en un valor actual menor a lo ya pagado.');
    }

    const nuevoEstado = determinarEstado(nuevoValorActual, ob.total_pagado, ob.fecha_vencimiento, ob.es_exonerada);
    const nuevoSaldo = nuevoValorActual - parseFloat(ob.total_pagado);

    // Guardar el ajuste
    await connection.query(`
      INSERT INTO ajustes_obligacion_pension (obligacion_pension_id, tipo, valor, signo, motivo, usuario_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [obligacionId, tipo, valorAjuste, signo, motivo, usuarioId]);

    // Actualizar obligación
    await connection.query(`
      UPDATE obligaciones_pension 
      SET valor_ajustes = ?, valor_actual = ?, saldo = ?, estado = ?
      WHERE id = ?
    `, [nuevoValorAjustes, nuevoValorActual, nuevoSaldo, nuevoEstado, obligacionId]);

    // Historial
    await connection.query(`
      INSERT INTO historial_obligacion_pension (obligacion_pension_id, accion, estado_anterior, estado_nuevo, motivo, usuario_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [obligacionId, `AJUSTE_${signo}`, ob.estado, nuevoEstado, motivo, usuarioId]);

    await connection.commit();
    return { success: true, nuevo_saldo: nuevoSaldo, nuevo_estado: nuevoEstado };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

module.exports = {
  generarObligacionIndividual,
  determinarEstado,
  anularObligacion,
  aplicarAjuste
};
