const mysql = require('mysql2/promise');
require('dotenv').config();

async function fix() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'sistema_cobranzas'
  });
  
  await connection.query("SET FOREIGN_KEY_CHECKS = 0;");
  await connection.query("DROP TABLE IF EXISTS cursos;");
  await connection.query("DROP TABLE IF EXISTS paralelos;");
  await connection.query("DROP TABLE IF EXISTS jornadas;");
  await connection.query("DROP TABLE IF EXISTS niveles_educativos;");
  await connection.query("DROP TABLE IF EXISTS matriculas_legacy;");
  await connection.query("DROP TABLE IF EXISTS subniveles_educativos;");
  await connection.query("SET FOREIGN_KEY_CHECKS = 1;");
  
  console.log("Legacy tables dropped successfully.");
  await connection.end();
}

fix().catch(console.error);
