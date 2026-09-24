<?php
/**
 * API REST: Gestión de Usuarios, Roles y Permisos
 * OmniPoll - Spatial Data Intelligence Core
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../helpers/auth_helper.php';

$method = $_SERVER['REQUEST_METHOD'];

try {
    $pdo = Database::getConnection();
    if (!$pdo) {
        throw new Exception("Error de conexión a la base de datos");
    }

    switch ($method) {
        case 'GET':
            // Listar usuarios con sus roles y cantidad de permisos
            $stmt = $pdo->query("
                SELECT u.id, u.nombre, u.email, u.rol, u.rol_id, u.cargo, u.avatar_url, u.activo, u.created_at, u.updated_at,
                       r.codigo AS rol_codigo, r.nombre AS rol_nombre, r.badge_color,
                       (SELECT COUNT(*) FROM rol_permisos rp WHERE rp.rol_id = r.id) AS total_permisos
                FROM `usuarios` u
                LEFT JOIN `roles` r ON u.rol_id = r.id
                ORDER BY u.id ASC
            ");
            $usuarios = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Cargar encuestas asignadas para cada usuario
            $asigStmt = $pdo->prepare("
                SELECT e.id, e.codigo, e.titulo 
                FROM encuestas e 
                JOIN usuario_encuestas ue ON e.id = ue.encuesta_id 
                WHERE ue.usuario_id = ?
                ORDER BY e.id DESC
            ");
            foreach ($usuarios as &$u) {
                $asigStmt->execute([$u['id']]);
                $u['encuestas_asignadas'] = $asigStmt->fetchAll(PDO::FETCH_ASSOC);
            }

            // Obtener roles disponibles para combos
            $rolesStmt = $pdo->query("SELECT id, codigo, nombre, descripcion, badge_color FROM `roles` ORDER BY id ASC");
            $roles = $rolesStmt->fetchAll(PDO::FETCH_ASSOC);

            // Obtener lista completa de encuestas para selector de asignación
            $allSurveysStmt = $pdo->query("SELECT id, codigo, titulo, estado FROM `encuestas` ORDER BY id DESC");
            $todasEncuestas = $allSurveysStmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode([
                'success' => true,
                'total' => count($usuarios),
                'usuarios' => $usuarios,
                'roles_disponibles' => $roles,
                'encuestas_disponibles' => $todasEncuestas
            ]);
            break;

        case 'POST':
            // Crear nuevo usuario
            $raw = file_get_contents('php://input');
            $data = json_decode($raw, true) ?: $_POST;

            $nombre = trim($data['nombre'] ?? '');
            $email = trim(strtolower($data['email'] ?? ''));
            $password = trim($data['password'] ?? '');
            $rolCodigo = trim($data['rol'] ?? 'encuestador');
            $cargo = trim($data['cargo'] ?? 'Operador de Campo');
            $encuestasAsignadas = $data['encuestas_asignadas'] ?? [];

            if (empty($nombre) || empty($email) || empty($password)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Nombre, correo electrónico y contraseña son obligatorios']);
                exit;
            }

            // Validar si el email ya existe
            $check = $pdo->prepare("SELECT id FROM `usuarios` WHERE email = ?");
            $check->execute([$email]);
            if ($check->fetch()) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Ya existe un usuario registrado con este correo electrónico']);
                exit;
            }

            // Buscar rol_id
            $roleStmt = $pdo->prepare("SELECT id FROM `roles` WHERE codigo = ?");
            $roleStmt->execute([$rolCodigo]);
            $roleId = $roleStmt->fetchColumn() ?: null;

            $passHash = password_hash($password, PASSWORD_BCRYPT);

            $stmtIns = $pdo->prepare("
                INSERT INTO `usuarios` (`nombre`, `email`, `password_hash`, `rol`, `rol_id`, `cargo`, `activo`)
                VALUES (?, ?, ?, ?, ?, ?, 1)
            ");
            $stmtIns->execute([$nombre, $email, $passHash, $rolCodigo, $roleId, $cargo]);
            $newId = (int)$pdo->lastInsertId();

            // Guardar encuestas asignadas si se proporcionaron
            if (!empty($encuestasAsignadas) && is_array($encuestasAsignadas)) {
                $insAsig = $pdo->prepare("INSERT IGNORE INTO `usuario_encuestas` (`usuario_id`, `encuesta_id`) VALUES (?, ?)");
                foreach ($encuestasAsignadas as $eid) {
                    if (is_numeric($eid)) {
                        $insAsig->execute([$newId, (int)$eid]);
                    }
                }
            }

            echo json_encode([
                'success' => true,
                'message' => 'Usuario registrado exitosamente',
                'usuario' => [
                    'id' => $newId,
                    'nombre' => $nombre,
                    'email' => $email,
                    'rol' => $rolCodigo,
                    'cargo' => $cargo
                ]
            ]);
            break;

        case 'PUT':
            // Actualizar usuario
            $raw = file_get_contents('php://input');
            $data = json_decode($raw, true) ?: [];

            $id = (int)($data['id'] ?? $_GET['id'] ?? 0);
            if ($id <= 0) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'ID de usuario no especificado']);
                exit;
            }

            $nombre = trim($data['nombre'] ?? '');
            $rolCodigo = trim($data['rol'] ?? '');
            $cargo = trim($data['cargo'] ?? '');
            $activo = isset($data['activo']) ? (int)$data['activo'] : null;
            $password = trim($data['password'] ?? '');

            // Buscar rol_id
            $roleId = null;
            if ($rolCodigo) {
                $roleStmt = $pdo->prepare("SELECT id FROM `roles` WHERE codigo = ?");
                $roleStmt->execute([$rolCodigo]);
                $roleId = $roleStmt->fetchColumn() ?: null;
            }

            $updates = [];
            $params = [];

            if (!empty($nombre)) { $updates[] = "`nombre` = ?"; $params[] = $nombre; }
            if (!empty($rolCodigo)) { $updates[] = "`rol` = ?"; $params[] = $rolCodigo; }
            if ($roleId !== null) { $updates[] = "`rol_id` = ?"; $params[] = $roleId; }
            if (!empty($cargo)) { $updates[] = "`cargo` = ?"; $params[] = $cargo; }
            if ($activo !== null) { $updates[] = "`activo` = ?"; $params[] = $activo; }
            if (!empty($password)) {
                $updates[] = "`password_hash` = ?";
                $params[] = password_hash($password, PASSWORD_BCRYPT);
            }

            if (!empty($updates)) {
                $params[] = $id;
                $sql = "UPDATE `usuarios` SET " . implode(", ", $updates) . ", `updated_at` = NOW() WHERE `id` = ?";
                $stmtUpd = $pdo->prepare($sql);
                $stmtUpd->execute($params);
            }

            // Actualizar asignación de encuestas si fue enviada
            if (isset($data['encuestas_asignadas']) && is_array($data['encuestas_asignadas'])) {
                $pdo->prepare("DELETE FROM `usuario_encuestas` WHERE `usuario_id` = ?")->execute([$id]);
                $insAsig = $pdo->prepare("INSERT IGNORE INTO `usuario_encuestas` (`usuario_id`, `encuesta_id`) VALUES (?, ?)");
                foreach ($data['encuestas_asignadas'] as $eid) {
                    if (is_numeric($eid)) {
                        $insAsig->execute([$id, (int)$eid]);
                    }
                }
            }

            echo json_encode([
                'success' => true,
                'message' => 'Usuario actualizado correctamente'
            ]);
            break;

        case 'DELETE':
            $id = (int)($_GET['id'] ?? 0);
            if ($id <= 0) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'ID de usuario no especificado']);
                exit;
            }

            // Desactivar en lugar de borrar físicamente para mantener integridad
            $stmtDel = $pdo->prepare("UPDATE `usuarios` SET `activo` = 0, `auth_token` = NULL, `updated_at` = NOW() WHERE `id` = ?");
            $stmtDel->execute([$id]);

            echo json_encode([
                'success' => true,
                'message' => 'Usuario desactivado correctamente'
            ]);
            break;

        default:
            http_response_code(405);
            echo json_encode(['success' => false, 'error' => 'Método no soportado']);
            break;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
