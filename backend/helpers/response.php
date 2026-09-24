<?php
/**
 * Helper de Respuestas JSON y Cabeceras CORS
 * OmniPoll - Spatial Data Intelligence Core
 */

// Cabeceras HTTP para API REST y CORS
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Goog-Api-Key');

// Manejo de solicitudes preflight OPTIONS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

/**
 * Enviar respuesta de éxito en formato estandarizado
 */
function sendResponse($data = null, int $statusCode = 200, string $message = 'Operación exitosa') {
    http_response_code($statusCode);
    echo json_encode([
        'success' => true,
        'status'  => $statusCode,
        'message' => $message,
        'data'    => $data,
        'timestamp' => date('c')
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

/**
 * Enviar respuesta de error estandarizada
 */
function sendError(string $message = 'Error en el servidor', int $statusCode = 500, $errors = null) {
    http_response_code($statusCode);
    echo json_encode([
        'success' => false,
        'status'  => $statusCode,
        'message' => $message,
        'errors'  => $errors,
        'timestamp' => date('c')
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

/**
 * Obtener datos JSON del cuerpo de la petición
 */
function getRequestBody() {
    $rawInput = file_get_contents('php://input');
    if (empty($rawInput)) {
        return $_POST;
    }
    $decoded = json_decode($rawInput, true);
    return is_array($decoded) ? $decoded : $_POST;
}
