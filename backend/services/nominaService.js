/**
 * ============================================================
 * Service: Rol de Pagos (Nómina)
 * ============================================================
 */
const pool = require('../config/db');
const sueldosService = require('./sueldosService');

const getIessParameter = async (conn = pool) => {
  const [rows] = await conn.query(`SELECT valor FROM parametros_nomina WHERE codigo = 'APORTE_PERSONAL_IESS' AND activo = 1 LIMIT 1`);
  if (rows.length === 0) throw new Error('Parámetro APORTE_PERSONAL_IESS no configurado o inactivo.');
  return parseFloat(rows[0].valor) / 100; // Convert to decimal (e.g. 9.45 -> 0.0945)
};

const buildDetallesFromData = async (periodo_id, mes, tipo_personal_id, conn) => {
  // 1. Get personal to process
  let personalQuery = `
    SELECT p.id, p.cedula, p.nombre_completo, tc.nombre AS contrato_nombre, cp.nombre AS cargo_nombre
    FROM personal p
    LEFT JOIN tipos_contrato tc ON tc.id = p.tipo_contrato_id
    LEFT JOIN cargos_personal cp ON cp.id = p.cargo_id
    WHERE p.estado = 'ACTIVO'
  `;
  const params = [];
  if (tipo_personal_id) {
    personalQuery += ` AND p.tipo_contrato_id = ?`;
    params.push(tipo_personal_id);
  } else {
    // Si no se manda tipo específico, procesamos los que tienen genera_nomina = 1
    personalQuery += ` AND p.tipo_contrato_id IN (SELECT id FROM tipos_contrato WHERE genera_nomina = 1)`;
  }
  
  const [personal] = await conn.query(personalQuery, params);
  
  const iessFactor = await getIessParameter(conn);
  const detalles = [];
  
  for (const p of personal) {
    const sueldo = await sueldosService.getSueldoBaseMensual(p.id, mes, conn);
    if (sueldo <= 0) continue; // Si no tiene sueldo configurado, lo excluimos de la nómina regular
    
    const ajustes = await sueldosService.getAjustesMensuales(p.id, periodo_id, mes, conn);
    const anticipos = await sueldosService.getTotalAnticipos(p.id, periodo_id, mes, conn);

    const subtotal_ingresos = sueldo + ajustes.horas_extras + ajustes.otros_ingresos;
    
    // IESS calc (simplificado: asume toda remuneracion aporta, ajustado segun tu regla institucional)
    const aporte_iess = (subtotal_ingresos * iessFactor); 
    
    const subtotal_egresos = aporte_iess + anticipos + ajustes.otras_deducciones;
    const neto_recibir = subtotal_ingresos - subtotal_egresos;

    detalles.push({
      personal_id: p.id,
      cedula_snapshot: p.cedula,
      nombre_snapshot: p.nombre_completo,
      cargo_snapshot: p.cargo_nombre,
      contrato_snapshot: p.contrato_nombre,
      sueldo,
      horas_extras: ajustes.horas_extras,
      otros_ingresos: ajustes.otros_ingresos,
      subtotal_ingresos,
      aporte_personal_iess: aporte_iess,
      anticipos,
      otras_deducciones: ajustes.otras_deducciones,
      subtotal_egresos,
      neto_recibir
    });
  }
  return detalles;
};

const generarNomina = async (data, usuario_id) => {
  const { periodo_lectivo_id, mes, tipo_personal_id, descripcion_grupo, observacion } = data;
  const conn = await pool.getConnection();
  
  try {
    await conn.beginTransaction();

    // 1. Check duplicate
    const [dup] = await conn.query(`
      SELECT id FROM nominas WHERE periodo_lectivo_id = ? AND mes = ? AND (tipo_personal_id = ? OR (? IS NULL AND tipo_personal_id IS NULL)) AND estado != 'ANULADA'
    `, [periodo_lectivo_id, mes, tipo_personal_id, tipo_personal_id]);
    
    if (dup.length > 0) throw new Error('Ya existe una nómina activa para este periodo, mes y grupo.');

    // 2. Build Details
    const detalles = await buildDetallesFromData(periodo_lectivo_id, mes, tipo_personal_id, conn);
    if (detalles.length === 0) throw new Error('No hay personal elegible o con sueldo configurado para generar la nómina.');

    // 3. Totals
    let total_ingresos = 0, total_egresos = 0, total_neto = 0;
    detalles.forEach(d => {
      total_ingresos += d.subtotal_ingresos;
      total_egresos += d.subtotal_egresos;
      total_neto += d.neto_recibir;
    });

    // 4. Insert Header
    const [nomRes] = await conn.query(`
      INSERT INTO nominas (periodo_lectivo_id, mes, tipo_personal_id, descripcion_grupo, estado, observacion, total_ingresos, total_egresos, total_neto, cantidad_personal, generado_por)
      VALUES (?, ?, ?, ?, 'BORRADOR', ?, ?, ?, ?, ?, ?)
    `, [periodo_lectivo_id, mes, tipo_personal_id || null, descripcion_grupo, observacion, total_ingresos, total_egresos, total_neto, detalles.length, usuario_id]);
    
    const nominaId = nomRes.insertId;

    // 5. Insert Details
    for (const d of detalles) {
      await conn.query(`
        INSERT INTO nomina_detalles (
          nomina_id, personal_id, cedula_snapshot, nombre_snapshot, cargo_snapshot, contrato_snapshot,
          sueldo, horas_extras, otros_ingresos, subtotal_ingresos, 
          aporte_personal_iess, anticipos, otras_deducciones, subtotal_egresos, neto_recibir
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        nominaId, d.personal_id, d.cedula_snapshot, d.nombre_snapshot, d.cargo_snapshot, d.contrato_snapshot,
        d.sueldo, d.horas_extras, d.otros_ingresos, d.subtotal_ingresos,
        d.aporte_personal_iess, d.anticipos, d.otras_deducciones, d.subtotal_egresos, d.neto_recibir
      ]);
    }

    await conn.commit();
    return nominaId;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
};

const recalcularNomina = async (nomina_id, usuario_id) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [nRows] = await conn.query(`SELECT * FROM nominas WHERE id = ? FOR UPDATE`, [nomina_id]);
    if (nRows.length === 0) throw new Error('Nómina no encontrada.');
    const nomina = nRows[0];

    if (nomina.estado !== 'BORRADOR') throw new Error('Solo se pueden recalcular nóminas en estado BORRADOR.');

    // Remove old details
    await conn.query(`DELETE FROM nomina_detalles WHERE nomina_id = ?`, [nomina_id]);

    // Build new details
    const detalles = await buildDetallesFromData(nomina.periodo_lectivo_id, nomina.mes, nomina.tipo_personal_id, conn);
    
    let total_ingresos = 0, total_egresos = 0, total_neto = 0;
    
    for (const d of detalles) {
      total_ingresos += d.subtotal_ingresos;
      total_egresos += d.subtotal_egresos;
      total_neto += d.neto_recibir;

      await conn.query(`
        INSERT INTO nomina_detalles (
          nomina_id, personal_id, cedula_snapshot, nombre_snapshot, cargo_snapshot, contrato_snapshot,
          sueldo, horas_extras, otros_ingresos, subtotal_ingresos, 
          aporte_personal_iess, anticipos, otras_deducciones, subtotal_egresos, neto_recibir
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        nomina_id, d.personal_id, d.cedula_snapshot, d.nombre_snapshot, d.cargo_snapshot, d.contrato_snapshot,
        d.sueldo, d.horas_extras, d.otros_ingresos, d.subtotal_ingresos,
        d.aporte_personal_iess, d.anticipos, d.otras_deducciones, d.subtotal_egresos, d.neto_recibir
      ]);
    }

    // Update Header
    await conn.query(`
      UPDATE nominas 
      SET total_ingresos = ?, total_egresos = ?, total_neto = ?, cantidad_personal = ?, revisado_por = ?, revisado_at = NOW()
      WHERE id = ?
    `, [total_ingresos, total_egresos, total_neto, detalles.length, usuario_id, nomina_id]);

    await conn.commit();
    return { success: true };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
};

module.exports = {
  generarNomina,
  recalcularNomina
};
