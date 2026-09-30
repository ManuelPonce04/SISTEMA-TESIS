/**
 * ============================================================
 * Migración: Control Financiero — Catálogos
 * Crea las tablas: periodos_lectivos, catalogo_movimientos, cuentas_financieras
 * ============================================================
 */
const pool = require('./config/db');

async function runMigration() {
  try {
    console.log('🔄 Iniciando migración: Control Financiero...\n');

    // ── Tabla: periodos_lectivos ──────────────────────────────
    console.log('  📅 Creando tabla periodos_lectivos...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS periodos_lectivos (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        nombre          VARCHAR(50) NOT NULL UNIQUE,
        fecha_inicio    DATE NOT NULL,
        fecha_fin       DATE NOT NULL,
        activo          BOOLEAN DEFAULT TRUE,
        created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('  ✅ periodos_lectivos creada.\n');

    // ── Tabla: catalogo_movimientos ──────────────────────────
    console.log('  📋 Creando tabla catalogo_movimientos...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS catalogo_movimientos (
        id                INT AUTO_INCREMENT PRIMARY KEY,
        codigo            VARCHAR(20) NOT NULL UNIQUE,
        nombre            VARCHAR(200) NOT NULL,
        tipo              ENUM('INGRESO','EGRESO') NOT NULL,
        categoria         VARCHAR(100) NOT NULL,
        requiere_mes      BOOLEAN DEFAULT FALSE,
        requiere_personal BOOLEAN DEFAULT FALSE,
        activo            BOOLEAN DEFAULT TRUE,
        orden             INT DEFAULT 0,
        created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('  ✅ catalogo_movimientos creada.\n');

    // Índices para catalogo_movimientos
    console.log('  🔑 Creando índices para catalogo_movimientos...');
    const indicesMovimientos = [
      { name: 'idx_cm_codigo',    column: 'codigo' },
      { name: 'idx_cm_nombre',    column: 'nombre(100)' },
      { name: 'idx_cm_tipo',      column: 'tipo' },
      { name: 'idx_cm_categoria', column: 'categoria' },
      { name: 'idx_cm_activo',    column: 'activo' },
    ];
    for (const idx of indicesMovimientos) {
      try {
        await pool.query(`CREATE INDEX ${idx.name} ON catalogo_movimientos (${idx.column})`);
      } catch (e) {
        if (e.code !== 'ER_DUP_KEYNAME') throw e;
        // Índice ya existe, ignorar
      }
    }
    console.log('  ✅ Índices de catalogo_movimientos creados.\n');

    // ── Tabla: cuentas_financieras ──────────────────────────
    console.log('  🏦 Creando tabla cuentas_financieras...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS cuentas_financieras (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        nombre          VARCHAR(150) NOT NULL UNIQUE,
        tipo            ENUM('CAJA','BANCO','CUENTA INTERNA','OTRA') NOT NULL,
        descripcion     TEXT,
        saldo_inicial   DECIMAL(12,2) DEFAULT 0.00,
        activo          BOOLEAN DEFAULT TRUE,
        orden           INT DEFAULT 0,
        created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('  ✅ cuentas_financieras creada.\n');

    // Índices para cuentas_financieras
    console.log('  🔑 Creando índices para cuentas_financieras...');
    const indicesCuentas = [
      { name: 'idx_cf_nombre', column: 'nombre(100)' },
      { name: 'idx_cf_tipo',   column: 'tipo' },
      { name: 'idx_cf_activo', column: 'activo' },
    ];
    for (const idx of indicesCuentas) {
      try {
        await pool.query(`CREATE INDEX ${idx.name} ON cuentas_financieras (${idx.column})`);
      } catch (e) {
        if (e.code !== 'ER_DUP_KEYNAME') throw e;
      }
    }
    console.log('  ✅ Índices de cuentas_financieras creados.\n');

    console.log('══════════════════════════════════════════════════');
    console.log('✅ Migración de Control Financiero completada.');
    console.log('══════════════════════════════════════════════════\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error en migración de Control Financiero:', error.message);
    process.exit(1);
  }
}

runMigration();
