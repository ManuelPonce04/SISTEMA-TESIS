/**
 * ============================================================
 * Controller: Rol de Pagos (Nóminas)
 * ============================================================
 */
const pool = require('../config/db');
const nominaService = require('../services/nominaService');

const listarNominas = async (req, res) => {
  try {
    const { page = 1, limit = 20, estado, periodo_id, mes } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions = [];
    const params = [];

    if (estado) { conditions.push('n.estado = ?'); params.push(estado); }
    if (periodo_id) { conditions.push('n.periodo_lectivo_id = ?'); params.push(periodo_id); }
    if (mes) { conditions.push('n.mes = ?'); params.push(mes); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [cRows] = await pool.query(`SELECT COUNT(*) as t FROM nominas n ${where}`, params);
    const total = cRows[0].t;

    const [rows] = await pool.query(`
      SELECT n.*, pl.nombre AS periodo_nombre, tc.nombre AS grupo_nombre,
             u.nombre_completo AS generado_por_nombre
      FROM nominas n
      LEFT JOIN periodos_lectivos pl ON pl.id = n.periodo_lectivo_id
      LEFT JOIN tipos_contrato tc ON tc.id = n.tipo_personal_id
      LEFT JOIN usuarios u ON u.id_usuario = n.generado_por
      ${where}
      ORDER BY n.created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), offset]);

    res.json({
      success: true,
      data: rows,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) }
    });
  } catch (error) {
    console.error('Error listarNominas:', error);
    res.status(500).json({ success: false, message: 'Error al listar nóminas.' });
  }
};

const generarNomina = async (req, res) => {
  try {
    if (!req.usuario.es_admin) return res.status(403).json({ success: false, message: 'No autorizado' });
    
    const nominaId = await nominaService.generarNomina(req.body, req.usuario.id);
    res.status(201).json({ success: true, message: 'Nómina generada en borrador exitosamente.', data: { id: nominaId } });
  } catch (error) {
    console.error('Error generarNomina:', error);
    res.status(400).json({ success: false, message: error.message || 'Error al generar la nómina.' });
  }
};

const recalcularNomina = async (req, res) => {
  try {
    if (!req.usuario.es_admin) return res.status(403).json({ success: false, message: 'No autorizado' });
    
    await nominaService.recalcularNomina(req.params.id, req.usuario.id);
    res.json({ success: true, message: 'Nómina recalculada exitosamente.' });
  } catch (error) {
    console.error('Error recalcularNomina:', error);
    res.status(400).json({ success: false, message: error.message || 'Error al recalcular la nómina.' });
  }
};

const getNominaDetalle = async (req, res) => {
  try {
    const { id } = req.params;
    const [nRows] = await pool.query(`
      SELECT n.*, pl.nombre AS periodo_nombre, tc.nombre AS grupo_nombre
      FROM nominas n
      LEFT JOIN periodos_lectivos pl ON pl.id = n.periodo_lectivo_id
      LEFT JOIN tipos_contrato tc ON tc.id = n.tipo_personal_id
      WHERE n.id = ?
    `, [id]);

    if (nRows.length === 0) return res.status(404).json({ success: false, message: 'Nómina no encontrada.' });

    const [detalles] = await pool.query(`
      SELECT nd.*, p.codigo_interno
      FROM nomina_detalles nd
      JOIN personal p ON p.id = nd.personal_id
      WHERE nd.nomina_id = ?
      ORDER BY nd.nombre_snapshot ASC
    `, [id]);

    res.json({ success: true, data: { nomina: nRows[0], detalles } });
  } catch (error) {
    console.error('Error getNominaDetalle:', error);
    res.status(500).json({ success: false, message: 'Error al obtener detalle de nómina.' });
  }
};

const cambiarEstado = async (req, res) => {
  try {
    if (!req.usuario.es_admin) return res.status(403).json({ success: false, message: 'No autorizado' });
    const { id } = req.params;
    const { estado } = req.body;
    
    const validStates = ['BORRADOR', 'REVISADA', 'CERRADA', 'ANULADA'];
    if (!validStates.includes(estado)) return res.status(400).json({ success: false, message: 'Estado inválido.' });

    let updateFields = `estado = ?`;
    let params = [estado];

    if (estado === 'CERRADA') {
      updateFields += `, cerrado_por = ?, cerrado_at = NOW()`;
      params.push(req.usuario.id);
    } else if (estado === 'ANULADA') {
      updateFields += `, anulado_por = ?, anulado_at = NOW()`;
      params.push(req.usuario.id);
    }

    params.push(id);

    await pool.query(`UPDATE nominas SET ${updateFields} WHERE id = ?`, params);
    res.json({ success: true, message: `Nómina marcada como ${estado}.` });
  } catch (error) {
    console.error('Error cambiarEstado:', error);
    res.status(500).json({ success: false, message: 'Error al cambiar estado.' });
  }
};

const pagarIndividual = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { id, detalleId } = req.params;
    const { cuenta_financiera_id, fecha_pago, numero_comprobante, observacion } = req.body;

    // 1. Verificar nomina cerrada
    const [nRows] = await conn.query('SELECT * FROM nominas WHERE id = ? FOR UPDATE', [id]);
    if (nRows.length === 0 || nRows[0].estado !== 'CERRADA') throw new Error('La nómina debe estar CERRADA para realizar pagos.');
    
    // 2. Verificar detalle
    const [dRows] = await conn.query('SELECT * FROM nomina_detalles WHERE id = ? AND nomina_id = ? FOR UPDATE', [detalleId, id]);
    if (dRows.length === 0) throw new Error('Detalle de nómina no encontrado.');
    const detalle = dRows[0];

    if (detalle.estado_pago === 'PAGADO') throw new Error('Este registro ya se encuentra pagado.');
    if (detalle.neto_recibir <= 0) throw new Error('El neto a recibir no requiere un egreso financiero.');

    // 3. Crear movimiento financiero PGDOCE
    const [cmRows] = await conn.query(`SELECT id FROM catalogo_movimientos WHERE afecta_nomina = 'PAGO_SUELDO' LIMIT 1`);
    if (cmRows.length === 0) throw new Error('No existe un concepto financiero configurado para PAGO_SUELDO (PGDOCE).');
    const catalogoId = cmRows[0].id;

    const desc = `Pago Rol ${new Date(nRows[0].mes).toLocaleDateString('es-EC', {month:'long', year:'numeric'})} - ${detalle.nombre_snapshot}`;
    
    const [movRes] = await conn.query(`
      INSERT INTO movimientos_financieros (
        periodo_lectivo_id, fecha, catalogo_movimiento_id, descripcion, valor, 
        cuenta_financiera_id, mes_aplicacion, personal_id, numero_comprobante, observacion, creado_por
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      nRows[0].periodo_lectivo_id, fecha_pago, catalogoId, desc, detalle.neto_recibir, 
      cuenta_financiera_id, nRows[0].mes, detalle.personal_id, numero_comprobante || null, observacion || null, req.usuario.id
    ]);

    // 4. Update detalle
    await conn.query(`
      UPDATE nomina_detalles 
      SET estado_pago = 'PAGADO', fecha_pago = ?, cuenta_pago_id = ?, movimiento_pago_id = ?, observacion = ?
      WHERE id = ?
    `, [fecha_pago, cuenta_financiera_id, movRes.insertId, observacion || null, detalleId]);

    // 5. Check if all are paid to change master status
    const [checkRows] = await conn.query(`SELECT COUNT(*) as c FROM nomina_detalles WHERE nomina_id = ? AND estado_pago != 'PAGADO' AND neto_recibir > 0`, [id]);
    if (checkRows[0].c === 0) {
      await conn.query(`UPDATE nominas SET estado = 'PAGADA', pagado_por = ?, pagado_at = NOW() WHERE id = ?`, [req.usuario.id, id]);
    }

    await conn.commit();
    res.json({ success: true, message: 'Pago registrado y movimiento financiero generado.' });
  } catch (error) {
    await conn.rollback();
    console.error('Error pagarIndividual:', error);
    res.status(400).json({ success: false, message: error.message || 'Error al procesar el pago.' });
  } finally {
    conn.release();
  }
};

module.exports = {
  listarNominas,
  generarNomina,
  recalcularNomina,
  getNominaDetalle,
  cambiarEstado,
  pagarIndividual
};
