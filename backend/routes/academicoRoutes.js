const express = require('express');
const router = express.Router();
const academicoController = require('../controllers/academicoController');
const { verifyJWT } = require('../middleware/authMiddleware');

// Validar que todas requieran autenticación
router.use(verifyJWT);

// Periodos
router.get('/periodos', academicoController.getPeriodos);
router.get('/periodos/activo', academicoController.getPeriodosActivos);
router.post('/periodos', academicoController.createPeriodo);
router.put('/periodos/:id', academicoController.updatePeriodo);
router.patch('/periodos/:id/activar', academicoController.activarPeriodo);
router.patch('/periodos/:id/estado', academicoController.cambiarEstadoPeriodo);

// Niveles
router.get('/niveles', academicoController.getNiveles);
router.post('/niveles', academicoController.createNivel);
router.put('/niveles/:id', academicoController.updateNivel);

// Cursos
router.get('/cursos', academicoController.getCursosList);
router.post('/cursos', academicoController.createCurso);
router.put('/cursos/:id', academicoController.updateCurso);

// Paralelos
router.get('/paralelos', academicoController.getParalelos);
router.post('/paralelos', academicoController.createParalelo);
router.put('/paralelos/:id', academicoController.updateParalelo);

// Jornadas
router.get('/jornadas', academicoController.getJornadas);
router.post('/jornadas', academicoController.createJornada);
router.put('/jornadas/:id', academicoController.updateJornada);

// Ofertas
router.get('/ofertas', academicoController.getOfertas);
router.post('/ofertas', academicoController.createOferta);
router.put('/ofertas/:id', academicoController.updateOferta);
router.post('/ofertas/creacion-masiva', academicoController.creacionMasiva);
router.post('/ofertas/copiar-periodo', academicoController.copiarPeriodo);

module.exports = router;
