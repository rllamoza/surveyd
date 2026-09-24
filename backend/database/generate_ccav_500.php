<?php
/**
 * Script de Generación de 500 Respuestas Realistas para Encuesta CCAVX024
 * Priorización solicitada:
 * - Sede Central: Prioriza Red Salas y Red Garcia
 * - Sede Lince: Prioriza Red Arias
 */

require_once __DIR__ . '/../config/db.php';

$pdo = Database::getConnection();
if (!$pdo) {
    die("Error al conectar con la base de datos MySQL.\n");
}

$encuestaId = 24; // CCAVX024
$preguntaSedesId = 79;
$preguntaRedId = 80;
$preguntaFrecId = 81;
$preguntaDistId = 82;

// Verificar que la encuesta existe
$stmt = $pdo->prepare("SELECT id, codigo, titulo FROM encuestas WHERE id = :id");
$stmt->execute([':id' => $encuestaId]);
$encuesta = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$encuesta) {
    die("Error: No se encontró la encuesta con ID $encuestaId.\n");
}

echo "Generando 500 respuestas para [{$encuesta['codigo']}] {$encuesta['titulo']}...\n";

// Mapeo de distritos y códigos UBIGEO reales
$distritosLima = [
    'miraflores' => ['nombre' => 'Miraflores', 'ubi' => '150122', 'dep' => 'Lima', 'prov' => 'Lima Metropolitana'],
    'san_isidro' => ['nombre' => 'San Isidro', 'ubi' => '150131', 'dep' => 'Lima', 'prov' => 'Lima Metropolitana'],
    'lince' => ['nombre' => 'Lince', 'ubi' => '150116', 'dep' => 'Lima', 'prov' => 'Lima Metropolitana'],
    'jesus_maria' => ['nombre' => 'Jesus Maria', 'ubi' => '150113', 'dep' => 'Lima', 'prov' => 'Lima Metropolitana'],
    'san_borja' => ['nombre' => 'San Borja', 'ubi' => '150130', 'dep' => 'Lima', 'prov' => 'Lima Metropolitana'],
    'surco' => ['nombre' => 'Santiago de Surco', 'ubi' => '150140', 'dep' => 'Lima', 'prov' => 'Lima Metropolitana'],
    'magdalena' => ['nombre' => 'Magdalena', 'ubi' => '150120', 'dep' => 'Lima', 'prov' => 'Lima Metropolitana'],
    'pueblo_libre' => ['nombre' => 'Pueblo Libre', 'ubi' => '150121', 'dep' => 'Lima', 'prov' => 'Lima Metropolitana'],
    'la_victoria' => ['nombre' => 'La Victoria', 'ubi' => '150115', 'dep' => 'Lima', 'prov' => 'Lima Metropolitana'],
    'los_olivos' => ['nombre' => 'Los Olivos', 'ubi' => '150117', 'dep' => 'Lima', 'prov' => 'Lima Metropolitana'],
    'chorrillos' => ['nombre' => 'Chorrillos', 'ubi' => '150108', 'dep' => 'Lima', 'prov' => 'Lima Metropolitana'],
    'barranco' => ['nombre' => 'Barranco', 'ubi' => '150104', 'dep' => 'Lima', 'prov' => 'Lima Metropolitana'],
    'cercado_de_lima' => ['nombre' => 'Cercado de Lima', 'ubi' => '150101', 'dep' => 'Lima', 'prov' => 'Lima Metropolitana'],
    'callao__bellavista' => ['nombre' => 'Bellavista', 'ubi' => '070102', 'dep' => 'Callao', 'prov' => 'Prov. Const. del Callao'],
    'bre__a' => ['nombre' => 'Breña', 'ubi' => '150105', 'dep' => 'Lima', 'prov' => 'Lima Metropolitana'],
    'san_miguel' => ['nombre' => 'San Miguel', 'ubi' => '150136', 'dep' => 'Lima', 'prov' => 'Lima Metropolitana']
];

$distKeys = array_keys($distritosLima);

// Redes secundarias para el resto del universo
$otrasRedes = [
    'cervantes', 'poire', 'asencios', 'de_la_cruz', 'neciosup', 'cumpa', 
    'iberico', 'washing', 'ramirez', 'bedri__ana', 'diaz', 'concha', 
    'salazar', 'durand', 'barba', 'rodriguez', 'murrugarra', 'montalvan'
];

$frecuencias = ['2_veces', '3_veces', '4_veces', 'otro_'];

$stmtInsertCab = $pdo->prepare("INSERT INTO respuestas_encuesta 
    (encuesta_id, codigo_sesion, departamento_nombre, provincia_nombre, distrito_nombre, 
     departamento_codigo, provincia_codigo, distrito_codigo, ubigeo_completo, 
     tiempo_llenado_segundos, satisfaccion, nps, ip_origen, created_at) 
    VALUES (:eid, :ses, :depn, :provn, :distn, :depc, :provc, :distc, :ubi, :tmp, NULL, NULL, :ip, :cat)");

$stmtInsertDet = $pdo->prepare("INSERT INTO detalle_respuestas 
    (respuesta_encuesta_id, pregunta_id, valor_texto, valor_numero, opciones_json) 
    VALUES (:rid, :pid, :vt, :vn, :opt)");

$pdo->beginTransaction();

$totalCreados = 0;
$countCentral = 0;
$countLince = 0;
$countSalas = 0;
$countGarcia = 0;
$countArias = 0;

$now = time();

for ($i = 1; $i <= 500; $i++) {
    // 1. Determinar sede (Prioridad Central ~55%, Lince ~30%, Central+Lince ~10%, Otras ~5%)
    $randSede = mt_rand(1, 100);
    $sedesElegidas = [];
    $redElegida = '';

    if ($randSede <= 55) {
        // Sede Central Exclusiva
        $sedesElegidas = ['central'];
        $countCentral++;

        // Prioridad Central: Salas (~46%) y Garcia (~42%), resto (~12%)
        $rRed = mt_rand(1, 100);
        if ($rRed <= 46) {
            $redElegida = 'salas';
            $countSalas++;
        } elseif ($rRed <= 88) {
            $redElegida = 'garcia';
            $countGarcia++;
        } else {
            $redElegida = $otrasRedes[array_rand($otrasRedes)];
        }
    } elseif ($randSede <= 85) {
        // Sede Lince Exclusiva
        $sedesElegidas = ['lince'];
        $countLince++;

        // Prioridad Lince: Arias (~78%), resto (~22%)
        $rRed = mt_rand(1, 100);
        if ($rRed <= 78) {
            $redElegida = 'arias';
            $countArias++;
        } else {
            $redElegida = $otrasRedes[array_rand($otrasRedes)];
        }
    } elseif ($randSede <= 95) {
        // Asiste a Central y Lince (Opción Múltiple)
        $sedesElegidas = ['central', 'lince'];
        $countCentral++;
        $countLince++;

        // Mezcla de las tres redes priorizadas
        $rRed = mt_rand(1, 100);
        if ($rRed <= 40) {
            $redElegida = 'arias';
            $countArias++;
        } elseif ($rRed <= 70) {
            $redElegida = 'salas';
            $countSalas++;
        } else {
            $redElegida = 'garcia';
            $countGarcia++;
        }
    } else {
        // Otras sedes (Miraflores, Surco, etc.)
        $sedesSecundarias = ['miraflores', 'surco', 'los_olivos', 'san_juan_de_miraflores', 'youtube_en_linea'];
        $sedesElegidas = [$sedesSecundarias[array_rand($sedesSecundarias)]];
        $redElegida = $otrasRedes[array_rand($otrasRedes)];
    }

    // 2. Frecuencia de asistencia
    $rFrec = mt_rand(1, 100);
    if ($rFrec <= 20) {
        $frecElegida = '2_veces';
    } elseif ($rFrec <= 65) {
        $frecElegida = '3_veces';
    } elseif ($rFrec <= 92) {
        $frecElegida = '4_veces';
    } else {
        $frecElegida = 'otro_';
    }

    // 3. Distrito de residencia (Priorizando distritos cercanos a sedes)
    if (in_array('lince', $sedesElegidas)) {
        $distritosPref = ['lince', 'jesus_maria', 'san_isidro', 'bre__a', 'la_victoria', 'pueblo_libre', 'cercado_de_lima'];
        $distKey = (mt_rand(1, 100) <= 75) ? $distritosPref[array_rand($distritosPref)] : $distKeys[array_rand($distKeys)];
    } else {
        $distKey = $distKeys[array_rand($distKeys)];
    }

    $distInfo = $distritosLima[$distKey];
    $depNombre = $distInfo['dep'];
    $provNombre = $distInfo['prov'];
    $distNombre = $distInfo['nombre'];
    $ubigeoCod = $distInfo['ubi'];
    $depCod = substr($ubigeoCod, 0, 2);
    $provCod = substr($ubigeoCod, 0, 4);

    // 4. Parámetros de auditoría (Tiempo y Fecha)
    $tiempoSeg = mt_rand(35, 175); // 35 a 175 segundos
    $diasAtras = mt_rand(0, 10);
    $horasAtras = mt_rand(1, 23);
    $minAtras = mt_rand(0, 59);
    $segAtras = mt_rand(0, 59);
    $timestamp = date('Y-m-d H:i:s', $now - ($diasAtras * 86400 + $horasAtras * 3600 + $minAtras * 60 + $segAtras));

    $codigoSesion = 'PUB-' . strtoupper(substr(md5($i . $timestamp . 'CCAV'), 0, 8)) . '-' . sprintf('%04d', $i);
    $ip = '192.168.1.' . mt_rand(10, 240);

    // Insertar Cabecera en respuestas_encuesta
    $stmtInsertCab->execute([
        ':eid' => $encuestaId,
        ':ses' => $codigoSesion,
        ':depn' => $depNombre,
        ':provn' => $provNombre,
        ':distn' => $distNombre,
        ':depc' => $depCod,
        ':provc' => $provCod,
        ':distc' => $ubigeoCod,
        ':ubi' => $ubigeoCod,
        ':tmp' => $tiempoSeg,
        ':ip' => $ip,
        ':cat' => $timestamp
    ]);

    $respuestaId = (int)$pdo->lastInsertId();

    // Insertar P1: Sedes (opcion_multiple)
    $stmtInsertDet->execute([
        ':rid' => $respuestaId,
        ':pid' => $preguntaSedesId,
        ':vt' => implode('; ', array_map('ucfirst', $sedesElegidas)),
        ':vn' => null,
        ':opt' => json_encode($sedesElegidas, JSON_UNESCAPED_UNICODE)
    ]);

    // Insertar P2: Red (opcion_unica)
    $stmtInsertDet->execute([
        ':rid' => $respuestaId,
        ':pid' => $preguntaRedId,
        ':vt' => ucfirst($redElegida),
        ':vn' => null,
        ':opt' => json_encode([$redElegida], JSON_UNESCAPED_UNICODE)
    ]);

    // Insertar P3: Frecuencia (opcion_unica)
    $stmtInsertDet->execute([
        ':rid' => $respuestaId,
        ':pid' => $preguntaFrecId,
        ':vt' => str_replace('_', ' ', $frecElegida),
        ':vn' => null,
        ':opt' => json_encode([$frecElegida], JSON_UNESCAPED_UNICODE)
    ]);

    // Insertar P4: Distrito (ubigeo_cascada)
    $textoDistrito = "$depNombre > $provNombre > $distNombre ($ubigeoCod)";
    $stmtInsertDet->execute([
        ':rid' => $respuestaId,
        ':pid' => $preguntaDistId,
        ':vt' => $textoDistrito,
        ':vn' => null,
        ':opt' => json_encode(['dep' => $depCod, 'prov' => $provCod, 'dist' => $ubigeoCod, 'key' => $distKey], JSON_UNESCAPED_UNICODE)
    ]);

    $totalCreados++;
}

$pdo->commit();

echo "\n¡Éxito! Se insertaron correctamente {$totalCreados} respuestas en MySQL.\n";
echo "--- Resumen de Datos Generados ---\n";
echo "- Menciones Sede Central: {$countCentral}\n";
echo "- Menciones Sede Lince:   {$countLince}\n";
echo "- Red Salas:             {$countSalas} (" . round(($countSalas/$totalCreados)*100, 1) . "%)\n";
echo "- Red Garcia:            {$countGarcia} (" . round(($countGarcia/$totalCreados)*100, 1) . "%)\n";
echo "- Red Arias:             {$countArias} (" . round(($countArias/$totalCreados)*100, 1) . "%)\n";
echo "- Otras Redes:           " . ($totalCreados - $countSalas - $countGarcia - $countArias) . " (" . round((($totalCreados - $countSalas - $countGarcia - $countArias)/$totalCreados)*100, 1) . "%)\n";
