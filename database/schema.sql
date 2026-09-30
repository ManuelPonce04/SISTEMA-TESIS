-- ============================================================
-- Sistema de Cobranzas - Unidad Educativa Juan León Mera
-- Base de Datos: schema.sql
-- Versión: 1.0 | Módulo 1: Login
-- ============================================================

CREATE DATABASE IF NOT EXISTS sistema_cobranzas
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE sistema_cobranzas;

-- ------------------------------------------------------------
-- Tabla: usuarios
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
    id_usuario   INT AUTO_INCREMENT PRIMARY KEY,
    nombre_completo VARCHAR(150) NOT NULL,
    correo       VARCHAR(120) NOT NULL UNIQUE,
    password     VARCHAR(255) NOT NULL,
    estado       ENUM('Activo','Inactivo') DEFAULT 'Activo',
    es_admin     BOOLEAN DEFAULT FALSE,
    ultimo_acceso DATETIME NULL,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- Seed: Usuario Administrador por defecto
-- Contraseña: Admin2026!  (hash bcrypt rounds=10)
-- IMPORTANTE: Este hash fue generado con bcrypt.
--             Nunca almacenes contraseñas en texto plano.
-- ------------------------------------------------------------
INSERT IGNORE INTO usuarios (nombre_completo, correo, password, estado, es_admin)
VALUES (
    'Admin Sistema',
    'admin@juanleonmera.edu.ec',
    '$2b$10$9.wdLLQFJR1RsZCYEw5lZujW.vhxgziX9D9V9XHdEEfnG58l8Fc8q',
    'Activo',
    TRUE
);

-- Nota: El hash corresponde a la contraseña "Admin2026!"
-- Ejecutar el script generate-hash.js en backend para regenerar si es necesario.

-- ============================================================
-- Fase 13: Módulo de Gestión de Estudiantes
-- ============================================================

-- ------------------------------------------------------------
-- Tabla: representantes
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS representantes (
    id_representante INT AUTO_INCREMENT PRIMARY KEY,
    cedula           VARCHAR(15) NOT NULL UNIQUE,
    nombres          VARCHAR(100) NOT NULL,
    apellidos        VARCHAR(100) NOT NULL,
    telefono         VARCHAR(20),
    correo           VARCHAR(120),
    direccion        TEXT,
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- Tabla: estudiantes
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS estudiantes (
    id_estudiante    INT AUTO_INCREMENT PRIMARY KEY,
    codigo           VARCHAR(50) NOT NULL UNIQUE,
    cedula           VARCHAR(15) NOT NULL UNIQUE,
    nombres          VARCHAR(100) NOT NULL,
    apellidos        VARCHAR(100) NOT NULL,
    fecha_nacimiento DATE NOT NULL,
    sexo             ENUM('Masculino','Femenino') NOT NULL,
    id_representante INT,
    estado           ENUM('Activo','Inactivo') DEFAULT 'Activo',
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_representante) REFERENCES representantes(id_representante) ON DELETE SET NULL
);

-- ------------------------------------------------------------
-- Tabla: cursos (referencia estática)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cursos (
    id_curso         INT AUTO_INCREMENT PRIMARY KEY,
    nombre           VARCHAR(100) NOT NULL,
    nivel            ENUM('Inicial','EGB','Bachillerato') NOT NULL,
    estado           ENUM('Activo','Inactivo') DEFAULT 'Activo'
);

-- Seed de Cursos Básicos
INSERT IGNORE INTO cursos (id_curso, nombre, nivel) VALUES 
(1, 'Inicial 1', 'Inicial'),
(2, 'Inicial 2', 'Inicial'),
(3, '1° EGB', 'EGB'),
(4, '2° EGB', 'EGB'),
(5, '3° EGB', 'EGB'),
(6, '8° EGB', 'EGB'),
(7, '1° Bachillerato', 'Bachillerato'),
(8, '2° Bachillerato', 'Bachillerato'),
(9, '3° Bachillerato', 'Bachillerato');

-- ------------------------------------------------------------
-- Tabla: matriculas (Relación Estudiante -> Curso -> Año Lectivo)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS matriculas (
    id_matricula     INT AUTO_INCREMENT PRIMARY KEY,
    codigo_matricula VARCHAR(50) NOT NULL UNIQUE,
    id_estudiante    INT NOT NULL,
    id_curso         INT NOT NULL,
    paralelo         VARCHAR(5) NOT NULL,
    anio_lectivo     VARCHAR(20) NOT NULL,
    fecha_matricula  DATE NOT NULL,
    jornada          VARCHAR(50) DEFAULT 'Matutina',
    estado           ENUM('Activa','Anulada','Finalizada','Pendiente') DEFAULT 'Activa',
    observaciones    TEXT,
    motivo_anulacion TEXT,
    fecha_anulacion  DATETIME NULL,
    id_usuario       INT NULL, -- Usuario que registró
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_estudiante) REFERENCES estudiantes(id_estudiante) ON DELETE CASCADE,
    FOREIGN KEY (id_curso) REFERENCES cursos(id_curso) ON DELETE RESTRICT
);

-- ------------------------------------------------------------
-- Tabla: pensiones
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pensiones (
    id_pension       INT AUTO_INCREMENT PRIMARY KEY,
    id_matricula     INT NOT NULL,
    mes              VARCHAR(20) NOT NULL,
    anio             INT NOT NULL,
    valor            DECIMAL(10,2) NOT NULL,
    fecha_vencimiento DATE NOT NULL,
    estado           ENUM('Pendiente','Pagado','Parcial','Vencido','Anulada') DEFAULT 'Pendiente',
    valor_pagado     DECIMAL(10,2) DEFAULT 0.00,
    observacion      TEXT,
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_matricula) REFERENCES matriculas(id_matricula) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- Tabla: pagos
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pagos (
    id_pago          INT AUTO_INCREMENT PRIMARY KEY,
    id_pension       INT NOT NULL,
    fecha_pago       DATETIME NOT NULL,
    valor_pagado     DECIMAL(10,2) NOT NULL,
    metodo_pago      VARCHAR(50) NOT NULL,
    observacion      TEXT,
    numero_recibo    VARCHAR(50),
    id_usuario       INT NULL, -- Usuario que registró el pago
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_pension) REFERENCES pensiones(id_pension) ON DELETE CASCADE
);

