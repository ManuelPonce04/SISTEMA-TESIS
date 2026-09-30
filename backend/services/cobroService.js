const db = require('../config/db');

const generarCodigoPago = async (connection, mesDate) => {
  const anio = mesDate.substring(0, 4);
  const prefix = `PAG-${anio}-`;
  
  const [rows] = await connection.query(`SELECT codigo FROM pagos_pension WHERE codigo LIKE ? ORDER BY id DESC LIMIT 1`, [prefix + '%']);
  if (rows.length === 0) return `${prefix}000001`;
  
  const lastNumber = parseInt(rows[0].codigo.split('-')[2], 10);
  return `${prefix}${(lastNumber + 1).toString().padStart(6, '0')}`;
};

const generarNumeroRecibo = async (connection, mesDate) => {
  const anio = mesDate.substring(0, 4);
  const prefix = `REC-${anio}-`;
  
  const [rows] = await connection.query(`SELECT numero_recibo FROM pagos_pension WHERE numero_recibo LIKE ? ORDER BY id DESC LIMIT 1`, [prefix + '%']);
  if (rows.length === 0) return `${prefix}000001`;
  
  const lastNumber = parseInt(rows[0].numero_recibo.split('-')[2], 10);
  return `${prefix}${(lastNumber + 1).toString().padStart(6, '0')}`;
};

const generarCodigoCredito = async (connection, mesDate) => {
  const anio = mesDate.substring(0, 4);
  const prefix = `CRE-${anio}-`;
  
  const [rows] = await connection.query(`SELECT codigo FROM creditos_estudiante WHERE codigo LIKE ? ORDER BY id DESC LIMIT 1`, [prefix + '%']);
  if (rows.length === 0) return `${prefix}000001`;
  
  const lastNumber = parseInt(rows[0].codigo.split('-')[2], 10);
  return `${prefix}${(lastNumber + 1).toString().padStart(6, '0')}`;
};

const determinarEstado = (valor_actual, total_pagado, fecha_vencimiento, es_exonerada) => {
  const saldo = parseFloat(valor_actual) - parseFloat(total_pagado);
  if (es_exonerada && parseFloat(valor_actual) === 0) return 'EXONERADA';
  if (saldo <= 0 && parseFloat(valor_actual) > 0) return 'PAGADA';
  if (parseFloat(total_pagado) > 0 && saldo > 0) return 'PARCIAL';
  
  const vencimiento = new Date(fecha_vencimiento);
  const ahora = new Date();
  vencimiento.setHours(23, 59, 59, 999);
  
  if (saldo > 0 && ahora > vencimiento) return 'VENCIDA';
  return 'PENDIENTE';
};

const registrarCobro = async (data, usuarioId) => {
  const connection = await db.getConnection();
  await connection.beginTransaction();
  
  try {
    const { estudiante_id, matricula_id, periodo_lectivo_id, fecha_pago, valor_recibido, aplicaciones, metodos, observacion } = data;
    
    // 1. Validar sumas y congruencia
    const totalMetodos = metodos.reduce((acc, curr) => acc + parseFloat(curr.valor), 0);
    if (Math.abs(totalMetodos - parseFloat(valor_recibido)) > 0.01) {
      throw new Error(`La suma de métodos ($${totalMetodos}) no coincide con el valor recibido ($${valor_recibido}).`);
    }

    const totalAplicaciones = aplicaciones.reduce((acc, curr) => acc + parseFloat(curr.valor_aplicar), 0);
    let valorSobrante = parseFloat(valor_recibido) - totalAplicaciones;
    
    if (valorSobrante < -0.01) {
      throw new Error('El valor aplicado supera al valor recibido (y no se están usando créditos adicionales).');
    }

    // 2. Generar códigos
    const anioStr = new Date(fecha_pago).toISOString();
    const codigoPago = await generarCodigoPago(connection, anioStr);
    const numRecibo = await generarNumeroRecibo(connection, anioStr);

    // 3. Crear cabecera del pago
    const [resultPago] = await connection.query(`
      INSERT INTO pagos_pension (
        codigo, numero_recibo, estudiante_id, matricula_id, periodo_lectivo_id, fecha_pago,
        valor_recibido, valor_aplicado, credito_generado, observacion, cobrado_por
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [codigoPago, numRecibo, estudiante_id, matricula_id, periodo_lectivo_id, fecha_pago, valor_recibido, totalAplicaciones, Math.max(0, valorSobrante), observacion, usuarioId]);
    
    const pagoId = resultPago.insertId;

    // 4. Crear métodos de pago
    for (const metodo of metodos) {
      await connection.query(`
        INSERT INTO pago_pension_metodos (
          pago_pension_id, metodo_pago_id, cuenta_financiera_id, valor, numero_comprobante, referencia
        ) VALUES (?, ?, ?, ?, ?, ?)
      `, [pagoId, metodo.metodo_pago_id, metodo.cuenta_financiera_id || null, metodo.valor, metodo.numero_comprobante || null, metodo.referencia || null]);
    }

    // 5. Aplicar pagos a las obligaciones y recalcular saldos
    for (const apl of aplicaciones) {
      const valorApl = parseFloat(apl.valor_aplicar);
      if (valorApl <= 0) continue;

      // Leer obligación con bloqueo
      const [obligaciones] = await connection.query(`
        SELECT * FROM obligaciones_pension WHERE id = ? FOR UPDATE
      `, [apl.obligacion_id]);

      if (obligaciones.length === 0) throw new Error(`Obligación ID ${apl.obligacion_id} no encontrada.`);
      const ob = obligaciones[0];

      if (ob.estado === 'ANULADA' || ob.estado === 'PAGADA' || ob.estado === 'EXONERADA') {
        throw new Error(`La obligación ${ob.codigo} ya no es cobrable (estado: ${ob.estado}).`);
      }

      if (valorApl > parseFloat(ob.saldo) + 0.01) {
        throw new Error(`Intento de aplicar $${valorApl} a la obligación ${ob.codigo} cuyo saldo es $${ob.saldo}.`);
      }

      // Insertar aplicación
      await connection.query(`
        INSERT INTO pago_pension_aplicaciones (pago_pension_id, obligacion_pension_id, valor_aplicado)
        VALUES (?, ?, ?)
      `, [pagoId, ob.id, valorApl]);

      // Recalcular saldo
      const nuevoPagado = parseFloat(ob.total_pagado) + valorApl;
      const nuevoEstado = determinarEstado(ob.valor_actual, nuevoPagado, ob.fecha_vencimiento, ob.es_exonerada);
      const nuevoSaldo = parseFloat(ob.valor_actual) - nuevoPagado;

      await connection.query(`
        UPDATE obligaciones_pension 
        SET total_pagado = ?, saldo = ?, estado = ? 
        WHERE id = ?
      `, [nuevoPagado, Math.max(0, nuevoSaldo), nuevoEstado, ob.id]);

      // Historial
      await connection.query(`
        INSERT INTO historial_obligacion_pension (obligacion_pension_id, accion, estado_anterior, estado_nuevo, motivo, usuario_id)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [ob.id, `PAGO_RECIBO_${numRecibo}`, ob.estado, nuevoEstado, `Abono de $${valorApl}`, usuarioId]);
    }

    // 6. Generar Crédito Estudiantil si sobra dinero
    if (valorSobrante >= 0.01) {
      const codCredito = await generarCodigoCredito(connection, anioStr);
      await connection.query(`
        INSERT INTO creditos_estudiante (
          codigo, estudiante_id, matricula_id, pago_origen_id, valor_original, saldo_disponible, fecha, motivo, creado_por
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [codCredito, estudiante_id, matricula_id, pagoId, valorSobrante, valorSobrante, fecha_pago, `Saldo a favor por excedente en pago ${numRecibo}`, usuarioId]);
    }

    // 7. Historial de Pago
    await connection.query(`
      INSERT INTO historial_pago_pension (pago_pension_id, accion, motivo, usuario_id)
      VALUES (?, 'CREACIÓN', 'Registro de cobro y distribución inicial', ?)
    `, [pagoId, usuarioId]);

    // Opcional: Integración con movimientos financieros.
    // Como el Prompt dice: "Preparación para estado de cuenta y cierre diario... Integración con movimientos",
    // Aquí registraríamos el movimiento en el catálogo, pero dado que esa tabla no la pasaron completa, lo dejaremos como paso preparado en el modelo.

    await connection.commit();
    return { success: true, pago_id: pagoId, codigo: codigoPago, numero_recibo: numRecibo };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const getPagosByMatricula = async (matriculaId) => {
  const [rows] = await db.query(`
    SELECT * FROM pagos_pension 
    WHERE matricula_id = ? 
    ORDER BY fecha_pago DESC, id DESC
  `, [matriculaId]);
  return rows;
};

module.exports = {
  registrarCobro,
  getPagosByMatricula
};
