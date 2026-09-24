# Especificación del Formato Excel para Importación de Encuestas

El importador inteligente de **SurveyD** permite cargar encuestas completas desde archivos de hoja de cálculo (`.xlsx`, `.xls` o `.csv`).

## Estructura de Columnas Requeridas

La primera fila del archivo debe contener los encabezados de columna. Se reconocen variaciones en mayúsculas/minúsculas y con o sin tildes:

| Encabezado | Obligatorio | Descripción |
| :--- | :---: | :--- |
| `Orden` | Sí | Número secuencial del paso en la encuesta (`1`, `2`, `3`...). |
| `Tipo` | Sí | Tipo de dato o control visual a generar. |
| `Enunciado` | Sí | Texto de la pregunta que verá el usuario. |
| `Opciones` | Condicional | Lista de opciones para preguntas de selección, separadas por punto y coma `;` o saltos de línea. |
| `Obligatoria` | No | `SI` / `NO` o `1` / `0` (por defecto `SI`). |
| `Categoria` | No | Etiqueta temática para agrupar las preguntas en reportes. |

---

## Tipos de Pregunta Soportados (`Tipo`)

| Valor en Excel | Tipo en SurveyD | Visualización en Bento Analytics | Requiere Opciones |
| :--- | :--- | :--- | :---: |
| `opcion_unica` / `radio` | Selección Única | **Gráfico Donut SVG** con % líder | **Sí** |
| `opcion_multiple` / `checkbox` | Selección Múltiple | **Barras Horizontales de Frecuencia** | **Sí** |
| `calificacion` / `estrellas` | Calificación (1 a 5★) | **Histograma de Estrellas** + Promedio | No |
| `escala_nps` / `nps` | Escala NPS (0 a 10) | **Medidor Oficial NPS** (Promotores/Pasivos/Detractores) | No |
| `ubigeo_cascada` / `territorial` | Cascada Territorial | **Ranking de Densidad Territorial** | No |
| `texto` / `abierta` | Opinión en Texto | **Análisis Semántico de Polaridad** | No |

---

## Ejemplo Práctico de Tabla Excel

| Orden | Tipo | Enunciado | Opciones | Obligatoria | Categoria |
| :---: | :--- | :--- | :--- | :---: | :--- |
| 1 | `opcion_multiple` | ¿Cuáles de los siguientes dispositivos utilizan actualmente Internet en su hogar? | Smartphones; Laptops / Computadoras; Smart TVs; Tablets; Dispositivos IoT | SI | Infraestructura |
| 2 | `opcion_unica` | ¿Qué tipo de conexión principal a Internet utiliza en su domicilio? | Fibra Óptica (FTTH); Cable Coaxial (HFC); Conexión Móvil 4G/5G; Satelital; Sin conexión fija | SI | Conectividad |
| 3 | `calificacion` | En una escala de 1 a 5 estrellas, ¿cómo califica la estabilidad de su señal? | | SI | Calidad de Servicio |
| 4 | `escala_nps` | ¿Con qué probabilidad recomendaría su proveedor actual a un familiar o colega? | | SI | Satisfacción |
| 5 | `ubigeo_cascada` | Indique su ubicación de residencia actual para segmentación regional: | | SI | Demografía |
| 6 | `texto` | ¿Qué trámite digital del Estado considera que debería ser completamente automatizado? | | NO | Opinión Ciudadana |

---

## Consejos para la Preparación del Archivo

1. **Separación de Opciones**: Utilice siempre punto y coma (`;`) para delimitar las alternativas si las coloca en una sola celda.
2. **Sin Celdas Combinadas**: Evite combinar celdas en el cuerpo de preguntas para garantizar una lectura correcta por fila.
3. **Formatos Soportados**: `.xlsx` (Excel moderno), `.xls` (Excel 97-2003) y archivos de valores separados por comas `.csv`.
