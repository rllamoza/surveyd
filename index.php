<?php
/**
 * SurveyD (OmniPoll) - Entrada principal
 * Redirecciona automáticamente al frontend con la ruta base correcta
 */
$scriptDir = dirname($_SERVER['SCRIPT_NAME'] ?? '');
$base = rtrim(str_replace('\\', '/', $scriptDir), '/');
$target = ($base !== '' ? $base : '') . '/frontend/index.html';

header("Location: $target", true, 302);
exit;
