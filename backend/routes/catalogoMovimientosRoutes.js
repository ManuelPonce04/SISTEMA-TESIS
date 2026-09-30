const express = require('express');
const router = express.Router();
const {
  getMovimientos,
  getMovimientoById,
  createMovimiento,
  updateMovimiento,
  toggleEstadoMovimiento,
} = require('../controllers/catalogoMovimientosController');
const { verifyJWT } = require('../middleware/authMiddleware');
const { checkAdmin } = require('../middleware/adminMiddleware');

// Todas las rutas requieren autenticación
router.use(verifyJWT);

// Consultas (cualquier usuario autenticado)
router.get('/', getMovimientos);
router.get('/:id', getMovimientoById);

// Mutaciones (solo administradores)
router.post('/', checkAdmin, createMovimiento);
router.put('/:id', checkAdmin, updateMovimiento);
router.patch('/:id/estado', checkAdmin, toggleEstadoMovimiento);

module.exports = router;
