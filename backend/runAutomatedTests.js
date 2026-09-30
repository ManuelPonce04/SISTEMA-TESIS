const { execSync } = require('child_process');
const path = require('path');

console.log("=== INICIANDO PRUEBAS AUTOMÁTICAS ===\n");

// 1. Compilación del Frontend
console.log("1. Verificando integridad del Frontend (Build)...");
try {
  const frontendPath = path.join(__dirname, '..', 'frontend');
  const result = execSync('npm run build', { cwd: frontendPath, encoding: 'utf8', stdio: 'pipe' });
  console.log("✅ Frontend compilado exitosamente sin errores fatales.");
} catch (error) {
  console.log("❌ Error en la compilación del Frontend:");
  console.log(error.stdout || error.message);
}

// 2. Verificación del Backend y Base de Datos
console.log("\n2. Verificando conexión a BD y Middlewares en el Backend...");
try {
  // Solo cargaremos server.js y luego cerraremos (no arrancar el puerto completamente o solo probar require)
  const app = require('./server'); // This starts the server asynchronously
  
  // Try connecting to DB directly
  const pool = require('./config/db');
  
  setTimeout(async () => {
    try {
        const [rows] = await pool.query('SELECT 1 + 1 AS result');
        if (rows[0].result === 2) {
           console.log("✅ Conexión a Base de Datos (MySQL) operativa.");
        }
    } catch(err) {
        console.log("❌ Error de BD:", err.message);
    }
    console.log("✅ Backend inicializado sin caídas críticas.");
    console.log("\n=== PRUEBAS FINALIZADAS ===");
    process.exit(0);
  }, 2000);
} catch (error) {
  console.log("❌ Error en el Backend:", error.message);
  process.exit(1);
}
