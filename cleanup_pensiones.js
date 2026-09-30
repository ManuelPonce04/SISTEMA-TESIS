const fs = require('fs');
const path = require('path');

const dirs = [
  'frontend/src/pages/pensiones',
  'frontend/src/pages/cobranzas',
  'frontend/src/components/pensiones',
  'frontend/src/components/cobranzas'
];

const files = [
  'frontend/src/services/asignacionPensionService.js',
  'frontend/src/services/cobranzasService.js',
  'frontend/src/services/cobroService.js',
  'frontend/src/services/mensualidadService.js',
  'frontend/src/services/pensionesConfigService.js',
  'frontend/src/services/pensionesService.js',
  'backend/routes/asignacionPensionRoutes.js',
  'backend/routes/cobranzasRoutes.js',
  'backend/routes/cobroRoutes.js',
  'backend/routes/mensualidadRoutes.js',
  'backend/routes/pensionesConfigRoutes.js',
  'backend/routes/pensionesRoutes.js',
  'backend/controllers/asignacionPensionController.js',
  'backend/controllers/cobranzasController.js',
  'backend/controllers/cobroController.js',
  'backend/controllers/mensualidadController.js',
  'backend/controllers/pensionesConfigController.js',
  'backend/controllers/pensionesController.js'
];

dirs.forEach(d => {
  const p = path.join(__dirname, d);
  if (fs.existsSync(p)) {
    fs.rmSync(p, { recursive: true, force: true });
    console.log('Deleted directory:', p);
  }
});

files.forEach(f => {
  const p = path.join(__dirname, f);
  if (fs.existsSync(p)) {
    fs.rmSync(p, { force: true });
    console.log('Deleted file:', p);
  }
});

console.log('¡Limpieza completa! Todos los archivos de pensiones y cobranzas fueron eliminados del disco.');
