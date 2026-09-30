const pool = require('./config/db');

async function runUpdates() {
  try {
    console.log("Adding es_admin column to usuarios...");
    await pool.query(`
      ALTER TABLE usuarios
        ADD COLUMN es_admin BOOLEAN DEFAULT FALSE AFTER estado;
    `);

    console.log("Setting Admin Sistema to es_admin = TRUE...");
    await pool.query(`
      UPDATE usuarios SET es_admin = TRUE WHERE correo = 'admin@juanleonmera.edu.ec';
    `);

    console.log("Success: usuarios table altered.");
  } catch(e) {
    console.error("Error altering usuarios table (it might already have es_admin):", e.message);
  }

  process.exit(0);
}

runUpdates();
