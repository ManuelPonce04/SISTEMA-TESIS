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

    console.log('🔄 Iniciando migración de Registro y Distribución de Cobros...');

    // ── 1. metodos_pago ─────────────────────────────
    await connection.query(`
      CREATE TABLE IF NOT EXISTS metodos_pago (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        codigo VARCHAR(30) NOT NULL UNIQUE,
        nombre VARCHAR(100) NOT NULL,
        requiere_cuenta BOOLEAN NOT NULL DEFAULT TRUE,
        requiere_comprobante BOOLEAN NOT NULL DEFAULT FALSE,
        es_efectivo BOOLEAN NOT NULL DEFAULT FALSE,
        permite_archivo BOOLEAN NOT NULL DEFAULT TRUE,
        activo BOOLEAN NOT NULL DEFAULT TRUE,
        orden INT NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅  metodos_pago — verificada/creada');

    // ── Seeds para metodos_pago ───────────────────────
    await connection.query(`
      INSERT IGNORE INTO metodos_pago (codigo, nombre, requiere_cuenta, requiere_comprobante, es_efectivo, orden) VALUES
      ('EFECTIVO', 'Efectivo', TRUE, FALSE, TRUE, 1),
      ('TRANSFERENCIA', 'Transferencia Bancaria', TRUE, TRUE, FALSE, 2),
      ('DEPOSITO', 'Depósito Bancario', TRUE, TRUE, FALSE, 3),
      ('TARJETA', 'Tarjeta de Crédito/Débito', TRUE, TRUE, FALSE, 4),
      ('CHEQUE', 'Cheque', TRUE, TRUE, FALSE, 5),
      ('CREDITO', 'Crédito a Favor', FALSE, FALSE, FALSE, 6),
      ('OTRO', 'Otro', TRUE, FALSE, FALSE, 7)
    `);

    // ── 2. pagos_pension ─────────────────────────────
    await connection.query(`
      CREATE TABLE IF NOT EXISTS pagos_pension (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        codigo VARCHAR(50) NOT NULL UNIQUE,
        numero_recibo VARCHAR(50) NOT NULL UNIQUE,
        estudiante_id BIGINT UNSIGNED NOT NULL,
        matricula_id BIGINT UNSIGNED NOT NULL,
        periodo_lectivo_id BIGINT UNSIGNED NOT NULL,
        fecha_pago DATE NOT NULL,
        valor_recibido DECIMAL(12,2) NOT NULL,
        valor_aplicado DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        credito_utilizado DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        credito_generado DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        estado VARCHAR(30) NOT NULL DEFAULT 'ACTIVO',
        observacion TEXT NULL,
        movimiento_financiero_id BIGINT UNSIGNED NULL,
        clave_idempotencia VARCHAR(100) NULL,
        cobrado_por BIGINT UNSIGNED NOT NULL,
        anulado_por BIGINT UNSIGNED NULL,
        anulado_at DATETIME NULL,
        motivo_anulacion TEXT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_pp_estudiante (estudiante_id),
        INDEX idx_pp_matricula (matricula_id),
        INDEX idx_pp_periodo (periodo_lectivo_id),
        INDEX idx_pp_fecha (fecha_pago),
        INDEX idx_pp_estado (estado),
        INDEX idx_pp_usuario (cobrado_por)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅  pagos_pension — verificada/creada');

    // ── 3. pago_pension_aplicaciones ─────────────────────────────
    await connection.query(`
      CREATE TABLE IF NOT EXISTS pago_pension_aplicaciones (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        pago_pension_id BIGINT UNSIGNED NOT NULL,
        obligacion_pension_id BIGINT UNSIGNED NOT NULL,
        valor_aplicado DECIMAL(12,2) NOT NULL,
        estado VARCHAR(30) NOT NULL DEFAULT 'ACTIVA',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_ppa_pago (pago_pension_id),
        INDEX idx_ppa_obligacion (obligacion_pension_id),
        INDEX idx_ppa_estado (estado)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅  pago_pension_aplicaciones — verificada/creada');

    // ── 4. pago_pension_metodos ─────────────────────────────
    await connection.query(`
      CREATE TABLE IF NOT EXISTS pago_pension_metodos (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        pago_pension_id BIGINT UNSIGNED NOT NULL,
        metodo_pago_id BIGINT UNSIGNED NOT NULL,
        cuenta_financiera_id BIGINT UNSIGNED NULL,
        valor DECIMAL(12,2) NOT NULL,
        numero_comprobante VARCHAR(150) NULL,
        referencia VARCHAR(200) NULL,
        archivo_url VARCHAR(500) NULL,
        observacion TEXT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_ppm_pago (pago_pension_id),
        INDEX idx_ppm_metodo (metodo_pago_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅  pago_pension_metodos — verificada/creada');

    // ── 5. creditos_estudiante ─────────────────────────────
    await connection.query(`
      CREATE TABLE IF NOT EXISTS creditos_estudiante (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        codigo VARCHAR(50) NOT NULL UNIQUE,
        estudiante_id BIGINT UNSIGNED NOT NULL,
        matricula_id BIGINT UNSIGNED NULL,
        pago_origen_id BIGINT UNSIGNED NULL,
        valor_original DECIMAL(12,2) NOT NULL,
        valor_utilizado DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        saldo_disponible DECIMAL(12,2) NOT NULL,
        fecha DATE NOT NULL,
        motivo TEXT NOT NULL,
        estado VARCHAR(30) NOT NULL DEFAULT 'ACTIVO',
        creado_por BIGINT UNSIGNED NOT NULL,
        anulado_por BIGINT UNSIGNED NULL,
        anulado_at DATETIME NULL,
        motivo_anulacion TEXT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_ce_estudiante (estudiante_id),
        INDEX idx_ce_matricula (matricula_id),
        INDEX idx_ce_origen (pago_origen_id),
        INDEX idx_ce_estado (estado),
        INDEX idx_ce_saldo (saldo_disponible)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅  creditos_estudiante — verificada/creada');

    // ── 6. credito_aplicaciones ─────────────────────────────
    await connection.query(`
      CREATE TABLE IF NOT EXISTS credito_aplicaciones (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        credito_estudiante_id BIGINT UNSIGNED NOT NULL,
        pago_pension_id BIGINT UNSIGNED NULL,
        obligacion_pension_id BIGINT UNSIGNED NOT NULL,
        valor_aplicado DECIMAL(12,2) NOT NULL,
        estado VARCHAR(30) NOT NULL DEFAULT 'ACTIVA',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_ca_credito (credito_estudiante_id),
        INDEX idx_ca_pago (pago_pension_id),
        INDEX idx_ca_obligacion (obligacion_pension_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅  credito_aplicaciones — verificada/creada');

    // ── 7. historial_pago_pension ─────────────────────────────
    await connection.query(`
      CREATE TABLE IF NOT EXISTS historial_pago_pension (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        pago_pension_id BIGINT UNSIGNED NOT NULL,
        accion VARCHAR(80) NOT NULL,
        datos_anteriores JSON NULL,
        datos_nuevos JSON NULL,
        motivo TEXT NULL,
        usuario_id BIGINT UNSIGNED NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_hpp_pago (pago_pension_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅  historial_pago_pension — verificada/creada');

    console.log('🎉 Migración de Cobros completada con éxito.');
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
