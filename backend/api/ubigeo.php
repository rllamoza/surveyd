<?php
/**
 * API REST: Cascada UBIGEO Perú
 * OmniPoll - Spatial Data Intelligence Core
 */

require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/repository.php';

$action = $_GET['action'] ?? 'all';
$depCodigo = $_GET['dep'] ?? null;
$provCodigo = $_GET['prov'] ?? null;
$q = isset($_GET['q']) ? trim($_GET['q']) : null;

$pdo = Database::getConnection();

if ($pdo) {
    try {
        if ($action === 'departamentos') {
            $stmt = $pdo->query("SELECT codigo_ubigeo as codigo, nombre FROM departamentos ORDER BY nombre ASC");
            sendResponse($stmt->fetchAll());
        } elseif ($action === 'provincias' && $depCodigo) {
            $stmt = $pdo->prepare("SELECT p.codigo_ubigeo as codigo, p.nombre, d.codigo_ubigeo as dep_codigo 
                                   FROM provincias p 
                                   JOIN departamentos d ON p.departamento_id = d.id 
                                   WHERE d.codigo_ubigeo = :dep ORDER BY p.nombre ASC");
            $stmt->execute([':dep' => $depCodigo]);
            sendResponse($stmt->fetchAll());
        } elseif ($action === 'distritos' && $provCodigo) {
            $stmt = $pdo->prepare("SELECT dist.codigo_ubigeo as codigo, dist.nombre, prov.codigo_ubigeo as prov_codigo 
                                   FROM distritos dist 
                                   JOIN provincias prov ON dist.provincia_id = prov.id 
                                   WHERE prov.codigo_ubigeo = :prov ORDER BY dist.nombre ASC");
            $stmt->execute([':prov' => $provCodigo]);
            sendResponse($stmt->fetchAll());
        } elseif ($action === 'search' && $q) {
            $stmt = $pdo->prepare("SELECT dist.codigo_ubigeo as codigo, dist.nombre as distrito, prov.nombre as provincia, d.nombre as departamento 
                                   FROM distritos dist 
                                   JOIN provincias prov ON dist.provincia_id = prov.id 
                                   JOIN departamentos d ON prov.departamento_id = d.id 
                                   WHERE dist.nombre LIKE :q OR prov.nombre LIKE :q OR d.nombre LIKE :q OR dist.codigo_ubigeo LIKE :q 
                                   LIMIT 20");
            $stmt->execute([':q' => "%$q%"]);
            sendResponse($stmt->fetchAll());
        }
    } catch (PDOException $e) {
        error_log("DB error in ubigeo: " . $e->getMessage());
        // Fallback a repositorio si ocurre excepción en runtime
    }
}

// Fallback con DataRepository
$store = DataRepository::loadStore();
$departamentos = $store['departamentos'] ?? [];
$provincias = $store['provincias'] ?? [];
$distritos = $store['distritos'] ?? [];

if ($action === 'departamentos') {
    usort($departamentos, fn($a, $b) => strcmp($a['nombre'], $b['nombre']));
    sendResponse($departamentos);
}

if ($action === 'provincias') {
    if (!$depCodigo) sendResponse($provincias);
    $filtered = array_values(array_filter($provincias, fn($p) => $p['dep_codigo'] === $depCodigo));
    sendResponse($filtered);
}

if ($action === 'distritos') {
    if (!$provCodigo) sendResponse($distritos);
    $filtered = array_values(array_filter($distritos, fn($d) => $d['prov_codigo'] === $provCodigo));
    sendResponse($filtered);
}

if ($action === 'search' && $q) {
    $qLower = mb_strtolower($q);
    $results = [];
    foreach ($distritos as $d) {
        $provMatch = null;
        foreach ($provincias as $p) {
            if ($p['codigo'] === $d['prov_codigo']) {
                $provMatch = $p;
                break;
            }
        }
        $depMatch = null;
        if ($provMatch) {
            foreach ($departamentos as $dep) {
                if ($dep['codigo'] === $provMatch['dep_codigo']) {
                    $depMatch = $dep;
                    break;
                }
            }
        }

        $fullString = mb_strtolower($d['nombre'] . ' ' . ($provMatch['nombre'] ?? '') . ' ' . ($depMatch['nombre'] ?? '') . ' ' . $d['codigo']);
        if (str_contains($fullString, $qLower)) {
            $results[] = [
                'codigo' => $d['codigo'],
                'distrito' => $d['nombre'],
                'provincia' => $provMatch['nombre'] ?? '',
                'departamento' => $depMatch['nombre'] ?? ''
            ];
            if (count($results) >= 20) break;
        }
    }
    sendResponse($results);
}

// Por defecto retornar estructura completa agrupada
sendResponse([
    'departamentos' => $departamentos,
    'provincias'    => $provincias,
    'distritos'     => $distritos
]);
