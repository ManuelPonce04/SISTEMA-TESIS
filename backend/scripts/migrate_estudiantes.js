const pool = require('../config/db');

async function migrate() {
  const connection = await pool.getConnection();
  try {
    console.log('--- Iniciando Migración: Estudiantes y Representantes ---');
    await connection.beginTransaction();

    // 1. Crear tabla intermedia
    console.log('1. Creando tabla estudiante_representantes...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS estudiante_representantes (
        id_relacion BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        id_estudiante INT NOT NULL,
        id_representante INT NOT NULL,
        parentesco VARCHAR(50) NOT NULL,
        es_principal BOOLEAN NOT NULL DEFAULT FALSE,
        es_responsable_economico BOOLEAN NOT NULL DEFAULT FALSE,
        recibe_notificaciones BOOLEAN NOT NULL DEFAULT TRUE,
        autorizado_retiro BOOLEAN NOT NULL DEFAULT FALSE,
        vive_con_estudiante BOOLEAN NULL,
        activo BOOLEAN NOT NULL DEFAULT TRUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_est_rep (id_estudiante, id_representante)
      )
    `);

    // 2. Migrar datos existentes (si los hay)
    console.log('2. Migrando relaciones existentes...');
    
    // Obtenemos todos los estudiantes que tienen un representante
    const [estudiantes] = await connection.execute(`
      SELECT e.id_estudiante, e.id_representante
      FROM estudiantes e
      JOIN representantes r ON e.id_representante = r.id_representante
    `);

    let countMigrados = 0;
    for (const est of estudiantes) {
      // Verificar si ya existe
      const [existing] = await connection.execute(
        'SELECT id_relacion FROM estudiante_representantes WHERE id_estudiante = ? AND id_representante = ?',
        [est.id_estudiante, est.id_representante]
      );

      if (existing.length === 0) {
        await connection.execute(`
          INSERT INTO estudiante_representantes (
            id_estudiante, id_representante, parentesco, 
            es_principal, es_responsable_economico
          ) VALUES (?, ?, ?, ?, ?)
        `, [
          est.id_estudiante, 
          est.id_representante, 
          'Representante Principal', // Default fallback
          true, // Asumimos que el que estaba asignado es el principal
          true  // y también el responsable económico por ahora
        ]);
        countMigrados++;
      }
    }
    console.log(`-> Se migraron ${countMigrados} relaciones exitosamente.`);

    // 3. Añadir columnas faltantes a estudiantes si no existen
    // (Por seguridad usamos un catch en cada ALTER por si ya existen)
    console.log('3. Asegurando columnas adicionales en estudiantes...');
    const colQueries = [
      "ALTER TABLE estudiantes ADD COLUMN tipo_identificacion VARCHAR(30) DEFAULT 'Cédula'",
      "ALTER TABLE estudiantes ADD COLUMN nacionalidad VARCHAR(100) DEFAULT 'Ecuatoriana'",
      "ALTER TABLE estudiantes ADD COLUMN pais_nacimiento VARCHAR(100) DEFAULT 'Ecuador'",
      "ALTER TABLE estudiantes ADD COLUMN provincia_nacimiento VARCHAR(100) DEFAULT 'Manabí'",
      "ALTER TABLE estudiantes ADD COLUMN canton_nacimiento VARCHAR(100) DEFAULT 'Jaramijó'",
      "ALTER TABLE estudiantes ADD COLUMN direccion VARCHAR(500) NULL",
      "ALTER TABLE estudiantes ADD COLUMN telefono VARCHAR(30) NULL",
      "ALTER TABLE estudiantes ADD COLUMN correo VARCHAR(150) NULL"
    ];

    for (const q of colQueries) {
      try {
        await connection.execute(q);
        console.log(`-> Añadido con éxito: ${q.split('ADD COLUMN ')[1].split(' ')[0]}`);
      } catch (err) {
        // Ignorar error de "Duplicate column name"
        if (err.code !== 'ER_DUP_FIELDNAME') {
          console.warn(`Advertencia al alterar tabla: ${err.message}`);
        }
      }
    }

    await connection.commit();
    console.log('--- Migración Completada Exitosamente ---');
    process.exit(0);
  } catch (error) {
    await connection.rollback();
    console.error('Error durante la migración:', error);
    process.exit(1);
  } finally {
    connection.release();
  }
}

migrate();
