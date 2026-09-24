<?php
/**
 * API REST: Roles y Matriz de Permisos Granulares
 * OmniPoll - Spatial Data Intelligence Core
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../config/db.php';

try {
    $pdo = Database::getConnection();
    if (!$pdo) {
        throw new Exception("Error de conexión a la base de datos");
    }

    // 1. Roles
    $rolesStmt = $pdo->query("SELECT id, codigo, nombre, descripcion, badge_color FROM `roles` ORDER BY id ASC");
    $roles = $rolesStmt->fetchAll(PDO::FETCH_ASSOC);

    // 2. Módulos con sus permisos
    $modulosStmt = $pdo->query("SELECT id, codigo, nombre, icono, orden FROM `modulos` ORDER BY orden ASC");
    $modulos = $modulosStmt->fetchAll(PDO::FETCH_ASSOC);

    // 3. Permisos
    $permStmt = $pdo->query("SELECT id, modulo_id, codigo, nombre, descripcion FROM `permisos` ORDER BY id ASC");
    $permisos = $permStmt->fetchAll(PDO::FETCH_ASSOC);

    // 4. Mapeo de rol_permisos
    $rpStmt = $pdo->query("
        SELECT r.codigo AS rol_codigo, p.codigo AS permiso_codigo
        FROM `rol_permisos` rp
        INNER JOIN `roles` r ON rp.rol_id = r.id
        INNER JOIN `permisos` p ON rp.permiso_id = p.id
    ");
    $matriz = [];
    while ($row = $rpStmt->fetch(PDO::FETCH_ASSOC)) {
        $matriz[$row['rol_codigo']][] = $row['permiso_codigo'];
    }

    echo json_encode([
        'success' => true,
        'roles' => $roles,
        'modulos' => $modulos,
        'permisos' => $permisos,
        'matriz_permisos' => $matriz
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
