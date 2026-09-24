<?php
require_once __DIR__ . '/config/db.php';
$result = Database::autoSetup();
echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . PHP_EOL;
