/**
 * ============================================================
 * Migración: Rol de Pagos (Nómina)
 * ============================================================
 */
const pool = require('./config/db');

async function runMigration() {
  try {
    console.log('🔄 Iniciando migración: Rol de Pagos...\n');

    // 1. Modificar tipos_contrato para añadir 'genera_nomina'
    console.log('  📑 Alterando tabla tipos_contrato...');
    try {
      await pool.query(`ALTER TABLE tipos_contrato ADD COLUMN genera_nomina BOOLEAN DEFAULT TRUE`);
      console.log('  ✅ Columna genera_nomina añadida.');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') console.log('  ℹ️ La columna genera_nomina ya existe.');
      else throw e;
    }

    // 2. Insertar concepto PGDOCE (Pago de Sueldo)
    console.log('  📑 Insertando concepto PGDOCE (Pago de Sueldo Neto) en catalogo_movimientos...');
    try {
      await pool.query(`
        INSERT INTO catalogo_movimientos (codigo, nombre, tipo, categoria, requiere_mes, requiere_personal, afecta_nomina)
        VALUES ('PGDOCE', 'PAGO NETO DE NOMINA', 'EGRESO', 'Nomina', TRUE, TRUE, 'PAGO_SUELDO')
      `);
      console.log('  ✅ Concepto PGDOCE insertado.');
    } catch (e) {
      if (e.code === 'ER_DUP_ENTRY') console.log('  ℹ️ El concepto PGDOCE ya existe.');
      else throw e;
    }

    // 3. Tabla parametros_nomina
    console.log('  ⚙️ Creando tabla parametros_nomina...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS parametros_nomina (
        id                INT AUTO_INCREMENT PRIMARY KEY,
        codigo            VARCHAR(50) NOT NULL UNIQUE,
        nombre            VARCHAR(150) NOT NULL,
        tipo              ENUM('PORCENTAJE', 'VALOR_FIJO', 'CONFIGURACION') NOT NULL,
        valor             DECIMAL(12,4) NOT NULL,
        fecha_desde       DATE NULL,
        fecha_hasta       DATE NULL,
        activo            BOOLEAN DEFAULT TRUE,
        creado_por        INT NULL,
        actualizado_por   INT NULL,
        created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Insertar parámetro IESS por defecto (9.45)
    try {
      await pool.query(`
        INSERT INTO parametros_nomina (codigo, nombre, tipo, valor, activo)
        VALUES ('APORTE_PERSONAL_IESS', 'Aporte Personal IESS (9.45%)', 'PORCENTAJE', 9.45, TRUE)
      `);
      console.log('  ✅ Parámetro APORTE_PERSONAL_IESS insertado.');
    } catch(e) {
      if (e.code !== 'ER_DUP_ENTRY') throw e;
    }

    // 4. Tabla nominas
    console.log('  📜 Creando tabla nominas...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS nominas (
        id                  INT AUTO_INCREMENT PRIMARY KEY,
        periodo_lectivo_id  INT NOT NULL,
        mes                 DATE NOT NULL,
        tipo_personal_id    INT NULL,
        descripcion_grupo   VARCHAR(150) NULL,
        estado              ENUM('BORRADOR', 'REVISADA', 'CERRADA', 'PAGADA', 'ANULADA') DEFAULT 'BORRADOR',
        fecha_pago_estimada DATE NULL,
        observacion         TEXT NULL,
        total_ingresos      DECIMAL(14,2) NOT NULL DEFAULT 0.00,
        total_egresos       DECIMAL(14,2) NOT NULL DEFAULT 0.00,
        total_neto          DECIMAL(14,2) NOT NULL DEFAULT 0.00,
        cantidad_personal   INT NOT NULL DEFAULT 0,
        generado_por        INT NOT NULL,
        revisado_por        INT NULL,
        revisado_at         DATETIME NULL,
        cerrado_por         INT NULL,
        cerrado_at          DATETIME NULL,
        pagado_por          INT NULL,
        pagado_at           DATETIME NULL,
        anulado_por         INT NULL,
        anulado_at          DATETIME NULL,
        motivo_anulacion    VARCHAR(500) NULL,
        created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

        CONSTRAINT fk_nom_periodo FOREIGN KEY (periodo_lectivo_id) REFERENCES periodos_lectivos(id) ON DELETE RESTRICT,
        CONSTRAINT fk_nom_tipo_personal FOREIGN KEY (tipo_personal_id) REFERENCES tipos_contrato(id) ON DELETE RESTRICT,
        CONSTRAINT fk_nom_generador FOREIGN KEY (generado_por) REFERENCES usuarios(id_usuario) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 5. Tabla nomina_detalles
    console.log('  📄 Creando tabla nomina_detalles...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS nomina_detalles (
        id                    INT AUTO_INCREMENT PRIMARY KEY,
        nomina_id             INT NOT NULL,
        personal_id           INT NOT NULL,
        cedula_snapshot       VARCHAR(15) NULL,
        nombre_snapshot       VARCHAR(300) NOT NULL,
        cargo_snapshot        VARCHAR(150) NULL,
        contrato_snapshot     VARCHAR(150) NULL,
        sueldo                DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        horas_extras          DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        otros_ingresos        DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        subtotal_ingresos     DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        aporte_personal_iess  DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        anticipos             DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        otras_deducciones     DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        subtotal_egresos      DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        neto_recibir          DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        estado_pago           ENUM('PENDIENTE','PAGADO','ANULADO') DEFAULT 'PENDIENTE',
        fecha_pago            DATE NULL,
        cuenta_pago_id        INT NULL,
        movimiento_pago_id    INT NULL,
        observacion           TEXT NULL,
        firma_url             VARCHAR(500) NULL,
        created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

        CONSTRAINT fk_nd_nomina FOREIGN KEY (nomina_id) REFERENCES nominas(id) ON DELETE CASCADE,
        CONSTRAINT fk_nd_personal FOREIGN KEY (personal_id) REFERENCES personal(id) ON DELETE RESTRICT,
        CONSTRAINT fk_nd_cuenta FOREIGN KEY (cuenta_pago_id) REFERENCES cuentas_financieras(id) ON DELETE RESTRICT,
        CONSTRAINT fk_nd_movimiento FOREIGN KEY (movimiento_pago_id) REFERENCES movimientos_financieros(id) ON DELETE SET NULL,
        UNIQUE KEY uq_nd_nomina_personal (nomina_id, personal_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Indices (Ignorando ER_DUP_KEYNAME)
    console.log('  🔑 Creando índices para nóminas...');
    const queries = [
      "CREATE INDEX idx_nom_per_mes_tipo ON nominas (periodo_lectivo_id, mes, tipo_personal_id)",
      "CREATE INDEX idx_nom_estado ON nominas (estado)",
      "CREATE INDEX idx_nd_estado_pago ON nomina_detalles (estado_pago)"
    ];
    for (const q of queries) {
      try { await pool.query(q); } 
      catch (e) { if (e.code !== 'ER_DUP_KEYNAME') throw e; }
    }

    console.log('\n══════════════════════════════════════════════════');
    console.log('✅ Migración de Rol de Pagos completada.');
    console.log('══════════════════════════════════════════════════\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error en migración:', error.message);
    process.exit(1);
  }
}

runMigration();
