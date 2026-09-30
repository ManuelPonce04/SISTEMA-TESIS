const pool = require('./config/db');

async function check() {
  try {
    const [rows] = await pool.execute('SELECT id_usuario, nombre_completo, correo, password, estado, es_admin FROM usuarios');
    console.log("Usuarios en la base de datos:");
    console.log(JSON.stringify(rows, null, 2));
    process.exit(0);
  } catch (e) {
    console.error("Error consultando usuarios:", e);
    process.exit(1);
  }
}

check();
