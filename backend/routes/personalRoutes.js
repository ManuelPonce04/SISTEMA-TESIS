const express = require('express');
const router = express.Router();

const { verifyJWT } = require('../middleware/authMiddleware');
const { checkAdmin } = require('../middleware/adminMiddleware');

const {
  getPersonal,
  getPersonalById,
  createPersonal,
  updatePersonal,
  cambiarSueldo,
  cambiarEstado,
  getHistorialSueldos,
  exportarExcel,
  exportarPDF
} = require('../controllers/personalController');

const {
  getTiposContrato, updateTipoContrato, createTipoContrato,
  getFunciones, updateFuncion, createFuncion,
  getCargos, updateCargo, createCargo
} = require('../controllers/personalCatalogosController');

// Todas las rutas de personal requieren autenticación
router.use(verifyJWT);

// ── Rutas de Catálogos ──
router.get('/catalogos/tipos-contrato', getTiposContrato);
router.post('/catalogos/tipos-contrato', checkAdmin, createTipoContrato);
router.put('/catalogos/tipos-contrato/:id', checkAdmin, updateTipoContrato);

router.get('/catalogos/funciones', getFunciones);
router.post('/catalogos/funciones', checkAdmin, createFuncion);
router.put('/catalogos/funciones/:id', checkAdmin, updateFuncion);

router.get('/catalogos/cargos', getCargos);
router.post('/catalogos/cargos', checkAdmin, createCargo);
router.put('/catalogos/cargos/:id', checkAdmin, updateCargo);

// ── Exportación ──
router.get('/exportar/excel', exportarExcel);
router.get('/exportar/pdf', exportarPDF);

// ── Rutas de Personal ──
router.get('/', getPersonal);
router.post('/', checkAdmin, createPersonal);
router.get('/:id', getPersonalById);
router.put('/:id', checkAdmin, updatePersonal);
router.patch('/:id/estado', checkAdmin, cambiarEstado);

// ── Rutas de Historial Salarial ──
router.get('/:id/historial-sueldos', getHistorialSueldos);
router.post('/:id/cambiar-sueldo', checkAdmin, cambiarSueldo);

module.exports = router;
