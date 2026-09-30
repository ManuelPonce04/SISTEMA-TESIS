const db = require('../config/db');

// GET /api/auxiliares/cursos
exports.getCursos = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM cursos WHERE estado = "Activo" ORDER BY id_curso ASC');
    res.json({ success: true, cursos: rows });
  } catch (error) {
    console.error('Error al obtener cursos:', error);
    res.status(500).json({ success: false, message: 'Error de servidor' });
  }
};

// GET /api/auxiliares/paralelos
exports.getParalelos = async (req, res) => {
  try {
    // Para simplificar, devolvemos paralelos fijos. En un sistema real podría venir de la BD.
    const paralelos = [
      { id: 'A', nombre: 'Paralelo A' },
      { id: 'B', nombre: 'Paralelo B' },
      { id: 'C', nombre: 'Paralelo C' }
    ];
    res.json({ success: true, paralelos });
  } catch (error) {
    console.error('Error al obtener paralelos:', error);
    res.status(500).json({ success: false, message: 'Error de servidor' });
  }
};

// GET /api/auxiliares/anios-lectivos
exports.getAniosLectivos = async (req, res) => {
  try {
    const anios = [
      { id: '2025-2026', nombre: 'Período 2025-2026' },
      { id: '2026-2027', nombre: 'Período 2026-2027', actual: true },
      { id: '2027-2028', nombre: 'Período 2027-2028' }
    ];
    res.json({ success: true, anios });
  } catch (error) {
    console.error('Error al obtener años lectivos:', error);
    res.status(500).json({ success: false, message: 'Error de servidor' });
  }
};

// GET /api/auxiliares/config-pensiones
exports.getConfigPensiones = async (req, res) => {
  try {
    // Aquí se consultaría a una tabla de configuración según curso y año lectivo.
    // Para el caso de estudio, devolvemos una configuración base.
    const { id_curso, anio_lectivo } = req.query;
    
    // Valor base sugerido
    let valorMensual = 60.00;
    
    // Generar meses sugeridos
    const mesesSugeridos = [
      { mes: 'Mayo',       fecha_vencimiento_base: '-05-15' },
      { mes: 'Junio',      fecha_vencimiento_base: '-06-15' },
      { mes: 'Julio',      fecha_vencimiento_base: '-07-15' },
      { mes: 'Agosto',     fecha_vencimiento_base: '-08-15' },
      { mes: 'Septiembre', fecha_vencimiento_base: '-09-15' },
      { mes: 'Octubre',    fecha_vencimiento_base: '-10-15' },
      { mes: 'Noviembre',  fecha_vencimiento_base: '-11-15' },
      { mes: 'Diciembre',  fecha_vencimiento_base: '-12-15' },
      { mes: 'Enero',      fecha_vencimiento_base: '-01-15' }, // del año siguiente
      { mes: 'Febrero',    fecha_vencimiento_base: '-02-15' }  // del año siguiente
    ];

    res.json({ 
      success: true, 
      config: {
        valor_mensual: valorMensual,
        meses_sugeridos: mesesSugeridos
      }
    });
  } catch (error) {
    console.error('Error al obtener config pensión:', error);
    res.status(500).json({ success: false, message: 'Error de servidor' });
  }
};
