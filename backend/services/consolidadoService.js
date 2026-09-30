/**
 * ============================================================
 * Service: Consolidado Financiero
 * ============================================================
 */
const pool = require('../config/db');

// Helper para construir la cláusula WHERE global según filtros
const buildFilters = (filtros, excludeDateAndMonth = false) => {
  const conditions = ["mf.estado = 'ACTIVO'"];
  const params = [];

  if (filtros.periodo_id) {
    conditions.push("mf.periodo_lectivo_id = ?");
    params.push(filtros.periodo_id);
  }
  
  if (filtros.cuenta_id) {
    conditions.push("mf.cuenta_financiera_id = ?");
    params.push(filtros.cuenta_id);
  }

  if (!excludeDateAndMonth) {
    if (filtros.anio) {
      conditions.push("YEAR(COALESCE(mf.mes_aplicacion, mf.fecha)) = ?");
      params.push(filtros.anio);
    }
    if (filtros.mes_desde) {
      conditions.push("COALESCE(mf.mes_aplicacion, LAST_DAY(mf.fecha)) >= LAST_DAY(?)");
      params.push(`${filtros.anio || new Date().getFullYear()}-${filtros.mes_desde}-01`);
    }
    if (filtros.mes_hasta) {
      conditions.push("COALESCE(mf.mes_aplicacion, DATE_FORMAT(mf.fecha, '%Y-%m-01')) <= ?");
      params.push(`${filtros.anio || new Date().getFullYear()}-${filtros.mes_hasta}-01`);
    }
  }

  return { where: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '', params };
};

const getResumenGeneral = async (filtros) => {
  const conn = await pool.getConnection();
  try {
    // 1. Calcular Saldo Inicial Dinámico
    // Sumamos los saldos base de las cuentas
    let cuentaWhere = filtros.cuenta_id ? 'WHERE id = ?' : '';
    let cuentaParams = filtros.cuenta_id ? [filtros.cuenta_id] : [];
    const [cuentasRows] = await conn.query(`SELECT SUM(saldo_inicial) as saldo_base FROM cuentas_financieras ${cuentaWhere}`, cuentaParams);
    const saldoBase = parseFloat(cuentasRows[0].saldo_base || 0);

    // Sumamos movimientos anteriores a la fecha de corte (si hay año y mes_desde)
    let saldoHistoricoMovimientos = 0;
    if (filtros.anio && filtros.mes_desde) {
      const fechaCorte = `${filtros.anio}-${filtros.mes_desde}-01`;
      
      const prevFilterConditions = ["mf.estado = 'ACTIVO'"];
      const prevParams = [];
      if (filtros.cuenta_id) { prevFilterConditions.push("mf.cuenta_financiera_id = ?"); prevParams.push(filtros.cuenta_id); }
      if (filtros.periodo_id) { prevFilterConditions.push("mf.periodo_lectivo_id = ?"); prevParams.push(filtros.periodo_id); }
      
      prevFilterConditions.push("COALESCE(mf.mes_aplicacion, mf.fecha) < ?");
      prevParams.push(fechaCorte);

      const [prevRows] = await conn.query(`
        SELECT 
          SUM(CASE WHEN cm.tipo = 'INGRESO' THEN mf.valor ELSE 0 END) AS ingresos_prev,
          SUM(CASE WHEN cm.tipo = 'EGRESO' THEN mf.valor ELSE 0 END) AS egresos_prev
        FROM movimientos_financieros mf
        JOIN catalogo_movimientos cm ON cm.id = mf.catalogo_movimiento_id
        WHERE ${prevFilterConditions.join(' AND ')}
      `, prevParams);

      saldoHistoricoMovimientos = parseFloat(prevRows[0].ingresos_prev || 0) - parseFloat(prevRows[0].egresos_prev || 0);
    }

    const saldoInicialCalculado = saldoBase + saldoHistoricoMovimientos;

    // 2. Calcular Totales del Rango Actual
    const { where, params } = buildFilters(filtros);
    const [actualRows] = await conn.query(`
      SELECT 
        SUM(CASE WHEN cm.tipo = 'INGRESO' THEN mf.valor ELSE 0 END) AS total_ingresos,
        SUM(CASE WHEN cm.tipo = 'EGRESO' THEN mf.valor ELSE 0 END) AS total_egresos
      FROM movimientos_financieros mf
      JOIN catalogo_movimientos cm ON cm.id = mf.catalogo_movimiento_id
      ${where}
    `, params);

    const ingresos = parseFloat(actualRows[0].total_ingresos || 0);
    const egresos = parseFloat(actualRows[0].total_egresos || 0);
    const resultado = ingresos - egresos;
    const saldoFinal = saldoInicialCalculado + resultado;

    // 3. Totales Especiales (Nómina y Mejoras) del Rango
    const [especialRows] = await conn.query(`
      SELECT 
        SUM(CASE WHEN cm.afecta_nomina = 'ANTICIPO_SUELDO' THEN mf.valor ELSE 0 END) as total_anticipos,
        SUM(CASE WHEN cm.afecta_nomina = 'PAGO_SUELDO' THEN mf.valor ELSE 0 END) as total_pagos_nomina,
        SUM(CASE WHEN cf.grupo_consolidado = 'MEJORAS_PLANTEL' THEN mf.valor ELSE 0 END) as total_mejoras
      FROM movimientos_financieros mf
      JOIN catalogo_movimientos cm ON cm.id = mf.catalogo_movimiento_id
      LEFT JOIN categorias_financieras cf ON cf.id = cm.categoria_id
      ${where}
    `, params);

    return {
      saldo_inicial: saldoInicialCalculado,
      ingresos,
      egresos,
      resultado,
      saldo_final: saldoFinal,
      total_nomina: parseFloat(especialRows[0].total_pagos_nomina || 0) + parseFloat(especialRows[0].total_anticipos || 0),
      total_mejoras: parseFloat(especialRows[0].total_mejoras || 0)
    };
  } finally {
    conn.release();
  }
};

const getConsolidadoMensual = async (filtros) => {
  const { where, params } = buildFilters(filtros);
  
  // Extraemos la agrupación desde la BD
  const query = `
    SELECT 
      DATE_FORMAT(COALESCE(mf.mes_aplicacion, mf.fecha), '%Y-%m-01') AS mes_contable,
      cf.id AS categoria_id,
      cf.nombre AS categoria_nombre,
      cf.tipo AS categoria_tipo,
      cf.grupo_consolidado,
      cf.orden AS categoria_orden,
      cm.id AS concepto_id,
      cm.nombre AS concepto_nombre,
      SUM(mf.valor) as total
    FROM movimientos_financieros mf
    JOIN catalogo_movimientos cm ON cm.id = mf.catalogo_movimiento_id
    JOIN categorias_financieras cf ON cf.id = cm.categoria_id
    ${where}
    GROUP BY mes_contable, cf.id, cm.id
    ORDER BY cf.orden ASC, cm.nombre ASC, mes_contable ASC
  `;
  
  const [rows] = await pool.query(query, params);

  // Determinar dinámicamente los meses encontrados
  const mesesSet = new Set();
  rows.forEach(r => mesesSet.add(r.mes_contable));
  const meses = Array.from(mesesSet).sort();

  // Estructurar la matriz JSON: { [categoria_id]: { ...info, conceptos: { [concepto_id]: { ...info, meses: { '2026-07-01': 100 } } } } }
  const matriz = { INGRESO: [], EGRESO: [] };
  const catMap = {};

  rows.forEach(r => {
    if (!catMap[r.categoria_id]) {
      const catObj = {
        id: r.categoria_id,
        nombre: r.categoria_nombre,
        tipo: r.categoria_tipo,
        grupo: r.grupo_consolidado,
        conceptos: {},
        totalesMes: {},
        totalGeneral: 0
      };
      catMap[r.categoria_id] = catObj;
      matriz[r.categoria_tipo].push(catObj);
    }
    
    const cat = catMap[r.categoria_id];
    
    if (!cat.conceptos[r.concepto_id]) {
      cat.conceptos[r.concepto_id] = {
        id: r.concepto_id,
        nombre: r.concepto_nombre,
        meses: {},
        totalConcepto: 0
      };
    }

    const val = parseFloat(r.total);
    cat.conceptos[r.concepto_id].meses[r.mes_contable] = val;
    cat.conceptos[r.concepto_id].totalConcepto += val;
    
    cat.totalesMes[r.mes_contable] = (cat.totalesMes[r.mes_contable] || 0) + val;
    cat.totalGeneral += val;
  });

  // Convertir conceptos objeto a array para iterar fácil en React
  Object.values(catMap).forEach(cat => {
    cat.conceptos = Object.values(cat.conceptos);
  });

  // Calcular totales por mes
  const ingresosPorMes = {};
  const egresosPorMes = {};
  
  meses.forEach(m => {
    ingresosPorMes[m] = matriz.INGRESO.reduce((acc, cat) => acc + (cat.totalesMes[m] || 0), 0);
    egresosPorMes[m] = matriz.EGRESO.reduce((acc, cat) => acc + (cat.totalesMes[m] || 0), 0);
  });

  return { meses, matriz, ingresosPorMes, egresosPorMes };
};

const getSaldosCuentas = async (filtros) => {
  const periodoCondition = filtros.periodo_id ? 'AND mf.periodo_lectivo_id = ?' : '';
  const periodoParam = filtros.periodo_id ? [filtros.periodo_id] : [];

  const [rows] = await pool.query(`
    SELECT 
      cf.id, cf.nombre, cf.tipo, cf.saldo_inicial, cf.activo,
      SUM(CASE WHEN cm.tipo = 'INGRESO' THEN mf.valor ELSE 0 END) AS total_ingresos,
      SUM(CASE WHEN cm.tipo = 'EGRESO' THEN mf.valor ELSE 0 END) AS total_egresos,
      COUNT(mf.id) as cantidad_movimientos,
      MAX(mf.fecha) as ultimo_movimiento
    FROM cuentas_financieras cf
    LEFT JOIN movimientos_financieros mf ON mf.cuenta_financiera_id = cf.id AND mf.estado = 'ACTIVO'
      ${periodoCondition}
    LEFT JOIN catalogo_movimientos cm ON cm.id = mf.catalogo_movimiento_id
    GROUP BY cf.id
    ORDER BY cf.orden ASC, cf.nombre ASC
  `, periodoParam);

  return rows.map(r => ({
    ...r,
    saldo_final: parseFloat(r.saldo_inicial) + parseFloat(r.total_ingresos || 0) - parseFloat(r.total_egresos || 0)
  }));
};

const getMejorasPlantel = async (filtros) => {
  const { where, params } = buildFilters(filtros);
  // If where already has conditions, append AND; otherwise start fresh  
  const mejorasWhere = where
    ? `${where} AND cf.grupo_consolidado = 'MEJORAS_PLANTEL'`
    : `WHERE cf.grupo_consolidado = 'MEJORAS_PLANTEL'`;
  
  const [rows] = await pool.query(`
    SELECT 
      mf.id, mf.fecha, cm.nombre as concepto, mf.descripcion, mf.valor, mf.numero_comprobante,
      c.nombre as cuenta, u.nombre_completo as registrado_por
    FROM movimientos_financieros mf
    JOIN catalogo_movimientos cm ON cm.id = mf.catalogo_movimiento_id
    JOIN categorias_financieras cf ON cf.id = cm.categoria_id
    JOIN cuentas_financieras c ON c.id = mf.cuenta_financiera_id
    LEFT JOIN usuarios u ON u.id_usuario = mf.creado_por
    ${mejorasWhere}
    ORDER BY mf.fecha DESC
  `, params);

  return rows;
};

module.exports = {
  getResumenGeneral,
  getConsolidadoMensual,
  getSaldosCuentas,
  getMejorasPlantel
};
