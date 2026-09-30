const pool = require('../config/db');

// --- PERIODOS LECTIVOS ---
const getPeriodos = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM periodos_lectivos ORDER BY fecha_inicio DESC');
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getPeriodosActivos = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM periodos_lectivos WHERE es_activo = 1');
    res.json({ success: true, data: rows[0] || null });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const createPeriodo = async (req, res) => {
  const { codigo, nombre, fecha_inicio, fecha_fin, fecha_inicio_matriculas, fecha_fin_matriculas, observacion } = req.body;
  try {
    const [result] = await pool.query(
      `INSERT INTO periodos_lectivos (codigo, nombre, fecha_inicio, fecha_fin, fecha_inicio_matriculas, fecha_fin_matriculas, estado, es_activo, observacion) 
       VALUES (?, ?, ?, ?, ?, ?, 'PLANIFICADO', 0, ?)`,
      [codigo, nombre, fecha_inicio, fecha_fin, fecha_inicio_matriculas || null, fecha_fin_matriculas || null, observacion || null]
    );
    res.json({ success: true, message: 'Periodo creado.', id: result.insertId });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const updatePeriodo = async (req, res) => {
  const { id } = req.params;
  const { codigo, nombre, fecha_inicio, fecha_fin, fecha_inicio_matriculas, fecha_fin_matriculas, observacion } = req.body;
  try {
    await pool.query(
      `UPDATE periodos_lectivos SET codigo=?, nombre=?, fecha_inicio=?, fecha_fin=?, fecha_inicio_matriculas=?, fecha_fin_matriculas=?, observacion=? WHERE id=?`,
      [codigo, nombre, fecha_inicio, fecha_fin, fecha_inicio_matriculas || null, fecha_fin_matriculas || null, observacion || null, id]
    );
    res.json({ success: true, message: 'Periodo actualizado.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const activarPeriodo = async (req, res) => {
  const { id } = req.params;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(`UPDATE periodos_lectivos SET es_activo = 0 WHERE es_activo = 1`);
    await conn.query(`UPDATE periodos_lectivos SET estado = 'ACTIVO', es_activo = 1 WHERE id = ?`, [id]);
    await conn.commit();
    res.json({ success: true, message: 'Periodo activado.' });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ success: false, message: err.message });
  } finally {
    conn.release();
  }
};

const cambiarEstadoPeriodo = async (req, res) => {
  const { id } = req.params;
  const { estado } = req.body;
  try {
    let es_activo = 0;
    if (estado === 'ACTIVO') es_activo = 1; // Aunque activarPeriodo es mejor
    
    // Si se cierra, lo desactivamos si estaba activo
    if (estado === 'CERRADO' || estado === 'ARCHIVADO') {
       await pool.query(`UPDATE periodos_lectivos SET estado = ?, es_activo = 0 WHERE id = ?`, [estado, id]);
    } else {
       await pool.query(`UPDATE periodos_lectivos SET estado = ? WHERE id = ?`, [estado, id]);
    }
    res.json({ success: true, message: `Estado cambiado a ${estado}` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// --- NIVELES ---
const getNiveles = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM niveles_educativos ORDER BY orden ASC');
    // Traer subniveles y cursos para estructurar el árbol
    const [subRows] = await pool.query('SELECT * FROM subniveles_educativos ORDER BY orden ASC');
    const [cursosRows] = await pool.query('SELECT * FROM cursos ORDER BY orden_academico ASC');

    const result = rows.map(n => ({
      ...n,
      subniveles: subRows.filter(s => s.nivel_id === n.id).map(s => ({
         ...s,
         cursos: cursosRows.filter(c => c.subnivel_id === s.id)
      })),
      cursos: cursosRows.filter(c => c.nivel_id === n.id && !c.subnivel_id)
    }));

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const createNivel = async (req, res) => {
  const { codigo, nombre, orden } = req.body;
  try {
    const [result] = await pool.query('INSERT INTO niveles_educativos (codigo, nombre, orden) VALUES (?, ?, ?)', [codigo, nombre, orden]);
    res.json({ success: true, id: result.insertId });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const updateNivel = async (req, res) => {
  const { id } = req.params;
  const { codigo, nombre, orden, activo } = req.body;
  try {
    await pool.query('UPDATE niveles_educativos SET codigo=?, nombre=?, orden=?, activo=? WHERE id=?', [codigo, nombre, orden, activo, id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// --- CURSOS ---
const getCursosList = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT c.*, n.nombre as nivel_nombre 
      FROM cursos c 
      JOIN niveles_educativos n ON c.nivel_id = n.id 
      ORDER BY c.orden_academico ASC
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

const createCurso = async (req, res) => {
  const { nivel_id, subnivel_id, codigo, nombre, orden_academico, observacion } = req.body;
  try {
    const [result] = await pool.query(
      'INSERT INTO cursos (nivel_id, subnivel_id, codigo, nombre, orden_academico, observacion) VALUES (?, ?, ?, ?, ?, ?)', 
      [nivel_id, subnivel_id || null, codigo, nombre, orden_academico, observacion || null]
    );
    res.json({ success: true, id: result.insertId });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const updateCurso = async (req, res) => {
  const { id } = req.params;
  const { nivel_id, subnivel_id, codigo, nombre, orden_academico, activo, observacion } = req.body;
  try {
    await pool.query(
      'UPDATE cursos SET nivel_id=?, subnivel_id=?, codigo=?, nombre=?, orden_academico=?, activo=?, observacion=? WHERE id=?', 
      [nivel_id, subnivel_id || null, codigo, nombre, orden_academico, activo, observacion || null, id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// --- PARALELOS ---
const getParalelos = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM paralelos ORDER BY orden ASC');
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const createParalelo = async (req, res) => {
  const { codigo, nombre, orden } = req.body;
  try {
    await pool.query('INSERT INTO paralelos (codigo, nombre, orden) VALUES (?, ?, ?)', [codigo, nombre, orden]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const updateParalelo = async (req, res) => {
  const { id } = req.params;
  const { codigo, nombre, orden, activo } = req.body;
  try {
    await pool.query('UPDATE paralelos SET codigo=?, nombre=?, orden=?, activo=? WHERE id=?', [codigo, nombre, orden, activo, id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// --- JORNADAS ---
const getJornadas = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM jornadas ORDER BY orden ASC');
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const createJornada = async (req, res) => {
  const { codigo, nombre, orden } = req.body;
  try {
    await pool.query('INSERT INTO jornadas (codigo, nombre, orden) VALUES (?, ?, ?)', [codigo, nombre, orden]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const updateJornada = async (req, res) => {
  const { id } = req.params;
  const { codigo, nombre, orden, activo } = req.body;
  try {
    await pool.query('UPDATE jornadas SET codigo=?, nombre=?, orden=?, activo=? WHERE id=?', [codigo, nombre, orden, activo, id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// --- OFERTA ACADEMICA ---
const getOfertas = async (req, res) => {
  const { periodo_id } = req.query;
  let sql = `
    SELECT 
      o.*, 
      c.nombre as curso_nombre, c.orden_academico, c.nivel_id,
      p.nombre as paralelo_nombre,
      j.nombre as jornada_nombre,
      CONCAT(per.nombres, ' ', per.apellidos) as tutor_nombre,
      (o.cupo_maximo - IFNULL((SELECT COUNT(*) FROM matriculas m WHERE m.oferta_academica_id = o.id AND m.estado IN ('BORRADOR','ACTIVA','PENDIENTE')), 0)) as cupos_disponibles
    FROM oferta_academica o
    JOIN cursos c ON o.curso_id = c.id
    JOIN paralelos p ON o.paralelo_id = p.id
    LEFT JOIN jornadas j ON o.jornada_id = j.id
    LEFT JOIN personal per ON o.tutor_personal_id = per.id
  `;

  const params = [];
  if (periodo_id) {
    sql += ' WHERE o.periodo_lectivo_id = ?';
    params.push(periodo_id);
  }
  sql += ' ORDER BY c.orden_academico ASC, p.orden ASC';

  try {
    const [rows] = await pool.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const createOferta = async (req, res) => {
  const { periodo_lectivo_id, curso_id, paralelo_id, jornada_id, cupo_maximo, tutor_personal_id, aula, estado, observacion } = req.body;
  try {
    await pool.query(
      'INSERT INTO oferta_academica (periodo_lectivo_id, curso_id, paralelo_id, jornada_id, cupo_maximo, tutor_personal_id, aula, estado, observacion) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [periodo_lectivo_id, curso_id, paralelo_id, jornada_id || null, cupo_maximo || 30, tutor_personal_id || null, aula || null, estado || 'ACTIVA', observacion || null]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const updateOferta = async (req, res) => {
  const { id } = req.params;
  const { cupo_maximo, aula, tutor_personal_id, estado } = req.body;
  try {
    await pool.query(
      `UPDATE oferta_academica SET cupo_maximo=?, aula=?, tutor_personal_id=?, estado=? WHERE id=?`,
      [cupo_maximo || null, aula || null, tutor_personal_id || null, estado, id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const creacionMasiva = async (req, res) => {
  const { periodo_lectivo_id, cursos, paralelos, jornada_id, cupo_maximo } = req.body;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    let insertados = 0;
    for (const cid of cursos) {
      for (const pid of paralelos) {
        // Verificar duplicados
        const [existing] = await conn.query(
          `SELECT id FROM oferta_academica 
           WHERE periodo_lectivo_id=? AND curso_id=? AND paralelo_id=? AND (jornada_id=? OR jornada_id IS NULL)`,
          [periodo_lectivo_id, cid, pid, jornada_id || null]
        );
        if (existing.length === 0) {
          await conn.query(
            `INSERT INTO oferta_academica (periodo_lectivo_id, curso_id, paralelo_id, jornada_id, cupo_maximo) 
             VALUES (?, ?, ?, ?, ?)`,
            [periodo_lectivo_id, cid, pid, jornada_id || null, cupo_maximo || null]
          );
          insertados++;
        }
      }
    }
    await conn.commit();
    res.json({ success: true, message: `${insertados} ofertas creadas exitosamente.` });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ success: false, message: err.message });
  } finally {
    conn.release();
  }
};

const copiarPeriodo = async (req, res) => {
  const { origen_id, destino_id } = req.body;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    
    // Obtener origen
    const [ofertasOrigen] = await conn.query('SELECT * FROM oferta_academica WHERE periodo_lectivo_id = ? AND estado != "CANCELADA"', [origen_id]);
    
    let insertados = 0;
    for (const o of ofertasOrigen) {
      const [existing] = await conn.query(
        `SELECT id FROM oferta_academica 
         WHERE periodo_lectivo_id=? AND curso_id=? AND paralelo_id=? AND (jornada_id=? OR jornada_id IS NULL)`,
        [destino_id, o.curso_id, o.paralelo_id, o.jornada_id]
      );
      if (existing.length === 0) {
        await conn.query(
          `INSERT INTO oferta_academica (periodo_lectivo_id, curso_id, paralelo_id, jornada_id, cupo_maximo) 
           VALUES (?, ?, ?, ?, ?)`,
          [destino_id, o.curso_id, o.paralelo_id, o.jornada_id, o.cupo_maximo]
        );
        insertados++;
      }
    }

    await conn.commit();
    res.json({ success: true, message: `${insertados} ofertas copiadas al periodo destino.` });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ success: false, message: err.message });
  } finally {
    conn.release();
  }
};

module.exports = {
  getPeriodos, getPeriodosActivos, createPeriodo, updatePeriodo, activarPeriodo, cambiarEstadoPeriodo,
  getNiveles, createNivel, updateNivel,
  getCursosList, createCurso, updateCurso,
  getParalelos, createParalelo, updateParalelo,
  getJornadas, createJornada, updateJornada,
  getOfertas, createOferta, updateOferta, creacionMasiva, copiarPeriodo
};
