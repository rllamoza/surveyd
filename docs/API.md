# Especificación de la API REST - SurveyD

La API REST de **SurveyD** proporciona endpoints estandarizados con formato JSON para la autenticación, gestión de encuestas, recolección de respuestas de campo, telemetría y catálogo de UBIGEO.

## Formato General de Respuestas

Todas las respuestas exitosas devuelven una estructura consistente:

```json
{
  "success": true,
  "status": 200,
  "message": "Operación exitosa",
  "data": { ... },
  "timestamp": "2026-09-24T14:30:00-05:00"
}
```

En caso de error:

```json
{
  "success": false,
  "status": 400,
  "message": "Descripción del error",
  "errors": null,
  "timestamp": "2026-09-24T14:30:00-05:00"
}
```

---

## 1. Autenticación & Usuarios

### `POST /backend/api/auth.php?action=login`
Inicia sesión y genera el perfil del usuario activo.

**Payload:**
```json
{
  "email": "admin@omnipoll.pe",
  "password": "admin123"
}
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "token": "omnipoll_token_...",
    "user": {
      "id": 1,
      "nombre": "Ing. Raúl Llamoza",
      "email": "admin@omnipoll.pe",
      "rol": "superadmin"
    }
  }
}
```

### `GET /backend/api/usuarios.php`
Obtiene la lista de usuarios del sistema con sus roles y encuestas asignadas (para clientes).

### `POST /backend/api/usuarios.php?action=asignar_encuestas`
Asigna o desasigna encuestas a un usuario con rol de `cliente`.

**Payload:**
```json
{
  "usuario_id": 3,
  "encuestas_ids": [1, 23]
}
```

---

## 2. Catálogo Territorial (UBIGEO INEI)

### `GET /backend/api/ubigeo.php?action=departamentos`
Devuelve las 25 regiones oficiales de Perú.

### `GET /backend/api/ubigeo.php?action=provincias&dep_codigo=15`
Devuelve las provincias del departamento especificado.

### `GET /backend/api/ubigeo.php?action=distritos&prov_codigo=1501`
Devuelve los distritos de la provincia especificada (ej. Lima Metropolitana).

---

## 3. Gestión de Encuestas

### `GET /backend/api/encuestas.php`
Lista las encuestas disponibles. Si se envía el encabezado de autenticación de un usuario con rol `cliente`, filtra únicamente las encuestas asignadas a dicho cliente.

### `GET /backend/api/encuestas.php?id={id_o_codigo}`
Obtiene el detalle completo de una encuesta con su estructura de preguntas, opciones normalizadas y configuración de `branding` para su ejecución.

**Campos de respuesta relevantes:**
- `id`, `codigo`, `titulo`, `descripcion`, `categoria`, `norma_tecnica`, `estado`.
- `branding`: Objeto con `primary_color`, `secondary_color`, `font_family`, `logo_url`, `public_title`, `public_subtitle`, `welcome_message`, `thank_you_message`.
- `preguntas`: Array ordenado de preguntas con sus alternativas.

### `POST /backend/api/encuestas.php`
Crea una nueva encuesta estructurada o actualiza un borrador/publicación existente, incluyendo su configuración de `branding`.

### `POST /backend/api/encuestas.php?action=update_branding`
Actualiza de forma atómica y segura el branding visual de una encuesta sin tocar preguntas ni respuestas existentes.

**Payload:**
```json
{
  "encuesta_id": 24,
  "branding": {
    "primary_color": "#8B5CF6",
    "secondary_color": "#00F2FE",
    "bg_color": "#0b132b",
    "font_family": "Outfit",
    "logo_url": "https://midominio.com/logo.png",
    "public_title": "Portal de Servicios 2026",
    "public_subtitle": "Dirección de Calidad",
    "welcome_message": "Instrucciones de la encuesta...",
    "thank_you_message": "¡Muchas gracias por su respuesta!"
  }
}
```

### `POST /backend/api/import_excel.php`
Importa masivamente una encuesta a partir de un payload JSON generado desde una hoja de cálculo Excel.

---

## 4. Ingesta de Respuestas

### `POST /backend/api/respuestas.php`
Registra la respuesta completa de un informante ciudadano.

**Payload:**
```json
{
  "encuesta_id": 1,
  "departamento": "Lima",
  "provincia": "Lima Metropolitana",
  "distrito": "Miraflores",
  "ubigeo_codigo": "150122",
  "tiempo_llenado_segundos": 145,
  "respuestas": [
    { "pregunta_id": 1, "opciones_seleccionadas": ["Fibra Óptica (FTTH)"] },
    { "pregunta_id": 2, "opciones_seleccionadas": ["Smartphones", "Laptops"] },
    { "pregunta_id": 3, "calificacion": 5 },
    { "pregunta_id": 4, "nps": 10 },
    { "pregunta_id": 5, "texto": "Excelente velocidad y latencia." }
  ]
}
```

---

## 5. Motor de Bento Analytics

### `GET /backend/api/analytics.php?encuesta_id={id}&usuario_id={uid}`
Devuelve las métricas consolidadas de la encuesta seleccionada, calculando automáticamente la configuración gráfica óptima para cada pregunta:

- `grafico_tipo`: `donut`, `horizontal_bar`, `rating_stars`, `nps_gauge`, `geo_density`, `sentiment_text`.
- KPIs de completitud, tiempo promedio y NPS.
- Curva horaria y distribución geográfica.
