/**
 * ============================================================
 * Migración: Ingresos y Egresos
 * Crea las tablas: movimientos_financieros, auditoria_financiera
 * ============================================================
 */
const pool = require('./config/db');

async function runMigration() {
  try {
    console.log('🔄 Iniciando migración: Ingresos y Egresos...\n');

    // ── Tabla: movimientos_financieros ────────────────────────
    console.log('  💰 Creando tabla movimientos_financieros...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS movimientos_financieros (
        id                      INT AUTO_INCREMENT PRIMARY KEY,
        periodo_lectivo_id      INT NOT NULL,
        fecha                   DATE NOT NULL,
        catalogo_movimiento_id  INT NOT NULL,
        descripcion             VARCHAR(255) NOT NULL,
        mes_aplicacion          DATE NULL,
        valor                   DECIMAL(12,2) NOT NULL,
        cuenta_financiera_id    INT NOT NULL,
        personal_id             INT NULL,
        observacion             VARCHAR(500) NULL,
        notas                   TEXT NULL,
        numero_comprobante      VARCHAR(100) NULL,
        archivo_url             VARCHAR(500) NULL,
        estado                  ENUM('ACTIVO','ANULADO') DEFAULT 'ACTIVO',
        motivo_anulacion        VARCHAR(500) NULL,
        anulado_por             INT NULL,
        anulado_at              DATETIME NULL,
        usuario_id              INT NOT NULL,
        created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

        CONSTRAINT fk_mf_periodo
          FOREIGN KEY (periodo_lectivo_id) REFERENCES periodos_lectivos(id) ON DELETE RESTRICT,
        CONSTRAINT fk_mf_concepto
          FOREIGN KEY (catalogo_movimiento_id) REFERENCES catalogo_movimientos(id) ON DELETE RESTRICT,
        CONSTRAINT fk_mf_cuenta
          FOREIGN KEY (cuenta_financiera_id) REFERENCES cuentas_financieras(id) ON DELETE RESTRICT,
        CONSTRAINT fk_mf_usuario
          FOREIGN KEY (usuario_id) REFERENCES usuarios(id_usuario) ON DELETE RESTRICT,
        CONSTRAINT fk_mf_anulado_por
          FOREIGN KEY (anulado_por) REFERENCES usuarios(id_usuario) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('  ✅ movimientos_financieros creada.\n');

    // ── Índices para movimientos_financieros ──────────────────
    console.log('  🔑 Creando índices para movimientos_financieros...');
    const indicesMF = [
      { name: 'idx_mf_fecha',          col: 'fecha' },
      { name: 'idx_mf_periodo',        col: 'periodo_lectivo_id' },
      { name: 'idx_mf_concepto',       col: 'catalogo_movimiento_id' },
      { name: 'idx_mf_cuenta',         col: 'cuenta_financiera_id' },
      { name: 'idx_mf_estado',         col: 'estado' },
      { name: 'idx_mf_mes',            col: 'mes_aplicacion' },
      { name: 'idx_mf_usuario',        col: 'usuario_id' },
      { name: 'idx_mf_personal',       col: 'personal_id' },
      { name: 'idx_mf_comprobante',    col: 'numero_comprobante' },
      { name: 'idx_mf_fecha_estado',   col: 'fecha, estado' },
      { name: 'idx_mf_periodo_fecha',  col: 'periodo_lectivo_id, fecha' },
    ];
    for (const idx of indicesMF) {
      try {
        await pool.query(`CREATE INDEX ${idx.name} ON movimientos_financieros (${idx.col})`);
      } catch (e) {
        if (e.code !== 'ER_DUP_KEYNAME') throw e;
      }
    }
    console.log('  ✅ Índices de movimientos_financieros creados.\n');

    // ── Tabla: auditoria_financiera ──────────────────────────
    console.log('  📝 Creando tabla auditoria_financiera...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS auditoria_financiera (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        usuario_id      INT NOT NULL,
        entidad         VARCHAR(100) NOT NULL,
        entidad_id      INT NOT NULL,
        accion          VARCHAR(50) NOT NULL,
        datos_anteriores JSON NULL,
        datos_nuevos    JSON NULL,
        motivo          VARCHAR(500) NULL,
        ip              VARCHAR(45) NULL,
        user_agent      VARCHAR(500) NULL,
        created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT fk_af_usuario
          FOREIGN KEY (usuario_id) REFERENCES usuarios(id_usuario) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('  ✅ auditoria_financiera creada.\n');

    // Índices para auditoria_financiera
    console.log('  🔑 Creando índices para auditoria_financiera...');
    const indicesAF = [
      { name: 'idx_af_entidad',   col: 'entidad, entidad_id' },
      { name: 'idx_af_usuario',   col: 'usuario_id' },
      { name: 'idx_af_created',   col: 'created_at' },
    ];
    for (const idx of indicesAF) {
      try {
        await pool.query(`CREATE INDEX ${idx.name} ON auditoria_financiera (${idx.col})`);
      } catch (e) {
        if (e.code !== 'ER_DUP_KEYNAME') throw e;
      }
    }
    console.log('  ✅ Índices de auditoria_financiera creados.\n');

    console.log('══════════════════════════════════════════════════');
    console.log('✅ Migración de Ingresos y Egresos completada.');
    console.log('══════════════════════════════════════════════════\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error en migración:', error.message);
    process.exit(1);
  }
}

runMigration();
