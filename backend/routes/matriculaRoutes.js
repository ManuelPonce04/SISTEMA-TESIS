const express = require('express');
const router = express.Router();
const matriculaController = require('../controllers/matriculaController');
const { verifyJWT } = require('../middleware/authMiddleware');
const { checkAdmin } = require('../middleware/adminMiddleware');

// === MATRÍCULAS ===
router.get('/', verifyJWT, matriculaController.getMatriculas);
router.post('/', verifyJWT, matriculaController.createMatricula);
router.get('/tipos', verifyJWT, matriculaController.getTiposMatricula);
router.get('/tarifa', verifyJWT, matriculaController.getTarifa);

router.get('/:id', verifyJWT, matriculaController.getMatriculaById);
router.put('/:id', verifyJWT, checkAdmin, matriculaController.updateMatricula);
router.patch('/:id/confirmar', verifyJWT, matriculaController.confirmarMatricula);
router.patch('/:id/anular', verifyJWT, checkAdmin, matriculaController.anularMatricula);
router.patch('/:id/cambiar-oferta', verifyJWT, checkAdmin, matriculaController.cambiarOferta);

// === PAGOS DE MATRÍCULA ===
router.get('/:id/pagos', verifyJWT, matriculaController.getPagosMatricula);
router.post('/:id/pagos', verifyJWT, matriculaController.registrarPago);
router.patch('/:id/pagos/:pagoId/anular', verifyJWT, checkAdmin, matriculaController.anularPago);

module.exports = router;
