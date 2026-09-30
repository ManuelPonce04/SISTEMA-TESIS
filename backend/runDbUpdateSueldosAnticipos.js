/**
 * ============================================================
 * Migración: Sueldos y Anticipos
 * ============================================================
 */
const pool = require('./config/db');

async function runMigration() {
  try {
    console.log('🔄 Iniciando migración: Sueldos y Anticipos...\n');

    // 1. Modificar catalogo_movimientos
    console.log('  📑 Alterando tabla catalogo_movimientos...');
    try {
      await pool.query(`
        ALTER TABLE catalogo_movimientos 
        ADD COLUMN afecta_nomina ENUM('NINGUNA', 'ANTICIPO_SUELDO', 'PAGO_SUELDO', 'OTRA_DEDUCCION', 'OTRO_INGRESO') DEFAULT 'NINGUNA'
      `);
      console.log('  ✅ Columna afecta_nomina añadida.');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log('  ℹ️ La columna afecta_nomina ya existe.');
      } else {
        throw e;
      }
    }

    console.log('  📑 Actualizando SPDOCE a ANTICIPO_SUELDO...');
    await pool.query(`UPDATE catalogo_movimientos SET afecta_nomina = 'ANTICIPO_SUELDO' WHERE codigo = 'SPDOCE'`);
    console.log('  ✅ Catálogo actualizado.');

    // 2. Tabla Ajustes Mensuales Personal
    console.log('  💼 Creando tabla ajustes_mensuales_personal...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ajustes_mensuales_personal (
        id                  INT AUTO_INCREMENT PRIMARY KEY,
        periodo_lectivo_id  INT NOT NULL,
        mes                 DATE NOT NULL,
        personal_id         INT NOT NULL,
        horas_extras        DECIMAL(12,2) DEFAULT 0.00,
        otros_ingresos      DECIMAL(12,2) DEFAULT 0.00,
        otras_deducciones   DECIMAL(12,2) DEFAULT 0.00,
        observacion         TEXT NULL,
        estado              ENUM('BORRADOR', 'BLOQUEADO') DEFAULT 'BORRADOR',
        creado_por          INT NOT NULL,
        actualizado_por     INT NULL,
        created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

        CONSTRAINT fk_amp_periodo FOREIGN KEY (periodo_lectivo_id) REFERENCES periodos_lectivos(id) ON DELETE RESTRICT,
        CONSTRAINT fk_amp_personal FOREIGN KEY (personal_id) REFERENCES personal(id) ON DELETE RESTRICT,
        CONSTRAINT fk_amp_creador FOREIGN KEY (creado_por) REFERENCES usuarios(id_usuario) ON DELETE RESTRICT,
        CONSTRAINT fk_amp_editor FOREIGN KEY (actualizado_por) REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
        UNIQUE KEY uq_amp_mes_personal (periodo_lectivo_id, mes, personal_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('  ✅ Tabla ajustes_mensuales_personal creada.');

    // 3. Tabla Autorizaciones Anticipos
    console.log('  🛡️ Creando tabla autorizaciones_anticipos...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS autorizaciones_anticipos (
        id                        INT AUTO_INCREMENT PRIMARY KEY,
        movimiento_financiero_id  INT NOT NULL,
        personal_id               INT NOT NULL,
        periodo_lectivo_id        INT NOT NULL,
        mes                       DATE NOT NULL,
        saldo_disponible          DECIMAL(12,2) NOT NULL,
        valor_anticipo            DECIMAL(12,2) NOT NULL,
        valor_excedido            DECIMAL(12,2) NOT NULL,
        justificacion             TEXT NOT NULL,
        autorizado_por            INT NOT NULL,
        created_at                TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT fk_aa_movimiento FOREIGN KEY (movimiento_financiero_id) REFERENCES movimientos_financieros(id) ON DELETE CASCADE,
        CONSTRAINT fk_aa_personal FOREIGN KEY (personal_id) REFERENCES personal(id) ON DELETE RESTRICT,
        CONSTRAINT fk_aa_autorizador FOREIGN KEY (autorizado_por) REFERENCES usuarios(id_usuario) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('  ✅ Tabla autorizaciones_anticipos creada.');

    console.log('\n══════════════════════════════════════════════════');
    console.log('✅ Migración de Sueldos y Anticipos completada.');
    console.log('══════════════════════════════════════════════════\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error en migración:', error.message);
    process.exit(1);
  }
}

runMigration();
