const express = require('express');
const cobranzasController = require('../controllers/cobranzasController');
const { verifyJWT } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(verifyJWT);

// Búsqueda en vivo de estudiantes
router.get('/estudiantes/buscar', cobranzasController.buscarEstudiantes);

// Resumen del estudiante
router.get('/resumen/:id_estudiante', cobranzasController.getResumenEstudiante);

// Pagos
router.get('/pagos', cobranzasController.getHistorialPagos);
router.post('/pagos', cobranzasController.registrarPagoGlobal);
router.patch('/pagos/:id/anular', cobranzasController.anularPago);

// Recibos
router.get('/recibos/:id_pago', cobranzasController.generarRecibo);

module.exports = router;
