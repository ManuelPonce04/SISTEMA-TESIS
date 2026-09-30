/**
 * Migración: Módulo Configuración de Pensiones
 * Tablas: tarifas_pension, periodo_meses_cobrables,
 *         tipos_beneficio_pension, beneficio_compatibilidades,
 *         configuracion_financiera_pensiones, auditoria_pensiones
 *
 * IDEMPOTENTE: puede ejecutarse varias veces sin romper datos.
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'sistema_cobranzas',
  });

  console.log('\n========================================');
  console.log('  Migración: Configuración de Pensiones');
  console.log('========================================\n');

  try {
    // ── 1. tarifas_pension ─────────────────────────────────────
    await connection.query(`
      CREATE TABLE IF NOT EXISTS tarifas_pension (
        id                 BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        periodo_lectivo_id BIGINT UNSIGNED NOT NULL,
        nivel_id           BIGINT UNSIGNED NULL,
        subnivel_id        BIGINT UNSIGNED NULL,
        curso_id           BIGINT UNSIGNED NULL,
        valor_mensual      DECIMAL(12,2) NOT NULL,
        mes_desde          DATE NOT NULL,
        mes_hasta          DATE NOT NULL,
        fecha_desde        DATE NULL,
        fecha_hasta        DATE NULL,
        prioridad          INT NOT NULL DEFAULT 0,
        estado             VARCHAR(30) NOT NULL DEFAULT 'BORRADOR',
        observacion        TEXT NULL,
        creado_por         BIGINT UNSIGNED NOT NULL,
        actualizado_por    BIGINT UNSIGNED NULL,
        created_at         DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at         DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_tp_periodo  (periodo_lectivo_id),
        INDEX idx_tp_nivel    (nivel_id),
        INDEX idx_tp_subnivel (subnivel_id),
        INDEX idx_tp_curso    (curso_id),
        INDEX idx_tp_estado   (estado),
        INDEX idx_tp_meses    (mes_desde, mes_hasta)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅  tarifas_pension — verificada/creada');

    // ── 2. periodo_meses_cobrables ─────────────────────────────
    await connection.query(`
      CREATE TABLE IF NOT EXISTS periodo_meses_cobrables (
        id                 BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        periodo_lectivo_id BIGINT UNSIGNED NOT NULL,
        mes                DATE NOT NULL COMMENT 'Primer día del mes: 2026-05-01',
        nombre_mostrar     VARCHAR(50) NOT NULL,
        numero_orden       INT NOT NULL,
        fecha_emision      DATE NULL,
        fecha_vencimiento  DATE NOT NULL,
        cobrable           BOOLEAN NOT NULL DEFAULT TRUE,
        estado             VARCHAR(30) NOT NULL DEFAULT 'PLANIFICADO',
        observacion        TEXT NULL,
        created_at         DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at         DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unq_pmc_periodo_mes (periodo_lectivo_id, mes),
        INDEX idx_pmc_periodo    (periodo_lectivo_id),
        INDEX idx_pmc_vencimiento (fecha_vencimiento),
        INDEX idx_pmc_estado     (estado)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅  periodo_meses_cobrables — verificada/creada');

    // ── 3. tipos_beneficio_pension ─────────────────────────────
    await connection.query(`
      CREATE TABLE IF NOT EXISTS tipos_beneficio_pension (
        id                       BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        codigo                   VARCHAR(40) NOT NULL UNIQUE,
        nombre                   VARCHAR(150) NOT NULL,
        descripcion              TEXT NULL,
        categoria                VARCHAR(40) NOT NULL
                                   COMMENT 'BECA|DESCUENTO|PENSION_DIFERENCIADA|EXONERACION|CONVENIO|OTRO',
        tipo_calculo             VARCHAR(30) NOT NULL
                                   COMMENT 'PORCENTAJE|VALOR_FIJO|VALOR_FINAL|EXONERACION_TOTAL',
        valor_predeterminado     DECIMAL(12,2) NULL,
        porcentaje_predeterminado DECIMAL(7,4) NULL,
        requiere_documento       BOOLEAN NOT NULL DEFAULT FALSE,
        requiere_autorizacion    BOOLEAN NOT NULL DEFAULT TRUE,
        permite_acumulacion      BOOLEAN NOT NULL DEFAULT FALSE,
        prioridad                INT NOT NULL DEFAULT 0,
        activo                   BOOLEAN NOT NULL DEFAULT TRUE,
        created_at               DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at               DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_tbp_categoria    (categoria),
        INDEX idx_tbp_tipo_calculo (tipo_calculo),
        INDEX idx_tbp_activo       (activo),
        INDEX idx_tbp_prioridad    (prioridad)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅  tipos_beneficio_pension — verificada/creada');

    // ── 4. beneficio_compatibilidades ──────────────────────────
    await connection.query(`
      CREATE TABLE IF NOT EXISTS beneficio_compatibilidades (
        id                     BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        beneficio_id           BIGINT UNSIGNED NOT NULL,
        beneficio_relacionado_id BIGINT UNSIGNED NOT NULL,
        son_compatibles        BOOLEAN NOT NULL DEFAULT FALSE,
        observacion            TEXT NULL,
        created_at             DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at             DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unq_bc_par (beneficio_id, beneficio_relacionado_id),
        INDEX idx_bc_beneficio (beneficio_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅  beneficio_compatibilidades — verificada/creada');

    // ── 5. configuracion_financiera_pensiones ──────────────────
    await connection.query(`
      CREATE TABLE IF NOT EXISTS configuracion_financiera_pensiones (
        id                    BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        periodo_lectivo_id    BIGINT UNSIGNED NULL COMMENT 'NULL = configuración global',
        tipo_operacion        VARCHAR(60) NOT NULL
                                COMMENT 'COBRO_PENSION_NORMAL|COBRO_PENSION_DIFERENCIADA|COBRO_PENSION_ANTERIOR|RECARGO_PENSION|DEVOLUCION_PENSION',
        catalogo_movimiento_id BIGINT UNSIGNED NULL,
        activo                BOOLEAN NOT NULL DEFAULT TRUE,
        observacion           TEXT NULL,
        created_at            DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at            DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unq_cfp_periodo_tipo (periodo_lectivo_id, tipo_operacion)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅  configuracion_financiera_pensiones — verificada/creada');

    // ── 6. auditoria_pensiones ─────────────────────────────────
    await connection.query(`
      CREATE TABLE IF NOT EXISTS auditoria_pensiones (
        id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        entidad       VARCHAR(80) NOT NULL,
        entidad_id    BIGINT UNSIGNED NULL,
        accion        VARCHAR(60) NOT NULL,
        datos_antes   JSON NULL,
        datos_despues JSON NULL,
        motivo        TEXT NULL,
        usuario_id    BIGINT UNSIGNED NULL,
        usuario_nombre VARCHAR(150) NULL,
        ip            VARCHAR(45) NULL,
        user_agent    TEXT NULL,
        created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_ap_entidad   (entidad),
        INDEX idx_ap_entidad_id (entidad_id),
        INDEX idx_ap_usuario   (usuario_id),
        INDEX idx_ap_created   (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅  auditoria_pensiones — verificada/creada');

    // ── 7. Seeds iniciales de configuracion_financiera_pensiones
    const tiposOp = [
      'COBRO_PENSION_NORMAL',
      'COBRO_PENSION_DIFERENCIADA',
      'COBRO_PENSION_ANTERIOR',
      'RECARGO_PENSION',
      'DEVOLUCION_PENSION',
    ];
    for (const tipo of tiposOp) {
      await connection.query(
        `INSERT IGNORE INTO configuracion_financiera_pensiones
           (periodo_lectivo_id, tipo_operacion, activo)
         VALUES (NULL, ?, TRUE)`,
        [tipo]
      );
    }
    console.log('✅  configuracion_financiera_pensiones — tipos de operación iniciales insertados');

    console.log('\n✅✅ Migración completada exitosamente\n');
  } catch (error) {
    console.error('\n❌ Error durante la migración:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

migrate();
