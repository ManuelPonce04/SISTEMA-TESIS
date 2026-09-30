const pool = require('./config/db');

async function runUpdates() {
  try {
    console.log("Adding columns to representantes...");
    await pool.query(`
      ALTER TABLE representantes
        CHANGE COLUMN telefono telefono_principal VARCHAR(20),
        ADD COLUMN telefono_secundario VARCHAR(20) AFTER telefono_principal,
        ADD COLUMN parentesco ENUM('Padre', 'Madre', 'Abuelo', 'Abuela', 'Tutor', 'Otro') DEFAULT 'Otro' AFTER apellidos,
        ADD COLUMN estado ENUM('Activo', 'Inactivo') DEFAULT 'Activo' AFTER direccion;
    `);
    console.log("Success: representantes");
  } catch(e) {
    console.log("representantes error (might already exist):", e.message);
  }

  try {
    console.log("Adding columns to estudiantes...");
    await pool.query(`
      ALTER TABLE estudiantes
        ADD COLUMN nacionalidad VARCHAR(50) DEFAULT 'Ecuatoriana' AFTER sexo,
        ADD COLUMN direccion TEXT AFTER nacionalidad,
        ADD COLUMN telefono VARCHAR(20) AFTER direccion,
        ADD COLUMN correo VARCHAR(120) AFTER telefono;
    `);
    console.log("Success: estudiantes");
  } catch(e) {
    console.log("estudiantes error (might already exist):", e.message);
  }

  process.exit(0);
}

runUpdates();
