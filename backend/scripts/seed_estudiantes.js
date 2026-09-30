const pool = require('../config/db');
const estudianteModel = require('../models/estudianteModel');

const NOMBRES = ['Juan', 'Maria', 'Carlos', 'Luis', 'Ana', 'Jose', 'Diego', 'Lucia', 'Daniela', 'Sofia', 'Pedro', 'Pablo', 'Mateo', 'Valeria', 'Camila'];
const APELLIDOS = ['Gomez', 'Perez', 'Rodriguez', 'Fernandez', 'Lopez', 'Martinez', 'Sanchez', 'Mendoza', 'Zambrano', 'Velez', 'Garcia', 'Moreira'];

const randEl = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randCedula = () => '13' + Math.floor(10000000 + Math.random() * 90000000); // 13xxxxxxxx (Manabí)

async function seed() {
  console.log('Iniciando inserción de 10 estudiantes de prueba...');
  try {
    for (let i = 0; i < 10; i++) {
      const nombre1 = randEl(NOMBRES);
      const nombre2 = randEl(NOMBRES);
      const apellido1 = randEl(APELLIDOS);
      const apellido2 = randEl(APELLIDOS);
      
      const cedulaEst = randCedula();
      const cedulaRep = randCedula();
      
      const data = {
        nombres: `${nombre1} ${nombre2}`,
        apellidos: `${apellido1} ${apellido2}`,
        cedula: cedulaEst,
        fecha_nacimiento: `201${Math.floor(Math.random() * 5 + 4)}-0${Math.floor(Math.random() * 9 + 1)}-1${Math.floor(Math.random() * 9)}`,
        sexo: Math.random() > 0.5 ? 'Masculino' : 'Femenino',
        es_nuevo: Math.random() > 0.5,
        representantes: [
          {
            nombres: randEl(NOMBRES) + ' ' + randEl(NOMBRES),
            apellidos: apellido1 + ' ' + randEl(APELLIDOS),
            cedula: cedulaRep,
            parentesco: 'Padre',
            es_principal: 1,
            es_responsable_economico: 1,
            telefono: '09' + Math.floor(10000000 + Math.random() * 90000000),
            correo: `${nombre1.toLowerCase()}.${apellido1.toLowerCase()}@test.com`
          }
        ]
      };
      
      const estudiante = await estudianteModel.create(data);
      console.log(`✅ Creado: ${data.apellidos} ${data.nombres} (Código: ${estudiante.codigo || 'Autogenerado'})`);
    }
    console.log('🎉 ¡10 estudiantes insertados correctamente!');
  } catch (error) {
    console.error('❌ Error insertando estudiantes:', error);
  } finally {
    process.exit(0);
  }
}

seed();
