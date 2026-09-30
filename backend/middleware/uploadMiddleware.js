/**
 * ============================================================
 * Middleware: Upload de archivos financieros
 * Multer con validación de extensión, MIME, tamaño y nombres seguros
 * ============================================================
 */
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// ── Directorio de uploads ────────────────────────────────────
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'financiero');

// Crear directorio si no existe
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// ── Extensiones y MIME permitidos ────────────────────────────
const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png'];
const ALLOWED_MIMES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
];

// ── Tamaño máximo: 5 MB ─────────────────────────────────────
const MAX_SIZE = 5 * 1024 * 1024;

// ── Storage con nombres seguros ──────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString('hex');
    const ext = path.extname(file.originalname).toLowerCase();
    // Nombre seguro: timestamp-random.ext
    cb(null, `${timestamp}-${random}${ext}`);
  },
});

// ── Filtro de archivos ───────────────────────────────────────
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const mime = file.mimetype.toLowerCase();

  // Validar extensión
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return cb(new Error(`Extensión no permitida: ${ext}. Solo se permiten: ${ALLOWED_EXTENSIONS.join(', ')}`), false);
  }

  // Validar MIME
  if (!ALLOWED_MIMES.includes(mime)) {
    return cb(new Error(`Tipo de archivo no permitido: ${mime}`), false);
  }

  // Protección contra archivos ejecutables disfrazados
  const dangerousExtensions = ['.exe', '.bat', '.cmd', '.sh', '.ps1', '.msi', '.dll', '.com', '.vbs', '.js'];
  if (dangerousExtensions.includes(ext)) {
    return cb(new Error('No se permiten archivos ejecutables.'), false);
  }

  cb(null, true);
};

// ── Instancia de multer ──────────────────────────────────────
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_SIZE,
    files: 1,
  },
});

// ── Middleware wrapper con manejo de errores ──────────────────
const uploadSingle = (fieldName = 'archivo') => {
  return (req, res, next) => {
    const uploadHandler = upload.single(fieldName);
    uploadHandler(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: 'El archivo excede el tamaño máximo permitido (5 MB).',
          });
        }
        return res.status(400).json({
          success: false,
          message: `Error al subir archivo: ${err.message}`,
        });
      }
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message,
        });
      }
      next();
    });
  };
};

module.exports = { uploadSingle, UPLOAD_DIR };
