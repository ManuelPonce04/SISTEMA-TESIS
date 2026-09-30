const express = require('express');
const router = express.Router();
const sueldosAnticiposController = require('../controllers/sueldosAnticiposController');
const { verifyJWT } = require('../middleware/authMiddleware');

router.use(verifyJWT);

// Obtener resumen mensual (con tarjetas calculadas y lista paginada)
router.get('/', sueldosAnticiposController.getResumenMensual);

// Obtener detalle de un trabajador en un mes (sueldo, ajustes, y anticipos listados)
router.get('/:personalId', sueldosAnticiposController.getDetalleTrabajador);

// Guardar ajustes mensuales (horas extras, etc)
router.put('/:personalId/ajustes', sueldosAnticiposController.upsertAjustesMensuales);

// Registrar un anticipo (transaccional con movimientos_financieros)
router.post('/:personalId/anticipo', sueldosAnticiposController.registrarAnticipo);

module.exports = router;
