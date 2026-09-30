/**
 * Servicio de Integración para Facturación Electrónica SRI (Ecuador)
 * Documentación y Web Services SOAP oficiales:
 *
 * PRUEBAS (Celcer):
 * - Recepción:    https://celcer.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline?wsdl
 * - Autorización: https://celcer.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline?wsdl
 *
 * PRODUCCIÓN:
 * - Recepción:    https://cel.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline?wsdl
 * - Autorización: https://cel.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline?wsdl
 */

const { generarClaveAcceso, generarFacturaXml } = require('../utils/sriXmlGenerator');
const db = require('../config/db');

const SRI_URLS = {
  PRUEBAS: {
    recepcion: 'https://celcer.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline?wsdl',
    autorizacion: 'https://celcer.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline?wsdl'
  },
  PRODUCCION: {
    recepcion: 'https://cel.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline?wsdl',
    autorizacion: 'https://cel.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline?wsdl'
  }
};

/**
 * Obtiene o genera el XML oficial v1.1.0 para una factura específica
 */
async function getXmlFactura(facturaId) {
  // 1. Obtener factura
  const [[factura]] = await db.query('SELECT * FROM facturas WHERE id = ?', [facturaId]);
  if (!factura) throw new Error('Factura no encontrada.');

  // 2. Institución
  const [[institucion]] = await db.query('SELECT * FROM institucion_config ORDER BY id ASC LIMIT 1');

  // 3. Cliente
  const [[cliente]] = await db.query('SELECT * FROM clientes_facturacion WHERE id = ?', [factura.cliente_id]);

  // 4. Estudiante
  let estudiante = null;
  if (factura.estudiante_id) {
    const [[est]] = await db.query('SELECT * FROM estudiantes WHERE id_estudiante = ?', [factura.estudiante_id]);
    estudiante = est;
  }

  // 5. Detalles
  const [detalles] = await db.query('SELECT * FROM factura_detalles WHERE factura_id = ?', [facturaId]);

  // Si la factura no tenía clave de acceso, generarla y guardarla
  if (!factura.clave_acceso) {
    const clave = generarClaveAcceso({
      fechaEmision: factura.fecha_emision,
      tipoComprobante: '01',
      ruc: institucion?.ruc || '1790000000001',
      ambiente: institucion?.ambiente || '1',
      establecimiento: factura.establecimiento || '001',
      puntoEmision: factura.punto_emision || '001',
      secuencial: factura.secuencial,
      tipoEmision: '1'
    });

    await db.query('UPDATE facturas SET clave_acceso = ? WHERE id = ?', [clave, facturaId]);
    factura.clave_acceso = clave;
  }

  const { xml, claveAcceso } = generarFacturaXml({
    factura,
    institucion,
    detalles,
    cliente,
    estudiante
  });

  return {
    xml,
    claveAcceso,
    factura,
    institucion,
    cliente
  };
}

/**
 * Simulación de envío y autorización con el SRI
 * En un despliegue con certificado .p12 activo, aquí se firma XAdES-BES y se consume el SOAP WSDL.
 */
async function simularProcesamientoSri(facturaId) {
  const { xml, claveAcceso, factura, institucion } = await getXmlFactura(facturaId);

  const ambiente = institucion?.ambiente === '2' ? 'PRODUCCION' : 'PRUEBAS';
  const urls = SRI_URLS[ambiente];
  const fechaNow = new Date().toISOString().replace('T', ' ').slice(0, 19);

  // Simular respuesta exitosa de autorización
  const estadoSri = 'AUTORIZADO';
  const numeroAutorizacion = claveAcceso; // En modo offline el SRI suele usar la misma clave de acceso como nro de autorización

  await db.query(`
    UPDATE facturas SET
      clave_acceso = ?,
      estado_sri = ?,
      numero_autorizacion = ?,
      fecha_autorizacion = NOW()
    WHERE id = ?
  `, [claveAcceso, estadoSri, numeroAutorizacion, facturaId]);

  return {
    success: true,
    estado_sri: estadoSri,
    clave_acceso: claveAcceso,
    numero_autorizacion: numeroAutorizacion,
    fecha_autorizacion: fechaNow,
    ambiente,
    web_service_recepcion: urls.recepcion,
    web_service_autorizacion: urls.autorizacion,
    mensaje: `Factura ${factura.numero} autorizada exitosamente en ambiente de ${ambiente}.`
  };
}

module.exports = {
  SRI_URLS,
  getXmlFactura,
  simularProcesamientoSri
};
