/**
 * ============================================================
 * Service: Asignación Individual de Pensión
 * Toda la lógica de negocio separada del controlador.
 * Reutiliza pensionesConfigService para cálculo y resolución.
 * ============================================================
 */
const db = require('../config/db');
const {
  resolverTarifaPension,
  calcularBeneficio,
  verificarCompatibilidades,
  registrarAuditoria,
} = require('./pensionesConfigService');

// ─────────────────────────────────────────────────────────────
// ESTADOS PERMITIDOS POR OPERACIÓN
// ─────────────────────────────────────────────────────────────
const ESTADOS_ACTIVOS_BLOQUEO = ['APROBADA', 'ACTIVA', 'PENDIENTE_APROBACION'];
const MATRICULA_ESTADOS_PERMITIDOS = ['ACTIVA', 'CONFIRMADA', 'REGULAR', 'ACTIVO'];

// ─────────────────────────────────────────────────────────────
// HISTORIAL
// ─────────────────────────────────────────────────────────────
async function registrarHistorial(conn, { asignacion_pension_id, accion, estado_anterior, estado_nuevo, datos_anteriores, datos_nuevos, motivo, usuario }) {
  try {
    await conn.query(
      `INSERT INTO historial_asignacion_pension
         (asignacion_pension_id, accion, estado_anterior, estado_nuevo, datos_anteriores, datos_nuevos, motivo, usuario_id, usuario_nombre)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        asignacion_pension_id,
        accion,
        estado_anterior || null,
        estado_nuevo || null,
        datos_anteriores ? JSON.stringify(datos_anteriores) : null,
        datos_nuevos ? JSON.stringify(datos_nuevos) : null,
        motivo || null,
        usuario?.id || null,
        usuario?.nombre_completo || null,
      ]
    );
  } catch (err) {
    console.error('[Historial] Error:', err.message);
  }
}

// ─────────────────────────────────────────────────────────────
// RESOLVER TARIFA PARA UNA MATRÍCULA
// ─────────────────────────────────────────────────────────────

/**
 * Dada una matricula_id y un mes, resuelve la tarifa base aplicable.
 * Obtiene el contexto (curso, nivel, subnivel, periodo) desde la matrícula.
 */
async function resolverTarifaParaMatricula(matriculaId, mesDesde) {
  // Obtener contexto de la matrícula
  const [rows] = await db.query(
    `SELECT m.periodo_lectivo_id, c.id AS curso_id, c.nivel_id, c.subnivel_id
     FROM matriculas m
     JOIN oferta_academica o ON m.oferta_academica_id = o.id
     JOIN cursos c ON o.curso_id = c.id
     WHERE m.id = ?`,
    [matriculaId]
  );
  if (!rows.length) return { error: 'MATRICULA_NO_ENCONTRADA' };

  const { periodo_lectivo_id, curso_id, nivel_id, subnivel_id } = rows[0];
  const resultado = await resolverTarifaPension({ periodo_lectivo_id, nivel_id, subnivel_id, curso_id, mes: mesDesde });

  return { ...resultado, periodo_lectivo_id, curso_id, nivel_id, subnivel_id };
}

// ─────────────────────────────────────────────────────────────
// SOLAPAMIENTO
// ─────────────────────────────────────────────────────────────

/**
 * Detecta si existe una asignación en estado de bloqueo que se solape con el rango.
 */
async function detectarSolapamiento(matriculaId, mesDesde, mesHasta, excludeId = null) {
  let query = `
    SELECT id, estado, mes_desde, mes_hasta, valor_mensual_final
    FROM asignaciones_pension
    WHERE matricula_id = ?
      AND estado IN ('APROBADA', 'ACTIVA', 'PENDIENTE_APROBACION')
      AND mes_desde <= ?
      AND mes_hasta >= ?
  `;
  const params = [matriculaId, mesHasta, mesDesde];
  if (excludeId) { query += ' AND id != ?'; params.push(excludeId); }

  const [rows] = await db.query(query, params);
  return rows;
}

// ─────────────────────────────────────────────────────────────
// SUGERENCIAS DE BENEFICIOS
// ─────────────────────────────────────────────────────────────

/**
 * Detecta posibles beneficios sugeridos para una matrícula:
 * - Hermanos: estudiantes con el mismo representante_principal_id activos en el mismo periodo
 * - Beneficios anteriores del estudiante
 */
async function obtenerSugerencias(matriculaId) {
  const sugerencias = [];

  // Datos de la matrícula
  const [mRows] = await db.query(
    `SELECT m.*, e.id_estudiante, e.nombres, e.apellidos,
            m.representante_principal_id, m.responsable_economico_id,
            m.periodo_lectivo_id
     FROM matriculas m
     JOIN estudiantes e ON m.estudiante_id = e.id_estudiante
     WHERE m.id = ?`,
    [matriculaId]
  );
  if (!mRows.length) return sugerencias;
  const mat = mRows[0];

  // ── Hermanos (mismo representante_principal_id, mismo periodo, estado activo) ──
  if (mat.representante_principal_id) {
    const [hermanos] = await db.query(
      `SELECT m2.id AS matricula_id, m2.numero_matricula,
              e2.id_estudiante, e2.nombres, e2.apellidos, e2.cedula,
              c.nombre AS curso_nombre, p.nombre AS paralelo_nombre
       FROM matriculas m2
       JOIN estudiantes e2 ON m2.estudiante_id = e2.id_estudiante
       JOIN oferta_academica o ON m2.oferta_academica_id = o.id
       JOIN cursos c ON o.curso_id = c.id
       JOIN paralelos p ON o.paralelo_id = p.id
       WHERE m2.representante_principal_id = ?
         AND m2.periodo_lectivo_id = ?
         AND m2.id != ?
         AND m2.estado IN ('ACTIVA','CONFIRMADA','REGULAR','ACTIVO')`,
      [mat.representante_principal_id, mat.periodo_lectivo_id, matriculaId]
    );

    if (hermanos.length >= 1) {
      sugerencias.push({
        tipo: 'HERMANOS',
        titulo: `${hermanos.length + 1} estudiante(s) con el mismo representante en este periodo`,
        descripcion: `El representante tiene ${hermanos.length} otro(s) estudiante(s) matriculado(s) en el mismo periodo. Podría aplicar el beneficio de descuento por hermanos.`,
        hermanos,
        accion_recomendada: 'Revisar y confirmar si aplica descuento por hermanos',
      });
    }
  }

  // ── Beneficios anteriores del estudiante (periodos anteriores) ──
  const [beneficiosAnt] = await db.query(
    `SELECT DISTINCT tb.id, tb.codigo, tb.nombre, tb.categoria
     FROM asignaciones_pension ap
     JOIN asignacion_pension_beneficios apb ON ap.id = apb.asignacion_pension_id
     JOIN tipos_beneficio_pension tb ON apb.tipo_beneficio_id = tb.id
     JOIN matriculas m ON ap.matricula_id = m.id
     WHERE m.estudiante_id = ?
       AND ap.matricula_id != ?
       AND ap.estado IN ('ACTIVA','APROBADA','FINALIZADA')
       AND apb.estado = 'ACTIVO'
     LIMIT 5`,
    [mat.estudiante_id, matriculaId]
  );

  if (beneficiosAnt.length > 0) {
    sugerencias.push({
      tipo: 'HISTORIAL',
      titulo: 'Beneficios en periodos anteriores',
      descripcion: `Este estudiante tuvo ${beneficiosAnt.length} beneficio(s) en periodos anteriores. Revisa si continúan aplicando.`,
      beneficios: beneficiosAnt,
      accion_recomendada: 'Verificar si los beneficios continúan vigentes',
    });
  }

  return sugerencias;
}

// ─────────────────────────────────────────────────────────────
// CALCULAR VALOR FINAL CON BENEFICIOS
// ─────────────────────────────────────────────────────────────

/**
 * Calcula el valor final de pensión usando la misma lógica del simulador.
 * @param {number} tarifaBase
 * @param {object[]} beneficiosData  Cada uno con tipo_calculo, porcentaje_aplicado, valor_aplicado, valor_final_especial, prioridad_snapshot
 */
function calcularValorFinalConBeneficios(tarifaBase, beneficiosData = []) {
  // Mapear al formato que espera calcularBeneficio
  const beneficiosMapped = beneficiosData.map(b => ({
    tipo_calculo: b.tipo_calculo_snapshot || b.tipo_calculo,
    porcentaje_predeterminado: b.porcentaje_aplicado != null ? b.porcentaje_aplicado : b.porcentaje_predeterminado,
    valor_predeterminado: b.valor_final_especial != null ? b.valor_final_especial : (b.valor_aplicado != null ? b.valor_aplicado : b.valor_predeterminado),
    prioridad: b.prioridad_snapshot != null ? b.prioridad_snapshot : (b.prioridad || 0),
    nombre: b.nombre || b.tipo_calculo,
  }));
  return calcularBeneficio(tarifaBase, beneficiosMapped);
}

// ─────────────────────────────────────────────────────────────
// SNAPSHOT
// ─────────────────────────────────────────────────────────────

function generarSnapshot(tarifa, { periodoNombre, nivelNombre, cursoNombre }) {
  return {
    tarifa_pension_id: tarifa.id,
    valor_mensual: parseFloat(tarifa.valor_mensual),
    nivel_nombre: nivelNombre || null,
    curso_nombre: cursoNombre || null,
    periodo_nombre: periodoNombre || null,
    prioridad: tarifa.prioridad,
    mes_desde_tarifa: tarifa.mes_desde,
    mes_hasta_tarifa: tarifa.mes_hasta,
    estado_tarifa: tarifa.estado,
    fecha_resolucion: new Date().toISOString(),
  };
}

// ─────────────────────────────────────────────────────────────
// VALIDAR DOCUMENTOS REQUERIDOS
// ─────────────────────────────────────────────────────────────

/**
 * Verifica que todos los beneficios con requiere_documento_snapshot=true
 * tengan al menos un documento cargado.
 */
async function validarDocumentosRequeridos(asignacionId, conn) {
  const pool = conn || db;
  const [beneficiosReq] = await pool.query(
    `SELECT apb.id, apb.tipo_beneficio_id, tb.nombre
     FROM asignacion_pension_beneficios apb
     JOIN tipos_beneficio_pension tb ON apb.tipo_beneficio_id = tb.id
     WHERE apb.asignacion_pension_id = ?
       AND apb.requiere_documento_snapshot = TRUE
       AND apb.estado = 'ACTIVO'`,
    [asignacionId]
  );

  const faltantes = [];
  for (const b of beneficiosReq) {
    const [docs] = await pool.query(
      `SELECT id FROM asignacion_pension_documentos
       WHERE asignacion_pension_id = ?
         AND beneficio_asignado_id = ?`,
      [asignacionId, b.id]
    );
    if (!docs.length) {
      faltantes.push({ beneficio_id: b.tipo_beneficio_id, nombre: b.nombre });
    }
  }
  return faltantes;
}

// ─────────────────────────────────────────────────────────────
// CREAR ASIGNACIÓN
// ─────────────────────────────────────────────────────────────

async function crearAsignacion(conn, { matriculaId, periodoId, tarifaId, mesDesde, mesHasta, tarifaBaseSnapshot, descuentoTotalSnapshot, valorMensualFinal, reglaTarifaSnapshot, motivo, observacion, beneficios = [] }, usuario, req) {
  const [result] = await conn.query(
    `INSERT INTO asignaciones_pension
       (matricula_id, periodo_lectivo_id, tarifa_pension_id, mes_desde, mes_hasta,
        tarifa_base_snapshot, descuento_total_snapshot, valor_mensual_final,
        regla_tarifa_snapshot, estado, motivo, observacion, creado_por)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'BORRADOR', ?, ?, ?)`,
    [matriculaId, periodoId, tarifaId, mesDesde, mesHasta,
      tarifaBaseSnapshot, descuentoTotalSnapshot, valorMensualFinal,
      reglaTarifaSnapshot ? JSON.stringify(reglaTarifaSnapshot) : null,
      motivo || null, observacion || null, usuario.id]
  );
  const asignacionId = result.insertId;

  // Insertar beneficios
  for (const b of beneficios) {
    await conn.query(
      `INSERT INTO asignacion_pension_beneficios
         (asignacion_pension_id, tipo_beneficio_id, tipo_calculo_snapshot, porcentaje_aplicado,
          valor_aplicado, valor_final_especial, prioridad_snapshot, mes_desde, mes_hasta,
          motivo, requiere_documento_snapshot, estado)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVO')`,
      [asignacionId, b.tipo_beneficio_id, b.tipo_calculo_snapshot, b.porcentaje_aplicado ?? null,
        b.valor_aplicado ?? null, b.valor_final_especial ?? null, b.prioridad_snapshot ?? 0,
        b.mes_desde || mesDesde, b.mes_hasta || mesHasta,
        b.motivo || '', !!b.requiere_documento_snapshot]
    );
  }

  await registrarHistorial(conn, {
    asignacion_pension_id: asignacionId, accion: 'CREAR',
    estado_nuevo: 'BORRADOR',
    datos_nuevos: { matriculaId, periodoId, valorMensualFinal, beneficios_count: beneficios.length },
    usuario,
  });

  await registrarAuditoria(conn, {
    entidad: 'asignaciones_pension', entidad_id: asignacionId, accion: 'CREAR',
    datos_despues: { matriculaId, valorMensualFinal }, usuario, req,
  });

  return asignacionId;
}

// ─────────────────────────────────────────────────────────────
// APROBAR
// ─────────────────────────────────────────────────────────────

async function aprobarAsignacion(conn, id, usuario, req) {
  const [rows] = await conn.query('SELECT * FROM asignaciones_pension WHERE id = ?', [id]);
  if (!rows.length) throw new Error('Asignación no encontrada');
  const asig = rows[0];

  if (asig.estado !== 'PENDIENTE_APROBACION') throw new Error(`Estado actual "${asig.estado}" no permite aprobación. Se requiere PENDIENTE_APROBACION.`);

  // Verificar documentos requeridos
  const faltantes = await validarDocumentosRequeridos(id, conn);
  if (faltantes.length > 0) {
    throw new Error(`Documentos requeridos faltantes para: ${faltantes.map(f => f.nombre).join(', ')}`);
  }

  // Recalcular valor final (el backend no confía en el front)
  const [beneficios] = await conn.query(
    `SELECT * FROM asignacion_pension_beneficios WHERE asignacion_pension_id = ? AND estado = 'ACTIVO'`,
    [id]
  );
  const calculo = calcularValorFinalConBeneficios(asig.tarifa_base_snapshot, beneficios);

  // Obtener info para snapshot completo
  const [tarifaInfo] = await conn.query(
    `SELECT tp.*, pl.nombre AS periodo_nombre, ne.nombre AS nivel_nombre, c.nombre AS curso_nombre
     FROM tarifas_pension tp
     LEFT JOIN periodos_lectivos pl ON tp.periodo_lectivo_id = pl.id
     LEFT JOIN niveles_educativos ne ON tp.nivel_id = ne.id
     LEFT JOIN cursos c ON tp.curso_id = c.id
     WHERE tp.id = ?`,
    [asig.tarifa_pension_id]
  );

  const snapshot = tarifaInfo.length > 0 ? generarSnapshot(tarifaInfo[0], {
    periodoNombre: tarifaInfo[0].periodo_nombre,
    nivelNombre: tarifaInfo[0].nivel_nombre,
    cursoNombre: tarifaInfo[0].curso_nombre,
  }) : null;

  await conn.query(
    `UPDATE asignaciones_pension SET
       estado = 'APROBADA',
       valor_mensual_final = ?,
       descuento_total_snapshot = ?,
       regla_tarifa_snapshot = ?,
       aprobado_por = ?,
       aprobado_at = NOW(),
       actualizado_por = ?
     WHERE id = ?`,
    [calculo.valor_final, calculo.descuento_fijo + (calculo.monto_descuento_pct || 0),
      snapshot ? JSON.stringify(snapshot) : asig.regla_tarifa_snapshot,
      usuario.id, usuario.id, id]
  );

  await registrarHistorial(conn, {
    asignacion_pension_id: id, accion: 'APROBAR',
    estado_anterior: asig.estado, estado_nuevo: 'APROBADA',
    datos_anteriores: { valor: asig.valor_mensual_final },
    datos_nuevos: { valor: calculo.valor_final, aprobado_por: usuario.id },
    usuario,
  });

  await registrarAuditoria(conn, {
    entidad: 'asignaciones_pension', entidad_id: id, accion: 'APROBAR',
    datos_antes: { estado: asig.estado }, datos_despues: { estado: 'APROBADA', valor: calculo.valor_final },
    usuario, req,
  });

  return calculo;
}

// ─────────────────────────────────────────────────────────────
// ACTIVAR
// ─────────────────────────────────────────────────────────────

async function activarAsignacion(conn, id, usuario, req) {
  const [rows] = await conn.query('SELECT * FROM asignaciones_pension WHERE id = ?', [id]);
  if (!rows.length) throw new Error('Asignación no encontrada');
  const asig = rows[0];

  if (asig.estado !== 'APROBADA') throw new Error(`Estado actual "${asig.estado}" no permite activación. Se requiere APROBADA.`);

  // Verificar solapamiento (excluyendo la actual)
  const solapadas = await detectarSolapamiento(asig.matricula_id, asig.mes_desde, asig.mes_hasta, id);
  const activasReales = solapadas.filter(s => s.estado === 'ACTIVA');

  // Si hay una ACTIVA solapada: cerrarla
  for (const anterior of activasReales) {
    await conn.query(
      `UPDATE asignaciones_pension SET estado = 'FINALIZADA', actualizado_por = ? WHERE id = ?`,
      [usuario.id, anterior.id]
    );
    await registrarHistorial(conn, {
      asignacion_pension_id: anterior.id, accion: 'FINALIZAR',
      estado_anterior: 'ACTIVA', estado_nuevo: 'FINALIZADA',
      motivo: `Reemplazada por asignación #${id}`,
      datos_nuevos: { reemplazada_por: id }, usuario,
    });
  }

  await conn.query(
    `UPDATE asignaciones_pension SET estado = 'ACTIVA', actualizado_por = ? WHERE id = ?`,
    [usuario.id, id]
  );

  await registrarHistorial(conn, {
    asignacion_pension_id: id, accion: 'ACTIVAR',
    estado_anterior: asig.estado, estado_nuevo: 'ACTIVA', usuario,
  });

  await registrarAuditoria(conn, {
    entidad: 'asignaciones_pension', entidad_id: id, accion: 'ACTIVAR',
    datos_antes: { estado: asig.estado }, datos_despues: { estado: 'ACTIVA' }, usuario, req,
  });
}

// ─────────────────────────────────────────────────────────────
// RECHAZAR
// ─────────────────────────────────────────────────────────────

async function rechazarAsignacion(conn, id, motivo, usuario, req) {
  const [rows] = await conn.query('SELECT * FROM asignaciones_pension WHERE id = ?', [id]);
  if (!rows.length) throw new Error('Asignación no encontrada');
  const asig = rows[0];
  if (!['PENDIENTE_APROBACION', 'APROBADA'].includes(asig.estado)) throw new Error(`Estado "${asig.estado}" no permite rechazo.`);

  await conn.query(
    `UPDATE asignaciones_pension SET estado = 'RECHAZADA', rechazado_por = ?, rechazado_at = NOW(), motivo_rechazo = ?, actualizado_por = ? WHERE id = ?`,
    [usuario.id, motivo, usuario.id, id]
  );
  await registrarHistorial(conn, {
    asignacion_pension_id: id, accion: 'RECHAZAR',
    estado_anterior: asig.estado, estado_nuevo: 'RECHAZADA', motivo, usuario,
  });
  await registrarAuditoria(conn, {
    entidad: 'asignaciones_pension', entidad_id: id, accion: 'RECHAZAR',
    datos_antes: { estado: asig.estado }, datos_despues: { estado: 'RECHAZADA', motivo }, usuario, req,
  });
}

// ─────────────────────────────────────────────────────────────
// SUSPENDER
// ─────────────────────────────────────────────────────────────

async function suspenderAsignacion(conn, id, motivo, usuario, req) {
  const [rows] = await conn.query('SELECT * FROM asignaciones_pension WHERE id = ?', [id]);
  if (!rows.length) throw new Error('Asignación no encontrada');
  const asig = rows[0];
  if (asig.estado !== 'ACTIVA') throw new Error(`Solo se puede suspender una asignación ACTIVA. Estado actual: "${asig.estado}".`);

  await conn.query(`UPDATE asignaciones_pension SET estado = 'SUSPENDIDA', motivo = ?, actualizado_por = ? WHERE id = ?`, [motivo, usuario.id, id]);
  await registrarHistorial(conn, { asignacion_pension_id: id, accion: 'SUSPENDER', estado_anterior: 'ACTIVA', estado_nuevo: 'SUSPENDIDA', motivo, usuario });
  await registrarAuditoria(conn, { entidad: 'asignaciones_pension', entidad_id: id, accion: 'SUSPENDER', datos_antes: { estado: 'ACTIVA' }, datos_despues: { estado: 'SUSPENDIDA', motivo }, usuario, req });
}

// ─────────────────────────────────────────────────────────────
// ANULAR
// ─────────────────────────────────────────────────────────────

async function anularAsignacion(conn, id, motivo, usuario, req) {
  const [rows] = await conn.query('SELECT * FROM asignaciones_pension WHERE id = ?', [id]);
  if (!rows.length) throw new Error('Asignación no encontrada');
  const asig = rows[0];
  if (asig.estado === 'ANULADA') throw new Error('La asignación ya está anulada.');

  await conn.query(
    `UPDATE asignaciones_pension SET estado = 'ANULADA', anulado_por = ?, anulado_at = NOW(), motivo_anulacion = ?, actualizado_por = ? WHERE id = ?`,
    [usuario.id, motivo, usuario.id, id]
  );
  await registrarHistorial(conn, { asignacion_pension_id: id, accion: 'ANULAR', estado_anterior: asig.estado, estado_nuevo: 'ANULADA', motivo, usuario });
  await registrarAuditoria(conn, { entidad: 'asignaciones_pension', entidad_id: id, accion: 'ANULAR', datos_antes: { estado: asig.estado }, datos_despues: { estado: 'ANULADA', motivo }, usuario, req });
}

// ─────────────────────────────────────────────────────────────
// NUEVA VIGENCIA
// ─────────────────────────────────────────────────────────────

async function crearNuevaVigencia(conn, origenId, nuevaData, usuario, req) {
  const [rows] = await conn.query('SELECT * FROM asignaciones_pension WHERE id = ?', [origenId]);
  if (!rows.length) throw new Error('Asignación origen no encontrada.');
  const origen = rows[0];

  // Cerrar la vigencia anterior si estaba ACTIVA
  if (origen.estado === 'ACTIVA') {
    await conn.query(`UPDATE asignaciones_pension SET estado = 'FINALIZADA', actualizado_por = ? WHERE id = ?`, [usuario.id, origenId]);
    await registrarHistorial(conn, {
      asignacion_pension_id: origenId, accion: 'FINALIZAR',
      estado_anterior: 'ACTIVA', estado_nuevo: 'FINALIZADA',
      motivo: `Nueva vigencia creada desde asignación #${origenId}`,
      usuario,
    });
  }

  // Crear la nueva
  const nuevaId = await crearAsignacion(conn, {
    matriculaId: origen.matricula_id,
    periodoId: origen.periodo_lectivo_id,
    tarifaId: nuevaData.tarifa_pension_id || origen.tarifa_pension_id,
    mesDesde: nuevaData.mes_desde,
    mesHasta: nuevaData.mes_hasta,
    tarifaBaseSnapshot: nuevaData.tarifa_base_snapshot || origen.tarifa_base_snapshot,
    descuentoTotalSnapshot: nuevaData.descuento_total_snapshot || 0,
    valorMensualFinal: nuevaData.valor_mensual_final || origen.valor_mensual_final,
    reglaTarifaSnapshot: null,
    motivo: nuevaData.motivo || `Nueva vigencia desde asignación #${origenId}`,
    observacion: nuevaData.observacion,
    beneficios: nuevaData.beneficios || [],
  }, usuario, req);

  await registrarHistorial(conn, {
    asignacion_pension_id: nuevaId, accion: 'NUEVA_VIGENCIA',
    estado_nuevo: 'BORRADOR',
    datos_nuevos: { origen_id: origenId, mes_desde: nuevaData.mes_desde, mes_hasta: nuevaData.mes_hasta },
    usuario,
  });

  return nuevaId;
}

// ─────────────────────────────────────────────────────────────
// ASIGNACIÓN MASIVA
// ─────────────────────────────────────────────────────────────

async function asignacionMasiva(conn, { periodoId, cursoId, nivelId, mesDesde, mesHasta, motivo, crearComoActiva = false }, usuario, req) {
  const resultado = { creadas: 0, omitidas: [], errores: [] };

  // Obtener matrículas activas del periodo/curso/nivel
  let sql = `
    SELECT m.id, m.numero_matricula, m.periodo_lectivo_id,
           e.nombres, e.apellidos, e.codigo,
           c.id AS curso_id, c.nivel_id, c.subnivel_id,
           c.nombre AS curso_nombre, par.nombre AS paralelo_nombre
    FROM matriculas m
    JOIN estudiantes e ON m.estudiante_id = e.id_estudiante
    JOIN oferta_academica o ON m.oferta_academica_id = o.id
    JOIN cursos c ON o.curso_id = c.id
    JOIN paralelos par ON o.paralelo_id = par.id
    WHERE m.periodo_lectivo_id = ?
      AND m.estado IN ('ACTIVA','CONFIRMADA','REGULAR','ACTIVO')
  `;
  const params = [periodoId];
  if (cursoId) { sql += ' AND c.id = ?'; params.push(cursoId); }
  if (nivelId && !cursoId) { sql += ' AND c.nivel_id = ?'; params.push(nivelId); }

  const [matriculas] = await conn.query(sql, params);

  for (const m of matriculas) {
    try {
      // Verificar si ya tiene asignación activa solapada
      const solapadas = await detectarSolapamiento(m.id, mesDesde, mesHasta);
      if (solapadas.length > 0) {
        resultado.omitidas.push({ matricula_id: m.id, numero_matricula: m.numero_matricula, estudiante: `${m.nombres} ${m.apellidos}`, razon: 'YA_ASIGNADA', curso: m.curso_nombre });
        continue;
      }

      // Resolver tarifa
      const resolucion = await resolverTarifaPension({ periodo_lectivo_id: m.periodo_lectivo_id, nivel_id: m.nivel_id, subnivel_id: m.subnivel_id, curso_id: m.curso_id, mes: mesDesde });

      if (resolucion.conflicto) {
        resultado.omitidas.push({ matricula_id: m.id, numero_matricula: m.numero_matricula, estudiante: `${m.nombres} ${m.apellidos}`, razon: 'CONFLICTO_TARIFA', curso: m.curso_nombre });
        continue;
      }
      if (!resolucion.tarifa) {
        resultado.omitidas.push({ matricula_id: m.id, numero_matricula: m.numero_matricula, estudiante: `${m.nombres} ${m.apellidos}`, razon: 'SIN_TARIFA', curso: m.curso_nombre });
        continue;
      }

      const tarifa = resolucion.tarifa;
      const calculo = calcularBeneficio(tarifa.valor_mensual, []);
      const estadoInicial = crearComoActiva ? 'ACTIVA' : 'BORRADOR';

      const [ins] = await conn.query(
        `INSERT INTO asignaciones_pension
           (matricula_id, periodo_lectivo_id, tarifa_pension_id, mes_desde, mes_hasta,
            tarifa_base_snapshot, descuento_total_snapshot, valor_mensual_final,
            estado, motivo, creado_por)
         VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)`,
        [m.id, m.periodo_lectivo_id, tarifa.id, mesDesde, mesHasta,
          tarifa.valor_mensual, calculo.valor_final, estadoInicial,
          motivo || 'Asignación masiva', usuario.id]
      );

      await registrarHistorial(conn, {
        asignacion_pension_id: ins.insertId, accion: 'ASIGNACION_MASIVA',
        estado_nuevo: estadoInicial,
        datos_nuevos: { matricula_id: m.id, tarifa_id: tarifa.id, valor: calculo.valor_final },
        usuario,
      });

      resultado.creadas++;
    } catch (err) {
      resultado.errores.push({ matricula_id: m.id, numero_matricula: m.numero_matricula, estudiante: `${m.nombres} ${m.apellidos}`, error: err.message });
    }
  }

  await registrarAuditoria(conn, {
    entidad: 'asignaciones_pension', accion: 'ASIGNACION_MASIVA',
    datos_despues: { periodoId, cursoId, nivelId, resultado },
    usuario, req,
  });

  return resultado;
}

module.exports = {
  resolverTarifaParaMatricula,
  detectarSolapamiento,
  obtenerSugerencias,
  calcularValorFinalConBeneficios,
  generarSnapshot,
  validarDocumentosRequeridos,
  crearAsignacion,
  aprobarAsignacion,
  activarAsignacion,
  rechazarAsignacion,
  suspenderAsignacion,
  anularAsignacion,
  crearNuevaVigencia,
  asignacionMasiva,
  registrarHistorial,
  MATRICULA_ESTADOS_PERMITIDOS,
};
