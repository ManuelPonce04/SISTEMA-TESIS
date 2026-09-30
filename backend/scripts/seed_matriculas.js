require('dotenv').config();
const mysql = require('mysql2/promise');

async function seed() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'sistema_cobranzas'
  });

  console.log('--- Iniciando Seed: Módulo de Matrículas ---');

  try {
    // 1. Inyectar Tipos de Matrícula
    const tipos = [
      { codigo: 'NORMAL', nombre: 'Matrícula Normal', orden: 1 },
      { codigo: 'EXTRAORDINARIA', nombre: 'Matrícula Extraordinaria', orden: 2 },
      { codigo: 'PROMOCION', nombre: 'Matrícula por Promoción', orden: 3 },
      { codigo: 'REINGRESO', nombre: 'Reingreso', orden: 4 }
    ];

    console.log('Inyectando tipos de matrícula...');
    for (const tipo of tipos) {
      const [existing] = await connection.query('SELECT id FROM tipos_matricula WHERE codigo = ?', [tipo.codigo]);
      if (existing.length === 0) {
        await connection.query(
          'INSERT INTO tipos_matricula (codigo, nombre, descripcion, orden) VALUES (?, ?, ?, ?)',
          [tipo.codigo, tipo.nombre, `${tipo.nombre} automática`, tipo.orden]
        );
      }
    }
    console.log('Tipos de matrícula inyectados.');

    // 2. Crear algunas tarifas base para el periodo activo (2026-2027)
    // Primero, obtener un periodo activo y niveles
    const [periodos] = await connection.query("SELECT id FROM periodos_lectivos WHERE es_activo = 1 LIMIT 1");
    if (periodos.length > 0) {
      const periodo_id = periodos[0].id;
      
      const [niveles] = await connection.query("SELECT id, nombre FROM niveles_educativos");
      const [tiposDb] = await connection.query("SELECT id, codigo FROM tipos_matricula WHERE codigo = 'NORMAL'");
      
      if (niveles.length > 0 && tiposDb.length > 0) {
        const tipo_normal_id = tiposDb[0].id;
        
        console.log('Inyectando tarifas base para niveles...');
        for (const nivel of niveles) {
          // Asignar tarifa base: Inicial $50, EGB $60, BGU $70
          let valor = 60.00;
          if (nivel.nombre.includes('Inicial')) valor = 50.00;
          if (nivel.nombre.includes('Bachillerato')) valor = 70.00;

          const [existingTarifa] = await connection.query(`
            SELECT id FROM tarifas_matricula 
            WHERE periodo_lectivo_id = ? AND nivel_id = ? AND tipo_matricula_id = ?
          `, [periodo_id, nivel.id, tipo_normal_id]);

          if (existingTarifa.length === 0) {
            await connection.query(`
              INSERT INTO tarifas_matricula (periodo_lectivo_id, nivel_id, tipo_matricula_id, valor, fecha_desde)
              VALUES (?, ?, ?, ?, '2026-01-01')
            `, [periodo_id, nivel.id, tipo_normal_id, valor]);
          }
        }
        console.log('Tarifas inyectadas.');
      }
    } else {
      console.log('No hay periodo activo, saltando tarifas.');
    }

  } catch (error) {
    console.error('Error durante el seed de matrículas:', error);
  } finally {
    await connection.end();
  }
}

seed();
