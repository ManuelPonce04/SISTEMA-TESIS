const express = require('express');
const router = express.Router();
const { verifyJWT } = require('../middleware/authMiddleware');
const {
  getRepresentantes,
  getRepresentanteByCedula,
  createRepresentante,
  updateRepresentante
} = require('../controllers/representantesController');

// All routes require authentication
router.use(verifyJWT);

// Representantes CRUD routes
router.get('/', getRepresentantes);
router.get('/buscar/:cedula', getRepresentanteByCedula);
router.post('/', createRepresentante);
router.put('/:id', updateRepresentante);

module.exports = router;
