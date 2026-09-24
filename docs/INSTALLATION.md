# Guía de Instalación y Despliegue - SurveyD

Esta guía describe cómo instalar y configurar **SurveyD** en entornos de desarrollo local (XAMPP / WampServer / LAMP) y en servidores de producción.

## 1. Requisitos del Sistema

- **Servidor Web**: Apache 2.4+ (con `mod_rewrite` habilitado) o Nginx.
- **PHP**: Versión 8.0 o superior (recomendado PHP 8.1 o 8.2).
  - Extensiones requeridas: `pdo`, `pdo_mysql`, `json`, `mbstring`.
- **Base de Datos**: MySQL 8.0+ o MariaDB 10.4+.
- **Navegador Moderno**: Chrome, Firefox, Safari o Edge con soporte ECMAScript 6+ y SVG.

---

## 2. Instalación en XAMPP / Local

### Paso 1: Ubicación de los Archivos
Coloque la carpeta del proyecto en el directorio raíz de su servidor web (por ejemplo: `C:\xampp\htdocs\APPS\app_encuestas` o `C:\xampp\htdocs\surveyd`).

### Paso 2: Configuración de Base de Datos
1. Inicie los servicios de **Apache** y **MySQL** desde el Panel de Control de XAMPP.
2. Acceda a **phpMyAdmin** (`http://localhost/phpmyadmin`) o a la consola de MySQL y cree la base de datos:
   ```sql
   CREATE DATABASE app_encuestas CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```
3. Copie el archivo de credenciales de ejemplo:
   ```bash
   cp backend/config/db_credentials.example.json backend/config/db_credentials.json
   ```
4. Ajuste el usuario y contraseña en `backend/config/db_credentials.json`. Si usa la configuración por defecto de XAMPP, el usuario es `root` y la contraseña suele estar vacía `""`.

### Paso 3: Inicialización de Tablas y Datos
Ejecute el script de configuración automática en su navegador:
```
http://localhost/APPS/app_encuestas/backend/setup.php
```
Este script:
- Creará todas las tablas relacionales (`schema.sql`).
- Creará los usuarios iniciales con contraseñas seguras (`password_hash`).
- Cargará el catálogo completo de UBIGEO INEI con los 1,874 distritos.
- Creará encuestas de prueba con preguntas y respuestas modelo.

---

## 3. URLs Principales del Sistema

Una vez completada la instalación, puede acceder a las siguientes secciones:

- **Panel Administrativo & Bento Analytics:**
  ```
  http://localhost/APPS/app_encuestas/frontend/index.html
  ```
- **Encuesta Pública para Informantes (Ejemplo):**
  ```
  http://localhost/APPS/app_encuestas/frontend/encuesta.html?id=CENSO001
  ```
- **API Endpoint de Analíticas (JSON):**
  ```
  http://localhost/APPS/app_encuestas/backend/api/analytics.php
  ```

---

## 4. Despliegue en Servidores de Producción

En un servidor Linux / Apache:

1. **Permisos de Archivos:**
   Asegúrese de que el usuario de Apache (`www-data`) tenga permisos de lectura sobre los archivos del proyecto.
2. **Variables de Entorno (Opcional):**
   Puede definir variables de entorno en lugar de usar `db_credentials.json`:
   - `DB_HOST`
   - `DB_PORT`
   - `DB_NAME`
   - `DB_USER`
   - `DB_PASS`
3. **Seguridad:**
   Asegúrese de que el archivo `.gitignore` proteja `backend/config/db_credentials.json` y nunca suba contraseñas reales al repositorio de control de versiones.
