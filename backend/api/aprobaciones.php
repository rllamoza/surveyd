<?php
/**
 * API REST: Panel de Aprobación SuperAdmin y Auditoría (MySQL Nativo)
 * OmniPoll - Spatial Data Intelligence Core
 */

require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/repository.php';

$method = $_SERVER['REQUEST_METHOD'];
$pdo = Database::getConnection();

// --- GET: Listar encuestas con estado de aprobación y bitácora desde MySQL ---
if ($method === 'GET') {
    $estado = $_GET['estado'] ?? null;

    if ($pdo) {
        try {
            $query = "SELECT e.*, 
                             (SELECT COUNT(*) FROM respuestas_encuesta r WHERE r.encuesta_id = e.id) as total_respuestas
                      FROM encuestas e WHERE 1=1";
            $params = [];

            if ($estado && strtolower($estado) !== 'todos') {
                $query .= " AND e.estado = :estado";
                $params[':estado'] = strtolower($estado);
            }
            $query .= " ORDER BY e.id ASC";

            $stmt = $pdo->prepare($query);
            $stmt->execute($params);
            $encuestas = $stmt->fetchAll();

            // Calcular KPIs directamente en MySQL
            $kpiStmt = $pdo->query("SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN estado = 'pendiente' THEN 1 ELSE 0 END) as pendientes,
                SUM(CASE WHEN estado = 'aprobada' THEN 1 ELSE 0 END) as aprobadas,
                SUM(CASE WHEN estado = 'rechazada' THEN 1 ELSE 0 END) as rechazadas
                FROM encuestas");
            $kpis = $kpiStmt->fetch();

            // Obtener bitácora de auditoría reciente
            $audStmt = $pdo->query("SELECT a.*, e.titulo as encuesta_titulo, e.codigo as encuesta_codigo 
                                   FROM auditoria_aprobaciones a 
                                   JOIN encuestas e ON a.encuesta_id = e.id 
                                   ORDER BY a.created_at DESC LIMIT 15");
            $auditoria = $audStmt->fetchAll();

            sendResponse([
                'encuestas' => $encuestas,
                'kpis' => [
                    'total' => (int)($kpis['total'] ?? 0),
                    'pendientes' => (int)($kpis['pendientes'] ?? 0),
                    'aprobadas' => (int)($kpis['aprobadas'] ?? 0),
                    'rechazadas' => (int)($kpis['rechazadas'] ?? 0)
                ],
                'auditoria_reciente' => $auditoria
            ]);
        } catch (PDOException $e) {
            error_log("DB get aprobaciones error: " . $e->getMessage());
        }
    }

    sendError('Error de conexión a la base de datos MySQL', 500);
}

// --- POST: Aprobar o Rechazar en MySQL ---
if ($method === 'POST') {
    $body = getRequestBody();

    $encuestaId = (int)($body['encuesta_id'] ?? 0);
    $accion = strtolower(trim($body['accion'] ?? ''));
    $comentario = trim($body['comentario'] ?? '');
    $resolucion = trim($body['resolucion_oficial'] ?? '');
    $usuario = trim($body['usuario'] ?? 'Ing. Carlos Valdivia');

    if (!$encuestaId) sendError('ID de encuesta es requerido', 400);
    if (!in_array($accion, ['aprobar', 'rechazar', 'solicitar_cambios'])) {
        sendError('Acción no permitida. Use: aprobar, rechazar o solicitar_cambios', 400);
    }

    $nuevoEstado = match($accion) {
        'aprobar' => 'aprobada',
        'rechazar' => 'rechazada',
        'solicitar_cambios' => 'pendiente',
        default => 'pendiente'
    };

    if ($accion === 'aprobar' && empty($resolucion)) {
        $resolucion = 'RES-DIR-' . rand(100, 999) . '-' . date('Y') . '/MTC';
    }

    if ($pdo) {
        try {
            $pdo->beginTransaction();

            $stmt = $pdo->prepare("UPDATE encuestas 
                SET estado = :est, 
                    resolucion_aprobacion = :res, 
                    motivo_rechazo = :mot 
                WHERE id = :id");
            $stmt->execute([
                ':est' => $nuevoEstado,
                ':res' => $accion === 'aprobar' ? $resolucion : null,
                ':mot' => $accion === 'rechazar' ? ($comentario ?: 'Observada por comisión revisora.') : null,
                ':id'  => $encuestaId
            ]);

            $audStmt = $pdo->prepare("INSERT INTO auditoria_aprobaciones 
                (encuesta_id, usuario_id, usuario_nombre, accion, comentario, resolucion_oficial) 
                VALUES (:eid, 1, :usr, :acc, :com, :res)");
            $audStmt->execute([
                ':eid' => $encuestaId,
                ':usr' => $usuario,
                ':acc' => $accion === 'aprobar' ? 'aprobada' : 'rechazada',
                ':com' => $comentario ?: ($accion === 'aprobar' ? 'Aprobada conforme a norma técnica oficial.' : 'Observada en revisión técnica.'),
                ':res' => $resolucion ?: null
            ]);

            $pdo->commit();

            sendResponse([
                'encuesta_id' => $encuestaId,
                'nuevo_estado' => $nuevoEstado,
                'resolucion' => $resolucion,
                'comentario' => $comentario
            ], 200, 'Estado actualizado en MySQL a: ' . strtoupper($nuevoEstado));
        } catch (PDOException $e) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            sendError('Error al actualizar en MySQL: ' . $e->getMessage(), 500);
        }
    }

    sendError('Error de conexión a la base de datos MySQL', 500);
}
