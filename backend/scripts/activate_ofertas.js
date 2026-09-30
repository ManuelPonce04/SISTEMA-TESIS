const mysql = require('mysql2/promise');
require('dotenv').config();

async function check() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'sistema_cobranzas'
  });
  
  await connection.query("UPDATE oferta_academica SET estado = 'ACTIVA'");
  console.log("Ofertas updated to ACTIVA");
  
  await connection.end();
}

check().catch(console.error);
