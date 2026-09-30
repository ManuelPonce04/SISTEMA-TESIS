/**
 * ============================================================
 * Controller: Asignación Individual de Pensión
 * ============================================================
 */
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const db = require('../config/db');
const svc = require('../services/asignacionPensionService');
const { simularPension, verificarCompatibilidades } = require('../services/pensionesConfigService');

// ─────────────────────────────────────────────────────────────
// MULTER — subida de documentos
// ─────────────────────────────────────────────────────────────
const UPLOAD_DIR = path.join(__dirname, '../uploads/asignaciones');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uuid = crypto.randomBytes(16).toString('hex');
    cb(null, `${uuid}${ext}`);
  },
});
const fileFilter = (req, file, cb) => {
  const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
  const allowedExt = ['.pdf', '.jpg', '.jpeg', '.png'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(file.mimetype) && allowedExt.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de archivo no permitido. Solo PDF, JPG, JPEG, PNG.'));
  }
};
const upload = multer({ storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } }); // 10 MB

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
const isAdmin = (req) => !!req.usuario?.es_admin;
const badRequest = (res, msg) => res.status(400).json({ success: false, message: msg });
const forbidden  = (res)      => res.status(403).json({ success: false, message: 'Se requieren permisos de administrador.' });
const notFound   = (res, msg) => res.status(404).json({ success: false, message: msg || 'Registro no encontrado.' });
const conflict   = (res, msg, data) => res.status(409).json({ success: false, message: msg, data });
const serverErr  = (res, err) => { console.error('[AsignacionPension]', err); res.status(500).json({ success: false, message: err.message || 'Error interno del servidor.' }); };

// SELECT base para asignaciones
const SELECT_ASIGNACION = `
  SELECT ap.*,
         m.numero_matricula, m.estado AS matricula_estado,
         e.nombres AS est_nombres, e.apellidos AS est_apellidos,
         e.cedula AS est_cedula, e.codigo AS est_codigo,
         c.nombre AS curso_nombre, par.nombre AS paralelo_nombre,
         pl.nombre AS periodo_nombre,
         rp.nombres AS rep_nombres, rp.apellidos AS rep_apellidos,
         re.nombres AS resp_nombres, re.apellidos AS resp_apellidos,
         ne.nombre AS nivel_nombre
  FROM asignaciones_pension ap
  JOIN matriculas m ON ap.matricula_id = m.id
  JOIN estudiantes e ON m.estudiante_id = e.id_estudiante
  JOIN oferta_academica o ON m.oferta_academica_id = o.id
  JOIN cursos c ON o.curso_id = c.id
  JOIN paralelos par ON o.paralelo_id = par.id
  JOIN periodos_lectivos pl ON ap.periodo_lectivo_id = pl.id
  LEFT JOIN representantes rp ON m.representante_principal_id = rp.id_representante
  LEFT JOIN representantes re ON m.responsable_economico_id = re.id_representante
  LEFT JOIN niveles_educativos ne ON c.nivel_id = ne.id
`;

// ─────────────────────────────────────────────────────────────
// LISTADO CON FILTROS Y PAGINACIÓN
// ─────────────────────────────────────────────────────────────
exports.getAsignaciones = async (req, res) => {
  try {
    const { periodo_lectivo_id, curso_id, nivel_id, paralelo_id, estado, search, con_beneficio, sin_asignacion, page = 1, limit = 30 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions = ['1=1'];
    const params = [];

    if (periodo_lectivo_id) { conditions.push('ap.periodo_lectivo_id = ?'); params.push(periodo_lectivo_id); }
    if (curso_id)           { conditions.push('c.id = ?');                  params.push(curso_id); }
    if (nivel_id)           { conditions.push('c.nivel_id = ?');            params.push(nivel_id); }
    if (paralelo_id)        { conditions.push('par.id = ?');                params.push(paralelo_id); }
    if (estado)             { conditions.push('ap.estado = ?');             params.push(estado); }
    if (search) {
      conditions.push('(e.nombres LIKE ? OR e.apellidos LIKE ? OR e.cedula LIKE ? OR e.codigo LIKE ? OR m.numero_matricula LIKE ?)');
      const s = `%${search}%`;
      params.push(s, s, s, s, s);
    }

    const where = 'WHERE ' + conditions.join(' AND ');
    const [rows] = await db.query(`${SELECT_ASIGNACION} ${where} ORDER BY ap.created_at DESC LIMIT ? OFFSET ?`, [...params, parseInt(limit), offset]);
    const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM asignaciones_pension ap JOIN matriculas m ON ap.matricula_id = m.id JOIN estudiantes e ON m.estudiante_id = e.id_estudiante JOIN oferta_academica o ON m.oferta_academica_id = o.id JOIN cursos c ON o.curso_id = c.id JOIN paralelos par ON o.paralelo_id = par.id ${where}`, params);

    // Añadir beneficios de cada asignación (summary)
    for (const row of rows) {
      const [bens] = await db.query(`SELECT tb.nombre, tb.categoria, apb.porcentaje_aplicado, apb.valor_aplicado FROM asignacion_pension_beneficios apb JOIN tipos_beneficio_pension tb ON apb.tipo_beneficio_id = tb.id WHERE apb.asignacion_pension_id = ? AND apb.estado = 'ACTIVO'`, [row.id]);
      row.beneficios_resumen = bens;
    }

    res.json({ success: true, asignaciones: rows, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) { serverErr(res, err); }
};

// ─────────────────────────────────────────────────────────────
// DETALLE POR ID
// ─────────────────────────────────────────────────────────────
exports.getAsignacionById = async (req, res) => {
  try {
    const [rows] = await db.query(`${SELECT_ASIGNACION} WHERE ap.id = ?`, [req.params.id]);
    if (!rows.length) return notFound(res, 'Asignación no encontrada.');
    const ap = rows[0];

    const [beneficios] = await db.query(`SELECT apb.*, tb.nombre AS beneficio_nombre, tb.categoria, tb.codigo FROM asignacion_pension_beneficios apb JOIN tipos_beneficio_pension tb ON apb.tipo_beneficio_id = tb.id WHERE apb.asignacion_pension_id = ? ORDER BY apb.prioridad_snapshot DESC`, [ap.id]);
    const [documentos] = await db.query(`SELECT id, tipo_documento, nombre_original, mime_type, tamano_bytes, created_at FROM asignacion_pension_documentos WHERE asignacion_pension_id = ? ORDER BY created_at DESC`, [ap.id]);
    const [historial] = await db.query(`SELECT * FROM historial_asignacion_pension WHERE asignacion_pension_id = ? ORDER BY created_at DESC`, [ap.id]);

    res.json({ success: true, asignacion: { ...ap, beneficios, documentos, historial } });
  } catch (err) { serverErr(res, err); }
};

// ─────────────────────────────────────────────────────────────
// CREAR ASIGNACIÓN
// ─────────────────────────────────────────────────────────────
exports.crearAsignacion = async (req, res) => {
  const conn = await db.getConnection();
  try {
    const { matricula_id, mes_desde, mes_hasta, tarifa_pension_id, motivo, observacion, beneficios = [] } = req.body;
    if (!matricula_id || !mes_desde || !mes_hasta) return badRequest(res, 'Faltan campos: matricula_id, mes_desde, mes_hasta.');

    // Validar matrícula
    const [matRows] = await db.query('SELECT * FROM matriculas WHERE id = ?', [matricula_id]);
    if (!matRows.length) return notFound(res, 'Matrícula no encontrada.');
    const mat = matRows[0];
    if (!svc.MATRICULA_ESTADOS_PERMITIDOS.includes(mat.estado)) return badRequest(res, `Estado de matrícula "${mat.estado}" no permite asignación de pensión.`);

    // Detectar solapamiento
    const solapadas = await svc.detectarSolapamiento(matricula_id, mes_desde, mes_hasta);
    if (solapadas.length > 0) return conflict(res, 'Existe una asignación activa que se solapa con la vigencia indicada.', solapadas);

    // Resolver tarifa
    const resolucion = await svc.resolverTarifaParaMatricula(matricula_id, mes_desde);
    if (resolucion.error) return badRequest(res, 'No se pudo obtener el contexto de la matrícula.');
    if (resolucion.conflicto) return conflict(res, 'Conflicto de tarifas activas.', resolucion.tarifas);
    if (!resolucion.tarifa && !tarifa_pension_id) return badRequest(res, 'No se encontró tarifa activa para este contexto. Configure una tarifa antes de asignar.');

    const tarifa = resolucion.tarifa;
    const tarifaIdFinal = tarifa_pension_id || tarifa.id;
    const tarifaBase = tarifa ? parseFloat(tarifa.valor_mensual) : 0;

    // Verificar compatibilidades de beneficios
    if (beneficios.length > 1) {
      const ids = beneficios.map(b => b.tipo_beneficio_id);
      const compat = await verificarCompatibilidades(ids);
      if (!compat.compatible) return conflict(res, 'Existen beneficios incompatibles seleccionados.', compat.incompatibles);
    }

    // Calcular valor final
    const calculo = svc.calcularValorFinalConBeneficios(tarifaBase, beneficios.map(b => ({
      tipo_calculo_snapshot: b.tipo_calculo_snapshot,
      porcentaje_aplicado: b.porcentaje_aplicado,
      valor_aplicado: b.valor_aplicado,
      valor_final_especial: b.valor_final_especial,
      prioridad_snapshot: b.prioridad_snapshot || 0,
      nombre: b.nombre || '',
    })));

    await conn.beginTransaction();
    const id = await svc.crearAsignacion(conn, {
      matriculaId: matricula_id,
      periodoId: mat.periodo_lectivo_id,
      tarifaId: tarifaIdFinal,
      mesDesde: mes_desde, mesHasta: mes_hasta,
      tarifaBaseSnapshot: tarifaBase,
      descuentoTotalSnapshot: (calculo.monto_descuento_pct || 0) + (calculo.descuento_fijo || 0),
      valorMensualFinal: calculo.valor_final,
      reglaTarifaSnapshot: null,
      motivo, observacion,
      beneficios: beneficios.map(b => ({
        tipo_beneficio_id: b.tipo_beneficio_id,
        tipo_calculo_snapshot: b.tipo_calculo_snapshot,
        porcentaje_aplicado: b.porcentaje_aplicado ?? null,
        valor_aplicado: b.valor_aplicado ?? null,
        valor_final_especial: b.valor_final_especial ?? null,
        prioridad_snapshot: b.prioridad_snapshot || 0,
        mes_desde: b.mes_desde || mes_desde,
        mes_hasta: b.mes_hasta || mes_hasta,
        motivo: b.motivo || motivo || '',
        requiere_documento_snapshot: !!b.requiere_documento_snapshot,
      })),
    }, req.usuario, req);
    await conn.commit();
    res.status(201).json({ success: true, message: 'Asignación creada en estado BORRADOR.', id });
  } catch (err) { await conn.rollback(); serverErr(res, err); }
  finally { conn.release(); }
};

// ─────────────────────────────────────────────────────────────
// ACTUALIZAR BORRADOR
// ─────────────────────────────────────────────────────────────
exports.actualizarBorrador = async (req, res) => {
  const conn = await db.getConnection();
  try {
    const { id } = req.params;
    const [rows] = await db.query('SELECT * FROM asignaciones_pension WHERE id = ?', [id]);
    if (!rows.length) return notFound(res);
    if (rows[0].estado !== 'BORRADOR') return badRequest(res, 'Solo se pueden editar asignaciones en estado BORRADOR.');

    const { mes_desde, mes_hasta, motivo, observacion, beneficios } = req.body;

    await conn.beginTransaction();
    await conn.query(`UPDATE asignaciones_pension SET mes_desde = ?, mes_hasta = ?, motivo = ?, observacion = ?, actualizado_por = ? WHERE id = ?`,
      [mes_desde || rows[0].mes_desde, mes_hasta || rows[0].mes_hasta, motivo || null, observacion || null, req.usuario.id, id]);

    if (Array.isArray(beneficios)) {
      // Eliminar beneficios actuales y recrear
      await conn.query(`DELETE FROM asignacion_pension_beneficios WHERE asignacion_pension_id = ?`, [id]);
      for (const b of beneficios) {
        await conn.query(`INSERT INTO asignacion_pension_beneficios (asignacion_pension_id, tipo_beneficio_id, tipo_calculo_snapshot, porcentaje_aplicado, valor_aplicado, valor_final_especial, prioridad_snapshot, mes_desde, mes_hasta, motivo, requiere_documento_snapshot) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, b.tipo_beneficio_id, b.tipo_calculo_snapshot, b.porcentaje_aplicado ?? null, b.valor_aplicado ?? null, b.valor_final_especial ?? null, b.prioridad_snapshot || 0, b.mes_desde || mes_desde || rows[0].mes_desde, b.mes_hasta || mes_hasta || rows[0].mes_hasta, b.motivo || '', !!b.requiere_documento_snapshot]);
      }

      // Recalcular valor
      const tarifaBase = parseFloat(rows[0].tarifa_base_snapshot);
      const calculo = svc.calcularValorFinalConBeneficios(tarifaBase, beneficios);
      await conn.query(`UPDATE asignaciones_pension SET valor_mensual_final = ?, descuento_total_snapshot = ? WHERE id = ?`,
        [calculo.valor_final, (calculo.monto_descuento_pct || 0) + (calculo.descuento_fijo || 0), id]);
    }

    await svc.registrarHistorial(conn, { asignacion_pension_id: parseInt(id), accion: 'EDITAR', estado_anterior: 'BORRADOR', estado_nuevo: 'BORRADOR', datos_nuevos: req.body, usuario: req.usuario });
    await conn.commit();
    res.json({ success: true, message: 'Borrador actualizado.' });
  } catch (err) { await conn.rollback(); serverErr(res, err); }
  finally { conn.release(); }
};

// ─────────────────────────────────────────────────────────────
// TRANSICIONES DE ESTADO
// ─────────────────────────────────────────────────────────────
exports.enviarAprobacion = async (req, res) => {
  const conn = await db.getConnection();
  try {
    const { id } = req.params;
    const [rows] = await db.query('SELECT * FROM asignaciones_pension WHERE id = ?', [id]);
    if (!rows.length) return notFound(res);
    if (!['BORRADOR', 'RECHAZADA'].includes(rows[0].estado)) return badRequest(res, `Estado "${rows[0].estado}" no permite envío a aprobación.`);

    await conn.beginTransaction();
    await conn.query(`UPDATE asignaciones_pension SET estado = 'PENDIENTE_APROBACION', solicitado_por = ?, solicitado_at = NOW(), actualizado_por = ? WHERE id = ?`, [req.usuario.id, req.usuario.id, id]);
    await svc.registrarHistorial(conn, { asignacion_pension_id: parseInt(id), accion: 'ENVIAR_APROBACION', estado_anterior: rows[0].estado, estado_nuevo: 'PENDIENTE_APROBACION', usuario: req.usuario });
    await conn.commit();
    res.json({ success: true, message: 'Asignación enviada a aprobación.' });
  } catch (err) { await conn.rollback(); serverErr(res, err); }
  finally { conn.release(); }
};

exports.aprobarAsignacion = async (req, res) => {
  if (!isAdmin(req)) return forbidden(res);
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const calculo = await svc.aprobarAsignacion(conn, parseInt(req.params.id), req.usuario, req);
    await conn.commit();
    res.json({ success: true, message: 'Asignación aprobada correctamente.', calculo });
  } catch (err) { await conn.rollback(); if (err.message.includes('faltantes') || err.message.includes('Estado')) { res.status(400).json({ success: false, message: err.message }); } else serverErr(res, err); }
  finally { conn.release(); }
};

exports.rechazarAsignacion = async (req, res) => {
  if (!isAdmin(req)) return forbidden(res);
  const conn = await db.getConnection();
  try {
    const { motivo } = req.body;
    if (!motivo?.trim()) return badRequest(res, 'El motivo de rechazo es requerido.');
    await conn.beginTransaction();
    await svc.rechazarAsignacion(conn, parseInt(req.params.id), motivo, req.usuario, req);
    await conn.commit();
    res.json({ success: true, message: 'Asignación rechazada.' });
  } catch (err) { await conn.rollback(); serverErr(res, err); }
  finally { conn.release(); }
};

exports.activarAsignacion = async (req, res) => {
  if (!isAdmin(req)) return forbidden(res);
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    await svc.activarAsignacion(conn, parseInt(req.params.id), req.usuario, req);
    await conn.commit();
    res.json({ success: true, message: 'Asignación activada. Vigencias anteriores cerradas si aplicaban.' });
  } catch (err) { await conn.rollback(); serverErr(res, err); }
  finally { conn.release(); }
};

exports.suspenderAsignacion = async (req, res) => {
  const conn = await db.getConnection();
  try {
    const { motivo } = req.body;
    if (!motivo?.trim()) return badRequest(res, 'El motivo de suspensión es requerido.');
    await conn.beginTransaction();
    await svc.suspenderAsignacion(conn, parseInt(req.params.id), motivo, req.usuario, req);
    await conn.commit();
    res.json({ success: true, message: 'Asignación suspendida.' });
  } catch (err) { await conn.rollback(); serverErr(res, err); }
  finally { conn.release(); }
};

exports.anularAsignacion = async (req, res) => {
  if (!isAdmin(req)) return forbidden(res);
  const conn = await db.getConnection();
  try {
    const { motivo } = req.body;
    if (!motivo?.trim()) return badRequest(res, 'El motivo de anulación es requerido.');
    await conn.beginTransaction();
    await svc.anularAsignacion(conn, parseInt(req.params.id), motivo, req.usuario, req);
    await conn.commit();
    res.json({ success: true, message: 'Asignación anulada.' });
  } catch (err) { await conn.rollback(); serverErr(res, err); }
  finally { conn.release(); }
};

exports.crearNuevaVigencia = async (req, res) => {
  const conn = await db.getConnection();
  try {
    const { id } = req.params;
    const { mes_desde, mes_hasta, motivo, observacion, beneficios = [], tarifa_pension_id } = req.body;
    if (!mes_desde || !mes_hasta) return badRequest(res, 'Se requieren mes_desde y mes_hasta.');

    // Verificar solapamiento antes de crear
    const [rows] = await db.query('SELECT matricula_id FROM asignaciones_pension WHERE id = ?', [id]);
    if (!rows.length) return notFound(res);
    const solapadas = await svc.detectarSolapamiento(rows[0].matricula_id, mes_desde, mes_hasta, parseInt(id));
    const activasSolapadas = solapadas.filter(s => s.estado === 'ACTIVA');
    // Si hay activas distintas al origen, hay un conflicto no manejable automáticamente
    if (activasSolapadas.length > 1) return conflict(res, 'Múltiples vigencias activas solapadas. Resuelva manualmente.', activasSolapadas);

    await conn.beginTransaction();
    const nuevaId = await svc.crearNuevaVigencia(conn, parseInt(id), { mes_desde, mes_hasta, motivo, observacion, beneficios, tarifa_pension_id }, req.usuario, req);
    await conn.commit();
    res.status(201).json({ success: true, message: 'Nueva vigencia creada en BORRADOR.', id: nuevaId });
  } catch (err) { await conn.rollback(); serverErr(res, err); }
  finally { conn.release(); }
};

// ─────────────────────────────────────────────────────────────
// BENEFICIOS
// ─────────────────────────────────────────────────────────────
exports.getBeneficios = async (req, res) => {
  try {
    const [rows] = await db.query(`SELECT apb.*, tb.nombre AS beneficio_nombre, tb.codigo, tb.categoria FROM asignacion_pension_beneficios apb JOIN tipos_beneficio_pension tb ON apb.tipo_beneficio_id = tb.id WHERE apb.asignacion_pension_id = ? ORDER BY apb.prioridad_snapshot DESC`, [req.params.id]);
    res.json({ success: true, beneficios: rows });
  } catch (err) { serverErr(res, err); }
};

exports.addBeneficio = async (req, res) => {
  const conn = await db.getConnection();
  try {
    const { id } = req.params;
    const [asig] = await db.query('SELECT * FROM asignaciones_pension WHERE id = ?', [id]);
    if (!asig.length) return notFound(res);
    if (asig[0].estado !== 'BORRADOR') return badRequest(res, 'Solo se pueden agregar beneficios a asignaciones en BORRADOR.');

    const { tipo_beneficio_id, tipo_calculo_snapshot, porcentaje_aplicado, valor_aplicado, valor_final_especial, prioridad_snapshot, mes_desde, mes_hasta, motivo, requiere_documento_snapshot } = req.body;
    if (!tipo_beneficio_id || !tipo_calculo_snapshot || !motivo) return badRequest(res, 'Faltan campos requeridos.');

    await conn.beginTransaction();
    const [result] = await conn.query(`INSERT INTO asignacion_pension_beneficios (asignacion_pension_id, tipo_beneficio_id, tipo_calculo_snapshot, porcentaje_aplicado, valor_aplicado, valor_final_especial, prioridad_snapshot, mes_desde, mes_hasta, motivo, requiere_documento_snapshot) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, tipo_beneficio_id, tipo_calculo_snapshot, porcentaje_aplicado ?? null, valor_aplicado ?? null, valor_final_especial ?? null, prioridad_snapshot || 0, mes_desde || asig[0].mes_desde, mes_hasta || asig[0].mes_hasta, motivo, !!requiere_documento_snapshot]);

    // Recalcular valor final
    const [todos] = await conn.query('SELECT * FROM asignacion_pension_beneficios WHERE asignacion_pension_id = ? AND estado = ?', [id, 'ACTIVO']);
    const calculo = svc.calcularValorFinalConBeneficios(parseFloat(asig[0].tarifa_base_snapshot), todos);
    await conn.query('UPDATE asignaciones_pension SET valor_mensual_final = ?, descuento_total_snapshot = ? WHERE id = ?', [calculo.valor_final, (calculo.monto_descuento_pct || 0) + (calculo.descuento_fijo || 0), id]);
    await conn.commit();
    res.status(201).json({ success: true, message: 'Beneficio agregado.', id: result.insertId, calculo });
  } catch (err) { await conn.rollback(); serverErr(res, err); }
  finally { conn.release(); }
};

exports.deleteBeneficio = async (req, res) => {
  const conn = await db.getConnection();
  try {
    const { id, beneficioId } = req.params;
    const [asig] = await db.query('SELECT * FROM asignaciones_pension WHERE id = ?', [id]);
    if (!asig.length) return notFound(res);
    if (asig[0].estado !== 'BORRADOR') return badRequest(res, 'Solo se pueden eliminar beneficios en asignaciones BORRADOR.');

    await conn.beginTransaction();
    await conn.query('DELETE FROM asignacion_pension_beneficios WHERE id = ? AND asignacion_pension_id = ?', [beneficioId, id]);

    // Recalcular
    const [todos] = await conn.query('SELECT * FROM asignacion_pension_beneficios WHERE asignacion_pension_id = ? AND estado = ?', [id, 'ACTIVO']);
    const calculo = svc.calcularValorFinalConBeneficios(parseFloat(asig[0].tarifa_base_snapshot), todos);
    await conn.query('UPDATE asignaciones_pension SET valor_mensual_final = ?, descuento_total_snapshot = ? WHERE id = ?', [calculo.valor_final, (calculo.monto_descuento_pct || 0) + (calculo.descuento_fijo || 0), id]);
    await conn.commit();
    res.json({ success: true, message: 'Beneficio eliminado.', calculo });
  } catch (err) { await conn.rollback(); serverErr(res, err); }
  finally { conn.release(); }
};

// ─────────────────────────────────────────────────────────────
// DOCUMENTOS
// ─────────────────────────────────────────────────────────────
exports.getDocumentos = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id, tipo_documento, nombre_original, mime_type, tamano_bytes, beneficio_asignado_id, created_at FROM asignacion_pension_documentos WHERE asignacion_pension_id = ? ORDER BY created_at DESC', [req.params.id]);
    res.json({ success: true, documentos: rows });
  } catch (err) { serverErr(res, err); }
};

exports.subirDocumento = [
  upload.single('documento'),
  async (req, res) => {
    const conn = await db.getConnection();
    try {
      if (!req.file) return badRequest(res, 'No se recibió ningún archivo.');
      const { id } = req.params;
      const { tipo_documento, beneficio_asignado_id } = req.body;

      const [asig] = await db.query('SELECT id FROM asignaciones_pension WHERE id = ?', [id]);
      if (!asig.length) { fs.unlinkSync(req.file.path); return notFound(res); }

      await conn.beginTransaction();
      const [result] = await conn.query(
        `INSERT INTO asignacion_pension_documentos (asignacion_pension_id, beneficio_asignado_id, tipo_documento, nombre_original, nombre_interno, mime_type, tamano_bytes, ruta_segura, subido_por) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, beneficio_asignado_id || null, tipo_documento || null, req.file.originalname, req.file.filename, req.file.mimetype, req.file.size, req.file.path, req.usuario.id]
      );
      await svc.registrarHistorial(conn, { asignacion_pension_id: parseInt(id), accion: 'SUBIR_DOCUMENTO', datos_nuevos: { nombre: req.file.originalname, documento_id: result.insertId }, usuario: req.usuario });
      await conn.commit();
      res.status(201).json({ success: true, message: 'Documento subido correctamente.', id: result.insertId });
    } catch (err) { await conn.rollback(); if (req.file) { try { fs.unlinkSync(req.file.path); } catch (_) {} } serverErr(res, err); }
    finally { conn.release(); }
  }
];

exports.descargarDocumento = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM asignacion_pension_documentos WHERE id = ? AND asignacion_pension_id = ?', [req.params.documentoId, req.params.id]);
    if (!rows.length) return notFound(res, 'Documento no encontrado.');
    const doc = rows[0];
    if (!fs.existsSync(doc.ruta_segura)) return notFound(res, 'Archivo no encontrado en el servidor.');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(doc.nombre_original)}"`);
    res.setHeader('Content-Type', doc.mime_type);
    res.sendFile(doc.ruta_segura);
  } catch (err) { serverErr(res, err); }
};

exports.eliminarDocumento = async (req, res) => {
  const conn = await db.getConnection();
  try {
    const [rows] = await db.query('SELECT * FROM asignacion_pension_documentos WHERE id = ? AND asignacion_pension_id = ?', [req.params.documentoId, req.params.id]);
    if (!rows.length) return notFound(res, 'Documento no encontrado.');
    const doc = rows[0];
    const [asig] = await db.query('SELECT estado FROM asignaciones_pension WHERE id = ?', [req.params.id]);
    if (asig[0]?.estado !== 'BORRADOR' && !isAdmin(req)) return badRequest(res, 'Solo se pueden eliminar documentos en asignaciones BORRADOR (o admin).');

    await conn.beginTransaction();
    await conn.query('DELETE FROM asignacion_pension_documentos WHERE id = ?', [doc.id]);
    try { fs.unlinkSync(doc.ruta_segura); } catch (_) {}
    await svc.registrarHistorial(conn, { asignacion_pension_id: parseInt(req.params.id), accion: 'ELIMINAR_DOCUMENTO', datos_anteriores: { nombre: doc.nombre_original }, usuario: req.usuario });
    await conn.commit();
    res.json({ success: true, message: 'Documento eliminado.' });
  } catch (err) { await conn.rollback(); serverErr(res, err); }
  finally { conn.release(); }
};

// ─────────────────────────────────────────────────────────────
// CONSULTAS AUXILIARES
// ─────────────────────────────────────────────────────────────
exports.getMatriculasDisponibles = async (req, res) => {
  try {
    const { periodo_lectivo_id, search, curso_id, nivel_id, page = 1, limit = 30 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions = [`m.estado IN ('ACTIVA','CONFIRMADA','REGULAR','ACTIVO')`];
    const params = [];

    if (periodo_lectivo_id) { conditions.push('m.periodo_lectivo_id = ?'); params.push(periodo_lectivo_id); }
    if (curso_id)           { conditions.push('c.id = ?');                  params.push(curso_id); }
    if (nivel_id)           { conditions.push('c.nivel_id = ?');            params.push(nivel_id); }
    if (search) {
      conditions.push('(e.nombres LIKE ? OR e.apellidos LIKE ? OR e.cedula LIKE ? OR e.codigo LIKE ? OR m.numero_matricula LIKE ?)');
      const s = `%${search}%`;
      params.push(s, s, s, s, s);
    }

    const where = 'WHERE ' + conditions.join(' AND ');
    const [rows] = await db.query(
      `SELECT m.id, m.numero_matricula, m.estado,
              e.id_estudiante, e.nombres, e.apellidos, e.cedula, e.codigo,
              c.nombre AS curso_nombre, par.nombre AS paralelo_nombre,
              pl.nombre AS periodo_nombre,
              rp.nombres AS rep_nombres, rp.apellidos AS rep_apellidos,
              (SELECT COUNT(*) FROM asignaciones_pension ap2 WHERE ap2.matricula_id = m.id AND ap2.estado IN ('ACTIVA','APROBADA','PENDIENTE_APROBACION')) AS tiene_asignacion
       FROM matriculas m
       JOIN estudiantes e ON m.estudiante_id = e.id_estudiante
       JOIN oferta_academica o ON m.oferta_academica_id = o.id
       JOIN cursos c ON o.curso_id = c.id
       JOIN paralelos par ON o.paralelo_id = par.id
       JOIN periodos_lectivos pl ON m.periodo_lectivo_id = pl.id
       LEFT JOIN representantes rp ON m.representante_principal_id = rp.id_representante
       ${where}
       ORDER BY e.apellidos, e.nombres
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );
    const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM matriculas m JOIN estudiantes e ON m.estudiante_id = e.id_estudiante JOIN oferta_academica o ON m.oferta_academica_id = o.id JOIN cursos c ON o.curso_id = c.id JOIN paralelos par ON o.paralelo_id = par.id JOIN periodos_lectivos pl ON m.periodo_lectivo_id = pl.id ${where}`, params);
    res.json({ success: true, matriculas: rows, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) { serverErr(res, err); }
};

exports.getResumenMatricula = async (req, res) => {
  try {
    const { matriculaId } = req.params;
    const [rows] = await db.query(
      `SELECT m.*, e.nombres, e.apellidos, e.cedula, e.codigo, e.id_estudiante,
              c.nombre AS curso_nombre, c.id AS curso_id, c.nivel_id, c.subnivel_id,
              par.nombre AS paralelo_nombre, j.nombre AS jornada_nombre,
              pl.nombre AS periodo_nombre,
              rp.nombres AS rep_nombres, rp.apellidos AS rep_apellidos, rp.cedula AS rep_cedula, rp.telefono AS rep_telefono,
              re.nombres AS resp_nombres, re.apellidos AS resp_apellidos, re.cedula AS resp_cedula,
              ne.nombre AS nivel_nombre
       FROM matriculas m
       JOIN estudiantes e ON m.estudiante_id = e.id_estudiante
       JOIN oferta_academica o ON m.oferta_academica_id = o.id
       JOIN cursos c ON o.curso_id = c.id
       JOIN paralelos par ON o.paralelo_id = par.id
       LEFT JOIN jornadas j ON o.jornada_id = j.id
       JOIN periodos_lectivos pl ON m.periodo_lectivo_id = pl.id
       LEFT JOIN representantes rp ON m.representante_principal_id = rp.id_representante
       LEFT JOIN representantes re ON m.responsable_economico_id = re.id_representante
       LEFT JOIN niveles_educativos ne ON c.nivel_id = ne.id
       WHERE m.id = ?`,
      [matriculaId]
    );
    if (!rows.length) return notFound(res, 'Matrícula no encontrada.');

    // Asignación actual
    const [asignacionActual] = await db.query(`SELECT id, estado, valor_mensual_final, mes_desde, mes_hasta FROM asignaciones_pension WHERE matricula_id = ? AND estado IN ('ACTIVA','APROBADA','PENDIENTE_APROBACION') ORDER BY mes_desde DESC LIMIT 1`, [matriculaId]);

    res.json({ success: true, matricula: rows[0], asignacion_actual: asignacionActual[0] || null });
  } catch (err) { serverErr(res, err); }
};

exports.getSugerencias = async (req, res) => {
  try {
    const sugerencias = await svc.obtenerSugerencias(req.params.matriculaId);
    res.json({ success: true, sugerencias });
  } catch (err) { serverErr(res, err); }
};

exports.simularPension = async (req, res) => {
  try {
    const { periodo_lectivo_id, nivel_id, subnivel_id, curso_id, mes, beneficio_ids } = req.body;
    if (!periodo_lectivo_id || !mes) return badRequest(res, 'Se requieren periodo_lectivo_id y mes.');
    const resultado = await simularPension({ periodo_lectivo_id: parseInt(periodo_lectivo_id), nivel_id: nivel_id ? parseInt(nivel_id) : null, subnivel_id: subnivel_id ? parseInt(subnivel_id) : null, curso_id: curso_id ? parseInt(curso_id) : null, mes, beneficio_ids: Array.isArray(beneficio_ids) ? beneficio_ids.map(Number) : [] });
    if (resultado.error) return res.status(409).json({ success: false, ...resultado });
    res.json({ success: true, simulacion: resultado });
  } catch (err) { serverErr(res, err); }
};

exports.asignacionMasiva = async (req, res) => {
  if (!isAdmin(req)) return forbidden(res);
  const conn = await db.getConnection();
  try {
    const { periodo_id, curso_id, nivel_id, mes_desde, mes_hasta, motivo, crear_como_activa } = req.body;
    if (!periodo_id || !mes_desde || !mes_hasta) return badRequest(res, 'Se requieren periodo_id, mes_desde, mes_hasta.');
    await conn.beginTransaction();
    const resultado = await svc.asignacionMasiva(conn, { periodoId: periodo_id, cursoId: curso_id || null, nivelId: nivel_id || null, mesDesde: mes_desde, mesHasta: mes_hasta, motivo, crearComoActiva: !!crear_como_activa }, req.usuario, req);
    await conn.commit();
    res.json({ success: true, resultado });
  } catch (err) { await conn.rollback(); serverErr(res, err); }
  finally { conn.release(); }
};

exports.getPendientes = async (req, res) => {
  try {
    const [rows] = await db.query(`${SELECT_ASIGNACION} WHERE ap.estado = 'PENDIENTE_APROBACION' ORDER BY ap.solicitado_at ASC`);
    res.json({ success: true, pendientes: rows });
  } catch (err) { serverErr(res, err); }
};

exports.getResumenKPI = async (req, res) => {
  try {
    const { periodo_lectivo_id } = req.query;
    const cond = periodo_lectivo_id ? 'AND ap.periodo_lectivo_id = ?' : '';
    const params = periodo_lectivo_id ? [periodo_lectivo_id] : [];

    const [[kpi]] = await db.query(
      `SELECT
         COUNT(*) AS total,
         SUM(estado = 'ACTIVA') AS activas,
         SUM(estado = 'PENDIENTE_APROBACION') AS pendientes_aprobacion,
         SUM(estado = 'BORRADOR') AS borradores,
         SUM(estado = 'RECHAZADA') AS rechazadas,
         SUM(estado = 'ANULADA') AS anuladas,
         SUM(estado = 'SUSPENDIDA') AS suspendidas,
         SUM(estado = 'FINALIZADA') AS finalizadas
       FROM asignaciones_pension ap WHERE 1=1 ${cond}`,
      params
    );

    // Matrículas activas del periodo sin asignación
    let sinAsig = 0;
    if (periodo_lectivo_id) {
      const [[{ sin_asignacion }]] = await db.query(
        `SELECT COUNT(*) AS sin_asignacion FROM matriculas m
         WHERE m.periodo_lectivo_id = ?
           AND m.estado IN ('ACTIVA','CONFIRMADA','REGULAR','ACTIVO')
           AND NOT EXISTS (SELECT 1 FROM asignaciones_pension ap WHERE ap.matricula_id = m.id AND ap.estado IN ('ACTIVA','APROBADA','PENDIENTE_APROBACION'))`,
        [periodo_lectivo_id]
      );
      sinAsig = sin_asignacion;
    }

    res.json({ success: true, kpi: { ...kpi, sin_asignacion: sinAsig } });
  } catch (err) { serverErr(res, err); }
};

exports.exportarAsignaciones = async (req, res) => {
  try {
    const { periodo_lectivo_id, estado, formato = 'csv' } = req.query;
    const cond = [];
    const params = [];
    if (periodo_lectivo_id) { cond.push('ap.periodo_lectivo_id = ?'); params.push(periodo_lectivo_id); }
    if (estado) { cond.push('ap.estado = ?'); params.push(estado); }
    const where = cond.length ? 'WHERE ' + cond.join(' AND ') : '';

    const [rows] = await db.query(`${SELECT_ASIGNACION} ${where} ORDER BY e.apellidos, e.nombres`, params);

    if (formato === 'csv') {
      const headers = ['Código','Estudiante','Nro. Matrícula','Periodo','Curso','Paralelo','Tarifa Base','Valor Final','Vigencia Desde','Vigencia Hasta','Estado','Aprobado At'];
      const csv = [
        headers.join(','),
        ...rows.map(r => [
          r.est_codigo, `"${r.est_apellidos} ${r.est_nombres}"`, r.numero_matricula,
          `"${r.periodo_nombre}"`, `"${r.curso_nombre}"`, `"${r.paralelo_nombre}"`,
          r.tarifa_base_snapshot, r.valor_mensual_final,
          r.mes_desde?.toString().slice(0, 10), r.mes_hasta?.toString().slice(0, 10),
          r.estado, r.aprobado_at?.toString().slice(0, 10) || ''
        ].join(','))
      ].join('\n');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="asignaciones_pension.csv"');
      res.send('\ufeff' + csv); // BOM para Excel
    } else {
      res.json({ success: true, asignaciones: rows });
    }
  } catch (err) { serverErr(res, err); }
};
