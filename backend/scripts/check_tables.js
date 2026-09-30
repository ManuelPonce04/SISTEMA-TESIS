require('dotenv').config();
const mysql = require('mysql2/promise');

async function checkTables() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'sistema_cobranzas'
  });
  const [rows] = await connection.query('SHOW TABLES');
  console.log(rows);
  process.exit(0);
}
checkTables();
