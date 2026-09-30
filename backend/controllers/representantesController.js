const representanteModel = require('../models/representanteModel');

/**
 * GET /api/representantes
 */
const getRepresentantes = async (req, res) => {
  try {
    const { search = '', page = 1, limit = 20 } = req.query;
    const result = await representanteModel.getAll(search, page, limit);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Error fetching representantes:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

/**
 * GET /api/representantes/buscar/:cedula
 */
const getRepresentanteByCedula = async (req, res) => {
  try {
    const { cedula } = req.params;
    const representante = await representanteModel.getByCedula(cedula);
    if (!representante) {
      return res.status(404).json({ success: false, message: 'Representante no encontrado' });
    }
    res.json({ success: true, data: representante });
  } catch (error) {
    console.error('Error fetching representante:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

/**
 * POST /api/representantes
 */
const createRepresentante = async (req, res) => {
  try {
    const data = req.body;

    // Verificar si ya existe un representante con esta cédula (solo si tiene cédula)
    if (data.cedula) {
      const existing = await representanteModel.getByCedula(data.cedula);
      if (existing) {
        return res.status(400).json({ success: false, message: 'Ya existe un representante con esa cédula' });
      }
    }

    const newId = await representanteModel.create(data);
    res.status(201).json({ success: true, message: 'Representante creado exitosamente', id: newId });
  } catch (error) {
    console.error('Error creating representante:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

/**
 * PUT /api/representantes/:id
 */
const updateRepresentante = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    // Si intenta cambiar la cédula, verificar que no le pertenezca a otro
    if (data.cedula) {
      const existing = await representanteModel.getByCedula(data.cedula);
      if (existing && existing.id_representante !== parseInt(id)) {
        return res.status(400).json({ success: false, message: 'La cédula ya está registrada a nombre de otro representante' });
      }
    }

    await representanteModel.update(id, data);
    res.json({ success: true, message: 'Representante actualizado exitosamente' });
  } catch (error) {
    console.error('Error updating representante:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

module.exports = {
  getRepresentantes,
  getRepresentanteByCedula,
  createRepresentante,
  updateRepresentante
};
