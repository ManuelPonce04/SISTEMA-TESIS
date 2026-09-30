/**
 * ============================================================
 * Controller: Configuración de Pensiones
 * ============================================================
 */
const db = require('../config/db');
const svc = require('../services/pensionesConfigService');

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
const isAdmin = (req) => !!req.usuario?.es_admin;

const badRequest = (res, msg) => res.status(400).json({ success: false, message: msg });
const forbidden  = (res)      => res.status(403).json({ success: false, message: 'Se requieren permisos de administrador.' });
const notFound   = (res, msg) => res.status(404).json({ success: false, message: msg || 'Registro no encontrado.' });
const conflict   = (res, msg, data) => res.status(409).json({ success: false, message: msg, data });
const serverErr  = (res, err) => {
  console.error('[PensionesConfig]', err);
  res.status(500).json({ success: false, message: 'Error interno del servidor.' });
};

// ─────────────────────────────────────────────────────────────
// TARIFAS
// ─────────────────────────────────────────────────────────────

exports.getTarifas = async (req, res) => {
  try {
    const { periodo_lectivo_id, nivel_id, curso_id, estado, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions = [];
    const params = [];

    if (periodo_lectivo_id) { conditions.push('tp.periodo_lectivo_id = ?'); params.push(periodo_lectivo_id); }
    if (nivel_id)           { conditions.push('tp.nivel_id = ?');           params.push(nivel_id); }
    if (curso_id)           { conditions.push('tp.curso_id = ?');           params.push(curso_id); }
    if (estado)             { conditions.push('tp.estado = ?');             params.push(estado); }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const [rows] = await db.query(
      `SELECT tp.*,
              pl.nombre AS periodo_nombre,
              ne.nombre AS nivel_nombre,
              se.nombre AS subnivel_nombre,
              c.nombre  AS curso_nombre
       FROM tarifas_pension tp
       LEFT JOIN periodos_lectivos pl ON tp.periodo_lectivo_id = pl.id
       LEFT JOIN niveles_educativos ne ON tp.nivel_id = ne.id
       LEFT JOIN subniveles_educativos se ON tp.subnivel_id = se.id
       LEFT JOIN cursos c ON tp.curso_id = c.id
       ${where}
       ORDER BY tp.prioridad DESC, tp.mes_desde ASC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM tarifas_pension tp ${where}`,
      params
    );

    res.json({ success: true, tarifas: rows, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) { serverErr(res, err); }
};

exports.getTarifaById = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT tp.*,
              pl.nombre AS periodo_nombre,
              ne.nombre AS nivel_nombre,
              se.nombre AS subnivel_nombre,
              c.nombre  AS curso_nombre
       FROM tarifas_pension tp
       LEFT JOIN periodos_lectivos pl ON tp.periodo_lectivo_id = pl.id
       LEFT JOIN niveles_educativos ne ON tp.nivel_id = ne.id
       LEFT JOIN subniveles_educativos se ON tp.subnivel_id = se.id
       LEFT JOIN cursos c ON tp.curso_id = c.id
       WHERE tp.id = ?`,
      [req.params.id]
    );
    if (!rows.length) return notFound(res, 'Tarifa no encontrada.');
    res.json({ success: true, tarifa: rows[0] });
  } catch (err) { serverErr(res, err); }
};

exports.crearTarifa = async (req, res) => {
  if (!isAdmin(req)) return forbidden(res);
  const conn = await db.getConnection();
  try {
    const { periodo_lectivo_id, nivel_id, subnivel_id, curso_id, valor_mensual, mes_desde, mes_hasta, fecha_desde, fecha_hasta, estado = 'BORRADOR', observacion } = req.body;

    if (!periodo_lectivo_id || !valor_mensual || !mes_desde || !mes_hasta)
      return badRequest(res, 'Faltan campos requeridos: periodo_lectivo_id, valor_mensual, mes_desde, mes_hasta.');
    if (parseFloat(valor_mensual) < 0)
      return badRequest(res, 'El valor mensual no puede ser negativo.');
    if (new Date(mes_desde) > new Date(mes_hasta))
      return badRequest(res, 'mes_desde no puede ser posterior a mes_hasta.');

    // Verificar conflictos
    const conflictos = await svc.detectarConflictoTarifa({ periodo_lectivo_id, nivel_id: nivel_id || null, subnivel_id: subnivel_id || null, curso_id: curso_id || null, mes_desde, mes_hasta });
    if (estado === 'ACTIVA' && conflictos.length > 0)
      return conflict(res, 'Existe conflicto de vigencia con otra tarifa activa de la misma prioridad.', conflictos);

    const prioridad = svc.calcularPrioridadTarifa({ nivel_id, subnivel_id, curso_id });

    await conn.beginTransaction();
    const [result] = await conn.query(
      `INSERT INTO tarifas_pension
         (periodo_lectivo_id, nivel_id, subnivel_id, curso_id, valor_mensual, mes_desde, mes_hasta, fecha_desde, fecha_hasta, prioridad, estado, observacion, creado_por)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [periodo_lectivo_id, nivel_id || null, subnivel_id || null, curso_id || null, valor_mensual, mes_desde, mes_hasta, fecha_desde || null, fecha_hasta || null, prioridad, estado, observacion || null, req.usuario.id]
    );

    await svc.registrarAuditoria(conn, {
      entidad: 'tarifas_pension', entidad_id: result.insertId, accion: 'CREAR',
      datos_despues: req.body, usuario: req.usuario, req,
    });

    await conn.commit();
    res.status(201).json({ success: true, message: 'Tarifa creada correctamente.', id: result.insertId });
  } catch (err) {
    await conn.rollback();
    serverErr(res, err);
  } finally { conn.release(); }
};

exports.actualizarTarifa = async (req, res) => {
  if (!isAdmin(req)) return forbidden(res);
  const conn = await db.getConnection();
  try {
    const { id } = req.params;
    const { valor_mensual, mes_desde, mes_hasta, fecha_desde, fecha_hasta, observacion, motivo } = req.body;

    const [current] = await db.query('SELECT * FROM tarifas_pension WHERE id = ?', [id]);
    if (!current.length) return notFound(res, 'Tarifa no encontrada.');

    const tarifa = current[0];

    await conn.beginTransaction();

    // Si la tarifa estaba activa: cerrar vigencia anterior y crear nueva
    if (tarifa.estado === 'ACTIVA') {
      await conn.query('UPDATE tarifas_pension SET estado = ?, fecha_hasta = CURDATE(), actualizado_por = ? WHERE id = ?',
        ['FINALIZADA', req.usuario.id, id]);

      const prioridad = svc.calcularPrioridadTarifa({ nivel_id: tarifa.nivel_id, subnivel_id: tarifa.subnivel_id, curso_id: tarifa.curso_id });
      const [result] = await conn.query(
        `INSERT INTO tarifas_pension
           (periodo_lectivo_id, nivel_id, subnivel_id, curso_id, valor_mensual, mes_desde, mes_hasta, fecha_desde, fecha_hasta, prioridad, estado, observacion, creado_por)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVA', ?, ?)`,
        [tarifa.periodo_lectivo_id, tarifa.nivel_id, tarifa.subnivel_id, tarifa.curso_id,
          valor_mensual ?? tarifa.valor_mensual, mes_desde ?? tarifa.mes_desde, mes_hasta ?? tarifa.mes_hasta,
          fecha_desde ?? null, fecha_hasta ?? null, prioridad,
          observacion ?? tarifa.observacion, req.usuario.id]
      );

      await svc.registrarAuditoria(conn, {
        entidad: 'tarifas_pension', entidad_id: result.insertId, accion: 'NUEVA_VIGENCIA',
        datos_antes: tarifa, datos_despues: req.body, motivo, usuario: req.usuario, req,
      });
    } else {
      // Tarifa en BORRADOR: actualizar directamente
      await conn.query(
        `UPDATE tarifas_pension SET valor_mensual = ?, mes_desde = ?, mes_hasta = ?, fecha_desde = ?, fecha_hasta = ?, observacion = ?, actualizado_por = ? WHERE id = ?`,
        [valor_mensual ?? tarifa.valor_mensual, mes_desde ?? tarifa.mes_desde, mes_hasta ?? tarifa.mes_hasta,
          fecha_desde ?? null, fecha_hasta ?? null, observacion ?? tarifa.observacion, req.usuario.id, id]
      );

      await svc.registrarAuditoria(conn, {
        entidad: 'tarifas_pension', entidad_id: parseInt(id), accion: 'EDITAR',
        datos_antes: tarifa, datos_despues: req.body, motivo, usuario: req.usuario, req,
      });
    }

    await conn.commit();
    res.json({ success: true, message: 'Tarifa actualizada correctamente.' });
  } catch (err) {
    await conn.rollback();
    serverErr(res, err);
  } finally { conn.release(); }
};

exports.cambiarEstadoTarifa = async (req, res) => {
  if (!isAdmin(req)) return forbidden(res);
  const conn = await db.getConnection();
  try {
    const { id } = req.params;
    const { estado, motivo } = req.body;
    const estadosValidos = ['BORRADOR', 'ACTIVA', 'INACTIVA', 'FINALIZADA'];

    if (!estadosValidos.includes(estado))
      return badRequest(res, `Estado inválido. Valores: ${estadosValidos.join(', ')}`);

    const [current] = await db.query('SELECT * FROM tarifas_pension WHERE id = ?', [id]);
    if (!current.length) return notFound(res);

    const tarifa = current[0];

    // Al activar: verificar conflictos
    if (estado === 'ACTIVA') {
      const conflictos = await svc.detectarConflictoTarifa({
        periodo_lectivo_id: tarifa.periodo_lectivo_id, nivel_id: tarifa.nivel_id,
        subnivel_id: tarifa.subnivel_id, curso_id: tarifa.curso_id,
        mes_desde: tarifa.mes_desde, mes_hasta: tarifa.mes_hasta, excludeId: parseInt(id),
      });
      if (conflictos.length > 0)
        return conflict(res, 'Existe conflicto de vigencia al activar esta tarifa.', conflictos);
    }

    await conn.beginTransaction();
    await conn.query('UPDATE tarifas_pension SET estado = ?, actualizado_por = ? WHERE id = ?', [estado, req.usuario.id, id]);
    await svc.registrarAuditoria(conn, {
      entidad: 'tarifas_pension', entidad_id: parseInt(id), accion: `ESTADO_${estado}`,
      datos_antes: { estado: tarifa.estado }, datos_despues: { estado }, motivo, usuario: req.usuario, req,
    });
    await conn.commit();
    res.json({ success: true, message: `Tarifa cambiada a ${estado}.` });
  } catch (err) {
    await conn.rollback();
    serverErr(res, err);
  } finally { conn.release(); }
};

exports.creacionMasivaTarifas = async (req, res) => {
  if (!isAdmin(req)) return forbidden(res);
  const conn = await db.getConnection();
  try {
    const { periodo_lectivo_id, tarifas } = req.body;
    if (!periodo_lectivo_id || !Array.isArray(tarifas) || tarifas.length === 0)
      return badRequest(res, 'Se requieren periodo_lectivo_id y un array tarifas.');

    await conn.beginTransaction();
    const resultados = [];

    for (const t of tarifas) {
      const conflictos = await svc.detectarConflictoTarifa({
        periodo_lectivo_id, nivel_id: t.nivel_id || null, subnivel_id: t.subnivel_id || null,
        curso_id: t.curso_id || null, mes_desde: t.mes_desde, mes_hasta: t.mes_hasta,
      });
      if (t.estado === 'ACTIVA' && conflictos.length > 0) {
        resultados.push({ nivel_id: t.nivel_id, curso_id: t.curso_id, error: 'CONFLICTO', conflictos });
        continue;
      }

      const prioridad = svc.calcularPrioridadTarifa({ nivel_id: t.nivel_id, subnivel_id: t.subnivel_id, curso_id: t.curso_id });
      const [ins] = await conn.query(
        `INSERT INTO tarifas_pension
           (periodo_lectivo_id, nivel_id, subnivel_id, curso_id, valor_mensual, mes_desde, mes_hasta, fecha_desde, fecha_hasta, prioridad, estado, observacion, creado_por)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [periodo_lectivo_id, t.nivel_id || null, t.subnivel_id || null, t.curso_id || null,
          t.valor_mensual, t.mes_desde, t.mes_hasta, t.fecha_desde || null, t.fecha_hasta || null,
          prioridad, t.estado || 'BORRADOR', t.observacion || null, req.usuario.id]
      );
      resultados.push({ nivel_id: t.nivel_id, curso_id: t.curso_id, id: ins.insertId, estado: 'OK' });
    }

    await svc.registrarAuditoria(conn, {
      entidad: 'tarifas_pension', accion: 'CREACION_MASIVA',
      datos_despues: { periodo_lectivo_id, cantidad: tarifas.length, resultados }, usuario: req.usuario, req,
    });

    await conn.commit();
    res.status(201).json({ success: true, resultados });
  } catch (err) {
    await conn.rollback();
    serverErr(res, err);
  } finally { conn.release(); }
};

exports.copiarPeriodo = async (req, res) => {
  if (!isAdmin(req)) return forbidden(res);
  const conn = await db.getConnection();
  try {
    const { origen_id, destino_id, copiar_meses, copiar_beneficios, excluir_niveles, excluir_cursos } = req.body;
    if (!origen_id || !destino_id) return badRequest(res, 'Se requieren origen_id y destino_id.');

    await conn.beginTransaction();
    const resultado = await svc.copiarConfiguracionPeriodo(conn, {
      origen_id, destino_id, copiar_meses: !!copiar_meses, copiar_beneficios: !!copiar_beneficios,
      excluir_niveles: excluir_niveles || [], excluir_cursos: excluir_cursos || [],
      nuevo_usuario_id: req.usuario.id,
    });

    await svc.registrarAuditoria(conn, {
      entidad: 'tarifas_pension', accion: 'COPIAR_PERIODO',
      datos_despues: { origen_id, destino_id, resultado }, usuario: req.usuario, req,
    });

    await conn.commit();
    res.json({ success: true, resultado });
  } catch (err) {
    await conn.rollback();
    serverErr(res, err);
  } finally { conn.release(); }
};

exports.resolverTarifa = async (req, res) => {
  try {
    const { periodo_lectivo_id, nivel_id, subnivel_id, curso_id, mes } = req.query;
    if (!periodo_lectivo_id || !mes) return badRequest(res, 'Se requieren periodo_lectivo_id y mes.');

    const resultado = await svc.resolverTarifaPension({
      periodo_lectivo_id: parseInt(periodo_lectivo_id),
      nivel_id: nivel_id ? parseInt(nivel_id) : null,
      subnivel_id: subnivel_id ? parseInt(subnivel_id) : null,
      curso_id: curso_id ? parseInt(curso_id) : null,
      mes,
    });

    if (resultado.conflicto)
      return conflict(res, 'Conflicto de tarifas activas.', resultado.tarifas);

    res.json({ success: true, ...resultado });
  } catch (err) { serverErr(res, err); }
};

// ─────────────────────────────────────────────────────────────
// MESES COBRABLES
// ─────────────────────────────────────────────────────────────

exports.getMeses = async (req, res) => {
  try {
    const { periodo_lectivo_id, estado } = req.query;
    const conditions = [];
    const params = [];
    if (periodo_lectivo_id) { conditions.push('pmc.periodo_lectivo_id = ?'); params.push(periodo_lectivo_id); }
    if (estado)             { conditions.push('pmc.estado = ?');             params.push(estado); }
    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const [rows] = await db.query(
      `SELECT pmc.*, pl.nombre AS periodo_nombre
       FROM periodo_meses_cobrables pmc
       LEFT JOIN periodos_lectivos pl ON pmc.periodo_lectivo_id = pl.id
       ${where}
       ORDER BY pmc.numero_orden ASC`,
      params
    );
    res.json({ success: true, meses: rows });
  } catch (err) { serverErr(res, err); }
};

exports.crearMes = async (req, res) => {
  if (!isAdmin(req)) return forbidden(res);
  const conn = await db.getConnection();
  try {
    const { periodo_lectivo_id, mes, nombre_mostrar, numero_orden, fecha_vencimiento, cobrable = true, observacion } = req.body;
    if (!periodo_lectivo_id || !mes || !fecha_vencimiento) return badRequest(res, 'Faltan campos requeridos.');

    await conn.beginTransaction();
    const [result] = await conn.query(
      `INSERT INTO periodo_meses_cobrables (periodo_lectivo_id, mes, nombre_mostrar, numero_orden, fecha_vencimiento, cobrable, observacion) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [periodo_lectivo_id, mes, nombre_mostrar || mes, numero_orden || 1, fecha_vencimiento, cobrable, observacion || null]
    );
    await svc.registrarAuditoria(conn, { entidad: 'periodo_meses_cobrables', entidad_id: result.insertId, accion: 'CREAR', datos_despues: req.body, usuario: req.usuario, req });
    await conn.commit();
    res.status(201).json({ success: true, message: 'Mes creado.', id: result.insertId });
  } catch (err) {
    await conn.rollback();
    if (err.code === 'ER_DUP_ENTRY') return conflict(res, 'Ya existe un mes cobrable para ese periodo y fecha.');
    serverErr(res, err);
  } finally { conn.release(); }
};

exports.generarMeses = async (req, res) => {
  if (!isAdmin(req)) return forbidden(res);
  const conn = await db.getConnection();
  try {
    const { periodo_lectivo_id, mes_desde, mes_hasta, dia_vencimiento, politica_vencimiento = 'DIA_FIJO', meses_excluidos = [] } = req.body;
    if (!periodo_lectivo_id || !mes_desde || !mes_hasta || !dia_vencimiento)
      return badRequest(res, 'Se requieren: periodo_lectivo_id, mes_desde, mes_hasta, dia_vencimiento.');

    await conn.beginTransaction();
    const meses = await svc.generarMesesCobrables(conn, { periodo_lectivo_id, mes_desde, mes_hasta, dia_vencimiento: parseInt(dia_vencimiento), politica_vencimiento, meses_excluidos });
    await svc.registrarAuditoria(conn, { entidad: 'periodo_meses_cobrables', accion: 'GENERAR_MASIVO', datos_despues: { periodo_lectivo_id, meses }, usuario: req.usuario, req });
    await conn.commit();

    const insertados = meses.filter(m => m.insertado).length;
    const omitidos = meses.filter(m => !m.insertado).length;
    res.json({ success: true, message: `${insertados} meses generados, ${omitidos} ya existían.`, meses });
  } catch (err) {
    await conn.rollback();
    serverErr(res, err);
  } finally { conn.release(); }
};

exports.actualizarMes = async (req, res) => {
  if (!isAdmin(req)) return forbidden(res);
  const conn = await db.getConnection();
  try {
    const { id } = req.params;
    const { fecha_vencimiento, cobrable, observacion, nombre_mostrar } = req.body;
    const [current] = await db.query('SELECT * FROM periodo_meses_cobrables WHERE id = ?', [id]);
    if (!current.length) return notFound(res);

    await conn.beginTransaction();
    await conn.query(
      'UPDATE periodo_meses_cobrables SET fecha_vencimiento = ?, cobrable = ?, observacion = ?, nombre_mostrar = ? WHERE id = ?',
      [fecha_vencimiento ?? current[0].fecha_vencimiento, cobrable ?? current[0].cobrable, observacion ?? null, nombre_mostrar ?? current[0].nombre_mostrar, id]
    );
    await svc.registrarAuditoria(conn, { entidad: 'periodo_meses_cobrables', entidad_id: parseInt(id), accion: 'EDITAR', datos_antes: current[0], datos_despues: req.body, usuario: req.usuario, req });
    await conn.commit();
    res.json({ success: true, message: 'Mes actualizado.' });
  } catch (err) { await conn.rollback(); serverErr(res, err); } finally { conn.release(); }
};

exports.cambiarEstadoMes = async (req, res) => {
  if (!isAdmin(req)) return forbidden(res);
  const conn = await db.getConnection();
  try {
    const { id } = req.params;
    const { estado } = req.body;
    const validos = ['PLANIFICADO', 'ABIERTO', 'CERRADO', 'CANCELADO'];
    if (!validos.includes(estado)) return badRequest(res, `Estado inválido. Valores: ${validos.join(', ')}`);

    await conn.beginTransaction();
    await conn.query('UPDATE periodo_meses_cobrables SET estado = ? WHERE id = ?', [estado, id]);
    await svc.registrarAuditoria(conn, { entidad: 'periodo_meses_cobrables', entidad_id: parseInt(id), accion: `ESTADO_${estado}`, datos_despues: { estado }, usuario: req.usuario, req });
    await conn.commit();
    res.json({ success: true, message: `Mes cambiado a ${estado}.` });
  } catch (err) { await conn.rollback(); serverErr(res, err); } finally { conn.release(); }
};

// ─────────────────────────────────────────────────────────────
// BENEFICIOS
// ─────────────────────────────────────────────────────────────

exports.getBeneficios = async (req, res) => {
  try {
    const { categoria, tipo_calculo, activo } = req.query;
    const conditions = [];
    const params = [];
    if (categoria)    { conditions.push('categoria = ?');    params.push(categoria); }
    if (tipo_calculo) { conditions.push('tipo_calculo = ?'); params.push(tipo_calculo); }
    if (activo !== undefined && activo !== '') { conditions.push('activo = ?'); params.push(activo === 'true' || activo === '1' ? 1 : 0); }
    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const [rows] = await db.query(`SELECT * FROM tipos_beneficio_pension ${where} ORDER BY prioridad DESC, nombre ASC`, params);
    res.json({ success: true, beneficios: rows });
  } catch (err) { serverErr(res, err); }
};

exports.getBeneficioById = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM tipos_beneficio_pension WHERE id = ?', [req.params.id]);
    if (!rows.length) return notFound(res, 'Beneficio no encontrado.');
    res.json({ success: true, beneficio: rows[0] });
  } catch (err) { serverErr(res, err); }
};

exports.crearBeneficio = async (req, res) => {
  if (!isAdmin(req)) return forbidden(res);
  const conn = await db.getConnection();
  try {
    const { codigo, nombre, descripcion, categoria, tipo_calculo, valor_predeterminado, porcentaje_predeterminado, requiere_documento, requiere_autorizacion, permite_acumulacion, prioridad } = req.body;
    if (!codigo || !nombre || !categoria || !tipo_calculo) return badRequest(res, 'Faltan campos: codigo, nombre, categoria, tipo_calculo.');

    const categoriasValidas = ['BECA', 'DESCUENTO', 'PENSION_DIFERENCIADA', 'EXONERACION', 'CONVENIO', 'OTRO'];
    const calculosValidos = ['PORCENTAJE', 'VALOR_FIJO', 'VALOR_FINAL', 'EXONERACION_TOTAL'];
    if (!categoriasValidas.includes(categoria)) return badRequest(res, `Categoría inválida. Valores: ${categoriasValidas.join(', ')}`);
    if (!calculosValidos.includes(tipo_calculo)) return badRequest(res, `tipo_calculo inválido. Valores: ${calculosValidos.join(', ')}`);

    await conn.beginTransaction();
    const [result] = await conn.query(
      `INSERT INTO tipos_beneficio_pension (codigo, nombre, descripcion, categoria, tipo_calculo, valor_predeterminado, porcentaje_predeterminado, requiere_documento, requiere_autorizacion, permite_acumulacion, prioridad)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [codigo, nombre, descripcion || null, categoria, tipo_calculo, valor_predeterminado ?? null, porcentaje_predeterminado ?? null, !!requiere_documento, requiere_autorizacion !== false, !!permite_acumulacion, prioridad || 0]
    );
    await svc.registrarAuditoria(conn, { entidad: 'tipos_beneficio_pension', entidad_id: result.insertId, accion: 'CREAR', datos_despues: req.body, usuario: req.usuario, req });
    await conn.commit();
    res.status(201).json({ success: true, message: 'Beneficio creado.', id: result.insertId });
  } catch (err) {
    await conn.rollback();
    if (err.code === 'ER_DUP_ENTRY') return conflict(res, 'Ya existe un beneficio con ese código.');
    serverErr(res, err);
  } finally { conn.release(); }
};

exports.actualizarBeneficio = async (req, res) => {
  if (!isAdmin(req)) return forbidden(res);
  const conn = await db.getConnection();
  try {
    const { id } = req.params;
    const [current] = await db.query('SELECT * FROM tipos_beneficio_pension WHERE id = ?', [id]);
    if (!current.length) return notFound(res, 'Beneficio no encontrado.');

    const c = current[0];
    const { nombre, descripcion, categoria, tipo_calculo, valor_predeterminado, porcentaje_predeterminado, requiere_documento, requiere_autorizacion, permite_acumulacion, prioridad } = req.body;

    await conn.beginTransaction();
    await conn.query(
      `UPDATE tipos_beneficio_pension SET nombre = ?, descripcion = ?, categoria = ?, tipo_calculo = ?, valor_predeterminado = ?, porcentaje_predeterminado = ?, requiere_documento = ?, requiere_autorizacion = ?, permite_acumulacion = ?, prioridad = ? WHERE id = ?`,
      [nombre ?? c.nombre, descripcion ?? c.descripcion, categoria ?? c.categoria, tipo_calculo ?? c.tipo_calculo, valor_predeterminado ?? null, porcentaje_predeterminado ?? null, requiere_documento !== undefined ? !!requiere_documento : c.requiere_documento, requiere_autorizacion !== undefined ? !!requiere_autorizacion : c.requiere_autorizacion, permite_acumulacion !== undefined ? !!permite_acumulacion : c.permite_acumulacion, prioridad ?? c.prioridad, id]
    );
    await svc.registrarAuditoria(conn, { entidad: 'tipos_beneficio_pension', entidad_id: parseInt(id), accion: 'EDITAR', datos_antes: c, datos_despues: req.body, usuario: req.usuario, req });
    await conn.commit();
    res.json({ success: true, message: 'Beneficio actualizado.' });
  } catch (err) { await conn.rollback(); serverErr(res, err); } finally { conn.release(); }
};

exports.cambiarEstadoBeneficio = async (req, res) => {
  if (!isAdmin(req)) return forbidden(res);
  const conn = await db.getConnection();
  try {
    const { id } = req.params;
    const { activo } = req.body;
    await conn.beginTransaction();
    await conn.query('UPDATE tipos_beneficio_pension SET activo = ? WHERE id = ?', [!!activo, id]);
    await svc.registrarAuditoria(conn, { entidad: 'tipos_beneficio_pension', entidad_id: parseInt(id), accion: activo ? 'ACTIVAR' : 'DESACTIVAR', datos_despues: { activo }, usuario: req.usuario, req });
    await conn.commit();
    res.json({ success: true, message: `Beneficio ${activo ? 'activado' : 'desactivado'}.` });
  } catch (err) { await conn.rollback(); serverErr(res, err); } finally { conn.release(); }
};

// ─────────────────────────────────────────────────────────────
// COMPATIBILIDADES
// ─────────────────────────────────────────────────────────────

exports.getCompatibilidades = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query(
      `SELECT bc.*, t1.nombre AS beneficio_nombre, t2.nombre AS relacionado_nombre
       FROM beneficio_compatibilidades bc
       JOIN tipos_beneficio_pension t1 ON bc.beneficio_id = t1.id
       JOIN tipos_beneficio_pension t2 ON bc.beneficio_relacionado_id = t2.id
       WHERE bc.beneficio_id = ? OR bc.beneficio_relacionado_id = ?`,
      [id, id]
    );
    res.json({ success: true, compatibilidades: rows });
  } catch (err) { serverErr(res, err); }
};

exports.actualizarCompatibilidades = async (req, res) => {
  if (!isAdmin(req)) return forbidden(res);
  const conn = await db.getConnection();
  try {
    const { id } = req.params;
    const { compatibilidades } = req.body; // [{ beneficio_relacionado_id, son_compatibles, observacion }]
    if (!Array.isArray(compatibilidades)) return badRequest(res, 'Se requiere array compatibilidades.');

    await conn.beginTransaction();
    for (const c of compatibilidades) {
      await conn.query(
        `INSERT INTO beneficio_compatibilidades (beneficio_id, beneficio_relacionado_id, son_compatibles, observacion)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE son_compatibles = VALUES(son_compatibles), observacion = VALUES(observacion)`,
        [parseInt(id), c.beneficio_relacionado_id, !!c.son_compatibles, c.observacion || null]
      );
    }
    await svc.registrarAuditoria(conn, { entidad: 'beneficio_compatibilidades', entidad_id: parseInt(id), accion: 'ACTUALIZAR', datos_despues: { compatibilidades }, usuario: req.usuario, req });
    await conn.commit();
    res.json({ success: true, message: 'Compatibilidades actualizadas.' });
  } catch (err) { await conn.rollback(); serverErr(res, err); } finally { conn.release(); }
};

// ─────────────────────────────────────────────────────────────
// SIMULADOR
// ─────────────────────────────────────────────────────────────

exports.simularPension = async (req, res) => {
  try {
    const { periodo_lectivo_id, nivel_id, subnivel_id, curso_id, mes, beneficio_ids } = req.body;
    if (!periodo_lectivo_id || !mes) return badRequest(res, 'Se requieren periodo_lectivo_id y mes.');

    const resultado = await svc.simularPension({
      periodo_lectivo_id: parseInt(periodo_lectivo_id),
      nivel_id: nivel_id ? parseInt(nivel_id) : null,
      subnivel_id: subnivel_id ? parseInt(subnivel_id) : null,
      curso_id: curso_id ? parseInt(curso_id) : null,
      mes,
      beneficio_ids: Array.isArray(beneficio_ids) ? beneficio_ids.map(Number) : [],
    });

    if (resultado.error) return res.status(409).json({ success: false, ...resultado });
    res.json({ success: true, simulacion: resultado });
  } catch (err) { serverErr(res, err); }
};

// ─────────────────────────────────────────────────────────────
// CONFIGURACIÓN FINANCIERA
// ─────────────────────────────────────────────────────────────

exports.getConfigFinanciera = async (req, res) => {
  try {
    const { periodo_lectivo_id } = req.query;
    const [rows] = await db.query(
      `SELECT cfp.*, cm.nombre AS movimiento_nombre, cm.codigo AS movimiento_codigo
       FROM configuracion_financiera_pensiones cfp
       LEFT JOIN catalogo_movimientos cm ON cfp.catalogo_movimiento_id = cm.id
       WHERE cfp.periodo_lectivo_id IS NULL OR cfp.periodo_lectivo_id = ?
       ORDER BY cfp.tipo_operacion`,
      [periodo_lectivo_id || null]
    );
    res.json({ success: true, configuracion: rows });
  } catch (err) { serverErr(res, err); }
};

exports.actualizarConfigFinanciera = async (req, res) => {
  if (!isAdmin(req)) return forbidden(res);
  const conn = await db.getConnection();
  try {
    const { items } = req.body; // [{ id, catalogo_movimiento_id, activo, observacion }]
    if (!Array.isArray(items)) return badRequest(res, 'Se requiere array items.');

    await conn.beginTransaction();
    for (const item of items) {
      await conn.query(
        'UPDATE configuracion_financiera_pensiones SET catalogo_movimiento_id = ?, activo = ?, observacion = ? WHERE id = ?',
        [item.catalogo_movimiento_id || null, item.activo !== false, item.observacion || null, item.id]
      );
    }
    await svc.registrarAuditoria(conn, { entidad: 'configuracion_financiera_pensiones', accion: 'ACTUALIZAR', datos_despues: { items }, usuario: req.usuario, req });
    await conn.commit();
    res.json({ success: true, message: 'Configuración financiera actualizada.' });
  } catch (err) { await conn.rollback(); serverErr(res, err); } finally { conn.release(); }
};

// ─────────────────────────────────────────────────────────────
// CATÁLOGOS DE APOYO (periodos, niveles, cursos para los selects)
// ─────────────────────────────────────────────────────────────

exports.getCatalogosApoyo = async (req, res) => {
  try {
    const [[periodos], [niveles], [subniveles], [cursos]] = await Promise.all([
      db.query('SELECT id, nombre, codigo, es_activo FROM periodos_lectivos ORDER BY nombre DESC'),
      db.query('SELECT id, nombre, codigo FROM niveles_educativos WHERE activo = TRUE ORDER BY nombre'),
      db.query('SELECT id, nombre, nivel_id FROM subniveles_educativos WHERE activo = TRUE ORDER BY nombre'),
      db.query('SELECT id, nombre, nivel_id, subnivel_id FROM cursos WHERE activo = TRUE ORDER BY nombre'),
    ]);
    res.json({ success: true, periodos, niveles, subniveles, cursos });
  } catch (err) { serverErr(res, err); }
};

exports.getAuditoria = async (req, res) => {
  if (!isAdmin(req)) return forbidden(res);
  try {
    const { entidad, page = 1, limit = 30 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const where = entidad ? 'WHERE entidad = ?' : '';
    const params = entidad ? [entidad] : [];
    const [rows] = await db.query(
      `SELECT * FROM auditoria_pensiones ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );
    res.json({ success: true, auditoria: rows });
  } catch (err) { serverErr(res, err); }
};
