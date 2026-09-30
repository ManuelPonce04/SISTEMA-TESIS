/**
 * ============================================================
 * Seed: Módulo de Personal
 * Inserta catálogos iniciales para tipos_contrato, funciones_personal y cargos_personal
 * ============================================================
 */
require('dotenv').config();
const pool = require('./config/db');

async function runSeed() {
  try {
    console.log('🌱 Ejecutando seed de Personal...\n');

    // 1. Tipos de Contrato
    console.log('  📑 Insertando tipos de contrato...');
    const contratos = [
      { codigo: 'PL', nombre: 'Personal de planta', descripcion: 'Personal permanente', genera_nomina: 1, orden: 1 },
      { codigo: 'SP', nombre: 'Servicios prestados', descripcion: 'Facturación profesional', genera_nomina: 1, orden: 2 }
    ];
    for (const c of contratos) {
      await pool.query(
        'INSERT IGNORE INTO tipos_contrato (codigo, nombre, descripcion, genera_nomina, orden) VALUES (?, ?, ?, ?, ?)',
        [c.codigo, c.nombre, c.descripcion, c.genera_nomina, c.orden]
      );
    }
    console.log('  ✅ Tipos de contrato procesados.');

    // 2. Funciones de Personal
    console.log('  📑 Insertando funciones...');
    const funciones = [
      { nombre: 'Docente', orden: 1 },
      { nombre: 'Administrativo', orden: 2 },
      { nombre: 'Docente/Administrativo', orden: 3 },
      { nombre: 'DECE', orden: 4 },
      { nombre: 'Servicios', orden: 5 },
      { nombre: 'Profesional externo', orden: 6 },
      { nombre: 'Directivo', orden: 7 },
      { nombre: 'Otro', orden: 8 }
    ];
    for (const f of funciones) {
      await pool.query(
        'INSERT IGNORE INTO funciones_personal (nombre, orden) VALUES (?, ?)',
        [f.nombre, f.orden]
      );
    }
    console.log('  ✅ Funciones procesadas.');

    // 3. Cargos
    console.log('  📑 Insertando cargos básicos...');
    const cargos = [
      { nombre: 'Rector(a)', orden: 1 },
      { nombre: 'Vicerrector(a)', orden: 2 },
      { nombre: 'Inspector(a)', orden: 3 },
      { nombre: 'Secretaria', orden: 4 },
      { nombre: 'Docente', orden: 5 },
      { nombre: 'Psicólogo(a)', orden: 6 },
      { nombre: 'Personal de limpieza', orden: 7 },
      { nombre: 'Contador(a)', orden: 8 }
    ];
    for (const c of cargos) {
      await pool.query(
        'INSERT IGNORE INTO cargos_personal (nombre, orden) VALUES (?, ?)',
        [c.nombre, c.orden]
      );
    }
    console.log('  ✅ Cargos procesados.');

    console.log('\n══════════════════════════════════════════════════');
    console.log('✅ Seed de Personal completado.');
    console.log('══════════════════════════════════════════════════\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error en seed:', error.message);
    process.exit(1);
  }
}

runSeed();
