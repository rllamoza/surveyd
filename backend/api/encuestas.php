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
                            $preg['configuracion'] = json_decode($preg['configuracion_json'], true);
                        }
                        $opcStmt = $pdo->prepare("SELECT * FROM opciones_pregunta WHERE pregunta_id = :pid ORDER BY numero_orden ASC");
                        $opcStmt->execute([':pid' => $preg['id']]);
                        $preg['opciones'] = $opcStmt->fetchAll();
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

// --- POST: Crear nueva encuesta (desde Constructor o Excel) en MySQL ---
if ($method === 'POST') {
    $body = getRequestBody();

    if (empty($body['titulo'])) {
        sendError('El título de la encuesta es obligatorio', 400);
    }

    $titulo = trim($body['titulo']);
    $descripcion = trim($body['descripcion'] ?? 'Encuesta creada en OmniPoll');
    $categoria = trim($body['categoria'] ?? 'General');
    $norma = trim($body['norma_tecnica'] ?? 'OMNI-STD-2026');
    $esPublicada = !empty($body['publicar']) || ($body['estado'] ?? '') === 'aprobada';
    $estado = $esPublicada ? 'aprobada' : ($body['estado'] ?? 'pendiente');
    $preguntas = $body['preguntas'] ?? [];
    $totalPasos = count($preguntas) > 0 ? count($preguntas) : 4;

    if ($pdo) {
        try {
            $pdo->beginTransaction();

            // Código temporal único mientras se obtiene el ID autoincremental
            $tempCodigo = 'TEMP-' . bin2hex(random_bytes(6));

            $stmt = $pdo->prepare("INSERT INTO encuestas 
                (codigo, titulo, descripcion, norma_tecnica, categoria, version, estado, tiempo_estimado_min, total_pasos, creador_id) 
                VALUES (:cod, :tit, :des, :nor, :cat, 'v1.0', :est, :tmp, :pas, 1)");
            $stmt->execute([
                ':cod' => $tempCodigo,
                ':tit' => $titulo,
                ':des' => $descripcion,
                ':nor' => $norma,
                ':cat' => $categoria,
                ':est' => $estado,
                ':tmp' => max(3, (int)ceil($totalPasos * 0.8)),
                ':pas' => $totalPasos
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
            $pregStmt = $pdo->prepare("INSERT INTO preguntas (encuesta_id, seccion_id, numero_orden, tipo, enunciado, ayuda, es_requerida) VALUES (:eid, :sid, :ord, :tip, :enu, :ayu, :req)");
            $opcStmt = $pdo->prepare("INSERT INTO opciones_pregunta (pregunta_id, numero_orden, etiqueta, valor) VALUES (:pid, :ord, :eti, :val)");

            $orden = 1;
            foreach ($preguntas as $p) {
                $enunciado = $p['enunciado'] ?? $p['pregunta'] ?? 'Pregunta sin título';
                $tipo = $p['tipo'] ?? 'opcion_unica';
                $ayuda = $p['ayuda'] ?? '';
                $req = (!isset($p['requerida']) || !empty($p['requerida'])) ? 1 : 0;

                $pregStmt->execute([
                    ':eid' => $nuevaEncuestaId,
                    ':sid' => $seccionId,
                    ':ord' => $orden++,
                    ':tip' => $tipo,
                    ':enu' => $enunciado,
                    ':ayu' => $ayuda,
                    ':req' => $req
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
                'total_preguntas' => count($preguntas)
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
