/**
 * ============================================================
 * Controller: Catálogo de Movimientos Financieros
 * CRUD completo con paginación, búsqueda, filtros y ordenamiento
 * ============================================================
 */
const pool = require('../config/db');

/**
 * GET /api/catalogos/movimientos
 * Listado con paginación, búsqueda, filtros y ordenamiento
 */
const getMovimientos = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 15,
      search = '',
      tipo = '',
      categoria = '',
      activo = '',
      sortBy = 'orden',
      sortOrder = 'ASC',
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Construir condiciones WHERE
    const conditions = [];
    const params = [];

    if (search.trim()) {
      conditions.push('(cm.codigo LIKE ? OR cm.nombre LIKE ?)');
      params.push(`%${search.trim()}%`, `%${search.trim()}%`);
    }

    if (tipo && ['INGRESO', 'EGRESO'].includes(tipo.toUpperCase())) {
      conditions.push('cm.tipo = ?');
      params.push(tipo.toUpperCase());
    }

    if (categoria.trim()) {
      conditions.push('cm.categoria = ?');
      params.push(categoria.trim());
    }

    if (activo !== '') {
      conditions.push('cm.activo = ?');
      params.push(activo === 'true' || activo === '1' ? 1 : 0);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Validar ordenamiento
    const allowedSort = ['id', 'codigo', 'nombre', 'tipo', 'categoria', 'orden', 'activo', 'created_at'];
    const safeSort = allowedSort.includes(sortBy) ? sortBy : 'orden';
    const safeOrder = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    // Contar total
    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM catalogo_movimientos cm ${whereClause}`,
      params
    );
    const total = countResult[0].total;

    // Obtener datos
    const [rows] = await pool.query(
      `SELECT cm.* FROM catalogo_movimientos cm ${whereClause} ORDER BY cm.${safeSort} ${safeOrder} LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    // Obtener categorías únicas para filtros
    const [categorias] = await pool.query(
      'SELECT DISTINCT categoria FROM catalogo_movimientos ORDER BY categoria'
    );

    res.json({
      success: true,
      data: rows,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
      categorias: categorias.map(c => c.categoria),
    });
  } catch (error) {
    console.error('Error en getMovimientos:', error);
    res.status(500).json({ success: false, message: 'Error al obtener los movimientos.' });
  }
};

/**
 * GET /api/catalogos/movimientos/:id
 * Obtener un movimiento por ID
 */
const getMovimientoById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query('SELECT * FROM catalogo_movimientos WHERE id = ?', [id]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Concepto no encontrado.' });
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('Error en getMovimientoById:', error);
    res.status(500).json({ success: false, message: 'Error al obtener el concepto.' });
  }
};

/**
 * POST /api/catalogos/movimientos
 * Crear un nuevo concepto
 */
const createMovimiento = async (req, res) => {
  try {
    const { codigo, nombre, tipo, categoria, requiere_mes, requiere_personal, orden } = req.body;

    // Validaciones del backend
    const errors = [];

    if (!codigo || !codigo.trim()) errors.push('El código es obligatorio.');
    if (codigo && /\s/.test(codigo)) errors.push('El código no debe contener espacios.');
    if (codigo && codigo !== codigo.toUpperCase()) errors.push('El código debe estar en mayúsculas.');

    if (!nombre || !nombre.trim()) errors.push('El nombre es obligatorio.');
    if (!tipo || !['INGRESO', 'EGRESO'].includes(tipo)) errors.push('El tipo debe ser INGRESO o EGRESO.');
    if (!categoria || !categoria.trim()) errors.push('La categoría es obligatoria.');

    if (orden !== undefined && orden !== null && orden !== '') {
      if (isNaN(parseInt(orden))) errors.push('El orden debe ser un número válido.');
    }

    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors.join(' '), errors });
    }

    // Verificar código único
    const [existing] = await pool.query('SELECT id FROM catalogo_movimientos WHERE codigo = ?', [codigo.trim().toUpperCase()]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: `El código "${codigo}" ya está registrado.` });
    }

    const [result] = await pool.query(
      `INSERT INTO catalogo_movimientos (codigo, nombre, tipo, categoria, requiere_mes, requiere_personal, activo, orden)
       VALUES (?, ?, ?, ?, ?, ?, TRUE, ?)`,
      [
        codigo.trim().toUpperCase(),
        nombre.trim(),
        tipo,
        categoria.trim(),
        requiere_mes ? 1 : 0,
        requiere_personal ? 1 : 0,
        parseInt(orden) || 0,
      ]
    );

    const [newRow] = await pool.query('SELECT * FROM catalogo_movimientos WHERE id = ?', [result.insertId]);

    res.status(201).json({ success: true, message: 'Concepto creado exitosamente.', data: newRow[0] });
  } catch (error) {
    console.error('Error en createMovimiento:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'El código ya está registrado.' });
    }
    res.status(500).json({ success: false, message: 'Error al crear el concepto.' });
  }
};

/**
 * PUT /api/catalogos/movimientos/:id
 * Actualizar un concepto
 */
const updateMovimiento = async (req, res) => {
  try {
    const { id } = req.params;
    const { codigo, nombre, tipo, categoria, requiere_mes, requiere_personal, orden } = req.body;

    // Verificar existencia
    const [existing] = await pool.query('SELECT * FROM catalogo_movimientos WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Concepto no encontrado.' });
    }

    // Validaciones
    const errors = [];
    if (!codigo || !codigo.trim()) errors.push('El código es obligatorio.');
    if (codigo && /\s/.test(codigo)) errors.push('El código no debe contener espacios.');
    if (codigo && codigo !== codigo.toUpperCase()) errors.push('El código debe estar en mayúsculas.');
    if (!nombre || !nombre.trim()) errors.push('El nombre es obligatorio.');
    if (!tipo || !['INGRESO', 'EGRESO'].includes(tipo)) errors.push('El tipo debe ser INGRESO o EGRESO.');
    if (!categoria || !categoria.trim()) errors.push('La categoría es obligatoria.');

    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors.join(' '), errors });
    }

    // Verificar código único (excluyendo el registro actual)
    const [dupCheck] = await pool.query(
      'SELECT id FROM catalogo_movimientos WHERE codigo = ? AND id != ?',
      [codigo.trim().toUpperCase(), id]
    );
    if (dupCheck.length > 0) {
      return res.status(409).json({ success: false, message: `El código "${codigo}" ya está en uso por otro concepto.` });
    }

    await pool.query(
      `UPDATE catalogo_movimientos
       SET codigo = ?, nombre = ?, tipo = ?, categoria = ?, requiere_mes = ?, requiere_personal = ?, orden = ?
       WHERE id = ?`,
      [
        codigo.trim().toUpperCase(),
        nombre.trim(),
        tipo,
        categoria.trim(),
        requiere_mes ? 1 : 0,
        requiere_personal ? 1 : 0,
        parseInt(orden) || 0,
        id,
      ]
    );

    const [updated] = await pool.query('SELECT * FROM catalogo_movimientos WHERE id = ?', [id]);
    res.json({ success: true, message: 'Concepto actualizado exitosamente.', data: updated[0] });
  } catch (error) {
    console.error('Error en updateMovimiento:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'El código ya está en uso.' });
    }
    res.status(500).json({ success: false, message: 'Error al actualizar el concepto.' });
  }
};

/**
 * PATCH /api/catalogos/movimientos/:id/estado
 * Activar o desactivar un concepto
 */
const toggleEstadoMovimiento = async (req, res) => {
  try {
    const { id } = req.params;

    const [existing] = await pool.query('SELECT * FROM catalogo_movimientos WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Concepto no encontrado.' });
    }

    const newState = !existing[0].activo;

    await pool.query('UPDATE catalogo_movimientos SET activo = ? WHERE id = ?', [newState ? 1 : 0, id]);

    const [updated] = await pool.query('SELECT * FROM catalogo_movimientos WHERE id = ?', [id]);
    res.json({
      success: true,
      message: newState ? 'Concepto activado exitosamente.' : 'Concepto desactivado exitosamente.',
      data: updated[0],
    });
  } catch (error) {
    console.error('Error en toggleEstadoMovimiento:', error);
    res.status(500).json({ success: false, message: 'Error al cambiar el estado del concepto.' });
  }
};

module.exports = {
  getMovimientos,
  getMovimientoById,
  createMovimiento,
  updateMovimiento,
  toggleEstadoMovimiento,
};
