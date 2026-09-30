const db = require('../config/db');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// ==========================================
// BUSCADOR ESTUDIANTES (COBRANZAS)
// ==========================================
exports.buscarEstudiantes = async (req, res) => {
  try {
    const { search } = req.query;
    if (!search || search.length < 2) {
      return res.json({ success: true, estudiantes: [] });
    }

    const searchTerm = `%${search}%`;
    const query = `
      SELECT 
        e.id_estudiante, e.codigo, e.nombres, e.apellidos, e.cedula,
        c.nombre as curso_nombre, m.paralelo, m.estado,
        r.nombres as rep_nombres, r.apellidos as rep_apellidos
      FROM estudiantes e
      LEFT JOIN matriculas m ON e.id_estudiante = m.id_estudiante AND m.estado = 'Activa'
      LEFT JOIN cursos c ON m.id_curso = c.id_curso
      LEFT JOIN representantes r ON e.id_representante = r.id_representante
      WHERE 
        e.nombres LIKE ? OR e.apellidos LIKE ? OR e.cedula LIKE ? 
        OR e.codigo LIKE ? OR r.nombres LIKE ? OR r.apellidos LIKE ?
      LIMIT 10
    `;

    const [rows] = await db.execute(query, [searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm]);
    res.json({ success: true, estudiantes: rows });
  } catch (error) {
    console.error('Error buscando estudiantes:', error);
    res.status(500).json({ success: false, message: 'Error buscando estudiantes' });
  }
};

// ==========================================
// RESUMEN FINANCIERO DE UN ESTUDIANTE
// ==========================================
exports.getResumenEstudiante = async (req, res) => {
  try {
    const { id_estudiante } = req.params;

    const [matriculas] = await db.execute(`
      SELECT id_matricula FROM matriculas 
      WHERE id_estudiante = ? AND estado != 'Anulada'
    `, [id_estudiante]);

    if (matriculas.length === 0) {
      return res.json({
        success: true,
        resumen: { generado: 0, pagado: 0, pendiente: 0, vencidas: 0, pagadas: 0, cumplimiento: 0 }
      });
    }

    const idsMatricula = matriculas.map(m => m.id_matricula);

    const query = `
      SELECT 
        SUM(valor) as generado,
        SUM(valor_pagado) as pagado,
        SUM(valor - valor_pagado) as pendiente,
        SUM(CASE WHEN estado = 'Vencido' THEN 1 ELSE 0 END) as vencidas,
        SUM(CASE WHEN estado = 'Pagado' THEN 1 ELSE 0 END) as pagadas,
        COUNT(id_pension) as total_pensiones
      FROM pensiones
      WHERE id_matricula IN (?) AND estado != 'Anulada'
    `;

    const [rows] = await db.query(query, [idsMatricula]); // Usar query para arrays IN (?)
    
    let resumen = rows[0] || { generado: 0, pagado: 0, pendiente: 0, vencidas: 0, pagadas: 0, total_pensiones: 0 };
    
    // Validar NULLS
    resumen.generado = parseFloat(resumen.generado || 0);
    resumen.pagado = parseFloat(resumen.pagado || 0);
    resumen.pendiente = parseFloat(resumen.pendiente || 0);
    
    let cumplimiento = resumen.generado > 0 ? Math.round((resumen.pagado / resumen.generado) * 100) : 0;
    resumen.cumplimiento = cumplimiento;

    res.json({ success: true, resumen });
  } catch (error) {
    console.error('Error obteniendo resumen:', error);
    res.status(500).json({ success: false, message: 'Error obteniendo resumen' });
  }
};

// ==========================================
// REGISTRAR PAGO GLOBAL (DISTRIBUIDO)
// ==========================================
exports.registrarPagoGlobal = async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const { id_usuario } = req.usuario;
    const { ids_pensiones, monto_total, metodo_pago, numero_recibo, observacion, descuento, recargo } = req.body;

    if (!ids_pensiones || !ids_pensiones.length || monto_total <= 0) {
      return res.status(400).json({ success: false, message: 'Datos de pago inválidos' });
    }

    // Obtener las pensiones ordenadas de más antiguas a más nuevas para distribuirlas
    const [pensiones] = await connection.query(`
      SELECT id_pension, valor, valor_pagado, estado, fecha_vencimiento
      FROM pensiones
      WHERE id_pension IN (?) AND estado != 'Pagado' AND estado != 'Anulada'
      ORDER BY fecha_vencimiento ASC
    `, [ids_pensiones]);

    let montoRestante = parseFloat(monto_total);

    for (let p of pensiones) {
      if (montoRestante <= 0) break;

      const saldoPendiente = parseFloat(p.valor) - parseFloat(p.valor_pagado);
      
      // Cuánto voy a pagar a esta pensión?
      const abonar = Math.min(saldoPendiente, montoRestante);
      montoRestante -= abonar;

      const nuevoPagado = parseFloat(p.valor_pagado) + abonar;
      
      // Calcular nuevo estado
      let nuevoEstado = p.estado;
      if (nuevoPagado >= parseFloat(p.valor)) {
        nuevoEstado = 'Pagado';
      } else {
        const hoy = new Date();
        const vencimiento = new Date(p.fecha_vencimiento);
        if (hoy > vencimiento) {
          nuevoEstado = 'Vencido';
        } else {
          nuevoEstado = 'Parcial';
        }
      }

      // 1. Actualizar pensión
      await connection.execute(`
        UPDATE pensiones 
        SET valor_pagado = ?, estado = ?
        WHERE id_pension = ?
      `, [nuevoPagado, nuevoEstado, p.id_pension]);

      // 2. Registrar en tabla `pagos`
      const [resultPago] = await connection.execute(`
        INSERT INTO pagos (id_pension, id_usuario, numero_recibo, fecha_pago, valor_pagado, descuento, recargo, metodo_pago, observacion)
        VALUES (?, ?, ?, NOW(), ?, ?, ?, ?, ?)
      `, [p.id_pension, id_usuario, numero_recibo || null, abonar, 0, 0, metodo_pago, observacion || null]); // Simplificamos desc y rec al global o 0 si está prorrateado.

      // Podríamos generar recibo aquí, pero normalmente es 1 recibo global.
    }

    await connection.commit();
    res.json({ success: true, message: 'Pago registrado y distribuido correctamente.' });

  } catch (error) {
    await connection.rollback();
    console.error('Error registrando pago global:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor al procesar el pago' });
  } finally {
    connection.release();
  }
};

// ==========================================
// HISTORIAL DE PAGOS
// ==========================================
exports.getHistorialPagos = async (req, res) => {
  try {
    const query = `
      SELECT 
        p.id_pago, p.numero_recibo, p.fecha_pago, p.valor_pagado, p.metodo_pago, p.estado,
        u.nombre_completo as usuario,
        pens.mes, pens.anio,
        e.nombres as estudiante_nombres, e.apellidos as estudiante_apellidos
      FROM pagos p
      LEFT JOIN usuarios u ON p.id_usuario = u.id_usuario
      LEFT JOIN pensiones pens ON p.id_pension = pens.id_pension
      LEFT JOIN matriculas m ON pens.id_matricula = m.id_matricula
      LEFT JOIN estudiantes e ON m.id_estudiante = e.id_estudiante
      ORDER BY p.fecha_pago DESC
      LIMIT 100
    `;
    const [rows] = await db.execute(query);
    res.json({ success: true, pagos: rows });
  } catch (error) {
    console.error('Error historial pagos:', error);
    res.status(500).json({ success: false, message: 'Error obteniendo historial' });
  }
};

// ==========================================
// ANULAR PAGO
// ==========================================
exports.anularPago = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const { id } = req.params;
    const { motivo_anulacion } = req.body;
    const { id_usuario, es_admin } = req.usuario;

    if (!es_admin) {
      return res.status(403).json({ success: false, message: 'No tiene permisos para anular pagos' });
    }

    if (!motivo_anulacion) {
      return res.status(400).json({ success: false, message: 'El motivo es obligatorio' });
    }

    await connection.beginTransaction();

    // 1. Obtener pago
    const [pagos] = await connection.execute(`SELECT * FROM pagos WHERE id_pago = ?`, [id]);
    if (pagos.length === 0) throw new Error('Pago no encontrado');
    const pago = pagos[0];

    if (pago.estado === 'Anulado') {
      throw new Error('El pago ya está anulado');
    }

    // 2. Obtener pensión asociada
    const [pensiones] = await connection.execute(`SELECT * FROM pensiones WHERE id_pension = ?`, [pago.id_pension]);
    const pension = pensiones[0];

    // 3. Revertir valor pagado en pensión
    const nuevoPagado = parseFloat(pension.valor_pagado) - parseFloat(pago.valor_pagado);
    
    let nuevoEstado = pension.estado;
    if (nuevoPagado <= 0) {
      nuevoEstado = (new Date() > new Date(pension.fecha_vencimiento)) ? 'Vencido' : 'Pendiente';
    } else {
      nuevoEstado = (new Date() > new Date(pension.fecha_vencimiento)) ? 'Vencido' : 'Parcial'; // O solo Parcial
    }

    await connection.execute(`
      UPDATE pensiones SET valor_pagado = ?, estado = ? WHERE id_pension = ?
    `, [Math.max(0, nuevoPagado), nuevoEstado, pago.id_pension]);

    // 4. Anular pago
    await connection.execute(`
      UPDATE pagos 
      SET estado = 'Anulado', motivo_anulacion = ?, fecha_anulacion = NOW(), id_usuario = ? 
      WHERE id_pago = ?
    `, [motivo_anulacion, id_usuario, id]);

    await connection.commit();
    res.json({ success: true, message: 'Pago anulado correctamente' });
  } catch (error) {
    await connection.rollback();
    console.error('Error anulando pago:', error);
    res.status(500).json({ success: false, message: error.message || 'Error al anular pago' });
  } finally {
    connection.release();
  }
};

// ==========================================
// GENERAR RECIBO PDF
// ==========================================
exports.generarRecibo = async (req, res) => {
  // Lógica simple de PDFKit
  try {
    const { id_pago } = req.params;
    
    // Obtener data del pago...
    const query = `
      SELECT p.*, e.nombres, e.apellidos, e.cedula, pens.mes, pens.anio, c.nombre as curso
      FROM pagos p
      JOIN pensiones pens ON p.id_pension = pens.id_pension
      JOIN matriculas m ON pens.id_matricula = m.id_matricula
      JOIN estudiantes e ON m.id_estudiante = e.id_estudiante
      JOIN cursos c ON m.id_curso = c.id_curso
      WHERE p.id_pago = ?
    `;
    const [rows] = await db.execute(query, [id_pago]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Pago no encontrado' });
    const pago = rows[0];

    const doc = new PDFDocument({ margin: 50 });
    const fileName = `recibo_${id_pago}_${Date.now()}.pdf`;
    
    // Para simplificar, lo serviremos en stream al cliente en vez de guardarlo físico
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
    
    doc.pipe(res);
    
    // Header
    doc.fontSize(20).text('Unidad Educativa Juan León Mera', { align: 'center' });
    doc.fontSize(12).text('Sistema SIGCOP-KPI', { align: 'center' });
    doc.moveDown();
    
    doc.fontSize(16).text('RECIBO DE PAGO', { align: 'center', underline: true });
    doc.moveDown();
    
    // Detalle
    doc.fontSize(12).text(`N° Recibo: ${pago.numero_recibo || pago.id_pago}`);
    doc.text(`Fecha: ${new Date(pago.fecha_pago).toLocaleString()}`);
    doc.text(`Estudiante: ${pago.nombres} ${pago.apellidos}`);
    doc.text(`Curso: ${pago.curso}`);
    doc.moveDown();
    
    doc.text(`Concepto: Pensión de ${pago.mes} ${pago.anio}`);
    doc.text(`Método de Pago: ${pago.metodo_pago}`);
    doc.text(`Valor Pagado: $${Number(pago.valor_pagado).toFixed(2)}`);
    doc.moveDown(2);
    
    doc.fontSize(10).text('Este documento es un comprobante generado por el Sistema SIGCOP-KPI.', { align: 'center' });
    
    doc.end();
  } catch (error) {
    console.error('Error generando recibo:', error);
    res.status(500).json({ success: false, message: 'Error generando PDF' });
  }
};
