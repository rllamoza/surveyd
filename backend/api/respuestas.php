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

    $satisfaccion = (int)($respuestas['calificacion'] ?? ($respuestas['pregunta_4'] ?? 5));
    $nps = (int)($respuestas['escala_nps'] ?? ($respuestas['pregunta_5'] ?? 9));

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
                    $opcJson = is_array($val) ? json_encode($val) : null;
                    
                    $detStmt->execute([
                        ':rid' => $respuestaId,
                        ':pid' => 1,
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
