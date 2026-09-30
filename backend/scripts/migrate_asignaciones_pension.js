/**
 * Migración: Módulo Asignación Individual de Pensión
 * Tablas: asignaciones_pension, asignacion_pension_beneficios,
 *         asignacion_pension_documentos, historial_asignacion_pension
 * IDEMPOTENTE — puede ejecutarse múltiples veces.
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

  console.log('\n=============================================');
  console.log('  Migración: Asignación Individual de Pensión');
  console.log('=============================================\n');

  try {
    // ── 1. asignaciones_pension ────────────────────────────────
    await connection.query(`
      CREATE TABLE IF NOT EXISTS asignaciones_pension (
        id                      BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        matricula_id            BIGINT UNSIGNED NOT NULL,
        periodo_lectivo_id      BIGINT UNSIGNED NOT NULL,
        tarifa_pension_id       BIGINT UNSIGNED NOT NULL,
        mes_desde               DATE NOT NULL COMMENT 'Primer día del mes desde: 2026-05-01',
        mes_hasta               DATE NOT NULL COMMENT 'Primer día del mes hasta: 2027-02-01',
        tarifa_base_snapshot    DECIMAL(12,2) NOT NULL,
        descuento_total_snapshot DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        valor_mensual_final     DECIMAL(12,2) NOT NULL,
        regla_tarifa_snapshot   JSON NULL COMMENT 'Snapshot de la regla de tarifa al momento de aprobar',
        estado                  VARCHAR(40) NOT NULL DEFAULT 'BORRADOR'
                                  COMMENT 'BORRADOR|PENDIENTE_APROBACION|APROBADA|ACTIVA|SUSPENDIDA|FINALIZADA|RECHAZADA|ANULADA',
        motivo                  TEXT NULL,
        observacion             TEXT NULL,
        solicitado_por          BIGINT UNSIGNED NULL,
        solicitado_at           DATETIME NULL,
        aprobado_por            BIGINT UNSIGNED NULL,
        aprobado_at             DATETIME NULL,
        rechazado_por           BIGINT UNSIGNED NULL,
        rechazado_at            DATETIME NULL,
        motivo_rechazo          TEXT NULL,
        anulado_por             BIGINT UNSIGNED NULL,
        anulado_at              DATETIME NULL,
        motivo_anulacion        TEXT NULL,
        creado_por              BIGINT UNSIGNED NOT NULL,
        actualizado_por         BIGINT UNSIGNED NULL,
        created_at              DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at              DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_ap_matricula        (matricula_id),
        INDEX idx_ap_periodo          (periodo_lectivo_id),
        INDEX idx_ap_tarifa           (tarifa_pension_id),
        INDEX idx_ap_estado           (estado),
        INDEX idx_ap_mes_desde        (mes_desde),
        INDEX idx_ap_mes_hasta        (mes_hasta),
        INDEX idx_ap_aprobado_at      (aprobado_at),
        INDEX idx_ap_solicitado_por   (solicitado_por)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅  asignaciones_pension — verificada/creada');

    // ── 2. asignacion_pension_beneficios ───────────────────────
    await connection.query(`
      CREATE TABLE IF NOT EXISTS asignacion_pension_beneficios (
        id                       BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        asignacion_pension_id    BIGINT UNSIGNED NOT NULL,
        tipo_beneficio_id        BIGINT UNSIGNED NOT NULL,
        tipo_calculo_snapshot    VARCHAR(30) NOT NULL,
        porcentaje_aplicado      DECIMAL(7,4) NULL,
        valor_aplicado           DECIMAL(12,2) NULL,
        valor_final_especial     DECIMAL(12,2) NULL,
        prioridad_snapshot       INT NOT NULL DEFAULT 0,
        mes_desde                DATE NOT NULL,
        mes_hasta                DATE NOT NULL,
        motivo                   TEXT NOT NULL,
        requiere_documento_snapshot BOOLEAN NOT NULL DEFAULT FALSE,
        estado                   VARCHAR(30) NOT NULL DEFAULT 'ACTIVO'
                                   COMMENT 'ACTIVO|SUSPENDIDO|ELIMINADO',
        created_at               DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at               DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_apb_asignacion     (asignacion_pension_id),
        INDEX idx_apb_tipo_beneficio (tipo_beneficio_id),
        INDEX idx_apb_estado         (estado)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅  asignacion_pension_beneficios — verificada/creada');

    // ── 3. asignacion_pension_documentos ───────────────────────
    await connection.query(`
      CREATE TABLE IF NOT EXISTS asignacion_pension_documentos (
        id                    BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        asignacion_pension_id BIGINT UNSIGNED NOT NULL,
        beneficio_asignado_id BIGINT UNSIGNED NULL,
        tipo_documento        VARCHAR(100) NULL,
        nombre_original       VARCHAR(255) NOT NULL,
        nombre_interno        VARCHAR(255) NOT NULL COMMENT 'UUID + extension, sin acceso publico directo',
        mime_type             VARCHAR(100) NOT NULL,
        tamano_bytes          BIGINT UNSIGNED NOT NULL,
        ruta_segura           VARCHAR(500) NOT NULL,
        subido_por            BIGINT UNSIGNED NOT NULL,
        created_at            DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_apd_asignacion  (asignacion_pension_id),
        INDEX idx_apd_beneficio   (beneficio_asignado_id),
        INDEX idx_apd_subido_por  (subido_por),
        INDEX idx_apd_created     (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅  asignacion_pension_documentos — verificada/creada');

    // ── 4. historial_asignacion_pension ────────────────────────
    await connection.query(`
      CREATE TABLE IF NOT EXISTS historial_asignacion_pension (
        id                    BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        asignacion_pension_id BIGINT UNSIGNED NOT NULL,
        accion                VARCHAR(60) NOT NULL
                                COMMENT 'CREAR|EDITAR|ENVIAR_APROBACION|APROBAR|RECHAZAR|ACTIVAR|SUSPENDER|NUEVA_VIGENCIA|FINALIZAR|ANULAR|SUBIR_DOCUMENTO|ELIMINAR_DOCUMENTO|ASIGNACION_MASIVA',
        estado_anterior       VARCHAR(40) NULL,
        estado_nuevo          VARCHAR(40) NULL,
        datos_anteriores      JSON NULL,
        datos_nuevos          JSON NULL,
        motivo                TEXT NULL,
        usuario_id            BIGINT UNSIGNED NULL,
        usuario_nombre        VARCHAR(150) NULL,
        created_at            DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_hap_asignacion (asignacion_pension_id),
        INDEX idx_hap_accion     (accion),
        INDEX idx_hap_usuario    (usuario_id),
        INDEX idx_hap_created    (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅  historial_asignacion_pension — verificada/creada');

    console.log('\n✅✅ Migración completada exitosamente\n');
  } catch (error) {
    console.error('\n❌ Error durante la migración:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

migrate();
