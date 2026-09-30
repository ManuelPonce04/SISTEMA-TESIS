const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/facturacionController');
const { verifyJWT } = require('../middleware/authMiddleware');

// Todas las rutas requieren autenticación
router.use(verifyJWT);

// ── Configuración Institucional ──
router.get('/config', ctrl.getConfig);
router.put('/config', ctrl.updateConfig);

// ── Clientes de Facturación ──
router.get('/clientes', ctrl.getClientes);
router.get('/clientes/estudiante/:estudiante_id', ctrl.getClienteByEstudiante);
router.get('/clientes/:id', ctrl.getClienteById);
router.post('/clientes', ctrl.createCliente);
router.put('/clientes/:id', ctrl.updateCliente);

// ── Pagos Pendientes de Facturación ──
router.get('/estudiante/:estudiante_id/pagos-pendientes', ctrl.getPagosPendientesEstudiante);

// ── Emisión de Facturas ──
router.post('/emitir', ctrl.emitirFactura);

// ── Listado y Detalle de Facturas ──
router.get('/facturas', ctrl.getFacturas);
router.get('/facturas/:id', ctrl.getFacturaById);

// ── Anulación ──
router.patch('/facturas/:id/anular', ctrl.anularFactura);

// ── Cierre Diario y Comparativos ──
router.get('/cierre-diario', ctrl.getCierreFacturacion);

// ── Facturación Electrónica SRI (XML y Procesamiento) ──
router.get('/facturas/:id/xml', ctrl.descargarXmlFactura);
router.post('/facturas/:id/sri', ctrl.procesarSriFactura);

module.exports = router;
