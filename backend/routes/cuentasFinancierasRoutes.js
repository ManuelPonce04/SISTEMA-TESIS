const express = require('express');
const router = express.Router();
const {
  getCuentas,
  getCuentaById,
  createCuenta,
  updateCuenta,
  toggleEstadoCuenta,
} = require('../controllers/cuentasFinancierasController');
const { verifyJWT } = require('../middleware/authMiddleware');
const { checkAdmin } = require('../middleware/adminMiddleware');

// Todas las rutas requieren autenticación
router.use(verifyJWT);

// Consultas (cualquier usuario autenticado)
router.get('/', getCuentas);
router.get('/:id', getCuentaById);

// Mutaciones (solo administradores)
router.post('/', checkAdmin, createCuenta);
router.put('/:id', checkAdmin, updateCuenta);
router.patch('/:id/estado', checkAdmin, toggleEstadoCuenta);

module.exports = router;
