/**
 * ============================================================
 * Controller: Cobro de Pensiones
 * Compatible con la estructura actual de la Base de Datos:
 *   - estudiantes.id_estudiante (PK)
 *   - matriculas (id PK, estudiante_id, periodo_lectivo_id, oferta_academica_id)
 *   - oferta_academica -> cursos, paralelos, niveles_educativos, periodos_lectivos
 *   - pension_cuotas, pension_pagos, pension_config, facturas
 * ============================================================
 */
const db = require('../config/db');

// ── Helpers ──────────────────────────────────────────────────
const ok     = (res, data)     => res.json({ success: true, ...data });
const badReq = (res, msg)      => res.status(400).json({ success: false, message: msg });
const notFnd = (res, msg)      => res.status(404).json({ success: false, message: msg || 'No encontrado.' });
const srvErr = (res, err, ctx) => {
  console.error(`[CobrarPensiones][${ctx}]`, err);
  res.status(500).json({ success: false, message: 'Error interno del servidor.', error: err.message });
};

/**
 * Mapea nombre del curso y nivel al nivel de pension_config:
 * 'INICIAL', '1-7 EGB', '8-10 EGB', '1-2 BACH', '3 BACH'
 */
function mapNivelConfig(cursoNombre, cursoNivel) {
  const nombre = (cursoNombre || '').toLowerCase();
  const nivel  = (cursoNivel  || '').toLowerCase();

  if (nivel.includes('inicial') || /inicial/i.test(nombre)) return 'INICIAL';

  if (
    nivel.includes('bachillerato') ||
    nivel.includes('bgu') ||
    /bach|bgu/i.test(nombre)
  ) {
    if (/\b3\b/.test(nombre) || /tercero|3ero|3ro/i.test(nombre)) return '3 BACH';
    return '1-2 BACH';
  }

  if (
    nivel.includes('egb') ||
    nivel.includes('básica') ||
    nivel.includes('basica') ||
    /\begb\b/i.test(nombre) ||
    /básica|basica/i.test(nombre)
  ) {
    if (
      /\b(8|9|10)\b/.test(nombre) ||
      /octavo|noveno|d[eé]cimo|8vo|9no|10mo/i.test(nombre)
    ) {
      return '8-10 EGB';
    }
    return '1-7 EGB';
  }

  // Fallback por número en el nombre
  const match = nombre.match(/(\d+)/);
  if (match) {
    const g = parseInt(match[1], 10);
    if (g >= 8 && g <= 10) return '8-10 EGB';
    if (g >= 1 && g <= 7) return '1-7 EGB';
  }

  return '1-7 EGB'; // Fallback por defecto razonable
}

/**
 * Obtener el año lectivo activo.
 */
async function getAnioActivo() {
  try {
    const [[pl]] = await db.query(
      `SELECT nombre FROM periodos_lectivos WHERE es_activo = 1 LIMIT 1`
    );
    if (pl?.nombre) return { tipo: 'periodo', valor: pl.nombre };
  } catch (_) {}

  try {
    const [[plLast]] = await db.query(
      `SELECT nombre FROM periodos_lectivos ORDER BY id DESC LIMIT 1`
    );
    if (plLast?.nombre) return { tipo: 'periodo', valor: plLast.nombre };
  } catch (_) {}

  // Fallback por calendario
  const y = new Date().getFullYear();
  const mon = new Date().getMonth() + 1;
  return { tipo: 'calc', valor: mon >= 5 ? `${y}-${y + 1}` : `${y - 1}-${y}` };
}

/**
 * Busca de forma segura la matrícula o información del estudiante
 */
async function findMatriculaOEstudiante(estudiante_id, anio_lectivo, conn = db) {
  // 1. Intentar con nueva estructura de matriculas (Gestión Académica)
  try {
    const [rows] = await conn.query(`
      SELECT 
        m.id AS id_matricula,
        m.id AS matricula_id,
        m.estado,
        m.fecha_matricula,
        m.valor_final,
        COALESCE(c.nombre, '') AS curso_nombre,
        COALESCE(n.nombre, '') AS curso_nivel,
        COALESCE(p.nombre, '') AS paralelo_nombre,
        COALESCE(pl.nombre, '') AS anio_lectivo
      FROM matriculas m
      LEFT JOIN oferta_academica o ON m.oferta_academica_id = o.id
      LEFT JOIN cursos c ON o.curso_id = c.id
      LEFT JOIN paralelos p ON o.paralelo_id = p.id
      LEFT JOIN niveles_educativos n ON c.nivel_id = n.id
      LEFT JOIN periodos_lectivos pl ON m.periodo_lectivo_id = pl.id
      WHERE m.estudiante_id = ?
      ORDER BY (CASE WHEN m.estado IN ('ACTIVA', 'Activa', 'MATRICULADO', 'CONFIRMADA') THEN 1 ELSE 2 END), m.id DESC
      LIMIT 1
    `, [estudiante_id]);

    if (rows && rows.length > 0) return rows[0];
  } catch (_) {}

  // 2. Intentar con matriculas_legacy si existiese
  try {
    const [rows] = await conn.query(`
      SELECT 
        m.id_matricula,
        m.id_matricula AS matricula_id,
        m.estado,
        m.anio_lectivo,
        c.nombre AS curso_nombre,
        c.nivel AS curso_nivel,
        m.paralelo AS paralelo_nombre
      FROM matriculas_legacy m
      LEFT JOIN cursos c ON m.id_curso = c.id_curso
      WHERE m.id_estudiante = ?
      ORDER BY m.id_matricula DESC
      LIMIT 1
    `, [estudiante_id]);

    if (rows && rows.length > 0) return rows[0];
  } catch (_) {}

  // 3. Fallback directo a la ficha del estudiante
  try {
    const [[est]] = await conn.query(`
      SELECT 
        id_estudiante,
        IFNULL(grado_curso, '') AS curso_nombre,
        '' AS curso_nivel,
        IFNULL(paralelo, '') AS paralelo_nombre,
        IFNULL(anio_lectivo, '') AS anio_lectivo,
        NULL AS id_matricula,
        NULL AS matricula_id,
        estado
      FROM estudiantes
      WHERE id_estudiante = ?
      LIMIT 1
    `, [estudiante_id]);

    if (est) return est;
  } catch (_) {}

  return null;
}

// ─────────────────────────────────────────────────────────────
// GET /buscar?q=...&anio_lectivo=
// Busca estudiantes registrados o matriculados
// ─────────────────────────────────────────────────────────────
exports.buscarEstudiantes = async (req, res) => {
  try {
    const { q } = req.query;
    let { anio_lectivo } = req.query;
    if (!q || q.trim().length < 1) return ok(res, { estudiantes: [] });

    if (!anio_lectivo) {
      const activo = await getAnioActivo();
      anio_lectivo = activo.valor;
    }

    const term = `%${q.trim()}%`;
    let rows = [];

    // Query 1: Búsqueda con LEFT JOIN a la estructura académica moderna
    try {
      const sqlModerno = `
        SELECT DISTINCT
          e.id_estudiante,
          e.codigo,
          e.cedula,
          e.nombres,
          e.apellidos,
          COALESCE(c.nombre, e.grado_curso, 'Sin Asignar') AS curso_nombre,
          COALESCE(n.nombre, '') AS curso_nivel,
          COALESCE(p.nombre, e.paralelo, '') AS paralelo_nombre,
          m.id AS matricula_id,
          COALESCE(pl.nombre, e.anio_lectivo, ?) AS anio_lectivo,
          COALESCE(m.estado, e.estado, 'REGISTRADO') AS estado_matricula
        FROM estudiantes e
        LEFT JOIN matriculas m ON m.estudiante_id = e.id_estudiante 
          AND m.estado IN ('ACTIVA', 'Activa', 'MATRICULADO', 'BORRADOR', 'CONFIRMADA', 'PENDIENTE')
        LEFT JOIN oferta_academica o ON m.oferta_academica_id = o.id
        LEFT JOIN cursos c ON o.curso_id = c.id
        LEFT JOIN paralelos p ON o.paralelo_id = p.id
        LEFT JOIN niveles_educativos n ON c.nivel_id = n.id
        LEFT JOIN periodos_lectivos pl ON m.periodo_lectivo_id = pl.id
        WHERE (
          e.nombres LIKE ? OR
          e.apellidos LIKE ? OR
          e.codigo LIKE ? OR
          e.cedula LIKE ? OR
          IFNULL(e.apellidos_nombres, '') LIKE ?
        )
        ORDER BY 
          (CASE WHEN m.id IS NOT NULL THEN 0 ELSE 1 END),
          e.apellidos ASC, 
          e.nombres ASC
        LIMIT 40
      `;
      [rows] = await db.query(sqlModerno, [anio_lectivo, term, term, term, term, term]);
    } catch (errModerno) {
      console.warn('[buscarEstudiantes] Error en query académico, usando fallback directo:', errModerno.message);
    }

    // Query 2: Fallback 100% garantizado a la tabla estudiantes si rows está vacío o falló
    if (!rows || rows.length === 0) {
      try {
        const sqlDirecto = `
          SELECT 
            e.id_estudiante,
            e.codigo,
            e.cedula,
            e.nombres,
            e.apellidos,
            IFNULL(e.grado_curso, 'Sin Asignar') AS curso_nombre,
            '' AS curso_nivel,
            IFNULL(e.paralelo, '') AS paralelo_nombre,
            NULL AS matricula_id,
            IFNULL(e.anio_lectivo, ?) AS anio_lectivo,
            e.estado AS estado_matricula
          FROM estudiantes e
          WHERE (
            e.nombres LIKE ? OR
            e.apellidos LIKE ? OR
            e.codigo LIKE ? OR
            e.cedula LIKE ? OR
            IFNULL(e.apellidos_nombres, '') LIKE ?
          )
          ORDER BY e.apellidos ASC, e.nombres ASC
          LIMIT 40
        `;
        [rows] = await db.query(sqlDirecto, [anio_lectivo, term, term, term, term, term]);
      } catch (errDir) {
        console.error('[buscarEstudiantes] Error en fallback directo:', errDir);
        return ok(res, { estudiantes: [] });
      }
    }

    // Mapear nivel_config para cada estudiante
    const estudiantes = rows.map(r => ({
      ...r,
      nivel_config: mapNivelConfig(r.curso_nombre, r.curso_nivel),
    }));

    ok(res, { estudiantes, anio_lectivo_usado: anio_lectivo });
  } catch (err) {
    srvErr(res, err, 'buscarEstudiantes');
  }
};

// ─────────────────────────────────────────────────────────────
// GET /config?anio_lectivo=
// ─────────────────────────────────────────────────────────────
exports.getConfig = async (req, res) => {
  try {
    const { anio_lectivo } = req.query;
    const where = anio_lectivo ? 'WHERE anio_lectivo = ?' : 'WHERE activo = 1';
    const params = anio_lectivo ? [anio_lectivo] : [];
    const [rows] = await db.query(
      `SELECT * FROM pension_config ${where} ORDER BY anio_lectivo DESC, nivel ASC`,
      params
    );
    ok(res, { config: rows });
  } catch (err) { srvErr(res, err, 'getConfig'); }
};

// ─────────────────────────────────────────────────────────────
// POST /config (admin)
// ─────────────────────────────────────────────────────────────
exports.upsertConfig = async (req, res) => {
  if (!req.usuario?.es_admin)
    return res.status(403).json({ success: false, message: 'Se requieren permisos de administrador.' });
  try {
    const { anio_lectivo, nivel, valor_mensual, activo = 1 } = req.body;
    if (!anio_lectivo || !nivel || valor_mensual == null)
      return badReq(res, 'Se requieren: anio_lectivo, nivel, valor_mensual.');
    await db.query(
      `INSERT INTO pension_config (anio_lectivo, nivel, valor_mensual, activo)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE valor_mensual = VALUES(valor_mensual), activo = VALUES(activo)`,
      [anio_lectivo, nivel, valor_mensual, activo]
    );
    ok(res, { message: 'Tarifa guardada.' });
  } catch (err) { srvErr(res, err, 'upsertConfig'); }
};

// ─────────────────────────────────────────────────────────────
// GET /cuotas/mes?estudiante_id=&mes=&anio_lectivo=
// ─────────────────────────────────────────────────────────────
exports.getCuotaMes = async (req, res) => {
  try {
    let { estudiante_id, mes, anio_lectivo } = req.query;
    if (!estudiante_id || !mes) return badReq(res, 'Se requieren: estudiante_id, mes.');

    if (!anio_lectivo) {
      const activo = await getAnioActivo();
      anio_lectivo = activo.valor;
    }

    const [[cuota]] = await db.query(
      `SELECT
         pq.id, pq.mes, pq.anio_lectivo, pq.valor_pension, pq.estado,
         COALESCE(SUM(CASE WHEN pp.anulado = 0 THEN pp.monto ELSE 0 END), 0) AS total_pagado
       FROM pension_cuotas pq
       LEFT JOIN pension_pagos pp ON pp.cuota_id = pq.id
       WHERE pq.estudiante_id = ? AND pq.mes = ? AND (pq.anio_lectivo = ? OR ? IS NULL)
       GROUP BY pq.id`,
      [estudiante_id, mes, anio_lectivo, anio_lectivo]
    );

    if (!cuota) {
      // No existe cuota aún: calcular valor de tarifa según nivel
      const mat = await findMatriculaOEstudiante(estudiante_id, anio_lectivo);
      const nivelConfig = mapNivelConfig(mat?.curso_nombre, mat?.curso_nivel);
      let valor_pension = 0;
      
      if (nivelConfig) {
        const [[cfg]] = await db.query(
          `SELECT valor_mensual FROM pension_config
           WHERE (anio_lectivo = ? OR ? IS NULL) AND nivel = ? AND activo = 1
           ORDER BY anio_lectivo DESC LIMIT 1`,
          [anio_lectivo, anio_lectivo, nivelConfig]
        );
        valor_pension = parseFloat(cfg?.valor_mensual || 0);
      }

      if (!valor_pension) {
        // Fallback a valor_pension en ficha del estudiante
        const [[estData]] = await db.query('SELECT valor_pension FROM estudiantes WHERE id_estudiante = ?', [estudiante_id]);
        valor_pension = parseFloat(estData?.valor_pension || 0);
      }

      return ok(res, { cuota: null, valor_pension, total_pagado: 0, saldo: valor_pension });
    }

    const saldo = parseFloat(cuota.valor_pension) - parseFloat(cuota.total_pagado);
    ok(res, {
      cuota,
      valor_pension: parseFloat(cuota.valor_pension),
      total_pagado:  parseFloat(cuota.total_pagado),
      saldo:         parseFloat(saldo.toFixed(2)),
    });
  } catch (err) { srvErr(res, err, 'getCuotaMes'); }
};

// ─────────────────────────────────────────────────────────────
// GET /cuotas/:estudiante_id?anio_lectivo=
// ─────────────────────────────────────────────────────────────
exports.getCuotasEstudiante = async (req, res) => {
  try {
    const { estudiante_id } = req.params;
    let { anio_lectivo }    = req.query;

    if (!anio_lectivo) {
      const activo = await getAnioActivo();
      anio_lectivo = activo.valor;
    }

    const [cuotas] = await db.query(
      `SELECT
         pq.id, pq.mes, pq.anio_lectivo, pq.valor_pension, pq.estado,
         COALESCE(SUM(CASE WHEN pp.anulado=0 THEN pp.monto ELSE 0 END),0) AS total_pagado,
         pq.valor_pension - COALESCE(SUM(CASE WHEN pp.anulado=0 THEN pp.monto ELSE 0 END),0) AS saldo
       FROM pension_cuotas pq
       LEFT JOIN pension_pagos pp ON pp.cuota_id = pq.id
       WHERE pq.estudiante_id = ? AND (pq.anio_lectivo = ? OR ? IS NULL)
       GROUP BY pq.id ORDER BY pq.mes ASC`,
      [estudiante_id, anio_lectivo, anio_lectivo]
    );

    const deuda_total = cuotas.reduce((a, c) => a + parseFloat(c.saldo || 0), 0);
    ok(res, { cuotas, deuda_total: parseFloat(deuda_total.toFixed(2)) });
  } catch (err) { srvErr(res, err, 'getCuotasEstudiante'); }
};

// ─────────────────────────────────────────────────────────────
// POST /cobrar (transaccional)
// ─────────────────────────────────────────────────────────────
exports.registrarCobro = async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const {
      estudiante_id, mes, monto,
      fecha_pago = new Date().toISOString().slice(0, 10),
      nota = null,
    } = req.body;
    let { anio_lectivo } = req.body;
    const usuario_id = req.usuario?.id_usuario || null;

    if (!estudiante_id || !mes || !monto)
      return badReq(res, 'Se requieren: estudiante_id, mes, monto.');
    if (parseFloat(monto) <= 0)
      return badReq(res, 'El monto debe ser mayor a 0.');

    if (!anio_lectivo) {
      const activo = await getAnioActivo();
      anio_lectivo = activo.valor;
    }

    // Buscar información de estudiante / matrícula
    const mat = await findMatriculaOEstudiante(estudiante_id, anio_lectivo, conn);
    if (!mat) return badReq(res, 'No se encontró la ficha del estudiante.');

    const matriculaId = mat.matricula_id || mat.id_matricula || null;
    const anioLectivoUsado = anio_lectivo || mat.anio_lectivo;

    // Obtener o crear cuota
    let [[cuota]] = await conn.query(
      `SELECT * FROM pension_cuotas
       WHERE estudiante_id = ? AND mes = ? AND anio_lectivo = ?`,
      [estudiante_id, mes, anioLectivoUsado]
    );

    if (!cuota) {
      const nivelConfig = mapNivelConfig(mat.curso_nombre, mat.curso_nivel);
      let valorMensual = 0;

      if (nivelConfig) {
        const [[cfg]] = await conn.query(
          `SELECT valor_mensual FROM pension_config
           WHERE (anio_lectivo = ? OR ? IS NULL) AND nivel = ? AND activo = 1
           ORDER BY anio_lectivo DESC LIMIT 1`,
          [anioLectivoUsado, anioLectivoUsado, nivelConfig]
        );
        if (cfg) valorMensual = parseFloat(cfg.valor_mensual);
      }

      if (!valorMensual) {
        const [[estData]] = await conn.query('SELECT valor_pension FROM estudiantes WHERE id_estudiante = ?', [estudiante_id]);
        valorMensual = parseFloat(estData?.valor_pension || 0);
      }

      if (!valorMensual || valorMensual <= 0) {
        valorMensual = 50.00; // Valor de tarifa estándar de contingencia
      }

      const [ins] = await conn.query(
        `INSERT INTO pension_cuotas
           (estudiante_id, matricula_id, anio_lectivo, mes, valor_pension, estado)
         VALUES (?, ?, ?, ?, ?, 'PENDIENTE')`,
        [estudiante_id, matriculaId, anioLectivoUsado, mes, valorMensual]
      );
      [[cuota]] = await conn.query(`SELECT * FROM pension_cuotas WHERE id = ?`, [ins.insertId]);
    }

    // Saldo actual
    const [[totPag]] = await conn.query(
      `SELECT COALESCE(SUM(monto), 0) AS total FROM pension_pagos
       WHERE cuota_id = ? AND anulado = 0`,
      [cuota.id]
    );
    const totalYaPagado = parseFloat(totPag.total);
    const saldoActual   = parseFloat(cuota.valor_pension) - totalYaPagado;

    if (parseFloat(monto) > saldoActual + 0.005)
      return badReq(res, `El monto ($${monto}) supera el saldo ($${saldoActual.toFixed(2)}).`);

    // Número de recibo correlativo
    await conn.query(
      `INSERT INTO pension_recibo_seq (anio_lectivo, ultimo_num) VALUES (?, 1)
       ON DUPLICATE KEY UPDATE ultimo_num = ultimo_num + 1`,
      [anioLectivoUsado]
    );
    const [[seq]] = await conn.query(
      `SELECT ultimo_num FROM pension_recibo_seq WHERE anio_lectivo = ?`, [anioLectivoUsado]
    );
    const numero_recibo = seq.ultimo_num;

    // Registrar pago
    const [pagoIns] = await conn.query(
      `INSERT INTO pension_pagos
         (cuota_id, estudiante_id, fecha_pago, monto, nota, usuario_id, anulado, numero_recibo)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
      [cuota.id, estudiante_id, fecha_pago, parseFloat(monto), nota, usuario_id, numero_recibo]
    );

    // Actualizar estado de cuota
    const nuevoTotal = totalYaPagado + parseFloat(monto);
    const val = parseFloat(cuota.valor_pension);
    const nuevoEstado = nuevoTotal >= val - 0.005 ? 'PAGADO'
      : nuevoTotal > 0 ? 'PARCIAL' : 'PENDIENTE';
    await conn.query(`UPDATE pension_cuotas SET estado = ? WHERE id = ?`, [nuevoEstado, cuota.id]);

    await conn.commit();
    ok(res, {
      message: 'Cobro registrado correctamente.',
      pago_id:      pagoIns.insertId,
      cuota_id:     cuota.id,
      numero_recibo,
      nuevo_total:  parseFloat(nuevoTotal.toFixed(2)),
      nuevo_saldo:  parseFloat((val - nuevoTotal).toFixed(2)),
      nuevo_estado: nuevoEstado,
    });
  } catch (err) {
    await conn.rollback();
    srvErr(res, err, 'registrarCobro');
  } finally {
    conn.release();
  }
};

// ─────────────────────────────────────────────────────────────
// GET /cobros-recientes
// ─────────────────────────────────────────────────────────────
exports.getCobrosRecientes = async (req, res) => {
  try {
    const { fecha_desde, fecha_hasta, estudiante_id, anio_lectivo, limit = 30, page = 1 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const cond = ['1=1'];
    const params = [];

    if (fecha_desde)   { cond.push('pp.fecha_pago >= ?');   params.push(fecha_desde); }
    if (fecha_hasta)   { cond.push('pp.fecha_pago <= ?');   params.push(fecha_hasta); }
    if (estudiante_id) { cond.push('pp.estudiante_id = ?'); params.push(estudiante_id); }
    if (anio_lectivo)  { cond.push('pq.anio_lectivo = ?');  params.push(anio_lectivo); }

    const where = cond.join(' AND ');

    const [rows] = await db.query(
      `SELECT
         pp.id, pp.fecha_pago, pp.monto, pp.nota, pp.anulado,
         pp.motivo_anulacion, pp.numero_recibo, pp.created_at,
         pp.factura_id,
         f.numero AS factura_numero,
         f.estado AS factura_estado,
         (CASE WHEN f.id IS NOT NULL AND f.estado = 'EMITIDA' THEN 1 ELSE 0 END) AS facturado,
         pq.mes, pq.anio_lectivo, pq.valor_pension,
         e.codigo, e.nombres, e.apellidos,
         IFNULL(e.grado_curso, '') AS curso_nombre,
         IFNULL(e.paralelo, '') AS paralelo,
         u.nombre_completo AS usuario_nombre
       FROM pension_pagos pp
       JOIN pension_cuotas pq ON pq.id = pp.cuota_id
       JOIN estudiantes e ON e.id_estudiante = pp.estudiante_id
       LEFT JOIN facturas f ON f.id = pp.factura_id
       LEFT JOIN usuarios u ON u.id_usuario = pp.usuario_id
       WHERE ${where}
       ORDER BY pp.fecha_pago DESC, pp.id DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    ok(res, { cobros: rows, total: rows.length, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) { srvErr(res, err, 'getCobrosRecientes'); }
};

// ─────────────────────────────────────────────────────────────
// PATCH /pagos/:id/anular
// ─────────────────────────────────────────────────────────────
exports.anularPago = async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const { id } = req.params;
    const { motivo } = req.body;
    const usuario_id = req.usuario?.id_usuario;

    if (!motivo?.trim()) return badReq(res, 'Se requiere un motivo de anulación.');

    const [[pago]] = await conn.query(`SELECT * FROM pension_pagos WHERE id = ?`, [id]);
    if (!pago) return notFnd(res, 'Pago no encontrado.');
    if (pago.anulado) return badReq(res, 'El pago ya está anulado.');

    if (pago.factura_id) {
      try {
        const [[fac]] = await conn.query('SELECT numero, estado FROM facturas WHERE id = ?', [pago.factura_id]);
        if (fac && fac.estado === 'EMITIDA') {
          return badReq(res, `No se puede anular el pago porque está vinculado a la factura ${fac.numero}. Debe anular primero la factura correspondiente.`);
        }
      } catch (_) {}
    }

    if (!req.usuario?.es_admin && pago.usuario_id !== usuario_id)
      return res.status(403).json({ success: false, message: 'Solo el administrador puede anular pagos ajenos.' });

    await conn.query(
      `UPDATE pension_pagos SET anulado = 1, motivo_anulacion = ? WHERE id = ?`,
      [motivo.trim(), id]
    );

    const [[totPag]] = await conn.query(
      `SELECT COALESCE(SUM(monto), 0) AS total FROM pension_pagos
       WHERE cuota_id = ? AND anulado = 0`,
      [pago.cuota_id]
    );
    const [[cuota]] = await conn.query(`SELECT * FROM pension_cuotas WHERE id = ?`, [pago.cuota_id]);
    const nuevoTotal = parseFloat(totPag.total);
    const val        = parseFloat(cuota.valor_pension);
    const nuevoEstado = nuevoTotal >= val - 0.005 ? 'PAGADO'
      : nuevoTotal > 0 ? 'PARCIAL' : 'PENDIENTE';
    await conn.query(`UPDATE pension_cuotas SET estado = ? WHERE id = ?`, [nuevoEstado, pago.cuota_id]);

    await conn.commit();
    ok(res, { message: 'Pago anulado exitosamente.' });
  } catch (err) {
    await conn.rollback();
    srvErr(res, err, 'anularPago');
  } finally {
    conn.release();
  }
};

// ─────────────────────────────────────────────────────────────
// GET /totales-dia?fecha=&anio_lectivo=
// ─────────────────────────────────────────────────────────────
exports.getTotalesDia = async (req, res) => {
  try {
    const { fecha = new Date().toISOString().slice(0, 10) } = req.query;
    let { anio_lectivo } = req.query;

    if (!anio_lectivo) {
      const activo = await getAnioActivo();
      anio_lectivo = activo.valor;
    }

    const [rows] = await db.query(
      `SELECT 
         IFNULL(e.grado_curso, '') AS curso_nombre,
         COALESCE(SUM(pp.monto), 0) AS total
       FROM pension_pagos pp
       JOIN pension_cuotas pq ON pq.id = pp.cuota_id
       JOIN estudiantes e ON e.id_estudiante = pp.estudiante_id
       WHERE pp.fecha_pago = ? AND pp.anulado = 0 AND (pq.anio_lectivo = ? OR ? IS NULL)
       GROUP BY e.grado_curso`,
      [fecha, anio_lectivo, anio_lectivo]
    );

    const totales = { 'INICIAL': 0, '1-7 EGB': 0, '8-10 EGB': 0, '1-2 BACH': 0, '3 BACH': 0 };
    rows.forEach(r => {
      const nivel = mapNivelConfig(r.curso_nombre, '');
      if (nivel && totales[nivel] !== undefined) totales[nivel] += parseFloat(r.total);
    });

    const total_diario = Object.values(totales).reduce((a, b) => a + b, 0);

    let total_facturado = 0;
    let facturas_count = 0;
    try {
      const [[facTot]] = await db.query(
        `SELECT COALESCE(SUM(total), 0) AS total, COUNT(*) AS count
         FROM facturas WHERE fecha_emision = ? AND estado = 'EMITIDA'`,
        [fecha]
      );
      total_facturado = parseFloat(facTot?.total || 0);
      facturas_count = parseInt(facTot?.count || 0);
    } catch (_) {}

    const diferencia_facturacion = parseFloat((total_diario - total_facturado).toFixed(2));

    ok(res, {
      fecha,
      totales: {
        'PENS INIC':     parseFloat(totales['INICIAL'].toFixed(2)),
        'PENS 1-7 EGB':  parseFloat(totales['1-7 EGB'].toFixed(2)),
        'PENS 8-10 EGB': parseFloat(totales['8-10 EGB'].toFixed(2)),
        'PENS 1-2 BACH': parseFloat(totales['1-2 BACH'].toFixed(2)),
        'PENS 3 BACH':   parseFloat(totales['3 BACH'].toFixed(2)),
      },
      total_diario: parseFloat(total_diario.toFixed(2)),
      total_facturado: parseFloat(total_facturado.toFixed(2)),
      diferencia_facturacion,
      facturas_count
    });
  } catch (err) { srvErr(res, err, 'getTotalesDia'); }
};

// ─────────────────────────────────────────────────────────────
// GET /morosos?mes=&anio_lectivo=&nivel=&paralelo=
// ─────────────────────────────────────────────────────────────
exports.getMorosos = async (req, res) => {
  try {
    let { mes, anio_lectivo, nivel, paralelo, page = 1, limit = 100 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    if (!anio_lectivo) {
      const activo = await getAnioActivo();
      anio_lectivo = activo.valor;
    }

    const cond = ["pq.estado IN ('PENDIENTE','PARCIAL')", '(pq.anio_lectivo = ? OR ? IS NULL)'];
    const params = [anio_lectivo, anio_lectivo];

    if (mes)      { cond.push('pq.mes = ?'); cond.push(mes); }
    if (paralelo) { cond.push('e.paralelo = ?'); cond.push(paralelo); }

    const where = cond.join(' AND ');

    const [rows] = await db.query(
      `SELECT
         e.codigo, e.nombres, e.apellidos,
         IFNULL(e.grado_curso, '') AS curso_nombre,
         IFNULL(e.paralelo, '') AS paralelo,
         pq.mes, pq.anio_lectivo, pq.valor_pension, pq.estado,
         COALESCE(SUM(CASE WHEN pp.anulado=0 THEN pp.monto ELSE 0 END),0) AS total_pagado,
         pq.valor_pension - COALESCE(SUM(CASE WHEN pp.anulado=0 THEN pp.monto ELSE 0 END),0) AS saldo
       FROM pension_cuotas pq
       JOIN estudiantes e ON e.id_estudiante = pq.estudiante_id
       LEFT JOIN pension_pagos pp ON pp.cuota_id = pq.id
       WHERE ${where}
       GROUP BY pq.id
       HAVING saldo > 0
       ORDER BY pq.mes ASC, e.apellidos ASC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    ok(res, { morosos: rows, total: rows.length, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) { srvErr(res, err, 'getMorosos'); }
};

// ─────────────────────────────────────────────────────────────
// GET /recibo/:pago_id
// ─────────────────────────────────────────────────────────────
exports.getRecibo = async (req, res) => {
  try {
    const { pago_id } = req.params;
    const [[recibo]] = await db.query(
      `SELECT
         pp.id AS pago_id, pp.numero_recibo, pp.fecha_pago, pp.monto, pp.nota, pp.anulado,
         pq.mes, pq.anio_lectivo, pq.valor_pension,
         e.codigo, e.nombres, e.apellidos, e.cedula,
         IFNULL(e.grado_curso, '') AS curso_nombre,
         IFNULL(e.paralelo, '') AS paralelo,
         u.nombre_completo AS cobrado_por
       FROM pension_pagos pp
       JOIN pension_cuotas pq ON pq.id = pp.cuota_id
       JOIN estudiantes e ON e.id_estudiante = pp.estudiante_id
       LEFT JOIN usuarios u ON u.id_usuario = pp.usuario_id
       WHERE pp.id = ?`,
      [pago_id]
    );
    if (!recibo) return notFnd(res, 'Pago no encontrado.');
    ok(res, { recibo });
  } catch (err) { srvErr(res, err, 'getRecibo'); }
};
