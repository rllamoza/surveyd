<?php
require_once __DIR__ . '/config/db.php';

$pdo = Database::getConnection();
if (!$pdo) {
    echo "Error: No se pudo conectar a MySQL\n";
    exit(1);
}

$sqlFile = __DIR__ . '/database/ubigeo_completo.sql';
if (!file_exists($sqlFile)) {
    echo "Error: ubigeo_completo.sql no existe\n";
    exit(1);
}

echo "Importando UBIGEO oficial completo a MySQL...\n";
$sql = file_get_contents($sqlFile);

try {
    $pdo->exec($sql);
    echo "¡Importación completada con éxito!\n";

    $deps = $pdo->query("SELECT COUNT(*) FROM departamentos")->fetchColumn();
    $provs = $pdo->query("SELECT COUNT(*) FROM provincias")->fetchColumn();
    $dists = $pdo->query("SELECT COUNT(*) FROM distritos")->fetchColumn();
    echo "Registros activos en MySQL: $deps Departamentos, $provs Provincias, $dists Distritos.\n";
} catch (PDOException $e) {
    echo "Error importando SQL: " . $e->getMessage() . "\n";
}
