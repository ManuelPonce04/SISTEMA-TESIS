/**
 * Seed: Tipos de Beneficio de Pensión
 * IDEMPOTENTE: usa INSERT IGNORE por código único.
 * NO asigna beneficios a ningún estudiante.
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

const BENEFICIOS = [
  {
    codigo: 'PENSION_NORMAL',
    nombre: 'Pensión Normal',
    descripcion: 'Tarifa estándar de pensión sin beneficio adicional.',
    categoria: 'OTRO',
    tipo_calculo: 'VALOR_FINAL',
    valor_predeterminado: null,
    porcentaje_predeterminado: null,
    requiere_documento: false,
    requiere_autorizacion: false,
    permite_acumulacion: false,
    prioridad: 0,
    activo: true,
  },
  {
    codigo: 'DESCUENTO_HERMANOS',
    nombre: 'Descuento por Hermanos',
    descripcion: 'Descuento aplicable cuando hay dos o más hermanos matriculados en el mismo periodo. El porcentaje es configurable.',
    categoria: 'DESCUENTO',
    tipo_calculo: 'PORCENTAJE',
    valor_predeterminado: null,
    porcentaje_predeterminado: null, // configurable por institución
    requiere_documento: false,
    requiere_autorizacion: true,
    permite_acumulacion: false,
    prioridad: 10,
    activo: true,
  },
  {
    codigo: 'DESCUENTO_3_HERMANOS',
    nombre: 'Descuento por Tres Hermanos',
    descripcion: 'Descuento aplicable cuando hay tres o más hermanos matriculados en el mismo periodo. El porcentaje es configurable.',
    categoria: 'DESCUENTO',
    tipo_calculo: 'PORCENTAJE',
    valor_predeterminado: null,
    porcentaje_predeterminado: null, // configurable
    requiere_documento: false,
    requiere_autorizacion: true,
    permite_acumulacion: false,
    prioridad: 15,
    activo: true,
  },
  {
    codigo: 'BECA_10',
    nombre: 'Beca 10%',
    descripcion: 'Beca institucional equivalente al 10% de descuento sobre la tarifa base.',
    categoria: 'BECA',
    tipo_calculo: 'PORCENTAJE',
    valor_predeterminado: null,
    porcentaje_predeterminado: 10.0000,
    requiere_documento: true,
    requiere_autorizacion: true,
    permite_acumulacion: false,
    prioridad: 20,
    activo: true,
  },
  {
    codigo: 'BECA_20',
    nombre: 'Beca 20%',
    descripcion: 'Beca institucional equivalente al 20% de descuento sobre la tarifa base.',
    categoria: 'BECA',
    tipo_calculo: 'PORCENTAJE',
    valor_predeterminado: null,
    porcentaje_predeterminado: 20.0000,
    requiere_documento: true,
    requiere_autorizacion: true,
    permite_acumulacion: false,
    prioridad: 25,
    activo: true,
  },
  {
    codigo: 'BECA_50',
    nombre: 'Beca 50%',
    descripcion: 'Beca institucional equivalente al 50% de descuento sobre la tarifa base.',
    categoria: 'BECA',
    tipo_calculo: 'PORCENTAJE',
    valor_predeterminado: null,
    porcentaje_predeterminado: 50.0000,
    requiere_documento: true,
    requiere_autorizacion: true,
    permite_acumulacion: false,
    prioridad: 30,
    activo: true,
  },
  {
    codigo: 'HIJO_DOCENTE',
    nombre: 'Hijo de Docente',
    descripcion: 'Descuento para hijos de docentes de la institución. El porcentaje exacto es configurable según la política institucional.',
    categoria: 'DESCUENTO',
    tipo_calculo: 'PORCENTAJE',
    valor_predeterminado: null,
    porcentaje_predeterminado: null, // NO se asume porcentaje
    requiere_documento: true,
    requiere_autorizacion: true,
    permite_acumulacion: false,
    prioridad: 35,
    activo: true,
  },
  {
    codigo: 'ORFANDAD',
    nombre: 'Orfandad',
    descripcion: 'Beneficio por condición de orfandad debidamente documentada. El porcentaje o valor es configurable.',
    categoria: 'BECA',
    tipo_calculo: 'PORCENTAJE',
    valor_predeterminado: null,
    porcentaje_predeterminado: null,
    requiere_documento: true,
    requiere_autorizacion: true,
    permite_acumulacion: false,
    prioridad: 40,
    activo: true,
  },
  {
    codigo: 'DISCAPACIDAD',
    nombre: 'Discapacidad',
    descripcion: 'Beneficio para estudiantes con discapacidad certificada. Requiere certificado del CONADIS o entidad competente.',
    categoria: 'BECA',
    tipo_calculo: 'PORCENTAJE',
    valor_predeterminado: null,
    porcentaje_predeterminado: null,
    requiere_documento: true,
    requiere_autorizacion: true,
    permite_acumulacion: false,
    prioridad: 45,
    activo: true,
  },
  {
    codigo: 'BECA_ARTISTICA',
    nombre: 'Beca Artística',
    descripcion: 'Beca para estudiantes con reconocida aptitud artística. El porcentaje es configurable.',
    categoria: 'BECA',
    tipo_calculo: 'PORCENTAJE',
    valor_predeterminado: null,
    porcentaje_predeterminado: null,
    requiere_documento: true,
    requiere_autorizacion: true,
    permite_acumulacion: true,
    prioridad: 50,
    activo: true,
  },
  {
    codigo: 'PENSION_DIFERENCIADA',
    nombre: 'Pensión Diferenciada',
    descripcion: 'Valor mensual especial autorizado por la dirección. Se define un valor final específico en lugar de aplicar porcentaje.',
    categoria: 'PENSION_DIFERENCIADA',
    tipo_calculo: 'VALOR_FINAL',
    valor_predeterminado: null,
    porcentaje_predeterminado: null,
    requiere_documento: true,
    requiere_autorizacion: true,
    permite_acumulacion: false,
    prioridad: 100,
    activo: true,
  },
  {
    codigo: 'EXONERACION_TOTAL',
    nombre: 'Exoneración Total',
    descripcion: 'El estudiante queda exonerado del pago de pensión. Valor final = $0. Requiere resolución institucional.',
    categoria: 'EXONERACION',
    tipo_calculo: 'EXONERACION_TOTAL',
    valor_predeterminado: 0.00,
    porcentaje_predeterminado: null,
    requiere_documento: true,
    requiere_autorizacion: true,
    permite_acumulacion: false,
    prioridad: 200, // máxima prioridad
    activo: true,
  },
  {
    codigo: 'OTRO_BENEFICIO',
    nombre: 'Otro Beneficio',
    descripcion: 'Beneficio de naturaleza especial no categorizado. El administrador define el tipo de cálculo y valor en la asignación individual.',
    categoria: 'OTRO',
    tipo_calculo: 'PORCENTAJE',
    valor_predeterminado: null,
    porcentaje_predeterminado: null,
    requiere_documento: false,
    requiere_autorizacion: true,
    permite_acumulacion: false,
    prioridad: 5,
    activo: true,
  },
];

async function seed() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'sistema_cobranzas',
  });

  console.log('\n========================================');
  console.log('  Seed: Tipos de Beneficio de Pensión');
  console.log('========================================\n');

  try {
    let insertados = 0;
    let omitidos = 0;

    for (const b of BENEFICIOS) {
      const [result] = await connection.query(
        `INSERT IGNORE INTO tipos_beneficio_pension
           (codigo, nombre, descripcion, categoria, tipo_calculo,
            valor_predeterminado, porcentaje_predeterminado,
            requiere_documento, requiere_autorizacion,
            permite_acumulacion, prioridad, activo)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          b.codigo, b.nombre, b.descripcion, b.categoria, b.tipo_calculo,
          b.valor_predeterminado, b.porcentaje_predeterminado,
          b.requiere_documento, b.requiere_autorizacion,
          b.permite_acumulacion, b.prioridad, b.activo,
        ]
      );
      if (result.affectedRows > 0) {
        console.log(`  ✅  [${b.codigo}] insertado`);
        insertados++;
      } else {
        console.log(`  ⚠️   [${b.codigo}] ya existe, omitido`);
        omitidos++;
      }
    }

    console.log(`\n✅ Seed completado: ${insertados} insertados, ${omitidos} omitidos.\n`);
  } catch (error) {
    console.error('\n❌ Error en seed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

seed();
