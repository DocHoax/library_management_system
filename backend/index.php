<?php
/**
 * LASUSTECH Library Management System
 * API Router - Main Entry Point
 */

require_once __DIR__ . '/config/database.php';

// CORS Headers
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: ' . ALLOWED_ORIGIN);
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/utils/response.php';
require_once __DIR__ . '/middleware/auth.php';

// Parse request
$requestUri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$method = $_SERVER['REQUEST_METHOD'];

// Remove base path (handles both /backend/api/ and /api/ prefixes)
$path = preg_replace('#^.*/api/#', '', $requestUri);
$path = trim($path, '/');
$segments = $path ? explode('/', $path) : [];

$resource = $segments[0] ?? '';
$action = $segments[1] ?? '';
$id = $segments[2] ?? '';

// Route to appropriate handler
match ($resource) {
    'auth' => require __DIR__ . '/api/auth/handler.php',
    'books' => require __DIR__ . '/api/books/handler.php',
    'users' => require __DIR__ . '/api/users/handler.php',
    'transactions' => require __DIR__ . '/api/transactions/handler.php',
    'fines' => require __DIR__ . '/api/fines/handler.php',
    'reports' => require __DIR__ . '/api/reports/handler.php',
    'categories' => require __DIR__ . '/api/categories/handler.php',
    default => errorResponse('Endpoint not found', 404),
};
