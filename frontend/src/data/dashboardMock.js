/**
 * dashboardMock.js
 * ─────────────────────────────────────────────────────────────────
 * Datos de ejemplo tipados para el dashboard SIGCOP-KPI.
 * UE Juan León Mera — Sistema de Cobranzas de Pensiones
 *
 * CÓMO CONECTAR AL BACKEND:
 * Cuando los endpoints estén disponibles, importar las funciones de
 * dashboardService.js en Dashboard.jsx y reemplazar las llamadas a
 * getMockData() por las llamadas reales. Los componentes no cambian.
 * ─────────────────────────────────────────────────────────────────
 */

// ── TIPOS DE PENSIÓN (catálogo del sistema) ──────────────────────
export const TIPOS_PENSION = [
  'Normal',
  'Diferenciada',
  'Diferenciada por hermanos',
  'Diferenciada por discapacidad',
  'Diferenciada por orfandad',
  'Beca 10%',
  'Beca 20%',
  'Beca 50%',
  'Beca artística',
  'Becado',
];

// ── NIVELES ACADÉMICOS ────────────────────────────────────────────
export const NIVELES = ['Inicial', 'EGB 1-7', 'EGB 8-10', 'Bach 1-2', 'Bach 3'];

// ── ALERTAS INTELIGENTES ─────────────────────────────────────────
// tipo: 'rojo' | 'amarillo' | 'verde' | 'azul'
export const mockAlertas = [
  {
    id: 'a1',
    tipo: 'rojo',
    titulo: '8 pensiones vencidas',
    mensaje: '8 pensiones llevan más de 30 días sin pago.',
    accion: 'Ver listado',
    estudiantes: [
      { id: 1, nombre: 'Mateo García', curso: '3° EGB A', diasMora: 45, saldo: 85.00 },
      { id: 2, nombre: 'Valeria Torres', curso: '7° EGB B', diasMora: 38, saldo: 92.50 },
      { id: 3, nombre: 'Sebastián Mora', curso: '1° BGU A', diasMora: 35, saldo: 110.00 },
      { id: 4, nombre: 'Isabella Vargas', curso: 'Inicial A', diasMora: 33, saldo: 60.00 },
      { id: 5, nombre: 'Santiago Ruiz', curso: '9° EGB A', diasMora: 31, saldo: 95.00 },
      { id: 6, nombre: 'Camila Flores', curso: '2° BGU B', diasMora: 30, saldo: 110.00 },
      { id: 7, nombre: 'Andrés López', curso: '5° EGB A', diasMora: 30, saldo: 85.00 },
      { id: 8, nombre: 'Daniela Reyes', curso: '8° EGB C', diasMora: 30, saldo: 95.00 },
    ],
  },
  {
    id: 'a2',
    tipo: 'amarillo',
    titulo: '15 vencen esta semana',
    mensaje: '15 pensiones vencen en los próximos 7 días.',
    accion: 'Ver listado',
    estudiantes: [
      { id: 9,  nombre: 'Sofía Castillo',   curso: '4° EGB A', diasRestantes: 2, monto: 85.00 },
      { id: 10, nombre: 'Lucas Herrera',    curso: '6° EGB B', diasRestantes: 3, monto: 85.00 },
      { id: 11, nombre: 'Emilia Sánchez',   curso: '3° BGU A', diasRestantes: 4, monto: 120.00 },
      { id: 12, nombre: 'Diego Romero',     curso: '10° EGB A', diasRestantes: 5, monto: 95.00 },
      { id: 13, nombre: 'Valentina Cruz',   curso: '1° BGU B', diasRestantes: 5, monto: 110.00 },
      { id: 14, nombre: 'Matías Ponce',     curso: 'Inicial B', diasRestantes: 6, monto: 60.00 },
      { id: 15, nombre: 'Gabriela Vega',    curso: '7° EGB A', diasRestantes: 7, monto: 85.00 },
    ],
  },
  {
    id: 'a3',
    tipo: 'verde',
    titulo: '82.4% tasa recaudación',
    mensaje: 'La meta del 80% se ha superado este mes.',
    accion: 'Ver detalle',
    estudiantes: [],
  },
  {
    id: 'a4',
    tipo: 'azul',
    titulo: '247 estudiantes activos',
    mensaje: '247 estudiantes matriculados en el período actual.',
    accion: 'Ver estudiantes',
    estudiantes: [],
  },
];

// ── KPIs PRINCIPALES ─────────────────────────────────────────────
/**
 * Fórmulas:
 * - Tasa de morosidad = estudiantes con saldo > 0 / total matriculados * 100
 * - Tasa de recaudación = total cobrado / total facturado * 100
 * - Cartera vencida = suma de saldos de pensiones con fecha_vencimiento < hoy
 * - Días promedio de atraso = promedio(fecha_cobro - fecha_vencimiento) para pagos atrasados
 */
export const mockKpis = {
  totalEstudiantes: {
    valor: 247,
    // Sparkline: últimos 6 meses de matrícula acumulada
    sparkline: [210, 218, 225, 229, 238, 247],
    variacion: 3.8,          // % vs mes anterior
    subtitulo: '+9 nuevos este mes',
    tipo: 'estudiantes',
    color: 'celeste',
  },
  totalRecaudado: {
    valor: 18_420.50,
    sparkline: [14200, 15800, 16900, 17100, 16400, 18420.5],
    variacion: 12.3,
    subtitulo: 'Ingresos del período',
    tipo: 'recaudado',
    color: 'verde',
    prefix: '$',
  },
  carteraVencida: {
    valor: 3_892.00,
    sparkline: [5100, 4800, 4200, 4500, 3990, 3892],
    variacion: -2.5,         // negativo = la cartera bajó (bueno)
    subtitulo: '42 pensiones pendientes',
    tipo: 'pendiente',
    color: 'rojo',
    prefix: '$',
  },
  tasaMorosidad: {
    // Fórmula: 38 estudiantes con saldo > 0 / 247 total * 100 ≈ 15.4%
    valor: 15.4,
    sparkline: [19.2, 18.1, 17.3, 16.9, 16.0, 15.4],
    variacion: -3.8,
    subtitulo: '38 estudiantes en mora',
    tipo: 'morosos',
    color: 'naranja',
    suffix: '%',
  },
  tasaRecaudacion: {
    // Fórmula: $18,420.50 cobrado / $22,312.50 facturado * 100 ≈ 82.6%
    valor: 82.6,
    sparkline: [74.1, 76.5, 79.2, 81.0, 80.8, 82.6],
    variacion: 2.2,
    subtitulo: 'Meta: 80% ✓ Superada',
    tipo: 'recaudacion',
    color: 'verde',
    suffix: '%',
  },
  diasPromedioAtraso: {
    // Fórmula: promedio(días entre fecha_vencimiento y fecha_cobro) para cobros tardíos
    valor: 12.3,
    sparkline: [18.5, 16.2, 15.0, 14.1, 13.8, 12.3],
    variacion: -10.9,
    subtitulo: 'Días promedio de mora',
    tipo: 'atraso',
    color: 'amarillo',
    suffix: ' días',
  },
};

// ── TENDENCIA DE RECAUDACIÓN MENSUAL (vs Meta) ───────────────────
// Endpoint real: GET /api/dashboard/monthly-collections
export const mockRevenueTrend = [
  { mes: 'Ago',  recaudado: 12_450, meta: 18_000 },
  { mes: 'Sep',  recaudado: 15_800, meta: 18_000 },
  { mes: 'Oct',  recaudado: 14_200, meta: 18_500 },
  { mes: 'Nov',  recaudado: 16_900, meta: 18_500 },
  { mes: 'Dic',  recaudado: 11_300, meta: 15_000 }, // Vacaciones
  { mes: 'Ene',  recaudado: 17_100, meta: 18_500 },
  { mes: 'Feb',  recaudado: 16_400, meta: 18_500 },
  { mes: 'Mar',  recaudado: 17_800, meta: 19_000 },
  { mes: 'Abr',  recaudado: 16_950, meta: 19_000 },
  { mes: 'May',  recaudado: 18_100, meta: 19_000 },
  { mes: 'Jun',  recaudado: 17_600, meta: 19_000 },
  { mes: 'Jul',  recaudado: 18_420, meta: 19_000 },
];

// ── CARTERA VENCIDA POR NIVEL ACADÉMICO ──────────────────────────
// Endpoint real: GET /api/dashboard/arrears-by-level
export const mockArrearsByLevel = [
  { nivel: 'Inicial',   pagado: 3_240,  pendiente: 420  },
  { nivel: 'EGB 1-7',   pagado: 52_100, pendiente: 1_820 },
  { nivel: 'EGB 8-10',  pagado: 28_400, pendiente: 890  },
  { nivel: 'Bach 1-2',  pagado: 35_600, pendiente: 540  },
  { nivel: 'Bach 3',    pagado: 19_200, pendiente: 222  },
];

// ── DISTRIBUCIÓN POR TIPO DE PENSIÓN ────────────────────────────
// Endpoint real: GET /api/dashboard/pension-type-distribution
// Impacto: muestra qué porción del ingreso potencial se reduce por becas
export const mockPensionTypeData = [
  { tipo: 'Normal',              cantidad: 98,  color: '#27A9E1', monto: 9_310  },
  { tipo: 'Diferenciada',        cantidad: 42,  color: '#3B82F6', monto: 3_276  },
  { tipo: 'Dif. Hermanos',       cantidad: 28,  color: '#8B5CF6', monto: 1_960  },
  { tipo: 'Beca 10%',            cantidad: 18,  color: '#F4C542', monto: 1_377  },
  { tipo: 'Beca 20%',            cantidad: 22,  color: '#F59E0B', monto: 1_496  },
  { tipo: 'Beca 50%',            cantidad: 15,  color: '#EF4444', monto: 637.5  },
  { tipo: 'Beca artística',      cantidad: 12,  color: '#10B981', monto: 510    },
  { tipo: 'Dif. Discapacidad',   cantidad: 8,   color: '#06B6D4', monto: 480    },
  { tipo: 'Dif. Orfandad',       cantidad: 4,   color: '#EC4899', monto: 200    },
];

// ── RANKING CURSOS CON MAYOR MOROSIDAD ───────────────────────────
// Endpoint real: GET /api/dashboard/top-arrears-courses
// Fórmula: índice_morosidad_curso = alumnos_en_mora / total_alumnos_curso * 100
export const mockTopArrearsCourses = [
  { curso: '7° EGB "A"',    morosidad: 34.2, mora: 8,  total: 23 },
  { curso: '3° BGU "B"',    morosidad: 28.6, mora: 6,  total: 21 },
  { curso: '5° EGB "B"',    morosidad: 25.0, mora: 5,  total: 20 },
  { curso: '9° EGB "A"',    morosidad: 21.7, mora: 5,  total: 23 },
  { curso: 'Inicial "A"',   morosidad: 18.8, mora: 3,  total: 16 },
];

// ── ÚLTIMOS PAGOS REGISTRADOS ─────────────────────────────────────
// Endpoint real: GET /api/dashboard/recent-payments
export const mockRecentPayments = [
  { id: 1,  fecha: '10/07/2026', estudiante: 'Ana Torres',        curso: '4° EGB A', mes: 'Julio',  valor: 85.00, metodo: 'Efectivo', usuario: 'M. López',    estado: 'Pagado' },
  { id: 2,  fecha: '10/07/2026', estudiante: 'Pedro Ramírez',     curso: '2° BGU B', mes: 'Julio',  valor: 110.00, metodo: 'Transferencia', usuario: 'M. López', estado: 'Pagado' },
  { id: 3,  fecha: '09/07/2026', estudiante: 'Lucía Fernández',   curso: '1° BGU A', mes: 'Julio',  valor: 55.00, metodo: 'Efectivo', usuario: 'R. Vega',     estado: 'Abono' },
  { id: 4,  fecha: '09/07/2026', estudiante: 'Carlos Mendoza',    curso: '8° EGB B', mes: 'Julio',  valor: 95.00, metodo: 'Efectivo', usuario: 'R. Vega',     estado: 'Pagado' },
  { id: 5,  fecha: '09/07/2026', estudiante: 'Sophia Aguilar',    curso: '6° EGB A', mes: 'Junio',  valor: 85.00, metodo: 'Cheque',   usuario: 'M. López',    estado: 'Pagado' },
  { id: 6,  fecha: '08/07/2026', estudiante: 'Emilio Castro',     curso: '3° EGB C', mes: 'Julio',  valor: 85.00, metodo: 'Efectivo', usuario: 'C. Torres',   estado: 'Pagado' },
  { id: 7,  fecha: '08/07/2026', estudiante: 'Daniela Ríos',      curso: '10° EGB A', mes: 'Julio', valor: 95.00, metodo: 'Transferencia', usuario: 'C. Torres', estado: 'Pagado' },
  { id: 8,  fecha: '07/07/2026', estudiante: 'Martín Suárez',     curso: 'Inicial B', mes: 'Julio', valor: 30.00, metodo: 'Efectivo', usuario: 'M. López',    estado: 'Abono' },
  { id: 9,  fecha: '07/07/2026', estudiante: 'Valeria Herrera',   curso: '5° EGB A', mes: 'Julio',  valor: 85.00, metodo: 'Efectivo', usuario: 'R. Vega',     estado: 'Pagado' },
  { id: 10, fecha: '07/07/2026', estudiante: 'Diego Pacheco',     curso: '2° BGU A', mes: 'Mayo',   valor: 110.00, metodo: 'Efectivo', usuario: 'C. Torres',  estado: 'Pagado' },
  { id: 11, fecha: '06/07/2026', estudiante: 'Camila Vásquez',    curso: '1° EGB A', mes: 'Julio',  valor: 85.00, metodo: 'Efectivo', usuario: 'M. López',    estado: 'Pagado' },
  { id: 12, fecha: '06/07/2026', estudiante: 'Sebastián Mena',    curso: '7° EGB B', mes: 'Julio',  valor: 85.00, metodo: 'Transferencia', usuario: 'R. Vega', estado: 'Pagado' },
  { id: 13, fecha: '05/07/2026', estudiante: 'Isabella Proaño',   curso: '3° BGU A', mes: 'Junio',  valor: 120.00, metodo: 'Cheque',  usuario: 'C. Torres',   estado: 'Pagado' },
  { id: 14, fecha: '05/07/2026', estudiante: 'Andrés Villacís',   curso: '9° EGB B', mes: 'Julio',  valor: 95.00, metodo: 'Efectivo', usuario: 'M. López',    estado: 'Pagado' },
  { id: 15, fecha: '04/07/2026', estudiante: 'Gabriela Ortega',   curso: '6° EGB C', mes: 'Junio',  valor: 85.00, metodo: 'Efectivo', usuario: 'R. Vega',     estado: 'Pagado' },
];

// ── PRÓXIMOS VENCIMIENTOS (≤7 días) ──────────────────────────────
// Endpoint real: GET /api/dashboard/upcoming-dues
export const mockUpcomingDues = [
  { id: 1,  estudiante: 'Sofía Castillo',   curso: '4° EGB A',  diasRestantes: 1, monto: 85.00,  telefono: '0987654321' },
  { id: 2,  estudiante: 'Lucas Herrera',    curso: '6° EGB B',  diasRestantes: 2, monto: 85.00,  telefono: '0976543210' },
  { id: 3,  estudiante: 'Emilia Sánchez',   curso: '3° BGU A',  diasRestantes: 2, monto: 120.00, telefono: '0965432109' },
  { id: 4,  estudiante: 'Diego Romero',     curso: '10° EGB A', diasRestantes: 4, monto: 95.00,  telefono: '0954321098' },
  { id: 5,  estudiante: 'Valentina Cruz',   curso: '1° BGU B',  diasRestantes: 5, monto: 110.00, telefono: '0943210987' },
  { id: 6,  estudiante: 'Matías Ponce',     curso: 'Inicial B', diasRestantes: 6, monto: 60.00,  telefono: '0932109876' },
  { id: 7,  estudiante: 'Gabriela Vega',    curso: '7° EGB A',  diasRestantes: 7, monto: 85.00,  telefono: '0921098765' },
];

// ── FILTROS DISPONIBLES ──────────────────────────────────────────
export const FILTROS_DEFAULT = {
  anio: '2026-2027',
  curso: 'Todos',
  paralelo: 'Todos',
  mes: 'Julio',
  estado: 'Todos',
  tipoBeca: 'Todos',
  periodo: 'mes_actual', // 'mes_actual' | 'mes_anterior' | 'anio_lectivo'
};

export const MESES_LECTIVOS = [
  'Todos', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio',
];

export const CURSOS_DISPONIBLES = [
  'Todos', 'Inicial', '1° EGB', '2° EGB', '3° EGB', '4° EGB', '5° EGB',
  '6° EGB', '7° EGB', '8° EGB', '9° EGB', '10° EGB',
  '1° BGU', '2° BGU', '3° BGU',
];
