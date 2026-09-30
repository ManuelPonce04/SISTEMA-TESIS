const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes      = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const estudiantesRoutes = require('./routes/estudiantesRoutes');
const representantesRoutes = require('./routes/representantesRoutes');
const matriculasRoutes  = require('./routes/matriculasRoutes');

const usuariosRoutes    = require('./routes/usuariosRoutes');
const auxiliaresRoutes  = require('./routes/auxiliaresRoutes');
const catalogoMovimientosRoutes = require('./routes/catalogoMovimientosRoutes');
const cuentasFinancierasRoutes  = require('./routes/cuentasFinancierasRoutes');
const movimientosFinancierosRoutes = require('./routes/movimientosFinancierosRoutes');
const personalRoutes = require('./routes/personalRoutes');
const sueldosAnticiposRoutes = require('./routes/sueldosAnticiposRoutes');
const nominaRoutes = require('./routes/nominaRoutes');
const consolidadoRoutes = require('./routes/consolidadoRoutes');
const academicoRoutes = require('./routes/academicoRoutes');
const matriculaRoutes  = require('./routes/matriculaRoutes');
const cobrarPensionesRoutes = require('./routes/cobrarPensionesRoutes');
const facturacionRoutes = require('./routes/facturacionRoutes');

const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// ── Middlewares globales ──────────────────────────────────────
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (
      allowedOrigins.includes(origin) ||
      origin.endsWith('.vercel.app') ||
      origin.endsWith('.onrender.com')
    ) {
      return callback(null, true);
    }
    // Permitir cualquier origen en caso de entornos de prueba / demo
    return callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Rutas API ─────────────────────────────────────────────────
app.use('/api/auth',        authRoutes);
app.use('/api/dashboard',   dashboardRoutes);
app.use('/api/estudiantes', estudiantesRoutes);
app.use('/api/representantes', representantesRoutes);
app.use('/api/matriculas',  matriculasRoutes);

app.use('/api/usuarios',    usuariosRoutes);
app.use('/api/auxiliares',  auxiliaresRoutes);
app.use('/api/catalogos/movimientos',       catalogoMovimientosRoutes);
app.use('/api/catalogos/cuentas-financieras', cuentasFinancierasRoutes);
app.use('/api/finanzas/movimientos', movimientosFinancierosRoutes);
app.use('/api/personal', personalRoutes);
app.use('/api/finanzas/sueldos-anticipos', sueldosAnticiposRoutes);
app.use('/api/finanzas/nominas', nominaRoutes);
app.use('/api/finanzas/consolidado', consolidadoRoutes);
app.use('/api/academico', academicoRoutes);
app.use('/api/matricula',  matriculaRoutes);
app.use('/api/control-financiero/pensiones', cobrarPensionesRoutes);
app.use('/api/control-financiero/facturacion', facturacionRoutes);


// Servir archivos subidos (uploads) estáticamente
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/api/control-financiero/facturacion/migrar', async (req, res) => {
  try {
    const { runMigration } = require('./runDbUpdateFacturacion');
    const result = await runMigration();
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/run-migrations', (req, res) => {
  const { exec } = require('child_process');
  exec('node scripts/migrate_academico.js && node scripts/seed_academico.js', (err, stdout, stderr) => {
    res.json({ err: err ? err.message : null, stdout, stderr });
  });
});

app.get('/api/schema', async (req, res) => {
  try {
    const pool = require('./config/db'); // Assuming backend/config/db.js exists
    const [tables] = await pool.query('SHOW TABLES');
    let schema = {};
    for (let row of tables) {
      let tableName = Object.values(row)[0];
      if (/periodo|nivel|curso|paralelo|jornada|oferta|estudiante|institucion|factura|secuencial|cliente|pension/i.test(tableName)) {
        const [cols] = await pool.query(`DESCRIBE ${tableName}`);
        schema[tableName] = cols;
      }
    }
    res.json(schema);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/', (req, res) => {
  res.json({
    message: '🏫 Sistema de Cobranzas - UE Juan León Mera',
    version: '1.0.0',
    status: 'Running',
    timestamp: new Date().toISOString(),
  });
});

// ── Middleware de rutas no encontradas ────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Ruta no encontrada' });
});

// ── Middleware global de errores ──────────────────────────────
app.use((err, req, res, next) => {
  console.error('Error global:', err.stack);
  require('fs').appendFileSync('error.log', new Date().toISOString() + ' - ' + err.stack + '\n');
  res.status(500).json({ success: false, message: 'Error interno del servidor', error: err.message });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`\n🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`📋 Auth:      http://localhost:${PORT}/api/auth/login`);
  console.log(`📊 Dashboard: http://localhost:${PORT}/api/dashboard/resumen`);
  console.log(`📅 Iniciado: ${new Date().toLocaleString('es-EC')}\n`);
});

module.exports = app;

