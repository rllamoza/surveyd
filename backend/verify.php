<?php
require_once __DIR__ . '/config/db.php';

$pdo = Database::getConnection();
if (!$pdo) {
    echo "ERROR: No hay conexión a MySQL" . PHP_EOL;
    exit(1);
}

echo "=== CONEXIÓN A MYSQL EXITOSA ===" . PHP_EOL;

$stmt = $pdo->query("SELECT id, codigo, titulo, categoria, estado, tiempo_estimado_min, 
                     (SELECT COUNT(*) FROM preguntas p WHERE p.encuesta_id = encuestas.id) as preguntas,
                     (SELECT COUNT(*) FROM respuestas_encuesta r WHERE r.encuesta_id = encuestas.id) as respuestas 
                     FROM encuestas ORDER BY id ASC");
$encuestas = $stmt->fetchAll();

echo "Total de encuestas en MySQL: " . count($encuestas) . PHP_EOL;
foreach ($encuestas as $e) {
    echo sprintf(" [%d] %s | %s | Estado: %s | Preguntas: %d | Respuestas: %d\n", 
        $e['id'], $e['codigo'], $e['titulo'], strtoupper($e['estado']), $e['preguntas'], $e['respuestas']);
}

$deps = $pdo->query("SELECT COUNT(*) FROM departamentos")->fetchColumn();
$provs = $pdo->query("SELECT COUNT(*) FROM provincias")->fetchColumn();
$dists = $pdo->query("SELECT COUNT(*) FROM distritos")->fetchColumn();
echo sprintf("UBIGEO Registrado: %d Departamentos, %d Provincias, %d Distritos\n", $deps, $provs, $dists);
