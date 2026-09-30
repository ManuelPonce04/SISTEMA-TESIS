const express = require('express');
const router = express.Router();
const cobroController = require('../controllers/cobroController');
const { verifyJWT: protect } = require('../middleware/authMiddleware');

// Buscar estudiantes para cobrar
router.get('/estudiantes/buscar', protect, cobroController.buscarEstudiantesParaCobro);

// Obtener obligaciones pendientes y créditos de una matrícula
router.get('/matricula/:matriculaId/obligaciones', protect, cobroController.getObligacionesCobrables);

// Obtener métodos de pago
router.get('/metodos-pago', protect, cobroController.getMetodosPago);

// Registrar cobro (Transaccional)
router.post('/', protect, cobroController.registrarCobro);

module.exports = router;
