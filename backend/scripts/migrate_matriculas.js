require('dotenv').config();
const mysql = require('mysql2/promise');

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'sistema_cobranzas'
  });

  console.log('--- Iniciando Migración: Módulo de Matrículas ---');

  try {
    // 1. tipos_matricula
    await connection.query(`
      CREATE TABLE IF NOT EXISTS tipos_matricula (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        codigo VARCHAR(30) NOT NULL UNIQUE,
        nombre VARCHAR(100) NOT NULL,
        descripcion TEXT NULL,
        activo BOOLEAN NOT NULL DEFAULT TRUE,
        orden INT NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('Tabla tipos_matricula creada/verificada.');

    // 2. tarifas_matricula
    await connection.query(`
      CREATE TABLE IF NOT EXISTS tarifas_matricula (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        periodo_lectivo_id BIGINT UNSIGNED NOT NULL,
        nivel_id BIGINT UNSIGNED NOT NULL,
        curso_id BIGINT UNSIGNED NULL,
        tipo_matricula_id BIGINT UNSIGNED NOT NULL,
        valor DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        fecha_desde DATE NOT NULL,
        fecha_hasta DATE NULL,
        activo BOOLEAN NOT NULL DEFAULT TRUE,
        observacion TEXT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('Tabla tarifas_matricula creada/verificada.');

    // 3. matriculas_nuevas (le ponemos matriculas_nuevas temporalmente si ya existe matriculas, o vemos)
    // El sistema dice: "Revisa si ya existe una tabla de matrículas. Si existen tablas analiza primero su función y reutilízalas cuando sean compatibles."
    // Para simplificar y seguir el modelo exacto que pidio el usuario, vamos a renombrar la anterior si existe
    const [tables] = await connection.query("SHOW TABLES LIKE 'matriculas'");
    if (tables.length > 0) {
       const [cols] = await connection.query("SHOW COLUMNS FROM matriculas");
       const colNames = cols.map(c => c.Field);
       if (!colNames.includes('oferta_academica_id')) {
          console.log('Renombrando tabla matriculas antigua a matriculas_legacy...');
          await connection.query("RENAME TABLE matriculas TO matriculas_legacy");
       }
    }

    await connection.query(`
      CREATE TABLE IF NOT EXISTS matriculas (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        numero_matricula VARCHAR(50) NOT NULL UNIQUE,
        estudiante_id INT NOT NULL,
        periodo_lectivo_id BIGINT UNSIGNED NOT NULL,
        oferta_academica_id BIGINT UNSIGNED NOT NULL,
        tipo_matricula_id BIGINT UNSIGNED NOT NULL,
        fecha_matricula DATE NOT NULL,
        es_estudiante_nuevo BOOLEAN NOT NULL DEFAULT FALSE,
        representante_principal_id INT NULL,
        responsable_economico_id INT NULL,
        tarifa_base DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        tipo_descuento VARCHAR(20) NULL,
        valor_descuento DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        tipo_recargo VARCHAR(20) NULL,
        valor_recargo DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        valor_final DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        total_pagado DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        saldo DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        estado VARCHAR(30) NOT NULL DEFAULT 'BORRADOR',
        observacion TEXT NULL,
        confirmado_por BIGINT UNSIGNED NULL,
        confirmado_at DATETIME NULL,
        anulado_por BIGINT UNSIGNED NULL,
        anulado_at DATETIME NULL,
        motivo_anulacion VARCHAR(500) NULL,
        creado_por BIGINT UNSIGNED NULL,
        actualizado_por BIGINT UNSIGNED NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_estudiante_periodo (estudiante_id, periodo_lectivo_id),
        INDEX idx_oferta (oferta_academica_id),
        INDEX idx_estado (estado),
        INDEX idx_responsable (responsable_economico_id)
      )
    `);
    console.log('Tabla matriculas creada/verificada.');

    // 4. pagos_matricula
    await connection.query(`
      CREATE TABLE IF NOT EXISTS pagos_matricula (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        matricula_id BIGINT UNSIGNED NOT NULL,
        fecha DATE NOT NULL,
        valor DECIMAL(12,2) NOT NULL,
        metodo_pago_id BIGINT UNSIGNED NULL,
        cuenta_financiera_id BIGINT UNSIGNED NULL,
        numero_comprobante VARCHAR(100) NULL,
        archivo_url VARCHAR(500) NULL,
        observacion TEXT NULL,
        estado VARCHAR(30) NOT NULL DEFAULT 'ACTIVO',
        movimiento_financiero_id BIGINT UNSIGNED NULL,
        usuario_id BIGINT UNSIGNED NULL,
        anulado_por BIGINT UNSIGNED NULL,
        anulado_at DATETIME NULL,
        motivo_anulacion VARCHAR(500) NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_matricula (matricula_id),
        INDEX idx_movimiento (movimiento_financiero_id)
      )
    `);
    console.log('Tabla pagos_matricula creada/verificada.');

    // 5. historial_matricula_oferta
    await connection.query(`
      CREATE TABLE IF NOT EXISTS historial_matricula_oferta (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        matricula_id BIGINT UNSIGNED NOT NULL,
        oferta_anterior_id BIGINT UNSIGNED NOT NULL,
        oferta_nueva_id BIGINT UNSIGNED NOT NULL,
        motivo VARCHAR(500) NULL,
        usuario_id BIGINT UNSIGNED NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_matricula_historial (matricula_id)
      )
    `);
    console.log('Tabla historial_matricula_oferta creada/verificada.');

  } catch (error) {
    console.error('Error durante la migración de matrículas:', error);
  } finally {
    await connection.end();
  }
}

migrate();
