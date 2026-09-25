<?php
/**
 * SurveyD (OmniPoll) - Script de Instalación y Migración Automatizada para Producción
 * Inicializa base de datos, esquema DDL, catálogo UBIGEO y usuarios administradores
 */

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/config/db.php';

$isCli = (php_sapi_name() === 'cli');

function outputMsg($msg, $isSuccess = true, $data = null) {
    global $isCli;
    $res = [
        'success' => $isSuccess,
        'message' => $msg,
        'timestamp' => date('c'),
        'data' => $data
    ];
    if ($isCli) {
        $icon = $isSuccess ? "[OK]" : "[ERROR]";
        echo "$icon $msg\n";
        if ($data) echo json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n";
    } else {
        echo json_encode($res, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    }
}

// 1. Ejecutar autoSetup de la base de datos
$setupResult = Database::autoSetup();
if (!$setupResult['success']) {
    outputMsg("Fallo al inicializar base de datos: " . ($setupResult['error'] ?? 'Error desconocido'), false);
    exit(1);
}

outputMsg("Paso 1: Esquema base y tablas DDL inicializadas correctamente.");

// 2. Conectar a la base de datos
$pdo = Database::getConnection();
if (!$pdo) {
    outputMsg("No se pudo obtener conexión PDO a MySQL para el catálogo UBIGEO.", false);
    exit(1);
}

// 3. Verificar si el catálogo UBIGEO está cargado
try {
    $countDistritos = (int)$pdo->query("SELECT COUNT(*) FROM distritos")->fetchColumn();
    if ($countDistritos < 1800) {
        $ubigeoFile = __DIR__ . '/database/ubigeo_completo.sql';
        if (file_exists($ubigeoFile)) {
            $sqlUbigeo = file_get_contents($ubigeoFile);
            $pdo->exec($sqlUbigeo);
            outputMsg("Paso 2: Catálogo oficial INEI (1,874 distritos) importado con éxito.");
        } else {
            outputMsg("Aviso: No se encontró database/ubigeo_completo.sql.", false);
        }
    } else {
        outputMsg("Paso 2: Catálogo UBIGEO ya se encontraba presente ($countDistritos distritos).");
    }

    // 4. Estadísticas finales de producción
    $totalEncuestas = (int)$pdo->query("SELECT COUNT(*) FROM encuestas")->fetchColumn();
    $totalUsuarios = (int)$pdo->query("SELECT COUNT(*) FROM usuarios")->fetchColumn();
    $totalDistritos = (int)$pdo->query("SELECT COUNT(*) FROM distritos")->fetchColumn();

    $stats = [
        'sistema' => 'SurveyD (OmniPoll Spatial Core 3.0)',
        'estado' => 'Listo para Producción',
        'encuestas_activas' => $totalEncuestas,
        'usuarios_registrados' => $totalUsuarios,
        'distritos_inei' => $totalDistritos,
        'url_admin' => 'frontend/index.html',
        'url_publica' => 'frontend/encuesta.html?id=CODIGO'
    ];

    outputMsg("¡Instalación completada exitosamente! El sistema está listo para operar.", true, $stats);
} catch (PDOException $e) {
    outputMsg("Error durante la verificación final: " . $e->getMessage(), false);
    exit(1);
}
