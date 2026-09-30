const db = require('../config/db');

// Obtener todas las pensiones con filtros
exports.getPensiones = async (req, res) => {
  try {
    const { search, anio_lectivo, curso, paralelo, mes, estado, fecha_desde, fecha_hasta } = req.query;

    let query = `
      SELECT p.*, 
             m.codigo_matricula, m.anio_lectivo, m.paralelo,
             e.nombres as estudiante_nombres, e.apellidos as estudiante_apellidos, e.cedula as estudiante_cedula, e.codigo as codigo_estudiante,
             c.nombre as curso_nombre,
             r.nombres as rep_nombres, r.apellidos as rep_apellidos, r.telefono as rep_telefono,
             DATEDIFF(CURDATE(), p.fecha_vencimiento) as dias_vencidos
      FROM pensiones p
      INNER JOIN matriculas m ON p.id_matricula = m.id_matricula
      INNER JOIN estudiantes e ON m.id_estudiante = e.id_estudiante
      INNER JOIN cursos c ON m.id_curso = c.id_curso
      LEFT JOIN representantes r ON e.id_representante = r.id_representante
      WHERE 1=1
    `;
    const queryParams = [];

    if (search) {
      query += ` AND (e.nombres LIKE ? OR e.apellidos LIKE ? OR e.cedula LIKE ? OR e.codigo LIKE ? OR r.nombres LIKE ? OR r.apellidos LIKE ?)`;
      const searchParam = `%${search}%`;
      queryParams.push(searchParam, searchParam, searchParam, searchParam, searchParam, searchParam);
    }
    if (anio_lectivo && anio_lectivo !== 'Todos') {
      query += ` AND m.anio_lectivo = ?`;
      queryParams.push(anio_lectivo);
    }
    if (curso && curso !== 'Todos') {
      query += ` AND m.id_curso = ?`;
      queryParams.push(curso);
    }
    if (paralelo && paralelo !== 'Todos') {
      query += ` AND m.paralelo = ?`;
      queryParams.push(paralelo);
    }
    if (mes && mes !== 'Todos') {
      query += ` AND p.mes = ?`;
      queryParams.push(mes);
    }
    if (estado && estado !== 'Todos') {
      query += ` AND p.estado = ?`;
      queryParams.push(estado);
    }
    if (fecha_desde) {
      query += ` AND p.fecha_vencimiento >= ?`;
      queryParams.push(fecha_desde);
    }
    if (fecha_hasta) {
      query += ` AND p.fecha_vencimiento <= ?`;
      queryParams.push(fecha_hasta);
    }

    query += ` ORDER BY p.fecha_vencimiento ASC`;

    const [rows] = await db.query(query, queryParams);
    res.json({ success: true, pensiones: rows });
  } catch (error) {
    console.error('Error al obtener pensiones:', error);
    res.status(500).json({ success: false, message: 'Error de servidor' });
  }
};

// Obtener detalle de una pensión
exports.getPensionById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const [pensiones] = await db.query(`
      SELECT p.*, 
             m.codigo_matricula, m.anio_lectivo, m.paralelo, m.jornada,
             e.nombres as estudiante_nombres, e.apellidos as estudiante_apellidos, e.cedula as estudiante_cedula, e.codigo as codigo_estudiante, e.estado as estudiante_estado, e.correo as estudiante_correo, e.telefono as estudiante_telefono,
             c.nombre as curso_nombre,
             r.nombres as rep_nombres, r.apellidos as rep_apellidos, r.cedula as rep_cedula, r.telefono as rep_telefono, r.correo as rep_correo, r.direccion as rep_direccion, r.id_representante,
             DATEDIFF(CURDATE(), p.fecha_vencimiento) as dias_vencidos
      FROM pensiones p
      INNER JOIN matriculas m ON p.id_matricula = m.id_matricula
      INNER JOIN estudiantes e ON m.id_estudiante = e.id_estudiante
      INNER JOIN cursos c ON m.id_curso = c.id_curso
      LEFT JOIN representantes r ON e.id_representante = r.id_representante
      WHERE p.id_pension = ?
    `, [id]);

    if (pensiones.length === 0) {
      return res.status(404).json({ success: false, message: 'Pensión no encontrada' });
    }

    res.json({ success: true, pension: pensiones[0] });
  } catch (error) {
    console.error('Error al obtener pensión:', error);
    res.status(500).json({ success: false, message: 'Error de servidor' });
  }
};

// Obtener pensiones por estudiante (Vista Estudiante)
exports.getPensionesByEstudiante = async (req, res) => {
  try {
    const { id_estudiante } = req.params;
    
    const [pensiones] = await db.query(`
      SELECT p.*, m.anio_lectivo, c.nombre as curso_nombre
      FROM pensiones p
      INNER JOIN matriculas m ON p.id_matricula = m.id_matricula
      INNER JOIN cursos c ON m.id_curso = c.id_curso
      WHERE m.id_estudiante = ?
      ORDER BY p.fecha_vencimiento ASC
    `, [id_estudiante]);

    res.json({ success: true, pensiones });
  } catch (error) {
    console.error('Error al obtener pensiones por estudiante:', error);
    res.status(500).json({ success: false, message: 'Error de servidor' });
  }
};

// Obtener resumen de KPIs
exports.getResumenPensiones = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        COUNT(*) as total_generadas,
        SUM(CASE WHEN estado = 'Pagado' THEN 1 ELSE 0 END) as pagadas,
        SUM(CASE WHEN estado = 'Pendiente' THEN 1 ELSE 0 END) as pendientes,
        SUM(CASE WHEN estado = 'Vencido' THEN 1 ELSE 0 END) as vencidas,
        SUM(CASE WHEN estado = 'Parcial' THEN 1 ELSE 0 END) as parciales,
        SUM(valor) as total_esperado,
        SUM(valor_pagado) as total_recaudado,
        SUM(valor - valor_pagado) as total_pendiente
      FROM pensiones
      WHERE estado != 'Anulada'
    `);

    res.json({ success: true, resumen: rows[0] });
  } catch (error) {
    console.error('Error al obtener resumen de pensiones:', error);
    res.status(500).json({ success: false, message: 'Error de servidor' });
  }
};

// Anular pensión
exports.anularPension = async (req, res) => {
  try {
    // Validar admin
    if (!req.usuario.es_admin) {
      return res.status(403).json({ success: false, message: 'No tiene permisos para anular pensiones' });
    }

    const { id } = req.params;
    const { observacion } = req.body;

    if (!observacion) {
      return res.status(400).json({ success: false, message: 'Debe especificar un motivo (observación) para anular la pensión' });
    }

    const [result] = await db.query(`
      UPDATE pensiones 
      SET estado = 'Anulada', observacion = ?
      WHERE id_pension = ? AND estado != 'Pagado'
    `, [observacion, id]);

    if (result.affectedRows === 0) {
      return res.status(400).json({ success: false, message: 'Pensión no encontrada o ya está pagada' });
    }

    res.json({ success: true, message: 'Pensión anulada correctamente' });
  } catch (error) {
    console.error('Error al anular pensión:', error);
    res.status(500).json({ success: false, message: 'Error de servidor' });
  }
};

// Obtener pagos de una pensión
exports.getPagosByPension = async (req, res) => {
  try {
    const { id_pension } = req.params;
    const [pagos] = await db.query(`
      SELECT p.*, u.nombre_completo as usuario_nombre
      FROM pagos p
      LEFT JOIN usuarios u ON p.id_usuario = u.id_usuario
      WHERE p.id_pension = ?
      ORDER BY p.fecha_pago DESC
    `, [id_pension]);
    
    res.json({ success: true, pagos });
  } catch (error) {
    console.error('Error al obtener pagos:', error);
    res.status(500).json({ success: false, message: 'Error de servidor' });
  }
};

// Registrar un pago
exports.registrarPago = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const { id } = req.params; // id de la pensión
    const { valor_pagado, metodo_pago, observacion, numero_recibo } = req.body;
    const id_usuario = req.usuario.id;

    if (!valor_pagado || valor_pagado <= 0) {
      return res.status(400).json({ success: false, message: 'Monto inválido' });
    }

    await connection.beginTransaction();

    // 1. Obtener pensión actual
    const [pensionRows] = await connection.query(`SELECT * FROM pensiones WHERE id_pension = ? FOR UPDATE`, [id]);
    if (pensionRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Pensión no encontrada' });
    }

    const pension = pensionRows[0];

    if (pension.estado === 'Anulada' || pension.estado === 'Pagado') {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'No se puede registrar pago en una pensión anulada o ya pagada' });
    }

    const saldoActual = parseFloat(pension.valor) - parseFloat(pension.valor_pagado);
    if (parseFloat(valor_pagado) > saldoActual + 0.01) { // margen de error por decimales
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'El valor pagado excede el saldo de la pensión' });
    }

    // 2. Insertar pago
    await connection.query(`
      INSERT INTO pagos (id_pension, fecha_pago, valor_pagado, metodo_pago, observacion, numero_recibo, id_usuario)
      VALUES (?, NOW(), ?, ?, ?, ?, ?)
    `, [id, valor_pagado, metodo_pago, observacion || null, numero_recibo || null, id_usuario]);

    // 3. Actualizar pensión
    const nuevoValorPagado = parseFloat(pension.valor_pagado) + parseFloat(valor_pagado);
    let nuevoEstado = pension.estado;
    
    if (nuevoValorPagado >= parseFloat(pension.valor) - 0.01) {
      nuevoEstado = 'Pagado';
    } else {
      // Si no pagó todo, hay que ver si ya estaba vencida
      const hoy = new Date();
      const fechaVenc = new Date(pension.fecha_vencimiento);
      if (hoy > fechaVenc) {
        nuevoEstado = 'Vencido'; // sigue vencida aunque pagó parcial
      } else {
        nuevoEstado = 'Parcial';
      }
    }

    await connection.query(`
      UPDATE pensiones 
      SET valor_pagado = ?, estado = ? 
      WHERE id_pension = ?
    `, [nuevoValorPagado, nuevoEstado, id]);

    await connection.commit();
    res.json({ success: true, message: 'Pago registrado con éxito' });
  } catch (error) {
    await connection.rollback();
    console.error('Error al registrar pago:', error);
    res.status(500).json({ success: false, message: 'Error de servidor' });
  } finally {
    connection.release();
  }
};
