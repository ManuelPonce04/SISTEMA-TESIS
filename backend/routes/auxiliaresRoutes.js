const express = require('express');
const auxiliaresController = require('../controllers/auxiliaresController');

const router = express.Router();

router.get('/cursos', auxiliaresController.getCursos);
router.get('/paralelos', auxiliaresController.getParalelos);
router.get('/anios-lectivos', auxiliaresController.getAniosLectivos);
router.get('/config-pensiones', auxiliaresController.getConfigPensiones);

module.exports = router;
