<?php
/**
 * Script de Migración: Rol Cliente y Asignación de Encuestas por Usuario
 * OmniPoll - Spatial Data Intelligence Core
 */

require_once __DIR__ . '/../config/db.php';

header('Content-Type: application/json; charset=utf-8');

try {
    $pdo = Database::getConnection();
    if (!$pdo) {
        throw new Exception("No se pudo conectar a la base de datos MySQL local");
    }

    // 1. Crear tabla de asignaciones de encuestas a usuarios
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `usuario_encuestas` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `usuario_id` INT NOT NULL,
            `encuesta_id` INT NOT NULL,
            `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY `uk_usuario_encuesta` (`usuario_id`, `encuesta_id`),
            FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE,
            FOREIGN KEY (`encuesta_id`) REFERENCES `encuestas`(`id`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");

    // 2. Insertar Rol 'cliente'
    $stmtRole = $pdo->prepare("
        INSERT INTO `roles` (`codigo`, `nombre`, `descripcion`, `badge_color`)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE `nombre` = VALUES(`nombre`), `descripcion` = VALUES(`descripcion`), `badge_color` = VALUES(`badge_color`)
    ");
    $stmtRole->execute([
        'cliente',
        'Cliente / Visualizador de Reportes',
        'Visualización restringida exclusiva de tableros analíticos y métricas únicamente de las encuestas asignadas a su cuenta',
        'primary'
    ]);

    $clienteRoleId = (int)$pdo->query("SELECT id FROM roles WHERE codigo = 'cliente'")->fetchColumn();

    // 3. Asignar permisos exclusivos de Bento Analytics al rol 'cliente'
    // Permisos: bento_analytics.ver y bento_analytics.exportar_csv
    $permStmt = $pdo->query("SELECT id, codigo FROM permisos WHERE codigo IN ('bento_analytics.ver', 'bento_analytics.exportar_csv')");
    $permIds = $permStmt->fetchAll(PDO::FETCH_ASSOC);

    $stmtRP = $pdo->prepare("INSERT IGNORE INTO `rol_permisos` (`rol_id`, `permiso_id`) VALUES (?, ?)");
    foreach ($permIds as $p) {
        $stmtRP->execute([$clienteRoleId, $p['id']]);
    }

    // 4. Crear o Actualizar Usuario Cliente Demo: cliente@empresa.pe con pass Ra020976
    $passHash = password_hash('Ra020976', PASSWORD_BCRYPT);
    $stmtUser = $pdo->prepare("
        INSERT INTO `usuarios` (`nombre`, `email`, `password_hash`, `rol`, `rol_id`, `cargo`, `avatar_url`, `activo`)
        VALUES (?, ?, ?, 'cliente', ?, ?, ?, 1)
        ON DUPLICATE KEY UPDATE
            `password_hash` = VALUES(`password_hash`),
            `rol` = 'cliente',
            `rol_id` = VALUES(`rol_id`),
            `cargo` = VALUES(`cargo`),
            `activo` = 1
    ");
    $stmtUser->execute([
        'Lic. Roberto Mendoza',
        'cliente@empresa.pe',
        $passHash,
        $clienteRoleId,
        'Director de Operaciones (Cliente Corporativo)',
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop'
    ]);

    $clienteUserId = (int)$pdo->query("SELECT id FROM usuarios WHERE email = 'cliente@empresa.pe'")->fetchColumn();

    // 5. Asignar encuestas de prueba al Cliente: Encuesta 18 (CCAV) y Encuesta 1 (CENSO) si existen
    $encuestasDisponibles = $pdo->query("SELECT id, codigo, titulo FROM encuestas ORDER BY id DESC LIMIT 5")->fetchAll(PDO::FETCH_ASSOC);
    $stmtAsignar = $pdo->prepare("INSERT IGNORE INTO `usuario_encuestas` (`usuario_id`, `encuesta_id`) VALUES (?, ?)");

    $asignadas = [];
    foreach ($encuestasDisponibles as $enc) {
        // Asignar al menos la 18 y la 1
        if ($enc['id'] == 18 || $enc['id'] == 1 || count($asignadas) < 2) {
            $stmtAsignar->execute([$clienteUserId, $enc['id']]);
            $asignadas[] = [
                'id' => $enc['id'],
                'codigo' => $enc['codigo'],
                'titulo' => $enc['titulo']
            ];
        }
    }

    echo json_encode([
        'success' => true,
        'message' => 'Migración de rol cliente y tabla de asignaciones completada con éxito',
        'rol_creado' => 'cliente',
        'usuario_cliente' => [
            'id' => $clienteUserId,
            'nombre' => 'Lic. Roberto Mendoza',
            'email' => 'cliente@empresa.pe',
            'pass' => 'Ra020976',
            'rol' => 'cliente',
            'encuestas_asignadas' => $asignadas
        ]
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
}
