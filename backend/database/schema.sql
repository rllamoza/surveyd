-- ============================================================
-- BASE DE DATOS OMNIPOLL - SPATIAL DATA INTELLIGENCE CORE
-- Plataforma Integral de Encuestas Dinámicas con UBIGEO Cascada
-- ============================================================

CREATE DATABASE IF NOT EXISTS `app_encuestas` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `app_encuestas`;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS `auditoria_aprobaciones`;
DROP TABLE IF EXISTS `detalle_respuestas`;
DROP TABLE IF EXISTS `respuestas_encuesta`;
DROP TABLE IF EXISTS `opciones_pregunta`;
DROP TABLE IF EXISTS `preguntas`;
DROP TABLE IF EXISTS `secciones`;
DROP TABLE IF EXISTS `encuestas`;
DROP TABLE IF EXISTS `distritos`;
DROP TABLE IF EXISTS `provincias`;
DROP TABLE IF EXISTS `departamentos`;
DROP TABLE IF EXISTS `usuarios`;
SET FOREIGN_KEY_CHECKS = 1;

-- 1. Tabla Usuarios
CREATE TABLE `usuarios` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `nombre` VARCHAR(120) NOT NULL,
  `email` VARCHAR(150) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `rol` ENUM('superadmin', 'admin', 'encuestador', 'analista') NOT NULL DEFAULT 'encuestador',
  `cargo` VARCHAR(100) NULL,
  `avatar_url` VARCHAR(500) NULL,
  `activo` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Tabla Departamentos (UBIGEO Nivel 1)
CREATE TABLE `departamentos` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `codigo_ubigeo` VARCHAR(2) NOT NULL UNIQUE,
  `nombre` VARCHAR(100) NOT NULL,
  INDEX `idx_dep_codigo` (`codigo_ubigeo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Tabla Provincias (UBIGEO Nivel 2)
CREATE TABLE `provincias` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `departamento_id` INT NOT NULL,
  `codigo_ubigeo` VARCHAR(4) NOT NULL UNIQUE,
  `nombre` VARCHAR(100) NOT NULL,
  FOREIGN KEY (`departamento_id`) REFERENCES `departamentos`(`id`) ON DELETE CASCADE,
  INDEX `idx_prov_dep` (`departamento_id`),
  INDEX `idx_prov_codigo` (`codigo_ubigeo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Tabla Distritos (UBIGEO Nivel 3)
CREATE TABLE `distritos` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `provincia_id` INT NOT NULL,
  `codigo_ubigeo` VARCHAR(6) NOT NULL UNIQUE,
  `nombre` VARCHAR(100) NOT NULL,
  FOREIGN KEY (`provincia_id`) REFERENCES `provincias`(`id`) ON DELETE CASCADE,
  INDEX `idx_dist_prov` (`provincia_id`),
  INDEX `idx_dist_codigo` (`codigo_ubigeo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Tabla Encuestas
CREATE TABLE `encuestas` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `codigo` VARCHAR(50) NOT NULL UNIQUE,
  `titulo` VARCHAR(255) NOT NULL,
  `descripcion` TEXT NULL,
  `norma_tecnica` VARCHAR(100) NULL,
  `categoria` VARCHAR(80) NOT NULL DEFAULT 'Censo & Servicios',
  `version` VARCHAR(20) NOT NULL DEFAULT 'v1.0',
  `estado` ENUM('borrador', 'pendiente', 'aprobada', 'rechazada') NOT NULL DEFAULT 'borrador',
  `tiempo_estimado_min` INT NOT NULL DEFAULT 5,
  `total_pasos` INT NOT NULL DEFAULT 4,
  `creador_id` INT NULL,
  `resolucion_aprobacion` VARCHAR(100) NULL,
  `motivo_rechazo` TEXT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`creador_id`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL,
  INDEX `idx_encuesta_estado` (`estado`),
  INDEX `idx_encuesta_codigo` (`codigo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Tabla Secciones
CREATE TABLE `secciones` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `encuesta_id` INT NOT NULL,
  `numero_orden` INT NOT NULL,
  `titulo` VARCHAR(200) NOT NULL,
  `descripcion` TEXT NULL,
  FOREIGN KEY (`encuesta_id`) REFERENCES `encuestas`(`id`) ON DELETE CASCADE,
  INDEX `idx_sec_encuesta` (`encuesta_id`, `numero_orden`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Tabla Preguntas
CREATE TABLE `preguntas` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `encuesta_id` INT NOT NULL,
  `seccion_id` INT NULL,
  `numero_orden` INT NOT NULL,
  `tipo` ENUM('texto', 'opcion_unica', 'opcion_multiple', 'escala_nps', 'ubigeo_cascada', 'calificacion') NOT NULL DEFAULT 'opcion_unica',
  `enunciado` TEXT NOT NULL,
  `ayuda` VARCHAR(255) NULL,
  `es_requerida` TINYINT(1) NOT NULL DEFAULT 1,
  `configuracion_json` JSON NULL,
  FOREIGN KEY (`encuesta_id`) REFERENCES `encuestas`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`seccion_id`) REFERENCES `secciones`(`id`) ON DELETE SET NULL,
  INDEX `idx_preg_encuesta` (`encuesta_id`, `numero_orden`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Tabla Opciones de Pregunta
CREATE TABLE `opciones_pregunta` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `pregunta_id` INT NOT NULL,
  `numero_orden` INT NOT NULL,
  `etiqueta` VARCHAR(255) NOT NULL,
  `valor` VARCHAR(100) NOT NULL,
  `icono` VARCHAR(50) NULL,
  FOREIGN KEY (`pregunta_id`) REFERENCES `preguntas`(`id`) ON DELETE CASCADE,
  INDEX `idx_opc_pregunta` (`pregunta_id`, `numero_orden`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Tabla Respuestas de Encuesta
CREATE TABLE `respuestas_encuesta` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `encuesta_id` INT NOT NULL,
  `codigo_sesion` VARCHAR(100) NOT NULL UNIQUE,
  `departamento_nombre` VARCHAR(100) NULL,
  `provincia_nombre` VARCHAR(100) NULL,
  `distrito_nombre` VARCHAR(100) NULL,
  `departamento_codigo` VARCHAR(2) NULL,
  `provincia_codigo` VARCHAR(4) NULL,
  `distrito_codigo` VARCHAR(6) NULL,
  `ubigeo_completo` VARCHAR(6) NULL,
  `tiempo_llenado_segundos` INT NOT NULL DEFAULT 0,
  `satisfaccion` INT NULL,
  `nps` INT NULL,
  `ip_origen` VARCHAR(45) NULL,
  `user_agent` VARCHAR(255) NULL,
  `estado` ENUM('completada', 'parcial') NOT NULL DEFAULT 'completada',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`encuesta_id`) REFERENCES `encuestas`(`id`) ON DELETE CASCADE,
  INDEX `idx_resp_encuesta` (`encuesta_id`),
  INDEX `idx_resp_ubigeo` (`ubigeo_completo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Tabla Detalle de Respuestas
CREATE TABLE `detalle_respuestas` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `respuesta_encuesta_id` INT NOT NULL,
  `pregunta_id` INT NOT NULL,
  `valor_texto` TEXT NULL,
  `valor_numero` DECIMAL(10,2) NULL,
  `opciones_json` JSON NULL,
  FOREIGN KEY (`respuesta_encuesta_id`) REFERENCES `respuestas_encuesta`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`pregunta_id`) REFERENCES `preguntas`(`id`) ON DELETE CASCADE,
  INDEX `idx_det_resp` (`respuesta_encuesta_id`),
  INDEX `idx_det_preg` (`pregunta_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Tabla Auditoría de Aprobaciones
CREATE TABLE `auditoria_aprobaciones` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `encuesta_id` INT NOT NULL,
  `usuario_id` INT NULL,
  `usuario_nombre` VARCHAR(120) NULL,
  `accion` ENUM('aprobada', 'rechazada', 'solicitud_cambio', 'enviada_revision') NOT NULL,
  `comentario` TEXT NULL,
  `resolucion_oficial` VARCHAR(100) NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`encuesta_id`) REFERENCES `encuestas`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL,
  INDEX `idx_aud_encuesta` (`encuesta_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- DATOS SEMILLA: USUARIOS
-- ============================================================
INSERT INTO `usuarios` (`id`, `nombre`, `email`, `password_hash`, `rol`, `cargo`, `avatar_url`) VALUES
(1, 'Ing. Carlos Valdivia', 'carlos.valdivia@omnipoll.pe', '$2y$10$wN9Fv0o80Q7K9Z0dJ2Z0heP9A6q3s7vXy2kE8fU.V.Qk8.Y6c8wG.', 'superadmin', 'Director de Operaciones & Datos', 'diseno/assets/modern_high_tech_professional_avatar_portrait_of_a.png'),
(2, 'Dra. Elena Ramos', 'elena.ramos@omnipoll.pe', '$2y$10$wN9Fv0o80Q7K9Z0dJ2Z0heP9A6q3s7vXy2kE8fU.V.Qk8.Y6c8wG.', 'admin', 'Especialista en Muestreo Geoespacial', NULL),
(3, 'Lic. Marco Polo', 'marco.polo@omnipoll.pe', '$2y$10$wN9Fv0o80Q7K9Z0dJ2Z0heP9A6q3s7vXy2kE8fU.V.Qk8.Y6c8wG.', 'encuestador', 'Coordinador de Campo Lima Centro', NULL);

-- ============================================================
-- DATOS SEMILLA: UBIGEO COMPLETO PERÚ (25 DEPARTAMENTOS)
-- ============================================================
INSERT INTO `departamentos` (`id`, `codigo_ubigeo`, `nombre`) VALUES
(1, '01', 'Amazonas'),
(2, '02', 'Áncash'),
(3, '03', 'Apurímac'),
(4, '04', 'Arequipa'),
(5, '05', 'Ayacucho'),
(6, '06', 'Cajamarca'),
(7, '07', 'Callao'),
(8, '08', 'Cusco'),
(9, '09', 'Huancavelica'),
(10, '10', 'Huánuco'),
(11, '11', 'Ica'),
(12, '12', 'Junín'),
(13, '13', 'La Libertad'),
(14, '14', 'Lambayeque'),
(15, '15', 'Lima'),
(16, '16', 'Loreto'),
(17, '17', 'Madre de Dios'),
(18, '18', 'Moquegua'),
(19, '19', 'Pasco'),
(20, '20', 'Piura'),
(21, '21', 'Puno'),
(22, '22', 'San Martín'),
(23, '23', 'Tacna'),
(24, '24', 'Tumbes'),
(25, '25', 'Ucayali');

-- Provincias representativas
INSERT INTO `provincias` (`id`, `departamento_id`, `codigo_ubigeo`, `nombre`) VALUES
-- Lima (15)
(1, 15, '1501', 'Lima Metropolitana'),
(2, 15, '1502', 'Barranca'),
(3, 15, '1505', 'Cañete'),
(4, 15, '1506', 'Huaral'),
(5, 15, '1507', 'Huarochirí'),
-- Callao (07)
(6, 7, '0701', 'Prov. Const. del Callao'),
-- Arequipa (04)
(7, 4, '0401', 'Arequipa'),
(8, 4, '0402', 'Camaná'),
(9, 4, '0405', 'Caylloma'),
-- Cusco (08)
(10, 8, '0801', 'Cusco'),
(11, 8, '0813', 'Urubamba'),
-- La Libertad (13)
(12, 13, '1301', 'Trujillo'),
-- Piura (20)
(13, 20, '2001', 'Piura'),
-- Junín (12)
(14, 12, '1201', 'Huancayo'),
-- Lambayeque (14)
(15, 14, '1401', 'Chiclayo'),
-- Cajamarca (06)
(16, 6, '0601', 'Cajamarca'),
-- Puno (21)
(17, 21, '2101', 'Puno'),
-- Ica (11)
(18, 11, '1101', 'Ica'),
-- Loreto (16)
(19, 16, '1601', 'Maynas (Iquitos)'),
-- Ucayali (25)
(20, 25, '2501', 'Coronel Portillo (Pucallpa)'),
-- San Martín (22)
(21, 22, '2209', 'San Martín (Tarapoto)'),
-- Áncash (02)
(22, 2, '0201', 'Huaraz'),
(23, 2, '0218', 'Santa (Chimbote)');

-- Distritos representativos
INSERT INTO `distritos` (`id`, `provincia_id`, `codigo_ubigeo`, `nombre`) VALUES
-- Lima Metropolitana (1501)
(1, 1, '150101', 'Lima (Cercado)'),
(2, 1, '150122', 'Miraflores'),
(3, 1, '150131', 'San Isidro'),
(4, 1, '150140', 'Santiago de Surco'),
(5, 1, '150132', 'San Juan de Lurigancho'),
(6, 1, '150130', 'San Borja'),
(7, 1, '150103', 'Ate'),
(8, 1, '150116', 'La Molina'),
(9, 1, '150117', 'La Victoria'),
(10, 1, '150118', 'Lince'),
(11, 1, '150120', 'Magdalena del Mar'),
(12, 1, '150113', 'Jesús María'),
(13, 1, '150133', 'San Juan de Miraflores'),
(14, 1, '150135', 'San Miguel'),
(15, 1, '150142', 'Villa El Salvador'),
-- Callao (0701)
(16, 6, '070101', 'Callao Cercado'),
(17, 6, '070102', 'Bellavista'),
(18, 6, '070106', 'Ventanilla'),
(19, 6, '070107', 'Mi Perú'),
-- Arequipa (0401)
(20, 7, '040101', 'Arequipa Cercado'),
(21, 7, '040103', 'Cayma'),
(22, 7, '040104', 'Cerro Colorado'),
(23, 7, '040126', 'Yanahuara'),
-- Cusco (0801)
(24, 10, '080101', 'Cusco Cercado'),
(25, 10, '080106', 'Santiago'),
(26, 10, '080108', 'Wanchaq'),
-- Trujillo (1301)
(27, 12, '130101', 'Trujillo'),
(28, 12, '130107', 'Víctor Larco Herrera'),
-- Piura (2001)
(29, 13, '200101', 'Piura'),
(30, 13, '200104', 'Castilla'),
-- Huancayo (1201)
(31, 14, '120101', 'Huancayo'),
(32, 14, '120114', 'El Tambo'),
-- Chiclayo (1401)
(33, 15, '140101', 'Chiclayo'),
-- Maynas (1601)
(34, 19, '160101', 'Iquitos'),
-- Coronel Portillo (2501)
(35, 20, '250101', 'Pucallpa');

-- ==============================================================================
-- TRES ENCUESTAS DE PRUEBA VARIADAS (Y UNA EN ESTADO OBSERVADA/RECHAZADA)
-- ==============================================================================

-- ENCUESTA 1: Censo Nacional de Conectividad & Servicios Digitales 2025 (Aprobada / Oficial)
-- ENCUESTA 2: Clima Laboral y Adopción de Inteligencia Artificial 2025 (Pendiente de Aprobación)
-- ENCUESTA 3: Evaluación de Calidad de Atención y Triaje en Salud Red Sur (Aprobada / En Campo)
-- ENCUESTA 4: Inclusión Financiera y Billeteras Digitales en Áreas Rurales (Rechazada con observaciones)

INSERT INTO `encuestas` (`id`, `codigo`, `titulo`, `descripcion`, `norma_tecnica`, `categoria`, `version`, `estado`, `tiempo_estimado_min`, `total_pasos`, `creador_id`, `resolucion_aprobacion`, `motivo_rechazo`, `created_at`) VALUES
(1, 'CENSO-PE-2025-Q1', 'Censo Nacional de Conectividad & Servicios Digitales 2025', 'Instrumento de recolección georreferenciado para el diseño de infraestructura de telecomunicaciones e inclusión digital.', 'DS-024-INEI-PE', 'Censo & Conectividad', 'v3.4-PRO', 'aprobada', 4, 4, 1, 'RES-DIR-088-2025/MTC', NULL, '2026-09-20 10:00:00'),
(2, 'POLL-TECH-2025-02', 'Clima Laboral y Adopción de Inteligencia Artificial en Entidades Públicas', 'Estudio sobre alfabetización digital, impacto de asistentes de IA generativa y ciberseguridad en el sector estatal.', 'PCM-SGTD-004-2025', 'Innovación Pública & RRHH', 'v2.1', 'pendiente', 5, 5, 2, NULL, NULL, '2026-09-21 14:15:00'),
(3, 'SALUD-SUR-2025-Q3', 'Evaluación de Calidad de Atención y Tiempos de Espera en Red de Salud Sur', 'Sondeo de satisfacción de pacientes, disponibilidad de medicamentos y atención en triaje en hospitales del Minsa y EsSalud.', 'NTS-142-MINSA/DGAIN', 'Salud Pública', 'v1.0', 'aprobada', 4, 4, 1, 'RES-MINSA-451-2025', NULL, '2026-09-18 09:30:00'),
(4, 'FINTECH-PE-2025-Q1', 'Inclusión Financiera y Uso de Billeteras Digitales en Comunidades Rurales', 'Estudio sobre adopción de pagos digitales (Yape, Plin) y brecha de cajeros automáticos en zonas andinas.', 'SBS-CIRC-B-2240', 'Inclusión Financiera', 'v1.2', 'rechazada', 6, 5, 2, NULL, 'Requiere ampliar el bloque de preguntas de ciberseguridad y consentimiento explícito conforme a la Ley 29733 de Protección de Datos Personales.', '2026-09-22 09:15:00');

-- ============================================================
-- SECCIONES DE LAS 3 ENCUESTAS
-- ============================================================
INSERT INTO `secciones` (`id`, `encuesta_id`, `numero_orden`, `titulo`, `descripcion`) VALUES
-- Secciones Encuesta 1 (Censo Conectividad)
(1, 1, 1, 'Perfil y Conectividad General', 'Disponibilidad de servicios en el domicilio'),
(2, 1, 2, 'Geometría y Ubicación Demográfica', 'Desglose administrativo y georreferenciación UBIGEO'),
(3, 1, 3, 'Evaluación de Proveedores y Calidad', 'Satisfacción con operadores y velocidad de navegación'),
(4, 1, 4, 'Servicios Digitales del Estado', 'Uso de plataformas públicas y trámites online'),

-- Secciones Encuesta 2 (Adopción IA y Clima Laboral)
(5, 2, 1, 'Perfil del Funcionario y Sede', 'Ubicación regional y nivel de gobierno'),
(6, 2, 2, 'Herramientas de IA y Productividad', 'Frecuencia de uso y plataformas utilizadas'),
(7, 2, 3, 'Percepción de Ciberseguridad', 'Protección de datos institucionales'),

-- Secciones Encuesta 3 (Salud Pública Red Sur)
(8, 3, 1, 'Datos del Establecimiento y Paciente', 'Ubicación UBIGEO del centro de salud'),
(9, 3, 2, 'Experiencia en Triaje y Farmacia', 'Tiempos de espera y atención médica'),
(10, 3, 3, 'Calificación General de la Red', 'NPS y recomendaciones de mejora');

-- ============================================================
-- PREGUNTAS DE LAS ENCUESTAS
-- ============================================================
INSERT INTO `preguntas` (`id`, `encuesta_id`, `seccion_id`, `numero_orden`, `tipo`, `enunciado`, `ayuda`, `es_requerida`, `configuracion_json`) VALUES
-- Encuesta 1: Conectividad
(1, 1, 1, 1, 'opcion_unica', '¿Qué tipo de conexión principal a Internet utiliza en su domicilio?', 'Seleccione la que utiliza con mayor frecuencia', 1, '{"permitir_otro": false}'),
(2, 1, 1, 2, 'opcion_multiple', '¿Cuáles de los siguientes dispositivos utilizan activamente Internet en su hogar?', 'Puede marcar todas las opciones que correspondan', 1, '{"min_opciones": 1}'),
(3, 1, 2, 3, 'ubigeo_cascada', 'Indique su ubicación de residencia actual para segmentación regional:', 'Seleccione sucesivamente País, Departamento, Provincia y Distrito', 1, '{"pais_fijo": "Perú", "codigo_pais": "00-00-00"}'),
(4, 1, 3, 4, 'calificacion', 'En una escala de 1 a 5 estrellas, ¿cómo califica la estabilidad de su señal?', '1 = Muy inestable, 5 = Excelente y sin cortes', 1, '{"escala": 5}'),
(5, 1, 3, 5, 'escala_nps', '¿Con qué probabilidad recomendaría su proveedor actual a un familiar o colega?', 'Escala de 0 (Nada probable) a 10 (Extremadamente probable)', 1, '{"min": 0, "max": 10}'),
(6, 1, 4, 6, 'texto', '¿Qué trámite digital del Estado considera que debería ser completamente automatizado?', 'Comente brevemente su experiencia', 0, '{"max_chars": 300}'),

-- Encuesta 2: Clima Laboral & IA
(7, 2, 5, 1, 'ubigeo_cascada', 'Indique la sede regional de la entidad pública donde presta servicios:', 'Ubicación de la dependencia estatal', 1, '{}'),
(8, 2, 6, 2, 'opcion_multiple', '¿Cuáles herramientas de Inteligencia Artificial utiliza en su jornada laboral diaria?', 'Marque las que aplique en sus funciones', 1, '{}'),
(9, 2, 6, 3, 'calificacion', '¿Cómo califica el impacto de la IA en la reducción del tiempo de elaboración de informes?', '1 = Sin impacto, 5 = Altamente transformador', 1, '{"escala": 5}'),
(10, 2, 7, 4, 'opcion_unica', '¿Su institución cuenta con una política formal de ciberseguridad sobre el uso de LLMs?', 'Conocimiento normativo', 1, '{}'),
(11, 2, 7, 5, 'escala_nps', '¿Recomendaría a su entidad expandir las licencias corporativas de IA?', '0 a 10', 1, '{}'),

-- Encuesta 3: Calidad de Salud Red Sur
(12, 3, 8, 1, 'ubigeo_cascada', 'Ubicación geográfica del hospital o centro de salud visitado:', 'Departamento, Provincia y Distrito', 1, '{}'),
(13, 3, 8, 2, 'opcion_unica', '¿A través de qué modalidad fue atendido en esta consulta?', 'Canal de atención', 1, '{}'),
(14, 3, 9, 3, 'calificacion', '¿Cómo califica el trato y la claridad de la explicación recibida por el médico tratante?', '1 a 5 estrellas', 1, '{}'),
(15, 3, 9, 4, 'opcion_unica', '¿Logró obtener la totalidad de medicamentos recetados en la farmacia del hospital?', 'Disponibilidad de stock', 1, '{}'),
(16, 3, 10, 5, 'escala_nps', '¿Recomendaría este establecimiento de salud a un familiar en caso de emergencia médica?', 'Escala 0 al 10', 1, '{}'),
(17, 3, 10, 6, 'texto', 'Sugerencias para reducir los tiempos de espera en ventanilla y laboratorio:', 'Campo opcional', 0, '{}');

-- ============================================================
-- OPCIONES DE PREGUNTAS
-- ============================================================
INSERT INTO `opciones_pregunta` (`id`, `pregunta_id`, `numero_orden`, `etiqueta`, `valor`, `icono`) VALUES
-- Opciones Pregunta 1 (Conectividad)
(1, 1, 1, 'Fibra Óptica (FTTH)', 'fibra_optica', 'cable'),
(2, 1, 2, 'Cable Coaxial (HFC)', 'coaxial', 'router'),
(3, 1, 3, 'Conexión Móvil 4G/5G (Banda Ancha Móvil)', 'movil_4g_5g', 'cell_tower'),
(4, 1, 4, 'Internet Satelital (Starlink u otro)', 'satelital', 'satellite_alt'),
(5, 1, 5, 'No dispongo de Internet fijo en el hogar', 'sin_internet', 'signal_disconnected'),
-- Opciones Pregunta 2 (Dispositivos)
(6, 2, 1, 'Smartphones / Teléfonos inteligentes', 'smartphones', 'smartphone'),
(7, 2, 2, 'Laptops / Computadoras de escritorio', 'computadoras', 'computer'),
(8, 2, 3, 'Smart TVs / Dispositivos de Streaming', 'smart_tv', 'tv'),
(9, 2, 4, 'Tablets de estudio o trabajo', 'tablets', 'tablet_mac'),
(10, 2, 5, 'Dispositivos IoT (Cámaras, Domótica)', 'iot_domotica', 'nest_cam_wired_stand'),

-- Opciones Pregunta 8 (Herramientas IA)
(11, 8, 1, 'ChatGPT / OpenAI GPT-4o', 'chatgpt', 'psychology'),
(12, 8, 2, 'Google Gemini Pro / Workspace', 'gemini', 'auto_awesome'),
(13, 8, 3, 'Microsoft Copilot 365', 'copilot', 'smart_toy'),
(14, 8, 4, 'Claude (Anthropic)', 'claude', 'terminal'),
(15, 8, 5, 'Modelos Locales de Código Abierto (Ollama / Llama 3)', 'ollama', 'developer_board'),

-- Opciones Pregunta 10 (Política de Ciberseguridad)
(16, 10, 1, 'Sí, contamos con directiva formal y capacitaciones', 'si_formal', 'shield'),
(17, 10, 2, 'En proceso de elaboración según lineamientos PCM', 'en_proceso', 'pending'),
(18, 10, 3, 'No, cada área lo utiliza a discreción propia', 'no_politica', 'warning'),
(19, 10, 4, 'Desconozco la existencia de directivas al respecto', 'desconoce', 'help'),

-- Opciones Pregunta 13 (Modalidad de Atención Salud)
(20, 13, 1, 'Consulta Presencial en Consultorio Externo', 'presencial', 'person'),
(21, 13, 2, 'Atención de Emergencia / Guardia', 'emergencia', 'local_hospital'),
(22, 13, 3, 'Teleconsulta / Telemedicina Virtual', 'telemedicina', 'video_call'),
(23, 13, 4, 'Campaña Itinerante de Salud / Vacunación', 'campana', 'medical_services'),

-- Opciones Pregunta 15 (Stock Farmacia)
(24, 15, 1, 'Sí, recibí el 100% de la receta médica', 'receta_completa', 'check_circle'),
(25, 15, 2, 'Entrega parcial (faltaron 1 o 2 medicamentos)', 'receta_parcial', 'remove_circle'),
(26, 15, 3, 'No había ninguno en stock (farmacia desabastecida)', 'sin_stock', 'cancel'),
(27, 15, 4, 'No me prescribieron medicamentos farmacológicos', 'no_aplica', 'info');

-- ============================================================
-- RESPUESTAS SEMILLA MULTI-REGIONALES EN BASE DE DATOS
-- ============================================================
INSERT INTO `respuestas_encuesta` (`id`, `encuesta_id`, `codigo_sesion`, `departamento_nombre`, `provincia_nombre`, `distrito_nombre`, `departamento_codigo`, `provincia_codigo`, `distrito_codigo`, `ubigeo_completo`, `tiempo_llenado_segundos`, `satisfaccion`, `nps`, `ip_origen`, `estado`, `created_at`) VALUES
-- Respuestas Encuesta 1 (Censo Conectividad)
(1, 1, 'SES-2025-001', 'Lima', 'Lima Metropolitana', 'Miraflores', '15', '1501', '150122', '150122', 185, 5, 9, '190.238.10.12', 'completada', '2026-09-23 10:14:22'),
(2, 1, 'SES-2025-002', 'Lima', 'Lima Metropolitana', 'San Isidro', '15', '1501', '150131', '150131', 142, 4, 8, '190.238.15.44', 'completada', '2026-09-23 10:30:10'),
(3, 1, 'SES-2025-003', 'Arequipa', 'Arequipa', 'Arequipa Cercado', '04', '0401', '040101', '040101', 210, 4, 7, '200.48.12.80', 'completada', '2026-09-23 11:05:40'),
(4, 1, 'SES-2025-004', 'Cusco', 'Cusco', 'Cusco Cercado', '08', '0801', '080101', '080101', 195, 5, 10, '181.65.22.91', 'completada', '2026-09-23 11:22:15'),
(5, 1, 'SES-2025-005', 'La Libertad', 'Trujillo', 'Trujillo', '13', '1301', '130101', '130101', 160, 3, 6, '190.119.8.33', 'completada', '2026-09-23 11:45:00'),
(6, 1, 'SES-2025-006', 'Callao', 'Prov. Const. del Callao', 'Bellavista', '07', '0701', '070102', '070102', 178, 4, 8, '200.37.15.19', 'completada', '2026-09-23 12:02:30'),
(7, 1, 'SES-2025-007', 'Piura', 'Piura', 'Piura', '20', '2001', '200101', '200101', 225, 4, 8, '190.237.40.10', 'completada', '2026-09-23 12:15:45'),
(8, 1, 'SES-2025-008', 'Lima', 'Lima Metropolitana', 'Santiago de Surco', '15', '1501', '150140', '150140', 130, 5, 9, '181.66.120.5', 'completada', '2026-09-23 12:28:10'),

-- Respuestas Encuesta 2 (Adopción IA y Clima Laboral)
(9, 2, 'SES-2025-009', 'Lima', 'Lima Metropolitana', 'Jesús María', '15', '1501', '150113', '150113', 240, 5, 10, '190.187.32.11', 'completada', '2026-09-23 12:35:00'),
(10, 2, 'SES-2025-010', 'Junín', 'Huancayo', 'Huancayo', '12', '1201', '120101', '120101', 260, 4, 8, '181.67.45.2', 'completada', '2026-09-23 12:40:15'),

-- Respuestas Encuesta 3 (Salud Red Sur)
(11, 3, 'SES-2025-011', 'Arequipa', 'Arequipa', 'Cayma', '04', '0401', '040103', '040103', 190, 5, 9, '200.48.55.19', 'completada', '2026-09-23 12:45:00'),
(12, 3, 'SES-2025-012', 'Cusco', 'Cusco', 'Wanchaq', '08', '0801', '080108', '080108', 215, 4, 8, '181.65.90.8', 'completada', '2026-09-23 12:50:30');

-- Detalle de respuestas individuales
INSERT INTO `detalle_respuestas` (`respuesta_encuesta_id`, `pregunta_id`, `valor_texto`, `valor_numero`, `opciones_json`) VALUES
(1, 1, 'fibra_optica', NULL, '["fibra_optica"]'),
(1, 2, NULL, NULL, '["smartphones", "computadoras", "smart_tv"]'),
(1, 3, 'Lima > Lima Metropolitana > Miraflores', NULL, '{"dep":"15","prov":"1501","dist":"150122"}'),
(1, 4, NULL, 5.00, NULL),
(1, 5, NULL, 9.00, NULL),
(1, 6, 'Emisión de pasaportes y citas médicas en hospitales del Minsa.', NULL, NULL),
(9, 7, 'Lima > Jesús María (Sede Central)', NULL, '{"dep":"15","dist":"150113"}'),
(9, 8, NULL, NULL, '["chatgpt", "gemini", "copilot"]'),
(9, 9, NULL, 5.00, NULL),
(9, 10, 'si_formal', NULL, '["si_formal"]'),
(9, 11, NULL, 10.00, NULL),
(11, 12, 'Arequipa > Cayma (Centro de Salud)', NULL, '{"dep":"04","dist":"040103"}'),
(11, 13, 'presencial', NULL, '["presencial"]'),
(11, 14, NULL, 5.00, NULL),
(11, 15, 'receta_completa', NULL, '["receta_completa"]'),
(11, 16, NULL, 9.00, NULL),
(11, 17, 'Implementar módulo digital de citas previas para descongestionar triaje.', NULL, NULL);

-- ============================================================
-- AUDITORÍA HISTÓRICA DE APROBACIONES
-- ============================================================
INSERT INTO `auditoria_aprobaciones` (`id`, `encuesta_id`, `usuario_id`, `usuario_nombre`, `accion`, `comentario`, `resolucion_oficial`, `created_at`) VALUES
(1, 1, 1, 'Ing. Carlos Valdivia', 'aprobada', 'Estructura metodológica validada conforme al estándar geoespacial INEI. Publicación autorizada para despliegue en campo.', 'RES-DIR-088-2025/MTC', '2026-09-20 14:30:00'),
(2, 3, 1, 'Ing. Carlos Valdivia', 'aprobada', 'Protocolo clínico y bioético acreditado por la Dirección General de Aseguramiento en Salud.', 'RES-MINSA-451-2025', '2026-09-18 11:20:00'),
(3, 4, 1, 'Ing. Carlos Valdivia', 'rechazada', 'Falta incluir consentimiento informado explícito según Ley 29733 de Protección de Datos Personales y bloque de ciberseguridad.', NULL, '2026-09-22 09:15:00');
