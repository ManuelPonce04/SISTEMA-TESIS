const bcrypt = require('bcryptjs');

async function test() {
  const hash = '$2b$10$9.wdLLQFJR1RsZCYEw5lZujW.vhxgziX9D9V9XHdEEfnG58l8Fc8q';
  const matches = await bcrypt.compare('Admin2026!', hash);
  console.log("¿Admin2026! coincide con el hash?", matches);
  
  // Si no coincide, generemos uno nuevo para Admin2026! y mostremos cuál debería ser
  const newHash = await bcrypt.hash('Admin2026!', 10);
  console.log("Nuevo hash sugerido para Admin2026!:", newHash);
  
  process.exit(0);
}

test();
