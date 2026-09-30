const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const { verifyJWT: protect } = require('../middleware/authMiddleware');
const validate = require('../middleware/validateMiddleware');
const {
  getMensualidades,
  getMensualidadById,
  getKPIs,
  generarMensualidadIndividual,
  registrarAjuste,
  anular,
  getMesesDisponibles
} = require('../controllers/mensualidadController');

// Todas las rutas están protegidas
router.use(protect);

router.get('/', getMensualidades);
router.get('/kpis', getKPIs);

router.get('/matricula/:matriculaId/meses-disponibles', getMesesDisponibles);

router.post('/generar', [
  check('matricula_id').isInt().withMessage('ID de matrícula es requerido'),
  check('mes_cobrable_id').isInt().withMessage('ID de mes es requerido')
], validate, generarMensualidadIndividual);

// Rutas con ID específico
router.get('/:id', getMensualidadById);

router.post('/:id/ajustes', [
  check('tipo').notEmpty().withMessage('Tipo es requerido'),
  check('valor').isFloat({ min: 0.01 }).withMessage('Valor debe ser mayor a 0'),
  check('signo').isIn(['SUMA', 'RESTA']).withMessage('Signo inválido'),
  check('motivo').notEmpty().withMessage('Motivo es requerido')
], validate, registrarAjuste);

router.patch('/:id/anular', [
  check('motivo').notEmpty().withMessage('El motivo es obligatorio para anular')
], validate, anular);

module.exports = router;
