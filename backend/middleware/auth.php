<?php
/**
 * LASUSTECH Library Management System
 * JWT Authentication Middleware (PHP 8.2 compatible, no external deps)
 */

require_once __DIR__ . '/../config/database.php';

function base64UrlEncode(string $data): string {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function base64UrlDecode(string $data): string {
    return base64_decode(strtr($data, '-_', '+/'));
}

function generateToken(array $payload): string {
    $header = base64UrlEncode(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
    
    $payload['iat'] = time();
    $payload['exp'] = time() + JWT_EXPIRY;
    $payloadEncoded = base64UrlEncode(json_encode($payload));
    
    $signature = base64UrlEncode(
        hash_hmac('sha256', "$header.$payloadEncoded", JWT_SECRET, true)
    );
    
    return "$header.$payloadEncoded.$signature";
}

function verifyToken(string $token): array|false {
    $parts = explode('.', $token);
    if (count($parts) !== 3) return false;
    
    [$header, $payload, $signature] = $parts;
    
    $validSignature = base64UrlEncode(
        hash_hmac('sha256', "$header.$payload", JWT_SECRET, true)
    );
    
    if (!hash_equals($validSignature, $signature)) return false;
    
    $data = json_decode(base64UrlDecode($payload), true);
    
    if (!$data || !isset($data['exp']) || $data['exp'] < time()) return false;
    
    return $data;
}

function getAuthUser(): array|false {
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    
    if (!str_starts_with($authHeader, 'Bearer ')) return false;
    
    $token = substr($authHeader, 7);
    return verifyToken($token);
}

function requireAuth(array $allowedRoles = []): array {
    $user = getAuthUser();
    
    if (!$user) {
        http_response_code(401);
        echo json_encode(['error' => 'Authentication required']);
        exit;
    }
    
    if (!empty($allowedRoles) && !in_array($user['role'], $allowedRoles)) {
        http_response_code(403);
        echo json_encode(['error' => 'Insufficient permissions']);
        exit;
    }
    
    return $user;
}
