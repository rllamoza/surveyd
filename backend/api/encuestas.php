<?php
/**
 * API REST: Encuestas Dinámicas (Conectado Directamente a MySQL)
 * OmniPoll - Spatial Data Intelligence Core
 */

require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/repository.php';

$method = $_SERVER['REQUEST_METHOD'];
$id = isset($_GET['id']) && is_numeric($_GET['id']) ? (int)$_GET['id'] : null;
$codigo = $_GET['codigo'] ?? (!empty($_GET['id']) && !is_numeric($_GET['id']) ? trim($_GET['id']) : null);
$estadoFiltro = $_GET['estado'] ?? null;
$search = $_GET['search'] ?? null;

$pdo = Database::getConnection();

// --- GET: Listar o consultar encuesta específica ---
if ($method === 'GET') {
    if ($pdo) {
        try {
            if ($id || $codigo) {
                $sql = "SELECT e.*, u.nombre as creador_nombre 
                        FROM encuestas e 
                        LEFT JOIN usuarios u ON e.creador_id = u.id 
                        WHERE " . ($id ? "e.id = :id" : "(UPPER(TRIM(e.codigo)) = UPPER(TRIM(:cod)) OR e.id = :cod_num)");
                $stmt = $pdo->prepare($sql);
                if ($id) {
                    $stmt->execute([':id' => $id]);
                } else {
                    $stmt->execute([
                        ':cod' => $codigo,
                        ':cod_num' => is_numeric($codigo) ? (int)$codigo : 0
                    ]);
                }
                $encuesta = $stmt->fetch();

                if ($encuesta) {
                    // Cargar secciones
                    $secStmt = $pdo->prepare("SELECT * FROM secciones WHERE encuesta_id = :eid ORDER BY numero_orden ASC");
                    $secStmt->execute([':eid' => $encuesta['id']]);
                    $encuesta['secciones'] = $secStmt->fetchAll();

                    // Cargar preguntas
                    $pregStmt = $pdo->prepare("SELECT * FROM preguntas WHERE encuesta_id = :eid ORDER BY numero_orden ASC");
                    $pregStmt->execute([':eid' => $encuesta['id']]);
                    $preguntas = $pregStmt->fetchAll();

                    foreach ($preguntas as &$preg) {
                        if (!empty($preg['configuracion_json']) && is_string($preg['configuracion_json'])) {
                            $decoded = json_decode($preg['configuracion_json'], true);
                            $preg['configuracion'] = $decoded;
                            // Exponer como 'validacion' para el constructor frontend
                            $preg['validacion'] = $decoded;
                        } else {
                            $preg['validacion'] = null;
                        }
                        $opcStmt = $pdo->prepare("SELECT * FROM opciones_pregunta WHERE pregunta_id = :pid ORDER BY numero_orden ASC");
                        $opcStmt->execute([':pid' => $preg['id']]);
                        $preg['opciones'] = $opcStmt->fetchAll();
                    }
                    if (!empty($encuesta['branding_json'])) {
                        $encuesta['branding'] = is_string($encuesta['branding_json']) 
                            ? json_decode($encuesta['branding_json'], true) 
                            : $encuesta['branding_json'];
                    } else {
                        $encuesta['branding'] = null;
                    }
                    $encuesta['preguntas'] = $preguntas;
                    sendResponse($encuesta);
                } else {
                    sendError('Encuesta no encontrada en la base de datos', 404);
                }
            }

            // Listar todas las encuestas desde MySQL
            $query = "SELECT e.*, 
                             (SELECT COUNT(*) FROM respuestas_encuesta r WHERE r.encuesta_id = e.id) as total_respuestas,
                             (SELECT COUNT(*) FROM preguntas p WHERE p.encuesta_id = e.id) as total_preguntas
                      FROM encuestas e WHERE 1=1";
            $params = [];

            if ($estadoFiltro && strtolower($estadoFiltro) !== 'todos') {
                $query .= " AND e.estado = :estado";
                $params[':estado'] = strtolower($estadoFiltro);
            }

            if ($search) {
                $query .= " AND (e.titulo LIKE :s1 OR e.codigo LIKE :s2 OR e.categoria LIKE :s3)";
                $params[':s1'] = "%$search%";
                $params[':s2'] = "%$search%";
                $params[':s3'] = "%$search%";
            }

            $query .= " ORDER BY e.id ASC";
            $stmt = $pdo->prepare($query);
            $stmt->execute($params);
            sendResponse($stmt->fetchAll());
        } catch (PDOException $e) {
            error_log("DB get encuestas error: " . $e->getMessage());
        }
    }

    // Fallback a repositorio si no hubiera conexión activa
    $store = DataRepository::loadStore();
    sendResponse($store['encuestas'] ?? []);
}

// Función para generar código estándar: 5 primeras letras del título + 3 dígitos del ID
function generarCodigoOficial($titulo, $id) {
    $clean = @iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $titulo);
    if (!$clean) $clean = $titulo;
    $letters = strtoupper(preg_replace('/[^A-Za-z]/', '', $clean));
    if (strlen($letters) < 5) {
        $letters = str_pad($letters, 5, 'X');
    } else {
        $letters = substr($letters, 0, 5);
    }
    return $letters . sprintf('%03d', (int)$id);
}

// --- POST: Crear nueva encuesta o actualizar branding en MySQL ---
if ($method === 'POST') {
    $body = getRequestBody();

    // Acción rápida para actualizar el branding exclusivo de una encuesta
    if (isset($_GET['action']) && $_GET['action'] === 'update_branding') {
        $surveyId = (int)($body['encuesta_id'] ?? ($body['id'] ?? ($id ?? 0)));
        if (!$surveyId) {
            sendError('ID de encuesta no proporcionado', 400);
        }
        $branding = $body['branding'] ?? [];
        $brandingJson = json_encode($branding, JSON_UNESCAPED_UNICODE);

        if ($pdo) {
            $stmt = $pdo->prepare("UPDATE encuestas SET branding_json = :br WHERE id = :id");
            $stmt->execute([':br' => $brandingJson, ':id' => $surveyId]);
            sendResponse(['id' => $surveyId, 'branding' => $branding], 200, 'Personalización de branding guardada exitosamente');
            exit;
        }
        sendError('Error de base de datos', 500);
    }

    if (empty($body['titulo'])) {
        sendError('El título de la encuesta es obligatorio', 400);
    }

    $surveyId = !empty($body['id']) ? (int)$body['id'] : null;
    $titulo = trim($body['titulo']);
    $descripcion = trim($body['descripcion'] ?? 'Encuesta creada en OmniPoll');
    $categoria = trim($body['categoria'] ?? 'General');
    $norma = trim($body['norma_tecnica'] ?? 'OMNI-STD-2026');
    $esPublicada = !empty($body['publicar']) || ($body['estado'] ?? '') === 'aprobada';
    $estado = $esPublicada ? 'aprobada' : ($body['estado'] ?? 'pendiente');
    $preguntas = $body['preguntas'] ?? [];
    $totalPasos = count($preguntas) > 0 ? count($preguntas) : 4;
    $brandingJson = !empty($body['branding']) ? json_encode($body['branding'], JSON_UNESCAPED_UNICODE) : null;

    if ($pdo) {
        try {
            $pdo->beginTransaction();

            // CASO 1: Edición de una encuesta existente (no generar nueva)
            if ($surveyId) {
                $stmtCheck = $pdo->prepare("SELECT * FROM encuestas WHERE id = :id");
                $stmtCheck->execute([':id' => $surveyId]);
                $existing = $stmtCheck->fetch(PDO::FETCH_ASSOC);

                if ($existing) {
                    $encuestaId = $surveyId;
                    $codigoOficial = $existing['codigo']; // Mantener código oficial original (ej: CCAVX024)

                    // Si no se envió publicar=true y la encuesta ya estaba aprobada, conservar su estado o el enviado
                    $estadoFinal = $esPublicada ? 'aprobada' : ($body['estado'] ?? $existing['estado']);

                    $updateStmt = $pdo->prepare("UPDATE encuestas SET 
                        titulo = :tit,
                        descripcion = :des,
                        norma_tecnica = :nor,
                        categoria = :cat,
                        estado = :est,
                        tiempo_estimado_min = :tmp,
                        total_pasos = :pas,
                        branding_json = :brn,
                        updated_at = NOW()
                        WHERE id = :id");
                    $updateStmt->execute([
                        ':tit' => $titulo,
                        ':des' => $descripcion,
                        ':nor' => $norma,
                        ':cat' => $categoria,
                        ':est' => $estadoFinal,
                        ':tmp' => max(3, (int)ceil($totalPasos * 0.8)),
                        ':pas' => $totalPasos,
                        ':brn' => $brandingJson,
                        ':id'  => $encuestaId
                    ]);

                    // Obtener o asegurar sección principal
                    $secStmt = $pdo->prepare("SELECT id FROM secciones WHERE encuesta_id = :eid ORDER BY numero_orden ASC LIMIT 1");
                    $secStmt->execute([':eid' => $encuestaId]);
                    $seccionId = $secStmt->fetchColumn();
                    if (!$seccionId) {
                        $secIns = $pdo->prepare("INSERT INTO secciones (encuesta_id, numero_orden, titulo, descripcion) VALUES (:eid, 1, 'Sección Principal', 'Cuestionario General')");
                        $secIns->execute([':eid' => $encuestaId]);
                        $seccionId = (int)$pdo->lastInsertId();
                    }

                    // Obtener preguntas actuales registradas en BD
                    $stmtOldPreg = $pdo->prepare("SELECT id FROM preguntas WHERE encuesta_id = :eid");
                    $stmtOldPreg->execute([':eid' => $encuestaId]);
                    $existingPreguntaIds = $stmtOldPreg->fetchAll(PDO::FETCH_COLUMN);

                    $keptPreguntaIds = [];

                    $updPregStmt = $pdo->prepare("UPDATE preguntas SET 
                        seccion_id = :sid,
                        numero_orden = :ord,
                        tipo = :tip,
                        enunciado = :enu,
                        ayuda = :ayu,
                        es_requerida = :req,
                        configuracion_json = :cfg
                        WHERE id = :id AND encuesta_id = :eid");

                    $insPregStmt = $pdo->prepare("INSERT INTO preguntas 
                        (encuesta_id, seccion_id, numero_orden, tipo, enunciado, ayuda, es_requerida, configuracion_json) 
                        VALUES (:eid, :sid, :ord, :tip, :enu, :ayu, :req, :cfg)");

                    $delOpcStmt = $pdo->prepare("DELETE FROM opciones_pregunta WHERE pregunta_id = :pid");
                    $insOpcStmt = $pdo->prepare("INSERT INTO opciones_pregunta (pregunta_id, numero_orden, etiqueta, valor) VALUES (:pid, :ord, :eti, :val)");

                    $orden = 1;
                    foreach ($preguntas as $p) {
                        $enunciado = $p['enunciado'] ?? $p['pregunta'] ?? 'Pregunta sin título';
                        $tipo = $p['tipo'] ?? 'opcion_unica';
                        $ayuda = $p['ayuda'] ?? '';
                        $req = (!isset($p['requerida']) || !empty($p['requerida'])) ? 1 : 0;
                        $qId = isset($p['id']) && is_numeric($p['id']) ? (int)$p['id'] : 0;

                        $validacionJson = isset($p['validacion']) ? json_encode($p['validacion'], JSON_UNESCAPED_UNICODE) : null;

                        if ($qId > 0 && in_array($qId, $existingPreguntaIds)) {
                            // Actualizar pregunta existente en su mismo ID (mantiene relaciones con respuestas)
                            $updPregStmt->execute([
                                ':sid' => $seccionId,
                                ':ord' => $orden++,
                                ':tip' => $tipo,
                                ':enu' => $enunciado,
                                ':ayu' => $ayuda,
                                ':req' => $req,
                                ':cfg' => $validacionJson,
                                ':id'  => $qId,
                                ':eid' => $encuestaId
                            ]);
                            $currentPregId = $qId;
                        } else {
                            // Insertar nueva pregunta agregada por el usuario
                            $insPregStmt->execute([
                                ':eid' => $encuestaId,
                                ':sid' => $seccionId,
                                ':ord' => $orden++,
                                ':tip' => $tipo,
                                ':enu' => $enunciado,
                                ':ayu' => $ayuda,
                                ':req' => $req,
                                ':cfg' => $validacionJson
                            ]);
                            $currentPregId = (int)$pdo->lastInsertId();
                        }
                        $keptPreguntaIds[] = $currentPregId;

                        // Actualizar opciones
                        $delOpcStmt->execute([':pid' => $currentPregId]);
                        if (!empty($p['opciones']) && is_array($p['opciones'])) {
                            $opcOrden = 1;
                            foreach ($p['opciones'] as $opt) {
                                $etiqueta = is_array($opt) ? ($opt['etiqueta'] ?? '') : $opt;
                                $valor = is_array($opt) ? ($opt['valor'] ?? '') : strtolower(preg_replace('/[^a-zA-Z0-9]/', '_', $etiqueta));
                                $insOpcStmt->execute([
                                    ':pid' => $currentPregId,
                                    ':ord' => $opcOrden++,
                                    ':eti' => $etiqueta,
                                    ':val' => $valor
                                ]);
                            }
                        }
                    }

                    // Eliminar preguntas que el usuario haya retirado de la encuesta
                    $toDelete = array_diff($existingPreguntaIds, $keptPreguntaIds);
                    if (!empty($toDelete)) {
                        $placeholders = implode(',', array_fill(0, count($toDelete), '?'));
                        $delStmt = $pdo->prepare("DELETE FROM preguntas WHERE encuesta_id = ? AND id IN ($placeholders)");
                        $delStmt->execute(array_merge([$encuestaId], array_values($toDelete)));
                    }

                    // Registrar auditoría de actualización
                    $audAccion = $esPublicada ? 'aprobada' : 'enviada_revision';
                    $audComentario = $esPublicada 
                        ? 'Encuesta actualizada y publicada oficialmente (' . $codigoOficial . ')' 
                        : 'Encuesta modificada en el constructor (' . $codigoOficial . ')';
                    $audStmt = $pdo->prepare("INSERT INTO auditoria_aprobaciones (encuesta_id, usuario_id, usuario_nombre, accion, comentario) VALUES (:eid, 1, 'Ing. Carlos Valdivia', :acc, :com)");
                    $audStmt->execute([
                        ':eid' => $encuestaId,
                        ':acc' => $audAccion,
                        ':com' => $audComentario
                    ]);

                    $pdo->commit();

                    sendResponse([
                        'id' => $encuestaId,
                        'codigo' => $codigoOficial,
                        'titulo' => $titulo,
                        'estado' => $estadoFinal,
                        'url_publica' => 'encuesta.html?id=' . $codigoOficial,
                        'url_runner' => '?encuesta=' . $codigoOficial,
                        'total_preguntas' => count($preguntas),
                        'modo' => 'actualizado'
                    ], 200, $esPublicada ? 'Encuesta ' . $codigoOficial . ' actualizada y publicada con éxito' : 'Cambios guardados en la encuesta ' . $codigoOficial);
                    exit;
                }
            }

            // CASO 2: Creación de NUEVA encuesta (id es nulo o 0)
            // Código temporal único mientras se obtiene el ID autoincremental
            $tempCodigo = 'TEMP-' . bin2hex(random_bytes(6));

            $stmt = $pdo->prepare("INSERT INTO encuestas 
                (codigo, titulo, descripcion, norma_tecnica, categoria, version, estado, tiempo_estimado_min, total_pasos, creador_id, branding_json) 
                VALUES (:cod, :tit, :des, :nor, :cat, 'v1.0', :est, :tmp, :pas, 1, :brn)");
            $stmt->execute([
                ':cod' => $tempCodigo,
                ':tit' => $titulo,
                ':des' => $descripcion,
                ':nor' => $norma,
                ':cat' => $categoria,
                ':est' => $estado,
                ':tmp' => max(3, (int)ceil($totalPasos * 0.8)),
                ':pas' => $totalPasos,
                ':brn' => $brandingJson
            ]);

            $nuevaEncuestaId = (int)$pdo->lastInsertId();

            // Regla oficial solicitada por el usuario: 5 primeras letras del nombre + 3 dígitos del ID
            $codigoOficial = generarCodigoOficial($titulo, $nuevaEncuestaId);

            // Actualizar con el código oficial definitivo
            $updateCodStmt = $pdo->prepare("UPDATE encuestas SET codigo = :cod WHERE id = :id");
            $updateCodStmt->execute([':cod' => $codigoOficial, ':id' => $nuevaEncuestaId]);

            // Insertar sección por defecto
            $secStmt = $pdo->prepare("INSERT INTO secciones (encuesta_id, numero_orden, titulo, descripcion) VALUES (:eid, 1, 'Sección Principal', 'Cuestionario General')");
            $secStmt->execute([':eid' => $nuevaEncuestaId]);
            $seccionId = (int)$pdo->lastInsertId();

            // Insertar preguntas
            $pregStmt = $pdo->prepare("INSERT INTO preguntas (encuesta_id, seccion_id, numero_orden, tipo, enunciado, ayuda, es_requerida, configuracion_json) VALUES (:eid, :sid, :ord, :tip, :enu, :ayu, :req, :cfg)");
            $opcStmt = $pdo->prepare("INSERT INTO opciones_pregunta (pregunta_id, numero_orden, etiqueta, valor) VALUES (:pid, :ord, :eti, :val)");

            $orden = 1;
            foreach ($preguntas as $p) {
                $enunciado = $p['enunciado'] ?? $p['pregunta'] ?? 'Pregunta sin título';
                $tipo = $p['tipo'] ?? 'opcion_unica';
                $ayuda = $p['ayuda'] ?? '';
                $req = (!isset($p['requerida']) || !empty($p['requerida'])) ? 1 : 0;
                $validacionJson = isset($p['validacion']) ? json_encode($p['validacion'], JSON_UNESCAPED_UNICODE) : null;

                $pregStmt->execute([
                    ':eid' => $nuevaEncuestaId,
                    ':sid' => $seccionId,
                    ':ord' => $orden++,
                    ':tip' => $tipo,
                    ':enu' => $enunciado,
                    ':ayu' => $ayuda,
                    ':req' => $req,
                    ':cfg' => $validacionJson
                ]);
                $preguntaId = (int)$pdo->lastInsertId();

                if (!empty($p['opciones']) && is_array($p['opciones'])) {
                    $opcOrden = 1;
                    foreach ($p['opciones'] as $opt) {
                        $etiqueta = is_array($opt) ? ($opt['etiqueta'] ?? '') : $opt;
                        $valor = is_array($opt) ? ($opt['valor'] ?? '') : strtolower(preg_replace('/[^a-zA-Z0-9]/', '_', $etiqueta));
                        $opcStmt->execute([
                            ':pid' => $preguntaId,
                            ':ord' => $opcOrden++,
                            ':eti' => $etiqueta,
                            ':val' => $valor
                        ]);
                    }
                }
            }

            // Registrar auditoría
            $audAccion = $esPublicada ? 'aprobada' : 'enviada_revision';
            $audComentario = $esPublicada ? 'Encuesta construida y publicada oficialmente con código ' . $codigoOficial : 'Encuesta creada y registrada para aprobación.';
            $audStmt = $pdo->prepare("INSERT INTO auditoria_aprobaciones (encuesta_id, usuario_id, usuario_nombre, accion, comentario) VALUES (:eid, 1, 'Ing. Carlos Valdivia', :acc, :com)");
            $audStmt->execute([
                ':eid' => $nuevaEncuestaId,
                ':acc' => $audAccion,
                ':com' => $audComentario
            ]);

            $pdo->commit();

            sendResponse([
                'id' => $nuevaEncuestaId,
                'codigo' => $codigoOficial,
                'titulo' => $titulo,
                'estado' => $estado,
                'url_publica' => 'encuesta.html?id=' . $codigoOficial,
                'url_runner' => '?encuesta=' . $codigoOficial,
                'total_preguntas' => count($preguntas),
                'modo' => 'creado'
            ], 201, $esPublicada ? 'Encuesta publicada con código ' . $codigoOficial : 'Encuesta guardada con código ' . $codigoOficial);
        } catch (PDOException $e) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            sendError('Error al guardar en base de datos: ' . $e->getMessage(), 500);
        }
    }

    sendError('No hay conexión con la base de datos MySQL', 500);
}

// --- PUT: Actualizar estado o datos de encuesta ---
if ($method === 'PUT') {
    if (!$id) sendError('ID de encuesta requerido', 400);
    $body = getRequestBody();

    if ($pdo) {
        try {
            $stmt = $pdo->prepare("UPDATE encuestas SET titulo = COALESCE(:tit, titulo), descripcion = COALESCE(:des, descripcion), estado = COALESCE(:est, estado), norma_tecnica = COALESCE(:nor, norma_tecnica) WHERE id = :id");
            $stmt->execute([
                ':tit' => $body['titulo'] ?? null,
                ':des' => $body['descripcion'] ?? null,
                ':est' => $body['estado'] ?? null,
                ':nor' => $body['norma_tecnica'] ?? null,
                ':id'  => $id
            ]);
            sendResponse(['id' => $id, 'actualizado' => true]);
        } catch (PDOException $e) {
            sendError('Error al actualizar en MySQL: ' . $e->getMessage(), 500);
        }
    }
}

// --- DELETE: Eliminar encuesta ---
if ($method === 'DELETE') {
    if (!$id) sendError('ID de encuesta requerido', 400);
    if ($pdo) {
        try {
            $stmt = $pdo->prepare("DELETE FROM encuestas WHERE id = :id");
            $stmt->execute([':id' => $id]);
            sendResponse(['id' => $id, 'eliminado' => true]);
        } catch (PDOException $e) {
            sendError('Error al eliminar en MySQL: ' . $e->getMessage(), 500);
        }
    }
}
