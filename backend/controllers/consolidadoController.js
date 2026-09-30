/**
 * ============================================================
 * Controller: Consolidado Financiero
 * ============================================================
 */
const consolidadoService = require('../services/consolidadoService');

const getResumenGeneral = async (req, res) => {
  try {
    const data = await consolidadoService.getResumenGeneral(req.query);
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error getResumenGeneral:', error);
    res.status(500).json({ success: false, message: 'Error al obtener el resumen.' });
  }
};

const getConsolidadoMensual = async (req, res) => {
  try {
    const data = await consolidadoService.getConsolidadoMensual(req.query);
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error getConsolidadoMensual:', error);
    res.status(500).json({ success: false, message: 'Error al obtener la matriz mensual.' });
  }
};

const getSaldosCuentas = async (req, res) => {
  try {
    const data = await consolidadoService.getSaldosCuentas(req.query);
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error getSaldosCuentas:', error);
    res.status(500).json({ success: false, message: 'Error al obtener saldos de cuentas.' });
  }
};

const getMejorasPlantel = async (req, res) => {
  try {
    const data = await consolidadoService.getMejorasPlantel(req.query);
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error getMejorasPlantel:', error);
    res.status(500).json({ success: false, message: 'Error al obtener las mejoras.' });
  }
};

module.exports = {
  getResumenGeneral,
  getConsolidadoMensual,
  getSaldosCuentas,
  getMejorasPlantel
};
