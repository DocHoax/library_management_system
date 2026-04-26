<?php
/**
 * LASUSTECH Library Management System
 * JSON Response Helpers
 */

function jsonResponse(mixed $data, int $statusCode = 200): void {
    http_response_code($statusCode);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

function errorResponse(string $message, int $statusCode = 400): void {
    jsonResponse(['error' => $message], $statusCode);
}

function successResponse(string $message, mixed $data = null, int $statusCode = 200): void {
    $response = ['message' => $message];
    if ($data !== null) {
        $response['data'] = $data;
    }
    jsonResponse($response, $statusCode);
}

function paginatedResponse(array $data, int $total, int $page, int $perPage): void {
    jsonResponse([
        'data' => $data,
        'pagination' => [
            'total' => $total,
            'page' => $page,
            'per_page' => $perPage,
            'total_pages' => ceil($total / $perPage),
        ]
    ]);
}
