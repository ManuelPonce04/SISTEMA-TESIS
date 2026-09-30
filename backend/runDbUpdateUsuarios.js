const pool = require('./config/db');

async function runUpdates() {
  try {
    console.log("Dropping old usuarios table...");
    await pool.query(`DROP TABLE IF EXISTS usuarios;`);

    console.log("Creating new usuarios table...");
    await pool.query(`
      CREATE TABLE usuarios (
          id_usuario   INT AUTO_INCREMENT PRIMARY KEY,
          nombre_completo VARCHAR(150) NOT NULL,
          correo       VARCHAR(120) NOT NULL UNIQUE,
          password     VARCHAR(255) NOT NULL,
          estado       ENUM('Activo','Inactivo') DEFAULT 'Activo',
          ultimo_acceso DATETIME NULL,
          created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `);

    console.log("Inserting default admin user...");
    await pool.query(`
      INSERT INTO usuarios (nombre_completo, correo, password, estado)
      VALUES (
          'Admin Sistema',
          'admin@juanleonmera.edu.ec',
          '$2b$10$9.wdLLQFJR1RsZCYEw5lZujW.vhxgziX9D9V9XHdEEfnG58l8Fc8q',
          'Activo'
      );
    `);

    console.log("Success: usuarios table recreated and seeded.");
  } catch(e) {
    console.error("Error updating usuarios table:", e.message);
  }

  process.exit(0);
}

runUpdates();
