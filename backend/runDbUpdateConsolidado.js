/**
 * ============================================================
 * Migración: Consolidado Financiero
 * Convierte las categorías de texto en una tabla catalogada
 * ============================================================
 */
const pool = require('./config/db');

async function runMigration() {
  try {
    console.log('🔄 Iniciando migración: Consolidado Financiero...\n');

    // 1. Crear tabla categorias_financieras
    console.log('  📑 Creando tabla categorias_financieras...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS categorias_financieras (
        id                INT AUTO_INCREMENT PRIMARY KEY,
        codigo            VARCHAR(20) NOT NULL UNIQUE,
        nombre            VARCHAR(150) NOT NULL,
        tipo              ENUM('INGRESO', 'EGRESO', 'MIXTA') NOT NULL,
        grupo_consolidado VARCHAR(50) NOT NULL,
        orden             INT DEFAULT 0,
        activo            BOOLEAN DEFAULT TRUE,
        created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('  ✅ Tabla categorias_financieras lista.');

    // 2. Poblar categorias base sugeridas
    const categoriasBase = [
      { codigo: 'CAT-MAT', nombre: 'Matrículas', tipo: 'INGRESO', grupo: 'MATRICULAS', orden: 1 },
      { codigo: 'CAT-PEN', nombre: 'Pensiones', tipo: 'INGRESO', grupo: 'PENSIONES', orden: 2 },
      { codigo: 'CAT-OING', nombre: 'Otros Ingresos', tipo: 'INGRESO', grupo: 'OTROS_INGRESOS', orden: 3 },
      { codigo: 'CAT-NOM', nombre: 'Personal y Nómina', tipo: 'EGRESO', grupo: 'PERSONAL_NOMINA', orden: 4 },
      { codigo: 'CAT-MEJ', nombre: 'Mejoras del Plantel', tipo: 'EGRESO', grupo: 'MEJORAS_PLANTEL', orden: 5 },
      { codigo: 'CAT-SER', nombre: 'Servicios Básicos', tipo: 'EGRESO', grupo: 'SERVICIOS_BASICOS', orden: 6 },
      { codigo: 'CAT-OPE', nombre: 'Gastos Operativos', tipo: 'EGRESO', grupo: 'GASTOS_OPERATIVOS', orden: 7 },
      { codigo: 'CAT-OEG', nombre: 'Otros Egresos', tipo: 'EGRESO', grupo: 'OTROS_EGRESOS', orden: 8 },
      { codigo: 'CAT-DEV', nombre: 'Devoluciones', tipo: 'EGRESO', grupo: 'DEVOLUCIONES', orden: 9 }
    ];

    for (const c of categoriasBase) {
      try {
        await pool.query(`
          INSERT INTO categorias_financieras (codigo, nombre, tipo, grupo_consolidado, orden)
          VALUES (?, ?, ?, ?, ?)
        `, [c.codigo, c.nombre, c.tipo, c.grupo, c.orden]);
      } catch (e) {
        if (e.code !== 'ER_DUP_ENTRY') throw e;
      }
    }
    console.log('  ✅ Categorías base insertadas.');

    // 3. Alterar catalogo_movimientos para añadir categoria_id
    console.log('  📑 Alterando catalogo_movimientos...');
    try {
      await pool.query(`ALTER TABLE catalogo_movimientos ADD COLUMN categoria_id INT NULL`);
      await pool.query(`ALTER TABLE catalogo_movimientos ADD CONSTRAINT fk_cm_categoria FOREIGN KEY (categoria_id) REFERENCES categorias_financieras(id) ON DELETE RESTRICT`);
      console.log('  ✅ Columna categoria_id añadida.');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') console.log('  ℹ️ La columna categoria_id ya existe.');
      else throw e;
    }

    // 4. Mapear datos viejos (basado en 'categoria' VARCHAR) a la nueva relacion
    console.log('  🔄 Mapeando categorías antiguas...');
    
    // Matrículas
    await pool.query(`UPDATE catalogo_movimientos SET categoria_id = (SELECT id FROM categorias_financieras WHERE codigo = 'CAT-MAT') WHERE categoria LIKE '%matricula%' OR categoria LIKE '%matrícula%' OR nombre LIKE '%matricula%'`);
    // Pensiones
    await pool.query(`UPDATE catalogo_movimientos SET categoria_id = (SELECT id FROM categorias_financieras WHERE codigo = 'CAT-PEN') WHERE categoria LIKE '%pension%' OR categoria LIKE '%pensión%'`);
    // Nómina
    await pool.query(`UPDATE catalogo_movimientos SET categoria_id = (SELECT id FROM categorias_financieras WHERE codigo = 'CAT-NOM') WHERE codigo IN ('SPDOCE', 'PGDOCE') OR categoria LIKE '%nomina%' OR categoria LIKE '%sueldo%' OR categoria LIKE '%anticipo%'`);
    // Mejoras
    await pool.query(`UPDATE catalogo_movimientos SET categoria_id = (SELECT id FROM categorias_financieras WHERE codigo = 'CAT-MEJ') WHERE categoria LIKE '%mejora%' OR categoria LIKE '%mantenimiento%' OR categoria LIKE '%infraestructura%'`);
    // Servicios basicos
    await pool.query(`UPDATE catalogo_movimientos SET categoria_id = (SELECT id FROM categorias_financieras WHERE codigo = 'CAT-SER') WHERE categoria LIKE '%servicio%' OR categoria LIKE '%basico%' OR categoria LIKE '%básico%'`);
    // Resto de egresos a Otros Egresos
    await pool.query(`UPDATE catalogo_movimientos SET categoria_id = (SELECT id FROM categorias_financieras WHERE codigo = 'CAT-OEG') WHERE categoria_id IS NULL AND tipo = 'EGRESO'`);
    // Resto de ingresos a Otros Ingresos
    await pool.query(`UPDATE catalogo_movimientos SET categoria_id = (SELECT id FROM categorias_financieras WHERE codigo = 'CAT-OING') WHERE categoria_id IS NULL AND tipo = 'INGRESO'`);

    console.log('  ✅ Mapeo completado.');

    console.log('\n══════════════════════════════════════════════════');
    console.log('✅ Migración de Consolidado completada.');
    console.log('══════════════════════════════════════════════════\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error en migración:', error.message);
    process.exit(1);
  }
}

runMigration();
