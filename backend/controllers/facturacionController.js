/**
 * Controlador de Facturación - Cobro de Pensiones
 */
const db = require('../config/db');
const { validarIdentificacion } = require('../utils/sriValidator');

// Helpers de respuesta
const ok = (res, data) => res.json({ success: true, ...data });
const badReq = (res, msg) => res.status(400).json({ success: false, message: msg });
const notFnd = (res, msg) => res.status(404).json({ success: false, message: msg || 'No encontrado.' });
const srvErr = (res, err, ctx) => {
  console.error(`[Facturacion][${ctx}]`, err);
  res.status(500).json({ success: false, message: 'Error interno en el módulo de facturación.', error: err.message });
};

// ─────────────────────────────────────────────────────────────
// 1. CONFIGURACIÓN INSTITUCIONAL
// ─────────────────────────────────────────────────────────────

/**
 * GET /config
 * Obtiene la configuración actual de la institución emisora.
 */
exports.getConfig = async (req, res) => {
  try {
    const [[config]] = await db.query('SELECT * FROM institucion_config WHERE id = 1');
    if (!config) {
      return notFnd(res, 'Configuración institucional no encontrada.');
    }
    ok(res, { config });
  } catch (err) {
    srvErr(res, err, 'getConfig');
  }
};

/**
 * PUT /config
 * Actualiza los datos de la institución emisora.
 */
exports.updateConfig = async (req, res) => {
  try {
    const {
      razon_social,
      nombre_comercial,
      ruc,
      direccion_matriz,
      direccion_establecimiento,
      telefono,
      email,
      logo,
      obligado_contabilidad,
      contribuyente_especial,
      regimen,
      ambiente,
      codigo_establecimiento,
      codigo_punto_emision,
      tarifa_iva_defecto,
      facturacion_automatica
    } = req.body;

    if (!razon_social?.trim() || !ruc?.trim()) {
      return badReq(res, 'Razón social y RUC son campos obligatorios.');
    }

    const valRuc = validarIdentificacion('RUC', ruc);
    if (!valRuc.valido) {
      return badReq(res, valRuc.mensaje);
    }

    await db.query(`
      UPDATE institucion_config SET
        razon_social = ?,
        nombre_comercial = ?,
        ruc = ?,
        direccion_matriz = ?,
        direccion_establecimiento = ?,
        telefono = ?,
        email = ?,
        logo = ?,
        obligado_contabilidad = ?,
        contribuyente_especial = ?,
        regimen = ?,
        ambiente = ?,
        codigo_establecimiento = ?,
        codigo_punto_emision = ?,
        tarifa_iva_defecto = ?,
        facturacion_automatica = ?
      WHERE id = 1
    `, [
      razon_social.trim(),
      (nombre_comercial || razon_social).trim(),
      ruc.trim(),
      direccion_matriz?.trim() || '',
      direccion_establecimiento?.trim() || '',
      telefono?.trim() || '',
      email?.trim() || '',
      logo || null,
      obligado_contabilidad === 'SI' ? 'SI' : 'NO',
      contribuyente_especial?.trim() || null,
      regimen || 'RIMPE_EMPRENDEDOR',
      parseInt(ambiente) || 1,
      (codigo_establecimiento || '001').padStart(3, '0'),
      (codigo_punto_emision || '001').padStart(3, '0'),
      parseFloat(tarifa_iva_defecto) || 0.00,
      facturacion_automatica ? 1 : 0
    ]);

    const [[updated]] = await db.query('SELECT * FROM institucion_config WHERE id = 1');
    ok(res, { message: 'Configuración actualizada exitosamente.', config: updated });
  } catch (err) {
    srvErr(res, err, 'updateConfig');
  }
};

// ─────────────────────────────────────────────────────────────
// 2. CLIENTES DE FACTURACIÓN
// ─────────────────────────────────────────────────────────────

/**
 * GET /clientes?q=...&limit=
 * Busca clientes de facturación por identificación o razón social.
 */
exports.getClientes = async (req, res) => {
  try {
    const { q = '', limit = 20 } = req.query;
    let sql = 'SELECT * FROM clientes_facturacion WHERE activo = 1';
    const params = [];

    if (q.trim()) {
      sql += ' AND (identificacion LIKE ? OR razon_social LIKE ?)';
      params.push(`%${q.trim()}%`, `%${q.trim()}%`);
    }

    sql += ' ORDER BY razon_social ASC LIMIT ?';
    params.push(parseInt(limit) || 20);

    const [clientes] = await db.query(sql, params);
    ok(res, { clientes });
  } catch (err) {
    srvErr(res, err, 'getClientes');
  }
};

/**
 * GET /clientes/:id
 */
exports.getClienteById = async (req, res) => {
  try {
    const { id } = req.params;
    const [[cliente]] = await db.query('SELECT * FROM clientes_facturacion WHERE id = ?', [id]);
    if (!cliente) return notFnd(res, 'Cliente no encontrado.');
    ok(res, { cliente });
  } catch (err) {
    srvErr(res, err, 'getClienteById');
  }
};

/**
 * GET /clientes/estudiante/:estudiante_id
 * Obtiene el cliente de facturación predeterminado para un estudiante.
 */
exports.getClienteByEstudiante = async (req, res) => {
  try {
    const { estudiante_id } = req.params;

    // 1. Buscar en la tabla puente de facturación
    const [[vinculo]] = await db.query(`
      SELECT cf.* 
      FROM estudiante_clientes_facturacion ecf
      JOIN clientes_facturacion cf ON cf.id = ecf.cliente_id
      WHERE ecf.estudiante_id = ? AND ecf.es_predeterminado = 1
      LIMIT 1
    `, [estudiante_id]);

    if (vinculo) {
      return ok(res, { cliente: vinculo, origen: 'PREDETERMINADO' });
    }

    // 2. Si no tiene vínculo formal, sugerir a partir del representante principal
    const [[rep]] = await db.query(`
      SELECT r.* 
      FROM estudiantes e
      JOIN representantes r ON r.id_representante = e.id_representante
      WHERE e.id_estudiante = ?
      LIMIT 1
    `, [estudiante_id]);

    if (rep && rep.cedula) {
      // Buscar si ya está en clientes_facturacion
      const [[cli]] = await db.query(`
        SELECT * FROM clientes_facturacion WHERE identificacion = ? LIMIT 1
      `, [rep.cedula.trim()]);

      if (cli) {
        return ok(res, { cliente: cli, origen: 'REPRESENTANTE_REGISTRADO' });
      }

      // Devolver borrador con datos del representante
      const sugerido = {
        id: null,
        tipo_identificacion: rep.cedula.trim().length === 13 ? 'RUC' : 'CEDULA',
        identificacion: rep.cedula.trim(),
        razon_social: `${rep.apellidos || ''} ${rep.nombres || ''}`.trim(),
        direccion: rep.direccion || 'Jaramijó, Manabí',
        telefono: rep.telefono || '',
        email: rep.correo || '',
        es_sugerido: true
      };
      return ok(res, { cliente: sugerido, origen: 'REPRESENTANTE_NUEVO' });
    }

    // 3. Fallback: Consumidor final
    const [[cf]] = await db.query('SELECT * FROM clientes_facturacion WHERE identificacion = "9999999999999" LIMIT 1');
    ok(res, { cliente: cf || null, origen: 'CONSUMIDOR_FINAL' });
  } catch (err) {
    srvErr(res, err, 'getClienteByEstudiante');
  }
};

/**
 * POST /clientes
 * Crea o actualiza un cliente de facturación y opcionalmente lo vincula al estudiante.
 */
exports.createCliente = async (req, res) => {
  try {
    const {
      tipo_identificacion = 'CEDULA',
      identificacion,
      razon_social,
      direccion,
      telefono,
      email,
      estudiante_id,
      es_predeterminado = true
    } = req.body;

    if (!identificacion?.trim() || !razon_social?.trim()) {
      return badReq(res, 'Identificación y Razón Social son requeridos.');
    }

    const cleanId = identificacion.trim();
    const val = validarIdentificacion(tipo_identificacion, cleanId);
    if (!val.valido) {
      return badReq(res, val.mensaje);
    }

    // Comprobar si ya existe
    const [[existente]] = await db.query(
      'SELECT * FROM clientes_facturacion WHERE identificacion = ?',
      [cleanId]
    );

    let clienteId;

    if (existente) {
      clienteId = existente.id;
      // Actualizar datos de contacto si se proporcionaron
      await db.query(`
        UPDATE clientes_facturacion SET
          tipo_identificacion = ?,
          razon_social = ?,
          direccion = COALESCE(?, direccion),
          telefono = COALESCE(?, telefono),
          email = COALESCE(?, email),
          activo = 1
        WHERE id = ?
      `, [
        tipo_identificacion,
        razon_social.trim(),
        direccion?.trim() || null,
        telefono?.trim() || null,
        email?.trim() || null,
        clienteId
      ]);
    } else {
      const [insert] = await db.query(`
        INSERT INTO clientes_facturacion (
          tipo_identificacion, identificacion, razon_social, direccion, telefono, email
        ) VALUES (?, ?, ?, ?, ?, ?)
      `, [
        tipo_identificacion,
        cleanId,
        razon_social.trim(),
        direccion?.trim() || 'S/N',
        telefono?.trim() || null,
        email?.trim() || 'facturacion@juanleonmera.edu.ec'
      ]);
      clienteId = insert.insertId;
    }

    // Si viene estudiante_id, vincularlo como predeterminado
    if (estudiante_id) {
      if (es_predeterminado) {
        await db.query(
          'UPDATE estudiante_clientes_facturacion SET es_predeterminado = 0 WHERE estudiante_id = ?',
          [estudiante_id]
        );
      }
      await db.query(`
        INSERT INTO estudiante_clientes_facturacion (estudiante_id, cliente_id, es_predeterminado)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE es_predeterminado = VALUES(es_predeterminado)
      `, [estudiante_id, clienteId, es_predeterminado ? 1 : 0]);
    }

    const [[cliente]] = await db.query('SELECT * FROM clientes_facturacion WHERE id = ?', [clienteId]);
    ok(res, { message: 'Cliente guardado exitosamente.', cliente });
  } catch (err) {
    srvErr(res, err, 'createCliente');
  }
};

/**
 * PUT /clientes/:id
 */
exports.updateCliente = async (req, res) => {
  try {
    const { id } = req.params;
    const { tipo_identificacion, razon_social, direccion, telefono, email } = req.body;

    if (!razon_social?.trim()) {
      return badReq(res, 'Razón social es requerida.');
    }

    await db.query(`
      UPDATE clientes_facturacion SET
        tipo_identificacion = COALESCE(?, tipo_identificacion),
        razon_social = ?,
        direccion = COALESCE(?, direccion),
        telefono = COALESCE(?, telefono),
        email = COALESCE(?, email)
      WHERE id = ?
    `, [
      tipo_identificacion || null,
      razon_social.trim(),
      direccion?.trim() || null,
      telefono?.trim() || null,
      email?.trim() || null,
      id
    ]);

    const [[cliente]] = await db.query('SELECT * FROM clientes_facturacion WHERE id = ?', [id]);
    ok(res, { message: 'Cliente actualizado.', cliente });
  } catch (err) {
    srvErr(res, err, 'updateCliente');
  }
};

// ─────────────────────────────────────────────────────────────
// 3. PAGOS PENDIENTES DE FACTURAR POR ESTUDIANTE
// ─────────────────────────────────────────────────────────────

/**
 * GET /estudiante/:estudiante_id/pagos-pendientes
 * Obtiene los pagos de pensión registrados que NO han sido facturados aún.
 */
exports.getPagosPendientesEstudiante = async (req, res) => {
  try {
    const { estudiante_id } = req.params;

    const [pagos] = await db.query(`
      SELECT
        pp.id AS pago_id,
        pp.fecha_pago,
        pp.monto,
        pp.numero_recibo,
        pp.nota,
        pq.id AS cuota_id,
        pq.mes,
        pq.anio_lectivo,
        pq.valor_pension,
        c.nombre AS curso_nombre,
        m.paralelo,
        e.codigo AS estudiante_codigo,
        CONCAT(e.apellidos, ' ', e.nombres) AS estudiante_nombre
      FROM pension_pagos pp
      JOIN pension_cuotas pq ON pq.id = pp.cuota_id
      JOIN estudiantes    e  ON e.id_estudiante = pp.estudiante_id
      JOIN matriculas     m  ON m.id_matricula = pq.matricula_id
      JOIN cursos         c  ON c.id_curso = m.id_curso
      WHERE pp.estudiante_id = ?
        AND pp.anulado = 0
        AND pp.factura_id IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM factura_detalles fd
          JOIN facturas f ON f.id = fd.factura_id
          WHERE fd.pago_id = pp.id AND f.estado = 'EMITIDA'
        )
      ORDER BY pp.fecha_pago ASC, pq.mes ASC
    `, [estudiante_id]);

    ok(res, { pagos });
  } catch (err) {
    srvErr(res, err, 'getPagosPendientesEstudiante');
  }
};

// ─────────────────────────────────────────────────────────────
// 4. EMISIÓN DE FACTURA (TRANSACCIONAL)
// ─────────────────────────────────────────────────────────────

/**
 * POST /emitir
 * Emite una factura oficial agrupando uno o varios pagos de pensión.
 */
exports.emitirFactura = async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const {
      estudiante_id,
      cliente_id,
      cliente_nuevo, // { tipo_identificacion, identificacion, razon_social, direccion, telefono, email }
      pago_ids = [],
      forma_pago = 'EFECTIVO',
      observaciones,
      anio_lectivo
    } = req.body;

    const usuario_id = req.usuario?.id_usuario || null;

    if (!estudiante_id) return badReq(res, 'El ID de estudiante es obligatorio.');
    if (!Array.isArray(pago_ids) || pago_ids.length === 0) {
      return badReq(res, 'Debe seleccionar al menos un pago registrado para emitir la factura.');
    }

    // 1. Obtener datos de la Institución emisora
    const [[cfg]] = await conn.query('SELECT * FROM institucion_config WHERE id = 1 FOR UPDATE');
    if (!cfg) throw new Error('No existe configuración institucional.');

    const establecimiento = cfg.codigo_establecimiento || '001';
    const punto_emision = cfg.codigo_punto_emision || '001';
    const tarifa_iva = parseFloat(cfg.tarifa_iva_defecto || 0.00);

    // 2. Determinar o crear el cliente de facturación
    let finalClienteId = cliente_id;

    if (!finalClienteId && cliente_nuevo) {
      const { tipo_identificacion, identificacion, razon_social, direccion, telefono, email } = cliente_nuevo;
      if (!identificacion?.trim() || !razon_social?.trim()) {
        throw new Error('Datos incompletos para el nuevo cliente de facturación.');
      }
      const val = validarIdentificacion(tipo_identificacion, identificacion.trim());
      if (!val.valido) throw new Error(val.mensaje);

      const [[exist]] = await conn.query('SELECT id FROM clientes_facturacion WHERE identificacion = ?', [identificacion.trim()]);
      if (exist) {
        finalClienteId = exist.id;
      } else {
        const [cliIns] = await conn.query(`
          INSERT INTO clientes_facturacion (tipo_identificacion, identificacion, razon_social, direccion, telefono, email)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [
          tipo_identificacion,
          identificacion.trim(),
          razon_social.trim(),
          direccion?.trim() || 'S/N',
          telefono?.trim() || null,
          email?.trim() || 'facturacion@juanleonmera.edu.ec'
        ]);
        finalClienteId = cliIns.insertId;
      }

      // Guardar como predeterminado del estudiante
      await conn.query(`
        INSERT INTO estudiante_clientes_facturacion (estudiante_id, cliente_id, es_predeterminado)
        VALUES (?, ?, 1)
        ON DUPLICATE KEY UPDATE es_predeterminado = 1
      `, [estudiante_id, finalClienteId]);
    }

    if (!finalClienteId) {
      throw new Error('Debe seleccionar o ingresar los datos del cliente para la factura.');
    }

    // 3. Bloquear y validar los pagos a facturar
    const placeholders = pago_ids.map(() => '?').join(',');
    const [pagos] = await conn.query(`
      SELECT 
        pp.id, pp.monto, pp.numero_recibo, pp.fecha_pago,
        pq.mes, pq.anio_lectivo,
        c.nombre AS curso_nombre,
        m.paralelo,
        e.codigo AS est_codigo,
        CONCAT(e.apellidos, ' ', e.nombres) AS est_nombre
      FROM pension_pagos pp
      JOIN pension_cuotas pq ON pq.id = pp.cuota_id
      JOIN estudiantes    e  ON e.id_estudiante = pp.estudiante_id
      JOIN matriculas     m  ON m.id_matricula = pq.matricula_id
      JOIN cursos         c  ON c.id_curso = m.id_curso
      WHERE pp.id IN (${placeholders})
        AND pp.estudiante_id = ?
        AND pp.anulado = 0
      FOR UPDATE
    `, [...pago_ids, estudiante_id]);

    if (pagos.length !== pago_ids.length) {
      throw new Error('Uno o más pagos seleccionados no existen, no pertenecen al estudiante o están anulados.');
    }

    // Verificar que ninguno esté ya facturado en factura EMITIDA
    const [yaFacturados] = await conn.query(`
      SELECT fd.pago_id, f.numero 
      FROM factura_detalles fd
      JOIN facturas f ON f.id = fd.factura_id
      WHERE fd.pago_id IN (${placeholders}) AND f.estado = 'EMITIDA'
    `, pago_ids);

    if (yaFacturados.length > 0) {
      throw new Error(`El pago ya fue facturado previamente en la factura ${yaFacturados[0].numero}.`);
    }

    // 4. Bloquear y calcular el siguiente secuencial oficial (FOR UPDATE)
    const [[secRow]] = await conn.query(`
      SELECT ultimo_secuencial 
      FROM secuenciales 
      WHERE establecimiento = ? AND punto_emision = ? AND tipo_comprobante = 'FACTURA'
      FOR UPDATE
    `, [establecimiento, punto_emision]);

    let ultimoSec = secRow ? parseInt(secRow.ultimo_secuencial) : 0;
    const nuevoSec = ultimoSec + 1;
    const numeroFactura = `${establecimiento}-${punto_emision}-${String(nuevoSec).padStart(9, '0')}`;

    // Actualizar secuencial
    await conn.query(`
      INSERT INTO secuenciales (establecimiento, punto_emision, tipo_comprobante, ultimo_secuencial)
      VALUES (?, ?, 'FACTURA', ?)
      ON DUPLICATE KEY UPDATE ultimo_secuencial = ?
    `, [establecimiento, punto_emision, nuevoSec, nuevoSec]);

    // 5. Calcular totales
    let subtotal_0 = 0.00;
    let subtotal_iva = 0.00;
    let total_iva = 0.00;

    const lineasDetalle = pagos.map(p => {
      const monto = parseFloat(p.monto);
      let valorIvaLinea = 0.00;

      if (tarifa_iva > 0) {
        valorIvaLinea = parseFloat(((monto * tarifa_iva) / 100).toFixed(2));
        subtotal_iva += monto;
        total_iva += valorIvaLinea;
      } else {
        subtotal_0 += monto;
      }

      const totalLinea = parseFloat((monto + valorIvaLinea).toFixed(2));
      const mesStr = p.mes || 'Pensión';
      const cursoStr = p.curso_nombre ? `${p.curso_nombre} ${p.paralelo || ''}`.trim() : '';
      const descripcion = `Pensión ${mesStr} - ${cursoStr} - ${p.est_nombre}`.trim();

      return {
        pago_id: p.id,
        codigo: 'PEN',
        descripcion,
        cantidad: 1,
        precio_unitario: monto,
        descuento: 0.00,
        tarifa_iva,
        valor_iva: valorIvaLinea,
        total: totalLinea
      };
    });

    const granTotal = parseFloat((subtotal_0 + subtotal_iva + total_iva).toFixed(2));
    const fechaEmision = new Date().toISOString().split('T')[0];
    const anio = anio_lectivo || pagos[0]?.anio_lectivo || cfg.anio_lectivo || '2026-2027';

    // 6. Insertar cabecera de Factura
    const [facResult] = await conn.query(`
      INSERT INTO facturas (
        numero, establecimiento, punto_emision, secuencial, fecha_emision,
        cliente_id, estudiante_id, anio_lectivo,
        subtotal_0, subtotal_iva, descuento, tarifa_iva, iva, total,
        forma_pago, observaciones, estado, usuario_id, estado_sri
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'EMITIDA', ?, 'NO_ENVIADA')
    `, [
      numeroFactura,
      establecimiento,
      punto_emision,
      nuevoSec,
      fechaEmision,
      finalClienteId,
      estudiante_id,
      anio,
      parseFloat(subtotal_0.toFixed(2)),
      parseFloat(subtotal_iva.toFixed(2)),
      0.00,
      tarifa_iva,
      parseFloat(total_iva.toFixed(2)),
      granTotal,
      forma_pago,
      observaciones?.trim() || null,
      usuario_id
    ]);

    const facturaId = facResult.insertId;

    // 7. Insertar detalles
    for (const d of lineasDetalle) {
      await conn.query(`
        INSERT INTO factura_detalles (
          factura_id, pago_id, codigo, descripcion, cantidad,
          precio_unitario, descuento, tarifa_iva, valor_iva, total
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        facturaId,
        d.pago_id,
        d.codigo,
        d.descripcion,
        d.cantidad,
        d.precio_unitario,
        d.descuento,
        d.tarifa_iva,
        d.valor_iva,
        d.total
      ]);
    }

    // 8. Actualizar pagos con el ID de factura
    await conn.query(`
      UPDATE pension_pagos SET factura_id = ? WHERE id IN (${placeholders})
    `, [facturaId, ...pago_ids]);

    await conn.commit();

    // 9. Devolver la factura completa generada
    const [[facturaCreada]] = await db.query(`
      SELECT f.*, 
             cf.tipo_identificacion, cf.identificacion AS cliente_identificacion, cf.razon_social AS cliente_nombre,
             cf.direccion AS cliente_direccion, cf.telefono AS cliente_telefono, cf.email AS cliente_email,
             e.codigo AS estudiante_codigo, CONCAT(e.apellidos, ' ', e.nombres) AS estudiante_nombre
      FROM facturas f
      JOIN clientes_facturacion cf ON cf.id = f.cliente_id
      JOIN estudiantes e ON e.id_estudiante = f.estudiante_id
      WHERE f.id = ?
    `, [facturaId]);

    const [detallesCreados] = await db.query('SELECT * FROM factura_detalles WHERE factura_id = ?', [facturaId]);

    ok(res, {
      message: 'Factura emitida exitosamente.',
      factura: {
        ...facturaCreada,
        detalles: detallesCreados,
        institucion: cfg
      }
    });

  } catch (err) {
    await conn.rollback();
    srvErr(res, err, 'emitirFactura');
  } finally {
    conn.release();
  }
};

// ─────────────────────────────────────────────────────────────
// 5. CONSULTA Y LISTADO DE FACTURAS
// ─────────────────────────────────────────────────────────────

/**
 * GET /facturas
 * Listado de facturas emitidas con filtros por fecha, estudiante, cliente, número y estado.
 */
exports.getFacturas = async (req, res) => {
  try {
    const {
      fecha_desde,
      fecha_hasta,
      estudiante_id,
      cliente_id,
      numero,
      estado,
      forma_pago,
      page = 1,
      limit = 30
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const cond = ['1=1'];
    const params = [];

    if (fecha_desde) {
      cond.push('f.fecha_emision >= ?');
      params.push(fecha_desde);
    }
    if (fecha_hasta) {
      cond.push('f.fecha_emision <= ?');
      params.push(fecha_hasta);
    }
    if (estudiante_id) {
      cond.push('f.estudiante_id = ?');
      params.push(estudiante_id);
    }
    if (cliente_id) {
      cond.push('f.cliente_id = ?');
      params.push(cliente_id);
    }
    if (numero) {
      cond.push('f.numero LIKE ?');
      params.push(`%${numero.trim()}%`);
    }
    if (estado && estado !== 'TODOS') {
      cond.push('f.estado = ?');
      params.push(estado);
    }
    if (forma_pago && forma_pago !== 'TODAS') {
      cond.push('f.forma_pago = ?');
      params.push(forma_pago);
    }

    const where = cond.join(' AND ');

    // 1. Resumen de totales del filtro
    const [[totales]] = await db.query(`
      SELECT
        COUNT(*) AS total_facturas,
        COALESCE(SUM(CASE WHEN f.estado = 'EMITIDA' THEN f.total ELSE 0 END), 0) AS total_emitido,
        COALESCE(SUM(CASE WHEN f.estado = 'ANULADA' THEN f.total ELSE 0 END), 0) AS total_anulado,
        COALESCE(SUM(CASE WHEN f.estado = 'EMITIDA' THEN f.subtotal_0 ELSE 0 END), 0) AS total_subtotal_0,
        COALESCE(SUM(CASE WHEN f.estado = 'EMITIDA' THEN f.subtotal_iva ELSE 0 END), 0) AS total_subtotal_iva,
        COALESCE(SUM(CASE WHEN f.estado = 'EMITIDA' THEN f.iva ELSE 0 END), 0) AS total_iva
      FROM facturas f
      WHERE ${where}
    `, params);

    // 2. Facturas paginadas
    const [facturas] = await db.query(`
      SELECT 
        f.id, f.numero, f.fecha_emision, f.subtotal_0, f.subtotal_iva, f.descuento, f.iva, f.total,
        f.forma_pago, f.estado, f.motivo_anulacion, f.anulado_at, f.created_at, f.estado_sri,
        cf.identificacion AS cliente_identificacion, cf.razon_social AS cliente_nombre, cf.email AS cliente_email,
        e.id_estudiante, e.codigo AS estudiante_codigo, CONCAT(e.apellidos, ' ', e.nombres) AS estudiante_nombre,
        u.nombre_completo AS usuario_nombre
      FROM facturas f
      JOIN clientes_facturacion cf ON cf.id = f.cliente_id
      JOIN estudiantes e ON e.id_estudiante = f.estudiante_id
      LEFT JOIN usuarios u ON u.id_usuario = f.usuario_id
      WHERE ${where}
      ORDER BY f.fecha_emision DESC, f.id DESC
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), offset]);

    ok(res, {
      facturas,
      totales,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil((totales.total_facturas || 0) / parseInt(limit))
    });
  } catch (err) {
    srvErr(res, err, 'getFacturas');
  }
};

/**
 * GET /facturas/:id
 * Obtiene la información detallada para imprimir o visualizar la factura.
 */
exports.getFacturaById = async (req, res) => {
  try {
    const { id } = req.params;

    const [[factura]] = await db.query(`
      SELECT 
        f.*,
        cf.tipo_identificacion AS cliente_tipo_identificacion,
        cf.identificacion AS cliente_identificacion,
        cf.razon_social AS cliente_nombre,
        cf.direccion AS cliente_direccion,
        cf.telefono AS cliente_telefono,
        cf.email AS cliente_email,
        e.codigo AS estudiante_codigo,
        CONCAT(e.apellidos, ' ', e.nombres) AS estudiante_nombre,
        u.nombre_completo AS usuario_nombre,
        ua.nombre_completo AS usuario_anulacion_nombre
      FROM facturas f
      JOIN clientes_facturacion cf ON cf.id = f.cliente_id
      JOIN estudiantes e ON e.id_estudiante = f.estudiante_id
      LEFT JOIN usuarios u ON u.id_usuario = f.usuario_id
      LEFT JOIN usuarios ua ON ua.id_usuario = f.anulado_por
      WHERE f.id = ?
    `, [id]);

    if (!factura) return notFnd(res, 'Factura no encontrada.');

    const [detalles] = await db.query(`
      SELECT fd.*, pp.fecha_pago, pp.numero_recibo 
      FROM factura_detalles fd
      LEFT JOIN pension_pagos pp ON pp.id = fd.pago_id
      WHERE fd.factura_id = ?
      ORDER BY fd.id ASC
    `, [id]);

    const [[institucion]] = await db.query('SELECT * FROM institucion_config WHERE id = 1');

    ok(res, {
      factura: {
        ...factura,
        detalles,
        institucion
      }
    });
  } catch (err) {
    srvErr(res, err, 'getFacturaById');
  }
};

// ─────────────────────────────────────────────────────────────
// 6. ANULACIÓN DE FACTURA
// ─────────────────────────────────────────────────────────────

/**
 * PATCH /facturas/:id/anular
 * Anula una factura conservando el registro histórico y liberando los pagos asociados.
 */
exports.anularFactura = async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const { id } = req.params;
    const { motivo } = req.body;
    const usuario_id = req.usuario?.id_usuario || null;

    if (!motivo?.trim()) {
      return badReq(res, 'Debe ingresar un motivo obligatorio para la anulación.');
    }

    const [[factura]] = await conn.query('SELECT * FROM facturas WHERE id = ? FOR UPDATE', [id]);
    if (!factura) return notFnd(res, 'Factura no encontrada.');

    if (factura.estado === 'ANULADA') {
      return badReq(res, 'La factura ya se encuentra anulada.');
    }

    // 1. Actualizar estado de la factura
    await conn.query(`
      UPDATE facturas SET
        estado = 'ANULADA',
        motivo_anulacion = ?,
        anulado_at = NOW(),
        anulado_por = ?
      WHERE id = ?
    `, [motivo.trim(), usuario_id, id]);

    // 2. Liberar los pagos asociados en pension_pagos
    await conn.query(`
      UPDATE pension_pagos SET factura_id = NULL WHERE factura_id = ?
    `, [id]);

    await conn.commit();

    ok(res, {
      message: `Factura ${factura.numero} anulada exitosamente. Los pagos asociados quedan disponibles para volver a facturarse.`
    });
  } catch (err) {
    await conn.rollback();
    srvErr(res, err, 'anularFactura');
  } finally {
    conn.release();
  }
};

// ─────────────────────────────────────────────────────────────
// 7. CIERRE DIARIO Y COMPARATIVO COBRADO VS FACTURADO
// ─────────────────────────────────────────────────────────────

/**
 * GET /cierre-diario?fecha=YYYY-MM-DD
 */
exports.getCierreFacturacion = async (req, res) => {
  try {
    const { fecha = new Date().toISOString().split('T')[0] } = req.query;

    // 1. Institución
    const [[institucion]] = await db.query(`SELECT * FROM institucion_config ORDER BY id ASC LIMIT 1`);

    // 2. Total cobrado en pension_pagos para esa fecha
    const [[cobrado]] = await db.query(`
      SELECT
        COUNT(*) AS total_cobros,
        COALESCE(SUM(monto), 0) AS monto_cobrado
      FROM pension_pagos
      WHERE fecha_pago = ? AND anulado = 0
    `, [fecha]);

    // 3. Total facturado en facturas para esa fecha (EMITIDAS)
    const [[facturado]] = await db.query(`
      SELECT
        COUNT(*) AS total_facturas,
        COALESCE(SUM(total), 0) AS monto_facturado
      FROM facturas
      WHERE fecha_emision = ? AND estado = 'EMITIDA'
    `, [fecha]);

    // 4. Total anuladas en facturas para esa fecha
    const [[anuladas]] = await db.query(`
      SELECT
        COUNT(*) AS total_anuladas,
        COALESCE(SUM(total), 0) AS monto_anulado
      FROM facturas
      WHERE fecha_emision = ? AND estado = 'ANULADA'
    `, [fecha]);

    // 5. Desglose por forma de pago facturada
    const [porFormaPago] = await db.query(`
      SELECT forma_pago, COUNT(*) AS cantidad, COALESCE(SUM(total), 0) AS total
      FROM facturas
      WHERE fecha_emision = ? AND estado = 'EMITIDA'
      GROUP BY forma_pago
    `, [fecha]);

    // 6. Lista de facturas emitidas en el día
    const [facturas] = await db.query(`
      SELECT
        f.id, f.numero, f.fecha_emision, f.subtotal_0, f.iva, f.total,
        f.forma_pago, f.estado, f.motivo_anulacion,
        cf.identificacion AS cliente_identificacion,
        cf.razon_social AS cliente_razon_social,
        CONCAT(e.apellidos, ' ', e.nombres) AS estudiante_nombre
      FROM facturas f
      JOIN clientes_facturacion cf ON cf.id = f.cliente_id
      LEFT JOIN estudiantes e ON e.id_estudiante = f.estudiante_id
      WHERE f.fecha_emision = ?
      ORDER BY f.id ASC
    `, [fecha]);

    // 7. Pagos cobrados en esa fecha que están sin facturar
    const [pagosSinFacturar] = await db.query(`
      SELECT
        pp.id AS pago_id, pp.numero_recibo, pp.fecha_pago, pp.monto, pp.nota,
        pq.mes, pq.anio_lectivo,
        e.id_estudiante, e.codigo, e.apellidos, e.nombres,
        c.nombre AS curso_nombre, m.paralelo
      FROM pension_pagos pp
      JOIN pension_cuotas pq ON pq.id = pp.cuota_id
      JOIN estudiantes e ON e.id_estudiante = pp.estudiante_id
      JOIN matriculas m ON m.id_matricula = pq.matricula_id
      JOIN cursos c ON c.id_curso = m.id_curso
      WHERE pp.fecha_pago = ? AND pp.anulado = 0 AND pp.factura_id IS NULL
      ORDER BY pp.id ASC
    `, [fecha]);

    const totalCobrado = parseFloat(cobrado.monto_cobrado || 0);
    const totalFacturado = parseFloat(facturado.monto_facturado || 0);
    const diferencia = parseFloat((totalCobrado - totalFacturado).toFixed(2));

    ok(res, {
      fecha,
      institucion,
      cobrado: {
        cantidad: parseInt(cobrado.total_cobros || 0),
        monto: totalCobrado
      },
      facturado: {
        cantidad: parseInt(facturado.total_facturas || 0),
        monto: totalFacturado,
        por_forma_pago: porFormaPago.map(p => ({
          ...p,
          total: parseFloat(p.total)
        }))
      },
      anuladas: {
        cantidad: parseInt(anuladas.total_anuladas || 0),
        monto: parseFloat(anuladas.monto_anulado || 0)
      },
      diferencia: {
        monto: diferencia,
        estado: Math.abs(diferencia) < 0.005 ? 'CUADRADO' : diferencia > 0 ? 'PENDIENTE_FACTURAR' : 'SOBREFACTURADO'
      },
      facturas,
      pagos_sin_facturar: pagosSinFacturar
    });
  } catch (err) {
    srvErr(res, err, 'getCierreFacturacion');
  }
};

// ─────────────────────────────────────────────────────────────
// 8. FACTURACIÓN ELECTRÓNICA SRI (XML Y PROCESAMIENTO)
// ─────────────────────────────────────────────────────────────

const sriService = require('../services/sriElectronicService');

/**
 * GET /facturas/:id/xml
 * Genera y descarga el archivo XML oficial SRI v1.1.0
 */
exports.descargarXmlFactura = async (req, res) => {
  try {
    const { id } = req.params;
    const { xml, factura } = await sriService.getXmlFactura(id);

    const cleanNumero = (factura.numero || `ID_${id}`).replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `factura_${cleanNumero}.xml`;
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(xml);
  } catch (err) {
    srvErr(res, err, 'descargarXmlFactura');
  }
};

/**
 * POST /facturas/:id/sri
 * Procesa, genera la clave de acceso y autoriza la factura en el SRI
 */
exports.procesarSriFactura = async (req, res) => {
  try {
    const { id } = req.params;
    const resultado = await sriService.simularProcesamientoSri(id);
    ok(res, resultado);
  } catch (err) {
    srvErr(res, err, 'procesarSriFactura');
  }
};

