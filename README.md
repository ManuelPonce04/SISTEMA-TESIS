# 🏫 Sistema de Cobranzas — Unidad Educativa Juan León Mera

Sistema web para la gestión integral de cobranzas, matrículas y pagos estudiantiles.

## 🛠️ Tecnologías

| Capa       | Tecnología                              |
|------------|------------------------------------------|
| Frontend   | React 19, Vite, Tailwind CSS, React Router |
| Backend    | Node.js, Express, JWT, bcrypt           |
| Base de datos | MySQL                               |

## 📁 Estructura del Proyecto

```
SISTEMA - TESIS/
├── frontend/    ← React + Vite
├── backend/     ← Node.js + Express
└── database/    ← Schema SQL
```

## 🚀 Inicio Rápido

### 1. Base de Datos
```sql
-- En MySQL Workbench o phpMyAdmin:
-- Importar: database/schema.sql
```

### 2. Backend
```bash
cd backend
# Editar .env con tus credenciales de MySQL
npm run dev
# Servidor en: http://localhost:3001
```

### 3. Frontend
```bash
cd frontend
npm run dev
# App en: http://localhost:5173
```

## 🔐 Usuario de Prueba

| Campo      | Valor                         |
|------------|-------------------------------|
| Correo     | admin@juanleonmera.edu.ec     |
| Contraseña | Admin2026!                    |
| Rol        | Administrador                 |

## 👥 Roles del Sistema

| Rol           | Permisos                                  |
|---------------|-------------------------------------------|
| Administrador | Acceso total                              |
| Secretaria    | Estudiantes, Matrículas y Cobranzas       |
| Colectora     | Registrar pagos y consultar               |
| Rector        | Solo consulta de reportes y KPI           |

## 📋 Módulos

- ✅ **Login** — Autenticación JWT + roles
- ⬜ Dashboard
- ⬜ Usuarios
- ⬜ Estudiantes
- ⬜ Matrículas
- ⬜ Cobranzas
- ⬜ Reportes
- ⬜ KPI
- ⬜ Configuración
