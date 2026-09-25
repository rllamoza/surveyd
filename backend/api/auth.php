<?php
/**
 * API REST: Autenticación, Login, Verificación de Sesión y Logout
 * OmniPoll - Spatial Data Intelligence Core
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../helpers/auth_helper.php';

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($action) {
        case 'login':
            if ($method !== 'POST') {
                http_response_code(405);
                echo json_encode(['success' => false, 'error' => 'Método no permitido']);
                exit;
            }

            $rawInput = file_get_contents('php://input');
            $data = json_decode($rawInput, true);

            $identifier = trim($data['username'] ?? $data['user'] ?? $data['email'] ?? $_POST['username'] ?? $_POST['user'] ?? $_POST['email'] ?? '');
            $password = trim($data['password'] ?? $data['pass'] ?? $_POST['password'] ?? $_POST['pass'] ?? '');

            if (empty($identifier) || empty($password)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Debe ingresar usuario/correo y contraseña']);
                exit;
            }

            $result = AuthHelper::login($identifier, $password);

            if (!$result['success']) {
                http_response_code(401);
                echo json_encode($result);
                exit;
            }

            echo json_encode($result);
            break;

        case 'check_session':
        case 'me':
            $user = AuthHelper::getCurrentUser();

            if (!$user) {
                http_response_code(401);
                echo json_encode([
                    'success' => false,
                    'authenticated' => false,
                    'error' => 'Sesión no iniciada o token expirado'
                ]);
                exit;
            }

            echo json_encode([
                'success' => true,
                'authenticated' => true,
                'usuario' => $user,
                'permisos' => $user['permisos'] ?? []
            ]);
            break;

        case 'logout':
            AuthHelper::logout();
            echo json_encode([
                'success' => true,
                'message' => 'Sesión finalizada correctamente'
            ]);
            break;

        default:
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'error' => 'Acción no especificada o inválida (use action=login, check_session, logout, me)'
            ]);
            break;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
