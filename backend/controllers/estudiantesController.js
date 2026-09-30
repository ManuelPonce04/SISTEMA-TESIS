const estudianteModel = require('../models/estudianteModel');
const pool = require('../config/db');

/**
 * GET /api/estudiantes
 */
const getEstudiantes = async (req, res) => {
  try {
    // Aceptamos tanto 'query' como 'search' por compatibilidad con múltiples módulos
    const { query, search, estado, page, limit, sortBy, order } = req.query;
    const searchTerm = query || search; // Prioridad a 'query'
    const result = await estudianteModel.getAll({ query: searchTerm, estado, page, limit, sortBy, order });
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Error fetching estudiantes:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

/**
 * GET /api/estudiantes/historico
 */
const getHistorico = async (req, res) => {
  try {
    const data = await estudianteModel.getHistorico();
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching historico:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

/**
 * GET /api/estudiantes/:id
 */
const getEstudianteById = async (req, res) => {
  try {
    const { id } = req.params;
    const estudiante = await estudianteModel.getById(id);
    if (!estudiante) {
      return res.status(404).json({ success: false, message: 'Estudiante no encontrado' });
    }
    res.json({ success: true, data: estudiante });
  } catch (error) {
    console.error('Error fetching estudiante:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

/**
 * POST /api/estudiantes
 */
const createEstudiante = async (req, res) => {
  try {
    const studentData = req.body;

    // Si el código viene especificado, validamos unicidad global
    if (studentData.codigo) {
      const [existingCode] = await pool.execute(
        'SELECT id_estudiante FROM estudiantes WHERE codigo = ?',
        [studentData.codigo]
      );
      if (existingCode.length > 0) {
        return res.status(400).json({ success: false, message: `El código de estudiante ${studentData.codigo} ya está registrado` });
      }
    }

    // Validar unicidad de cédula
    if (studentData.cedula) {
      const [existingCedula] = await pool.execute(
        'SELECT id_estudiante FROM estudiantes WHERE cedula = ?',
        [studentData.cedula]
      );
      if (existingCedula.length > 0) {
        return res.status(400).json({ success: false, message: 'La cédula del estudiante ya está registrada' });
      }
    }

    const newId = await estudianteModel.create(studentData);
    res.status(201).json({ success: true, message: 'Estudiante registrado correctamente', id: newId });
  } catch (error) {
    console.error('Error creating estudiante:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

/**
 * PUT /api/estudiantes/:id
 */
const updateEstudiante = async (req, res) => {
  try {
    const { id } = req.params;
    const studentData = req.body;
    
    // Validar si el código pertenece a otro estudiante
    if (studentData.codigo) {
      const [existingCode] = await pool.execute(
        'SELECT id_estudiante FROM estudiantes WHERE codigo = ? AND id_estudiante != ?',
        [studentData.codigo, id]
      );
      if (existingCode.length > 0) {
        return res.status(400).json({ success: false, message: 'El código pertenece a otro estudiante' });
      }
    }

    // Validar si la cédula pertenece a otro estudiante
    if (studentData.cedula) {
      const [existingCedula] = await pool.execute(
        'SELECT id_estudiante FROM estudiantes WHERE cedula = ? AND id_estudiante != ?',
        [studentData.cedula, id]
      );
      if (existingCedula.length > 0) {
        return res.status(400).json({ success: false, message: 'La cédula pertenece a otro estudiante' });
      }
    }

    await estudianteModel.update(id, studentData);
    res.json({ success: true, message: 'Estudiante actualizado correctamente' });
  } catch (error) {
    console.error('Error updating estudiante:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

/**
 * DELETE /api/estudiantes/:id
 */
const deleteEstudiante = async (req, res) => {
  try {
    const { id } = req.params;
    await estudianteModel.remove(id);
    res.json({ success: true, message: 'Estudiante eliminado (estado inactivo)' });
  } catch (error) {
    console.error('Error deleting estudiante:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

/**
 * GET /api/cursos
 * Retorna la lista estática de cursos para los selectores (Aún útil si se requiere listar cursos)
 */
const getCursos = async (req, res) => {
  try {
    const [rows] = await pool.execute("SELECT * FROM cursos WHERE estado = 'Activo' ORDER BY id_curso ASC");
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error interno' });
  }
};

module.exports = {
  getEstudiantes,
  getHistorico,
  getEstudianteById,
  createEstudiante,
  updateEstudiante,
  deleteEstudiante,
  getCursos
};
