const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/pensionesConfigController');
const auth = require('../middleware/authMiddleware');

// Todas las rutas requieren autenticación
router.use(auth.verifyJWT);

// ── Catálogos de apoyo (periodos, niveles, cursos para selects) ──
router.get('/catalogos', ctrl.getCatalogosApoyo);

// ── Auditoría ──────────────────────────────────────────────────
router.get('/auditoria', ctrl.getAuditoria);

// ── Tarifas ────────────────────────────────────────────────────
// IMPORTANTE: las rutas con segmentos fijos ANTES que las :id
router.get('/tarifas/resolver',       ctrl.resolverTarifa);
router.post('/tarifas/masiva',         ctrl.creacionMasivaTarifas);
router.post('/tarifas/copiar-periodo', ctrl.copiarPeriodo);
router.get('/tarifas',                 ctrl.getTarifas);
router.post('/tarifas',                ctrl.crearTarifa);
router.get('/tarifas/:id',             ctrl.getTarifaById);
router.put('/tarifas/:id',             ctrl.actualizarTarifa);
router.patch('/tarifas/:id/estado',    ctrl.cambiarEstadoTarifa);

// ── Meses cobrables ────────────────────────────────────────────
router.post('/meses/generar',          ctrl.generarMeses);
router.get('/meses',                   ctrl.getMeses);
router.post('/meses',                  ctrl.crearMes);
router.put('/meses/:id',               ctrl.actualizarMes);
router.patch('/meses/:id/estado',      ctrl.cambiarEstadoMes);

// ── Beneficios ─────────────────────────────────────────────────
router.get('/beneficios',              ctrl.getBeneficios);
router.post('/beneficios',             ctrl.crearBeneficio);
router.get('/beneficios/:id',          ctrl.getBeneficioById);
router.put('/beneficios/:id',          ctrl.actualizarBeneficio);
router.patch('/beneficios/:id/estado', ctrl.cambiarEstadoBeneficio);

// ── Compatibilidades ───────────────────────────────────────────
router.get('/beneficios/:id/compatibilidades',  ctrl.getCompatibilidades);
router.put('/beneficios/:id/compatibilidades',  ctrl.actualizarCompatibilidades);

// ── Simulador ──────────────────────────────────────────────────
router.post('/simular',                ctrl.simularPension);

// ── Configuración financiera ───────────────────────────────────
router.get('/financiera',              ctrl.getConfigFinanciera);
router.put('/financiera',              ctrl.actualizarConfigFinanciera);

module.exports = router;
