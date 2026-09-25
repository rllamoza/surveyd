<?php
/**
 * API REST: Roles y Matriz de Permisos Granulares
 * OmniPoll - Spatial Data Intelligence Core
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../config/db.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

try {
    $pdo = Database::getConnection();
    if (!$pdo) {
        throw new Exception("Error de conexión a la base de datos");
    }

    switch ($method) {
        case 'GET':
            // 1. Roles con contador de permisos y usuarios asignados
            $rolesStmt = $pdo->query("
                SELECT r.id, r.codigo, r.nombre, r.descripcion, r.badge_color,
                       (SELECT COUNT(*) FROM rol_permisos rp WHERE rp.rol_id = r.id) AS total_permisos,
                       (SELECT COUNT(*) FROM usuarios u WHERE u.rol = r.codigo) AS total_usuarios
                FROM `roles` r 
                ORDER BY r.id ASC
            ");
            $roles = $rolesStmt->fetchAll(PDO::FETCH_ASSOC);

            // 2. Módulos con sus permisos
            $modulosStmt = $pdo->query("SELECT id, codigo, nombre, icono, orden FROM `modulos` ORDER BY orden ASC");
            $modulos = $modulosStmt->fetchAll(PDO::FETCH_ASSOC);

            // 3. Permisos
            $permStmt = $pdo->query("SELECT id, modulo_id, codigo, nombre, descripcion FROM `permisos` ORDER BY modulo_id ASC, id ASC");
            $permisos = $permStmt->fetchAll(PDO::FETCH_ASSOC);

            // 4. Mapeo de rol_permisos
            $rpStmt = $pdo->query("
                SELECT r.codigo AS rol_codigo, r.id AS rol_id, p.codigo AS permiso_codigo, p.id AS permiso_id
                FROM `rol_permisos` rp
                INNER JOIN `roles` r ON rp.rol_id = r.id
                INNER JOIN `permisos` p ON rp.permiso_id = p.id
            ");
            $matriz = [];
            $rolePermIds = [];
            while ($row = $rpStmt->fetch(PDO::FETCH_ASSOC)) {
                $matriz[$row['rol_codigo']][] = $row['permiso_codigo'];
                $rolePermIds[$row['rol_codigo']][] = (int)$row['permiso_id'];
            }

            foreach ($roles as &$r) {
                $r['permisos_ids'] = $rolePermIds[$r['codigo']] ?? [];
                $r['permisos_codigos'] = $matriz[$r['codigo']] ?? [];
            }

            echo json_encode([
                'success' => true,
                'roles' => $roles,
                'modulos' => $modulos,
                'permisos' => $permisos,
                'matriz_permisos' => $matriz
            ]);
            break;

        case 'POST':
            // Crear nuevo Rol
            $raw = file_get_contents('php://input');
            $data = json_decode($raw, true) ?: $_POST;

            $nombre = trim($data['nombre'] ?? '');
            $codigoRaw = trim($data['codigo'] ?? '');
            $descripcion = trim($data['descripcion'] ?? '');
            $badgeColor = trim($data['badge_color'] ?? 'primary');
            $permisosSeleccionados = $data['permisos'] ?? [];

            // Generar o limpiar código
            if (empty($codigoRaw)) {
                $codigoRaw = $nombre;
            }
            $codigo = preg_replace('/[^a-z0-9_]/', '_', strtolower($codigoRaw));
            $codigo = trim($codigo, '_');

            if (empty($codigo) || empty($nombre)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'El código y el nombre del rol son obligatorios']);
                exit;
            }

            // Validar si el código ya existe
            $check = $pdo->prepare("SELECT id FROM `roles` WHERE codigo = ?");
            $check->execute([$codigo]);
            if ($check->fetch()) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => "Ya existe un rol con el código '$codigo'"]);
                exit;
            }

            // Insertar rol
            $stmt = $pdo->prepare("
                INSERT INTO `roles` (codigo, nombre, descripcion, badge_color)
                VALUES (?, ?, ?, ?)
            ");
            $stmt->execute([$codigo, $nombre, $descripcion, $badgeColor]);
            $nuevoRolId = (int)$pdo->lastInsertId();

            // Insertar permisos asociados
            if (!empty($permisosSeleccionados) && is_array($permisosSeleccionados)) {
                $insP = $pdo->prepare("INSERT INTO `rol_permisos` (rol_id, permiso_id) VALUES (?, ?)");
                foreach ($permisosSeleccionados as $pId) {
                    $pId = (int)$pId;
                    if ($pId > 0) {
                        $insP->execute([$nuevoRolId, $pId]);
                    }
                }
            }

            echo json_encode([
                'success' => true,
                'message' => "Rol '$nombre' ($codigo) creado con éxito",
                'rol' => [
                    'id' => $nuevoRolId,
                    'codigo' => $codigo,
                    'nombre' => $nombre,
                    'descripcion' => $descripcion,
                    'badge_color' => $badgeColor,
                    'total_permisos' => count($permisosSeleccionados)
                ]
            ]);
            break;

        case 'PUT':
            // Actualizar permisos o metadatos de un rol existente
            $raw = file_get_contents('php://input');
            $data = json_decode($raw, true) ?: $_POST;

            $rolId = (int)($data['id'] ?? 0);
            if ($rolId <= 0) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'ID de rol inválido']);
                exit;
            }

            $stmtCheck = $pdo->prepare("SELECT * FROM `roles` WHERE id = ?");
            $stmtCheck->execute([$rolId]);
            $existingRole = $stmtCheck->fetch(PDO::FETCH_ASSOC);

            if (!$existingRole) {
                http_response_code(404);
                echo json_encode(['success' => false, 'error' => 'Rol no encontrado']);
                exit;
            }

            $nombre = trim($data['nombre'] ?? $existingRole['nombre']);
            $descripcion = trim($data['descripcion'] ?? $existingRole['descripcion']);
            $badgeColor = trim($data['badge_color'] ?? $existingRole['badge_color']);

            // Actualizar tabla roles
            $updStmt = $pdo->prepare("UPDATE `roles` SET nombre = ?, descripcion = ?, badge_color = ? WHERE id = ?");
            $updStmt->execute([$nombre, $descripcion, $badgeColor, $rolId]);

            // Si se enviaron permisos, actualizar asignación
            if (isset($data['permisos']) && is_array($data['permisos'])) {
                // Eliminar anteriores
                $pdo->prepare("DELETE FROM `rol_permisos` WHERE rol_id = ?")->execute([$rolId]);

                $insP = $pdo->prepare("INSERT INTO `rol_permisos` (rol_id, permiso_id) VALUES (?, ?)");
                foreach ($data['permisos'] as $pId) {
                    $pId = (int)$pId;
                    if ($pId > 0) {
                        $insP->execute([$rolId, $pId]);
                    }
                }
            }

            echo json_encode([
                'success' => true,
                'message' => "Rol '$nombre' actualizado exitosamente"
            ]);
            break;

        default:
            http_response_code(405);
            echo json_encode(['success' => false, 'error' => 'Método HTTP no permitido']);
            break;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
