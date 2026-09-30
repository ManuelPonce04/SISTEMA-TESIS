/**
 * ============================================================
 * Controller: Cuentas Financieras
 * CRUD completo con paginación, búsqueda, filtros y ordenamiento
 * ============================================================
 */
const pool = require('../config/db');

/**
 * GET /api/catalogos/cuentas-financieras
 * Listado con paginación, búsqueda, filtros y ordenamiento
 */
const getCuentas = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 15,
      search = '',
      tipo = '',
      activo = '',
      sortBy = 'orden',
      sortOrder = 'ASC',
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const conditions = [];
    const params = [];

    if (search.trim()) {
      conditions.push('(cf.nombre LIKE ? OR cf.descripcion LIKE ?)');
      params.push(`%${search.trim()}%`, `%${search.trim()}%`);
    }

    if (tipo.trim()) {
      conditions.push('cf.tipo = ?');
      params.push(tipo.trim());
    }

    if (activo !== '') {
      conditions.push('cf.activo = ?');
      params.push(activo === 'true' || activo === '1' ? 1 : 0);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Validar ordenamiento
    const allowedSort = ['id', 'nombre', 'tipo', 'saldo_inicial', 'orden', 'activo', 'created_at'];
    const safeSort = allowedSort.includes(sortBy) ? sortBy : 'orden';
    const safeOrder = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    // Contar total
    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM cuentas_financieras cf ${whereClause}`,
      params
    );
    const total = countResult[0].total;

    // Obtener datos
    const [rows] = await pool.query(
      `SELECT cf.* FROM cuentas_financieras cf ${whereClause} ORDER BY cf.${safeSort} ${safeOrder} LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    // Obtener tipos únicos
    const [tipos] = await pool.query(
      'SELECT DISTINCT tipo FROM cuentas_financieras ORDER BY tipo'
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
      tipos: tipos.map(t => t.tipo),
    });
  } catch (error) {
    console.error('Error en getCuentas:', error);
    res.status(500).json({ success: false, message: 'Error al obtener las cuentas financieras.' });
  }
};

/**
 * GET /api/catalogos/cuentas-financieras/:id
 * Obtener una cuenta por ID
 */
const getCuentaById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query('SELECT * FROM cuentas_financieras WHERE id = ?', [id]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Cuenta no encontrada.' });
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('Error en getCuentaById:', error);
    res.status(500).json({ success: false, message: 'Error al obtener la cuenta.' });
  }
};

/**
 * POST /api/catalogos/cuentas-financieras
 * Crear una nueva cuenta financiera
 */
const createCuenta = async (req, res) => {
  try {
    const { nombre, tipo, descripcion, saldo_inicial, orden } = req.body;

    // Validaciones
    const errors = [];
    const tiposValidos = ['CAJA', 'BANCO', 'CUENTA INTERNA', 'OTRA'];

    if (!nombre || !nombre.trim()) errors.push('El nombre es obligatorio.');
    if (!tipo || !tiposValidos.includes(tipo)) errors.push('El tipo de cuenta es inválido.');

    if (saldo_inicial !== undefined && saldo_inicial !== null && saldo_inicial !== '') {
      const saldo = parseFloat(saldo_inicial);
      if (isNaN(saldo)) {
        errors.push('El saldo inicial debe ser un número válido.');
      } else {
        // Verificar máximo 2 decimales
        const parts = String(saldo_inicial).split('.');
        if (parts[1] && parts[1].length > 2) {
          errors.push('El saldo inicial debe tener máximo dos decimales.');
        }
      }
    }

    if (orden !== undefined && orden !== null && orden !== '') {
      if (isNaN(parseInt(orden))) errors.push('El orden debe ser un número válido.');
    }

    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors.join(' '), errors });
    }

    // Verificar nombre único
    const [existing] = await pool.query('SELECT id FROM cuentas_financieras WHERE nombre = ?', [nombre.trim()]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: `Ya existe una cuenta con el nombre "${nombre}".` });
    }

    const [result] = await pool.query(
      `INSERT INTO cuentas_financieras (nombre, tipo, descripcion, saldo_inicial, activo, orden)
       VALUES (?, ?, ?, ?, TRUE, ?)`,
      [
        nombre.trim(),
        tipo,
        descripcion ? descripcion.trim() : null,
        parseFloat(saldo_inicial) || 0.00,
        parseInt(orden) || 0,
      ]
    );

    const [newRow] = await pool.query('SELECT * FROM cuentas_financieras WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, message: 'Cuenta creada exitosamente.', data: newRow[0] });
  } catch (error) {
    console.error('Error en createCuenta:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'Ya existe una cuenta con ese nombre.' });
    }
    res.status(500).json({ success: false, message: 'Error al crear la cuenta.' });
  }
};

/**
 * PUT /api/catalogos/cuentas-financieras/:id
 * Actualizar una cuenta financiera
 */
const updateCuenta = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, tipo, descripcion, saldo_inicial, orden } = req.body;

    // Verificar existencia
    const [existing] = await pool.query('SELECT * FROM cuentas_financieras WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Cuenta no encontrada.' });
    }

    // Validaciones
    const errors = [];
    const tiposValidos = ['CAJA', 'BANCO', 'CUENTA INTERNA', 'OTRA'];

    if (!nombre || !nombre.trim()) errors.push('El nombre es obligatorio.');
    if (!tipo || !tiposValidos.includes(tipo)) errors.push('El tipo de cuenta es inválido.');

    if (saldo_inicial !== undefined && saldo_inicial !== null && saldo_inicial !== '') {
      const saldo = parseFloat(saldo_inicial);
      if (isNaN(saldo)) {
        errors.push('El saldo inicial debe ser un número válido.');
      } else {
        const parts = String(saldo_inicial).split('.');
        if (parts[1] && parts[1].length > 2) {
          errors.push('El saldo inicial debe tener máximo dos decimales.');
        }
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors.join(' '), errors });
    }

    // Verificar nombre único (excluyendo el registro actual)
    const [dupCheck] = await pool.query(
      'SELECT id FROM cuentas_financieras WHERE nombre = ? AND id != ?',
      [nombre.trim(), id]
    );
    if (dupCheck.length > 0) {
      return res.status(409).json({ success: false, message: `Ya existe otra cuenta con el nombre "${nombre}".` });
    }

    await pool.query(
      `UPDATE cuentas_financieras
       SET nombre = ?, tipo = ?, descripcion = ?, saldo_inicial = ?, orden = ?
       WHERE id = ?`,
      [
        nombre.trim(),
        tipo,
        descripcion ? descripcion.trim() : null,
        parseFloat(saldo_inicial) || 0.00,
        parseInt(orden) || 0,
        id,
      ]
    );

    const [updated] = await pool.query('SELECT * FROM cuentas_financieras WHERE id = ?', [id]);
    res.json({ success: true, message: 'Cuenta actualizada exitosamente.', data: updated[0] });
  } catch (error) {
    console.error('Error en updateCuenta:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'Ya existe una cuenta con ese nombre.' });
    }
    res.status(500).json({ success: false, message: 'Error al actualizar la cuenta.' });
  }
};

/**
 * PATCH /api/catalogos/cuentas-financieras/:id/estado
 * Activar o desactivar una cuenta
 */
const toggleEstadoCuenta = async (req, res) => {
  try {
    const { id } = req.params;

    const [existing] = await pool.query('SELECT * FROM cuentas_financieras WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Cuenta no encontrada.' });
    }

    const newState = !existing[0].activo;

    await pool.query('UPDATE cuentas_financieras SET activo = ? WHERE id = ?', [newState ? 1 : 0, id]);

    const [updated] = await pool.query('SELECT * FROM cuentas_financieras WHERE id = ?', [id]);
    res.json({
      success: true,
      message: newState ? 'Cuenta activada exitosamente.' : 'Cuenta desactivada exitosamente.',
      data: updated[0],
    });
  } catch (error) {
    console.error('Error en toggleEstadoCuenta:', error);
    res.status(500).json({ success: false, message: 'Error al cambiar el estado de la cuenta.' });
  }
};

module.exports = {
  getCuentas,
  getCuentaById,
  createCuenta,
  updateCuenta,
  toggleEstadoCuenta,
};
