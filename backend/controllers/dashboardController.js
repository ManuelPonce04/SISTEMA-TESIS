/**
 * Dashboard Controller — SIGCOP-KPI
 * Endpoints especializados para cargar las distintas secciones del dashboard.
 */

const pool = require('../config/db');

const getSummary = async (req, res) => {
  try {
    const kpis = {
      totalEstudiantes: 542,
      nuevosEstudiantesMes: 12,
      totalRecaudado: 45830.00,
      porcentajeRecaudacionMesAnterior: 8.5,
      totalPendiente: 7420.00,
      pensionesPendientesCount: 85,
      indiceMorosidad: 8,
      morososCount: 48,
    };
    
    const kpiIndicadores = {
      cobrosDelDia: 420.00,
      cobrosDelMes: 5800.00,
      estudiantesAlDia: 490,
      pensionesVencidas: 36,
      cursoMayorRecaudacion: '3.º Bachillerato',
      cursoMayorMorosidad: '7.º EGB',
    };

    return res.status(200).json({ success: true, kpis, kpiIndicadores });
  } catch (error) {
    console.error('Error getSummary:', error);
    return res.status(500).json({ success: false, message: 'Error' });
  }
};

const getMonthlyCollections = async (req, res) => {
  try {
    const cobrosMensuales = [
      { mes: 'Mayo', total: 3200 },
      { mes: 'Junio', total: 4100 },
      { mes: 'Julio', total: 5800 },
      { mes: 'Agosto', total: 3900 },
      { mes: 'Septiembre', total: 6200 },
      { mes: 'Octubre', total: 5100 },
      { mes: 'Noviembre', total: 4820 },
      { mes: 'Diciembre', total: 3600 },
      { mes: 'Enero', total: 4400 },
      { mes: 'Febrero', total: 2900 },
    ];
    return res.status(200).json({ success: true, cobrosMensuales });
  } catch (error) {
    console.error('Error getMonthlyCollections:', error);
    return res.status(500).json({ success: false, message: 'Error' });
  }
};

const getCourseCollections = async (req, res) => {
  try {
    const cobrosPorCurso = [
      { nombre: 'Inicial', valor: 15.5, color: '#00AEEF' },
      { nombre: 'Educación General Básica', valor: 55.2, color: '#10B981' },
      { nombre: 'Bachillerato', valor: 29.3, color: '#F59E0B' },
    ];
    return res.status(200).json({ success: true, cobrosPorCurso });
  } catch (error) {
    console.error('Error getCourseCollections:', error);
    return res.status(500).json({ success: false, message: 'Error' });
  }
};

const getRecentPayments = async (req, res) => {
  try {
    const ultimosPagos = [
      { id: 1, fecha: '08/07/2026', estudiante: 'Juan Pérez', curso: '5.º EGB A', mes: 'Julio', valor: 60.00, metodo: 'Efectivo', usuario: 'María López', estado: 'Pagado' },
      { id: 2, fecha: '08/07/2026', estudiante: 'Ana Vera', curso: '3.º EGB B', mes: 'Junio', valor: 60.00, metodo: 'Transferencia', usuario: 'Carlos Zambrano', estado: 'Pagado' },
      { id: 3, fecha: '07/07/2026', estudiante: 'Luis Mendoza', curso: '1.º Bachillerato A', mes: 'Mayo', valor: 70.00, metodo: 'Efectivo', usuario: 'María López', estado: 'Pagado' },
      { id: 4, fecha: '06/07/2026', estudiante: 'María Guamán', curso: '2.º Bachillerato', mes: 'Junio', valor: 70.00, metodo: 'Tarjeta', usuario: 'María López', estado: 'Pagado' },
      { id: 5, fecha: '06/07/2026', estudiante: 'Pedro Alvarado', curso: '8.º EGB', mes: 'Julio', valor: 65.00, metodo: 'Efectivo', usuario: 'Carlos Zambrano', estado: 'Pagado' },
    ];
    return res.status(200).json({ success: true, ultimosPagos });
  } catch (error) {
    console.error('Error getRecentPayments:', error);
    return res.status(500).json({ success: false, message: 'Error' });
  }
};

const getUpcomingPayments = async (req, res) => {
  try {
    const pensionesVencer = [
      { id: 1, estudiante: 'Pedro Alvarado', curso: '8.º EGB', mes: 'Julio', vence: '15/07/2026', valor: 65.00, diasRestantes: 6, estado: 'Por vencer' },
      { id: 2, estudiante: 'María Gutiérrez', curso: '5.º EGB A', mes: 'Julio', vence: '09/07/2026', valor: 60.00, diasRestantes: 0, estado: 'Vence hoy' },
      { id: 3, estudiante: 'Luis Sánchez', curso: '3.º Bachillerato', mes: 'Junio', vence: '01/07/2026', valor: 70.00, diasRestantes: -8, estado: 'Vencida' },
      { id: 4, estudiante: 'Camila Flores', curso: '2.º EGB', mes: 'Julio', vence: '20/07/2026', valor: 60.00, diasRestantes: 11, estado: 'Por vencer' },
      { id: 5, estudiante: 'Roberto Vega', curso: '1.º Bachillerato', mes: 'Mayo', vence: '15/05/2026', valor: 70.00, diasRestantes: -55, estado: 'Vencida' },
    ];
    return res.status(200).json({ success: true, pensionesVencer });
  } catch (error) {
    console.error('Error getUpcomingPayments:', error);
    return res.status(500).json({ success: false, message: 'Error' });
  }
};

const getTopDebtors = async (req, res) => {
  try {
    const rankingDeudores = [
      { posicion: 1, estudiante: 'Juan Pérez', curso: '8.º EGB A', representante: 'Carlos Pérez', telefono: '0999999999', deuda: 180.00, mesesPendientes: 3 },
      { posicion: 2, estudiante: 'Ana López', curso: '5.º EGB B', representante: 'María López', telefono: '0988888888', deuda: 120.00, mesesPendientes: 2 },
      { posicion: 3, estudiante: 'Luis Vera', curso: '2.º Bachillerato A', representante: 'Pedro Vera', telefono: '0977777777', deuda: 90.00, mesesPendientes: 1 },
      { posicion: 4, estudiante: 'Gabriela Ríos', curso: '9.º EGB', representante: 'Rosa Ríos', telefono: '0966666666', deuda: 65.00, mesesPendientes: 1 },
      { posicion: 5, estudiante: 'Marco Suárez', curso: '3.º Bachillerato', representante: 'José Suárez', telefono: '0955555555', deuda: 70.00, mesesPendientes: 1 },
    ];
    return res.status(200).json({ success: true, rankingDeudores });
  } catch (error) {
    console.error('Error getTopDebtors:', error);
    return res.status(500).json({ success: false, message: 'Error' });
  }
};

const getActivity = async (req, res) => {
  try {
    const eventos = [
      { id: 1, hora: '08:40', descripcion: 'María López registró un pago de Juan Pérez.', usuario: 'María López', accion: 'pago' },
      { id: 2, hora: '08:15', descripcion: 'Carlos Zambrano creó un nuevo usuario.', usuario: 'Carlos Zambrano', accion: 'usuario' },
      { id: 3, hora: '07:50', descripcion: 'Se matriculó a Ana López en 4.º EGB.', usuario: 'María López', accion: 'matricula' },
      { id: 4, hora: '07:35', descripcion: 'Se generó el reporte mensual de cobranzas.', usuario: 'María López', accion: 'reporte' },
    ];

    const alertas = [
      { tipo: 'rojo', mensaje: 'Existen 8 pensiones vencidas.' },
      { tipo: 'amarillo', mensaje: 'Hoy vencen 5 pensiones.' },
      { tipo: 'verde', mensaje: 'La cobranza mensual alcanzó el 92%.' },
      { tipo: 'azul', mensaje: 'Se registraron 18 pagos hoy.' },
    ];

    return res.status(200).json({ success: true, eventos, alertas });
  } catch (error) {
    console.error('Error getActivity:', error);
    return res.status(500).json({ success: false, message: 'Error' });
  }
};

const getGoals = async (req, res) => {
  try {
    const meta = {
      metaMes: 50000.00,
      recaudadoActual: 45830.00,
      pendienteMeta: 4170.00,
      porcentajeCumplimiento: 92,
      estadoVisual: 'Aceptable'
    };
    return res.status(200).json({ success: true, meta });
  } catch (error) {
    console.error('Error getGoals:', error);
    return res.status(500).json({ success: false, message: 'Error' });
  }
};

module.exports = {
  getSummary,
  getMonthlyCollections,
  getCourseCollections,
  getRecentPayments,
  getUpcomingPayments,
  getTopDebtors,
  getActivity,
  getGoals
};
