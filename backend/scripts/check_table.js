const mysql = require('mysql2/promise');
require('dotenv').config();

async function check() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'sistema_cobranzas'
  });
  
  const [rows] = await connection.query("SHOW CREATE TABLE periodos_lectivos");
  console.log(rows[0]['Create Table']);
  
  await connection.end();
}

check().catch(console.error);
