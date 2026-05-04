<?php
/**
 * PHP Built-in Server Router
 * Routes all requests through index.php
 */

// Serve static files directly
if (php_sapi_name() === 'cli-server') {
    $path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    if ($path !== '/' && is_file(__DIR__ . $path)) {
        return false;
    }
}

require_once __DIR__ . '/index.php';
