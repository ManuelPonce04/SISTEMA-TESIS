/**
 * Utilidades para Facturación Electrónica SRI (Ecuador)
 * - Generación de Clave de Acceso de 49 dígitos (Módulo 11 con ponderación 7,6,5,4,3,2)
 * - Generador de comprobante XML versión 1.1.0 para facturas de servicios educativos (Tarifa 0% IVA)
 */

/**
 * Calcula el dígito verificador módulo 11 según la ficha técnica del SRI
 * Factores de ponderación: 2, 3, 4, 5, 6, 7 (de derecha a izquierda)
 */
function calcularModulo11(cadena48) {
  let factor = 2;
  let suma = 0;

  for (let i = cadena48.length - 1; i >= 0; i--) {
    const digito = parseInt(cadena48.charAt(i), 10);
    suma += digito * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }

  const residuo = suma % 11;
  const verificador = 11 - residuo;

  if (verificador === 11) return 0;
  if (verificador === 10) return 1;
  return verificador;
}

/**
 * Genera la clave de acceso oficial de 49 dígitos del SRI
 * 1. Fecha de emisión (8 dígitos: ddmmaaaa)
 * 2. Tipo de comprobante (2 dígitos: '01' Factura)
 * 3. Número de RUC emisor (13 dígitos)
 * 4. Tipo de ambiente (1 dígito: 1=Pruebas, 2=Producción)
 * 5. Serie (6 dígitos: Establecimiento 3 + Punto de emisión 3)
 * 6. Secuencial (9 dígitos)
 * 7. Código numérico aleatorio (8 dígitos)
 * 8. Tipo de emisión (1 dígito: 1=Normal)
 * 9. Dígito verificador módulo 11 (1 dígito)
 */
function generarClaveAcceso({
  fechaEmision, // 'YYYY-MM-DD' o 'DD/MM/YYYY'
  tipoComprobante = '01',
  ruc,
  ambiente = '1', // 1=Pruebas, 2=Producción
  establecimiento = '001',
  puntoEmision = '001',
  secuencial,
  codigoNumerico = null,
  tipoEmision = '1'
}) {
  // Formatear fecha a ddmmaaaa
  let ddmmaaaa = '';
  if (fechaEmision.includes('-')) {
    const [y, m, d] = fechaEmision.split('T')[0].split('-');
    ddmmaaaa = `${d.padStart(2, '0')}${m.padStart(2, '0')}${y}`;
  } else if (fechaEmision.includes('/')) {
    const [d, m, y] = fechaEmision.split('/');
    ddmmaaaa = `${d.padStart(2, '0')}${m.padStart(2, '0')}${y}`;
  } else {
    ddmmaaaa = fechaEmision;
  }

  const cleanRuc = String(ruc || '').padStart(13, '0').slice(0, 13);
  const cleanEstab = String(establecimiento || '001').padStart(3, '0').slice(0, 3);
  const cleanPto = String(puntoEmision || '001').padStart(3, '0').slice(0, 3);
  const cleanSec = String(secuencial || '1').padStart(9, '0').slice(0, 9);

  // Código numérico de 8 dígitos (si no viene, se genera uno aleatorio o basado en el secuencial)
  const cleanCodigoNum = codigoNumerico
    ? String(codigoNumerico).padStart(8, '0').slice(0, 8)
    : String(Math.floor(10000000 + Math.random() * 90000000));

  const base48 = `${ddmmaaaa}${tipoComprobante}${cleanRuc}${ambiente}${cleanEstab}${cleanPto}${cleanSec}${cleanCodigoNum}${tipoEmision}`;
  const digitoVerificador = calcularModulo11(base48);

  return `${base48}${digitoVerificador}`;
}

/**
 * Escapa caracteres reservados para XML
 */
function escapeXml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Mapeo de tipo de identificación a código SRI
 */
function mapTipoIdentificacionSri(tipo, identificacion) {
  if (identificacion === '9999999999999') return '07'; // Consumidor Final
  switch (String(tipo).toUpperCase()) {
    case 'RUC':
      return '04';
    case 'CEDULA':
    case 'CÉDULA':
      return '05';
    case 'PASAPORTE':
      return '06';
    case 'CONSUMIDOR_FINAL':
      return '07';
    case 'EXTERIOR':
      return '08';
    default:
      return identificacion && identificacion.length === 13 ? '04' : '05';
  }
}

/**
 * Mapeo de forma de pago a código SRI
 */
function mapFormaPagoSri(forma) {
  switch (String(forma).toUpperCase()) {
    case 'EFECTIVO':
      return '01'; // Sin utilización del sistema financiero
    case 'DEPOSITO':
    case 'DEPÓSITO':
    case 'TRANSFERENCIA':
      return '20'; // Otros con utilización del sistema financiero
    case 'TARJETA_CREDITO':
    case 'TARJETA DE CRÉDITO':
    case 'TARJETA':
      return '19'; // Tarjeta de crédito
    case 'TARJETA_DEBITO':
    case 'TARJETA DE DÉBITO':
      return '16'; // Tarjeta de débito
    case 'CHEQUE':
      return '02'; // Cheque propio
    default:
      return '01';
  }
}

/**
 * Genera el XML oficial de Factura versión 1.1.0 para el SRI
 */
function generarFacturaXml({ factura, institucion, detalles, cliente, estudiante }) {
  const inst = institucion || {};
  const cli = cliente || {};
  const fecha = factura.fecha_emision || new Date().toISOString().split('T')[0];

  // Formato de fecha para infoFactura: dd/mm/aaaa
  let fechaEmisionDoc = '';
  if (fecha.includes('-')) {
    const [y, m, d] = fecha.split('T')[0].split('-');
    fechaEmisionDoc = `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
  } else {
    fechaEmisionDoc = fecha;
  }

  const ambiente = inst.ambiente || '1'; // 1=Pruebas, 2=Producción
  const tipoIdentificacionComprador = mapTipoIdentificacionSri(cli.tipo_identificacion, cli.identificacion);
  const formaPagoSri = mapFormaPagoSri(factura.forma_pago);

  // Clave de acceso
  const claveAcceso = factura.clave_acceso || generarClaveAcceso({
    fechaEmision: fecha,
    tipoComprobante: '01',
    ruc: inst.ruc || '1790000000001',
    ambiente,
    establecimiento: factura.establecimiento || inst.establecimiento || '001',
    puntoEmision: factura.punto_emision || inst.punto_emision || '001',
    secuencial: factura.secuencial || '1',
    tipoEmision: '1'
  });

  const subtotal0 = (parseFloat(factura.subtotal_0) || 0).toFixed(2);
  const subtotalIva = (parseFloat(factura.subtotal_iva) || 0).toFixed(2);
  const totalIva = (parseFloat(factura.iva) || 0).toFixed(2);
  const granTotal = (parseFloat(factura.total) || 0).toFixed(2);

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<factura id="comprobante" version="1.1.0">\n`;

  // 1. infoTributaria
  xml += `  <infoTributaria>\n`;
  xml += `    <ambiente>${escapeXml(ambiente)}</ambiente>\n`;
  xml += `    <tipoEmision>1</tipoEmision>\n`;
  xml += `    <razonSocial>${escapeXml(inst.razon_social || 'UNIDAD EDUCATIVA JUAN LEON MERA')}</razonSocial>\n`;
  if (inst.nombre_comercial) {
    xml += `    <nombreComercial>${escapeXml(inst.nombre_comercial)}</nombreComercial>\n`;
  }
  xml += `    <ruc>${escapeXml(inst.ruc || '1790000000001')}</ruc>\n`;
  xml += `    <claveAcceso>${escapeXml(claveAcceso)}</claveAcceso>\n`;
  xml += `    <codDoc>01</codDoc>\n`;
  xml += `    <estab>${escapeXml(factura.establecimiento || '001')}</estab>\n`;
  xml += `    <ptoEmi>${escapeXml(factura.punto_emision || '001')}</ptoEmi>\n`;
  xml += `    <secuencial>${String(factura.secuencial || '1').padStart(9, '0')}</secuencial>\n`;
  xml += `    <dirMatriz>${escapeXml(inst.direccion_matriz || 'Matriz Ambato - Ecuador')}</dirMatriz>\n`;
  if (inst.regimen && inst.regimen !== 'GENERAL') {
    xml += `    <contribuyenteRimpe>${escapeXml(inst.regimen)}</contribuyenteRimpe>\n`;
  }
  xml += `  </infoTributaria>\n`;

  // 2. infoFactura
  xml += `  <infoFactura>\n`;
  xml += `    <fechaEmision>${escapeXml(fechaEmisionDoc)}</fechaEmision>\n`;
  xml += `    <dirEstablecimiento>${escapeXml(inst.direccion_establecimiento || inst.direccion_matriz || 'Ambato')}</dirEstablecimiento>\n`;
  if (inst.contribuyente_especial) {
    xml += `    <contribuyenteEspecial>${escapeXml(inst.contribuyente_especial)}</contribuyenteEspecial>\n`;
  }
  xml += `    <obligadoContabilidad>${inst.obligado_contabilidad === 'SI' ? 'SI' : 'NO'}</obligadoContabilidad>\n`;
  xml += `    <tipoIdentificacionComprador>${escapeXml(tipoIdentificacionComprador)}</tipoIdentificacionComprador>\n`;
  xml += `    <razonSocialComprador>${escapeXml(cli.razon_social || 'CONSUMIDOR FINAL')}</razonSocialComprador>\n`;
  xml += `    <identificacionComprador>${escapeXml(cli.identificacion || '9999999999999')}</identificacionComprador>\n`;
  if (cli.direccion) {
    xml += `    <direccionComprador>${escapeXml(cli.direccion)}</direccionComprador>\n`;
  }
  xml += `    <totalSinImpuestos>${(parseFloat(subtotal0) + parseFloat(subtotalIva)).toFixed(2)}</totalSinImpuestos>\n`;
  xml += `    <totalDescuento>0.00</totalDescuento>\n`;

  // totalConImpuestos
  xml += `    <totalConImpuestos>\n`;
  // Tarifa 0% (Educación exenta según LORTI)
  xml += `      <totalImpuesto>\n`;
  xml += `        <codigo>2</codigo>\n`;
  xml += `        <codigoPorcentaje>0</codigoPorcentaje>\n`;
  xml += `        <baseImponible>${subtotal0}</baseImponible>\n`;
  xml += `        <tarifa>0.00</tarifa>\n`;
  xml += `        <valor>0.00</valor>\n`;
  xml += `      </totalImpuesto>\n`;

  // Si hubiera tarifa IVA > 0
  if (parseFloat(subtotalIva) > 0) {
    xml += `      <totalImpuesto>\n`;
    xml += `        <codigo>2</codigo>\n`;
    xml += `        <codigoPorcentaje>2</codigoPorcentaje>\n`;
    xml += `        <baseImponible>${subtotalIva}</baseImponible>\n`;
    xml += `        <tarifa>${(parseFloat(factura.tarifa_iva) || 15).toFixed(2)}</tarifa>\n`;
    xml += `        <valor>${totalIva}</valor>\n`;
    xml += `      </totalImpuesto>\n`;
  }
  xml += `    </totalConImpuestos>\n`;

  xml += `    <propina>0.00</propina>\n`;
  xml += `    <importeTotal>${granTotal}</importeTotal>\n`;
  xml += `    <moneda>DOLAR</moneda>\n`;

  // Pagos
  xml += `    <pagos>\n`;
  xml += `      <pago>\n`;
  xml += `        <formaPago>${escapeXml(formaPagoSri)}</formaPago>\n`;
  xml += `        <total>${granTotal}</total>\n`;
  xml += `        <plazo>0</plazo>\n`;
  xml += `        <unidadTiempo>dias</unidadTiempo>\n`;
  xml += `      </pago>\n`;
  xml += `    </pagos>\n`;

  xml += `  </infoFactura>\n`;

  // 3. detalles
  xml += `  <detalles>\n`;
  (detalles || []).forEach(d => {
    const cant = (parseFloat(d.cantidad) || 1).toFixed(2);
    const pUnit = (parseFloat(d.precio_unitario) || 0).toFixed(2);
    const desc = (parseFloat(d.descuento) || 0).toFixed(2);
    const totSinImp = ((parseFloat(cant) * parseFloat(pUnit)) - parseFloat(desc)).toFixed(2);

    xml += `    <detalle>\n`;
    xml += `      <codigoPrincipal>${escapeXml(d.codigo || 'PEN')}</codigoPrincipal>\n`;
    xml += `      <descripcion>${escapeXml(d.descripcion || 'Pensión Educativa')}</descripcion>\n`;
    xml += `      <cantidad>${cant}</cantidad>\n`;
    xml += `      <precioUnitario>${pUnit}</precioUnitario>\n`;
    xml += `      <descuento>${desc}</descuento>\n`;
    xml += `      <precioTotalSinImpuesto>${totSinImp}</precioTotalSinImpuesto>\n`;
    xml += `      <impuestos>\n`;
    xml += `        <impuesto>\n`;
    xml += `          <codigo>2</codigo>\n`;
    xml += `          <codigoPorcentaje>0</codigoPorcentaje>\n`;
    xml += `          <tarifa>0.00</tarifa>\n`;
    xml += `          <baseImponible>${totSinImp}</baseImponible>\n`;
    xml += `          <valor>0.00</valor>\n`;
    xml += `        </impuesto>\n`;
    xml += `      </impuestos>\n`;
    xml += `    </detalle>\n`;
  });
  xml += `  </detalles>\n`;

  // 4. infoAdicional
  const infoExtra = [];
  if (cli.email) infoExtra.push({ nombre: 'Email', valor: cli.email });
  if (cli.telefono) infoExtra.push({ nombre: 'Telefono', valor: cli.telefono });
  if (estudiante) {
    const nomEst = `${estudiante.apellidos || ''} ${estudiante.nombres || ''}`.trim();
    if (nomEst) infoExtra.push({ nombre: 'Estudiante', valor: nomEst });
    if (estudiante.codigo) infoExtra.push({ nombre: 'Codigo Estudiante', valor: estudiante.codigo });
  }
  if (factura.observaciones) infoExtra.push({ nombre: 'Observaciones', valor: factura.observaciones });

  if (infoExtra.length > 0) {
    xml += `  <infoAdicional>\n`;
    infoExtra.forEach(item => {
      xml += `    <campoAdicional nombre="${escapeXml(item.nombre)}">${escapeXml(item.valor)}</campoAdicional>\n`;
    });
    xml += `  </infoAdicional>\n`;
  }

  xml += `</factura>`;
  return { xml, claveAcceso };
}

module.exports = {
  calcularModulo11,
  generarClaveAcceso,
  generarFacturaXml,
  mapTipoIdentificacionSri,
  mapFormaPagoSri
};
