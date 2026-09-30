-- ALTER TABLES para la Fase de Rediseño (Nivel Empresarial)

USE sistema_cobranzas;

-- 1. Actualizar tabla representantes
ALTER TABLE representantes
  CHANGE COLUMN telefono telefono_principal VARCHAR(20),
  ADD COLUMN telefono_secundario VARCHAR(20) AFTER telefono_principal,
  ADD COLUMN parentesco ENUM('Padre', 'Madre', 'Abuelo', 'Abuela', 'Tutor', 'Otro') DEFAULT 'Otro' AFTER apellidos,
  ADD COLUMN estado ENUM('Activo', 'Inactivo') DEFAULT 'Activo' AFTER direccion;

-- 2. Actualizar tabla estudiantes
ALTER TABLE estudiantes
  ADD COLUMN nacionalidad VARCHAR(50) DEFAULT 'Ecuatoriana' AFTER sexo,
  ADD COLUMN direccion TEXT AFTER nacionalidad,
  ADD COLUMN telefono VARCHAR(20) AFTER direccion,
  ADD COLUMN correo VARCHAR(120) AFTER telefono;
