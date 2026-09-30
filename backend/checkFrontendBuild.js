/**
 * Script de verificación del Frontend - Captura errores reales de build
 */
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const frontendPath = path.resolve(__dirname, '..', 'frontend');

console.log('=== VERIFICACIÓN DE COMPILACIÓN FRONTEND ===');
console.log(`Directorio: ${frontendPath}\n`);

// Check node_modules exists
if (!fs.existsSync(path.join(frontendPath, 'node_modules'))) {
  console.log('⚠️  node_modules no encontrado. Instalando dependencias...');
  try {
    execSync('npm install', { cwd: frontendPath, encoding: 'utf8', stdio: 'pipe' });
    console.log('✅ Dependencias instaladas.');
  } catch (e) {
    console.log('❌ Error instalando dependencias:', e.stdout || e.message);
    process.exit(1);
  }
}

// Run vite type check via tsc first if tsconfig exists
const tsconfigPath = path.join(frontendPath, 'tsconfig.json');
if (fs.existsSync(tsconfigPath)) {
  console.log('Verificando tipos TypeScript...');
  try {
    const tsc = execSync('npx tsc --noEmit 2>&1', { cwd: frontendPath, encoding: 'utf8', timeout: 60000 });
    console.log('✅ TypeScript sin errores de tipos.');
  } catch (e) {
    console.log('⚠️  Advertencias de TypeScript:');
    console.log((e.stdout || e.message).substring(0, 2000));
  }
}

// Run full vite build
console.log('\nEjecutando build completo (Vite)...');
try {
  const buildOutput = execSync('npx vite build 2>&1', {
    cwd: frontendPath,
    encoding: 'utf8',
    timeout: 120000,
  });
  console.log('✅ BUILD EXITOSO');
  // Show last lines with stats
  const lines = buildOutput.split('\n').slice(-20).join('\n');
  console.log(lines);
} catch (error) {
  const out = (error.stdout || '') + '\n' + (error.stderr || '');
  const lines = out.split('\n');
  
  // Filter relevant error lines
  const errorLines = lines.filter(l => 
    l.includes('error') || l.includes('Error') || l.includes('ERROR') ||
    l.includes('[plugin') || l.includes('SyntaxError') ||
    l.includes('Cannot find') || l.includes('does not exist') ||
    l.includes('✗') || l.includes('failed')
  );
  
  console.log('❌ BUILD FALLIDO\n');
  console.log('--- Errores Detectados ---');
  if (errorLines.length > 0) {
    errorLines.forEach(l => console.log(l));
  } else {
    // Print full output if no specific errors found
    console.log(out.substring(0, 3000));
  }
}
