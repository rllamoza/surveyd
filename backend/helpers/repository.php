<?php
/**
 * Repositorio Unificado de Datos (MySQL PDO con Fallback JSON)
 * OmniPoll - Spatial Data Intelligence Core
 */

require_once __DIR__ . '/../config/db.php';

class DataRepository {
    private static string $jsonFile = __DIR__ . '/../database/data_store.json';

    /**
     * Obtener datos semilla predeterminados si no existe data_store.json
     */
    private static function getInitialSeed(): array {
        return [
            'encuestas' => [
                [
                    'id' => 1,
                    'codigo' => 'CENSO-PE-2025-Q1',
                    'titulo' => 'Censo Nacional de Conectividad & Servicios Digitales 2025',
                    'descripcion' => 'Instrumento de recolección georreferenciado para el diseño de infraestructura de telecomunicaciones e inclusión digital.',
                    'norma_tecnica' => 'DS-024-INEI-PE',
                    'categoria' => 'Censo & Conectividad',
                    'version' => 'v3.4-PRO',
                    'estado' => 'aprobada',
                    'tiempo_estimado_min' => 4,
                    'total_pasos' => 4,
                    'resolucion_aprobacion' => 'RES-DIR-088-2025/MTC',
                    'motivo_rechazo' => null,
                    'created_at' => '2026-09-20 14:30:00'
                ],
                [
                    'id' => 2,
                    'codigo' => 'POLL-TECH-2025-02',
                    'titulo' => 'Adopción de Tecnologías Cloud e Inteligencia Artificial en Entidades Públicas',
                    'descripcion' => 'Medición de madurez digital, gobierno de datos y ciberseguridad en el sector estatal peruano.',
                    'norma_tecnica' => 'PCM-SGTD-004-2025',
                    'categoria' => 'Innovación Pública',
                    'version' => 'v2.1',
                    'estado' => 'pendiente',
                    'tiempo_estimado_min' => 6,
                    'total_pasos' => 5,
                    'resolucion_aprobacion' => null,
                    'motivo_rechazo' => null,
                    'created_at' => '2026-09-21 11:20:00'
                ],
                [
                    'id' => 3,
                    'codigo' => 'SAT-SALUD-2025-Q2',
                    'titulo' => 'Evaluación de Calidad de Atención en Establecimientos de Salud Red Sur',
                    'descripcion' => 'Sondeo de percepción ciudadana en centros de salud del Minsa y EsSalud en regiones del sur.',
                    'norma_tecnica' => 'NTS-142-MINSA/DGAIN',
                    'categoria' => 'Salud Pública',
                    'version' => 'v1.0',
                    'estado' => 'aprobada',
                    'tiempo_estimado_min' => 3,
                    'total_pasos' => 3,
                    'resolucion_aprobacion' => 'RES-MINSA-451-2025',
                    'motivo_rechazo' => null,
                    'created_at' => '2026-09-18 09:15:00'
                ],
                [
                    'id' => 4,
                    'codigo' => 'FINTECH-PE-2025-Q1',
                    'titulo' => 'Inclusión Financiera y Uso de Billeteras Digitales en Comunidades Rurales',
                    'descripcion' => 'Estudio sobre adopción de pagos digitales (Yape, Plin) y brecha de cajeros automáticos.',
                    'norma_tecnica' => 'SBS-CIRC-B-2240',
                    'categoria' => 'Inclusión Financiera',
                    'version' => 'v1.2',
                    'estado' => 'rechazada',
                    'tiempo_estimado_min' => 7,
                    'total_pasos' => 5,
                    'resolucion_aprobacion' => null,
                    'motivo_rechazo' => 'Requiere ampliar el bloque de preguntas de ciberseguridad y consentimiento explícito conforme a la Ley 29733 de Protección de Datos Personales.',
                    'created_at' => '2026-09-22 09:15:00'
                ]
            ],
            'departamentos' => [
                ['codigo' => '01', 'nombre' => 'Amazonas'],
                ['codigo' => '02', 'nombre' => 'Áncash'],
                ['codigo' => '03', 'nombre' => 'Apurímac'],
                ['codigo' => '04', 'nombre' => 'Arequipa'],
                ['codigo' => '05', 'nombre' => 'Ayacucho'],
                ['codigo' => '06', 'nombre' => 'Cajamarca'],
                ['codigo' => '07', 'nombre' => 'Callao'],
                ['codigo' => '08', 'nombre' => 'Cusco'],
                ['codigo' => '09', 'nombre' => 'Huancavelica'],
                ['codigo' => '10', 'nombre' => 'Huánuco'],
                ['codigo' => '11', 'nombre' => 'Ica'],
                ['codigo' => '12', 'nombre' => 'Junín'],
                ['codigo' => '13', 'nombre' => 'La Libertad'],
                ['codigo' => '14', 'nombre' => 'Lambayeque'],
                ['codigo' => '15', 'nombre' => 'Lima'],
                ['codigo' => '16', 'nombre' => 'Loreto'],
                ['codigo' => '17', 'nombre' => 'Madre de Dios'],
                ['codigo' => '18', 'nombre' => 'Moquegua'],
                ['codigo' => '19', 'nombre' => 'Pasco'],
                ['codigo' => '20', 'nombre' => 'Piura'],
                ['codigo' => '21', 'nombre' => 'Puno'],
                ['codigo' => '22', 'nombre' => 'San Martín'],
                ['codigo' => '23', 'nombre' => 'Tacna'],
                ['codigo' => '24', 'nombre' => 'Tumbes'],
                ['codigo' => '25', 'nombre' => 'Ucayali']
            ],
            'provincias' => [
                // Lima
                ['codigo' => '1501', 'dep_codigo' => '15', 'nombre' => 'Lima Metropolitana'],
                ['codigo' => '1502', 'dep_codigo' => '15', 'nombre' => 'Barranca'],
                ['codigo' => '1505', 'dep_codigo' => '15', 'nombre' => 'Cañete'],
                ['codigo' => '1506', 'dep_codigo' => '15', 'nombre' => 'Huaral'],
                ['codigo' => '1507', 'dep_codigo' => '15', 'nombre' => 'Huarochirí'],
                // Callao
                ['codigo' => '0701', 'dep_codigo' => '07', 'nombre' => 'Prov. Const. del Callao'],
                // Arequipa
                ['codigo' => '0401', 'dep_codigo' => '04', 'nombre' => 'Arequipa'],
                ['codigo' => '0402', 'dep_codigo' => '04', 'nombre' => 'Camaná'],
                ['codigo' => '0405', 'dep_codigo' => '04', 'nombre' => 'Caylloma'],
                // Cusco
                ['codigo' => '0801', 'dep_codigo' => '08', 'nombre' => 'Cusco'],
                ['codigo' => '0813', 'dep_codigo' => '08', 'nombre' => 'Urubamba'],
                // La Libertad
                ['codigo' => '1301', 'dep_codigo' => '13', 'nombre' => 'Trujillo'],
                // Piura
                ['codigo' => '2001', 'dep_codigo' => '20', 'nombre' => 'Piura'],
                // Junín
                ['codigo' => '1201', 'dep_codigo' => '12', 'nombre' => 'Huancayo'],
                // Lambayeque
                ['codigo' => '1401', 'dep_codigo' => '14', 'nombre' => 'Chiclayo'],
                // Cajamarca
                ['codigo' => '0601', 'dep_codigo' => '06', 'nombre' => 'Cajamarca'],
                // Puno
                ['codigo' => '2101', 'dep_codigo' => '21', 'nombre' => 'Puno'],
                // Ica
                ['codigo' => '1101', 'dep_codigo' => '11', 'nombre' => 'Ica'],
                // Loreto
                ['codigo' => '1601', 'dep_codigo' => '16', 'nombre' => 'Maynas (Iquitos)'],
                // Ucayali
                ['codigo' => '2501', 'dep_codigo' => '25', 'nombre' => 'Coronel Portillo (Pucallpa)']
            ],
            'distritos' => [
                // Lima Metropolitana
                ['codigo' => '150101', 'prov_codigo' => '1501', 'nombre' => 'Lima (Cercado)'],
                ['codigo' => '150122', 'prov_codigo' => '1501', 'nombre' => 'Miraflores'],
                ['codigo' => '150131', 'prov_codigo' => '1501', 'nombre' => 'San Isidro'],
                ['codigo' => '150140', 'prov_codigo' => '1501', 'nombre' => 'Santiago de Surco'],
                ['codigo' => '150132', 'prov_codigo' => '1501', 'nombre' => 'San Juan de Lurigancho'],
                ['codigo' => '150130', 'prov_codigo' => '1501', 'nombre' => 'San Borja'],
                ['codigo' => '150103', 'prov_codigo' => '1501', 'nombre' => 'Ate'],
                ['codigo' => '150116', 'prov_codigo' => '1501', 'nombre' => 'La Molina'],
                ['codigo' => '150117', 'prov_codigo' => '1501', 'nombre' => 'La Victoria'],
                ['codigo' => '150118', 'prov_codigo' => '1501', 'nombre' => 'Lince'],
                ['codigo' => '150120', 'prov_codigo' => '1501', 'nombre' => 'Magdalena del Mar'],
                ['codigo' => '150113', 'prov_codigo' => '1501', 'nombre' => 'Jesús María'],
                ['codigo' => '150133', 'prov_codigo' => '1501', 'nombre' => 'San Juan de Miraflores'],
                ['codigo' => '150135', 'prov_codigo' => '1501', 'nombre' => 'San Miguel'],
                ['codigo' => '150142', 'prov_codigo' => '1501', 'nombre' => 'Villa El Salvador'],
                // Callao
                ['codigo' => '070101', 'prov_codigo' => '0701', 'nombre' => 'Callao Cercado'],
                ['codigo' => '070102', 'prov_codigo' => '0701', 'nombre' => 'Bellavista'],
                ['codigo' => '070106', 'prov_codigo' => '0701', 'nombre' => 'Ventanilla'],
                ['codigo' => '070107', 'prov_codigo' => '0701', 'nombre' => 'Mi Perú'],
                // Arequipa
                ['codigo' => '040101', 'prov_codigo' => '0401', 'nombre' => 'Arequipa'],
                ['codigo' => '040103', 'prov_codigo' => '0401', 'nombre' => 'Cayma'],
                ['codigo' => '040104', 'prov_codigo' => '0401', 'nombre' => 'Cerro Colorado'],
                ['codigo' => '040126', 'prov_codigo' => '0401', 'nombre' => 'Yanahuara'],
                // Cusco
                ['codigo' => '080101', 'prov_codigo' => '0801', 'nombre' => 'Cusco'],
                ['codigo' => '080106', 'prov_codigo' => '0801', 'nombre' => 'Santiago'],
                ['codigo' => '080108', 'prov_codigo' => '0801', 'nombre' => 'Wanchaq'],
                // Trujillo
                ['codigo' => '130101', 'prov_codigo' => '1301', 'nombre' => 'Trujillo'],
                ['codigo' => '130107', 'prov_codigo' => '1301', 'nombre' => 'Víctor Larco Herrera'],
                // Piura
                ['codigo' => '200101', 'prov_codigo' => '2001', 'nombre' => 'Piura'],
                ['codigo' => '200104', 'prov_codigo' => '2001', 'nombre' => 'Castilla'],
                // Huancayo
                ['codigo' => '120101', 'prov_codigo' => '1201', 'nombre' => 'Huancayo'],
                ['codigo' => '120114', 'prov_codigo' => '1201', 'nombre' => 'El Tambo']
            ],
            'respuestas' => [
                [
                    'id' => 1,
                    'encuesta_id' => 1,
                    'codigo_sesion' => 'SES-2025-001',
                    'departamento' => 'Lima',
                    'provincia' => 'Lima Metropolitana',
                    'distrito' => 'Miraflores',
                    'ubigeo_completo' => '150122',
                    'tiempo_llenado_segundos' => 185,
                    'satisfaccion' => 5,
                    'nps' => 9,
                    'fecha' => '2026-09-23 10:14:22'
                ],
                [
                    'id' => 2,
                    'encuesta_id' => 1,
                    'codigo_sesion' => 'SES-2025-002',
                    'departamento' => 'Lima',
                    'provincia' => 'Lima Metropolitana',
                    'distrito' => 'San Isidro',
                    'ubigeo_completo' => '150131',
                    'tiempo_llenado_segundos' => 142,
                    'satisfaccion' => 4,
                    'nps' => 8,
                    'fecha' => '2026-09-23 10:30:10'
                ],
                [
                    'id' => 3,
                    'encuesta_id' => 1,
                    'codigo_sesion' => 'SES-2025-003',
                    'departamento' => 'Arequipa',
                    'provincia' => 'Arequipa',
                    'distrito' => 'Arequipa',
                    'ubigeo_completo' => '040101',
                    'tiempo_llenado_segundos' => 210,
                    'satisfaccion' => 4,
                    'nps' => 7,
                    'fecha' => '2026-09-23 11:05:40'
                ],
                [
                    'id' => 4,
                    'encuesta_id' => 1,
                    'codigo_sesion' => 'SES-2025-004',
                    'departamento' => 'Cusco',
                    'provincia' => 'Cusco',
                    'distrito' => 'Cusco',
                    'ubigeo_completo' => '080101',
                    'tiempo_llenado_segundos' => 195,
                    'satisfaccion' => 5,
                    'nps' => 10,
                    'fecha' => '2026-09-23 11:22:15'
                ],
                [
                    'id' => 5,
                    'encuesta_id' => 1,
                    'codigo_sesion' => 'SES-2025-005',
                    'departamento' => 'La Libertad',
                    'provincia' => 'Trujillo',
                    'distrito' => 'Trujillo',
                    'ubigeo_completo' => '130101',
                    'tiempo_llenado_segundos' => 160,
                    'satisfaccion' => 3,
                    'nps' => 6,
                    'fecha' => '2026-09-23 11:45:00'
                ],
                [
                    'id' => 6,
                    'encuesta_id' => 1,
                    'codigo_sesion' => 'SES-2025-006',
                    'departamento' => 'Callao',
                    'provincia' => 'Prov. Const. del Callao',
                    'distrito' => 'Bellavista',
                    'ubigeo_completo' => '070102',
                    'tiempo_llenado_segundos' => 178,
                    'satisfaccion' => 4,
                    'nps' => 8,
                    'fecha' => '2026-09-23 12:02:30'
                ],
                [
                    'id' => 7,
                    'encuesta_id' => 1,
                    'codigo_sesion' => 'SES-2025-007',
                    'departamento' => 'Piura',
                    'provincia' => 'Piura',
                    'distrito' => 'Piura',
                    'ubigeo_completo' => '200101',
                    'tiempo_llenado_segundos' => 225,
                    'satisfaccion' => 4,
                    'nps' => 8,
                    'fecha' => '2026-09-23 12:15:45'
                ],
                [
                    'id' => 8,
                    'encuesta_id' => 1,
                    'codigo_sesion' => 'SES-2025-008',
                    'departamento' => 'Lima',
                    'provincia' => 'Lima Metropolitana',
                    'distrito' => 'Santiago de Surco',
                    'ubigeo_completo' => '150140',
                    'tiempo_llenado_segundos' => 130,
                    'satisfaccion' => 5,
                    'nps' => 9,
                    'fecha' => '2026-09-23 12:28:10'
                ]
            ],
            'auditoria' => [
                [
                    'id' => 1,
                    'encuesta_id' => 1,
                    'accion' => 'aprobada',
                    'usuario' => 'Ing. Carlos Valdivia',
                    'resolucion' => 'RES-DIR-088-2025/MTC',
                    'comentario' => 'Estructura metodológica validada conforme al estándar geoespacial INEI. Publicación autorizada para despliegue en campo.',
                    'fecha' => '2026-09-20 14:30:00'
                ],
                [
                    'id' => 2,
                    'encuesta_id' => 4,
                    'accion' => 'rechazada',
                    'usuario' => 'Ing. Carlos Valdivia',
                    'resolucion' => null,
                    'comentario' => 'Falta incluir consentimiento informado explícito según Ley 29733 de Protección de Datos y bloque de preguntas de ciberseguridad.',
                    'fecha' => '2026-09-22 09:15:00'
                ]
            ]
        ];
    }

    /**
     * Leer el almacén de datos (JSON)
     */
    public static function loadStore(): array {
        if (!file_exists(self::$jsonFile)) {
            $initial = self::getInitialSeed();
            file_put_contents(self::$jsonFile, json_encode($initial, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
            return $initial;
        }

        $content = file_get_contents(self::$jsonFile);
        $data = json_decode($content, true);
        return is_array($data) ? $data : self::getInitialSeed();
    }

    /**
     * Guardar datos en almacén JSON
     */
    public static function saveStore(array $data): bool {
        return (bool)file_put_contents(self::$jsonFile, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    }
}
