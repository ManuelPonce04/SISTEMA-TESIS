-- ============================================================
-- Sistema de Cobranzas - Unidad Educativa Juan León Mera
-- MIGRACIÓN: MÓDULO DE FACTURACIÓN Y CONTROL DE PAGOS
-- VERSION HOSTINGER (Sin USE - phpMyAdmin ya selecciona la BD)
-- ============================================================

-- ------------------------------------------------------------
-- 1. Tabla: institucion_config
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS institucion_config (
    id                      INT AUTO_INCREMENT PRIMARY KEY,
    razon_social            VARCHAR(255) NOT NULL DEFAULT 'UNIDAD EDUCATIVA JUAN LEÓN MERA',
    nombre_comercial        VARCHAR(255) NOT NULL DEFAULT 'UE JUAN LEÓN MERA',
    ruc                     VARCHAR(13)  NOT NULL DEFAULT '1391700000001',
    direccion_matriz        VARCHAR(300) NOT NULL DEFAULT 'Calle Principal y Av. Central, Jaramijó, Manabí, Ecuador',
    direccion_establecimiento VARCHAR(300) NOT NULL DEFAULT 'Calle Principal y Av. Central, Jaramijó, Manabí, Ecuador',
    telefono                VARCHAR(30)  NOT NULL DEFAULT '052600000',
    email                   VARCHAR(150) NOT NULL DEFAULT 'colecturia@juanleonmera.edu.ec',
    logo                    VARCHAR(255) NULL     DEFAULT '/uploads/logo.png',
    obligado_contabilidad   ENUM('SI','NO') NOT NULL DEFAULT 'NO',
    contribuyente_especial  VARCHAR(20)  NULL     DEFAULT NULL,
    regimen                 ENUM('GENERAL','RIMPE_EMPRENDEDOR','RIMPE_POPULAR') NOT NULL DEFAULT 'RIMPE_EMPRENDEDOR',
    ambiente                TINYINT      NOT NULL DEFAULT 1 COMMENT '1: Pruebas, 2: Producción',
    codigo_establecimiento  VARCHAR(3)   NOT NULL DEFAULT '001',
    codigo_punto_emision    VARCHAR(3)   NOT NULL DEFAULT '001',
    tarifa_iva_defecto      DECIMAL(5,2) NOT NULL DEFAULT 0.00 COMMENT '0.00% para educación',
    facturacion_automatica  TINYINT(1)   NOT NULL DEFAULT 0 COMMENT '1: Facturar al registrar pago, 0: Manual',
    created_at              TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO institucion_config (
    id, razon_social, nombre_comercial, ruc, direccion_matriz, direccion_establecimiento,
    telefono, email, obligado_contabilidad, contribuyente_especial, regimen, ambiente,
    codigo_establecimiento, codigo_punto_emision, tarifa_iva_defecto, facturacion_automatica
) VALUES (
    1,
    'UNIDAD EDUCATIVA JUAN LEÓN MERA',
    'UE JUAN LEÓN MERA',
    '1391700000001',
    'Calle Principal y Av. Central, Jaramijó, Manabí, Ecuador',
    'Calle Principal y Av. Central, Jaramijó, Manabí, Ecuador',
    '052600000',
    'colecturia@juanleonmera.edu.ec',
    'NO',
    NULL,
    'RIMPE_EMPRENDEDOR',
    1,
    '001',
    '001',
    0.00,
    0
);

-- ------------------------------------------------------------
-- 2. Tabla: clientes_facturacion
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clientes_facturacion (
    id                   INT AUTO_INCREMENT PRIMARY KEY,
    tipo_identificacion  ENUM('CEDULA', 'RUC', 'PASAPORTE', 'CONSUMIDOR_FINAL') NOT NULL DEFAULT 'CEDULA',
    identificacion       VARCHAR(20)  NOT NULL,
    razon_social         VARCHAR(200) NOT NULL,
    direccion            VARCHAR(300) NOT NULL DEFAULT 'S/N',
    telefono             VARCHAR(30)  NULL,
    email                VARCHAR(150) NOT NULL DEFAULT 'facturacion@juanleonmera.edu.ec',
    activo               TINYINT(1)   NOT NULL DEFAULT 1,
    created_at           TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_cli_ident (identificacion),
    INDEX idx_cf_ident (identificacion),
    INDEX idx_cf_nombre (razon_social)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO clientes_facturacion (
    id, tipo_identificacion, identificacion, razon_social, direccion, telefono, email, activo
) VALUES (
    1,
    'CONSUMIDOR_FINAL',
    '9999999999999',
    'CONSUMIDOR FINAL',
    'CIUDAD',
    '9999999999',
    'consumidorfinal@juanleonmera.edu.ec',
    1
);

INSERT IGNORE INTO clientes_facturacion (tipo_identificacion, identificacion, razon_social, direccion, telefono, email)
SELECT 
    IF(LENGTH(TRIM(r.cedula)) = 13, 'RUC', 'CEDULA') AS tipo_identificacion,
    TRIM(r.cedula) AS identificacion,
    TRIM(CONCAT(r.apellidos, ' ', r.nombres)) AS razon_social,
    COALESCE(NULLIF(TRIM(r.direccion), ''), 'Jaramijó, Manabí') AS direccion,
    NULLIF(TRIM(r.telefono), '') AS telefono,
    COALESCE(NULLIF(TRIM(r.correo), ''), 'representante@juanleonmera.edu.ec') AS email
FROM representantes r
WHERE r.cedula IS NOT NULL AND TRIM(r.cedula) != '';

-- ------------------------------------------------------------
-- 3. Tabla: estudiante_clientes_facturacion
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS estudiante_clientes_facturacion (
    id                INT AUTO_INCREMENT PRIMARY KEY,
    estudiante_id     INT NOT NULL,
    cliente_id        INT NOT NULL,
    es_predeterminado TINYINT(1) NOT NULL DEFAULT 1,
    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_est_cli (estudiante_id, cliente_id),
    INDEX idx_ecf_est (estudiante_id),
    INDEX idx_ecf_cli (cliente_id),
    CONSTRAINT fk_ecf_est FOREIGN KEY (estudiante_id) REFERENCES estudiantes(id_estudiante) ON DELETE CASCADE,
    CONSTRAINT fk_ecf_cli FOREIGN KEY (cliente_id) REFERENCES clientes_facturacion(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO estudiante_clientes_facturacion (estudiante_id, cliente_id, es_predeterminado)
SELECT 
    e.id_estudiante,
    cf.id AS cliente_id,
    1 AS es_predeterminado
FROM estudiantes e
JOIN representantes r ON e.id_representante = r.id_representante
JOIN clientes_facturacion cf ON cf.identificacion = TRIM(r.cedula);

-- ------------------------------------------------------------
-- 4. Tabla: secuenciales
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS secuenciales (
    establecimiento   VARCHAR(3)   NOT NULL DEFAULT '001',
    punto_emision     VARCHAR(3)   NOT NULL DEFAULT '001',
    tipo_comprobante  VARCHAR(15)  NOT NULL DEFAULT 'FACTURA',
    ultimo_secuencial INT UNSIGNED NOT NULL DEFAULT 0,
    updated_at        TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (establecimiento, punto_emision, tipo_comprobante)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO secuenciales (establecimiento, punto_emision, tipo_comprobante, ultimo_secuencial)
VALUES ('001', '001', 'FACTURA', 0);

-- ------------------------------------------------------------
-- 5. Tabla: facturas
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS facturas (
    id                   INT AUTO_INCREMENT PRIMARY KEY,
    numero               VARCHAR(17)   NOT NULL COMMENT '001-001-000000001',
    establecimiento      VARCHAR(3)    NOT NULL DEFAULT '001',
    punto_emision        VARCHAR(3)    NOT NULL DEFAULT '001',
    secuencial           INT UNSIGNED  NOT NULL,
    fecha_emision        DATE          NOT NULL,
    cliente_id           INT           NOT NULL,
    estudiante_id        INT           NOT NULL,
    anio_lectivo         VARCHAR(20)   NOT NULL,
    subtotal_0           DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    subtotal_iva         DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    descuento            DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    tarifa_iva           DECIMAL(5,2)  NOT NULL DEFAULT 0.00,
    iva                  DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    total                DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    forma_pago           ENUM('EFECTIVO','TRANSFERENCIA','TARJETA','DEPOSITO') NOT NULL DEFAULT 'EFECTIVO',
    observaciones        TEXT          NULL,
    estado               ENUM('EMITIDA','ANULADA') NOT NULL DEFAULT 'EMITIDA',
    motivo_anulacion     TEXT          NULL,
    anulado_at           DATETIME      NULL,
    anulado_por          INT           NULL,
    usuario_id           INT           NULL,
    clave_acceso         VARCHAR(49)   NULL,
    numero_autorizacion  VARCHAR(49)   NULL,
    fecha_autorizacion   DATETIME      NULL,
    estado_sri           ENUM('NO_ENVIADA','AUTORIZADA','RECHAZADA') NOT NULL DEFAULT 'NO_ENVIADA',
    mensaje_sri          TEXT          NULL,
    xml_firmado          LONGTEXT      NULL,
    created_at           TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_factura_num (numero),
    INDEX idx_fac_cliente (cliente_id),
    INDEX idx_fac_estudiante (estudiante_id),
    INDEX idx_fac_fecha (fecha_emision),
    INDEX idx_fac_estado (estado),
    INDEX idx_fac_anio (anio_lectivo),
    CONSTRAINT fk_fac_cli FOREIGN KEY (cliente_id) REFERENCES clientes_facturacion(id) ON DELETE RESTRICT,
    CONSTRAINT fk_fac_est FOREIGN KEY (estudiante_id) REFERENCES estudiantes(id_estudiante) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 5b. Tabla: pension_pagos (requerida por factura_detalles)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pension_pagos (
    id                INT AUTO_INCREMENT PRIMARY KEY,
    cuota_id          INT            NOT NULL,
    estudiante_id     INT            NOT NULL,
    fecha_pago        DATE           NOT NULL,
    monto             DECIMAL(10,2)  NOT NULL,
    nota              TEXT,
    usuario_id        INT,
    anulado           TINYINT(1)     NOT NULL DEFAULT 0,
    motivo_anulacion  TEXT,
    numero_recibo     INT UNSIGNED,
    factura_id        INT NULL,
    created_at        TIMESTAMP      DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 6. Tabla: factura_detalles
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS factura_detalles (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    factura_id      INT           NOT NULL,
    pago_id         INT           NULL COMMENT 'FK a pension_pagos',
    codigo          VARCHAR(50)   NOT NULL DEFAULT 'PEN',
    descripcion     VARCHAR(255)  NOT NULL,
    cantidad        INT           NOT NULL DEFAULT 1,
    precio_unitario DECIMAL(12,2) NOT NULL,
    descuento       DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    tarifa_iva      DECIMAL(5,2)  NOT NULL DEFAULT 0.00,
    valor_iva       DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    total           DECIMAL(12,2) NOT NULL,
    created_at      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_fd_factura (factura_id),
    INDEX idx_fd_pago (pago_id),
    CONSTRAINT fk_fd_factura FOREIGN KEY (factura_id) REFERENCES facturas(id) ON DELETE CASCADE,
    CONSTRAINT fk_fd_pago FOREIGN KEY (pago_id) REFERENCES pension_pagos(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 7. Campo factura_id en pension_pagos
-- ------------------------------------------------------------
SET @dbname = DATABASE();
SET @tablename = "pension_pagos";
SET @columnname = "factura_id";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      TABLE_NAME = @tablename
      AND COLUMN_NAME = @columnname
      AND TABLE_SCHEMA = @dbname
  ) > 0,
  "SELECT 1",
  "ALTER TABLE pension_pagos ADD COLUMN factura_id INT NULL AFTER numero_recibo, ADD INDEX idx_ppa_factura (factura_id)"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;
