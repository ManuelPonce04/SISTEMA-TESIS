/**
 * Script de utilidad: Genera un hash bcrypt para una contraseña
 * Uso: node generate-hash.js
 */
const bcrypt = require('bcryptjs');

const password = 'Admin2026!';
const saltRounds = 10;

bcrypt.hash(password, saltRounds, (err, hash) => {
  if (err) {
    console.error('Error al generar hash:', err);
    return;
  }
  console.log('\n✅ Hash generado correctamente:');
  console.log('─'.repeat(70));
  console.log(`Contraseña original: ${password}`);
  console.log(`Hash bcrypt:         ${hash}`);
  console.log('─'.repeat(70));
  console.log('\n📋 Copia el hash y úsalo en el INSERT de schema.sql\n');
});
