const pool = require('../config/db');

/**
 * Divide apellidos_nombres en apellidos y nombres para mantener compatibilidad con consultas anteriores.
 */
const splitApellidosNombres = (fullName) => {
  let nombres = '';
  let apellidos = '';
  if (fullName) {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length >= 4) {
      apellidos = parts.slice(0, 2).join(' ');
      nombres = parts.slice(2).join(' ');
    } else if (parts.length >= 2) {
      apellidos = parts[0];
      nombres = parts.slice(1).join(' ');
    } else {
      apellidos = fullName;
      nombres = '';
    }
  }
  return { nombres, apellidos };
};

/**
 * Busca estudiantes con filtros, paginación y búsqueda
 */
const getAll = async ({ query, estado, page = 1, limit = 10, sortBy = 'created_at', order = 'DESC' }) => {
  const offset = (page - 1) * limit;
  let params = [];
  
  let sql = `
    SELECT 
      e.id_estudiante, 
      e.codigo, 
      e.cedula, 
      e.nombres, 
      e.apellidos, 
      e.apellidos_nombres,
      e.es_nuevo,
      e.fecha_nacimiento,
      e.estado, 
      e.created_at,
      COALESCE(er.id_representante, e.id_representante) AS id_representante,
      CONCAT(r.nombres, ' ', r.apellidos) AS representante_nombre,
      r.telefono AS representante_telefono
    FROM estudiantes e
    LEFT JOIN estudiante_representantes er ON e.id_estudiante = er.id_estudiante AND er.es_principal = TRUE AND er.activo = TRUE
    LEFT JOIN representantes r ON er.id_representante = r.id_representante
    WHERE 1=1
  `;

  if (query) {
    sql += ` AND (e.codigo LIKE ? OR e.cedula LIKE ? OR e.apellidos_nombres LIKE ? OR e.nombres LIKE ? OR e.apellidos LIKE ? OR r.nombres LIKE ? OR r.apellidos LIKE ?)`;
    const searchParam = `%${query}%`;
    params.push(searchParam, searchParam, searchParam, searchParam, searchParam, searchParam, searchParam);
  }

  if (estado && estado !== 'Todos') {
    sql += ` AND e.estado = ?`;
    params.push(estado);
  }

  // Count total for pagination
  const countSql = `SELECT COUNT(*) as total FROM (${sql}) AS subquery`;
  const [countRows] = await pool.execute(countSql, params);
  const total = countRows[0].total;

  // Ordering and Pagination
  const validSortColumns = {
    'Nombre': 'e.apellidos_nombres',
    'Código': 'e.codigo',
    'Fecha': 'e.created_at'
  };
  const sortColumn = validSortColumns[sortBy] || 'e.created_at';
  const sortDirection = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  
  sql += ` ORDER BY ${sortColumn} ${sortDirection} LIMIT ? OFFSET ?`;
  params.push(parseInt(limit), parseInt(offset));

  const [rows] = await pool.execute(sql, params);

  const formattedRows = rows.map(r => {
    let nombres = r.nombres;
    let apellidos = r.apellidos;
    if (!nombres && !apellidos && r.apellidos_nombres) {
      const split = splitApellidosNombres(r.apellidos_nombres);
      nombres = split.nombres;
      apellidos = split.apellidos;
    }
    return {
      ...r,
      nombres: nombres || '',
      apellidos: apellidos || '',
      apellidos_nombres: r.apellidos_nombres || `${apellidos} ${nombres}`.trim()
    };
  });

  return {
    data: formattedRows,
    total,
    page: parseInt(page),
    limit: parseInt(limit),
    totalPages: Math.ceil(total / limit)
  };
};

/**
 * Obtiene el detalle completo de un estudiante, incluyendo sus representantes
 */
const getById = async (id) => {
  const sql = `
    SELECT 
      e.*
    FROM estudiantes e
    WHERE e.id_estudiante = ?
  `;
  const [rows] = await pool.execute(sql, [id]);
  const estudiante = rows[0] || null;

  if (estudiante) {
    // Buscar representantes
    const [reps] = await pool.execute(`
      SELECT r.*, er.parentesco, er.es_principal, er.es_responsable_economico, er.recibe_notificaciones, er.autorizado_retiro, er.vive_con_estudiante
      FROM representantes r
      JOIN estudiante_representantes er ON r.id_representante = er.id_representante
      WHERE er.id_estudiante = ? AND er.activo = TRUE
    `, [id]);
    estudiante.representantes = reps;

    // Obtener matrícula activa (soporta schema nuevo y legado)
    let matRows = [];
    try {
      // Intentar con schema nuevo (oferta_academica_id -> JOIN oferta_academica -> cursos)
      const [newMat] = await pool.execute(`
        SELECT m.*, c.nombre AS curso_nombre, p.nombre AS paralelo, pl.nombre AS anio_lectivo
        FROM matriculas m
        LEFT JOIN oferta_academica oa ON m.oferta_academica_id = oa.id
        LEFT JOIN cursos c ON oa.curso_id = c.id
        LEFT JOIN paralelos p ON oa.paralelo_id = p.id
        LEFT JOIN periodos_lectivos pl ON m.periodo_lectivo_id = pl.id
        WHERE m.estudiante_id = ? AND m.estado IN ('ACTIVA','BORRADOR')
        ORDER BY m.created_at DESC LIMIT 1
      `, [id]);
      matRows = newMat;
    } catch (e) {
      // Fallback schema legado
      const [legacyMat] = await pool.execute(`
        SELECT m.*, c.nombre AS curso_nombre, m.anio_lectivo, m.paralelo
        FROM matriculas m
        LEFT JOIN cursos c ON m.id_curso = c.id_curso
        WHERE m.id_estudiante = ? AND m.estado = 'Activa'
        LIMIT 1
      `, [id]);
      matRows = legacyMat;
    }
    estudiante.matricula_activa = matRows[0] || null;

  }

  return estudiante;
};

/**
 * Genera un código único básico para el estudiante.
 * (Como ya no pedimos grado_curso al registrar, podemos generar un código general o usar la cédula)
 * Aquí generaremos EST-XXXXXX
 */
const generateCodigoEst = async (connection) => {
  const [rows] = await connection.execute(
    "SELECT codigo FROM estudiantes WHERE codigo LIKE 'EST-%' ORDER BY id_estudiante DESC LIMIT 1"
  );
  
  let maxSeq = 0;
  if (rows.length > 0) {
    const code = rows[0].codigo;
    const numPart = code.substring(4);
    const seq = parseInt(numPart, 10);
    if (!isNaN(seq) && seq > maxSeq) {
      maxSeq = seq;
    }
  }
  
  const nextSeq = String(maxSeq + 1).padStart(6, '0');
  return `EST-${nextSeq}`;
};

/**
 * Registra un nuevo estudiante (solo datos del estudiante y asigna el representante principal)
 */
const create = async (studentData) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    // Generar código autoincremental si no se envía o es vacío
    let finalCodigo = studentData.codigo;
    if (!finalCodigo) {
      finalCodigo = await generateCodigoEst(connection);
    }

    // Procesar nombres separados para compatibilidad
    let nombres = studentData.nombres;
    let apellidos = studentData.apellidos;
    let apellidos_nombres = studentData.apellidos_nombres;
    
    if (!apellidos_nombres && nombres && apellidos) {
      apellidos_nombres = `${apellidos} ${nombres}`;
    } else if (apellidos_nombres && (!nombres || !apellidos)) {
      const split = splitApellidosNombres(apellidos_nombres);
      nombres = split.nombres;
      apellidos = split.apellidos;
    }

    // Insertar Estudiante
    const [estResult] = await connection.execute(
      `INSERT INTO estudiantes (
        codigo, cedula, tipo_identificacion, nombres, apellidos, apellidos_nombres, 
        fecha_nacimiento, sexo, nacionalidad, pais_nacimiento, provincia_nacimiento, canton_nacimiento,
        direccion, telefono, correo, estado, es_nuevo, observaciones
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        finalCodigo, 
        studentData.cedula || null, 
        studentData.tipo_identificacion || 'Cédula',
        nombres, 
        apellidos, 
        apellidos_nombres,
        studentData.fecha_nacimiento || '2018-01-01', 
        studentData.sexo || 'Masculino',
        studentData.nacionalidad || 'Ecuatoriana',
        studentData.pais_nacimiento || 'Ecuador',
        studentData.provincia_nacimiento || 'Manabí',
        studentData.canton_nacimiento || 'Jaramijó',
        studentData.direccion || null,
        studentData.telefono || null,
        studentData.correo || null,
        studentData.estado || 'ACTIVO',
        studentData.es_nuevo !== undefined ? studentData.es_nuevo : true,
        studentData.observaciones || null
      ]
    );
    const idEstudiante = estResult.insertId;

    // Registrar Representantes si vienen en el array "representantes"
    if (studentData.representantes && Array.isArray(studentData.representantes)) {
      for (const rep of studentData.representantes) {
        let idRepresentante = rep.id_representante;
        
        // Si no existe el id_representante, se crea uno nuevo
        if (!idRepresentante) {
          const [repInsert] = await connection.execute(
            'INSERT INTO representantes (cedula, nombres, apellidos, telefono, correo, direccion) VALUES (?, ?, ?, ?, ?, ?)',
            [rep.cedula || null, rep.nombres, rep.apellidos, rep.telefono || null, rep.correo || null, rep.direccion || null]
          );
          idRepresentante = repInsert.insertId;
        }

        // Vincular en estudiante_representantes
        await connection.execute(`
          INSERT INTO estudiante_representantes (
            id_estudiante, id_representante, parentesco, es_principal, es_responsable_economico,
            recibe_notificaciones, autorizado_retiro, vive_con_estudiante
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          idEstudiante,
          idRepresentante,
          rep.parentesco || 'Representante',
          rep.es_principal ? 1 : 0,
          rep.es_responsable_economico ? 1 : 0,
          rep.recibe_notificaciones !== false ? 1 : 0,
          rep.autorizado_retiro ? 1 : 0,
          rep.vive_con_estudiante ? 1 : 0
        ]);
      }
    }

    await connection.commit();
    return idEstudiante;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

/**
 * Actualiza la información del estudiante y sus representantes
 */
const update = async (id, studentData) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    let nombres = studentData.nombres;
    let apellidos = studentData.apellidos;
    let apellidos_nombres = studentData.apellidos_nombres;
    
    if (!apellidos_nombres && nombres && apellidos) {
      apellidos_nombres = `${apellidos} ${nombres}`;
    } else if (apellidos_nombres && (!nombres || !apellidos)) {
      const split = splitApellidosNombres(apellidos_nombres);
      nombres = split.nombres;
      apellidos = split.apellidos;
    }

    // Actualizar Estudiante
    await connection.execute(
      `UPDATE estudiantes SET 
        codigo=?, cedula=?, tipo_identificacion=?, nombres=?, apellidos=?, apellidos_nombres=?, 
        fecha_nacimiento=?, sexo=?, nacionalidad=?, pais_nacimiento=?, provincia_nacimiento=?, canton_nacimiento=?,
        direccion=?, telefono=?, correo=?, estado=?, es_nuevo=?, observaciones=?
      WHERE id_estudiante=?`,
      [
        studentData.codigo, 
        studentData.cedula || null, 
        studentData.tipo_identificacion || 'Cédula',
        nombres, 
        apellidos, 
        apellidos_nombres,
        studentData.fecha_nacimiento || '2018-01-01', 
        studentData.sexo || 'Masculino',
        studentData.nacionalidad || 'Ecuatoriana',
        studentData.pais_nacimiento || 'Ecuador',
        studentData.provincia_nacimiento || 'Manabí',
        studentData.canton_nacimiento || 'Jaramijó',
        studentData.direccion || null,
        studentData.telefono || null,
        studentData.correo || null,
        studentData.estado || 'ACTIVO', 
        studentData.es_nuevo !== undefined ? studentData.es_nuevo : true,
        studentData.observaciones || null,
        id
      ]
    );

    // Actualizar representantes si vienen
    if (studentData.representantes && Array.isArray(studentData.representantes)) {
      // Por simplicidad, desactivamos todas las relaciones previas y reinsertamos
      // o verificamos si ya existe. Lo más seguro es eliminar o desactivar:
      await connection.execute('DELETE FROM estudiante_representantes WHERE id_estudiante = ?', [id]);

      for (const rep of studentData.representantes) {
        let idRepresentante = rep.id_representante;
        
        if (!idRepresentante) {
          const [repInsert] = await connection.execute(
            'INSERT INTO representantes (cedula, nombres, apellidos, telefono, correo, direccion) VALUES (?, ?, ?, ?, ?, ?)',
            [rep.cedula || null, rep.nombres, rep.apellidos, rep.telefono || null, rep.correo || null, rep.direccion || null]
          );
          idRepresentante = repInsert.insertId;
        }

        await connection.execute(`
          INSERT INTO estudiante_representantes (
            id_estudiante, id_representante, parentesco, es_principal, es_responsable_economico,
            recibe_notificaciones, autorizado_retiro, vive_con_estudiante
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          id,
          idRepresentante,
          rep.parentesco || 'Representante',
          rep.es_principal ? 1 : 0,
          rep.es_responsable_economico ? 1 : 0,
          rep.recibe_notificaciones !== false ? 1 : 0,
          rep.autorizado_retiro ? 1 : 0,
          rep.vive_con_estudiante ? 1 : 0
        ]);
      }
    }

    await connection.commit();
    return true;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

/**
 * Borrado Lógico (Cambia estado a INACTIVO)
 */
const remove = async (id) => {
  await pool.execute("UPDATE estudiantes SET estado = 'INACTIVO' WHERE id_estudiante = ?", [id]);
  return true;
};

/**
 * Obtener listado de estudiantes históricos
 */
const getHistorico = async () => {
  const [rows] = await pool.execute('SELECT * FROM historico_estudiantes ORDER BY apellidos_nombres ASC');
  return rows;
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
  getHistorico
};
