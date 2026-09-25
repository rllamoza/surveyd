<?php
/**
 * Script para restaurar usuarios completos y la encuesta CCAVX024 con sus 500 respuestas
 */
require_once __DIR__ . '/../config/db.php';

$pdo = Database::getConnection();
if (!$pdo) {
    die("Error al conectar con MySQL.\n");
}

// Asegurar que rol sea VARCHAR(50) para permitir cliente, auditor, etc.
$pdo->exec("ALTER TABLE `usuarios` MODIFY COLUMN `rol` VARCHAR(50) NOT NULL DEFAULT 'encuestador';");

echo "1. Restaurando Usuarios Completos...\n";

$passAdmin123 = password_hash('admin123', PASSWORD_BCRYPT);

$users = [
    [
        'nombre' => 'Raúl Llamoza',
        'email' => 'rllamoza@gmail.com',
        'password_hash' => $passAdmin123,
        'rol' => 'superadmin',
        'cargo' => 'Fundador & Director General',
        'avatar_url' => 'diseno/assets/modern_high_tech_professional_avatar_portrait_of_a.png'
    ],
    [
        'nombre' => 'Administrador OmniPoll',
        'email' => 'admin@omnipoll.pe',
        'password_hash' => $passAdmin123,
        'rol' => 'superadmin',
        'cargo' => 'SuperAdministrador de Sistemas',
        'avatar_url' => 'diseno/assets/modern_high_tech_professional_avatar_portrait_of_a.png'
    ],
    [
        'nombre' => 'Ing. Carlos Valdivia',
        'email' => 'carlos.valdivia@omnipoll.pe',
        'password_hash' => $passAdmin123,
        'rol' => 'superadmin',
        'cargo' => 'Director de Operaciones & Datos',
        'avatar_url' => 'diseno/assets/modern_high_tech_professional_avatar_portrait_of_a.png'
    ],
    [
        'nombre' => 'Dra. Elena Ramos',
        'email' => 'elena.ramos@omnipoll.pe',
        'password_hash' => $passAdmin123,
        'rol' => 'auditor',
        'cargo' => 'Especialista en Muestreo Geoespacial (Auditor INEI)',
        'avatar_url' => null
    ],
    [
        'nombre' => 'Lic. Marco Polo',
        'email' => 'marco.polo@omnipoll.pe',
        'password_hash' => $passAdmin123,
        'rol' => 'encuestador',
        'cargo' => 'Coordinador de Campo Lima Centro',
        'avatar_url' => null
    ],
    [
        'nombre' => 'Lic. Roberto Mendoza',
        'email' => 'cliente@empresa.pe',
        'password_hash' => $passAdmin123,
        'rol' => 'cliente',
        'cargo' => 'Director de Operaciones (Cliente Corporativo)',
        'avatar_url' => 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop'
    ]
];

$stmtUser = $pdo->prepare("
    INSERT INTO `usuarios` (`nombre`, `email`, `password_hash`, `rol`, `cargo`, `avatar_url`, `activo`)
    VALUES (:nom, :ema, :pwd, :rol, :car, :ava, 1)
    ON DUPLICATE KEY UPDATE 
        `nombre` = VALUES(`nombre`),
        `password_hash` = VALUES(`password_hash`),
        `rol` = VALUES(`rol`),
        `cargo` = VALUES(`cargo`),
        `avatar_url` = VALUES(`avatar_url`),
        `activo` = 1
");

foreach ($users as $u) {
    $stmtUser->execute([
        ':nom' => $u['nombre'],
        ':ema' => $u['email'],
        ':pwd' => $u['password_hash'],
        ':rol' => $u['rol'],
        ':car' => $u['cargo'],
        ':ava' => $u['avatar_url']
    ]);
}
echo "   -> Usuarios actualizados correctamente.\n";

echo "2. Creando Encuesta CCAVX024...\n";
// Verificar si CCAVX024 ya existe
$stmtCheckEnc = $pdo->prepare("SELECT id FROM encuestas WHERE codigo = 'CCAVX024' OR id = 24");
$stmtCheckEnc->execute();
$ccavId = $stmtCheckEnc->fetchColumn();

$brandingJson = json_encode([
    'primary_color' => '#0ea5e9',
    'secondary_color' => '#6366f1',
    'font_family' => 'Outfit',
    'logo_url' => 'assets/logo-symbol.svg',
    'accent_color' => '#10b981',
    'survey_title' => 'Encuesta Oficial CCAV 2026'
], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

if (!$ccavId) {
    $stmtInsEnc = $pdo->prepare("
        INSERT INTO `encuestas` 
        (`id`, `codigo`, `titulo`, `descripcion`, `norma_tecnica`, `categoria`, `version`, `estado`, `tiempo_estimado_min`, `total_pasos`, `creador_id`, `resolucion_aprobacion`, `branding_json`, `created_at`)
        VALUES 
        (24, 'CCAVX024', 'CCAV', 'Encuesta oficial de asistencia a sedes, pertenencia a redes de comunidad y distribución distrital.', 'CCAV-DIR-2026', 'Comunidad & Sedes', 'v2.0-PRO', 'aprobada', 3, 4, 1, 'RES-CCAV-2026-001', :branding, '2026-09-24 10:00:00')
    ");
    $stmtInsEnc->execute([':branding' => $brandingJson]);
    $ccavId = 24;
} else {
    $pdo->prepare("UPDATE `encuestas` SET `branding_json` = :branding, `estado` = 'aprobada', `titulo` = 'CCAV' WHERE `id` = :id")->execute([
        ':branding' => $brandingJson,
        ':id' => $ccavId
    ]);
}
echo "   -> Encuesta CCAVX024 (ID: $ccavId) confirmada.\n";

// Crear sección única
$stmtSec = $pdo->prepare("SELECT id FROM secciones WHERE encuesta_id = :eid LIMIT 1");
$stmtSec->execute([':eid' => $ccavId]);
$secId = $stmtSec->fetchColumn();
if (!$secId) {
    $stmtInsSec = $pdo->prepare("INSERT INTO secciones (encuesta_id, numero_orden, titulo, descripcion) VALUES (:eid, 1, 'Sección General', 'Formulario Principal')");
    $stmtInsSec->execute([':eid' => $ccavId]);
    $secId = (int)$pdo->lastInsertId();
}

// 4 Preguntas
$preguntasData = [
    [
        'id' => 79,
        'orden' => 1,
        'tipo' => 'opcion_multiple',
        'enunciado' => '¿A qué sedes de la Iglesia asistes?',
        'ayuda' => 'Puede seleccionar más de una',
        'config' => json_encode(['min_opciones' => 1]),
        'opciones' => [
            ['central', 'Central'],
            ['lince', 'Lince'],
            ['miraflores', 'Miraflores'],
            ['los_olivos', 'Los Olivos'],
            ['san_juan_de_miraflores', 'San Juan de Miraflores'],
            ['surco', 'Surco'],
            ['villa_maria_del_triunfo', 'Villa Maria del Triunfo'],
            ['san_juan_de_lurigancho', 'San Juan de Lurigancho'],
            ['chosica', 'Chosica'],
            ['villa_el_salvador', 'Villa el Salvador'],
            ['youtube_en_linea', 'Youtube en linea']
        ]
    ],
    [
        'id' => 80,
        'orden' => 2,
        'tipo' => 'opcion_unica',
        'enunciado' => '¿A que red perteneces?',
        'ayuda' => 'Selecciona la red pastoral principal',
        'config' => json_encode([]),
        'opciones' => [
            ['cervantes', 'Cervantes'],
            ['garcia', 'Garcia'],
            ['salas', 'Salas'],
            ['poire', 'Poire'],
            ['asencios', 'Asencios'],
            ['de_la_cruz', 'De la Cruz'],
            ['neciosup', 'Neciosup'],
            ['cumpa', 'Cumpa'],
            ['iberico', 'Iberico'],
            ['washing', 'Washing'],
            ['ramirez', 'Ramirez'],
            ['bedri__ana', 'Bedriñana'],
            ['diaz', 'Diaz'],
            ['concha', 'Concha'],
            ['salazar', 'Salazar'],
            ['durand', 'Durand'],
            ['barba', 'Barba'],
            ['rodriguez', 'Rodriguez'],
            ['murrugarra', 'Murrugarra'],
            ['mantilla', 'Mantilla'],
            ['dayana', 'Dayana'],
            ['e_barcena', 'E Barcena'],
            ['v_barcena', 'V Barcena'],
            ['montalvan', 'Montalvan'],
            ['navarrete', 'Navarrete'],
            ['vega', 'Vega'],
            ['bravo', 'Bravo'],
            ['montoya', 'Montoya'],
            ['gonzales', 'Gonzales'],
            ['castro', 'Castro'],
            ['diego_garcia', 'Diego Garcia'],
            ['arias', 'Arias'],
            ['bendezu', 'Bendezu'],
            ['pellny', 'Pellny']
        ]
    ],
    [
        'id' => 81,
        'orden' => 3,
        'tipo' => 'opcion_unica',
        'enunciado' => '¿Cuantas veces asisto el fin de semana en el mes?',
        'ayuda' => 'Frecuencia promedio de asistencia',
        'config' => json_encode([]),
        'opciones' => [
            ['2_veces', '2 veces'],
            ['3_veces', '3 veces'],
            ['4_veces', '4 veces'],
            ['otro_', 'Otro:']
        ]
    ],
    [
        'id' => 82,
        'orden' => 4,
        'tipo' => 'ubigeo_cascada',
        'enunciado' => '¿En qué distrito vives?',
        'ayuda' => 'Ubicación de residencia en Lima y Callao',
        'config' => json_encode(['pais_fijo' => 'Perú']),
        'opciones' => [
            ['ancon', 'Ancon'],
            ['ate', 'Ate'],
            ['barranco', 'Barranco'],
            ['bre__a', 'Breña'],
            ['callao__bellavista', 'Callao  Bellavista'],
            ['carmen_de_la_legua', 'Carmen de la Legua'],
            ['la_perla', 'La Perla'],
            ['la_punta', 'La Punta'],
            ['mi_peru', 'Mi Peru'],
            ['ventanilla', 'Ventanilla'],
            ['carabayllo', 'Carabayllo'],
            ['cercado_de_lima', 'Cercado de Lima'],
            ['chaclacayo', 'Chaclacayo'],
            ['chorrillos', 'Chorrillos'],
            ['cieneguilla', 'Cieneguilla'],
            ['comas', 'Comas'],
            ['el_agustino', 'El Agustino'],
            ['independencia', 'Independencia'],
            ['jesus_maria', 'Jesus Maria'],
            ['la_molina', 'La Molina'],
            ['la_victoria', 'La Victoria'],
            ['lince', 'Lince'],
            ['los_olivos', 'Los Olivos'],
            ['chosica', 'Chosica'],
            ['lurin', 'Lurin'],
            ['magdalena', 'Magdalena'],
            ['miraflores', 'Miraflores'],
            ['pachacamac', 'Pachacamac'],
            ['pucusana', 'Pucusana'],
            ['pueblo_libre', 'Pueblo Libre'],
            ['puente_piedra', 'Puente Piedra'],
            ['punta_hermosa', 'Punta Hermosa'],
            ['punta_negra', 'Punta Negra'],
            ['rimac', 'Rimac'],
            ['san_bartolo', 'San Bartolo'],
            ['san_borja', 'San Borja'],
            ['san_isidro', 'San Isidro']
        ]
    ]
];

echo "3. Insertando Preguntas y Alternativas...\n";
foreach ($preguntasData as $pData) {
    // Insertar pregunta con ID fijo si es posible
    $stmtPreg = $pdo->prepare("
        INSERT INTO `preguntas` (`id`, `encuesta_id`, `seccion_id`, `numero_orden`, `tipo`, `enunciado`, `ayuda`, `es_requerida`, `configuracion_json`)
        VALUES (:id, :eid, :sec, :ord, :tip, :enu, :ayu, 1, :cfg)
        ON DUPLICATE KEY UPDATE
            `enunciado` = VALUES(`enunciado`),
            `tipo` = VALUES(`tipo`),
            `ayuda` = VALUES(`ayuda`),
            `numero_orden` = VALUES(`numero_orden`),
            `configuracion_json` = VALUES(`configuracion_json`)
    ");
    $stmtPreg->execute([
        ':id' => $pData['id'],
        ':eid' => $ccavId,
        ':sec' => $secId,
        ':ord' => $pData['orden'],
        ':tip' => $pData['tipo'],
        ':enu' => $pData['enunciado'],
        ':ayu' => $pData['ayuda'],
        ':cfg' => $pData['config']
    ]);

    // Opciones
    $pdo->prepare("DELETE FROM opciones_pregunta WHERE pregunta_id = ?")->execute([$pData['id']]);
    $stmtOpc = $pdo->prepare("INSERT INTO opciones_pregunta (pregunta_id, numero_orden, valor, etiqueta) VALUES (?, ?, ?, ?)");
    $numOpc = 1;
    foreach ($pData['opciones'] as $opc) {
        $stmtOpc->execute([$pData['id'], $numOpc++, $opc[0], $opc[1]]);
    }
}
echo "   -> 4 Preguntas y 86 Opciones registradas con éxito.\n";

// Asignar al cliente
$clienteId = $pdo->query("SELECT id FROM usuarios WHERE email = 'cliente@empresa.pe'")->fetchColumn();
if ($clienteId) {
    $pdo->prepare("INSERT IGNORE INTO `usuario_encuestas` (`usuario_id`, `encuesta_id`) VALUES (?, ?), (?, ?)")
        ->execute([$clienteId, $ccavId, $clienteId, 1]);
    echo "   -> Encuesta CCAVX024 y Censo asignadas al cliente Roberto Mendoza.\n";
}

echo "4. Ejecutando Generador de 500 Respuestas...\n";
require_once __DIR__ . '/generate_ccav_500.php';

echo "\n¡Todo el ecosistema de encuestas y usuarios ha sido restaurado al 100%!\n";
