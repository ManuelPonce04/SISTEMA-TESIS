/**
 * ============================================================
 * Migración: Módulo Cobro de Pensiones — v3 (compatible)
 *
 * Estrategia FK segura:
 *   - estudiantes(id_estudiante): PK original, siempre existe → FK activa
 *   - matriculas.id / id_matricula: depende del schema → SIN FK (INT simple)
 *     La integridad se garantiza a nivel de aplicación.
 *   - usuarios(id_usuario): se intenta FK, si falla se ignora y se crea sin ella
 *
 * Ejecución: node backend/runDbUpdatePensiones.js
 * ============================================================
 */
const pool = require('./config/db');

async function crearIndice(conn, sql, nombre) {
  try { await conn.query(sql); }
  catch (e) { if (e.code !== 'ER_DUP_KEYNAME') throw e; }
}

async function runMigration() {
  const conn = await pool.getConnection();
  try {
    console.log('\n🔄 Iniciando migracion: Modulo Cobro de Pensiones (v3)...\n');

    // ─────────────────────────────────────────────────────────
    // 1. pension_config
    // ─────────────────────────────────────────────────────────
    console.log('  Creando tabla pension_config...');
    await conn.query(`
      CREATE TABLE IF NOT EXISTS pension_config (
        id            INT AUTO_INCREMENT PRIMARY KEY,
        anio_lectivo  VARCHAR(20)    NOT NULL,
        nivel         VARCHAR(30)    NOT NULL,
        valor_mensual DECIMAL(10,2)  NOT NULL,
        activo        TINYINT(1)     NOT NULL DEFAULT 1,
        created_at    TIMESTAMP      DEFAULT CURRENT_TIMESTAMP,
        updated_at    TIMESTAMP      DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_pension_cfg (anio_lectivo, nivel)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('  OK pension_config\n');

    // ─────────────────────────────────────────────────────────
    // 2. pension_cuotas
    //    NOTA: matricula_id es INT sin FK (el PK de matriculas
    //    puede ser id_matricula o id segun el schema instalado)
    //    Solo FK a estudiantes(id_estudiante) que siempre existe
    // ─────────────────────────────────────────────────────────
    console.log('  Creando tabla pension_cuotas...');
    await conn.query(`
      CREATE TABLE IF NOT EXISTS pension_cuotas (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        estudiante_id   INT            NOT NULL,
        matricula_id    INT            NOT NULL,
        anio_lectivo    VARCHAR(20)    NOT NULL,
        mes             VARCHAR(7)     NOT NULL,
        valor_pension   DECIMAL(10,2)  NOT NULL,
        estado          ENUM('PENDIENTE','PARCIAL','PAGADO') NOT NULL DEFAULT 'PENDIENTE',
        created_at      TIMESTAMP      DEFAULT CURRENT_TIMESTAMP,
        updated_at      TIMESTAMP      DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_pension_cuota (estudiante_id, anio_lectivo, mes)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Indices separados (ignorar si ya existen)
    await crearIndice(conn, 'ALTER TABLE pension_cuotas ADD INDEX idx_pcu_est    (estudiante_id)', 'idx_pcu_est');
    await crearIndice(conn, 'ALTER TABLE pension_cuotas ADD INDEX idx_pcu_mat    (matricula_id)',  'idx_pcu_mat');
    await crearIndice(conn, 'ALTER TABLE pension_cuotas ADD INDEX idx_pcu_anio   (anio_lectivo)',  'idx_pcu_anio');
    await crearIndice(conn, 'ALTER TABLE pension_cuotas ADD INDEX idx_pcu_mes    (mes)',           'idx_pcu_mes');
    await crearIndice(conn, 'ALTER TABLE pension_cuotas ADD INDEX idx_pcu_estado (estado)',        'idx_pcu_estado');

    // FK a estudiantes (siempre existe)
    try {
      await conn.query(`
        ALTER TABLE pension_cuotas
        ADD CONSTRAINT fk_pcu_est
          FOREIGN KEY (estudiante_id)
          REFERENCES estudiantes(id_estudiante)
          ON DELETE CASCADE ON UPDATE CASCADE
      `);
      console.log('  FK estudiantes OK');
    } catch (e) {
      if (e.code === 'ER_DUP_KEYNAME' || e.code === 'ER_FK_DUP_NAME' || e.errno === 1826) {
        console.log('  FK estudiantes ya existia');
      } else {
        console.warn('  FK estudiantes omitida:', e.message);
      }
    }
    console.log('  OK pension_cuotas\n');

    // ─────────────────────────────────────────────────────────
    // 3. pension_pagos
    // ─────────────────────────────────────────────────────────
    console.log('  Creando tabla pension_pagos...');
    await conn.query(`
      CREATE TABLE IF NOT EXISTS pension_pagos (
        id                INT AUTO_INCREMENT PRIMARY KEY,
        cuota_id          INT            NOT NULL,
        estudiante_id     INT            NOT NULL,
        fecha_pago        DATE           NOT NULL,
        monto             DECIMAL(10,2)  NOT NULL,
        nota              TEXT,
        usuario_id        INT,
        anulado           TINYINT(1)     NOT NULL DEFAULT 0,
        motivo_anulacion  TEXT,
        numero_recibo     INT UNSIGNED,
        created_at        TIMESTAMP      DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await crearIndice(conn, 'ALTER TABLE pension_pagos ADD INDEX idx_ppa_cuota   (cuota_id)',     'idx_ppa_cuota');
    await crearIndice(conn, 'ALTER TABLE pension_pagos ADD INDEX idx_ppa_est     (estudiante_id)', 'idx_ppa_est');
    await crearIndice(conn, 'ALTER TABLE pension_pagos ADD INDEX idx_ppa_fecha   (fecha_pago)',    'idx_ppa_fecha');
    await crearIndice(conn, 'ALTER TABLE pension_pagos ADD INDEX idx_ppa_anulado (anulado)',       'idx_ppa_anulado');
    await crearIndice(conn, 'ALTER TABLE pension_pagos ADD INDEX idx_ppa_recibo  (numero_recibo)', 'idx_ppa_recibo');

    // FK a pension_cuotas
    try {
      await conn.query(`
        ALTER TABLE pension_pagos
        ADD CONSTRAINT fk_ppa_cuota
          FOREIGN KEY (cuota_id)
          REFERENCES pension_cuotas(id)
          ON DELETE RESTRICT ON UPDATE CASCADE
      `);
      console.log('  FK cuota OK');
    } catch (e) {
      console.warn('  FK cuota omitida:', e.code || e.message);
    }

    // FK a estudiantes
    try {
      await conn.query(`
        ALTER TABLE pension_pagos
        ADD CONSTRAINT fk_ppa_est
          FOREIGN KEY (estudiante_id)
          REFERENCES estudiantes(id_estudiante)
          ON DELETE RESTRICT ON UPDATE CASCADE
      `);
      console.log('  FK estudiante OK');
    } catch (e) {
      console.warn('  FK estudiante omitida:', e.code || e.message);
    }

    // FK a usuarios (puede o no existir la tabla)
    try {
      await conn.query(`
        ALTER TABLE pension_pagos
        ADD CONSTRAINT fk_ppa_usr
          FOREIGN KEY (usuario_id)
          REFERENCES usuarios(id_usuario)
          ON DELETE SET NULL ON UPDATE CASCADE
      `);
      console.log('  FK usuario OK');
    } catch (e) {
      console.warn('  FK usuario omitida (no critica):', e.code || e.message);
    }

    console.log('  OK pension_pagos\n');

    // ─────────────────────────────────────────────────────────
    // 4. pension_recibo_seq
    // ─────────────────────────────────────────────────────────
    console.log('  Creando tabla pension_recibo_seq...');
    await conn.query(`
      CREATE TABLE IF NOT EXISTS pension_recibo_seq (
        anio_lectivo  VARCHAR(20)  NOT NULL PRIMARY KEY,
        ultimo_num    INT UNSIGNED NOT NULL DEFAULT 0,
        updated_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('  OK pension_recibo_seq\n');

    // ─────────────────────────────────────────────────────────
    // 5. Seed: pension_config (INSERT IGNORE = idempotente)
    // ─────────────────────────────────────────────────────────
    console.log('  Insertando datos iniciales en pension_config...');
    await conn.query(`
      INSERT IGNORE INTO pension_config (anio_lectivo, nivel, valor_mensual, activo) VALUES
        ('2026-2027', 'INICIAL',   30.00, 1),
        ('2026-2027', '1-7 EGB',  35.00, 1),
        ('2026-2027', '8-10 EGB', 40.00, 1),
        ('2026-2027', '1-2 BACH', 45.00, 1),
        ('2026-2027', '3 BACH',   45.00, 1),
        ('2025-2026', 'INICIAL',   28.00, 0),
        ('2025-2026', '1-7 EGB',  32.00, 0),
        ('2025-2026', '8-10 EGB', 38.00, 0),
        ('2025-2026', '1-2 BACH', 42.00, 0),
        ('2025-2026', '3 BACH',   42.00, 0)
    `);
    await conn.query(`
      INSERT IGNORE INTO pension_recibo_seq (anio_lectivo, ultimo_num) VALUES ('2026-2027', 0)
    `);
    console.log('  OK datos iniciales\n');

    console.log('====================================================');
    console.log('OK Migracion de Cobro de Pensiones completada.');
    console.log('   Tablas creadas:');
    console.log('   - pension_config');
    console.log('   - pension_cuotas');
    console.log('   - pension_pagos');
    console.log('   - pension_recibo_seq');
    console.log('====================================================\n');
    process.exit(0);

  } catch (error) {
    console.error('\nERROR en migracion:', error.message);
    process.exit(1);
  } finally {
    conn.release();
  }
}

runMigration();
