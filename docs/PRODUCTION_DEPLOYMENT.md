# 🚀 Guía Oficial de Despliegue en Producción - SurveyD (OmniPoll)

Esta guía detalla los pasos recomendados para publicar **SurveyD** en un entorno de producción seguro, escalable y de alto rendimiento.

---

## 📋 Checklist Pre-Despliegue

- [x] **Base de datos normalizada**: `schema.sql` contiene todas las tablas, índices (`idx_encuesta_codigo`, `idx_estado`) y columna `branding_json`.
- [x] **Catálogo territorial cargado**: 1,874 distritos del INEI en `ubigeo_completo.sql`.
- [x] **Protección de archivos sensibles**: Archivos `.htaccess` configurados para denegar acceso a `.json`, `.sql`, `.env` y directorios `config/` y `database/`.
- [x] **Cabeceras de seguridad activas**: `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`, `Referrer-Policy`.
- [x] **Compresión y caché**: GZIP activo para CSS, JS, JSON y SVG.
- [x] **URLs relativas dinámicas**: La aplicación detecta automáticamente el dominio y protocolo (`http://` o `https://`) sin requerir URLs quemadas.

---

## 🛠️ Opción 1: Despliegue en Servidor VPS Linux (Ubuntu / Debian + Apache)

### 1. Actualizar el servidor e instalar dependencias
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y apache2 mysql-server php8.2 php8.2-mysql php8.2-curl php8.2-zip php8.2-xml git
```

### 2. Habilitar módulos de Apache requeridos
```bash
sudo a2enmod rewrite headers deflate expires
sudo systemctl restart apache2
```

### 3. Clonar el repositorio en el directorio web
```bash
cd /var/www/html
sudo git clone https://github.com/rllamoza/surveyd.git app_encuestas
sudo chown -R www-data:www-data /var/www/html/app_encuestas
sudo chmod -R 755 /var/www/html/app_encuestas
```

### 4. Configurar MySQL para producción
```bash
sudo mysql
```
```sql
CREATE DATABASE app_encuestas CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'surveyd_user'@'localhost' IDENTIFIED BY 'TuPasswordUltraSegura2026!';
GRANT ALL PRIVILEGES ON app_encuestas.* TO 'surveyd_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 5. Configurar credenciales en la aplicación
Crear el archivo `backend/config/db_credentials.json`:
```json
{
  "host": "127.0.0.1",
  "port": 3306,
  "dbname": "app_encuestas",
  "user": "surveyd_user",
  "password": "TuPasswordUltraSegura2026!"
}
```

### 6. Ejecutar el instalador automatizado
```bash
cd /var/www/html/app_encuestas
php backend/install.php
```
*Salida esperada:*
```text
[OK] Paso 1: Esquema base y tablas DDL inicializadas correctamente.
[OK] Paso 2: Catálogo oficial INEI (1,874 distritos) importado con éxito.
[OK] ¡Instalación completada exitosamente! El sistema está listo para operar.
```

### 7. Configurar Apache VirtualHost (`/etc/apache2/sites-available/surveyd.conf`)
```apache
<VirtualHost *:80>
    ServerName encuestas.midominio.com
    DocumentRoot /var/www/html/app_encuestas

    <Directory /var/www/html/app_encuestas>
        AllowOverride All
        Require all granted
    </Directory>

    ErrorLog ${APACHE_LOG_DIR}/surveyd_error.log
    CustomLog ${APACHE_LOG_DIR}/surveyd_access.log combined
</VirtualHost>
```
Habilitar el sitio:
```bash
sudo a2ensite surveyd.conf
sudo systemctl reload apache2
```

### 8. Habilitar Certificado SSL Gratuito (HTTPS con Let's Encrypt)
```bash
sudo apt install -y certbot python3-certbot-apache
sudo certbot --apache -d encuestas.midominio.com
```

---

## 🐳 Opción 2: Despliegue con Docker y Docker Compose (Zero-Config)

Si dispones de Docker y Docker Compose instalados:

### 1. Clonar el repositorio
```bash
git clone https://github.com/rllamoza/surveyd.git
cd surveyd
```

### 2. Configurar variables en `docker-compose.yml`
Editar contraseñas seguras para `MYSQL_ROOT_PASSWORD` y `MYSQL_PASSWORD`.

### 3. Levantar los contenedores
```bash
docker-compose up -d --build
```

### 4. Inicializar base de datos y UBIGEO dentro del contenedor
```bash
docker exec -it surveyd_app php backend/install.php
```
La aplicación quedará disponible en el puerto `8080`:
- **Panel Administrativo**: `http://tu-servidor:8080/frontend/index.html`
- **Encuesta Pública**: `http://tu-servidor:8080/frontend/encuesta.html?id=CODIGO`

---

## 🌐 Opción 3: Despliegue en cPanel / Hosting Compartido

1. **Subir archivos**:
   - Comprimir la carpeta del proyecto en un archivo `.zip` (excluyendo la carpeta `.git`).
   - Ir a **cPanel > Administrador de Archivos > `public_html`**.
   - Subir y extraer los archivos.
2. **Crear Base de Datos MySQL**:
   - Ir a **cPanel > Bases de Datos MySQL**.
   - Crear la base de datos `tuusuario_encuestas`.
   - Crear un usuario MySQL con contraseña fuerte y asignarlo a la base con **Todos los Privilegios**.
3. **Configurar Credenciales**:
   - Crear el archivo `backend/config/db_credentials.json` con los datos creados en el paso anterior.
4. **Importar Tablas y Datos**:
   - Abrir **phpMyAdmin** en cPanel.
   - Seleccionar la base de datos creada.
   - En la pestaña **Importar**, subir primero `backend/database/schema.sql`.
   - Luego importar `backend/database/ubigeo_completo.sql`.
   - *Alternativa rápida*: Ejecutar desde el navegador `https://tudominio.com/backend/install.php` una única vez y luego eliminar o proteger ese archivo.

---

## 🔒 Buenas Prácticas de Seguridad en Producción

1. **Forzar siempre HTTPS**: Garantiza que las respuestas y datos de geolocalización viajen cifrados mediante TLS 1.3.
2. **Verificar permisos de lectura**:
   - Archivos: `chmod 644`
   - Directorios: `chmod 755`
3. **Copias de Seguridad Automatizadas**:
   Programar un cron diario para respaldar la base de datos:
   ```bash
   0 3 * * * mysqldump -u surveyd_user -p'TuPassword' app_encuestas | gzip > /var/backups/surveyd_$(date +\%F).sql.gz
   ```
