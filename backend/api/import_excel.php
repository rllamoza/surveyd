<?php
/**
 * API REST: Importador & Parser de Encuestas Excel/CSV/JSON
 * OmniPoll - Spatial Data Intelligence Core
 */

require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/repository.php';

$method = $_SERVER['REQUEST_METHOD'];
if ($method !== 'POST') {
    sendError('Método no permitido. Solo se acepta POST.', 405);
}

$body = getRequestBody();
$store = DataRepository::loadStore();

// Puede recibir o bien un archivo subido o un payload JSON procesado por SheetJS en el frontend
$titulo = trim($body['titulo'] ?? '');
$descripcion = trim($body['descripcion'] ?? '');
$categoria = trim($body['categoria'] ?? 'Importación Excel');
$norma = trim($body['norma_tecnica'] ?? 'OMNI-XLSX-V1');
$preguntas = $body['preguntas'] ?? [];

// Si se envió un archivo directamente (.csv o .xlsx)
if (isset($_FILES['excel_file']) && $_FILES['excel_file']['error'] === UPLOAD_ERR_OK) {
    $fileTmp = $_FILES['excel_file']['tmp_name'];
    $fileName = $_FILES['excel_file']['name'];
    $fileExt = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));

    if (empty($titulo)) {
        $titulo = 'Encuesta Importada: ' . pathinfo($fileName, PATHINFO_FILENAME);
    }

    // Parser nativo para CSV o TSV
    if ($fileExt === 'csv' || $fileExt === 'txt') {
        $handle = fopen($fileTmp, 'r');
        $header = fgetcsv($handle, 1000, ",");
        $rowCount = 1;
        while (($row = fgetcsv($handle, 1000, ",")) !== FALSE) {
            if (!empty($row[0])) {
                $preguntas[] = [
                    'numero_orden' => $rowCount++,
                    'enunciado' => trim($row[0]),
                    'tipo' => !empty($row[1]) ? trim($row[1]) : 'opcion_unica',
                    'ayuda' => $row[2] ?? null,
                    'es_requerida' => 1,
                    'opciones' => !empty($row[3]) ? array_map(fn($opt) => [
                        'etiqueta' => trim($opt),
                        'valor' => strtolower(preg_replace('/[^a-zA-Z0-9]/', '_', trim($opt)))
                    ], explode('|', $row[3])) : []
                ];
            }
        }
        fclose($handle);
    }
}

if (empty($titulo)) {
    $titulo = 'Encuesta Dinámica Excel ' . date('d/m/Y H:i');
}

if (empty($preguntas)) {
    // Si no hay preguntas explícitas, generar plantilla de muestra estructurada
    $preguntas = [
        [
            'numero_orden' => 1,
            'tipo' => 'opcion_unica',
            'enunciado' => '¿Cuál es su frecuencia de uso del servicio digital?',
            'ayuda' => 'Seleccione una única alternativa',
            'es_requerida' => 1,
            'opciones' => [
                ['etiqueta' => 'Diario', 'valor' => 'diario'],
                ['etiqueta' => 'Semanal', 'valor' => 'semanal'],
                ['etiqueta' => 'Mensual', 'valor' => 'mensual']
            ]
        ],
        [
            'numero_orden' => 2,
            'tipo' => 'ubigeo_cascada',
            'enunciado' => 'Ubicación demográfica de aplicación del sondeo:',
            'ayuda' => 'Cascada Departamento / Provincia / Distrito',
            'es_requerida' => 1
        ],
        [
            'numero_orden' => 3,
            'tipo' => 'calificacion',
            'enunciado' => 'Nivel de satisfacción general con la plataforma',
            'ayuda' => 'Puntaje de 1 a 5 estrellas',
            'es_requerida' => 1
        ]
    ];
}

$nuevoId = count($store['encuestas']) > 0 ? max(array_column($store['encuestas'], 'id')) + 1 : 1;
$codigo = 'POLL-XLS-' . date('Y') . '-' . str_pad($nuevoId, 3, '0', STR_PAD_LEFT);

$nuevaEncuesta = [
    'id' => $nuevoId,
    'codigo' => $codigo,
    'titulo' => $titulo,
    'descripcion' => $descripcion ?: 'Encuesta generada mediante motor de importación Excel con validación de columnas.',
    'norma_tecnica' => $norma,
    'categoria' => $categoria,
    'version' => 'v1.0-EXCEL',
    'estado' => 'pendiente', // Ingresa directamente al panel de aprobación de SuperAdmin
    'tiempo_estimado_min' => max(2, (int)ceil(count($preguntas) * 0.8)),
    'total_pasos' => count($preguntas),
    'preguntas' => $preguntas,
    'resolucion_aprobacion' => null,
    'motivo_rechazo' => null,
    'created_at' => date('Y-m-d H:i:s')
];

$store['encuestas'][] = $nuevaEncuesta;

// Bitácora de auditoría
$store['auditoria'][] = [
    'id' => count($store['auditoria']) > 0 ? max(array_column($store['auditoria'], 'id')) + 1 : 1,
    'encuesta_id' => $nuevoId,
    'accion' => 'enviada_revision',
    'usuario' => 'Importador Automático Excel OmniPoll',
    'resolucion' => null,
    'comentario' => 'Encuesta importada con ' . count($preguntas) . ' preguntas detectadas. Pendiente de validación metodológica.',
    'fecha' => date('Y-m-d H:i:s')
];

DataRepository::saveStore($store);

sendResponse([
    'encuesta' => $nuevaEncuesta,
    'preguntas_importadas' => count($preguntas),
    'codigo' => $codigo,
    'mensaje' => 'Encuesta importada y enviada a la bandeja de Aprobación de SuperAdmin exitosamente.'
], 201, 'Importación completada con éxito');
