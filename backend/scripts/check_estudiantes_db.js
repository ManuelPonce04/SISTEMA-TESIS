const mysql = require('mysql2/promise');
require('dotenv').config();

async function check() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'sistema_cobranzas'
  });
  
  const [rows] = await connection.query("SELECT id_estudiante, nombres, apellidos, apellidos_nombres FROM estudiantes");
  console.log(rows);
  
  await connection.end();
}

check().catch(console.error);
