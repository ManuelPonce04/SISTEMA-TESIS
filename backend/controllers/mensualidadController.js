const db = require('../config/db');
const { 
  generarObligacionIndividual, 
  anularObligacion, 
  aplicarAjuste 
} = require('../services/mensualidadService');

const getMensualidades = async (req, res) => {
  try {
    const { periodo_lectivo_id, mes_cobrable_id, curso_id, estado, search, page = 1, limit = 30 } = req.query;
    const offset = (page - 1) * limit;

    let whereSql = '1=1';
    let params = [];

    if (periodo_lectivo_id) {
      whereSql += ' AND o.periodo_lectivo_id = ?';
      params.push(periodo_lectivo_id);
    }
    
    if (mes_cobrable_id) {
      whereSql += ' AND o.mes_cobrable_id = ?';
      params.push(mes_cobrable_id);
    }

    if (estado) {
      whereSql += ' AND o.estado = ?';
      params.push(estado);
    }

    if (curso_id) {
      whereSql += ' AND m.curso_id = ?';
      params.push(curso_id);
    }

    if (search) {
      whereSql += ` AND (
        o.codigo LIKE ? OR 
        e.numero_identificacion LIKE ? OR 
        e.nombres LIKE ? OR 
        e.apellidos LIKE ? OR
        m.numero_matricula LIKE ?
      )`;
      const s = `%${search}%`;
      params.push(s, s, s, s, s);
    }

    const [countResult] = await db.query(`
      SELECT COUNT(*) as total 
      FROM obligaciones_pension o
      JOIN matriculas m ON o.matricula_id = m.id
      JOIN estudiantes e ON o.estudiante_id = e.id
      WHERE ${whereSql}
    `, params);

    const [rows] = await db.query(`
      SELECT 
        o.id, o.codigo, o.mes, o.fecha_vencimiento, o.valor_original, o.valor_ajustes, o.valor_actual, o.saldo, o.estado,
        m.numero_matricula, m.id as matricula_id,
        e.nombres as est_nombres, e.apellidos as est_apellidos, e.numero_identificacion as est_cedula,
        c.nombre as curso_nombre, p.nombre as paralelo_nombre,
        pmc.nombre_mostrar as mes_nombre
      FROM obligaciones_pension o
      JOIN matriculas m ON o.matricula_id = m.id
      JOIN estudiantes e ON o.estudiante_id = e.id
      LEFT JOIN cursos c ON m.curso_id = c.id
      LEFT JOIN paralelos p ON m.paralelo_id = p.id
      JOIN periodo_meses_cobrables pmc ON o.mes_cobrable_id = pmc.id
      WHERE ${whereSql}
      ORDER BY o.id DESC
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), parseInt(offset)]);

    res.json({
      success: true,
      mensualidades: rows,
      total: countResult[0].total
    });
  } catch (error) {
    console.error('Error getMensualidades:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor.' });
  }
};

const getMensualidadById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query(`
      SELECT 
        o.*,
        m.numero_matricula,
        e.nombres as est_nombres, e.apellidos as est_apellidos, e.numero_identificacion as est_cedula,
        c.nombre as curso_nombre, p.nombre as paralelo_nombre,
        pmc.nombre_mostrar as mes_nombre
      FROM obligaciones_pension o
      JOIN matriculas m ON o.matricula_id = m.id
      JOIN estudiantes e ON o.estudiante_id = e.id
      LEFT JOIN cursos c ON m.curso_id = c.id
      LEFT JOIN paralelos p ON m.paralelo_id = p.id
      JOIN periodo_meses_cobrables pmc ON o.mes_cobrable_id = pmc.id
      WHERE o.id = ?
    `, [id]);

    if (rows.length === 0) return res.status(404).json({ success: false, message: 'No encontrado' });

    const [ajustes] = await db.query('SELECT * FROM ajustes_obligacion_pension WHERE obligacion_pension_id = ? ORDER BY id DESC', [id]);
    const [historial] = await db.query('SELECT * FROM historial_obligacion_pension WHERE obligacion_pension_id = ? ORDER BY id DESC', [id]);

    res.json({
      success: true,
      mensualidad: {
        ...rows[0],
        beneficios_snapshot: typeof rows[0].beneficios_snapshot === 'string' ? JSON.parse(rows[0].beneficios_snapshot) : rows[0].beneficios_snapshot,
        ajustes,
        historial
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error interno.' });
  }
};

const getKPIs = async (req, res) => {
  try {
    const { periodo_lectivo_id } = req.query;
    let whereSql = '1=1';
    let params = [];
    if (periodo_lectivo_id) {
      whereSql += ' AND periodo_lectivo_id = ?';
      params.push(periodo_lectivo_id);
    }

    const [kpiRows] = await db.query(`
      SELECT 
        SUM(valor_actual) as total_generado,
        SUM(saldo) as total_pendiente,
        SUM(total_pagado) as total_pagado,
        COUNT(CASE WHEN estado = 'EXONERADA' THEN 1 END) as total_exoneradas,
        SUM(CASE WHEN estado = 'VENCIDA' THEN saldo ELSE 0 END) as total_vencido
      FROM obligaciones_pension
      WHERE ${whereSql} AND estado != 'ANULADA'
    `, params);

    res.json({
      success: true,
      kpis: {
        total_generado: kpiRows[0].total_generado || 0,
        total_pendiente: kpiRows[0].total_pendiente || 0,
        total_pagado: kpiRows[0].total_pagado || 0,
        total_exoneradas: kpiRows[0].total_exoneradas || 0,
        total_vencido: kpiRows[0].total_vencido || 0
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error interno.' });
  }
};

const generarMensualidadIndividual = async (req, res) => {
  try {
    const { matricula_id, mes_cobrable_id } = req.body;
    const usuarioId = req.user.id;

    if (!matricula_id || !mes_cobrable_id) {
      return res.status(400).json({ success: false, message: 'Faltan datos requeridos.' });
    }

    const result = await generarObligacionIndividual(matricula_id, mes_cobrable_id, usuarioId);
    res.json(result);
  } catch (error) {
    console.error('Error generarMensualidadIndividual:', error.message);
    res.status(400).json({ success: false, message: error.message });
  }
};

const registrarAjuste = async (req, res) => {
  try {
    const { id } = req.params;
    const { tipo, valor, signo, motivo } = req.body;
    const usuarioId = req.user.id;

    if (!req.user.es_admin) return res.status(403).json({ success: false, message: 'Solo administradores pueden realizar ajustes.' });
    if (!tipo || !valor || !signo || !motivo) return res.status(400).json({ success: false, message: 'Faltan datos requeridos.' });

    const result = await aplicarAjuste(id, tipo, valor, signo, motivo, usuarioId);
    res.json(result);
  } catch (error) {
    console.error('Error registrarAjuste:', error.message);
    res.status(400).json({ success: false, message: error.message });
  }
};

const anular = async (req, res) => {
  try {
    const { id } = req.params;
    const { motivo } = req.body;
    const usuarioId = req.user.id;

    if (!req.user.es_admin) return res.status(403).json({ success: false, message: 'Solo administradores pueden anular.' });

    const result = await anularObligacion(id, motivo, usuarioId);
    res.json(result);
  } catch (error) {
    console.error('Error anular:', error.message);
    res.status(400).json({ success: false, message: error.message });
  }
};

const getMesesDisponibles = async (req, res) => {
  try {
    const { matriculaId } = req.params;
    
    // Obtener matrícula
    const [matriculas] = await db.query('SELECT periodo_lectivo_id, fecha_retiro, estado_matricula FROM matriculas WHERE id = ?', [matriculaId]);
    if (matriculas.length === 0) return res.status(404).json({ success: false, message: 'Matrícula no encontrada' });
    const mat = matriculas[0];

    // Obtener meses cobrables del periodo
    const [meses] = await db.query('SELECT * FROM periodo_meses_cobrables WHERE periodo_lectivo_id = ? AND cobrable = 1 ORDER BY numero_orden ASC', [mat.periodo_lectivo_id]);
    
    // Obtener asignación activa o aprobada
    const [asignaciones] = await db.query(`
      SELECT * FROM asignaciones_pension
      WHERE matricula_id = ? AND estado IN ('ACTIVA', 'APROBADA')
    `, [matriculaId]);

    const asignacion = asignaciones.length > 0 ? asignaciones[0] : null;

    // Obtener obligaciones ya generadas
    const [obligaciones] = await db.query('SELECT mes_cobrable_id, estado FROM obligaciones_pension WHERE matricula_id = ? AND estado != "ANULADA"', [matriculaId]);
    const generadosMap = obligaciones.reduce((acc, curr) => {
      acc[curr.mes_cobrable_id] = curr.estado;
      return acc;
    }, {});

    const resultado = meses.map(m => {
      let puedeGenerarse = true;
      let razonNoGenerable = null;

      // 1. Ya generado
      if (generadosMap[m.id]) {
        puedeGenerarse = false;
        razonNoGenerable = `Ya generada (${generadosMap[m.id]})`;
      }
      
      // 2. Retiro
      if (puedeGenerarse && mat.estado_matricula === 'RETIRADO' && mat.fecha_retiro) {
        if (new Date(mat.fecha_retiro) < new Date(m.mes)) {
          puedeGenerarse = false;
          razonNoGenerable = 'Mes posterior a fecha de retiro';
        }
      }

      // 3. Vigencia de la asignación
      if (puedeGenerarse) {
        if (!asignacion) {
          puedeGenerarse = false;
          razonNoGenerable = 'Sin asignación activa en el periodo';
        } else {
           if (new Date(m.mes) < new Date(asignacion.mes_desde) || new Date(m.mes) > new Date(asignacion.mes_hasta)) {
             puedeGenerarse = false;
             razonNoGenerable = 'Mes fuera de la vigencia de la asignación';
           }
        }
      }

      return {
        id: m.id,
        mes: m.mes,
        nombre: m.nombre_mostrar,
        fecha_emision: m.fecha_emision,
        puedeGenerarse,
        razonNoGenerable
      };
    });

    res.json({ success: true, meses: resultado, asignacion_id: asignacion ? asignacion.id : null });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error interno' });
  }
};

module.exports = {
  getMensualidades,
  getMensualidadById,
  getKPIs,
  generarMensualidadIndividual,
  registrarAjuste,
  anular,
  getMesesDisponibles
};
