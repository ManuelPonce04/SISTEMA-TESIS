/**
 * ============================================================
 * Seed: Control Financiero — Datos Iniciales
 * Periodo lectivo, conceptos de movimientos y cuentas financieras
 * Idempotente: puede ejecutarse múltiples veces sin duplicar datos.
 * ============================================================
 */
const pool = require('./config/db');

async function runSeed() {
  try {
    console.log('🌱 Ejecutando seed de Control Financiero...\n');

    // ── Periodo Lectivo ────────────────────────────────────
    console.log('  📅 Insertando periodo lectivo...');
    await pool.query(`
      INSERT IGNORE INTO periodos_lectivos (nombre, fecha_inicio, fecha_fin, activo)
      VALUES ('2026-2027', '2026-05-01', '2027-02-28', TRUE)
    `);
    console.log('  ✅ Periodo lectivo insertado.\n');

    // ── Conceptos de Movimientos ──────────────────────────
    console.log('  📋 Insertando conceptos de movimientos...\n');

    const movimientos = [
      // ─── MATRÍCULAS (INGRESO) ───
      { codigo: 'MPINI2', nombre: 'Matrícula promoción Inicial 2',                tipo: 'INGRESO', categoria: 'MATRÍCULAS', requiere_mes: true,  requiere_personal: false, orden: 1 },
      { codigo: 'MP1700', nombre: 'Matrícula promoción 1.º a 7.º',                tipo: 'INGRESO', categoria: 'MATRÍCULAS', requiere_mes: true,  requiere_personal: false, orden: 2 },
      { codigo: 'MP8100', nombre: 'Matrícula promoción 8.º a 10.º',               tipo: 'INGRESO', categoria: 'MATRÍCULAS', requiere_mes: true,  requiere_personal: false, orden: 3 },
      { codigo: 'MP1B3B', nombre: 'Matrícula promoción 1.º BGU a 3.º BGU',        tipo: 'INGRESO', categoria: 'MATRÍCULAS', requiere_mes: true,  requiere_personal: false, orden: 4 },
      { codigo: 'MNINI2', nombre: 'Matrícula normal Inicial 2',                   tipo: 'INGRESO', categoria: 'MATRÍCULAS', requiere_mes: true,  requiere_personal: false, orden: 5 },
      { codigo: 'MNEDBA', nombre: 'Matrícula normal Educación Básica',            tipo: 'INGRESO', categoria: 'MATRÍCULAS', requiere_mes: true,  requiere_personal: false, orden: 6 },
      { codigo: 'MNBACH', nombre: 'Matrícula normal Bachillerato',                tipo: 'INGRESO', categoria: 'MATRÍCULAS', requiere_mes: true,  requiere_personal: false, orden: 7 },
      { codigo: 'MEINI2', nombre: 'Matrícula extraordinaria Inicial 2',           tipo: 'INGRESO', categoria: 'MATRÍCULAS', requiere_mes: true,  requiere_personal: false, orden: 8 },
      { codigo: 'MEEDBA', nombre: 'Matrícula extraordinaria Educación Básica',    tipo: 'INGRESO', categoria: 'MATRÍCULAS', requiere_mes: true,  requiere_personal: false, orden: 9 },
      { codigo: 'MEBACH', nombre: 'Matrícula extraordinaria Bachillerato',        tipo: 'INGRESO', categoria: 'MATRÍCULAS', requiere_mes: true,  requiere_personal: false, orden: 10 },

      // ─── PENSIONES (INGRESO) ───
      { codigo: 'PNINC2', nombre: 'Pensión normal Inicial 2',                                      tipo: 'INGRESO', categoria: 'PENSIONES', requiere_mes: true, requiere_personal: false, orden: 11 },
      { codigo: 'PN1700', nombre: 'Pensión normal 1.º a 7.º',                                      tipo: 'INGRESO', categoria: 'PENSIONES', requiere_mes: true, requiere_personal: false, orden: 12 },
      { codigo: 'PN8100', nombre: 'Pensión normal 8.º a 10.º',                                     tipo: 'INGRESO', categoria: 'PENSIONES', requiere_mes: true, requiere_personal: false, orden: 13 },
      { codigo: 'PN1B2B', nombre: 'Pensión normal 1.º y 2.º de Bachillerato',                      tipo: 'INGRESO', categoria: 'PENSIONES', requiere_mes: true, requiere_personal: false, orden: 14 },
      { codigo: 'PN3B00', nombre: 'Pensión normal 3.º de Bachillerato',                             tipo: 'INGRESO', categoria: 'PENSIONES', requiere_mes: true, requiere_personal: false, orden: 15 },
      { codigo: 'PD2HFD', nombre: 'Pensión diferenciada por dos hijos o familiar de docente',       tipo: 'INGRESO', categoria: 'PENSIONES', requiere_mes: true, requiere_personal: false, orden: 16 },
      { codigo: 'PD3HHD', nombre: 'Pensión diferenciada por tres hijos o hijos de docente',         tipo: 'INGRESO', categoria: 'PENSIONES', requiere_mes: true, requiere_personal: false, orden: 17 },
      { codigo: 'PD4H00', nombre: 'Pensión diferenciada por cuatro hijos en adelante',              tipo: 'INGRESO', categoria: 'PENSIONES', requiere_mes: true, requiere_personal: false, orden: 18 },
      { codigo: 'PDOPOM', nombre: 'Pensión diferenciada por orfandad de padre o madre',             tipo: 'INGRESO', categoria: 'PENSIONES', requiere_mes: true, requiere_personal: false, orden: 19 },
      { codigo: 'PDOPYM', nombre: 'Pensión diferenciada por orfandad de padre y madre',             tipo: 'INGRESO', categoria: 'PENSIONES', requiere_mes: true, requiere_personal: false, orden: 20 },
      { codigo: 'PDHISO', nombre: 'Pensión diferenciada para hijos de socios',                      tipo: 'INGRESO', categoria: 'PENSIONES', requiere_mes: true, requiere_personal: false, orden: 21 },
      { codigo: 'PDHICR', nombre: 'Pensión diferenciada por enfermedades crónicas',                 tipo: 'INGRESO', categoria: 'PENSIONES', requiere_mes: true, requiere_personal: false, orden: 22 },
      { codigo: 'PDOTRO', nombre: 'Otras pensiones diferenciadas',                                  tipo: 'INGRESO', categoria: 'PENSIONES', requiere_mes: true, requiere_personal: false, orden: 23 },

      // ─── OTROS INGRESOS ───
      { codigo: 'ICDFAM', nombre: 'Ingresos para cubrir gastos del Día de la Familia',              tipo: 'INGRESO', categoria: 'EVENTOS INSTITUCIONALES', requiere_mes: false, requiere_personal: false, orden: 24 },
      { codigo: 'PFUJLM', nombre: 'Préstamos a favor de la Unidad Educativa Juan León Mera',       tipo: 'INGRESO', categoria: 'PRÉSTAMOS',              requiere_mes: false, requiere_personal: false, orden: 25 },
      { codigo: 'ICOMED', nombre: 'Comisiones de empresas editoras',                                tipo: 'INGRESO', categoria: 'COMISIONES',             requiere_mes: false, requiere_personal: false, orden: 26 },
      { codigo: 'CFIESS', nombre: 'Valores recibidos de familiares de colaboradores para pagar IESS',tipo: 'INGRESO', categoria: 'APORTES IESS',          requiere_mes: true,  requiere_personal: false, orden: 27 },
      { codigo: 'OTRING', nombre: 'Otros ingresos',                                                 tipo: 'INGRESO', categoria: 'OTROS INGRESOS',         requiere_mes: false, requiere_personal: false, orden: 28 },
      { codigo: 'INGALA', nombre: 'Ingresos de años lectivos anteriores',                            tipo: 'INGRESO', categoria: 'OTROS INGRESOS',         requiere_mes: false, requiere_personal: false, orden: 29 },

      // ─── MEJORAS DEL PLANTEL (EGRESO) ───
      { codigo: 'MJOMOB', nombre: 'Mejoras del plantel, mano de obra',  tipo: 'EGRESO', categoria: 'MEJORAS DEL PLANTEL', requiere_mes: true,  requiere_personal: false, orden: 30 },
      { codigo: 'MJOMAT', nombre: 'Mejoras del plantel, materiales',    tipo: 'EGRESO', categoria: 'MEJORAS DEL PLANTEL', requiere_mes: true,  requiere_personal: false, orden: 31 },
      { codigo: 'COMMAT', nombre: 'Compra de herramientas',             tipo: 'EGRESO', categoria: 'MEJORAS DEL PLANTEL', requiere_mes: true,  requiere_personal: false, orden: 32 },

      // ─── SERVICIOS BÁSICOS (EGRESO) ───
      { codigo: 'SBINTE', nombre: 'Servicio básico de internet',        tipo: 'EGRESO', categoria: 'SERVICIOS BÁSICOS', requiere_mes: true, requiere_personal: false, orden: 33 },
      { codigo: 'SBCNEL', nombre: 'Planilla de energía eléctrica CNEL', tipo: 'EGRESO', categoria: 'SERVICIOS BÁSICOS', requiere_mes: true, requiere_personal: false, orden: 34 },
      { codigo: 'SBAAPP', nombre: 'Servicio de agua potable',           tipo: 'EGRESO', categoria: 'SERVICIOS BÁSICOS', requiere_mes: true, requiere_personal: false, orden: 35 },

      // ─── GASTOS OPERATIVOS (EGRESO) ───
      { codigo: 'GOVIAT', nombre: 'Gastos operativos de viáticos',             tipo: 'EGRESO', categoria: 'GASTOS OPERATIVOS', requiere_mes: false, requiere_personal: false, orden: 36 },
      { codigo: 'GOMAOF', nombre: 'Gastos operativos de materiales de oficina',tipo: 'EGRESO', categoria: 'GASTOS OPERATIVOS', requiere_mes: false, requiere_personal: false, orden: 37 },
      { codigo: 'GOAPER', nombre: 'Gastos operativos de aperitivos',           tipo: 'EGRESO', categoria: 'GASTOS OPERATIVOS', requiere_mes: false, requiere_personal: false, orden: 38 },
      { codigo: 'GOMLIM', nombre: 'Gastos operativos de materiales de limpieza',tipo: 'EGRESO', categoria: 'GASTOS OPERATIVOS', requiere_mes: false, requiere_personal: false, orden: 39 },

      // ─── PERSONAL Y NÓMINA (EGRESO) ───
      { codigo: 'IESSPA', nombre: 'Planilla de aporte personal al IESS',                tipo: 'EGRESO', categoria: 'PERSONAL Y NÓMINA', requiere_mes: true,  requiere_personal: false, orden: 40 },
      { codigo: 'IESSPP', nombre: 'Préstamos quirografarios del IESS',                  tipo: 'EGRESO', categoria: 'PERSONAL Y NÓMINA', requiere_mes: true,  requiere_personal: false, orden: 41 },
      { codigo: 'SPDOCE', nombre: 'Anticipos o sueldos a docentes y personal',           tipo: 'EGRESO', categoria: 'PERSONAL Y NÓMINA', requiere_mes: true,  requiere_personal: true,  orden: 42 },
      { codigo: 'PSPPEX', nombre: 'Pago a profesionales externos por servicios prestados',tipo: 'EGRESO', categoria: 'PERSONAL Y NÓMINA', requiere_mes: false, requiere_personal: false, orden: 43 },

      // ─── OTROS EGRESOS ───
      { codigo: 'PAGIDU', nombre: 'Pago o abono de seguro de accidentes',       tipo: 'EGRESO', categoria: 'SEGUROS',           requiere_mes: false, requiere_personal: false, orden: 44 },
      { codigo: 'PPFJLM', nombre: 'Pago de préstamo a favor de la institución', tipo: 'EGRESO', categoria: 'PRÉSTAMOS',          requiere_mes: false, requiere_personal: false, orden: 45 },
      { codigo: 'OTREGR', nombre: 'Otros egresos',                              tipo: 'EGRESO', categoria: 'OTROS EGRESOS',      requiere_mes: false, requiere_personal: false, orden: 46 },
      { codigo: 'DEVMAT', nombre: 'Devolución de valores de matrículas',         tipo: 'EGRESO', categoria: 'DEVOLUCIONES',       requiere_mes: false, requiere_personal: false, orden: 47 },
      { codigo: 'DEVPEN', nombre: 'Devolución de valores de pensiones',          tipo: 'EGRESO', categoria: 'DEVOLUCIONES',       requiere_mes: false, requiere_personal: false, orden: 48 },
    ];

    for (const m of movimientos) {
      await pool.query(`
        INSERT IGNORE INTO catalogo_movimientos
          (codigo, nombre, tipo, categoria, requiere_mes, requiere_personal, activo, orden)
        VALUES (?, ?, ?, ?, ?, ?, TRUE, ?)
      `, [m.codigo, m.nombre, m.tipo, m.categoria, m.requiere_mes, m.requiere_personal, m.orden]);
    }
    console.log(`  ✅ ${movimientos.length} conceptos de movimientos procesados.\n`);

    // ── Cuentas Financieras ──────────────────────────────────
    console.log('  🏦 Insertando cuentas financieras...');
    const cuentas = [
      { nombre: 'Caja',       tipo: 'CAJA',           descripcion: 'Caja general de la institución',  saldo_inicial: 0.00, orden: 1 },
      { nombre: 'Banco',      tipo: 'BANCO',          descripcion: 'Cuenta bancaria institucional',    saldo_inicial: 0.00, orden: 2 },
      { nombre: 'Liliana',    tipo: 'CUENTA INTERNA', descripcion: 'Cuenta interna - Liliana',         saldo_inicial: 0.00, orden: 3 },
      { nombre: 'Prof. Jes',  tipo: 'CUENTA INTERNA', descripcion: 'Cuenta interna - Prof. Jes',       saldo_inicial: 0.00, orden: 4 },
    ];

    for (const c of cuentas) {
      await pool.query(`
        INSERT IGNORE INTO cuentas_financieras
          (nombre, tipo, descripcion, saldo_inicial, activo, orden)
        VALUES (?, ?, ?, ?, TRUE, ?)
      `, [c.nombre, c.tipo, c.descripcion, c.saldo_inicial, c.orden]);
    }
    console.log(`  ✅ ${cuentas.length} cuentas financieras procesadas.\n`);

    // ── Resumen ──────────────────────────────────────────────
    const [movCount] = await pool.query('SELECT COUNT(*) as total FROM catalogo_movimientos');
    const [cueCount] = await pool.query('SELECT COUNT(*) as total FROM cuentas_financieras');
    const [perCount] = await pool.query('SELECT COUNT(*) as total FROM periodos_lectivos');

    console.log('══════════════════════════════════════════════════');
    console.log('✅ Seed de Control Financiero completado.');
    console.log(`   📅 Periodos lectivos:       ${perCount[0].total}`);
    console.log(`   📋 Conceptos movimientos:   ${movCount[0].total}`);
    console.log(`   🏦 Cuentas financieras:     ${cueCount[0].total}`);
    console.log('══════════════════════════════════════════════════\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error en seed de Control Financiero:', error.message);
    process.exit(1);
  }
}

runSeed();
