const pool = require('../config/db');

async function check() {
  const connection = await pool.getConnection();
  try {
    const [rows1] = await connection.execute('DESCRIBE representantes');
    console.log('--- REPRESENTANTES ---');
    console.log(rows1.map(r => r.Field).join(', '));
    
    const [rows2] = await connection.execute('DESCRIBE estudiantes');
    console.log('--- ESTUDIANTES ---');
    console.log(rows2.map(r => r.Field).join(', '));
    
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  } finally {
    connection.release();
  }
}
check();
