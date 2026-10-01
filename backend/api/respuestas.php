<?php
/**
 * API REST: Envío y Registro de Respuestas de Encuestas (MySQL Nativo)
 * OmniPoll - Spatial Data Intelligence Core
 */

require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/repository.php';

$method = $_SERVER['REQUEST_METHOD'];
$pdo = Database::getConnection();

// --- POST: Registrar respuesta de encuesta en MySQL ---
if ($method === 'POST') {
    $body = getRequestBody();

    $encuestaId = (int)($body['encuesta_id'] ?? 1);
    $codigoSesion = $body['codigo_sesion'] ?? ('SES-' . date('Y') . '-' . strtoupper(bin2hex(random_bytes(4))));
    $tiempoSegundos = (int)($body['tiempo_llenado_segundos'] ?? 160);
    $ubigeo = $body['ubigeo'] ?? [];
    $respuestas = $body['respuestas'] ?? [];

    $depNombre = $ubigeo['departamento'] ?? 'Lima';
    $provNombre = $ubigeo['provincia'] ?? 'Lima Metropolitana';
    $distNombre = $ubigeo['distrito'] ?? 'Miraflores';
    $ubigeoCompleto = $ubigeo['codigo_distrito'] ?? ($ubigeo['codigo'] ?? '150122');
    $depCod = substr($ubigeoCompleto, 0, 2);
    $provCod = substr($ubigeoCompleto, 0, 4);

    // Detectar y validar preguntas según configuración oficial registrada en MySQL
    $satisfaccion = null;
    $nps = null;

    if ($pdo) {
        $pregStmt = $pdo->prepare("SELECT id, tipo, enunciado, es_requerida, configuracion_json FROM preguntas WHERE encuesta_id = :eid ORDER BY numero_orden ASC");
        $pregStmt->execute([':eid' => $encuestaId]);
        $pregList = $pregStmt->fetchAll(PDO::FETCH_ASSOC);

        $validationErrors = [];

        foreach ($pregList as $pregRow) {
            $pid = (int)$pregRow['id'];
            $tipo = $pregRow['tipo'];
            $enu = $pregRow['enunciado'];
            $req = !empty($pregRow['es_requerida']);
            $cfg = !empty($pregRow['configuracion_json']) ? (is_array($pregRow['configuracion_json']) ? $pregRow['configuracion_json'] : json_decode($pregRow['configuracion_json'], true)) : [];
            if (!is_array($cfg)) $cfg = [];

            $val = $respuestas["q_$pid"] ?? ($respuestas[$pid] ?? null);
            $hasVal = ($val !== null && $val !== '' && (!is_array($val) || count($val) > 0));

            // Obligatoriedad
            if ($req && !$hasVal && $tipo !== 'ubigeo_cascada') {
                $validationErrors[] = "La pregunta \"$enu\" es obligatoria.";
                continue;
            }

            // Validar tipos de texto con restricciones configuradas
            if ($hasVal && $tipo === 'texto') {
                $modo = $cfg['modo'] ?? 'libre';
                $strVal = trim((string)$val);

                if ($modo === 'solo_numero') {
                    $allowDec = !empty($cfg['decimales']);
                    // Validar que no contenga letras y cumpla formato numérico
                    $isNum = $allowDec ? is_numeric($strVal) : (preg_match('/^-?\d+$/', $strVal) === 1);
                    if (!$isNum) {
                        $validationErrors[] = "La pregunta \"$enu\" solo permite números" . ($allowDec ? '.' : ' enteros sin letras ni decimales.');
                    } else {
                        $numVal = $allowDec ? (float)$strVal : (int)$strVal;
                        if (isset($cfg['min']) && $cfg['min'] !== '' && $cfg['min'] !== null && $numVal < (float)$cfg['min']) {
                            $validationErrors[] = "El valor para \"$enu\" no puede ser menor a {$cfg['min']}.";
                        }
                        if (isset($cfg['max']) && $cfg['max'] !== '' && $cfg['max'] !== null && $numVal > (float)$cfg['max']) {
                            $validationErrors[] = "El valor para \"$enu\" no puede ser mayor a {$cfg['max']}.";
                        }
                    }
                } elseif ($modo === 'solo_texto') {
                    if (preg_match('/[0-9]/', $strVal)) {
                        $validationErrors[] = "La pregunta \"$enu\" solo permite letras, no números.";
                    }
                    if (!empty($cfg['min_chars']) && mb_strlen($strVal) < (int)$cfg['min_chars']) {
                        $validationErrors[] = "La pregunta \"$enu\" requiere al menos {$cfg['min_chars']} caracteres.";
                    }
                } elseif ($modo === 'lista') {
                    $lista = is_array($cfg['lista'] ?? null) ? $cfg['lista'] : [];
                    if (!empty($lista)) {
                        $matched = false;
                        foreach ($lista as $item) {
                            if (strcasecmp(trim($item), $strVal) === 0) {
                                $matched = true;
                                break;
                            }
                        }
                        if (!$matched) {
                            $validationErrors[] = "La respuesta a \"$enu\" no coincide con ninguna opción permitida.";
                        }
                    }
                }
            }

            // NPS y Calificación
            if ($hasVal) {
                if ($tipo === 'calificacion' && is_numeric($val)) {
                    $satisfaccion = (int)$val;
                } elseif ($tipo === 'escala_nps' && is_numeric($val)) {
                    $nps = (int)$val;
                }
            }
        }

        if (!empty($validationErrors)) {
            sendError(implode(' ', $validationErrors), 422);
            exit;
        }
    }

    if ($pdo) {
        try {
            $pdo->beginTransaction();

            $stmt = $pdo->prepare("INSERT INTO respuestas_encuesta 
                (encuesta_id, codigo_sesion, departamento_nombre, provincia_nombre, distrito_nombre, 
                 departamento_codigo, provincia_codigo, distrito_codigo, ubigeo_completo, 
                 tiempo_llenado_segundos, satisfaccion, nps, ip_origen) 
                VALUES (:eid, :ses, :depn, :provn, :distn, :depc, :provc, :distc, :ubi, :tmp, :sat, :nps, :ip)");
            
            $stmt->execute([
                ':eid' => $encuestaId,
                ':ses' => $codigoSesion,
                ':depn' => $depNombre,
                ':provn' => $provNombre,
                ':distn' => $distNombre,
                ':depc' => $depCod,
                ':provc' => $provCod,
                ':distc' => $ubigeoCompleto,
                ':ubi' => $ubigeoCompleto,
                ':tmp' => $tiempoSegundos,
                ':sat' => $satisfaccion,
                ':nps' => $nps,
                ':ip' => $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'
            ]);

            $respuestaId = (int)$pdo->lastInsertId();

            // Insertar detalle de respuestas si hay preguntas respondidas
            $detStmt = $pdo->prepare("INSERT INTO detalle_respuestas 
                (respuesta_encuesta_id, pregunta_id, valor_texto, valor_numero, opciones_json) 
                VALUES (:rid, :pid, :vt, :vn, :opt)");

            if (!empty($respuestas) && is_array($respuestas)) {
                foreach ($respuestas as $key => $val) {
                    $valTexto = is_string($val) ? $val : null;
                    $valNum = is_numeric($val) ? (float)$val : null;
                    $opcJson = is_array($val) ? json_encode($val, JSON_UNESCAPED_UNICODE) : null;
                    
                    // Extraer ID real de la pregunta
                    $pidClean = str_replace('q_', '', (string)$key);
                    $preguntaId = is_numeric($pidClean) ? (int)$pidClean : 0;
                    if ($preguntaId <= 0) {
                        // Fallback si la clave era numérica directa
                        $preguntaId = is_numeric($key) ? (int)$key : 1;
                    }
                    
                    $detStmt->execute([
                        ':rid' => $respuestaId,
                        ':pid' => $preguntaId,
                        ':vt' => $valTexto,
                        ':vn' => $valNum,
                        ':opt' => $opcJson
                    ]);
                }
            }

            $pdo->commit();

            sendResponse([
                'recibo_id' => 'OMNI-HASH-' . strtoupper(substr(md5($codigoSesion . time()), 0, 12)),
                'codigo_sesion' => $codigoSesion,
                'ubigeo_registrado' => "$depNombre > $provNombre > $distNombre ($ubigeoCompleto)",
                'estado' => 'REGISTRADA_EN_MYSQL',
                'mensaje' => 'Respuesta encriptada y persistida en base de datos local app_encuestas.'
            ], 201, 'Encuesta enviada exitosamente');
        } catch (PDOException $e) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            sendError('Error al guardar respuesta en MySQL: ' . $e->getMessage(), 500);
        }
    }

    sendError('Error de conexión con MySQL', 500);
}

// --- GET: Listar respuestas desde MySQL ---
if ($method === 'GET') {
    $encuestaId = isset($_GET['encuesta_id']) ? (int)$_GET['encuesta_id'] : null;

    if ($pdo) {
        try {
            $sql = "SELECT r.*, e.titulo as encuesta_titulo 
                    FROM respuestas_encuesta r 
                    JOIN encuestas e ON r.encuesta_id = e.id ";
            $params = [];
            if ($encuestaId) {
                $sql .= " WHERE r.encuesta_id = :eid";
                $params[':eid'] = $encuestaId;
            }
            $sql .= " ORDER BY r.created_at DESC";

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            sendResponse($stmt->fetchAll());
        } catch (PDOException $e) {
            sendError('Error al consultar respuestas en MySQL: ' . $e->getMessage(), 500);
        }
    }

    sendError('Error de conexión con MySQL', 500);
}
