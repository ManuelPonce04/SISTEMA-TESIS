require('dotenv').config();
const mysql = require('mysql2/promise');

async function migrate() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'sistema_cobranzas'
    });

    console.log('🔄 Iniciando migración de Mensualidades y Obligaciones...');

    // ── 1. obligaciones_pension ─────────────────────────────
    await connection.query(`
      CREATE TABLE IF NOT EXISTS obligaciones_pension (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        codigo VARCHAR(50) NOT NULL,
        matricula_id BIGINT UNSIGNED NOT NULL,
        estudiante_id BIGINT UNSIGNED NOT NULL,
        periodo_lectivo_id BIGINT UNSIGNED NOT NULL,
        mes_cobrable_id BIGINT UNSIGNED NOT NULL,
        asignacion_pension_id BIGINT UNSIGNED NOT NULL,
        mes DATE NOT NULL,
        fecha_emision DATE NOT NULL,
        fecha_vencimiento DATE NOT NULL,
        tarifa_base_snapshot DECIMAL(12,2) NOT NULL,
        descuento_snapshot DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        valor_original DECIMAL(12,2) NOT NULL,
        valor_ajustes DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        valor_actual DECIMAL(12,2) NOT NULL,
        total_pagado DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        saldo DECIMAL(12,2) NOT NULL,
        beneficios_snapshot JSON NULL,
        regla_calculo_snapshot JSON NULL,
        es_exonerada BOOLEAN NOT NULL DEFAULT FALSE,
        estado VARCHAR(30) NOT NULL DEFAULT 'BORRADOR',
        generado_por BIGINT UNSIGNED NOT NULL,
        generado_at DATETIME NOT NULL,
        emitido_por BIGINT UNSIGNED NULL,
        emitido_at DATETIME NULL,
        anulado_por BIGINT UNSIGNED NULL,
        anulado_at DATETIME NULL,
        motivo_anulacion TEXT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unq_matricula_mes_obligacion (matricula_id, mes_cobrable_id),
        UNIQUE KEY unq_obligacion_codigo (codigo),
        INDEX idx_obl_estudiante (estudiante_id),
        INDEX idx_obl_matricula (matricula_id),
        INDEX idx_obl_periodo (periodo_lectivo_id),
        INDEX idx_obl_mes (mes_cobrable_id),
        INDEX idx_obl_asignacion (asignacion_pension_id),
        INDEX idx_obl_estado (estado),
        INDEX idx_obl_vencimiento (fecha_vencimiento),
        INDEX idx_obl_saldo (saldo),
        INDEX idx_obl_periodo_mes_estado (periodo_lectivo_id, mes_cobrable_id, estado),
        INDEX idx_obl_estudiante_saldo (estudiante_id, saldo)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅  obligaciones_pension — verificada/creada');

    // ── 2. ajustes_obligacion_pension ─────────────────────────────
    await connection.query(`
      CREATE TABLE IF NOT EXISTS ajustes_obligacion_pension (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        obligacion_pension_id BIGINT UNSIGNED NOT NULL,
        tipo VARCHAR(40) NOT NULL,
        valor DECIMAL(12,2) NOT NULL,
        signo ENUM('SUMA','RESTA') NOT NULL,
        motivo TEXT NOT NULL,
        documento_url VARCHAR(500) NULL,
        estado VARCHAR(30) NOT NULL DEFAULT 'ACTIVO',
        usuario_id BIGINT UNSIGNED NOT NULL,
        anulado_por BIGINT UNSIGNED NULL,
        anulado_at DATETIME NULL,
        motivo_anulacion TEXT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_ajuste_obligacion (obligacion_pension_id),
        INDEX idx_ajuste_tipo (tipo),
        INDEX idx_ajuste_estado (estado),
        INDEX idx_ajuste_usuario (usuario_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅  ajustes_obligacion_pension — verificada/creada');

    // ── 3. historial_obligacion_pension ─────────────────────────────
    await connection.query(`
      CREATE TABLE IF NOT EXISTS historial_obligacion_pension (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        obligacion_pension_id BIGINT UNSIGNED NOT NULL,
        accion VARCHAR(80) NOT NULL,
        estado_anterior VARCHAR(30) NULL,
        estado_nuevo VARCHAR(30) NULL,
        datos_anteriores JSON NULL,
        datos_nuevos JSON NULL,
        motivo TEXT NULL,
        usuario_id BIGINT UNSIGNED NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_hist_obl (obligacion_pension_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅  historial_obligacion_pension — verificada/creada');

    console.log('🎉 Migración de mensualidades completada con éxito.');
  } catch (error) {
    console.error('❌ Error durante la migración:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
    process.exit();
  }
}

migrate();
