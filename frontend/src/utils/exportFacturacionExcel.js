/**
 * Utilidades para exportación a Excel / CSV (compatible con Microsoft Excel y LibreOffice)
 * Utiliza codificación UTF-8 con Byte Order Mark (\uFEFF) y separador de punto y coma ';'
 * para compatibilidad nativa inmediata en sistemas en español / Windows.
 */

const fmt$ = (n) => (parseFloat(n) || 0).toFixed(2);

/**
 * Dispara la descarga de un archivo de texto en el navegador del usuario.
 */
function descargarArchivo(contenido, nombreArchivo, tipo = 'text/csv;charset=utf-8;') {
  const blob = new Blob(['\uFEFF' + contenido], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', nombreArchivo);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Escapa comillas y envuelve valores para formato CSV
 */
function escapeCsv(val) {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Exporta el listado de facturas a CSV compatible con Excel
 */
export function exportarHistorialFacturasExcel(facturas = [], filtros = {}) {
  const lineas = [];

  // Título e información
  lineas.push(['REPORTE DE FACTURACIÓN ELECTRÓNICA - SIGCOP-KPI'].map(escapeCsv).join(';'));
  lineas.push([`Fecha de Generación: ${new Date().toLocaleString('es-EC')}`].map(escapeCsv).join(';'));
  if (filtros.fecha_desde || filtros.fecha_hasta) {
    lineas.push([`Rango: ${filtros.fecha_desde || 'Inicio'} hasta ${filtros.fecha_hasta || 'Hoy'}`].map(escapeCsv).join(';'));
  }
  lineas.push([]); // Línea en blanco

  // Cabecera de columnas
  const encabezados = [
    'N° Factura',
    'Fecha Emisión',
    'RUC / Cédula',
    'Razón Social / Cliente',
    'Estudiante',
    'Curso / Paralelo',
    'Forma de Pago',
    'Subtotal 0%',
    'Subtotal IVA',
    'IVA',
    'Total ($)',
    'Estado',
    'Motivo Anulación'
  ];
  lineas.push(encabezados.map(escapeCsv).join(';'));

  let granTotal = 0;
  let totalSubtotal0 = 0;
  let totalIva = 0;
  let emitidasCount = 0;
  let anuladasCount = 0;

  facturas.forEach(f => {
    const total = parseFloat(f.total) || 0;
    const sub0 = parseFloat(f.subtotal_0) || 0;
    const iva = parseFloat(f.iva) || 0;

    if (f.estado === 'EMITIDA') {
      granTotal += total;
      totalSubtotal0 += sub0;
      totalIva += iva;
      emitidasCount++;
    } else {
      anuladasCount++;
    }

    const row = [
      f.numero || '',
      f.fecha_emision || '',
      f.cliente_identificacion || '',
      f.cliente_razon_social || '',
      f.estudiante_nombre || '',
      f.curso_nombre ? `${f.curso_nombre} ${f.paralelo || ''}`.trim() : '',
      f.forma_pago || '',
      fmt$(sub0),
      fmt$(f.subtotal_iva || 0),
      fmt$(iva),
      fmt$(total),
      f.estado || '',
      f.motivo_anulacion || ''
    ];
    lineas.push(row.map(escapeCsv).join(';'));
  });

  // Línea en blanco y Totales
  lineas.push([]);
  lineas.push([
    'RESUMEN GENERAL',
    '',
    '',
    '',
    '',
    '',
    'TOTALES VÁLIDOS:',
    fmt$(totalSubtotal0),
    '0.00',
    fmt$(totalIva),
    fmt$(granTotal),
    `Emitidas: ${emitidasCount} | Anuladas: ${anuladasCount}`,
    ''
  ].map(escapeCsv).join(';'));

  const contenido = lineas.join('\r\n');
  const fechaHoy = new Date().toISOString().split('T')[0];
  descargarArchivo(contenido, `Historial_Facturas_${fechaHoy}.csv`);
}

/**
 * Exporta el reporte de Cierre de Facturación / Arqueo Diario
 */
export function exportarCierreFacturacionExcel(cierre) {
  if (!cierre) return;
  const lineas = [];
  const inst = cierre.institucion || {};

  lineas.push([inst.nombre_comercial || 'UNIDAD EDUCATIVA JUAN LEÓN MERA'].map(escapeCsv).join(';'));
  lineas.push([`RUC: ${inst.ruc || '1790000000001'} - ${inst.razon_social || ''}`].map(escapeCsv).join(';'));
  lineas.push(['REPORTE DE CIERRE Y ARQUEO DIARIO DE FACTURACIÓN'].map(escapeCsv).join(';'));
  lineas.push([`Fecha de Corte: ${cierre.fecha}`].map(escapeCsv).join(';'));
  lineas.push([`Generado: ${new Date().toLocaleString('es-EC')}`].map(escapeCsv).join(';'));
  lineas.push([]);

  // Resumen del Cierre
  lineas.push(['CUADRE FINANCIERO', 'CANTIDAD', 'MONTO ($)'].map(escapeCsv).join(';'));
  lineas.push(['Total Cobrado en Pensiones (Caja/Bancos)', cierre.cobrado?.cantidad || 0, fmt$(cierre.cobrado?.monto || 0)].map(escapeCsv).join(';'));
  lineas.push(['Total Facturado Válido (Facturas Emitidas)', cierre.facturado?.cantidad || 0, fmt$(cierre.facturado?.monto || 0)].map(escapeCsv).join(';'));
  lineas.push(['Total Facturas Anuladas', cierre.anuladas?.cantidad || 0, fmt$(cierre.anuladas?.monto || 0)].map(escapeCsv).join(';'));
  lineas.push(['Diferencia / Pendiente de Facturar', '', fmt$(cierre.diferencia?.monto || 0)].map(escapeCsv).join(';'));
  lineas.push(['Estado de Arqueo', '', cierre.diferencia?.estado || 'CUADRADO'].map(escapeCsv).join(';'));
  lineas.push([]);

  // Desglose por forma de pago
  if (cierre.facturado?.por_forma_pago?.length > 0) {
    lineas.push(['DESGLOSE POR FORMA DE PAGO (FACTURADO)'].map(escapeCsv).join(';'));
    lineas.push(['Forma de Pago', 'Cantidad Facturas', 'Total ($)'].map(escapeCsv).join(';'));
    cierre.facturado.por_forma_pago.forEach(fp => {
      lineas.push([fp.forma_pago, fp.cantidad, fmt$(fp.total)].map(escapeCsv).join(';'));
    });
    lineas.push([]);
  }

  // Detalle de Facturas Emitidas
  if (cierre.facturas?.length > 0) {
    lineas.push(['DETALLE DE FACTURAS EMITIDAS'].map(escapeCsv).join(';'));
    lineas.push(['N° Factura', 'RUC/Cédula', 'Cliente', 'Estudiante', 'Forma Pago', 'Total ($)', 'Estado'].map(escapeCsv).join(';'));
    cierre.facturas.forEach(f => {
      lineas.push([
        f.numero,
        f.cliente_identificacion,
        f.cliente_razon_social,
        f.estudiante_nombre || '-',
        f.forma_pago,
        fmt$(f.total),
        f.estado
      ].map(escapeCsv).join(';'));
    });
    lineas.push([]);
  }

  // Detalle de Pagos sin facturar
  if (cierre.pagos_sin_facturar?.length > 0) {
    lineas.push(['PAGOS COBRADOS PENDIENTES DE FACTURAR'].map(escapeCsv).join(';'));
    lineas.push(['N° Recibo', 'Estudiante', 'Cód.', 'Curso/Paralelo', 'Mes', 'Monto ($)', 'Nota'].map(escapeCsv).join(';'));
    cierre.pagos_sin_facturar.forEach(p => {
      lineas.push([
        `#${p.numero_recibo}`,
        `${p.apellidos} ${p.nombres}`,
        p.codigo,
        `${p.curso_nombre || ''} ${p.paralelo || ''}`.trim(),
        p.mes,
        fmt$(p.monto),
        p.nota || ''
      ].map(escapeCsv).join(';'));
    });
  }

  const contenido = lineas.join('\r\n');
  descargarArchivo(contenido, `Cierre_Facturacion_${cierre.fecha}.csv`);
}
