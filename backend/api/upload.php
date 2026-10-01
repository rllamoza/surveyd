<?php
/**
 * API REST: Subida y Gestión de Imágenes para Personalización / Branding
 * OmniPoll - Spatial Data Intelligence Core
 */

require_once __DIR__ . '/../helpers/response.php';

$method = $_SERVER['REQUEST_METHOD'];
if ($method !== 'POST') {
    sendError('Método no permitido. Solo se acepta POST.', 405);
}

// Directorio físico donde se alojarán las imágenes en el servidor
$uploadDir = realpath(__DIR__ . '/../../frontend') . DIRECTORY_SEPARATOR . 'assets' . DIRECTORY_SEPARATOR . 'uploads' . DIRECTORY_SEPARATOR;

// Crear directorio si no existe
if (!is_dir($uploadDir)) {
    if (!mkdir($uploadDir, 0755, true)) {
        sendError('No se pudo crear el directorio de subidas en el servidor', 500);
    }
}

// Proteger el directorio contra ejecución de scripts PHP
$htaccessFile = $uploadDir . '.htaccess';
if (!file_exists($htaccessFile)) {
    $htaccessContent = "# Proteger subidas contra ejecución de scripts\n<FilesMatch \"(?i)\\.(php|phtml|php3|php4|php5|php7|phps)$\">\n    Order Deny,Allow\n    Deny from all\n</FilesMatch>\nOptions -ExecCGI\n";
    @file_put_contents($htaccessFile, $htaccessContent);
}

// Detectar el archivo enviado (puede enviarse con clave 'image', 'file', 'logo' o 'banner')
$fileField = null;
foreach (['image', 'file', 'logo', 'banner'] as $field) {
    if (isset($_FILES[$field]) && is_array($_FILES[$field])) {
        $fileField = $field;
        break;
    }
}

// Si no se encontró en las claves predeterminadas, tomar el primer archivo en $_FILES
if (!$fileField && !empty($_FILES)) {
    $keys = array_keys($_FILES);
    $fileField = $keys[0];
}

if (!$fileField || empty($_FILES[$fileField]['name'])) {
    sendError('No se recibió ningún archivo de imagen para subir', 400);
}

$uploaded = $_FILES[$fileField];

// Verificar errores de subida de PHP
if ($uploaded['error'] !== UPLOAD_ERR_OK) {
    $errorMsg = match ($uploaded['error']) {
        UPLOAD_ERR_INI_SIZE   => 'El archivo excede el tamaño máximo permitido por el servidor (upload_max_filesize)',
        UPLOAD_ERR_FORM_SIZE  => 'El archivo excede el tamaño máximo permitido por el formulario',
        UPLOAD_ERR_PARTIAL    => 'El archivo se subió solo parcialmente',
        UPLOAD_ERR_NO_FILE    => 'No se seleccionó ningún archivo',
        UPLOAD_ERR_NO_TMP_DIR => 'Falta el directorio temporal en el servidor',
        UPLOAD_ERR_CANT_WRITE => 'No se pudo escribir el archivo en el disco del servidor',
        UPLOAD_ERR_EXTENSION  => 'Una extensión de PHP detuvo la subida del archivo',
        default               => 'Error desconocido al subir el archivo'
    };
    sendError($errorMsg, 400);
}

// Validar tamaño máximo (máx. 10 Megabytes)
$maxSizeBytes = 10 * 1024 * 1024;
if ($uploaded['size'] > $maxSizeBytes) {
    sendError('La imagen no debe superar los 10 MB de tamaño', 400);
}

// Validar extensión
$originalName = pathinfo($uploaded['name'], PATHINFO_FILENAME);
$extension = strtolower(pathinfo($uploaded['name'], PATHINFO_EXTENSION));
$allowedExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'];

if (!in_array($extension, $allowedExtensions)) {
    sendError('Formato de imagen no permitido. Solo se aceptan: PNG, JPG, JPEG, WEBP, SVG o GIF.', 400);
}

// Validar tipo MIME
$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mimeType = finfo_file($finfo, $uploaded['tmp_name']);
finfo_close($finfo);

$allowedMimes = [
    'image/jpeg',
    'image/pjpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/svg+xml',
    'text/plain', // Algunos navegadores/servidores detectan SVG como text/plain o text/xml
    'text/xml',
    'application/xml'
];

if (!in_array($mimeType, $allowedMimes)) {
    sendError('El contenido del archivo no corresponde a una imagen válida (MIME: ' . $mimeType . ')', 400);
}

// Sanitizar archivos SVG para evitar vectores XSS
if ($extension === 'svg') {
    $svgContent = file_get_contents($uploaded['tmp_name']);
    if (preg_match('/<script[\s\S]*?>[\s\S]*?<\/script>/i', $svgContent) || preg_match('/on\w+\s*=/i', $svgContent)) {
        sendError('El archivo SVG contiene elementos de script no permitidos por seguridad', 400);
    }
}

// Generar nombre de archivo único, seguro y limpio
$cleanBase = preg_replace('/[^a-zA-Z0-9_\-]/', '_', substr($originalName, 0, 30));
$uniqueSuffix = date('Ymd_His') . '_' . bin2hex(random_bytes(4));
$newFileName = 'img_' . ($cleanBase ? $cleanBase . '_' : '') . $uniqueSuffix . '.' . $extension;
$destinationPath = $uploadDir . $newFileName;

// Mover el archivo a su ubicación permanente
if (!move_uploaded_file($uploaded['tmp_name'], $destinationPath)) {
    sendError('Error al guardar la imagen en el disco del servidor', 500);
}

// Generar ruta relativa y URL absoluta completa
$relativeUrl = 'assets/uploads/' . $newFileName;

// Calcular URL absoluta en base al servidor actual
$protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || ($_SERVER['SERVER_PORT'] ?? 80) == 443 ? 'https://' : 'http://';
$host = $_SERVER['HTTP_HOST'] ?? 'localhost';
$scriptDir = dirname($_SERVER['SCRIPT_NAME'] ?? '');
// De /APPS/app_encuestas/backend/api hacia /APPS/app_encuestas/frontend/assets/uploads/
$baseAppDir = preg_replace('#/backend/api.*$#', '', $scriptDir);
$fullUrl = $protocol . $host . $baseAppDir . '/frontend/' . $relativeUrl;

sendResponse([
    'url'           => $relativeUrl,
    'full_url'      => $fullUrl,
    'filename'      => $newFileName,
    'original_name' => $uploaded['name'],
    'size'          => $uploaded['size'],
    'size_human'    => round($uploaded['size'] / 1024, 1) . ' KB',
    'mime_type'     => $mimeType
], 201, 'Imagen subida y alojada correctamente en el servidor');
