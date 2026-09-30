const router = require('express').Router();
const ctrl = require('../controllers/asignacionPensionController');
const { verifyJWT } = require('../middleware/authMiddleware');

// Todas las rutas requieren autenticación
router.use(verifyJWT);

// ── Consultas auxiliares ──────────────────────────────────────
router.get('/matriculas-disponibles',                 ctrl.getMatriculasDisponibles);
router.get('/matricula/:matriculaId/resumen',          ctrl.getResumenMatricula);
router.get('/matricula/:matriculaId/sugerencias',      ctrl.getSugerencias);
router.post('/simular',                               ctrl.simularPension);
router.get('/pendientes',                             ctrl.getPendientes);
router.get('/kpi',                                    ctrl.getResumenKPI);
router.get('/exportar',                               ctrl.exportarAsignaciones);

// ── Asignación masiva ─────────────────────────────────────────
router.post('/asignacion-masiva',                     ctrl.asignacionMasiva);

// ── CRUD principal ────────────────────────────────────────────
router.get('/',                                       ctrl.getAsignaciones);
router.post('/',                                      ctrl.crearAsignacion);
router.get('/:id',                                    ctrl.getAsignacionById);
router.put('/:id',                                    ctrl.actualizarBorrador);

// ── Transiciones de estado ────────────────────────────────────
router.patch('/:id/enviar-aprobacion',                ctrl.enviarAprobacion);
router.patch('/:id/aprobar',                          ctrl.aprobarAsignacion);
router.patch('/:id/rechazar',                         ctrl.rechazarAsignacion);
router.patch('/:id/activar',                          ctrl.activarAsignacion);
router.patch('/:id/suspender',                        ctrl.suspenderAsignacion);
router.patch('/:id/anular',                           ctrl.anularAsignacion);
router.post('/:id/nueva-vigencia',                    ctrl.crearNuevaVigencia);

// ── Beneficios ────────────────────────────────────────────────
router.get('/:id/beneficios',                         ctrl.getBeneficios);
router.post('/:id/beneficios',                        ctrl.addBeneficio);
router.delete('/:id/beneficios/:beneficioId',         ctrl.deleteBeneficio);

// ── Documentos ────────────────────────────────────────────────
router.get('/:id/documentos',                         ctrl.getDocumentos);
router.post('/:id/documentos',                        ctrl.subirDocumento);
router.get('/:id/documentos/:documentoId',            ctrl.descargarDocumento);
router.delete('/:id/documentos/:documentoId',         ctrl.eliminarDocumento);

module.exports = router;
