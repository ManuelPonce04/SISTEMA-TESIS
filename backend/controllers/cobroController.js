const cobroService = require('../services/cobroService');
const db = require('../config/db');

exports.getMetodosPago = async (req, res) => {
  try {
    const [metodos] = await db.query('SELECT * FROM metodos_pago WHERE activo = 1 ORDER BY orden ASC');
    res.json({ success: true, metodos });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener métodos de pago', error: error.message });
  }
};

exports.buscarEstudiantesParaCobro = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json({ success: true, resultados: [] });
    
    const searchTerm = `%${q}%`;
    const [estudiantes] = await db.query(`
      SELECT e.id as estudiante_id, e.nombres, e.apellidos, e.identificacion, e.codigo_interno,
             m.id as matricula_id, m.estado as estado_matricula, c.nombre as curso, p.nombre as paralelo,
             rep.nombres as rep_nombres, rep.apellidos as rep_apellidos
      FROM estudiantes e
      JOIN matriculas m ON e.id = m.estudiante_id
      JOIN cursos c ON m.curso_id = c.id
      JOIN paralelos p ON m.paralelo_id = p.id
      LEFT JOIN estudiantes_representantes er ON e.id = er.estudiante_id AND er.es_principal = 1
      LEFT JOIN representantes rep ON er.representante_id = rep.id
      WHERE (e.nombres LIKE ? OR e.apellidos LIKE ? OR e.identificacion LIKE ? OR e.codigo_interno LIKE ?)
        AND m.estado != 'ANULADA'
      ORDER BY m.fecha_matricula DESC
      LIMIT 10
    `, [searchTerm, searchTerm, searchTerm, searchTerm]);

    // Opcional: Podríamos adjuntar saldo pendiente sumando desde obligaciones_pension,
    // pero por rendimiento lo dejamos como segunda consulta al hacer clic.

    res.json({ success: true, resultados: estudiantes });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error en búsqueda', error: error.message });
  }
};

exports.getObligacionesCobrables = async (req, res) => {
  try {
    const { matriculaId } = req.params;
    
    // Solo traer pendientes, parciales o vencidas (ni pagadas, ni anuladas, ni exoneradas)
    const [obligaciones] = await db.query(`
      SELECT o.*, 
             mc.nombre_mostrar as mes_nombre, mc.orden as mes_orden
      FROM obligaciones_pension o
      JOIN meses_cobrables mc ON o.mes_cobrable_id = mc.id
      WHERE o.matricula_id = ? 
        AND o.estado IN ('PENDIENTE', 'PARCIAL', 'VENCIDA', 'CONVENIO')
      ORDER BY o.fecha_vencimiento ASC
    `, [matriculaId]);

    // Traer saldo a favor (Crédito Estudiante)
    const [creditos] = await db.query(`
      SELECT SUM(saldo_disponible) as saldo_a_favor
      FROM creditos_estudiante
      WHERE matricula_id = ? AND estado = 'ACTIVO'
    `, [matriculaId]);

    res.json({ 
      success: true, 
      obligaciones, 
      credito_disponible: creditos[0].saldo_a_favor || 0 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener deudas', error: error.message });
  }
};

exports.registrarCobro = async (req, res) => {
  try {
    const data = req.body;
    // req.user viene del middleware auth
    const usuarioId = req.user.id;
    
    if (!data.valor_recibido || parseFloat(data.valor_recibido) <= 0) {
      return res.status(400).json({ success: false, message: 'El valor recibido debe ser mayor a 0.' });
    }
    if (!data.aplicaciones || data.aplicaciones.length === 0) {
      return res.status(400).json({ success: false, message: 'No hay obligaciones seleccionadas para aplicar el pago.' });
    }
    if (!data.metodos || data.metodos.length === 0) {
      return res.status(400).json({ success: false, message: 'Debe especificar al menos un método de pago.' });
    }

    const resultado = await cobroService.registrarCobro(data, usuarioId);
    res.json(resultado);
  } catch (error) {
    console.error('Error en registrarCobro:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
