require('dotenv').config();
const mysql = require('mysql2/promise');

async function checkSchema() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'sistema_cobranzas'
  });

  const [tables] = await connection.query('SHOW TABLES');
  for (const tableRow of tables) {
    const tableName = Object.values(tableRow)[0];
    if (tableName.includes('periodo') || tableName.includes('nivel') || tableName.includes('curso') || tableName.includes('paralelo') || tableName.includes('jornada') || tableName.includes('oferta')) {
      console.log(`\n--- ${tableName} ---`);
      const [columns] = await connection.query(`DESCRIBE ${tableName}`);
      columns.forEach(col => {
        console.log(`${col.Field} ${col.Type} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${col.Default ? 'DEFAULT ' + col.Default : ''}`);
      });
    }
  }

  // Check periodos_lectivos specifically
  console.log(`\n--- periodos_lectivos ---`);
  try {
      const [columns] = await connection.query(`DESCRIBE periodos_lectivos`);
      columns.forEach(col => {
        console.log(`${col.Field} ${col.Type} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${col.Default ? 'DEFAULT ' + col.Default : ''}`);
      });
  } catch (e) {
      console.log('No periodos_lectivos table found');
  }

  await connection.end();
}

checkSchema().catch(console.error);
