const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { login, verifyToken } = require('../controllers/authController');
const { verifyJWT } = require('../middleware/authMiddleware');

// Validaciones para el login
const loginValidation = [
  body('correo')
    .isEmail()
    .withMessage('Ingresa un correo electrónico válido')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('La contraseña es requerida')
    .isLength({ min: 6 })
    .withMessage('La contraseña debe tener al menos 6 caracteres'),
];

// POST /api/auth/login
router.post('/login', loginValidation, login);

// GET /api/auth/verify  (ruta protegida)
router.get('/verify', verifyJWT, verifyToken);

module.exports = router;
