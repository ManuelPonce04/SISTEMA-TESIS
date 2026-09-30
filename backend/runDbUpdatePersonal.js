/**
 * ============================================================
 * Migración: Módulo de Personal
 * Crea las tablas: tipos_contrato, funciones_personal, cargos_personal, personal, historial_sueldos
 * ============================================================
 */
const pool = require('./config/db');

async function runMigration() {
  try {
    console.log('🔄 Iniciando migración: Módulo de Personal...\n');

    // ── Catálogos ──────────────────────────────────────────────
    console.log('  📑 Creando tabla tipos_contrato...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tipos_contrato (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        codigo          VARCHAR(10) NOT NULL UNIQUE,
        nombre          VARCHAR(100) NOT NULL,
        descripcion     VARCHAR(255) NULL,
        genera_nomina   BOOLEAN DEFAULT TRUE,
        activo          BOOLEAN DEFAULT TRUE,
        orden           INT DEFAULT 0,
        created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    console.log('  📑 Creando tabla funciones_personal...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS funciones_personal (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        nombre          VARCHAR(100) NOT NULL UNIQUE,
        descripcion     VARCHAR(255) NULL,
        activo          BOOLEAN DEFAULT TRUE,
        orden           INT DEFAULT 0,
        created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    console.log('  📑 Creando tabla cargos_personal...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS cargos_personal (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        nombre          VARCHAR(100) NOT NULL UNIQUE,
        descripcion     VARCHAR(255) NULL,
        funcion_id      INT NULL,
        activo          BOOLEAN DEFAULT TRUE,
        orden           INT DEFAULT 0,
        created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_cargo_funcion FOREIGN KEY (funcion_id) REFERENCES funciones_personal(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // ── Tabla Principal: personal ──────────────────────────────
    console.log('  👥 Creando tabla personal...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS personal (
        id                INT AUTO_INCREMENT PRIMARY KEY,
        codigo_interno    VARCHAR(30) NOT NULL UNIQUE,
        cedula            VARCHAR(10) NULL UNIQUE,
        apellidos         VARCHAR(150) NULL,
        nombres           VARCHAR(150) NULL,
        nombre_completo   VARCHAR(300) NOT NULL,
        nombre_corto      VARCHAR(150) NULL,
        correo            VARCHAR(150) NULL,
        telefono          VARCHAR(30) NULL,
        direccion         VARCHAR(500) NULL,
        fecha_nacimiento  DATE NULL,
        tipo_contrato_id  INT NOT NULL,
        cargo_id          INT NULL,
        funcion_id        INT NULL,
        fecha_ingreso     DATE NULL,
        fecha_salida      DATE NULL,
        sueldo_actual     DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        modalidad_pago    VARCHAR(50) NULL,
        estado            ENUM('ACTIVO','INACTIVO') DEFAULT 'ACTIVO',
        usuario_id        INT NULL,
        docente_id        INT NULL,
        observacion       TEXT NULL,
        motivo_inactivacion VARCHAR(500) NULL,
        creado_por        INT NOT NULL,
        actualizado_por   INT NULL,
        created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

        CONSTRAINT fk_personal_contrato FOREIGN KEY (tipo_contrato_id) REFERENCES tipos_contrato(id) ON DELETE RESTRICT,
        CONSTRAINT fk_personal_cargo FOREIGN KEY (cargo_id) REFERENCES cargos_personal(id) ON DELETE RESTRICT,
        CONSTRAINT fk_personal_funcion FOREIGN KEY (funcion_id) REFERENCES funciones_personal(id) ON DELETE RESTRICT,
        CONSTRAINT fk_personal_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
        CONSTRAINT fk_personal_creador FOREIGN KEY (creado_por) REFERENCES usuarios(id_usuario) ON DELETE RESTRICT,
        CONSTRAINT fk_personal_editor FOREIGN KEY (actualizado_por) REFERENCES usuarios(id_usuario) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    console.log('  🔑 Creando índices para personal...');
    const indicesPersonal = [
      { name: 'idx_personal_nombre', col: 'nombre_completo(50)' },
      { name: 'idx_personal_contrato', col: 'tipo_contrato_id' },
      { name: 'idx_personal_cargo', col: 'cargo_id' },
      { name: 'idx_personal_funcion', col: 'funcion_id' },
      { name: 'idx_personal_estado', col: 'estado' },
      { name: 'idx_personal_ingreso', col: 'fecha_ingreso' }
    ];
    for (const idx of indicesPersonal) {
      try { await pool.query(`CREATE INDEX ${idx.name} ON personal (${idx.col})`); }
      catch (e) { if (e.code !== 'ER_DUP_KEYNAME') throw e; }
    }

    // ── Tabla Historial: historial_sueldos ──────────────────────
    console.log('  📈 Creando tabla historial_sueldos...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS historial_sueldos (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        personal_id     INT NOT NULL,
        sueldo          DECIMAL(12,2) NOT NULL,
        fecha_desde     DATE NOT NULL,
        fecha_hasta     DATE NULL,
        motivo          VARCHAR(255) NOT NULL,
        usuario_id      INT NOT NULL,
        created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

        CONSTRAINT fk_historial_personal FOREIGN KEY (personal_id) REFERENCES personal(id) ON DELETE RESTRICT,
        CONSTRAINT fk_historial_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id_usuario) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    console.log('══════════════════════════════════════════════════');
    console.log('✅ Migración de Módulo de Personal completada.');
    console.log('══════════════════════════════════════════════════\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error en migración:', error.message);
    process.exit(1);
  }
}

runMigration();
