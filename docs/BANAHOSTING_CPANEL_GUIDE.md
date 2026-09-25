# 🐆 Guía de Instalación en BanaHosting con cPanel - SurveyD

Esta guía explica paso a paso cómo instalar y desplegar **SurveyD** en tu hosting de **BanaHosting** utilizando **cPanel**, sin necesidad de usar la consola de comandos SSH.

---

## 📋 Resumen del Proceso (5 Minutos)

1. Crear la Base de Datos y Usuario en cPanel.
2. Subir y extraer los archivos en `public_html`.
3. Crear el archivo `backend/config/db_credentials.json`.
4. Ejecutar el instalador desde el navegador (`https://tudominio.com/backend/install.php`).
5. Activar SSL gratuito (HTTPS con AutoSSL de BanaHosting).

---

## 1. 🗄️ Crear la Base de Datos MySQL en BanaHosting

1. Inicia sesión en tu cuenta de **cPanel** de BanaHosting.
2. En la sección **Bases de Datos**, haz clic en **"Bases de Datos MySQL"**.
3. **Crear Nueva Base de Datos**:
   - En el campo *Nueva Base de Datos*, escribe un nombre (ejemplo: `encuestas`).
   - El nombre completo será algo como: `tuusuario_encuestas`.
   - Haz clic en **Crear una base de datos**.
4. **Crear Nuevo Usuario de Base de Datos**:
   - Más abajo en la misma página, en *Añadir nuevo usuario*:
   - Nombre de usuario: escribe algo como `user_encuesta` (quedará `tuusuario_user_encuesta`).
   - Contraseña: genera una contraseña segura con el generador y cópiala bien.
   - Haz clic en **Crear usuario**.
5. **Vincular el Usuario a la Base de Datos (Muy Importante)**:
   - En la sección *Añadir usuario a la base de datos*:
   - Selecciona el Usuario: `tuusuario_user_encuesta`.
   - Selecciona la Base de Datos: `tuusuario_encuestas`.
   - Haz clic en **Añadir**.
   - En la siguiente pantalla, marca la casilla **"TODOS LOS PRIVILEGIOS"** (ALL PRIVILEGES).
   - Haz clic en **Hacer Cambios**.

---

## 2. 📂 Subir los Archivos al Servidor

### Preparar el archivo ZIP
1. En tu computadora, comprime todo el contenido de la carpeta del proyecto en un archivo llamado `surveyd.zip` (puedes excluir la carpeta oculta `.git` para que pese menos).

### Subir mediante el Administrador de Archivos de cPanel
1. En tu cPanel, entra en **"Administrador de Archivos"** (File Manager).
2. Entra a la carpeta **`public_html`**:
   - Si la encuesta será tu sitio principal (ej. `tudominio.com`), sube los archivos directamente dentro de `public_html`.
   - Si la encuesta estará en una subcarpeta (ej. `tudominio.com/encuestas/`), crea la carpeta `encuestas` dentro de `public_html` y entra en ella.
   - Si es un subdominio (ej. `encuestas.tudominio.com`), entra en la carpeta asignada a dicho subdominio.
3. Haz clic en el botón superior **"Cargar"** (Upload) y sube tu archivo `surveyd.zip`.
4. Una vez subido, selecciónalo, haz clic derecho y elige **"Extract"** (Extraer).

---

## 3. ⚙️ Configurar las Credenciales de la Base de Datos

1. Dentro del Administrador de Archivos, navega a la carpeta:
   `backend/config/`
2. Haz clic en **"+ Archivo"** (+ File) y crea un nuevo archivo llamado:
   `db_credentials.json`
3. Haz clic derecho sobre `db_credentials.json` y selecciona **"Edit"** (Editar).
4. Pega el siguiente contenido reemplazando con los nombres reales de tu cPanel:

```json
{
  "host": "localhost",
  "port": 3306,
  "dbname": "tuusuario_encuestas",
  "user": "tuusuario_user_encuesta",
  "password": "TuPasswordSeguraAqui"
}
```

> **Nota:** En BanaHosting, el valor de `host` es siempre `"localhost"`.

5. Haz clic en **"Guardar cambios"** (Save Changes).

*(Nota de Seguridad: El archivo `.htaccess` ya incluido en esa carpeta bloquea automáticamente que cualquier persona pueda leer este archivo desde internet).*

---

## 4. ⚡ Ejecutar el Instalador Automatizado (1 Clic)

No necesitas importar archivos SQL a mano. Abre tu navegador web y entra a la siguiente dirección:

```text
https://tudominio.com/backend/install.php
```
*(Si lo instalaste en una subcarpeta, usa `https://tudominio.com/encuestas/backend/install.php`)*

Verás una respuesta en pantalla como esta:
```json
{
  "success": true,
  "message": "¡Instalación completada exitosamente! El sistema está listo para operar.",
  "data": {
    "sistema": "SurveyD (OmniPoll Spatial Core 3.0)",
    "estado": "Listo para Producción",
    "encuestas_activas": 4,
    "usuarios_registrados": 3,
    "distritos_inei": 1874
  }
}
```

Este proceso en segundos:
1. Crea automáticamente todas las tablas del sistema (encuestas, preguntas, respuestas, usuarios, roles, auditoría).
2. Agrega la columna de personalización `branding_json` e índices de alta velocidad.
3. Importa el catálogo oficial del INEI con los **1,874 distritos de Perú**.

---

## 5. 🐘 Verificar la Versión de PHP en BanaHosting

1. En tu cPanel, busca la opción **"Seleccionar Versión de PHP"** (Select PHP Version) o **"MultiPHP Manager"**.
2. Asegúrate de tener seleccionada la versión **PHP 8.1** o **PHP 8.2** (recomendada).
3. Las extensiones requeridas (`pdo_mysql`, `json`, `mbstring`, `curl`) vienen habilitadas por defecto en BanaHosting.

---

## 6. 🔒 Activar Certificado SSL Gratuito (HTTPS)

BanaHosting incluye certificados SSL ilimitados y gratuitos:

1. En tu cPanel, ve a **"SSL/TLS Status"**.
2. Verás la lista de tus dominios y subdominios.
3. Haz clic en el botón azul superior **"Run AutoSSL"**.
4. En 2 o 3 minutos se generará el candado de seguridad `https://` para que toda la información viaje cifrada.

---

## 7. 🎯 Direcciones Finales de tu Plataforma en BanaHosting

Una vez completados los pasos anteriores:

| Panel / Destino | Enlace en tu Dominio | Descripción |
| :--- | :--- | :--- |
| **Panel de Administración** | `https://tudominio.com/frontend/index.html` | Constructor, Importador Excel, Bento Analytics y Aprobaciones |
| **Encuesta para el Público** | `https://tudominio.com/frontend/encuesta.html?id=CCAVX024` | **100% pública y sin contraseña**, lista para compartir a los encuestados |
| **Redirección Raíz** | `https://tudominio.com/` | Redirige automáticamente al panel principal |

---

## 🛡️ Medidas de Seguridad ya Incluidas

- **Archivos `.htaccess` activos**: Impiden que visitantes descarguen contraseñas o archivos SQL.
- **Cabeceras de protección**: Blindaje contra ataques XSS, clickjacking e inyección de contenido.
- **Compresión GZIP**: Aceleración de carga en conexiones móviles en todo el Perú.
