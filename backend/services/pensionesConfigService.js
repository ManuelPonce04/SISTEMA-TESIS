/**
 * ============================================================
 * Service: Configuración de Pensiones
 * Lógica central separada del controlador.
 * ============================================================
 */
const db = require('../config/db');

// ─────────────────────────────────────────────────────────────
// AUDITORÍA
// ─────────────────────────────────────────────────────────────

/**
 * Registra un evento en auditoria_pensiones.
 */
async function registrarAuditoria(conn, { entidad, entidad_id, accion, datos_antes = null, datos_despues = null, motivo = null, usuario, req }) {
  try {
    await conn.query(
      `INSERT INTO auditoria_pensiones
         (entidad, entidad_id, accion, datos_antes, datos_despues, motivo, usuario_id, usuario_nombre, ip, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        entidad,
        entidad_id || null,
        accion,
        datos_antes ? JSON.stringify(datos_antes) : null,
        datos_despues ? JSON.stringify(datos_despues) : null,
        motivo || null,
        usuario?.id || null,
        usuario?.nombre_completo || null,
        req?.ip || req?.connection?.remoteAddress || null,
        req?.headers?.['user-agent'] || null,
      ]
    );
  } catch (err) {
    // La auditoría nunca debe romper el flujo principal
    console.error('[Auditoría] Error al registrar:', err.message);
  }
}

// ─────────────────────────────────────────────────────────────
// TARIFAS: RESOLUCIÓN DE PRIORIDAD
// ─────────────────────────────────────────────────────────────

/**
 * Calcula la prioridad de una tarifa según sus campos.
 * Curso (3) > Subnivel (2) > Nivel (1) > General (0)
 */
function calcularPrioridadTarifa({ nivel_id, subnivel_id, curso_id }) {
  if (curso_id) return 3;
  if (subnivel_id) return 2;
  if (nivel_id) return 1;
  return 0;
}

/**
 * Resuelve la tarifa aplicable para un estudiante dado su contexto.
 * Devuelve { tarifa, conflicto: false } o { tarifa: null, conflicto: true, tarifas: [] }
 *
 * @param {object} params
 * @param {number} params.periodo_lectivo_id
 * @param {number|null} params.nivel_id
 * @param {number|null} params.subnivel_id
 * @param {number|null} params.curso_id
 * @param {string} params.mes  Fecha en formato YYYY-MM-DD (primer día del mes)
 */
async function resolverTarifaPension({ periodo_lectivo_id, nivel_id, subnivel_id, curso_id, mes }) {
  // Obtener todas las tarifas activas que cubren ese mes y periodo
  const [tarifas] = await db.query(
    `SELECT * FROM tarifas_pension
     WHERE periodo_lectivo_id = ?
       AND estado = 'ACTIVA'
       AND mes_desde <= ?
       AND mes_hasta >= ?
     ORDER BY prioridad DESC`,
    [periodo_lectivo_id, mes, mes]
  );

  if (tarifas.length === 0) return { tarifa: null, conflicto: false };

  // Filtrar las que aplican para este estudiante (contexto exacto o más general)
  const candidatas = tarifas.filter(t => {
    // Curso específico
    if (t.curso_id && t.curso_id !== curso_id) return false;
    // Subnivel específico (solo si la tarifa no tiene curso)
    if (!t.curso_id && t.subnivel_id && t.subnivel_id !== subnivel_id) return false;
    // Nivel específico (solo si no tiene curso ni subnivel)
    if (!t.curso_id && !t.subnivel_id && t.nivel_id && t.nivel_id !== nivel_id) return false;
    return true;
  });

  if (candidatas.length === 0) return { tarifa: null, conflicto: false };

  // Ordenar por prioridad descendente
  candidatas.sort((a, b) => b.prioridad - a.prioridad);
  const maxPrioridad = candidatas[0].prioridad;
  const topCandidatas = candidatas.filter(c => c.prioridad === maxPrioridad);

  // Si hay más de una con la misma prioridad máxima → CONFLICTO
  if (topCandidatas.length > 1) {
    return { tarifa: null, conflicto: true, tarifas: topCandidatas };
  }

  return { tarifa: topCandidatas[0], conflicto: false };
}

// ─────────────────────────────────────────────────────────────
// TARIFAS: DETECCIÓN DE CONFLICTOS
// ─────────────────────────────────────────────────────────────

/**
 * Detecta si existe conflicto de vigencia al crear/editar una tarifa.
 * Conflicto: otra tarifa activa con la misma prioridad y rango solapado.
 * @param {object} params
 * @param {number|null} params.excludeId  ID de la tarifa actual (para edición)
 */
async function detectarConflictoTarifa({ periodo_lectivo_id, nivel_id, subnivel_id, curso_id, mes_desde, mes_hasta, excludeId = null }) {
  const prioridad = calcularPrioridadTarifa({ nivel_id, subnivel_id, curso_id });

  let query = `
    SELECT * FROM tarifas_pension
    WHERE periodo_lectivo_id = ?
      AND prioridad = ?
      AND estado = 'ACTIVA'
      AND mes_desde <= ?
      AND mes_hasta >= ?
  `;
  const params = [periodo_lectivo_id, prioridad, mes_hasta, mes_desde];

  // Mismo nivel de especificidad
  if (curso_id) {
    query += ` AND curso_id = ?`;
    params.push(curso_id);
  } else if (subnivel_id) {
    query += ` AND subnivel_id = ? AND curso_id IS NULL`;
    params.push(subnivel_id);
  } else if (nivel_id) {
    query += ` AND nivel_id = ? AND subnivel_id IS NULL AND curso_id IS NULL`;
    params.push(nivel_id);
  } else {
    query += ` AND nivel_id IS NULL AND subnivel_id IS NULL AND curso_id IS NULL`;
  }

  if (excludeId) {
    query += ` AND id != ?`;
    params.push(excludeId);
  }

  const [conflictos] = await db.query(query, params);
  return conflictos;
}

// ─────────────────────────────────────────────────────────────
// MESES COBRABLES
// ─────────────────────────────────────────────────────────────

const MESES_ES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

/**
 * Resuelve la fecha de vencimiento válida para un mes dado un día preferido.
 * Políticas: ULTIMO_DIA | DIA_FIJO (default)
 */
function resolverFechaVencimiento(anio, mes, dia, politica = 'DIA_FIJO') {
  if (politica === 'ULTIMO_DIA') {
    // Último día del mes
    return new Date(anio, mes, 0); // mes es 1-12, new Date(anio, mes, 0) = último día del mes anterior
  }

  // DIA_FIJO: ajustar al último día del mes si el día no existe
  const ultimoDia = new Date(anio, mes, 0).getDate();
  const diaValido = Math.min(dia, ultimoDia);
  return new Date(anio, mes - 1, diaValido);
}

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Genera o actualiza los meses cobrables de un periodo.
 * IDEMPOTENTE: ignora meses ya existentes (INSERT IGNORE).
 *
 * @param {object} params
 * @param {number} params.periodo_lectivo_id
 * @param {string} params.mes_desde  YYYY-MM-DD (primer día del primer mes)
 * @param {string} params.mes_hasta  YYYY-MM-DD (primer día del último mes)
 * @param {number} params.dia_vencimiento  1-31
 * @param {string} params.politica_vencimiento  'DIA_FIJO' | 'ULTIMO_DIA'
 * @param {string[]} params.meses_excluidos  ['2026-07-01', ...]
 * @returns {object[]} meses generados
 */
async function generarMesesCobrables(conn, { periodo_lectivo_id, mes_desde, mes_hasta, dia_vencimiento, politica_vencimiento = 'DIA_FIJO', meses_excluidos = [] }) {
  const desde = new Date(mes_desde);
  const hasta = new Date(mes_hasta);
  const excluidos = new Set(meses_excluidos);
  const mesesGenerados = [];
  let orden = 1;

  let cursor = new Date(desde.getFullYear(), desde.getMonth(), 1);

  while (cursor <= hasta) {
    const anio = cursor.getFullYear();
    const mes = cursor.getMonth() + 1; // 1-12
    const primerDia = formatDate(cursor);

    if (!excluidos.has(primerDia)) {
      const nombreMostrar = `${MESES_ES[mes - 1]} ${anio}`;
      const fechaVenc = resolverFechaVencimiento(anio, mes, dia_vencimiento, politica_vencimiento);
      const fechaVencStr = formatDate(fechaVenc);

      const [result] = await conn.query(
        `INSERT IGNORE INTO periodo_meses_cobrables
           (periodo_lectivo_id, mes, nombre_mostrar, numero_orden, fecha_vencimiento, cobrable, estado)
         VALUES (?, ?, ?, ?, ?, TRUE, 'PLANIFICADO')`,
        [periodo_lectivo_id, primerDia, nombreMostrar, orden, fechaVencStr]
      );

      mesesGenerados.push({
        mes: primerDia,
        nombre_mostrar: nombreMostrar,
        numero_orden: orden,
        fecha_vencimiento: fechaVencStr,
        insertado: result.affectedRows > 0,
      });
      orden++;
    }

    // Avanzar al siguiente mes
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
  }

  return mesesGenerados;
}

// ─────────────────────────────────────────────────────────────
// CÁLCULO DE BENEFICIOS
// ─────────────────────────────────────────────────────────────

/**
 * Calcula el valor final de pensión aplicando beneficios.
 *
 * Reglas de prioridad:
 *   200+ EXONERACION_TOTAL → valor_final = 0, se detiene
 *   100+ VALOR_FINAL       → valor_final = valor especial, se detiene
 *   PORCENTAJE             → descuento porcentual acumulado
 *   VALOR_FIJO             → descuento fijo acumulado
 *
 * @param {number} tarifa_base
 * @param {object[]} beneficios Array de { tipo_calculo, porcentaje_predeterminado, valor_predeterminado, prioridad }
 * @returns {object} { tarifa_base, descuento_porcentual, descuento_fijo, valor_especial, valor_final, advertencias[] }
 */
function calcularBeneficio(tarifa_base, beneficios = []) {
  const advertencias = [];
  let descuento_porcentual = 0;
  let descuento_fijo = 0;
  let valor_especial = null;
  let valor_final = parseFloat(tarifa_base);

  // Ordenar por prioridad descendente
  const ordenados = [...beneficios].sort((a, b) => (b.prioridad || 0) - (a.prioridad || 0));

  for (const b of ordenados) {
    const calculo = b.tipo_calculo;

    if (calculo === 'EXONERACION_TOTAL') {
      valor_final = 0;
      descuento_porcentual = 0;
      descuento_fijo = 0;
      valor_especial = null;
      return { tarifa_base, descuento_porcentual, descuento_fijo, valor_especial, valor_final: 0, advertencias };
    }

    if (calculo === 'VALOR_FINAL') {
      if (b.valor_predeterminado !== null && b.valor_predeterminado !== undefined) {
        valor_especial = parseFloat(b.valor_predeterminado);
        valor_final = Math.max(0, valor_especial);
        return { tarifa_base, descuento_porcentual: 0, descuento_fijo: 0, valor_especial, valor_final, advertencias };
      } else {
        advertencias.push(`Beneficio "${b.nombre}" tipo VALOR_FINAL sin valor definido — ignorado.`);
      }
    }

    if (calculo === 'PORCENTAJE') {
      const pct = parseFloat(b.porcentaje_predeterminado || 0);
      if (pct <= 0) {
        advertencias.push(`Beneficio "${b.nombre}" tiene porcentaje 0 o no definido.`);
      } else {
        descuento_porcentual += pct;
      }
    }

    if (calculo === 'VALOR_FIJO') {
      const val = parseFloat(b.valor_predeterminado || 0);
      if (val <= 0) {
        advertencias.push(`Beneficio "${b.nombre}" tiene valor fijo 0 o no definido.`);
      } else {
        descuento_fijo += val;
      }
    }
  }

  // Aplicar descuentos sobre tarifa base
  const montoDescuentoPct = (tarifa_base * descuento_porcentual) / 100;
  valor_final = tarifa_base - montoDescuentoPct - descuento_fijo;

  // Límite: no puede ser negativo
  if (valor_final < 0) {
    advertencias.push('Los descuentos superan la tarifa base. El valor final se ajusta a $0.00.');
    valor_final = 0;
  }

  // Redondear a 2 decimales
  valor_final = Math.round(valor_final * 100) / 100;

  return {
    tarifa_base: parseFloat(tarifa_base),
    descuento_porcentual,
    monto_descuento_pct: Math.round(montoDescuentoPct * 100) / 100,
    descuento_fijo,
    valor_especial,
    valor_final,
    advertencias,
  };
}

// ─────────────────────────────────────────────────────────────
// COMPATIBILIDADES
// ─────────────────────────────────────────────────────────────

/**
 * Verifica si un conjunto de beneficios es compatible entre sí.
 * Retorna { compatible: true } o { compatible: false, incompatibles: [] }
 */
async function verificarCompatibilidades(beneficio_ids) {
  if (!beneficio_ids || beneficio_ids.length < 2) return { compatible: true, incompatibles: [] };

  const incompatibles = [];

  for (let i = 0; i < beneficio_ids.length; i++) {
    for (let j = i + 1; j < beneficio_ids.length; j++) {
      const a = beneficio_ids[i];
      const b = beneficio_ids[j];

      const [rows] = await db.query(
        `SELECT * FROM beneficio_compatibilidades
         WHERE (beneficio_id = ? AND beneficio_relacionado_id = ?)
            OR (beneficio_id = ? AND beneficio_relacionado_id = ?)`,
        [a, b, b, a]
      );

      if (rows.length > 0 && !rows[0].son_compatibles) {
        incompatibles.push({ beneficio_a: a, beneficio_b: b, observacion: rows[0].observacion });
      }
    }
  }

  return { compatible: incompatibles.length === 0, incompatibles };
}

// ─────────────────────────────────────────────────────────────
// SIMULADOR
// ─────────────────────────────────────────────────────────────

/**
 * Simula el cálculo de pensión SIN guardar nada.
 *
 * @param {object} params
 * @param {number} params.periodo_lectivo_id
 * @param {number|null} params.nivel_id
 * @param {number|null} params.subnivel_id
 * @param {number|null} params.curso_id
 * @param {string} params.mes  'YYYY-MM-DD'
 * @param {number[]} params.beneficio_ids  IDs de tipos_beneficio_pension
 */
async function simularPension({ periodo_lectivo_id, nivel_id, subnivel_id, curso_id, mes, beneficio_ids = [] }) {
  // 1. Resolver tarifa
  const resolucion = await resolverTarifaPension({ periodo_lectivo_id, nivel_id, subnivel_id, curso_id, mes });

  if (resolucion.conflicto) {
    return { error: 'CONFLICTO_TARIFA', tarifas_en_conflicto: resolucion.tarifas };
  }
  if (!resolucion.tarifa) {
    return { error: 'SIN_TARIFA', mensaje: 'No se encontró tarifa activa para los parámetros indicados.' };
  }

  const tarifa = resolucion.tarifa;

  // 2. Cargar beneficios seleccionados
  let beneficios = [];
  if (beneficio_ids.length > 0) {
    const placeholders = beneficio_ids.map(() => '?').join(',');
    const [rows] = await db.query(
      `SELECT * FROM tipos_beneficio_pension WHERE id IN (${placeholders}) AND activo = TRUE`,
      beneficio_ids
    );
    beneficios = rows;
  }

  // 3. Verificar compatibilidades
  const compatibilidad = await verificarCompatibilidades(beneficio_ids);

  // 4. Calcular
  const calculo = calcularBeneficio(tarifa.valor_mensual, beneficios);

  return {
    tarifa,
    beneficios,
    compatibilidad,
    calculo,
    advertencias: [
      ...calculo.advertencias,
      ...(compatibilidad.incompatibles.length > 0 ? ['Existen beneficios incompatibles seleccionados.'] : []),
    ],
  };
}

// ─────────────────────────────────────────────────────────────
// COPIAR CONFIGURACIÓN DE PERIODO
// ─────────────────────────────────────────────────────────────

/**
 * Copia tarifas (y opcionalmente meses) de un periodo origen a un destino.
 * Ejecuta dentro de transacción.
 * NO copia: asignaciones de estudiantes, mensualidades, pagos.
 */
async function copiarConfiguracionPeriodo(conn, { origen_id, destino_id, copiar_meses = false, copiar_beneficios = false, excluir_niveles = [], excluir_cursos = [], nuevo_usuario_id }) {
  const resultado = { tarifas_copiadas: 0, meses_copiados: 0, errores: [] };

  // Copiar tarifas
  const [tarifas] = await conn.query(
    `SELECT * FROM tarifas_pension WHERE periodo_lectivo_id = ?`,
    [origen_id]
  );

  for (const t of tarifas) {
    if (excluir_niveles.includes(t.nivel_id)) continue;
    if (excluir_cursos.includes(t.curso_id)) continue;

    try {
      await conn.query(
        `INSERT INTO tarifas_pension
           (periodo_lectivo_id, nivel_id, subnivel_id, curso_id, valor_mensual,
            mes_desde, mes_hasta, fecha_desde, fecha_hasta, prioridad, estado, observacion, creado_por)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'BORRADOR', ?, ?)`,
        [
          destino_id, t.nivel_id, t.subnivel_id, t.curso_id, t.valor_mensual,
          t.mes_desde, t.mes_hasta, t.fecha_desde, t.fecha_hasta, t.prioridad,
          t.observacion ? `[Copiada del periodo ${origen_id}] ${t.observacion}` : `[Copiada del periodo ${origen_id}]`,
          nuevo_usuario_id,
        ]
      );
      resultado.tarifas_copiadas++;
    } catch (err) {
      resultado.errores.push(`Tarifa ID ${t.id}: ${err.message}`);
    }
  }

  // Copiar meses cobrables (opcional)
  if (copiar_meses) {
    const [meses] = await conn.query(
      `SELECT * FROM periodo_meses_cobrables WHERE periodo_lectivo_id = ?`,
      [origen_id]
    );

    for (const m of meses) {
      try {
        await conn.query(
          `INSERT IGNORE INTO periodo_meses_cobrables
             (periodo_lectivo_id, mes, nombre_mostrar, numero_orden, fecha_vencimiento, cobrable, estado)
           VALUES (?, ?, ?, ?, ?, ?, 'PLANIFICADO')`,
          [destino_id, m.mes, m.nombre_mostrar, m.numero_orden, m.fecha_vencimiento, m.cobrable]
        );
        resultado.meses_copiados++;
      } catch (err) {
        resultado.errores.push(`Mes ${m.mes}: ${err.message}`);
      }
    }
  }

  return resultado;
}

module.exports = {
  registrarAuditoria,
  calcularPrioridadTarifa,
  resolverTarifaPension,
  detectarConflictoTarifa,
  resolverFechaVencimiento,
  generarMesesCobrables,
  calcularBeneficio,
  verificarCompatibilidades,
  simularPension,
  copiarConfiguracionPeriodo,
  formatDate,
  MESES_ES,
};
