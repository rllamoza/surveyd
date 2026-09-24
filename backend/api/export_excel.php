<?php
/**
 * Exportador Oficial a Excel: Microdatos en Tabla Detallada por Pregunta
 * OmniPoll / SurveyD - Spatial Data Intelligence Core
 * 
 * Genera un archivo Excel (.xls) estructurado con:
 * - Metadatos de la encuesta y fecha de emisión
 * - Cabeceras dinámicas: Columnas de auditoría/geografía + Cada Pregunta con su Enunciado
 * - Filas: Cada respuesta individual con sus valores detallados en sus respectivas columnas
 */

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../helpers/auth_helper.php';

$pdo = Database::getConnection();

if (!$pdo) {
    http_response_code(500);
    die("Error: No se pudo conectar a la base de datos MySQL.");
}

// 1. Identificar usuario y validar permisos RBAC
$currentUser = AuthHelper::getCurrentUser();
$userIdParam = isset($_GET['usuario_id']) && is_numeric($_GET['usuario_id']) ? (int)$_GET['usuario_id'] : null;
if (!$currentUser && $userIdParam) {
    $currentUser = AuthHelper::getUserById($userIdParam);
}

$isClient = $currentUser && ($currentUser['rol'] === 'cliente');
$assignedSurveyIds = $currentUser ? AuthHelper::getAssignedSurveyIds((int)$currentUser['id']) : [];

// 2. Determinar la encuesta a exportar
$encuestaId = isset($_GET['encuesta_id']) && is_numeric($_GET['encuesta_id']) ? (int)$_GET['encuesta_id'] : null;

if (!$encuestaId) {
    // Si no se especificó ID, tomar la primera autorizada
    if ($isClient) {
        if (empty($assignedSurveyIds)) {
            http_response_code(403);
            die("Acceso denegado: Su cuenta de cliente no tiene encuestas asignadas.");
        }
        $encuestaId = (int)$assignedSurveyIds[0];
    } else {
        $stmtFirst = $pdo->query("SELECT id FROM encuestas ORDER BY id DESC LIMIT 1");
        $encuestaId = $stmtFirst ? (int)$stmtFirst->fetchColumn() : null;
    }
}

if (!$encuestaId) {
    http_response_code(404);
    die("Error: No se encontró ninguna encuesta disponible para exportar.");
}

// Validar que el cliente tenga acceso a esta encuesta específica
if ($isClient && !in_array($encuestaId, $assignedSurveyIds)) {
    http_response_code(403);
    die("Acceso restringido: Esta encuesta no está asignada a su perfil de cliente.");
}

// 3. Obtener metadatos de la encuesta
$stmtEnc = $pdo->prepare("SELECT * FROM encuestas WHERE id = :id");
$stmtEnc->execute([':id' => $encuestaId]);
$encuesta = $stmtEnc->fetch(PDO::FETCH_ASSOC);

if (!$encuesta) {
    http_response_code(404);
    die("Error: La encuesta solicitada no existe.");
}

// 4. Obtener TODAS las preguntas de la encuesta en orden
$stmtPreg = $pdo->prepare("SELECT id, numero_orden, tipo, enunciado 
                           FROM preguntas 
                           WHERE encuesta_id = :eid 
                           ORDER BY numero_orden ASC");
$stmtPreg->execute([':eid' => $encuestaId]);
$preguntas = $stmtPreg->fetchAll(PDO::FETCH_ASSOC);

// Mapa de opciones para traducir códigos a etiquetas legibles (ej: 'central' -> 'Sede Central')
$opcionesLabels = [];
if (!empty($preguntas)) {
    $pids = array_column($preguntas, 'id');
    $inPids = implode(',', array_map('intval', $pids));
    $stmtOpc = $pdo->query("SELECT pregunta_id, valor, etiqueta FROM opciones_pregunta WHERE pregunta_id IN ($inPids)");
    while ($row = $stmtOpc->fetch(PDO::FETCH_ASSOC)) {
        $opcionesLabels[$row['pregunta_id']][$row['valor']] = $row['etiqueta'];
    }
}

// 4.1 Verificar si la encuesta incluye preguntas específicas de Calificación o NPS
$tieneCalificacion = false;
$tieneNps = false;
foreach ($preguntas as $p) {
    if ($p['tipo'] === 'calificacion') $tieneCalificacion = true;
    if ($p['tipo'] === 'escala_nps') $tieneNps = true;
}

// 5. Obtener todas las respuestas cabecera de la encuesta
$stmtResp = $pdo->prepare("SELECT * FROM respuestas_encuesta 
                           WHERE encuesta_id = :eid 
                           ORDER BY created_at ASC");
$stmtResp->execute([':eid' => $encuestaId]);
$respuestas = $stmtResp->fetchAll(PDO::FETCH_ASSOC);

// 6. Obtener todos los detalles de respuestas
$detallesMap = [];
if (!empty($respuestas)) {
    $rids = array_column($respuestas, 'id');
    $inRids = implode(',', array_map('intval', $rids));
    $stmtDet = $pdo->query("SELECT respuesta_encuesta_id, pregunta_id, valor_texto, valor_numero, opciones_json 
                            FROM detalle_respuestas 
                            WHERE respuesta_encuesta_id IN ($inRids)");
    while ($det = $stmtDet->fetch(PDO::FETCH_ASSOC)) {
        $rid = (int)$det['respuesta_encuesta_id'];
        $pid = (int)$det['pregunta_id'];
        $detallesMap[$rid][$pid] = $det;
    }
}

// 7. Preparar encabezados HTTP para descarga nativa de Excel (.xls)
$sanitizedCode = preg_replace('/[^A-Za-z0-9_\-]/', '_', $encuesta['codigo'] ?? 'POLL');
$filename = "SurveyD_{$sanitizedCode}_Detalle_Respuestas_" . date('Ymd_His') . ".xls";

header("Content-Type: application/vnd.ms-excel; charset=UTF-8");
header("Content-Disposition: attachment; filename=\"$filename\"");
header("Cache-Control: max-age=0, no-cache, must-revalidate, proxy-revalidate");
header("Pragma: public");

// Escribir BOM UTF-8 para garantizar acentos y caracteres especiales en cualquier versión de Excel
echo "\xEF\xBB\xBF";
?>
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
    body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; color: #111827; }
    .title-banner { font-size: 16pt; font-weight: bold; color: #004d40; text-align: left; }
    .subtitle { font-size: 10pt; color: #4b5563; font-style: italic; }
    .meta-table { margin-bottom: 20px; border-collapse: collapse; }
    .meta-table td { padding: 4px 8px; font-size: 10pt; }
    .meta-label { font-weight: bold; color: #374151; background-color: #f3f4f6; }
    
    .data-table { border-collapse: collapse; width: 100%; margin-top: 15px; }
    .data-table th {
        background-color: #003333;
        color: #ffffff;
        font-weight: bold;
        text-align: center;
        vertical-align: middle;
        border: 1px solid #002222;
        padding: 8px 10px;
        white-space: nowrap;
    }
    .data-table th.question-col {
        background-color: #0b4f52;
        color: #e0fdff;
        white-space: normal;
        min-width: 220px;
        max-width: 380px;
        text-align: left;
    }
    .data-table td {
        border: 1px solid #d1d5db;
        padding: 6px 10px;
        vertical-align: middle;
        font-size: 10pt;
    }
    .row-even { background-color: #ffffff; }
    .row-odd { background-color: #f9fafb; }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .badge-nps { font-weight: bold; color: #065f46; background-color: #d1fae5; text-align: center; }
    .badge-sat { font-weight: bold; color: #92400e; background-color: #fef3c7; text-align: center; }
</style>
</head>
<body>

<!-- Bloque de Metadatos de la Encuesta -->
<table>
    <tr>
        <td colspan="7" class="title-banner">SurveyD • Reporte de Microdatos y Respuestas en Detalle</td>
    </tr>
    <tr>
        <td colspan="7" class="subtitle">Plataforma OmniPoll Spatial 3.0 • Sistema de Inteligencia y Telemetría de Campo</td>
    </tr>
    <tr><td></td></tr>
    <tr>
        <td class="meta-label">Código Oficial:</td>
        <td><strong><?= htmlspecialchars($encuesta['codigo'] ?? 'N/A') ?></strong></td>
        <td class="meta-label">Total de Respuestas:</td>
        <td><strong><?= count($respuestas) ?></strong></td>
        <td class="meta-label">Fecha de Emisión:</td>
        <td><?= date('d/m/Y H:i:s') ?></td>
    </tr>
    <tr>
        <td class="meta-label">Título:</td>
        <td colspan="3"><strong><?= htmlspecialchars($encuesta['titulo']) ?></strong></td>
        <td class="meta-label">Categoría:</td>
        <td><?= htmlspecialchars($encuesta['categoria'] ?? 'General') ?></td>
    </tr>
    <tr>
        <td class="meta-label">Norma Técnica:</td>
        <td><?= htmlspecialchars($encuesta['norma_tecnica'] ?? 'NTS-INEI') ?></td>
        <td class="meta-label">Total Preguntas:</td>
        <td><?= count($preguntas) ?> preguntas</td>
        <td class="meta-label">Estado:</td>
        <td><?= strtoupper($encuesta['estado']) ?></td>
    </tr>
</table>

<br>

<!-- Tabla Principal de Datos Detallados -->
<table class="data-table">
    <thead>
        <tr>
            <!-- Columnas de Auditoría y Geografía -->
            <th>N°</th>
            <th>Código Sesión</th>
            <th>Fecha y Hora</th>
            <th>Departamento / Región</th>
            <th>Provincia</th>
            <th>Distrito</th>
            <th>Código UBIGEO</th>
            <th>Tiempo de Respuesta (seg)</th>
            <?php if ($tieneCalificacion): ?><th>Satisfacción (1-5)</th><?php endif; ?>
            <?php if ($tieneNps): ?><th>NPS (0-10)</th><?php endif; ?>

            <!-- Una columna por cada pregunta de la encuesta con su nombre/enunciado -->
            <?php foreach ($preguntas as $idx => $p): ?>
                <th class="question-col">
                    <strong>P<?= (int)$p['numero_orden'] ?> [<?= strtoupper($p['tipo']) ?>]:</strong><br>
                    <?= htmlspecialchars($p['enunciado']) ?>
                </th>
            <?php endforeach; ?>
        </tr>
    </thead>
    <tbody>
        <?php if (empty($respuestas)): ?>
            <tr>
                <td colspan="<?= 8 + ($tieneCalificacion ? 1 : 0) + ($tieneNps ? 1 : 0) + count($preguntas) ?>" class="text-center" style="padding: 20px; color: #6b7280;">
                    <em>No hay respuestas registradas aún para esta encuesta.</em>
                </td>
            </tr>
        <?php else: ?>
            <?php foreach ($respuestas as $rIndex => $r): 
                $rid = (int)$r['id'];
                $rowClass = ($rIndex % 2 === 0) ? 'row-even' : 'row-odd';
                $respDetalles = $detallesMap[$rid] ?? [];
            ?>
                <tr class="<?= $rowClass ?>">
                    <td class="text-center"><strong><?= $rIndex + 1 ?></strong></td>
                    <td style="font-family: Consolas, monospace;"><?= htmlspecialchars($r['codigo_sesion']) ?></td>
                    <td class="text-center"><?= htmlspecialchars($r['created_at']) ?></td>
                    <td><?= htmlspecialchars($r['departamento_nombre'] ?? '-') ?></td>
                    <td><?= htmlspecialchars($r['provincia_nombre'] ?? '-') ?></td>
                    <td><?= htmlspecialchars($r['distrito_nombre'] ?? '-') ?></td>
                    <td class="text-center" style="font-family: Consolas, monospace;"><?= htmlspecialchars($r['ubigeo_completo'] ?? '-') ?></td>
                    <td class="text-right"><?= (int)$r['tiempo_llenado_segundos'] ?> s</td>
                    <?php if ($tieneCalificacion): ?><td class="badge-sat"><?= $r['satisfaccion'] ? $r['satisfaccion'] . ' ★' : '-' ?></td><?php endif; ?>
                    <?php if ($tieneNps): ?><td class="badge-nps"><?= $r['nps'] !== null ? $r['nps'] : '-' ?></td><?php endif; ?>

                    <!-- Celdas para cada una de las preguntas -->
                    <?php foreach ($preguntas as $p): 
                        $pid = (int)$p['id'];
                        $tipo = $p['tipo'];
                        $det = $respDetalles[$pid] ?? null;

                        $valorFinal = '-';

                        if ($det) {
                            if (!empty($det['opciones_json'])) {
                                $arr = json_decode($det['opciones_json'], true);
                                if (is_array($arr)) {
                                    // Si es un array de opciones múltiples o única
                                    $translated = [];
                                    foreach ($arr as $val) {
                                        if (is_scalar($val)) {
                                            $translated[] = $opcionesLabels[$pid][$val] ?? $val;
                                        }
                                    }
                                    $valorFinal = implode('; ', $translated);
                                } else {
                                    $valorFinal = $det['opciones_json'];
                                }
                            } elseif ($det['valor_texto'] !== null && $det['valor_texto'] !== '') {
                                $rawVal = $det['valor_texto'];
                                $valorFinal = $opcionesLabels[$pid][$rawVal] ?? $rawVal;
                            } elseif ($det['valor_numero'] !== null) {
                                $valorFinal = (string)$det['valor_numero'];
                            }
                        } else {
                            // Fallback de valores almacenados en cabecera si el detalle no existía
                            if ($tipo === 'calificacion' && $r['satisfaccion']) {
                                $valorFinal = $r['satisfaccion'] . ' Estrellas';
                            } elseif ($tipo === 'escala_nps' && $r['nps'] !== null) {
                                $valorFinal = $r['nps'] . ' / 10';
                            } elseif (($tipo === 'ubigeo_cascada' || $tipo === 'ubigeo') && !empty($r['departamento_nombre'])) {
                                $valorFinal = "{$r['departamento_nombre']} > {$r['provincia_nombre']} > {$r['distrito_nombre']} ({$r['ubigeo_completo']})";
                            }
                        }
                    ?>
                        <td><?= htmlspecialchars($valorFinal) ?></td>
                    <?php endforeach; ?>
                </tr>
            <?php endforeach; ?>
        <?php endif; ?>
    </tbody>
</table>

</body>
</html>
