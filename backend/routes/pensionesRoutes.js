const express = require('express');
const pensionesController = require('../controllers/pensionesController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Middleware: todas las rutas requieren estar autenticado
router.use(authMiddleware.verifyJWT);

router.get('/', pensionesController.getPensiones);
router.get('/resumen', pensionesController.getResumenPensiones);
router.get('/:id', pensionesController.getPensionById);
router.get('/estudiante/:id_estudiante', pensionesController.getPensionesByEstudiante);

// Pagos
router.get('/:id_pension/pagos', pensionesController.getPagosByPension);
router.post('/:id/pagar', pensionesController.registrarPago);

// Acciones admin
router.patch('/:id/anular', pensionesController.anularPension);

module.exports = router;
