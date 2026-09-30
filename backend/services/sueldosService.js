/**
 * ============================================================
 * Service: Sueldos y Anticipos
 * Lógica centralizada para evitar duplicación y garantizar
 * cálculos precisos para la nómina y los topes de anticipos.
 * ============================================================
 */
const pool = require('../config/db');

/**
 * Retorna el sueldo base que tenía un trabajador en un mes específico.
 */
const getSueldoBaseMensual = async (personal_id, mes_aplicacion, conn = pool) => {
  // mes_aplicacion debe ser string YYYY-MM-DD (ej: '2026-07-01')
  // Tomamos el último día del mes para ver si el sueldo estaba activo en algún momento de ese mes
  
  const [rows] = await conn.query(`
    SELECT sueldo 
    FROM historial_sueldos 
    WHERE personal_id = ? 
      AND fecha_desde <= LAST_DAY(?) 
      AND (fecha_hasta IS NULL OR fecha_hasta >= ?)
    ORDER BY fecha_desde DESC 
    LIMIT 1
  `, [personal_id, mes_aplicacion, mes_aplicacion]);

  if (rows.length === 0) return 0;
  return parseFloat(rows[0].sueldo);
};

/**
 * Obtiene los ajustes mensuales (horas extras, etc.)
 */
const getAjustesMensuales = async (personal_id, periodo_id, mes_aplicacion, conn = pool) => {
  const [rows] = await conn.query(`
    SELECT horas_extras, otros_ingresos, otras_deducciones, observacion, estado
    FROM ajustes_mensuales_personal
    WHERE personal_id = ? AND periodo_lectivo_id = ? AND mes = ?
  `, [personal_id, periodo_id, mes_aplicacion]);

  if (rows.length === 0) {
    return { horas_extras: 0, otros_ingresos: 0, otras_deducciones: 0, observacion: '', estado: 'BORRADOR' };
  }
  return {
    horas_extras: parseFloat(rows[0].horas_extras),
    otros_ingresos: parseFloat(rows[0].otros_ingresos),
    otras_deducciones: parseFloat(rows[0].otras_deducciones),
    observacion: rows[0].observacion,
    estado: rows[0].estado
  };
};

/**
 * Suma todos los anticipos activos de un mes
 */
const getTotalAnticipos = async (personal_id, periodo_id, mes_aplicacion, conn = pool) => {
  const [rows] = await conn.query(`
    SELECT COALESCE(SUM(mf.valor), 0) AS total
    FROM movimientos_financieros mf
    JOIN catalogo_movimientos cm ON cm.id = mf.catalogo_movimiento_id
    WHERE mf.personal_id = ? 
      AND mf.periodo_lectivo_id = ?
      AND mf.mes_aplicacion = ?
      AND mf.estado = 'ACTIVO'
      AND cm.afecta_nomina = 'ANTICIPO_SUELDO'
  `, [personal_id, periodo_id, mes_aplicacion]);

  return parseFloat(rows[0].total);
};

/**
 * Calcula el saldo disponible antes de otorgar un nuevo anticipo
 */
const getSaldoDisponible = async (personal_id, periodo_id, mes_aplicacion, conn = pool) => {
  const sueldoBase = await getSueldoBaseMensual(personal_id, mes_aplicacion, conn);
  const ajustes = await getAjustesMensuales(personal_id, periodo_id, mes_aplicacion, conn);
  const totalAnticipos = await getTotalAnticipos(personal_id, periodo_id, mes_aplicacion, conn);

  const totalIngresos = sueldoBase + ajustes.horas_extras + ajustes.otros_ingresos;
  const saldoDisponible = totalIngresos - totalAnticipos - ajustes.otras_deducciones;

  return saldoDisponible;
};

/**
 * Listado de anticipos de un mes
 */
const getListaAnticiposMes = async (personal_id, periodo_id, mes_aplicacion, conn = pool) => {
  const [rows] = await conn.query(`
    SELECT 
      mf.id, mf.fecha, mf.descripcion, mf.valor, mf.estado, mf.numero_comprobante,
      cm.nombre AS concepto, cf.nombre AS cuenta,
      u.nombre_completo AS registrado_por,
      aa.valor_excedido, aa.justificacion
    FROM movimientos_financieros mf
    JOIN catalogo_movimientos cm ON cm.id = mf.catalogo_movimiento_id
    JOIN cuentas_financieras cf ON cf.id = mf.cuenta_financiera_id
    LEFT JOIN usuarios u ON u.id_usuario = mf.creado_por
    LEFT JOIN autorizaciones_anticipos aa ON aa.movimiento_financiero_id = mf.id
    WHERE mf.personal_id = ? 
      AND mf.periodo_lectivo_id = ?
      AND mf.mes_aplicacion = ?
      AND cm.afecta_nomina = 'ANTICIPO_SUELDO'
    ORDER BY mf.fecha ASC, mf.created_at ASC
  `, [personal_id, periodo_id, mes_aplicacion]);

  return rows;
};

module.exports = {
  getSueldoBaseMensual,
  getAjustesMensuales,
  getTotalAnticipos,
  getSaldoDisponible,
  getListaAnticiposMes
};
