require('dotenv').config();
const mysql = require('mysql2/promise');

async function seed() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'sistema_cobranzas'
  });

  console.log('--- Iniciando Seed Académico ---');

  try {
    // 1. Periodo 2026-2027
    const [perRows] = await connection.query("SELECT id FROM periodos_lectivos WHERE codigo = 'PER-2026-2027'");
    if (perRows.length === 0) {
      await connection.query(`
        INSERT INTO periodos_lectivos (codigo, nombre, fecha_inicio, fecha_fin, estado, es_activo)
        VALUES ('PER-2026-2027', '2026-2027', '2026-05-01', '2027-02-28', 'ACTIVO', 1)
      `);
      console.log('Periodo PER-2026-2027 creado.');
    } else {
      console.log('Periodo PER-2026-2027 ya existe.');
    }

    // 2. Niveles Educativos
    const niveles = [
      { cod: 'INI', nom: 'Educación Inicial', orden: 1 },
      { cod: 'EGB', nom: 'Educación General Básica', orden: 2 },
      { cod: 'BGU', nom: 'Bachillerato General Unificado', orden: 3 }
    ];
    for (const n of niveles) {
      const [nRow] = await connection.query("SELECT id FROM niveles_educativos WHERE codigo = ?", [n.cod]);
      if (nRow.length === 0) {
        await connection.query("INSERT INTO niveles_educativos (codigo, nombre, orden) VALUES (?, ?, ?)", [n.cod, n.nom, n.orden]);
      }
    }
    console.log('Niveles educativos sembrados.');

    // 3. Cursos
    const [nivIni] = await connection.query("SELECT id FROM niveles_educativos WHERE codigo = 'INI'");
    const [nivEgb] = await connection.query("SELECT id FROM niveles_educativos WHERE codigo = 'EGB'");
    const [nivBgu] = await connection.query("SELECT id FROM niveles_educativos WHERE codigo = 'BGU'");

    const idIni = nivIni[0].id;
    const idEgb = nivEgb[0].id;
    const idBgu = nivBgu[0].id;

    const cursos = [
      { n_id: idIni, cod: 'INI-2', nom: 'Inicial 2', ord: 1 },
      { n_id: idEgb, cod: 'EGB-1', nom: '1.º de Educación General Básica', ord: 2 },
      { n_id: idEgb, cod: 'EGB-2', nom: '2.º de Educación General Básica', ord: 3 },
      { n_id: idEgb, cod: 'EGB-3', nom: '3.º de Educación General Básica', ord: 4 },
      { n_id: idEgb, cod: 'EGB-4', nom: '4.º de Educación General Básica', ord: 5 },
      { n_id: idEgb, cod: 'EGB-5', nom: '5.º de Educación General Básica', ord: 6 },
      { n_id: idEgb, cod: 'EGB-6', nom: '6.º de Educación General Básica', ord: 7 },
      { n_id: idEgb, cod: 'EGB-7', nom: '7.º de Educación General Básica', ord: 8 },
      { n_id: idEgb, cod: 'EGB-8', nom: '8.º de Educación General Básica', ord: 9 },
      { n_id: idEgb, cod: 'EGB-9', nom: '9.º de Educación General Básica', ord: 10 },
      { n_id: idEgb, cod: 'EGB-10', nom: '10.º de Educación General Básica', ord: 11 },
      { n_id: idBgu, cod: 'BGU-1', nom: '1.º de Bachillerato General Unificado', ord: 12 },
      { n_id: idBgu, cod: 'BGU-2', nom: '2.º de Bachillerato General Unificado', ord: 13 },
      { n_id: idBgu, cod: 'BGU-3', nom: '3.º de Bachillerato General Unificado', ord: 14 }
    ];

    let cAntId = null;
    for (const c of cursos) {
      const [cRow] = await connection.query("SELECT id FROM cursos WHERE codigo = ?", [c.cod]);
      let cId;
      if (cRow.length === 0) {
        const [cIns] = await connection.query(
          "INSERT INTO cursos (nivel_id, codigo, nombre, orden_academico, curso_anterior_id) VALUES (?, ?, ?, ?, ?)", 
          [c.n_id, c.cod, c.nom, c.ord, cAntId]
        );
        cId = cIns.insertId;
        
        // Update previous course next_id
        if (cAntId) {
          await connection.query("UPDATE cursos SET curso_siguiente_id = ? WHERE id = ?", [cId, cAntId]);
        }
      } else {
        cId = cRow[0].id;
      }
      cAntId = cId;
    }
    console.log('Cursos sembrados.');

    // 4. Paralelos
    const paralelos = [
      { cod: 'A', nom: 'A', ord: 1 },
      { cod: 'B', nom: 'B', ord: 2 }
    ];
    for (const p of paralelos) {
      const [pRow] = await connection.query("SELECT id FROM paralelos WHERE codigo = ?", [p.cod]);
      if (pRow.length === 0) {
        await connection.query("INSERT INTO paralelos (codigo, nombre, orden) VALUES (?, ?, ?)", [p.cod, p.nom, p.ord]);
      }
    }
    console.log('Paralelos sembrados.');

    // 5. Jornadas
    const jornadas = [
      { cod: 'MAT', nom: 'Matutina', ord: 1 }
    ];
    for (const j of jornadas) {
      const [jRow] = await connection.query("SELECT id FROM jornadas WHERE codigo = ?", [j.cod]);
      if (jRow.length === 0) {
        await connection.query("INSERT INTO jornadas (codigo, nombre, orden) VALUES (?, ?, ?)", [j.cod, j.nom, j.ord]);
      }
    }
    console.log('Jornadas sembradas.');

    console.log('--- Seed Completado Exitosamente ---');
  } catch (error) {
    console.error('Error durante el seed:', error);
  } finally {
    await connection.end();
  }
}

seed();
