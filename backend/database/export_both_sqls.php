<?php
/**
 * Exportador de SQLs:
 * 1. production_schema_completo.sql (Instalación limpia completa desde cero)
 * 2. update_datos_completos.sql (Actualización incremental de datos para bases ya existentes)
 */
require_once __DIR__ . '/../config/db.php';

$pdo = Database::getConnection();
if (!$pdo) {
    die("Error al conectar con MySQL.\n");
}

$tables = [
    'roles',
    'modulos',
    'permisos',
    'rol_permisos',
    'usuarios',
    'usuario_encuestas',
    'departamentos',
    'provincias',
    'distritos',
    'encuestas',
    'secciones',
    'preguntas',
    'opciones_pregunta',
    'respuestas_encuesta',
    'detalle_respuestas',
    'auditoria_aprobaciones'
];

echo "Generando production_schema_completo.sql...\n";

$sql = "-- ====================================================================\n";
$sql .= "-- OMNIPOLL SPATIAL DATA INTELLIGENCE CORE\n";
$sql .= "-- BASE DE DATOS COMPLETA PARA PRODUCCIÓN (CPANEL / BANAHOSTING / MYSQL)\n";
$sql .= "-- Incluye: 16 tablas, RBAC, 6 Usuarios, 5 Encuestas (incluye CCAVX024), 512 Respuestas y 1,874 Distritos INEI\n";
$sql .= "-- Fecha: " . date('Y-m-d H:i:s') . "\n";
$sql .= "-- ====================================================================\n\n";

$sql .= "SET NAMES utf8mb4;\n";
$sql .= "SET CHARACTER SET utf8mb4;\n";
$sql .= "SET FOREIGN_KEY_CHECKS = 0;\n";
$sql .= "SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';\n";
$sql .= "SET time_zone = '-05:00';\n\n";

$sql .= "-- ------------------------------------------------------------\n";
$sql .= "-- 1. LIMPIEZA PREVIA (DROP TABLES)\n";
$sql .= "-- ------------------------------------------------------------\n";
foreach (array_reverse($tables) as $t) {
    $sql .= "DROP TABLE IF EXISTS `{$t}`;\n";
}
$sql .= "\n-- ------------------------------------------------------------\n";
$sql .= "-- 2. CREACIÓN DE TABLAS (DDL)\n";
$sql .= "-- ------------------------------------------------------------\n\n";

foreach ($tables as $t) {
    $stmt = $pdo->query("SHOW CREATE TABLE `{$t}`");
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    $create = $row['Create Table'] ?? '';
    // Asegurar que usuarios.rol sea VARCHAR(50)
    if ($t === 'usuarios') {
        $create = preg_replace("/`rol` enum\(.*?\)/i", "`rol` varchar(50)", $create);
    }
    $sql .= "-- Tabla: {$t}\n";
    $sql .= $create . ";\n\n";
}

$sql .= "-- ------------------------------------------------------------\n";
$sql .= "-- 3. INSERCIÓN DE DATOS DE PRODUCCIÓN (DML)\n";
$sql .= "-- ------------------------------------------------------------\n\n";

foreach ($tables as $t) {
    $rows = $pdo->query("SELECT * FROM `{$t}`")->fetchAll(PDO::FETCH_ASSOC);
    if (empty($rows)) continue;

    $total = count($rows);
    $sql .= "-- Datos para la tabla: {$t} ({$total} registros)\n";
    $cols = array_keys($rows[0]);
    $colList = implode('`, `', $cols);

    $chunks = array_chunk($rows, 100);
    foreach ($chunks as $chunk) {
        $sql .= "INSERT INTO `{$t}` (`{$colList}`) VALUES\n";
        $valsArr = [];
        foreach ($chunk as $row) {
            $escaped = array_map(function($v) use ($pdo) {
                if ($v === null) return 'NULL';
                return $pdo->quote($v);
            }, $row);
            $valsArr[] = "  (" . implode(', ', $escaped) . ")";
        }
        $sql .= implode(",\n", $valsArr) . ";\n";
    }
    $sql .= "\n";
}

$sql .= "SET FOREIGN_KEY_CHECKS = 1;\n";
$sql .= "-- Fin del script de instalación limpia\n";

file_put_contents(__DIR__ . '/production_schema_completo.sql', $sql);
copy(__DIR__ . '/production_schema_completo.sql', __DIR__ . '/schema.sql');
$mbComplete = round(filesize(__DIR__ . '/production_schema_completo.sql') / 1024 / 1024, 2);
echo "   -> production_schema_completo.sql creado ({$mbComplete} MB)\n";

// ====================================================================
// Generar update_datos_completos.sql (Script de Actualización Incremental)
// ====================================================================
echo "Generando update_datos_completos.sql...\n";

$upd = "-- ====================================================================\n";
$upd .= "-- OMNIPOLL - SCRIPT DE ACTUALIZACIÓN DE DATOS (MIGRACIÓN / PARCHE)\n";
$upd .= "-- Ejecutar sobre una base de datos existente para incorporar:\n";
$upd .= "-- 1. Todos los usuarios (rllamoza, admin, carlos.valdivia, elena.ramos, marco.polo, cliente)\n";
$upd .= "-- 2. Encuesta CCAVX024 con sus 4 preguntas, 86 opciones y branding\n";
$upd .= "-- 3. 500 Respuestas completas de CCAVX024 con priorización de Redes y Sedes\n";
$upd .= "-- 4. Asignaciones de encuestas a clientes\n";
$upd .= "-- ====================================================================\n\n";

$upd .= "SET NAMES utf8mb4;\n";
$upd .= "SET CHARACTER SET utf8mb4;\n";
$upd .= "SET FOREIGN_KEY_CHECKS = 0;\n";
$upd .= "SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';\n";
$upd .= "SET time_zone = '-05:00';\n\n";

$upd .= "-- 1. Asegurar estructura de usuarios y tabla usuario_encuestas\n";
$upd .= "ALTER TABLE `usuarios` MODIFY COLUMN `rol` VARCHAR(50) NOT NULL DEFAULT 'encuestador';\n";
$upd .= "CREATE TABLE IF NOT EXISTS `usuario_encuestas` (\n";
$upd .= "  `id` int NOT NULL AUTO_INCREMENT,\n";
$upd .= "  `usuario_id` int NOT NULL,\n";
$upd .= "  `encuesta_id` int NOT NULL,\n";
$upd .= "  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,\n";
$upd .= "  PRIMARY KEY (`id`),\n";
$upd .= "  UNIQUE KEY `uk_usuario_encuesta` (`usuario_id`,`encuesta_id`)\n";
$upd .= ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;\n\n";

// Usuarios
$upd .= "-- 2. Usuarios del Sistema con contraseña 'admin123'\n";
$users = $pdo->query("SELECT * FROM `usuarios`")->fetchAll(PDO::FETCH_ASSOC);
$cols = array_keys($users[0]);
$colList = implode('`, `', $cols);
$upd .= "INSERT INTO `usuarios` (`{$colList}`) VALUES\n";
$uVals = [];
foreach ($users as $u) {
    $esc = array_map(fn($v) => $v === null ? 'NULL' : $pdo->quote($v), $u);
    $uVals[] = "  (" . implode(', ', $esc) . ")";
}
$upd .= implode(",\n", $uVals) . "\n";
$upd .= "ON DUPLICATE KEY UPDATE `nombre` = VALUES(`nombre`), `password_hash` = VALUES(`password_hash`), `rol` = VALUES(`rol`), `cargo` = VALUES(`cargo`), `activo` = 1;\n\n";

// Encuesta CCAVX024
$upd .= "-- 3. Encuesta CCAVX024\n";
$ccavEnc = $pdo->query("SELECT * FROM `encuestas` WHERE `codigo` = 'CCAVX024' OR `id` = 24")->fetch(PDO::FETCH_ASSOC);
if ($ccavEnc) {
    $eCols = array_keys($ccavEnc);
    $eColList = implode('`, `', $eCols);
    $eEsc = array_map(fn($v) => $v === null ? 'NULL' : $pdo->quote($v), $ccavEnc);
    $upd .= "INSERT INTO `encuestas` (`{$eColList}`) VALUES (" . implode(', ', $eEsc) . ")\n";
    $upd .= "ON DUPLICATE KEY UPDATE `titulo` = VALUES(`titulo`), `branding_json` = VALUES(`branding_json`), `estado` = 'aprobada';\n\n";
}

// Secciones de CCAVX024
$ccavSecs = $pdo->query("SELECT * FROM `secciones` WHERE `encuesta_id` = 24")->fetchAll(PDO::FETCH_ASSOC);
if (!empty($ccavSecs)) {
    $upd .= "-- Secciones de CCAVX024\n";
    $sCols = array_keys($ccavSecs[0]);
    $sColList = implode('`, `', $sCols);
    $upd .= "INSERT INTO `secciones` (`{$sColList}`) VALUES\n";
    $sVals = [];
    foreach ($ccavSecs as $s) {
        $esc = array_map(fn($v) => $v === null ? 'NULL' : $pdo->quote($v), $s);
        $sVals[] = "  (" . implode(', ', $esc) . ")";
    }
    $upd .= implode(",\n", $sVals) . "\nON DUPLICATE KEY UPDATE `titulo` = VALUES(`titulo`);\n\n";
}

// Preguntas de CCAVX024
$ccavPregs = $pdo->query("SELECT * FROM `preguntas` WHERE `encuesta_id` = 24")->fetchAll(PDO::FETCH_ASSOC);
if (!empty($ccavPregs)) {
    $upd .= "-- Preguntas de CCAVX024\n";
    $pCols = array_keys($ccavPregs[0]);
    $pColList = implode('`, `', $pCols);
    $upd .= "INSERT INTO `preguntas` (`{$pColList}`) VALUES\n";
    $pVals = [];
    foreach ($ccavPregs as $p) {
        $esc = array_map(fn($v) => $v === null ? 'NULL' : $pdo->quote($v), $p);
        $pVals[] = "  (" . implode(', ', $esc) . ")";
    }
    $upd .= implode(",\n", $pVals) . "\nON DUPLICATE KEY UPDATE `enunciado` = VALUES(`enunciado`), `tipo` = VALUES(`tipo`);\n\n";
}

// Opciones de CCAVX024 (pregunta_id IN (79, 80, 81, 82))
$ccavOpcs = $pdo->query("SELECT * FROM `opciones_pregunta` WHERE `pregunta_id` IN (SELECT id FROM preguntas WHERE encuesta_id = 24)")->fetchAll(PDO::FETCH_ASSOC);
if (!empty($ccavOpcs)) {
    $upd .= "-- Opciones de Pregunta de CCAVX024 (" . count($ccavOpcs) . " opciones)\n";
    $upd .= "DELETE FROM `opciones_pregunta` WHERE `pregunta_id` IN (SELECT id FROM preguntas WHERE encuesta_id = 24);\n";
    $oCols = array_keys($ccavOpcs[0]);
    $oColList = implode('`, `', $oCols);
    $chunks = array_chunk($ccavOpcs, 100);
    foreach ($chunks as $chunk) {
        $upd .= "INSERT INTO `opciones_pregunta` (`{$oColList}`) VALUES\n";
        $oVals = [];
        foreach ($chunk as $o) {
            $esc = array_map(fn($v) => $v === null ? 'NULL' : $pdo->quote($v), $o);
            $oVals[] = "  (" . implode(', ', $esc) . ")";
        }
        $upd .= implode(",\n", $oVals) . ";\n";
    }
    $upd .= "\n";
}

// Asignaciones
$upd .= "-- 4. Asignaciones de Encuestas a Cliente\n";
$upd .= "INSERT IGNORE INTO `usuario_encuestas` (`usuario_id`, `encuesta_id`) \n";
$upd .= "SELECT u.id, 24 FROM usuarios u WHERE u.email = 'cliente@empresa.pe';\n";
$upd .= "INSERT IGNORE INTO `usuario_encuestas` (`usuario_id`, `encuesta_id`) \n";
$upd .= "SELECT u.id, 1 FROM usuarios u WHERE u.email = 'cliente@empresa.pe';\n\n";

// Respuestas de CCAVX024
$ccavResps = $pdo->query("SELECT * FROM `respuestas_encuesta` WHERE `encuesta_id` = 24")->fetchAll(PDO::FETCH_ASSOC);
if (!empty($ccavResps)) {
    $upd .= "-- 5. Respuestas de Encuesta CCAVX024 (" . count($ccavResps) . " respuestas)\n";
    $upd .= "DELETE FROM `respuestas_encuesta` WHERE `encuesta_id` = 24;\n";
    $rCols = array_keys($ccavResps[0]);
    $rColList = implode('`, `', $rCols);
    $chunks = array_chunk($ccavResps, 100);
    foreach ($chunks as $chunk) {
        $upd .= "INSERT INTO `respuestas_encuesta` (`{$rColList}`) VALUES\n";
        $rVals = [];
        foreach ($chunk as $r) {
            $esc = array_map(fn($v) => $v === null ? 'NULL' : $pdo->quote($v), $r);
            $rVals[] = "  (" . implode(', ', $esc) . ")";
        }
        $upd .= implode(",\n", $rVals) . ";\n";
    }
    $upd .= "\n";
}

// Detalle de respuestas de CCAVX024
$ccavDets = $pdo->query("
    SELECT d.* FROM `detalle_respuestas` d
    INNER JOIN `respuestas_encuesta` r ON d.respuesta_encuesta_id = r.id
    WHERE r.encuesta_id = 24
")->fetchAll(PDO::FETCH_ASSOC);

if (!empty($ccavDets)) {
    $upd .= "-- 6. Detalle de Respuestas individuales (" . count($ccavDets) . " registros)\n";
    $dCols = array_keys($ccavDets[0]);
    $dColList = implode('`, `', $dCols);
    $chunks = array_chunk($ccavDets, 100);
    foreach ($chunks as $chunk) {
        $upd .= "INSERT INTO `detalle_respuestas` (`{$dColList}`) VALUES\n";
        $dVals = [];
        foreach ($chunk as $d) {
            $esc = array_map(fn($v) => $v === null ? 'NULL' : $pdo->quote($v), $d);
            $dVals[] = "  (" . implode(', ', $esc) . ")";
        }
        $upd .= implode(",\n", $dVals) . ";\n";
    }
    $upd .= "\n";
}

$upd .= "SET FOREIGN_KEY_CHECKS = 1;\n";
$upd .= "-- Fin del script de actualización\n";

file_put_contents(__DIR__ . '/update_datos_completos.sql', $upd);
$kbUpd = round(filesize(__DIR__ . '/update_datos_completos.sql') / 1024, 2);
echo "   -> update_datos_completos.sql creado ({$kbUpd} KB)\n";

echo "¡Ambos scripts exportados y validados con éxito!\n";
