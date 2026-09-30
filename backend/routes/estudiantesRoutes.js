const express = require('express');
const router = express.Router();
const {
  getEstudiantes,
  getHistorico,
  getEstudianteById,
  createEstudiante,
  updateEstudiante,
  deleteEstudiante,
  getCursos
} = require('../controllers/estudiantesController');
const { verifyJWT } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(verifyJWT);

// Cursos route
router.get('/cursos', getCursos);


// Historico route
router.get('/historico', getHistorico);

// Estudiantes CRUD routes
router.get('/', getEstudiantes);
router.post('/', createEstudiante);
router.get('/:id', getEstudianteById);
router.put('/:id', updateEstudiante);
router.delete('/:id', deleteEstudiante);

module.exports = router;
