const express = require('express');
const router = express.Router();
const consolidadoController = require('../controllers/consolidadoController');
const { verifyJWT } = require('../middleware/authMiddleware');

router.use(verifyJWT);

router.get('/resumen', consolidadoController.getResumenGeneral);
router.get('/mensual', consolidadoController.getConsolidadoMensual);
router.get('/cuentas', consolidadoController.getSaldosCuentas);
router.get('/mejoras-plantel', consolidadoController.getMejorasPlantel);

module.exports = router;
