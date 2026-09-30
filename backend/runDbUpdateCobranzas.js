const mysql = require('mysql2/promise');
require('dotenv').config();

async function runUpdate() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: 'sistema_cobranzas',
      multipleStatements: true
    });

    console.log('Aplicando cambios para Módulo Cobranzas...');

    // ALTER pagos
    try {
      await connection.query(`
        ALTER TABLE pagos 
        ADD COLUMN descuento DECIMAL(10,2) DEFAULT 0.00 AFTER valor_pagado,
        ADD COLUMN recargo DECIMAL(10,2) DEFAULT 0.00 AFTER descuento,
        ADD COLUMN estado ENUM('Activo', 'Anulado') DEFAULT 'Activo' AFTER observacion,
        ADD COLUMN motivo_anulacion TEXT NULL AFTER estado,
        ADD COLUMN fecha_anulacion DATETIME NULL AFTER motivo_anulacion;
      `);
      console.log('✅ Tabla pagos actualizada con éxito.');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') console.log('⚠️ Columnas en pagos ya existían.');
      else throw e;
    }

    // CREATE recibos
    await connection.query(`
      CREATE TABLE IF NOT EXISTS recibos (
        id_recibo INT AUTO_INCREMENT PRIMARY KEY,
        id_pago INT NOT NULL,
        numero_recibo VARCHAR(50) NOT NULL,
        fecha_emision DATETIME DEFAULT CURRENT_TIMESTAMP,
        ruta_pdf VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (id_pago) REFERENCES pagos(id_pago) ON DELETE CASCADE
      );
    `);
    console.log('✅ Tabla recibos verificada/creada con éxito.');

    await connection.end();
    console.log('¡Actualización de BD finalizada!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

runUpdate();
