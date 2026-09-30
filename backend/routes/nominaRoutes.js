const express = require('express');
const router = express.Router();
const nominaController = require('../controllers/nominaController');
const { verifyJWT } = require('../middleware/authMiddleware');

router.use(verifyJWT);

// GET /api/finanzas/nominas
router.get('/', nominaController.listarNominas);

// POST /api/finanzas/nominas/generar
router.post('/generar', nominaController.generarNomina);

// GET /api/finanzas/nominas/:id
router.get('/:id', nominaController.getNominaDetalle);

// POST /api/finanzas/nominas/:id/recalcular
router.post('/:id/recalcular', nominaController.recalcularNomina);

// PATCH /api/finanzas/nominas/:id/estado
router.patch('/:id/estado', nominaController.cambiarEstado);

// POST /api/finanzas/nominas/:id/detalles/:detalleId/pagar
router.post('/:id/detalles/:detalleId/pagar', nominaController.pagarIndividual);

module.exports = router;
