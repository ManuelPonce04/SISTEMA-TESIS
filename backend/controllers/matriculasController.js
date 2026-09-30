const db = require('../config/db');

// GET /api/matriculas
exports.getMatriculas = async (req, res) => {
  try {
    const { search, anio_lectivo, curso, estado } = req.query;
    
    let query = `
      SELECT 
        m.id_matricula, m.codigo_matricula, m.anio_lectivo, m.paralelo, m.fecha_matricula, m.estado,
        e.codigo as codigo_estudiante, e.nombres as estudiante_nombres, e.apellidos as estudiante_apellidos, e.cedula as estudiante_cedula,
        c.nombre as curso_nombre,
        (SELECT COUNT(*) FROM pensiones p WHERE p.id_matricula = m.id_matricula) as pensiones_generadas
      FROM matriculas m
      INNER JOIN estudiantes e ON m.id_estudiante = e.id_estudiante
      INNER JOIN cursos c ON m.id_curso = c.id_curso
      WHERE 1=1
    `;
    const queryParams = [];

    if (search) {
      query += ` AND (e.nombres LIKE ? OR e.apellidos LIKE ? OR e.cedula LIKE ? OR m.codigo_matricula LIKE ?)`;
      const searchParam = `%${search}%`;
      queryParams.push(searchParam, searchParam, searchParam, searchParam);
    }
    if (anio_lectivo && anio_lectivo !== 'Todos') {
      query += ` AND m.anio_lectivo = ?`;
      queryParams.push(anio_lectivo);
    }
    if (curso && curso !== 'Todos') {
      query += ` AND m.id_curso = ?`;
      queryParams.push(curso);
    }
    if (estado && estado !== 'Todos') {
      query += ` AND m.estado = ?`;
      queryParams.push(estado);
    }

    query += ` ORDER BY m.created_at DESC`;

    const [rows] = await db.query(query, queryParams);
    res.json({ success: true, matriculas: rows });
  } catch (error) {
    console.error('Error al obtener matriculas:', error);
    res.status(500).json({ success: false, message: 'Error de servidor' });
  }
};

// GET /api/matriculas/:id
exports.getMatriculaById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const [matriculas] = await db.query(`
      SELECT 
        m.*,
        e.codigo as codigo_estudiante, e.nombres as estudiante_nombres, e.apellidos as estudiante_apellidos, e.cedula as estudiante_cedula, e.estado as estudiante_estado,
        r.nombres as rep_nombres, r.apellidos as rep_apellidos, r.cedula as rep_cedula, r.telefono as rep_telefono, r.correo as rep_correo,
        c.nombre as curso_nombre, c.nivel as curso_nivel
      FROM matriculas m
      INNER JOIN estudiantes e ON m.id_estudiante = e.id_estudiante
      LEFT JOIN representantes r ON e.id_representante = r.id_representante
      INNER JOIN cursos c ON m.id_curso = c.id_curso
      WHERE m.id_matricula = ?
    `, [id]);

    if (matriculas.length === 0) {
      return res.status(404).json({ success: false, message: 'Matrícula no encontrada' });
    }

    res.json({ success: true, matricula: matriculas[0] });
  } catch (error) {
    console.error('Error al obtener detalle de matrícula:', error);
    res.status(500).json({ success: false, message: 'Error de servidor' });
  }
};

// POST /api/matriculas
exports.createMatricula = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const { id_estudiante, id_curso, paralelo, anio_lectivo, fecha_matricula, jornada, observaciones, pensionesConfig } = req.body;

    // Validación básica
    if (!id_estudiante || !id_curso || !paralelo || !anio_lectivo || !fecha_matricula) {
      return res.status(400).json({ success: false, message: 'Faltan datos obligatorios para la matrícula' });
    }
    
    if (!pensionesConfig || !pensionesConfig.meses || pensionesConfig.meses.length === 0) {
      return res.status(400).json({ success: false, message: 'La configuración de pensiones es obligatoria' });
    }

    await connection.beginTransaction();

    // Validar duplicidad
    const [existentes] = await connection.query(
      `SELECT id_matricula, estado FROM matriculas WHERE id_estudiante = ? AND anio_lectivo = ? AND estado != 'Anulada'`,
      [id_estudiante, anio_lectivo]
    );

    if (existentes.length > 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'El estudiante ya tiene una matrícula activa en este año lectivo' });
    }

    // Generar código de matrícula (ej: MAT-2026-0001)
    const yearPrefix = anio_lectivo.split('-')[0]; // "2026"
    const [countRows] = await connection.query(`SELECT COUNT(*) as count FROM matriculas WHERE anio_lectivo = ?`, [anio_lectivo]);
    const nextNum = countRows[0].count + 1;
    const codigo_matricula = `MAT-${yearPrefix}-${nextNum.toString().padStart(4, '0')}`;

    // Insertar matrícula
    const [resultMatricula] = await connection.query(`
      INSERT INTO matriculas (codigo_matricula, id_estudiante, id_curso, paralelo, anio_lectivo, fecha_matricula, jornada, observaciones, estado)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Activa')
    `, [codigo_matricula, id_estudiante, id_curso, paralelo, anio_lectivo, fecha_matricula, jornada, observaciones || null]);

    const id_matricula = resultMatricula.insertId;

    // Insertar pensiones
    const pensionesPromises = pensionesConfig.meses.map(mesConf => {
      // Determinar año real para el vencimiento. (Simplificado para el caso de estudio)
      // Si el mes es Enero o Febrero y el año lectivo es 2026-2027, el año es 2027.
      let anioPension = parseInt(yearPrefix);
      if (['Enero', 'Febrero'].includes(mesConf.mes)) {
        anioPension += 1;
      }
      
      const fechaVencimiento = `${anioPension}${mesConf.fecha_vencimiento_base}`;
      
      return connection.query(`
        INSERT INTO pensiones (id_matricula, mes, anio, valor, fecha_vencimiento, estado, valor_pagado)
        VALUES (?, ?, ?, ?, ?, 'Pendiente', 0)
      `, [id_matricula, mesConf.mes, anioPension, pensionesConfig.valor_mensual, fechaVencimiento]);
    });

    await Promise.all(pensionesPromises);

    await connection.commit();

    res.status(201).json({ 
      success: true, 
      message: 'Matrícula registrada y pensiones generadas correctamente',
      id_matricula 
    });

  } catch (error) {
    await connection.rollback();
    console.error('Error al crear matrícula:', error);
    res.status(500).json({ success: false, message: 'Error de servidor al guardar la matrícula' });
  } finally {
    connection.release();
  }
};

// PUT /api/matriculas/:id
exports.updateMatricula = async (req, res) => {
  try {
    const { id } = req.params;
    const { id_curso, paralelo, jornada, observaciones, estado } = req.body;

    const [result] = await db.query(`
      UPDATE matriculas 
      SET id_curso = ?, paralelo = ?, jornada = ?, observaciones = ?, estado = ?
      WHERE id_matricula = ?
    `, [id_curso, paralelo, jornada, observaciones, estado, id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Matrícula no encontrada' });
    }

    res.json({ success: true, message: 'Matrícula actualizada correctamente' });
  } catch (error) {
    console.error('Error al actualizar matrícula:', error);
    res.status(500).json({ success: false, message: 'Error de servidor' });
  }
};

// PATCH /api/matriculas/:id/anular
exports.anularMatricula = async (req, res) => {
  try {
    const { id } = req.params;
    const { motivo_anulacion } = req.body;

    if (!motivo_anulacion) {
      return res.status(400).json({ success: false, message: 'Debe especificar un motivo para anular la matrícula' });
    }

    const [result] = await db.query(`
      UPDATE matriculas 
      SET estado = 'Anulada', motivo_anulacion = ?, fecha_anulacion = NOW()
      WHERE id_matricula = ?
    `, [motivo_anulacion, id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Matrícula no encontrada' });
    }

    // Opcional: También anular las pensiones pendientes asociadas
    // await db.query(`UPDATE pensiones SET estado = 'Anulado' WHERE id_matricula = ? AND estado = 'Pendiente'`, [id]);

    res.json({ success: true, message: 'Matrícula anulada correctamente' });
  } catch (error) {
    console.error('Error al anular matrícula:', error);
    res.status(500).json({ success: false, message: 'Error de servidor' });
  }
};

// GET /api/matriculas/:id/pensiones
exports.getPensionesByMatricula = async (req, res) => {
  try {
    const { id } = req.params;
    
    const [pensiones] = await db.query(`
      SELECT * FROM pensiones 
      WHERE id_matricula = ?
      ORDER BY fecha_vencimiento ASC
    `, [id]);

    res.json({ success: true, pensiones });
  } catch (error) {
    console.error('Error al obtener pensiones:', error);
    res.status(500).json({ success: false, message: 'Error de servidor' });
  }
};
