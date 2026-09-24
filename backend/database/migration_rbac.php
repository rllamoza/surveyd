<?php
/**
 * Script de Migración: Roles, Permisos Granulares y Usuario Administrativo
 * OmniPoll - Spatial Data Intelligence Core
 */

require_once __DIR__ . '/../config/db.php';

header('Content-Type: application/json; charset=utf-8');

try {
    $pdo = Database::getConnection();
    if (!$pdo) {
        throw new Exception("No se pudo conectar a la base de datos MySQL local");
    }


    // 1. Crear tabla de roles
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `roles` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `codigo` VARCHAR(50) NOT NULL UNIQUE,
            `nombre` VARCHAR(100) NOT NULL,
            `descripcion` TEXT NULL,
            `badge_color` VARCHAR(30) NOT NULL DEFAULT 'primary',
            `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");

    // 2. Crear tabla de módulos
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `modulos` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `codigo` VARCHAR(50) NOT NULL UNIQUE,
            `nombre` VARCHAR(100) NOT NULL,
            `icono` VARCHAR(50) NOT NULL DEFAULT 'folder',
            `orden` INT NOT NULL DEFAULT 1,
            `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");

    // 3. Crear tabla de permisos granulares
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `permisos` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `modulo_id` INT NOT NULL,
            `codigo` VARCHAR(80) NOT NULL UNIQUE,
            `nombre` VARCHAR(120) NOT NULL,
            `descripcion` TEXT NULL,
            `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (`modulo_id`) REFERENCES `modulos`(`id`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");

    // 4. Crear tabla intermedia rol_permisos
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `rol_permisos` (
            `rol_id` INT NOT NULL,
            `permiso_id` INT NOT NULL,
            PRIMARY KEY (`rol_id`, `permiso_id`),
            FOREIGN KEY (`rol_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE,
            FOREIGN KEY (`permiso_id`) REFERENCES `permisos`(`id`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");

    $pdo->exec("ALTER TABLE `usuarios` MODIFY COLUMN `rol` VARCHAR(50) NOT NULL DEFAULT 'encuestador';");

    $cols = $pdo->query("SHOW COLUMNS FROM `usuarios` LIKE 'rol_id'")->fetchAll();
    if (empty($cols)) {
        $pdo->exec("ALTER TABLE `usuarios` ADD COLUMN `rol_id` INT NULL AFTER `rol`;");
        $pdo->exec("ALTER TABLE `usuarios` ADD CONSTRAINT `fk_usuario_rol` FOREIGN KEY (`rol_id`) REFERENCES `roles`(`id`) ON DELETE SET NULL;");
    }

    $colsToken = $pdo->query("SHOW COLUMNS FROM `usuarios` LIKE 'auth_token'")->fetchAll();
    if (empty($colsToken)) {
        $pdo->exec("ALTER TABLE `usuarios` ADD COLUMN `auth_token` VARCHAR(255) NULL AFTER `password_hash`;");
    }

    // 6. Insertar Roles Principales
    $rolesData = [
        ['superadmin', 'SuperAdmin Root', 'Control absoluto e irrestricto de toda la infraestructura, auditoría, usuarios y diseño', 'primary'],
        ['admin', 'Administrador Metodológico', 'Gestión de instrumentos, diseño de encuestas, importación y analítica', 'secondary'],
        ['auditor', 'Auditor INEI', 'Supervisión técnica, emisión de resoluciones oficiales de aprobación y dictamen metodológico', 'warning'],
        ['encuestador', 'Encuestador de Campo', 'Operación de encuestas en vivo con geolocalización UBIGEO y captura de datos', 'success']
    ];

    $stmtRole = $pdo->prepare("
        INSERT INTO `roles` (`codigo`, `nombre`, `descripcion`, `badge_color`)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE `nombre` = VALUES(`nombre`), `descripcion` = VALUES(`descripcion`), `badge_color` = VALUES(`badge_color`)
    ");
    foreach ($rolesData as $r) {
        $stmtRole->execute($r);
    }

    // 7. Insertar Módulos
    $modulosData = [
        ['encuestas_activas', 'Encuestas Activas (UBIGEO)', 'public', 1],
        ['constructor_excel', 'Constructor & Excel', 'dataset', 2],
        ['bento_analytics', 'Bento Analytics', 'space_dashboard', 3],
        ['aprobacion_admin', 'Aprobación SuperAdmin', 'verified_user', 4],
        ['gestion_usuarios', 'Gestión de Usuarios & Accesos', 'manage_accounts', 5]
    ];

    $stmtMod = $pdo->prepare("
        INSERT INTO `modulos` (`codigo`, `nombre`, `icono`, `orden`)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE `nombre` = VALUES(`nombre`), `icono` = VALUES(`icono`), `orden` = VALUES(`orden`)
    ");
    foreach ($modulosData as $m) {
        $stmtMod->execute($m);
    }

    // Obtener IDs de módulos
    $modRows = $pdo->query("SELECT codigo, id FROM modulos")->fetchAll(PDO::FETCH_KEY_PAIR);

    // 8. Insertar Permisos Granulares por Módulo y Función
    $permisosData = [
        // Módulo Encuestas Activas
        [$modRows['encuestas_activas'], 'encuestas_activas.ver', 'Ver Instrumento y Preguntas', 'Permite visualizar la encuesta activa y sus secciones'],
        [$modRows['encuestas_activas'], 'encuestas_activas.responder', 'Responder y Enviar Encuesta', 'Permite completar preguntas y transmitir al servidor'],
        [$modRows['encuestas_activas'], 'encuestas_activas.ubigeo', 'Consultar Cascada UBIGEO', 'Acceso a la cascada de 25 departamentos, 196 provincias y 1874 distritos'],

        // Módulo Constructor & Excel
        [$modRows['constructor_excel'], 'constructor_excel.ver', 'Ver Constructor de Encuestas', 'Acceso al entorno de autoría de cuestionarios'],
        [$modRows['constructor_excel'], 'constructor_excel.crear', 'Crear y Modificar Preguntas', 'Permite diseñar preguntas dinámicas y lógica de salto'],
        [$modRows['constructor_excel'], 'constructor_excel.importar_excel', 'Importar Masivamente .XLSX/.CSV', 'Permite procesar matrices de preguntas desde hojas de cálculo'],
        [$modRows['constructor_excel'], 'constructor_excel.enviar_aprobacion', 'Enviar a Aprobación Oficial', 'Habilita el envío a revisión técnica por SuperAdmin'],

        // Módulo Bento Analytics
        [$modRows['bento_analytics'], 'bento_analytics.ver', 'Ver Tableros y Telemetría', 'Permite ver KPIs, concentraciones regionales y NPS'],
        [$modRows['bento_analytics'], 'bento_analytics.exportar_csv', 'Exportar Reporte CSV', 'Permite descargar la data en bruto para análisis'],

        // Módulo Aprobación SuperAdmin
        [$modRows['aprobacion_admin'], 'aprobacion_admin.ver', 'Ver Panel de Auditoría', 'Acceso a la lista de encuestas pendientes y aprobadas'],
        [$modRows['aprobacion_admin'], 'aprobacion_admin.aprobar', 'Emitir Resolución Oficial (Aprobar)', 'Firma oficial y emisión de norma técnica'],
        [$modRows['aprobacion_admin'], 'aprobacion_admin.rechazar', 'Observar o Rechazar Encuesta', 'Registro de observaciones y motivos técnicos'],
        [$modRows['aprobacion_admin'], 'aprobacion_admin.bitacora', 'Ver Bitácora Criptográfica SHA-256', 'Inspección de logs de auditoría'],

        // Módulo Gestión de Usuarios
        [$modRows['gestion_usuarios'], 'gestion_usuarios.ver', 'Listar Usuarios y Roles', 'Permite ver el directorio de operadores del sistema'],
        [$modRows['gestion_usuarios'], 'gestion_usuarios.crear', 'Crear Cuentas de Usuario', 'Permite registrar nuevos miembros y operadores'],
        [$modRows['gestion_usuarios'], 'gestion_usuarios.editar', 'Modificar Perfiles y Cargos', 'Actualización de datos institucionales'],
        [$modRows['gestion_usuarios'], 'gestion_usuarios.roles', 'Asignar y Modificar Roles', 'Asignación de privilegios de acceso'],
        [$modRows['gestion_usuarios'], 'gestion_usuarios.desactivar', 'Desactivar o Reactivar Cuentas', 'Control de estado activo/inactivo']
    ];

    $stmtPerm = $pdo->prepare("
        INSERT INTO `permisos` (`modulo_id`, `codigo`, `nombre`, `descripcion`)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE `nombre` = VALUES(`nombre`), `descripcion` = VALUES(`descripcion`)
    ");
    foreach ($permisosData as $p) {
        $stmtPerm->execute($p);
    }

    // 9. Asignar Permisos a Roles en `rol_permisos`
    $pdo->exec("DELETE FROM `rol_permisos`");

    $roleRows = $pdo->query("SELECT codigo, id FROM roles")->fetchAll(PDO::FETCH_KEY_PAIR);
    $permRows = $pdo->query("SELECT codigo, id FROM permisos")->fetchAll(PDO::FETCH_KEY_PAIR);

    $stmtRP = $pdo->prepare("INSERT INTO `rol_permisos` (`rol_id`, `permiso_id`) VALUES (?, ?)");

    // SUPERADMIN: TODOS los permisos
    $superadminId = $roleRows['superadmin'];
    foreach ($permRows as $pCod => $pId) {
        $stmtRP->execute([$superadminId, $pId]);
    }

    // ADMINISTRADOR
    $adminId = $roleRows['admin'];
    $adminPerms = [
        'encuestas_activas.ver', 'encuestas_activas.responder', 'encuestas_activas.ubigeo',
        'constructor_excel.ver', 'constructor_excel.crear', 'constructor_excel.importar_excel', 'constructor_excel.enviar_aprobacion',
        'bento_analytics.ver', 'bento_analytics.exportar_csv',
        'aprobacion_admin.ver', 'aprobacion_admin.bitacora',
        'gestion_usuarios.ver', 'gestion_usuarios.crear', 'gestion_usuarios.editar'
    ];
    foreach ($adminPerms as $pCod) {
        if (isset($permRows[$pCod])) {
            $stmtRP->execute([$adminId, $permRows[$pCod]]);
        }
    }

    // AUDITOR INEI
    $auditorId = $roleRows['auditor'];
    $auditorPerms = [
        'encuestas_activas.ver', 'encuestas_activas.ubigeo',
        'bento_analytics.ver', 'bento_analytics.exportar_csv',
        'aprobacion_admin.ver', 'aprobacion_admin.aprobar', 'aprobacion_admin.rechazar', 'aprobacion_admin.bitacora'
    ];
    foreach ($auditorPerms as $pCod) {
        if (isset($permRows[$pCod])) {
            $stmtRP->execute([$auditorId, $permRows[$pCod]]);
        }
    }

    // ENCUESTADOR DE CAMPO
    $encuestadorId = $roleRows['encuestador'];
    $encuestadorPerms = [
        'encuestas_activas.ver', 'encuestas_activas.responder', 'encuestas_activas.ubigeo'
    ];
    foreach ($encuestadorPerms as $pCod) {
        if (isset($permRows[$pCod])) {
            $stmtRP->execute([$encuestadorId, $permRows[$pCod]]);
        }
    }

    // 10. INSERTAR Y ACTUALIZAR USUARIOS CON PASS Ra020976
    $defaultPassHash = password_hash('Ra020976', PASSWORD_BCRYPT);

    // Usuario Administrativo Solicitado: rllamoza@gmail.com
    $stmtUser = $pdo->prepare("
        INSERT INTO `usuarios` (`nombre`, `email`, `password_hash`, `rol`, `rol_id`, `cargo`, `avatar_url`, `activo`)
        VALUES (?, ?, ?, 'superadmin', ?, ?, ?, 1)
        ON DUPLICATE KEY UPDATE
            `nombre` = VALUES(`nombre`),
            `password_hash` = VALUES(`password_hash`),
            `rol` = 'superadmin',
            `rol_id` = VALUES(`rol_id`),
            `cargo` = VALUES(`cargo`),
            `activo` = 1
    ");
    $stmtUser->execute([
        'Ing. Raul Llamoza',
        'rllamoza@gmail.com',
        $defaultPassHash,
        $superadminId,
        'Director General & Administrador del Sistema',
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&h=120&fit=crop'
    ]);

    // Usuario Existente 1: carlos.valdivia@omnipoll.pe
    $stmtValdivia = $pdo->prepare("
        INSERT INTO `usuarios` (`nombre`, `email`, `password_hash`, `rol`, `rol_id`, `cargo`, `avatar_url`, `activo`)
        VALUES (?, ?, ?, 'superadmin', ?, ?, ?, 1)
        ON DUPLICATE KEY UPDATE
            `password_hash` = VALUES(`password_hash`),
            `rol_id` = VALUES(`rol_id`)
    ");
    $stmtValdivia->execute([
        'Ing. Carlos Valdivia',
        'carlos.valdivia@omnipoll.pe',
        $defaultPassHash,
        $superadminId,
        'Director de Operaciones & Datos',
        'diseno/assets/modern_high_tech_professional_avatar_portrait_of_a.png'
    ]);

    // Usuario Existente 2: elena.ramos@omnipoll.pe (Auditor INEI)
    $stmtElena = $pdo->prepare("
        INSERT INTO `usuarios` (`nombre`, `email`, `password_hash`, `rol`, `rol_id`, `cargo`, `avatar_url`, `activo`)
        VALUES (?, ?, ?, 'auditor', ?, ?, NULL, 1)
        ON DUPLICATE KEY UPDATE
            `password_hash` = VALUES(`password_hash`),
            `rol` = 'auditor',
            `rol_id` = VALUES(`rol_id`)
    ");
    $stmtElena->execute([
        'Dra. Elena Ramos',
        'elena.ramos@omnipoll.pe',
        $defaultPassHash,
        $auditorId,
        'Auditora Principal Metodológica'
    ]);

    // Usuario Existente 3: marco.polo@omnipoll.pe (Encuestador)
    $stmtMarco = $pdo->prepare("
        INSERT INTO `usuarios` (`nombre`, `email`, `password_hash`, `rol`, `rol_id`, `cargo`, `avatar_url`, `activo`)
        VALUES (?, ?, ?, 'encuestador', ?, ?, NULL, 1)
        ON DUPLICATE KEY UPDATE
            `password_hash` = VALUES(`password_hash`),
            `rol` = 'encuestador',
            `rol_id` = VALUES(`rol_id`)
    ");
    $stmtMarco->execute([
        'Lic. Marco Polo',
        'marco.polo@omnipoll.pe',
        $defaultPassHash,
        $encuestadorId,
        'Encuestador de Campo Lima Centro'
    ]);


    echo json_encode([
        'success' => true,
        'message' => 'Migración de autenticación, roles, permisos y usuario rllamoza@gmail.com completada con éxito',
        'usuarios_registrados' => [
            ['email' => 'rllamoza@gmail.com', 'rol' => 'SuperAdmin', 'pass' => 'Ra020976'],
            ['email' => 'carlos.valdivia@omnipoll.pe', 'rol' => 'SuperAdmin', 'pass' => 'Ra020976'],
            ['email' => 'elena.ramos@omnipoll.pe', 'rol' => 'Auditor INEI', 'pass' => 'Ra020976'],
            ['email' => 'marco.polo@omnipoll.pe', 'rol' => 'Encuestador', 'pass' => 'Ra020976']
        ],
        'total_modulos' => count($modulosData),
        'total_permisos' => count($permisosData)
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
}
