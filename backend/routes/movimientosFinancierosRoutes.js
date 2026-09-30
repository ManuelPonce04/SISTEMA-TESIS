const express = require('express');
const router = express.Router();
const {
  getResumen,
  getMovimientos,
  getMovimientoById,
  createMovimiento,
  updateMovimiento,
  anularMovimiento,
  descargarArchivo,
  exportarExcel,
  exportarPDF,
  getDatosFormulario,
} = require('../controllers/movimientosFinancierosController');
const { verifyJWT } = require('../middleware/authMiddleware');
const { checkAdmin } = require('../middleware/adminMiddleware');
const { uploadSingle } = require('../middleware/uploadMiddleware');

// Todas las rutas requieren autenticación
router.use(verifyJWT);

// ── Consultas y exportaciones (Autenticados) ─────────────────
router.get('/resumen', getResumen);
router.get('/exportar/excel', exportarExcel);
router.get('/exportar/pdf', exportarPDF);
router.get('/datos-formulario', getDatosFormulario);
router.get('/', getMovimientos);
router.get('/:id', getMovimientoById);
router.get('/:id/archivo', descargarArchivo);

// ── Mutaciones ───────────────────────────────────────────────
// Crear: Permitido a usuarios autenticados (según requerimiento, roles definen acceso en frontend/backend)
// Aquí usamos uploadSingle para procesar el multipart/form-data
router.post('/', uploadSingle('archivo'), createMovimiento);

// Editar: Solo administradores
router.put('/:id', checkAdmin, uploadSingle('archivo'), updateMovimiento);

// Anular: Solo administradores
router.patch('/:id/anular', checkAdmin, anularMovimiento);

module.exports = router;
