const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/cobrarPensionesController');
const { verifyJWT } = require('../middleware/authMiddleware');

// Todas las rutas requieren autenticacion JWT
router.use(verifyJWT);

// Busqueda de estudiantes matriculados
router.get('/buscar', ctrl.buscarEstudiantes);

// Configuracion de tarifas (admin: validado en controller)
router.get('/config',  ctrl.getConfig);
router.post('/config', ctrl.upsertConfig);

// Consulta de cuota por mes (ruta fija ANTES de :estudiante_id)
router.get('/cuotas/mes',            ctrl.getCuotaMes);
router.get('/cuotas/:estudiante_id', ctrl.getCuotasEstudiante);

// Cobro transaccional
router.post('/cobrar', ctrl.registrarCobro);

// Listado de cobros recientes
router.get('/cobros-recientes', ctrl.getCobrosRecientes);

// Anular pago
router.patch('/pagos/:id/anular', ctrl.anularPago);

// Totales del dia
router.get('/totales-dia', ctrl.getTotalesDia);

// Reporte de morosos
router.get('/morosos', ctrl.getMorosos);

// Datos de recibo para impresion
router.get('/recibo/:pago_id', ctrl.getRecibo);

module.exports = router;
