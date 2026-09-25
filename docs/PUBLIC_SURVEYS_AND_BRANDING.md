# Guía de Encuestas Públicas y Personalización de Branding

Esta guía explica en detalle cómo compartir encuestas de manera permanente con el público (sin requerir autenticación) y cómo personalizar la identidad visual (colores, logotipos, tipografías y textos) de forma **exclusiva e independiente para cada proyecto**.

---

## 1. 🌐 Enlace Permanente para el Público

Cada encuesta cuenta con una dirección web estandarizada y permanente basada en su **código oficial** (ej. `CCAVX024`, `CENSO001`).

### Estructura de la Dirección

```text
http://<SERVIDOR>/APPS/app_encuestas/frontend/encuesta.html?id=<CODIGO_ENCUESTA>
```

### Ejemplos en Diferentes Entornos

| Entorno | Ejemplo de Dirección Web |
| :--- | :--- |
| **Entorno Local (XAMPP / Misma Máquina)** | `http://localhost/APPS/app_encuestas/frontend/encuesta.html?id=CCAVX024` |
| **Red Local / Wi-Fi Oficina (Celulares y PCs)** | `http://192.168.1.50/APPS/app_encuestas/frontend/encuesta.html?id=CCAVX024` |
| **Servidor en Internet (Producción)** | `https://midominio.com/frontend/encuesta.html?id=CCAVX024` |

---

## 2. 👥 Experiencia del Usuario Informante (Sin Login)

La interfaz en `frontend/encuesta.html` está diseñada específicamente para el público general:

- **100% Pública y Anónima**: No solicita inicio de sesión, credenciales ni contraseñas.
- **Sin Controles Administrativos**: La barra lateral, los paneles de auditoría, las métricas y los editores quedan ocultos para el encuestado.
- **Diseño Adaptativo (Mobile-First)**: Funciona en cualquier navegador de smartphone (Android / iOS) o computadora.
- **Barra de Progreso Flotante**: Cuando el usuario hace scroll hacia abajo en pantallas móviles, la barra de progreso se ancla suavemente en el borde inferior.
- **Verificación Previa (Resumen de Respuestas)**: Antes del envío final a la base de datos, el usuario puede revisar todas sus alternativas y corregir cualquier pregunta específica.
- **Recibo Criptográfico Oficial**: Al enviar, el informante recibe un identificador de sesión y un código hash que certifica que su respuesta quedó grabada en MySQL.

---

## 3. 🎨 Panel de Personalización de Branding Exclusivo

Desde la vista **Constructor & Importador Excel** (`#view-constructor-excel`), cada encuesta dispone de un panel lateral dedicado para definir su propia identidad de marca.

> **Importante:** Cualquier ajuste realizado en este panel afecta **única y exclusivamente a la encuesta seleccionada**, sin modificar el panel de administración ni alterar las demás encuestas de la organización.

### Atributos Personalizables

1. **Colores de Marca**:
   - **Color Primario** (`primary_color`): Define el color de los botones principales, las barras de progreso activas y los acentos interactivos. Incluye selector hexadecimal y paleta rápida (*Cyan Neón*, *Azul Corporativo*, *Verde Esmeralda*, *Púrpura Vibrante*, *Ámbar*, *Rosa Neón*).
   - **Color Secundario** (`secondary_color`): Utilizado en insignias, bordes sutiles y estados secundarios.
   - **Fondo de Superficie** (`bg_color`): Tonalidad del lienzo de la encuesta.
2. **Tipografía Dinámica (Google Fonts)**:
   - Permite seleccionar tipografías que se inyectan dinámicamente en el encabezado de la encuesta:
     - `Plus Jakarta Sans`: Moderna, tecnológica y equilibrada (por defecto).
     - `Inter`: Altamente legible para entornos corporativos e institucionales.
     - `Outfit`: Geométrica, elegante y vanguardista.
     - `Poppins`: Redondeada, accesible y dinámica.
     - `Roboto`: Clásica, limpia y funcional.
     - `Playfair Display`: Con serifa, tradicional y de alta distinción editorial.
3. **Logotipo de la Encuesta**:
   - URL de imagen personalizada (`logo_url`) que sustituye el icono genérico en el encabezado.
   - Botones preset (*Escudo Perú*, *Logo Corporativo*, *Icono por Defecto*).
4. **Textos y Mensajes Personalizados**:
   - **Título Público Visible** (`public_title`): Reemplaza el título técnico en la vista pública y en la pestaña del navegador.
   - **Subtítulo / Entidad Emisora** (`public_subtitle`): Nombre de la dirección, gerencia o institución responsable.
   - **Mensaje de Bienvenida** (`welcome_message`): Instrucciones o palabras iniciales para el participante.
   - **Mensaje de Agradecimiento** (`thank_you_message`): Mensaje destacado que se muestra en la pantalla de confirmación exitosa.
5. **Previsualización en Vivo**:
   - Tarjeta interactiva que actualiza tipografía, colores, logo y textos en tiempo real a medida que el usuario escribe o selecciona colores.

---

## 4. 🗄️ Modelo de Datos y Almacenamiento

El branding se persiste en MySQL en formato JSON nativo dentro de la tabla `encuestas`:

### Columna en MySQL
```sql
ALTER TABLE `encuestas` ADD COLUMN `branding_json` JSON NULL AFTER `motivo_rechazo`;
```

### Estructura del JSON Almacenado
```json
{
  "primary_color": "#8B5CF6",
  "secondary_color": "#00F2FE",
  "bg_color": "#0b132b",
  "font_family": "Outfit",
  "logo_url": "https://midominio.com/assets/logo.png",
  "public_title": "Portal CCAV - Calidad de Servicios 2026",
  "public_subtitle": "Dirección General de Conectividad",
  "welcome_message": "Su opinión es fundamental para mejorar nuestros servicios. Le tomará menos de 3 minutos.",
  "thank_you_message": "¡Muchas gracias por su valiosa colaboración!"
}
```

---

## 5. 🔌 Endpoint REST para Guardado Inmediato

### `POST /backend/api/encuestas.php?action=update_branding`

Actualiza exclusivamente la configuración visual de una encuesta sin alterar sus preguntas ni sus respuestas existentes.

#### Request Body
```json
{
  "encuesta_id": 24,
  "branding": {
    "primary_color": "#8B5CF6",
    "secondary_color": "#00F2FE",
    "font_family": "Outfit",
    "logo_url": "https://midominio.com/logo.png",
    "public_title": "Portal CCAV - Calidad de Servicios 2026",
    "public_subtitle": "Dirección General de Conectividad",
    "welcome_message": "Bienvenido a la consulta ciudadana.",
    "thank_you_message": "Gracias por participar."
  }
}
```

#### Response
```json
{
  "success": true,
  "status": 200,
  "message": "Personalización de branding guardada exitosamente",
  "data": {
    "id": 24,
    "branding": { ... }
  }
}
```

---

## 6. 📋 Botones de 1 Clic para Copiar y Compartir

Para facilitar la distribución de las encuestas:

1. **Tabla de Aprobación SuperAdmin**:
   - Botón **`[share] Copiar Enlace`**: Copia instantáneamente la URL permanente al portapapeles.
   - Botón **`[open_in_new] Ver Encuesta`**: Abre la encuesta pública en una pestaña nueva.
   - Clic en el **Título del Instrumento**: Abre directamente la versión en vivo.
2. **Constructor de Encuestas**:
   - Botón **`[open_in_new] Ver Encuesta Creada`**: Disponible al seleccionar cualquier encuesta existente.
   - Modal de Publicación Oficial: Muestra la URL completa con botón de copiado rápido.
3. **Encuesta Pública (`encuesta.html`)**:
   - Botón **`[share] Compartir`** en la cabecera superior para que el usuario o encuestador pueda redistribuir el enlace directamente.
