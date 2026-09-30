const pool = require('./config/db');

async function runUpdates() {
  const connection = await pool.getConnection();
  try {
    console.log("Iniciando actualización de base de datos para Módulo Estudiantes...");
    await connection.beginTransaction();

    // 1. Crear tabla de Histórico de Estudiantes
    console.log("Creando tabla historico_estudiantes...");
    await connection.query(`
      CREATE TABLE IF NOT EXISTS historico_estudiantes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        apellidos_nombres VARCHAR(150) NOT NULL,
        curso_anterior VARCHAR(20) NOT NULL
      );
    `);
    console.log("Tabla historico_estudiantes creada.");

    // Sembrar datos históricos si está vacía
    const [countRows] = await connection.query('SELECT COUNT(*) AS total FROM historico_estudiantes');
    if (countRows[0].total === 0) {
      console.log("Sembrando datos históricos...");
      await connection.query(`
        INSERT INTO historico_estudiantes (apellidos_nombres, curso_anterior) VALUES
        ('ANDRADE BUSTAMANTE MATEO SEBASTIAN', '01 EGB'),
        ('BARROS CASTILLO VALERIA ESTEFANIA', '02 EGB'),
        ('CARDENAS DIAZ DIEGO ALEXANDER', '03 EGB'),
        ('DUQUE ESPINOSA EMILIA RAFAELA', '04 EGB'),
        ('ESTRELLA FLOR SANTIAGO JAVIER', '05 EGB'),
        ('FLORES GUERRERO ISABELLA CAMILA', '06 EGB'),
        ('GARCIA LOPEZ MATIAS SEBASTIAN', '07 EGB'),
        ('HERRERA MARTINEZ SOFIA VALENTINA', '08 EGB'),
        ('LOPEZ REYES CARLOS DANIEL', '09 EGB'),
        ('MENDOZA RUIZ EMILIO VALENTIN', '10 EGB');
      `);
      console.log("Datos históricos sembrados.");
    }

    // 2. Actualizar estado existente a mayúsculas para evitar conflictos con el cambio de ENUM
    console.log("Normalizando estados existentes...");
    await connection.query("UPDATE estudiantes SET estado = 'ACTIVO' WHERE estado = 'Activo' OR estado = 'activo'");
    await connection.query("UPDATE estudiantes SET estado = 'INACTIVO' WHERE estado = 'Inactivo' OR estado = 'inactivo'");

    // 3. Modificar columnas y agregar los nuevos campos a la tabla estudiantes
    console.log("Agregando nuevas columnas a la tabla estudiantes...");
    
    // Lista de consultas individuales para agregar columnas de forma segura si no existen
    const columnsToModify = [
      { name: 'es_nuevo', query: "ALTER TABLE estudiantes ADD COLUMN es_nuevo BOOLEAN DEFAULT TRUE AFTER apellidos" },
      { name: 'apellidos_nombres', query: "ALTER TABLE estudiantes ADD COLUMN apellidos_nombres VARCHAR(150) NULL AFTER es_nuevo" },
      { name: 'grado_curso', query: "ALTER TABLE estudiantes ADD COLUMN grado_curso VARCHAR(20) NULL AFTER apellidos_nombres" },
      { name: 'paralelo', query: "ALTER TABLE estudiantes ADD COLUMN paralelo CHAR(1) NULL AFTER grado_curso" },
      { name: 'cobro_matricula', query: "ALTER TABLE estudiantes ADD COLUMN cobro_matricula DECIMAL(8,2) DEFAULT 0.00 AFTER paralelo" },
      { name: 'tipo_pension', query: "ALTER TABLE estudiantes ADD COLUMN tipo_pension ENUM('NORMAL', 'DIFERENCIADA', 'DIFERENCIADA_POR_HERMANOS') DEFAULT 'NORMAL' AFTER cobro_matricula" },
      { name: 'valor_pension', query: "ALTER TABLE estudiantes ADD COLUMN valor_pension DECIMAL(8,2) DEFAULT 0.00 AFTER tipo_pension" },
      { name: 'fecha_matricula', query: "ALTER TABLE estudiantes ADD COLUMN fecha_matricula DATE NULL AFTER valor_pension" },
      { name: 'observaciones', query: "ALTER TABLE estudiantes ADD COLUMN observaciones TEXT NULL AFTER fecha_matricula" },
      { name: 'anio_lectivo', query: "ALTER TABLE estudiantes ADD COLUMN anio_lectivo VARCHAR(9) NULL AFTER observaciones" }
    ];

    for (const col of columnsToModify) {
      try {
        await connection.query(col.query);
        console.log(`Column ${col.name} agregada con éxito.`);
      } catch (err) {
        if (err.code === 'ER_DUP_COLUMNNAME') {
          console.log(`Column ${col.name} ya existía en la tabla.`);
        } else {
          throw err;
        }
      }
    }

    // 4. Modificar tipo de columna estado en estudiantes a ENUM en mayúsculas
    console.log("Modificando columna estado a ENUM('ACTIVO', 'INACTIVO', 'RETIRADO')...");
    await connection.query(`
      ALTER TABLE estudiantes 
      MODIFY COLUMN estado ENUM('ACTIVO', 'INACTIVO', 'RETIRADO') DEFAULT 'ACTIVO'
    `);
    console.log("Columna estado modificada.");

    // 5. Popular apellidos_nombres para registros existentes
    console.log("Populando apellidos_nombres en registros existentes...");
    await connection.query("UPDATE estudiantes SET apellidos_nombres = CONCAT(apellidos, ' ', nombres) WHERE apellidos_nombres IS NULL OR apellidos_nombres = ''");

    // 6. Sincronizar grado_curso y paralelo para registros existentes a partir de matriculas activas
    console.log("Sincronizando grado_curso, paralelo, anio_lectivo y fecha_matricula de matrículas previas...");
    await connection.query(`
      UPDATE estudiantes e
      INNER JOIN matriculas m ON e.id_estudiante = m.id_estudiante AND m.estado = 'Activa'
      INNER JOIN cursos c ON m.id_curso = c.id_curso
      SET 
        e.grado_curso = c.nombre,
        e.paralelo = m.paralelo,
        e.anio_lectivo = m.anio_lectivo,
        e.fecha_matricula = m.fecha_matricula,
        e.observaciones = m.observaciones
      WHERE e.grado_curso IS NULL OR e.grado_curso = ''
    `);

    await connection.commit();
    console.log("✅ Base de datos actualizada con éxito para el nuevo Módulo de Estudiantes.");
    process.exit(0);
  } catch (error) {
    await connection.rollback();
    console.error("❌ Error actualizando la base de datos:", error);
    process.exit(1);
  } finally {
    connection.release();
  }
}

runUpdates();
