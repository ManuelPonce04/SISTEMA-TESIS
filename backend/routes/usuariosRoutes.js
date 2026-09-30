const express = require('express');
const router = express.Router();
const { getUsuarios, createUsuario, updatePerfil } = require('../controllers/usuariosController');
const { verifyJWT } = require('../middleware/authMiddleware');
const { checkAdmin } = require('../middleware/adminMiddleware');

// All routes require authentication
router.use(verifyJWT);

// Perfil (Cualquier usuario autenticado)
router.put('/perfil', updatePerfil);

// Gestión de Usuarios (Solo Admin)
router.get('/', checkAdmin, getUsuarios);
router.post('/', checkAdmin, createUsuario);

module.exports = router;
