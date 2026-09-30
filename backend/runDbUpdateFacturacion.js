/**
 * ============================================================
 * Migración: Módulo Facturación — Cobro de Pensiones
 * Ejecución: node backend/runDbUpdateFacturacion.js
 * ============================================================
 */
const pool = require('./config/db');

async function crearIndice(conn, sql) {
  try {
    await conn.query(sql);
  } catch (e) {
    if (e.code !== 'ER_DUP_KEYNAME') throw e;
  }
}

async function runMigration() {
  const conn = await pool.getConnection();
  try {
    console.log('\n🔄 Iniciando migración: Módulo de Facturación...\n');
    // ─────────────────────────────────────────────────────────
    console.log('  📋 Creando tabla institucion_config...');
    await conn.query(`
      CREATE TABLE IF NOT EXISTS institucion_config (
        id                      INT AUTO_INCREMENT PRIMARY KEY,
        razon_social            VARCHAR(255) NOT NULL DEFAULT 'UNIDAD EDUCATIVA JUAN LEÓN MERA',
        nombre_comercial        VARCHAR(255) NOT NULL DEFAULT 'UE JUAN LEÓN MERA',
        ruc                     VARCHAR(13)  NOT NULL DEFAULT '1391700000001',
        direccion_matriz        VARCHAR(300) NOT NULL DEFAULT 'Calle Principal y Av. Central, Jaramijó, Manabí, Ecuador',
        direccion_establecimiento VARCHAR(300) NOT NULL DEFAULT 'Calle Principal y Av. Central, Jaramijó, Manabí, Ecuador',
        telefono                VARCHAR(30)  NOT NULL DEFAULT '052600000',
        email                   VARCHAR(150) NOT NULL DEFAULT 'colecturia@juanleonmera.edu.ec',
        logo                    VARCHAR(255) NULL     DEFAULT '/uploads/logo.png',
        obligado_contabilidad   ENUM('SI','NO') NOT NULL DEFAULT 'NO',
        contribuyente_especial  VARCHAR(20)  NULL     DEFAULT NULL,
        regimen                 ENUM('GENERAL','RIMPE_EMPRENDEDOR','RIMPE_POPULAR') NOT NULL DEFAULT 'RIMPE_EMPRENDEDOR',
        ambiente                TINYINT      NOT NULL DEFAULT 1 COMMENT '1: Pruebas, 2: Producción',
        codigo_establecimiento  VARCHAR(3)   NOT NULL DEFAULT '001',
        codigo_punto_emision    VARCHAR(3)   NOT NULL DEFAULT '001',
        tarifa_iva_defecto      DECIMAL(5,2) NOT NULL DEFAULT 0.00,
        facturacion_automatica  TINYINT(1)   NOT NULL DEFAULT 0,
        created_at              TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
        updated_at              TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('  ✅ institucion_config creada.');

    // Seed inicial de institucion_config
    await conn.query(`
      INSERT IGNORE INTO institucion_config (
        id, razon_social, nombre_comercial, ruc, direccion_matriz, direccion_establecimiento,
        telefono, email, obligado_contabilidad, contribuyente_especial, regimen, ambiente,
        codigo_establecimiento, codigo_punto_emision, tarifa_iva_defecto, facturacion_automatica
      ) VALUES (
        1,
        'UNIDAD EDUCATIVA JUAN LEÓN MERA',
        'UE JUAN LEÓN MERA',
        '1391700000001',
        'Calle Principal y Av. Central, Jaramijó, Manabí, Ecuador',
        'Calle Principal y Av. Central, Jaramijó, Manabí, Ecuador',
        '052600000',
        'colecturia@juanleonmera.edu.ec',
        'NO',
        NULL,
        'RIMPE_EMPRENDEDOR',
        1,
        '001',
        '001',
        0.00,
        0
      )
    `);
    console.log('  ✅ Semilla de institucion_config lista.\n');

    // ─────────────────────────────────────────────────────────
    // 2. clientes_facturacion
    // ─────────────────────────────────────────────────────────
    console.log('  📋 Creando tabla clientes_facturacion...');
    await conn.query(`
      CREATE TABLE IF NOT EXISTS clientes_facturacion (
        id                   INT AUTO_INCREMENT PRIMARY KEY,
        tipo_identificacion  ENUM('CEDULA', 'RUC', 'PASAPORTE', 'CONSUMIDOR_FINAL') NOT NULL DEFAULT 'CEDULA',
        identificacion       VARCHAR(20)  NOT NULL,
        razon_social         VARCHAR(200) NOT NULL,
        direccion            VARCHAR(300) NOT NULL DEFAULT 'S/N',
        telefono             VARCHAR(30)  NULL,
        email                VARCHAR(150) NOT NULL DEFAULT 'facturacion@juanleonmera.edu.ec',
        activo               TINYINT(1)   NOT NULL DEFAULT 1,
        created_at           TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
        updated_at           TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_cli_ident (identificacion)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await crearIndice(conn, 'ALTER TABLE clientes_facturacion ADD INDEX idx_cf_ident (identificacion)');
    await crearIndice(conn, 'ALTER TABLE clientes_facturacion ADD INDEX idx_cf_nombre (razon_social)');

    // Seed Consumidor Final
    await conn.query(`
      INSERT IGNORE INTO clientes_facturacion (
        id, tipo_identificacion, identificacion, razon_social, direccion, telefono, email, activo
      ) VALUES (
        1,
        'CONSUMIDOR_FINAL',
        '9999999999999',
        'CONSUMIDOR FINAL',
        'CIUDAD',
        '9999999999',
        'consumidorfinal@juanleonmera.edu.ec',
        1
      )
    `);
    console.log('  ✅ clientes_facturacion creada (incluye Consumidor Final).');

    // Migrar representantes existentes que tengan cédula
    try {
      await conn.query(`
        INSERT IGNORE INTO clientes_facturacion (tipo_identificacion, identificacion, razon_social, direccion, telefono, email)
        SELECT 
          IF(LENGTH(TRIM(r.cedula)) = 13, 'RUC', 'CEDULA') AS tipo_identificacion,
          TRIM(r.cedula) AS identificacion,
          TRIM(CONCAT(r.apellidos, ' ', r.nombres)) AS razon_social,
          COALESCE(NULLIF(TRIM(r.direccion), ''), 'Jaramijó, Manabí') AS direccion,
          NULLIF(TRIM(r.telefono), '') AS telefono,
          COALESCE(NULLIF(TRIM(r.correo), ''), 'representante@juanleonmera.edu.ec') AS email
        FROM representantes r
        WHERE r.cedula IS NOT NULL AND TRIM(r.cedula) != ''
      `);
      console.log('  ✅ Representantes migrados a clientes de facturación.');
    } catch (migErr) {
      console.warn('  ⚠️ Aviso migración representantes:', migErr.message);
    }
    console.log('');

    // ─────────────────────────────────────────────────────────
    // 3. estudiante_clientes_facturacion
    // ─────────────────────────────────────────────────────────
    console.log('  📋 Creando tabla estudiante_clientes_facturacion...');
    await conn.query(`
      CREATE TABLE IF NOT EXISTS estudiante_clientes_facturacion (
        id                INT AUTO_INCREMENT PRIMARY KEY,
        estudiante_id     INT NOT NULL,
        cliente_id        INT NOT NULL,
        es_predeterminado TINYINT(1) NOT NULL DEFAULT 1,
        created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_est_cli (estudiante_id, cliente_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await crearIndice(conn, 'ALTER TABLE estudiante_clientes_facturacion ADD INDEX idx_ecf_est (estudiante_id)');
    await crearIndice(conn, 'ALTER TABLE estudiante_clientes_facturacion ADD INDEX idx_ecf_cli (cliente_id)');

    // FKs
    try {
      await conn.query(`
        ALTER TABLE estudiante_clientes_facturacion
        ADD CONSTRAINT fk_ecf_est
          FOREIGN KEY (estudiante_id)
          REFERENCES estudiantes(id_estudiante)
          ON DELETE CASCADE ON UPDATE CASCADE
      `);
    } catch (_) {}

    try {
      await conn.query(`
        ALTER TABLE estudiante_clientes_facturacion
        ADD CONSTRAINT fk_ecf_cli
          FOREIGN KEY (cliente_id)
          REFERENCES clientes_facturacion(id)
          ON DELETE CASCADE ON UPDATE CASCADE
      `);
    } catch (_) {}

    // Ligar estudiantes con sus representantes migrados
    try {
      await conn.query(`
        INSERT IGNORE INTO estudiante_clientes_facturacion (estudiante_id, cliente_id, es_predeterminado)
        SELECT 
          e.id_estudiante,
          cf.id AS cliente_id,
          1 AS es_predeterminado
        FROM estudiantes e
        JOIN representantes r ON e.id_representante = r.id_representante
        JOIN clientes_facturacion cf ON cf.identificacion = TRIM(r.cedula)
      `);
      console.log('  ✅ Vínculo automático estudiantes-representantes completado.');
    } catch (linkErr) {
      console.warn('  ⚠️ Aviso vinculación estudiante-cliente:', linkErr.message);
    }
    console.log('  ✅ estudiante_clientes_facturacion lista.\n');

    // ─────────────────────────────────────────────────────────
    // 4. secuenciales
    // ─────────────────────────────────────────────────────────
    console.log('  📋 Creando tabla secuenciales...');
    await conn.query(`
      CREATE TABLE IF NOT EXISTS secuenciales (
        establecimiento   VARCHAR(3)   NOT NULL DEFAULT '001',
        punto_emision     VARCHAR(3)   NOT NULL DEFAULT '001',
        tipo_comprobante  VARCHAR(15)  NOT NULL DEFAULT 'FACTURA',
        ultimo_secuencial INT UNSIGNED NOT NULL DEFAULT 0,
        updated_at        TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (establecimiento, punto_emision, tipo_comprobante)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await conn.query(`
      INSERT IGNORE INTO secuenciales (establecimiento, punto_emision, tipo_comprobante, ultimo_secuencial)
      VALUES ('001', '001', 'FACTURA', 0)
    `);
    console.log('  ✅ secuenciales creada con valor inicial 0.\n');

    // ─────────────────────────────────────────────────────────
    // 5. facturas
    // ─────────────────────────────────────────────────────────
    console.log('  📋 Creando tabla facturas...');
    await conn.query(`
      CREATE TABLE IF NOT EXISTS facturas (
        id                   INT AUTO_INCREMENT PRIMARY KEY,
        numero               VARCHAR(17)   NOT NULL,
        establecimiento      VARCHAR(3)    NOT NULL DEFAULT '001',
        punto_emision        VARCHAR(3)    NOT NULL DEFAULT '001',
        secuencial           INT UNSIGNED  NOT NULL,
        fecha_emision        DATE          NOT NULL,
        cliente_id           INT           NOT NULL,
        estudiante_id        INT           NOT NULL,
        anio_lectivo         VARCHAR(20)   NOT NULL,
        subtotal_0           DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        subtotal_iva         DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        descuento            DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        tarifa_iva           DECIMAL(5,2)  NOT NULL DEFAULT 0.00,
        iva                  DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        total                DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        forma_pago           ENUM('EFECTIVO','TRANSFERENCIA','TARJETA','DEPOSITO') NOT NULL DEFAULT 'EFECTIVO',
        observaciones        TEXT          NULL,
        estado               ENUM('EMITIDA','ANULADA') NOT NULL DEFAULT 'EMITIDA',
        motivo_anulacion     TEXT          NULL,
        anulado_at           DATETIME      NULL,
        anulado_por          INT           NULL,
        usuario_id           INT           NULL,
        clave_acceso         VARCHAR(49)   NULL,
        numero_autorizacion  VARCHAR(49)   NULL,
        fecha_autorizacion   DATETIME      NULL,
        estado_sri           ENUM('NO_ENVIADA','AUTORIZADA','RECHAZADA') NOT NULL DEFAULT 'NO_ENVIADA',
        mensaje_sri          TEXT          NULL,
        xml_firmado          LONGTEXT      NULL,
        created_at           TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
        updated_at           TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_factura_num (numero)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await crearIndice(conn, 'ALTER TABLE facturas ADD INDEX idx_fac_cliente (cliente_id)');
    await crearIndice(conn, 'ALTER TABLE facturas ADD INDEX idx_fac_estudiante (estudiante_id)');
    await crearIndice(conn, 'ALTER TABLE facturas ADD INDEX idx_fac_fecha (fecha_emision)');
    await crearIndice(conn, 'ALTER TABLE facturas ADD INDEX idx_fac_estado (estado)');
    await crearIndice(conn, 'ALTER TABLE facturas ADD INDEX idx_fac_anio (anio_lectivo)');

    try {
      await conn.query(`
        ALTER TABLE facturas
        ADD CONSTRAINT fk_fac_cli
          FOREIGN KEY (cliente_id)
          REFERENCES clientes_facturacion(id)
          ON DELETE RESTRICT ON UPDATE CASCADE
      `);
    } catch (_) {}

    try {
      await conn.query(`
        ALTER TABLE facturas
        ADD CONSTRAINT fk_fac_est
          FOREIGN KEY (estudiante_id)
          REFERENCES estudiantes(id_estudiante)
          ON DELETE RESTRICT ON UPDATE CASCADE
      `);
    } catch (_) {}

    try {
      await conn.query(`
        ALTER TABLE facturas
        ADD CONSTRAINT fk_fac_usr
          FOREIGN KEY (usuario_id)
          REFERENCES usuarios(id_usuario)
          ON DELETE SET NULL ON UPDATE CASCADE
      `);
    } catch (_) {}
    console.log('  ✅ facturas creada exitosamente.\n');

    // ─────────────────────────────────────────────────────────
    // 6. factura_detalles
    // ─────────────────────────────────────────────────────────
    console.log('  📋 Creando tabla factura_detalles...');
    await conn.query(`
      CREATE TABLE IF NOT EXISTS factura_detalles (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        factura_id      INT           NOT NULL,
        pago_id         INT           NULL,
        codigo          VARCHAR(50)   NOT NULL DEFAULT 'PEN',
        descripcion     VARCHAR(255)  NOT NULL,
        cantidad        INT           NOT NULL DEFAULT 1,
        precio_unitario DECIMAL(12,2) NOT NULL,
        descuento       DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        tarifa_iva      DECIMAL(5,2)  NOT NULL DEFAULT 0.00,
        valor_iva       DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        total           DECIMAL(12,2) NOT NULL,
        created_at      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await crearIndice(conn, 'ALTER TABLE factura_detalles ADD INDEX idx_fd_factura (factura_id)');
    await crearIndice(conn, 'ALTER TABLE factura_detalles ADD INDEX idx_fd_pago (pago_id)');

    try {
      await conn.query(`
        ALTER TABLE factura_detalles
        ADD CONSTRAINT fk_fd_factura
          FOREIGN KEY (factura_id)
          REFERENCES facturas(id)
          ON DELETE CASCADE ON UPDATE CASCADE
      `);
    } catch (_) {}

    try {
      await conn.query(`
        ALTER TABLE factura_detalles
        ADD CONSTRAINT fk_fd_pago
          FOREIGN KEY (pago_id)
          REFERENCES pension_pagos(id)
          ON DELETE RESTRICT ON UPDATE CASCADE
      `);
    } catch (_) {}
    console.log('  ✅ factura_detalles creada exitosamente.\n');

    // ─────────────────────────────────────────────────────────
    // 7. Modificar pension_pagos para incluir factura_id
    // ─────────────────────────────────────────────────────────
    console.log('  📋 Verificando columna factura_id en pension_pagos...');
    try {
      const [colCheck] = await conn.query(`
        SELECT COUNT(*) AS total FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'pension_pagos'
          AND COLUMN_NAME = 'factura_id'
      `);
      if (colCheck[0].total === 0) {
        await conn.query(`
          ALTER TABLE pension_pagos
          ADD COLUMN factura_id INT NULL AFTER numero_recibo
        `);
        await crearIndice(conn, 'ALTER TABLE pension_pagos ADD INDEX idx_ppa_factura (factura_id)');
        console.log('  ✅ Columna factura_id agregada a pension_pagos.');
      } else {
        console.log('  ℹ️ Columna factura_id ya existe en pension_pagos.');
      }
    } catch (e) {
      console.warn('  ⚠️ Aviso pension_pagos alter:', e.message);
    }

    console.log('\n====================================================');
    console.log('🎉 Migración de Facturación completada con éxito.');
    console.log('====================================================\n');
    return { success: true, message: 'Migración completada con éxito' };
  } catch (err) {
    console.error('\n❌ Error en migración:', err);
    if (require.main === module) process.exit(1);
    throw err;
  } finally {
    conn.release();
  }
}

// Ejecutar migración si es llamado directamente por CLI
if (require.main === module) {
  runMigration().then(() => process.exit(0)).catch(() => process.exit(1));
}

module.exports = { runMigration };

