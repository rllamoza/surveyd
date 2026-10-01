# Motor de Validación de Preguntas y Reglas de Entrada - SurveyD

Este documento detalla la arquitectura, configuración y funcionamiento del **Motor de Validación Multinivel** de **SurveyD (OmniPoll Spatial Core)**, diseñado para garantizar la integridad de los datos recolectados en campo tanto en tiempo real en el cliente como en el servidor MySQL.

---

## 1. 🎯 Objetivos de la Arquitectura

1. **Evitar datos corruptos o inválidos**: Si una pregunta como *"Edad"* requiere números, el informante no puede ingresar letras ni como texto escrito ni pegado.
2. **Experiencia de usuario fluida (UX Proactiva)**: Bloquear caracteres inválidos directamente a nivel de pulsación de teclado (`keydown`) en lugar de esperar hasta el envío para notificar el error.
3. **Soporte Móvil Nativo**: Desplegar teclados numéricos adecuados (`inputmode="numeric"` / `inputmode="decimal"`) en smartphones Android e iOS.
4. **Seguridad Zero-Trust en Servidor**: El backend PHP valida obligatoriamente todas las restricciones antes de ejecutar cualquier transacción `INSERT`, rechazando con código HTTP `422 Unprocessable Entity` si algún valor no cumple las reglas.

---

## 2. 🎛️ Modos de Validación Configurables en el Constructor

Desde el **Constructor & Importador Excel** (`#view-constructor-excel`), cada pregunta de tipo *"Pregunta Abierta / Texto Libre"* dispone de un panel con 4 modos seleccionables con 1 clic:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                   CONFIGURACIÓN DE VALIDACIÓN DEL CAMPO                │
├───────────────┬────────────────┬───────────────────┬───────────────────┤
│ [📝 Texto]    │ [🔤 Solo Letras│ [🔢 Solo Números] │ [📋 Lista Val.]   │
│ Libre         │ Sin números ni │ Enteros/decimales │ Solo opciones     │
│ con límites   │ símbolos       │ Rango min / max   │ predefinidas      │
└───────────────┴────────────────┴───────────────────┴───────────────────┘
```

### Modo 1: `libre` (Texto Libre)
* **Descripción**: Permite redactar libremente cualquier carácter (letras, números y símbolos).
* **Parámetros configurables**:
  - `maxlength`: Número máximo de caracteres permitidos (por defecto: 500).
  - `min_chars`: Número mínimo de caracteres requeridos si la pregunta es obligatoria (por defecto: 3).
* **Detección inteligente por enunciado (Fallback)**: Si no se define una regla explícita, el motor analiza el enunciado de la pregunta (ej. *"DNI"*, *"Teléfono"*, *"Edad"*, *"Año"*) y aplica automáticamente la máscara numérica correspondiente.

### Modo 2: `solo_texto` (Solo Letras)
* **Descripción**: Exclusivo para nombres, apellidos, descripciones o motivos. Bloquea de inmediato dígitos numéricos (`0-9`) y caracteres de control no permitidos.
* **Caracteres aceptados**: Alfabeto latino, espacios, acentos (`á`, `é`, `í`, `ó`, `ú`, `ñ`, `ü`) y signos de puntuación básicos (`.`, `,`, `-`).
* **Parámetros configurables**:
  - `maxlength`: Longitud máxima (por defecto: 200).
  - `min_chars`: Longitud mínima (por defecto: 0).

### Modo 3: `solo_numero` (Solo Números)
* **Descripción**: Exclusivo para cantidades, edad, porcentajes, montos o documentos.
* **Parámetros configurables**:
  - `min`: Valor numérico mínimo permitido (ej. `1` para edad).
  - `max`: Valor numérico máximo permitido (ej. `100` o `99999999` para DNI).
  - `decimales`: Booleano (`true`/`false`). Si es `false`, solo admite enteros positivos o negativos. Si es `true`, admite separador decimal con punto (`.`).
* **Comportamiento en dispositivo móvil**: Activa el teclado numérico (`inputmode="numeric"` o `inputmode="decimal"`).

### Modo 4: `lista` (Lista de Valores Predefinidos)
* **Descripción**: Restringe la entrada exclusivamente a un listado cerrado de opciones definido por el usuario (ej. *"Administración, Contabilidad, Sistemas, Operaciones"*).
* **Parámetros configurables**:
  - `lista`: Array de cadenas con las alternativas autorizadas.
* **Experiencia en la encuesta**: Ofrece sugerencias mediante `<datalist>` nativo y botones de acceso directo (chips interactivos) para seleccionar el valor con un solo toque.

---

## 3. 🛡️ Las Tres Capas de Protección (Defensa en Profundidad)

### Capa 1: Bloqueo en Tiempo Real en Cliente ([public-survey.js](file:///c:/xampp/htdocs/APPS/app_encuestas/frontend/js/public-survey.js))

1. **`onNumericKeyDown(event, allowDecimals)`**:
   - Intercepta la pulsación física o virtual antes de que se dibuje en pantalla.
   - Si la tecla pulsada no es un número (`0-9`), tecla de edición (`Backspace`, `Delete`, `Tab`, `Enter`) o atajo (`Ctrl+C`, `Ctrl+V`, `Ctrl+A`), invoca `event.preventDefault()` e imprime una alerta visual sutil:
     ```text
     ⚠️ Solo se permiten números. Las letras no están permitidas.
     ```
2. **`onNumericPaste(event, allowDecimals)`**:
   - Sanitiza el texto copiado al portapapeles. Si el usuario intenta pegar texto como `"edad: 25"`, extrae únicamente los dígitos `25` y descarta las letras.
3. **`onNumericInput(qid, el, min, max, allowDecimals)`**:
   - Aplica expresión regular (`/[^0-9]/g` o `/[^0-9.]/g`) como garantía reactiva inmediata.
4. **`validateNumericBlur(qid, el, min, max, allowDecimals)`**:
   - Al perder el foco, verifica los límites de rango: si el valor ingresado es menor a `min` o mayor a `max`, corrige el campo y emite el mensaje de advertencia.

### Capa 2: Barrera de Revisión y Envío ([public-survey.js](file:///c:/xampp/htdocs/APPS/app_encuestas/frontend/js/public-survey.js#L1340))

Antes de presentar la pantalla de confirmación criptográfica:
- La función `reviewAnswers()` recorre cada pregunta y evalúa su objeto `q.validacion`:
  - En `solo_numero`: Evalúa con regex `/^-?\d+$/` (o `/^-?\d+(\.\d+)?$/` para decimales). Si contiene letras o está fuera de rango, detiene el avance.
  - En `solo_texto`: Rechaza si contiene dígitos numéricos.
  - En `lista`: Comprueba coincidencia insensible a mayúsculas/minúsculas (`case-insensitive`) contra el catálogo de opciones.
- Si existe una infracción:
  - Muestra un toast de error descriptivo (ej. `❌ Pregunta 05: Debe ser un número entero (sin letras ni decimales)`).
  - Hace scroll animado al bloque de la pregunta y le aplica una animación de pulso con borde rojo (`question-required-highlight`).

### Capa 3: Blindaje en Servidor MySQL ([respuestas.php](file:///c:/xampp/htdocs/APPS/app_encuestas/backend/api/respuestas.php#L34))

Incluso si un usuario malicioso eludiera el código JavaScript o enviara peticiones directas vía `cURL` o `Postman`:
1. El backend consulta las preguntas registradas y su columna `configuracion_json`.
2. Valida tipo por tipo:
   ```php
   if ($modo === 'solo_numero') {
       $isNum = $allowDec ? is_numeric($strVal) : (preg_match('/^-?\d+$/', $strVal) === 1);
       if (!$isNum) {
           $validationErrors[] = "La pregunta \"$enu\" solo permite números enteros sin letras ni decimales.";
       }
   }
   ```
3. Si se detectan inconsistencias, la transacción `INSERT` **nunca se ejecuta** y se devuelve:
   ```json
   {
       "success": false,
       "status": 422,
       "message": "La pregunta \"Edad\" solo permite números enteros sin letras ni decimales."
   }
   ```

---

## 4. 💾 Almacenamiento en Base de Datos

Las reglas de validación se persisten en la tabla `preguntas` en la columna nativa `configuracion_json` de MySQL:

```sql
-- Estructura de la columna en MySQL
`configuracion_json` JSON DEFAULT NULL;
```

### Ejemplo de JSON almacenado:
```json
{
  "modo": "solo_numero",
  "min": "1",
  "max": "100",
  "decimales": false,
  "maxlength": 500,
  "min_chars": 0,
  "lista": []
}
```

---

## 5. 🔄 Edición en la Misma Encuesta (Sin Duplicación de Códigos)

Cuando el usuario selecciona una encuesta en el selector (`#builder-survey-selector`) y modifica preguntas o cambia de plantilla:
1. El sistema conserva el `id` original y el código oficial existente (ej. `CCAVX024`).
2. El endpoint `POST /backend/api/encuestas.php` detecta el parámetro `id`:
   - Realiza un `UPDATE` sobre la encuesta principal.
   - Sincroniza las preguntas existentes actualizando sus textos y `configuracion_json` en sus mismos `id`, preservando la integridad referencial con las respuestas históricas de la tabla `detalle_respuestas`.
   - Inserta únicamente las preguntas añadidas y elimina las removidas por el usuario.
3. No se generan códigos clonados redundantes (como `CCAV025`, `CCAV026`).
