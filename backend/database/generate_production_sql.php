<?php
/**
 * Generador de script SQL completo de producción para OmniPoll
 */
require_once __DIR__ . '/../config/db.php';

$pdo = Database::getConnection();
if (!$pdo) {
    die("Error al conectar con la base de datos MySQL.\n");
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

$sql = "-- ====================================================================\n";
$sql .= "-- OMNIPOLL SPATIAL DATA INTELLIGENCE CORE\n";
$sql .= "-- BASE DE DATOS COMPLETA PARA PRODUCCIÓN (CPANEL / BANAHOSTING / MYSQL)\n";
$sql .= "-- Incluye: Esquema completo (16 tablas), RBAC, Usuarios Semilla, UBIGEO Oficial INEI (1,874 Distritos)\n";
$sql .= "-- Fecha de Generación: " . date('Y-m-d H:i:s') . "\n";
$sql .= "-- ====================================================================\n\n";

$sql .= "SET NAMES utf8mb4;\n";
$sql .= "SET CHARACTER SET utf8mb4;\n";
$sql .= "SET FOREIGN_KEY_CHECKS = 0;\n";
$sql .= "SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';\n";
$sql .= "SET time_zone = '-05:00';\n\n";

// Dropear tablas existentes en orden inverso
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
    $sql .= "-- Tabla: {$t}\n";
    $sql .= $create . ";\n\n";
}

$sql .= "-- ------------------------------------------------------------\n";
$sql .= "-- 3. INSERCIÓN DE DATOS DE PRODUCCIÓN (DML)\n";
$sql .= "-- ------------------------------------------------------------\n\n";

foreach ($tables as $t) {
    $rows = $pdo->query("SELECT * FROM `{$t}`")->fetchAll(PDO::FETCH_ASSOC);
    if (empty($rows)) {
        continue;
    }

    $total = count($rows);
    $sql .= "-- Datos para la tabla: {$t} ({$total} registros)\n";
    $cols = array_keys($rows[0]);
    $colList = implode('`, `', $cols);

    // Agrupar en bloques de 100 para evitar consultas excesivamente largas
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

$sql .= "-- ------------------------------------------------------------\n";
$sql .= "-- 4. RESTABLECER RESTRICCIONES DE INTEGRIDAD REFERENCIAL\n";
$sql .= "-- ------------------------------------------------------------\n";
$sql .= "SET FOREIGN_KEY_CHECKS = 1;\n";
$sql .= "-- Fin del script de producción\n";

$targetFile = __DIR__ . '/production_schema_completo.sql';
file_put_contents($targetFile, $sql);

$sizeKb = round(filesize($targetFile) / 1024, 2);
echo "Archivo generado exitosamente: production_schema_completo.sql ({$sizeKb} KB)\n";
